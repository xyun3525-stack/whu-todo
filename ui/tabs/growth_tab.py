import tkinter as tk
from tkinter import ttk


class GrowthTab(tk.Frame):
    def __init__(self, parent, game):
        super().__init__(parent, bg="#FFF8E7")
        self.game = game
        self.level_var = tk.StringVar()
        self.streak_var = tk.StringVar()
        self.catalog_var = tk.StringVar()
        self.progress = ttk.Progressbar(self, maximum=100, mode="determinate", length=320)
        tk.Label(self, text="成长", font=("Arial", 14, "bold"), bg="#FFF8E7").pack(anchor="w", padx=16, pady=(16, 8))
        tk.Label(self, textvariable=self.level_var, font=("Arial", 11), bg="#FFF8E7").pack(anchor="w", padx=16)
        self.progress.pack(anchor="w", padx=16, pady=8)
        tk.Label(self, textvariable=self.streak_var, font=("Arial", 11), bg="#FFF8E7").pack(anchor="w", padx=16)
        tk.Label(self, textvariable=self.catalog_var, font=("Arial", 11), bg="#FFF8E7").pack(anchor="w", padx=16, pady=(4, 0))

    def refresh(self):
        summary = self.game.get_growth_summary()
        self.level_var.set(f"Lv.{summary['level']} | XP {summary['xp']}")
        self.streak_var.set(
            f"连击 {summary['streak_days']} 天 | 周目标 {summary['weekly_completed']}/{summary['weekly_target']}"
        )
        self.catalog_var.set(
            f"图鉴 {summary['catalog_count']} 项 | 背包 {summary['inventory_count']} 项"
        )
        self.progress["value"] = summary["xp_ratio"] * 100