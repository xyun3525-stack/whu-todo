import tkinter as tk
from tkinter import ttk

from ui.tabs.campus_tab import CampusTab
from ui.tabs.growth_tab import GrowthTab
from ui.tabs.settings_tab import SettingsTab
from ui.tabs.tasks_tab import TasksTab
from ui.tabs.today_tab import TodayTab


class MainWindow(tk.Frame):
    def __init__(self, parent, game, storage):
        super().__init__(parent)
        self.game = game
        self.storage = storage

        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill="both", expand=True, padx=10, pady=10)

        self.today_tab = TodayTab(self.notebook, self.game, self.handle_state_change)
        self.tasks_tab = TasksTab(self.notebook, self.game, self.handle_state_change)
        self.campus_tab = CampusTab(self.notebook, self.game, self.handle_state_change)
        self.growth_tab = GrowthTab(self.notebook, self.game)
        self.settings_tab = SettingsTab(self.notebook, self.game, self.storage)

        self.notebook.add(self.today_tab, text="Today")
        self.notebook.add(self.tasks_tab, text="Tasks")
        self.notebook.add(self.campus_tab, text="Campus")
        self.notebook.add(self.growth_tab, text="Growth")
        self.notebook.add(self.settings_tab, text="Settings")

        parent.protocol("WM_DELETE_WINDOW", self._on_close)
        self.refresh_all()

    def _on_close(self):
        self.storage.save_state(self.game.to_state())
        self.winfo_toplevel().destroy()

    def handle_state_change(self):
        self.storage.save_state(self.game.to_state())
        self.refresh_all()

    def refresh_all(self):
        for tab in (
            self.today_tab,
            self.tasks_tab,
            self.campus_tab,
            self.growth_tab,
            self.settings_tab,
        ):
            if hasattr(tab, "refresh"):
                tab.refresh()
