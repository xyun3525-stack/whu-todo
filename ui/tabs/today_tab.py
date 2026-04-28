import tkinter as tk
from tkinter import ttk

from ui.dialogs.level_up_dialog import LevelUpDialog
from ui.dialogs.reward_dialog import RewardDialog


class TodayTab(tk.Frame):
    def __init__(self, parent, game, on_change):
        super().__init__(parent, bg="#F4F8EE")
        self.game = game
        self.on_change = on_change
        self.summary_var = tk.StringVar()
        self.progress_var = tk.StringVar()
        self.quick_title_var = tk.StringVar()
        self.today_tasks = []
        self._build_ui()
        self.refresh()

    def _build_ui(self):
        card = tk.Frame(self, bg="#FFFFFF", bd=2, relief="groove")
        card.pack(fill="x", padx=16, pady=16)

        tk.Label(card, text="Today Overview", font=("Arial", 14, "bold"), bg="#FFFFFF").pack(
            anchor="w", padx=12, pady=(12, 4)
        )
        tk.Label(card, textvariable=self.summary_var, font=("Arial", 11), bg="#FFFFFF").pack(
            anchor="w", padx=12
        )
        tk.Label(
            card,
            textvariable=self.progress_var,
            font=("Arial", 10),
            bg="#FFFFFF",
            fg="#456A45",
        ).pack(anchor="w", padx=12, pady=(4, 12))

        quick = tk.Frame(self, bg="#F4F8EE")
        quick.pack(fill="x", padx=16, pady=(0, 8))
        tk.Entry(quick, textvariable=self.quick_title_var, font=("Arial", 11)).pack(
            side="left", fill="x", expand=True
        )
        ttk.Button(quick, text="Quick Add", command=self._quick_add).pack(side="left", padx=8)

        list_frame = tk.Frame(self, bg="#F4F8EE")
        list_frame.pack(fill="both", expand=True, padx=16, pady=(0, 16))
        tk.Label(
            list_frame, text="Today Tasks", font=("Arial", 12, "bold"), bg="#F4F8EE"
        ).pack(anchor="w", pady=(0, 4))
        scrollbar = tk.Scrollbar(list_frame, orient="vertical")
        self.task_listbox = tk.Listbox(list_frame, font=("Arial", 11), height=12, yscrollcommand=scrollbar.set)
        self.task_listbox.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.task_listbox.yview)
        scrollbar.pack(side="right", fill="y")
        self.task_listbox.bind("<Double-Button-1>", lambda _: self._complete_selected())

        btn_frame = tk.Frame(self, bg="#F4F8EE")
        btn_frame.pack(fill="x", padx=16, pady=(0, 16))
        ttk.Button(btn_frame, text="Complete Selected", command=self._complete_selected).pack(
            side="left"
        )

    def _quick_add(self):
        title = self.quick_title_var.get().strip()
        if not title:
            return
        self.game.add_task(title, scheduled_for_today=True)
        self.quick_title_var.set("")
        self.on_change()

    def _complete_selected(self):
        selection = self.task_listbox.curselection()
        if not selection:
            return
        index = selection[0]
        if index >= len(self.today_tasks):
            return

        task = self.today_tasks[index]
        result = self.game.complete_task(task.id)
        if not result:
            return

        if result.leveled_up:
            dialog = LevelUpDialog(
                self, result.new_level, result.upgrade_options, self._handle_upgrade
            )
            self.wait_window(dialog)

        dialog = RewardDialog(self, result)
        self.wait_window(dialog)
        self.on_change()

    def _handle_upgrade(self, choice_type):
        self.game.apply_upgrade_choice(choice_type)
        self.on_change()

    def refresh(self):
        summary = self.game.get_today_summary()
        self.summary_var.set(
            f"Today {summary['today_count']} | Completed {summary['completed_today']} | Campus {summary['campus_name']}"
        )
        self.progress_var.set(
            f"Streak {summary['streak_days']} | Weekly {summary['weekly_completed']}/{summary['weekly_target']} | Prosperity {summary['campus_progress']}"
        )

        self.task_listbox.delete(0, tk.END)
        self.today_tasks = self.game.get_tasks("today")
        for task in self.today_tasks:
            overdue_flag = " [overdue]" if task.is_overdue() else ""
            self.task_listbox.insert(
                tk.END,
                f"{task.priority} {task.title} ({task.estimated_minutes}m){overdue_flag}",
            )
