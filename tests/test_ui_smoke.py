import tkinter as tk
import unittest

from game_logic import GameLogic
from models import Campus, Collection, Player, Task
from ui.main_window import MainWindow
from ui.tabs.campus_tab import CampusTab
from ui.tabs.growth_tab import GrowthTab
from ui.tabs.settings_tab import SettingsTab
from ui.tabs.tasks_tab import TasksTab
from ui.tabs.today_tab import TodayTab


class DummyStorage:
    def __init__(self):
        self.saved_state = None

    def save_state(self, state):
        self.saved_state = state


class UIShellTests(unittest.TestCase):
    def test_main_window_exposes_v2_tabs(self):
        root = tk.Tk()
        root.withdraw()
        game = GameLogic(Player(), Campus(), Collection(), [])
        window = MainWindow(root, game, DummyStorage())

        labels = [
            window.notebook.tab(index, "text")
            for index in range(window.notebook.index("end"))
        ]

        self.assertEqual(labels, ["今日", "任务", "校园", "成长", "设置"])
        window.destroy()
        root.destroy()


class TodayAndGrowthTabTests(unittest.TestCase):
    def test_today_and_growth_tabs_render_summary_text(self):
        root = tk.Tk()
        root.withdraw()

        player = Player(level=2, xp=120, streak_days=3, weekly_progress={"completed": 4, "target": 15, "week_key": "2026-W17"})
        campus = Campus(name="珞珈山", prosperity=22)
        collection = Collection(catalog=["school_gate"], inventory=["school_gate"])
        tasks = [Task("Today item", scheduled_for_today=True)]
        game = GameLogic(player, campus, collection, tasks)

        today_tab = TodayTab(root, game, lambda: None)
        growth_tab = GrowthTab(root, game)
        today_tab.refresh()
        growth_tab.refresh()

        self.assertIn("今日任务 1 项", today_tab.summary_var.get())
        self.assertIn("连击 3 天", growth_tab.streak_var.get())
        self.assertIn("图鉴 1 项", growth_tab.catalog_var.get())

        today_tab.destroy()
        growth_tab.destroy()
        root.destroy()


class TasksTabTests(unittest.TestCase):
    def test_tasks_tab_switches_between_today_planned_and_completed(self):
        root = tk.Tk()
        root.withdraw()

        today_task = Task("Today", scheduled_for_today=True)
        completed_task = Task("Done")
        completed_task.complete()
        game = GameLogic(Player(), Campus(), Collection(), [today_task, completed_task])
        tab = TasksTab(root, game, lambda: None)

        tab.view_var.set("今日")
        tab.refresh()
        self.assertEqual(tab.task_listbox.size(), 1)

        tab.view_var.set("已完成")
        tab.refresh()
        self.assertEqual(tab.task_listbox.size(), 1)

        tab.destroy()
        root.destroy()


class CampusTabTests(unittest.TestCase):
    def test_campus_tab_applies_new_campus_name(self):
        root = tk.Tk()
        root.withdraw()
        game = GameLogic(Player(), Campus(name="旧山名"), Collection(), [])
        tab = CampusTab(root, game, lambda: None)

        tab.apply_campus_name("新山名")

        self.assertEqual(game.campus.name, "新山名")
        tab.destroy()
        root.destroy()


class SettingsTabTests(unittest.TestCase):
    def test_settings_tab_refresh_shows_campus_and_inventory_summary(self):
        root = tk.Tk()
        root.withdraw()
        player = Player(level=3, xp=320, coins=18)
        campus = Campus(name="珞珈新峰")
        collection = Collection(inventory=["school_gate"], catalog=["school_gate"])
        tab = SettingsTab(root, GameLogic(player, campus, collection, []), DummyStorage())

        tab.refresh()

        self.assertIn("山体: 珞珈新峰", tab.summary_var.get())
        self.assertIn("背包: 1", tab.summary_var.get())
        tab.destroy()
        root.destroy()


if __name__ == "__main__":
    unittest.main()