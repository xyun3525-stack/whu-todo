# -*- coding: utf-8 -*-
"""
珞珈山todo - Todo + 升级系统
一个结合待办事项和珞珈山建设的 Python GUI 应用
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import tkinter as tk
from gui import MainWindow
from storage import Storage
from models import Player, Task
from game_logic import GameLogic


def main():
    """程序入口"""
    storage = Storage()
    player_data = storage.load_player()
    tasks_data = storage.load_tasks()

    player = Player.from_dict(player_data)
    tasks = [Task.from_dict(t) for t in tasks_data]

    game = GameLogic(player, tasks)

    root = tk.Tk()
    root.title("珞珈山todo")
    root.geometry("850x650")
    root.resizable(True, True)

    app = MainWindow(root, game, storage)
    app.pack(fill="both", expand=True)

    root.mainloop()


if __name__ == "__main__":
    main()
