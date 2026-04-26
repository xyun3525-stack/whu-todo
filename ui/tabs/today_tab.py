import tkinter as tk
from tkinter import ttk


class TodayTab(tk.Frame):
    def __init__(self, parent, game, on_change):
        super().__init__(parent, bg="#F4F8EE")
        self.game = game
        self.on_change = on_change
        self.summary_var = tk.StringVar()
        self.progress_var = tk.StringVar()
        self.quick_title_var = tk.StringVar()

        card = tk.Frame(self, bg="#FFFFFF", bd=2, relief="groove")
        card.pack(fill="x", padx=16, pady=16)
        tk.Label(card, text="今日总览", font=("Arial", 14, "bold"), bg="#FFFFFF").pack(anchor="w", padx=12, pady=(12, 4))
        tk.Label(card, textvariable=self.summary_var, font=("Arial", 11), bg="#FFFFFF").pack(anchor="w", padx=12)
        tk.Label(card, textvariable=self.progress_var, font=("Arial", 10), bg="#FFFFFF", fg="#456A45").pack(anchor="w", padx=12, pady=(4, 12))

        quick = tk.Frame(self, bg="#F4F8EE")
        quick.pack(fill="x", padx=16)
        tk.Entry(quick, textvariable=self.quick_title_var, font=("Arial", 11)).pack(side="left", fill="x", expand=True)
        ttk.Button(quick, text="快速添加", command=self._quick_add).pack(side="left", padx=8)

    def _quick_add(self):
        title = self.quick_title_var.get().strip()
        if not title:
            return
        self.game.add_task(title, scheduled_for_today=True)
        self.quick_title_var.set("")
        self.on_change()

    def refresh(self):
        summary = self.game.get_today_summary()
        self.summary_var.set(
            f"今日任务 {summary['today_count']} 项 | 已完成 {summary['completed_today']} 项 | 校园 {summary['campus_name']}"
        )
        self.progress_var.set(
            f"连击 {summary['streak_days']} 天 | 周进度 {summary['weekly_completed']}/{summary['weekly_target']} | 建设度 {summary['campus_progress']}"
        )