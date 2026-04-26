import tkinter as tk
from tkinter import messagebox, ttk

from ui.dialogs.reward_dialog import RewardDialog
from ui.dialogs.task_dialog import TaskDialog


class TasksTab(tk.Frame):
    VIEW_MAP = {"今日": "today", "计划中": "planned", "已完成": "completed"}

    def __init__(self, parent, game, on_change):
        super().__init__(parent, bg="#F6FBF0")
        self.game = game
        self.on_change = on_change
        self.view_var = tk.StringVar(value="计划中")
        self.visible_tasks = []

        top = tk.Frame(self, bg="#F6FBF0")
        top.pack(fill="x", padx=16, pady=16)
        ttk.Button(top, text="新增任务", command=self._add_task).pack(side="left")
        ttk.Button(top, text="编辑任务", command=self._edit_task).pack(side="left", padx=8)
        ttk.Button(top, text="完成任务", command=self._complete_task).pack(side="left")
        ttk.Button(top, text="删除任务", command=self._delete_task).pack(side="left", padx=8)
        ttk.Combobox(top, textvariable=self.view_var, values=list(self.VIEW_MAP.keys()), state="readonly").pack(side="right")
        self.view_var.trace_add("write", lambda *_: self.refresh())

        self.task_listbox = tk.Listbox(self, font=("Arial", 11), height=18)
        self.task_listbox.pack(fill="both", expand=True, padx=16, pady=(0, 16))

    def _selected_task(self):
        selection = self.task_listbox.curselection()
        if not selection:
            return None
        return self.visible_tasks[selection[0]]

    def _add_task(self):
        dialog = TaskDialog(self, title="新增任务")
        self.wait_window(dialog)
        if dialog.result and dialog.result["title"]:
            self.game.add_task(**dialog.result)
            self.on_change()

    def _edit_task(self):
        task = self._selected_task()
        if not task:
            messagebox.showwarning("提示", "请先选择任务")
            return
        dialog = TaskDialog(self, title="编辑任务", initial=task.to_dict())
        self.wait_window(dialog)
        if dialog.result and dialog.result["title"]:
            self.game.update_task(task.id, **dialog.result)
            self.on_change()

    def _complete_task(self):
        task = self._selected_task()
        if not task:
            messagebox.showwarning("提示", "请先选择任务")
            return
        result = self.game.complete_task(task.id)
        if result:
            RewardDialog(self, result)
            self.on_change()

    def _delete_task(self):
        task = self._selected_task()
        if not task:
            messagebox.showwarning("提示", "请先选择任务")
            return
        self.game.delete_task(task.id)
        self.on_change()

    def refresh(self):
        self.task_listbox.delete(0, tk.END)
        self.visible_tasks = self.game.get_tasks(self.VIEW_MAP[self.view_var.get()])
        for task in self.visible_tasks:
            status = "已完成" if task.completed else task.priority
            today_flag = " [今日]" if task.scheduled_for_today else ""
            repeat_flag = "" if task.repeat_rule == "none" else f" [{task.repeat_rule}]"
            self.task_listbox.insert(
                tk.END,
                f"{status}{today_flag}{repeat_flag} {task.title} ({task.estimated_minutes}m)",
            )