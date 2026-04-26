import tkinter as tk
from tkinter import simpledialog

from buildings_data import get_building_by_id


class CampusTab(tk.Frame):
    def __init__(self, parent, game, on_change):
        super().__init__(parent, bg="#EFF8E8")
        self.game = game
        self.on_change = on_change
        self.name_var = tk.StringVar()
        self.stats_var = tk.StringVar()
        self.inventory_var = tk.StringVar()
        tk.Label(self, textvariable=self.name_var, font=("Arial", 15, "bold"), bg="#EFF8E8").pack(anchor="w", padx=16, pady=(16, 8))
        tk.Label(self, textvariable=self.stats_var, font=("Arial", 11), bg="#EFF8E8").pack(anchor="w", padx=16)
        tk.Label(self, textvariable=self.inventory_var, font=("Arial", 11), bg="#EFF8E8").pack(anchor="w", padx=16, pady=(4, 12))
        tk.Button(self, text="修改山体名称", command=self._rename_campus).pack(anchor="w", padx=16)

    def _rename_campus(self):
        new_name = simpledialog.askstring("山体名称", "输入新的山体名称", parent=self)
        if new_name:
            self.apply_campus_name(new_name)

    def apply_campus_name(self, new_name):
        self.game.rename_campus(new_name)
        self.on_change()

    def refresh(self):
        summary = self.game.get_campus_summary()
        self.name_var.set(summary["name"])
        self.stats_var.set(
            f"建设度 {summary['prosperity']} | 地块 {summary['unlocked_cells']}/{summary['total_cells']} | 区域 {'/'.join(summary['regions'])}"
        )
        inventory_labels = []
        for building_id in summary["inventory"]:
            building = get_building_by_id(building_id)
            if building:
                inventory_labels.append(f"{building['emoji']}{building['name']}")
        self.inventory_var.set("背包: " + ("、".join(inventory_labels) if inventory_labels else "空"))