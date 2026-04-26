import tkinter as tk
from tkinter import ttk


class TaskDialog(tk.Toplevel):
    def __init__(self, parent, title="任务", initial=None):
        super().__init__(parent)
        self.result = None
        self.title(title)
        self.resizable(False, False)
        initial = initial or {}

        self.title_var = tk.StringVar(value=initial.get("title", ""))
        self.priority_var = tk.StringVar(value=initial.get("priority", "normal"))
        self.deadline_var = tk.StringVar(value=initial.get("deadline") or "")
        self.minutes_var = tk.StringVar(value=str(initial.get("estimated_minutes", 25)))
        self.repeat_var = tk.StringVar(value=initial.get("repeat_rule", "none"))
        self.today_var = tk.BooleanVar(value=initial.get("scheduled_for_today", False))

        form = tk.Frame(self, padx=12, pady=12)
        form.pack(fill="both", expand=True)
        tk.Label(form, text="标题").grid(row=0, column=0, sticky="w")
        tk.Entry(form, textvariable=self.title_var, width=28).grid(row=0, column=1, sticky="ew")
        tk.Label(form, text="优先级").grid(row=1, column=0, sticky="w")
        ttk.Combobox(form, textvariable=self.priority_var, values=["normal", "important", "urgent"], state="readonly").grid(row=1, column=1, sticky="ew")
        tk.Label(form, text="截止日期").grid(row=2, column=0, sticky="w")
        tk.Entry(form, textvariable=self.deadline_var, width=28).grid(row=2, column=1, sticky="ew")
        tk.Label(form, text="预计分钟").grid(row=3, column=0, sticky="w")
        tk.Entry(form, textvariable=self.minutes_var, width=28).grid(row=3, column=1, sticky="ew")
        tk.Label(form, text="重复").grid(row=4, column=0, sticky="w")
        ttk.Combobox(form, textvariable=self.repeat_var, values=["none", "daily", "weekly"], state="readonly").grid(row=4, column=1, sticky="ew")
        tk.Checkbutton(form, text="加入今日", variable=self.today_var).grid(row=5, column=1, sticky="w")
        ttk.Button(form, text="保存", command=self._save).grid(row=6, column=0, columnspan=2, pady=(12, 0))

        self.grab_set()

    def _save(self):
        self.result = {
            "title": self.title_var.get().strip(),
            "priority": self.priority_var.get(),
            "deadline": self.deadline_var.get().strip() or None,
            "estimated_minutes": int(self.minutes_var.get()),
            "repeat_rule": self.repeat_var.get(),
            "scheduled_for_today": self.today_var.get(),
        }
        self.destroy()