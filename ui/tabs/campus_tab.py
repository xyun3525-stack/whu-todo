import tkinter as tk
from tkinter import messagebox, simpledialog

from buildings_data import get_building_by_id


class CampusTab(tk.Frame):
    CELL_SIZE = 80

    def __init__(self, parent, game, on_change):
        super().__init__(parent, bg="#EFF8E8")
        self.game = game
        self.on_change = on_change
        self.selected_building = None
        self.name_var = tk.StringVar()
        self.stats_var = tk.StringVar()
        self.inventory_buttons = []
        self._build_ui()
        self.refresh()

    def _build_ui(self):
        tk.Label(self, textvariable=self.name_var, font=("Arial", 15, "bold"), bg="#EFF8E8").pack(
            anchor="w", padx=16, pady=(16, 8)
        )
        tk.Label(self, textvariable=self.stats_var, font=("Arial", 11), bg="#EFF8E8").pack(
            anchor="w", padx=16
        )
        tk.Button(self, text="Rename Campus", command=self._rename_campus).pack(
            anchor="w", padx=16, pady=(8, 4)
        )

        self.canvas = tk.Canvas(self, bg="#C8E6C9")
        self.canvas.pack(padx=16, pady=8)
        self.canvas.bind("<Button-1>", self._on_canvas_click)

        self.inventory_frame = tk.Frame(self, bg="#EFF8E8")
        self.inventory_frame.pack(fill="x", padx=16, pady=(0, 8))
        tk.Label(
            self.inventory_frame,
            text="Backpack: click a building, then click an empty unlocked cell.",
            font=("Arial", 10),
            bg="#EFF8E8",
        ).pack(anchor="w")

    def apply_campus_name(self, new_name):
        self.game.rename_campus(new_name)
        self.on_change()

    def _rename_campus(self):
        new_name = simpledialog.askstring("Campus Name", "Enter a new campus name", parent=self)
        if new_name:
            self.apply_campus_name(new_name)

    def _on_canvas_click(self, event):
        if self.selected_building is None:
            return
        cell_x = event.x // self.CELL_SIZE
        cell_y = event.y // self.CELL_SIZE
        if cell_x >= self.game.campus.grid_size or cell_y >= self.game.campus.grid_size:
            return
        if self.game.place_building(self.selected_building, cell_x, cell_y):
            self.selected_building = None
            self._update_inventory_buttons()
            self.on_change()
            return
        messagebox.showwarning(
            "Place Failed", "This cell is locked or already occupied.", parent=self
        )

    def _select_building(self, building_id):
        self.selected_building = building_id
        self._update_inventory_buttons()

    def _update_inventory_buttons(self):
        for widget in self.inventory_buttons:
            widget.destroy()
        self.inventory_buttons.clear()

        summary = self.game.get_campus_summary()
        for building_id in summary["inventory"]:
            building = get_building_by_id(building_id)
            if not building:
                continue
            button = tk.Button(
                self.inventory_frame,
                text=f"{building['emoji']} {building['name']}",
                font=("Arial", 10),
                bg="#90EE90" if self.selected_building == building_id else "#FFFFFF",
                command=lambda bid=building_id: self._select_building(bid),
            )
            button.pack(side="left", padx=4, pady=4)
            self.inventory_buttons.append(button)

    def _draw_grid(self):
        self.canvas.delete("all")
        summary = self.game.get_campus_summary()
        grid_size = summary["grid_size"]
        available = set(self.game.campus.available_cells)
        grid = summary["grid"]

        for y in range(grid_size):
            for x in range(grid_size):
                key = f"{x},{y}"
                x0 = x * self.CELL_SIZE + 2
                y0 = y * self.CELL_SIZE + 2
                x1 = (x + 1) * self.CELL_SIZE - 2
                y1 = (y + 1) * self.CELL_SIZE - 2
                px = x * self.CELL_SIZE + self.CELL_SIZE // 2
                py = y * self.CELL_SIZE + self.CELL_SIZE // 2

                if key in available:
                    building_id = grid.get(key)
                    color = "#FFFFFF"
                    text = ""
                    if building_id:
                        building = get_building_by_id(building_id)
                        color = "#FFE4B5"
                        text = building["emoji"] if building else ""
                    self.canvas.create_rectangle(x0, y0, x1, y1, fill=color, outline="#888888")
                    if text:
                        self.canvas.create_text(px, py, text=text, font=("Arial", 24))
                else:
                    self.canvas.create_rectangle(x0, y0, x1, y1, fill="#6B8E23", outline="#556B2F")
                    self.canvas.create_text(px, py, text="T", font=("Arial", 14, "bold"))

    def refresh(self):
        summary = self.game.get_campus_summary()
        self.name_var.set(summary["name"])
        self.stats_var.set(
            f"Prosperity {summary['prosperity']} | Cells {summary['unlocked_cells']}/{summary['total_cells']} | Regions {'/'.join(summary['regions'])}"
        )
        canvas_size = max(summary["grid_size"], 3) * self.CELL_SIZE
        self.canvas.config(width=canvas_size, height=canvas_size)
        self._draw_grid()
        self._update_inventory_buttons()
