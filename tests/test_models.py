import unittest

from models import Campus, Collection, Task


class TaskModelTests(unittest.TestCase):
    def test_from_dict_applies_v2_defaults(self):
        task = Task.from_dict(
            {
                "id": "task-1",
                "title": "Write plan",
                "priority": "important",
                "deadline": "2026-04-25",
                "completed": False,
                "created_at": "2026-04-24T10:00:00",
            }
        )

        self.assertEqual(task.tags, [])
        self.assertEqual(task.estimated_minutes, 25)
        self.assertEqual(task.repeat_rule, "none")
        self.assertFalse(task.scheduled_for_today)


class CampusModelTests(unittest.TestCase):
    def test_campus_round_trip_preserves_name_and_grid(self):
        campus = Campus(
            name="Luojia Hill",
            grid_size=3,
            available_cells={"0,0", "1,0"},
            grid={"0,0": "school_gate"},
            prosperity=18,
            unlocked_regions=["core", "library"],
        )

        restored = Campus.from_dict(campus.to_dict())

        self.assertEqual(restored.name, "Luojia Hill")
        self.assertEqual(restored.grid["0,0"], "school_gate")
        self.assertEqual(restored.unlocked_regions, ["core", "library"])


class CollectionModelTests(unittest.TestCase):
    def test_add_building_tracks_inventory_and_catalog(self):
        collection = Collection()
        collection.add_building("school_gate")

        self.assertEqual(collection.inventory, ["school_gate"])
        self.assertIn("school_gate", collection.catalog)


if __name__ == "__main__":
    unittest.main()
