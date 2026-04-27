import tkinter as tk
from tkinter import messagebox


class SettingsTab(tk.Frame):
    def __init__(self, parent, game, storage):
        super().__init__(parent, bg="#FFFFFF")
        self.game = game
        self.storage = storage
        self.summary_var = tk.StringVar()
        self._build_ui()
        self.refresh()

    def _build_ui(self):
        tk.Label(self, text="Settings", font=("Arial", 14, "bold"), bg="#FFFFFF").pack(
            anchor="w", padx=16, pady=(16, 8)
        )
        tk.Label(
            self,
            textvariable=self.summary_var,
            font=("Arial", 11),
            bg="#FFFFFF",
            justify="left",
        ).pack(anchor="w", padx=16)
        tk.Button(
            self,
            text="Reset Local Data",
            fg="red",
            command=self._reset_data,
        ).pack(anchor="w", padx=16, pady=12)

    def refresh(self):
        self.summary_var.set(
            f"Campus: {self.game.campus.name}\n"
            f"Level: {self.game.player.level}\n"
            f"Coins: {self.game.player.coins}\n"
            f"Inventory: {len(self.game.collection.inventory)}\n"
            f"Catalog: {len(self.game.collection.catalog)}"
        )

    def _reset_data(self):
        confirmed = messagebox.askyesno(
            "Confirm Reset", "Reset all local data? This action cannot be undone.", parent=self
        )
        if not confirmed:
            return
        self.game.reset_state()
        self.storage.reset()
        self.storage.save_state(self.game.to_state())
        self.refresh()
        messagebox.showinfo("Done", "Data has been reset.", parent=self)
