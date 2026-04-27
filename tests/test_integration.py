import tempfile
import unittest

from game_logic import GameLogic
from models import Campus, Collection, Player, Task
from storage import Storage


class IntegrationTests(unittest.TestCase):
    def test_complete_flow_saves_and_reloads_v2_state(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            data_path = f"{tmp_dir}/data.json"
            storage = Storage(data_path)

            player = Player()
            campus = Campus()
            collection = Collection()
            task = Task("Ship V2", scheduled_for_today=True, repeat_rule="daily")
            logic = GameLogic(player, campus, collection, [task])

            logic.rename_campus("Luojia Peak")
            result = logic.complete_task(task.id)
            storage.save_state(logic.to_state())
            reloaded = storage.load_state()

        self.assertEqual(reloaded["campus"]["name"], "Luojia Peak")
        self.assertEqual(reloaded["player"]["streak_days"], 1)
        self.assertEqual(len(reloaded["tasks"]), 2)
        self.assertEqual(reloaded["tasks"][1]["repeat_rule"], "daily")
        self.assertEqual(result.weekly_completed, 1)


if __name__ == "__main__":
    unittest.main()
