import tkinter as tk
from tkinter import messagebox, ttk

from ui.dialogs.level_up_dialog import LevelUpDialog
from ui.dialogs.reward_dialog import RewardDialog
from ui.dialogs.task_dialog import TaskDialog


class TasksTab(tk.Frame):
    VIEW_MAP = {
        "Today": "today",
        "Planned": "planned",
        "Completed": "completed",
    }

    def __init__(self, parent, game, on_change):
        super().__init__(parent, bg="#F6FBF0")
        self.game = game
        self.on_change = on_change
        self.visible_tasks = []
        self.view_var = tk.StringVar(value="Planned")
        self._build_ui()
        self.refresh()

    def _build_ui(self):
        top = tk.Frame(self, bg="#F6FBF0")
        top.pack(fill="x", padx=16, pady=16)

        ttk.Button(top, text="Add", command=self._add_task).pack(side="left")
        ttk.Button(top, text="Edit", command=self._edit_task).pack(side="left", padx=8)
        ttk.Button(top, text="Complete", command=self._complete_task).pack(side="left")
        ttk.Button(top, text="Delete", command=self._delete_task).pack(side="left", padx=8)

        ttk.Combobox(
            top,
            textvariable=self.view_var,
            values=list(self.VIEW_MAP.keys()),
            state="readonly",
            width=14,
        ).pack(side="right")
        self.view_var.trace_add("write", lambda *_: self.refresh())

        listbox_frame = tk.Frame(self, bg="#F6FBF0")
        listbox_frame.pack(fill="both", expand=True, padx=16, pady=(0, 16))
        scrollbar = tk.Scrollbar(listbox_frame, orient="vertical")
        self.task_listbox = tk.Listbox(listbox_frame, font=("Arial", 11), height=18, yscrollcommand=scrollbar.set)
        self.task_listbox.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=self.task_listbox.yview)
        scrollbar.pack(side="right", fill="y")
        self.task_listbox.bind("<Double-Button-1>", lambda _: self._edit_task())

    def _selected_task(self):
        selection = self.task_listbox.curselection()
        if not selection:
            return None
        index = selection[0]
        if index >= len(self.visible_tasks):
            return None
        return self.visible_tasks[index]

    def _add_task(self):
        dialog = TaskDialog(self, title="Add Task")
        self.wait_window(dialog)
        if dialog.result and dialog.result["title"]:
            self.game.add_task(**dialog.result)
            self.on_change()

    def _edit_task(self):
        task = self._selected_task()
        if not task:
            messagebox.showwarning("No Selection", "Please select a task first.", parent=self)
            return
        dialog = TaskDialog(self, title="Edit Task", initial=task.to_dict())
        self.wait_window(dialog)
        if dialog.result and dialog.result["title"]:
            self.game.update_task(task.id, **dialog.result)
            self.on_change()

    def _complete_task(self):
        task = self._selected_task()
        if not task:
            messagebox.showwarning("No Selection", "Please select a task first.", parent=self)
            return
        if task.completed:
            messagebox.showinfo("Info", "This task is already completed.", parent=self)
            return

        result = self.game.complete_task(task.id)
        if not result:
            messagebox.showerror(
                "Completion Failed", "Could not complete this task.", parent=self
            )
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

    def _delete_task(self):
        task = self._selected_task()
        if not task:
            messagebox.showwarning("No Selection", "Please select a task first.", parent=self)
            return
        self.game.delete_task(task.id)
        self.on_change()

    def refresh(self):
        self.task_listbox.delete(0, tk.END)
        selected_view = self.VIEW_MAP.get(self.view_var.get(), "planned")
        self.visible_tasks = self.game.get_tasks(selected_view)

        for task in self.visible_tasks:
            status = "completed" if task.completed else task.priority
            today_flag = " [today]" if task.scheduled_for_today else ""
            repeat_flag = "" if task.repeat_rule == "none" else f" [{task.repeat_rule}]"
            due_text = f" due:{task.deadline}" if task.deadline else ""
            self.task_listbox.insert(
                tk.END,
                f"{status}{today_flag}{repeat_flag} {task.title} ({task.estimated_minutes}m){due_text}",
            )
