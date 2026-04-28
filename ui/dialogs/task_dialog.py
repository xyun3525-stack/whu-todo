import tkinter as tk
from tkinter import messagebox, ttk


class TaskDialog(tk.Toplevel):
    def __init__(self, parent, title="Task", initial=None):
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

        tk.Label(form, text="Title").grid(row=0, column=0, sticky="w")
        tk.Entry(form, textvariable=self.title_var, width=28).grid(row=0, column=1, sticky="ew")

        tk.Label(form, text="Priority").grid(row=1, column=0, sticky="w")
        ttk.Combobox(
            form,
            textvariable=self.priority_var,
            values=["normal", "important", "urgent"],
            state="readonly",
            width=24,
        ).grid(row=1, column=1, sticky="ew")

        tk.Label(form, text="Deadline (YYYY-MM-DD)").grid(row=2, column=0, sticky="w")
        tk.Entry(form, textvariable=self.deadline_var, width=28).grid(row=2, column=1, sticky="ew")

        tk.Label(form, text="Estimated Minutes").grid(row=3, column=0, sticky="w")
        tk.Entry(form, textvariable=self.minutes_var, width=28).grid(row=3, column=1, sticky="ew")

        tk.Label(form, text="Repeat").grid(row=4, column=0, sticky="w")
        ttk.Combobox(
            form,
            textvariable=self.repeat_var,
            values=["none", "daily", "weekly"],
            state="readonly",
            width=24,
        ).grid(row=4, column=1, sticky="ew")

        tk.Checkbutton(form, text="Pin To Today", variable=self.today_var).grid(
            row=5, column=1, sticky="w"
        )

        ttk.Button(form, text="Save", command=self._save).grid(
            row=6, column=0, columnspan=2, pady=(12, 0)
        )

        self.protocol("WM_DELETE_WINDOW", self.destroy)
        self.grab_set()

    def destroy(self):
        try:
            self.grab_release()
        except tk.TclError:
            pass
        super().destroy()

    def _save(self):
        title = self.title_var.get().strip()
        if not title:
            messagebox.showwarning("Invalid Input", "Task title cannot be empty.", parent=self)
            return

        deadline = self.deadline_var.get().strip()
        if deadline:
            try:
                from datetime import datetime
                datetime.strptime(deadline, "%Y-%m-%d")
            except ValueError:
                messagebox.showwarning(
                    "Invalid Input", "Deadline must be in YYYY-MM-DD format.", parent=self
                )
                return

        try:
            estimated_minutes = int(self.minutes_var.get())
        except ValueError:
            messagebox.showwarning(
                "Invalid Input", "Estimated minutes must be a number.", parent=self
            )
            return

        if estimated_minutes <= 0:
            messagebox.showwarning(
                "Invalid Input", "Estimated minutes must be greater than 0.", parent=self
            )
            return

        self.result = {
            "title": title,
            "priority": self.priority_var.get(),
            "deadline": deadline or None,
            "estimated_minutes": estimated_minutes,
            "repeat_rule": self.repeat_var.get(),
            "scheduled_for_today": self.today_var.get(),
        }
        self.destroy()
