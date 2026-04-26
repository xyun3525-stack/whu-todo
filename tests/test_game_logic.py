import unittest
from unittest.mock import patch

from buildings_data import BUILDINGS
from game_logic import GameLogic
from models import Campus, Collection, Player, Task


class RewardEngineTests(unittest.TestCase):
    @patch("game_logic.random.choice", return_value=BUILDINGS["school_gate"])
    @patch("game_logic.random.random", return_value=0.01)
    def test_complete_task_grants_fixed_and_random_rewards(self, *_):
        player = Player()
        campus = Campus()
        collection = Collection()
        task = Task(
            title="Finish milestone",
            priority="important",
            deadline="2026-04-25",
            estimated_minutes=60,
            scheduled_for_today=True,
        )
        logic = GameLogic(player, campus, collection, [task])

        result = logic.complete_task(task.id)

        self.assertEqual(result.xp, 30)
        self.assertEqual(result.coins, 9)
        self.assertEqual(result.campus_points, 15)
        self.assertEqual(result.dropped_building["id"], "school_gate")
        self.assertEqual(collection.inventory, ["school_gate"])
        self.assertEqual(player.streak_days, 1)

    def test_micro_repeat_tasks_receive_lower_rewards(self):
        logic = GameLogic(Player(), Campus(), Collection(), [])
        deep_work = Task("Deep work", priority="normal", estimated_minutes=45)
        repeat_ping = Task(
            "Repeat ping",
            priority="normal",
            estimated_minutes=10,
            repeat_rule="daily",
        )

        deep_work_rewards = logic._calculate_fixed_rewards(deep_work)
        repeat_rewards = logic._calculate_fixed_rewards(repeat_ping)

        self.assertLess(repeat_rewards["xp"], deep_work_rewards["xp"])


if __name__ == "__main__":
    unittest.main()