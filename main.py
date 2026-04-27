import io
import sys
import tkinter as tk

from game_logic import GameLogic
from models import Campus, Collection, Player, Task
from storage import Storage
from ui.main_window import MainWindow

try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")
except AttributeError:
    pass


def main():
    storage = Storage()
    state = storage.load_state()

    player = Player.from_dict(state["player"])
    campus = Campus.from_dict(state["campus"])
    collection = Collection.from_dict(state["collection"])
    tasks = [Task.from_dict(item) for item in state["tasks"]]
    game = GameLogic(player, campus, collection, tasks)

    root = tk.Tk()
    root.title("Gamified Todo Campus")
    root.geometry("980x720")
    root.resizable(True, True)

    app = MainWindow(root, game, storage)
    app.pack(fill="both", expand=True)
    root.mainloop()


if __name__ == "__main__":
    main()
