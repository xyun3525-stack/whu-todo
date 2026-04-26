import json
import os
import tempfile
import unittest

from storage import CURRENT_DATA_VERSION, Storage


REQUIRED_V2_KEYS = {"version", "player", "campus", "collection", "tasks", "settings"}


class StorageMigrationTests(unittest.TestCase):
    def test_load_state_migrates_legacy_payload_to_v2_schema(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            data_path = os.path.join(tmp_dir, "data.json")
            legacy_payload = {
                "player": {
                    "level": 3,
                    "xp": 120,
                    "grid_size": 3,
                    "available_cells": ["0,0", "1,0", "0,1", "1,1", "2,2"],
                    "inventory": ["school_gate"],
                    "grid": {"0,0": "school_gate"},
                },
                "tasks": [
                    {
                        "id": "task-1",
                        "title": "Legacy task",
                        "priority": "important",
                        "completed": False,
                    }
                ],
            }
            with open(data_path, "w", encoding="utf-8") as handle:
                json.dump(legacy_payload, handle, ensure_ascii=False, indent=2)

            storage = Storage(data_path)
            state = storage.load_state()

            self.assertEqual(state["version"], CURRENT_DATA_VERSION)
            self.assertTrue(REQUIRED_V2_KEYS.issubset(set(state.keys())))
            self.assertEqual(state["player"]["level"], 3)
            self.assertEqual(state["player"]["xp"], 120)
            self.assertEqual(state["campus"]["grid_size"], 3)
            self.assertEqual(state["campus"]["grid"], {"0,0": "school_gate"})
            self.assertEqual(state["collection"]["inventory"], ["school_gate"])

            task = state["tasks"][0]
            self.assertEqual(task["title"], "Legacy task")
            self.assertEqual(task["estimated_minutes"], 25)
            self.assertEqual(task["repeat_rule"], "none")
            self.assertEqual(task["tags"], [])
            self.assertEqual(task["subtasks"], [])
            self.assertEqual(task["scheduled_for_today"], False)
            self.assertIsNone(task["completed_at"])

            with open(data_path, "r", encoding="utf-8") as handle:
                persisted = json.load(handle)
            self.assertEqual(persisted["version"], CURRENT_DATA_VERSION)
            self.assertEqual(persisted["tasks"][0]["estimated_minutes"], 25)
            self.assertEqual(persisted["tasks"][0]["repeat_rule"], "none")


class StorageRoundtripTests(unittest.TestCase):
    def test_save_state_and_load_state_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            data_path = os.path.join(tmp_dir, "data.json")
            storage = Storage(data_path)
            payload = {
                "player": {"level": 5, "xp": 880, "coins": 44},
                "campus": {
                    "name": "Main Campus",
                    "grid_size": 4,
                    "available_cells": ["0,0", "1,0"],
                    "grid": {"0,0": "school_gate"},
                },
                "collection": {"inventory": ["school_gate"], "catalog": ["school_gate"]},
                "tasks": [
                    {
                        "id": "task-keep",
                        "title": "Ship V2",
                        "priority": "urgent",
                        "estimated_minutes": 60,
                        "repeat_rule": "daily",
                    },
                    {
                        "id": "task-defaults",
                        "title": "Defaulted task",
                        "priority": "normal",
                    },
                ],
                "settings": {"theme_name": "classic"},
            }

            storage.save_state(payload)
            restored = storage.load_state()

            self.assertEqual(restored["version"], CURRENT_DATA_VERSION)
            self.assertTrue(REQUIRED_V2_KEYS.issubset(set(restored.keys())))
            self.assertEqual(restored["player"]["level"], 5)
            self.assertEqual(restored["player"]["coins"], 44)
            self.assertEqual(restored["campus"]["name"], "Main Campus")
            self.assertEqual(restored["campus"]["grid_size"], 4)
            self.assertEqual(restored["collection"]["inventory"], ["school_gate"])
            self.assertEqual(restored["collection"]["catalog"], ["school_gate"])
            self.assertEqual(restored["settings"]["theme_name"], "classic")

            self.assertEqual(restored["tasks"][0]["estimated_minutes"], 60)
            self.assertEqual(restored["tasks"][0]["repeat_rule"], "daily")
            self.assertEqual(restored["tasks"][1]["estimated_minutes"], 25)
            self.assertEqual(restored["tasks"][1]["repeat_rule"], "none")


class StorageSafetyTests(unittest.TestCase):
    def test_load_state_preserves_future_version_without_rewrite(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            data_path = os.path.join(tmp_dir, "data.json")
            future_payload = {
                "version": CURRENT_DATA_VERSION + 7,
                "player": {"level": 9, "xp": 999, "future_points": 55},
                "future_root": {"opaque": True},
                "tasks": [{"id": "t1", "title": "future task", "new_field": "keep"}],
            }
            original_text = json.dumps(future_payload, ensure_ascii=False, separators=(",", ":"))
            with open(data_path, "w", encoding="utf-8") as handle:
                handle.write(original_text)

            storage = Storage(data_path)
            loaded = storage.load_state()

            self.assertEqual(loaded, future_payload)
            with open(data_path, "r", encoding="utf-8") as handle:
                self.assertEqual(handle.read(), original_text)

    def test_load_state_quarantines_malformed_json_without_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            data_path = os.path.join(tmp_dir, "data.json")
            malformed_text = '{"player": {"level": 2}, "tasks": [}'
            with open(data_path, "w", encoding="utf-8") as handle:
                handle.write(malformed_text)

            storage = Storage(data_path)
            state = storage.load_state()

            self.assertEqual(state["version"], CURRENT_DATA_VERSION)
            self.assertTrue(REQUIRED_V2_KEYS.issubset(set(state.keys())))
            with open(data_path, "r", encoding="utf-8") as handle:
                self.assertEqual(handle.read(), malformed_text)

            backups = [name for name in os.listdir(tmp_dir) if name.startswith("data.json.corrupt-")]
            self.assertGreaterEqual(len(backups), 1)
            backup_path = os.path.join(tmp_dir, backups[0])
            with open(backup_path, "r", encoding="utf-8") as handle:
                self.assertEqual(handle.read(), malformed_text)

    def test_save_player_preserves_richer_player_fields(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            data_path = os.path.join(tmp_dir, "data.json")
            storage = Storage(data_path)
            storage.save_state(
                {
                    "player": {"level": 1, "xp": 10, "coins": 2, "custom_field": "seed"},
                    "campus": {"grid_size": 2, "available_cells": ["0,0"], "grid": {}},
                    "collection": {"inventory": []},
                    "tasks": [],
                    "settings": {"theme_name": "campus"},
                }
            )

            rich_player_payload = {
                "level": 6,
                "xp": 700,
                "coins": 88,
                "custom_field": "kept",
                "new_metric": 123,
                "grid_size": 3,
                "available_cells": ["0,0", "1,1"],
                "grid": {"1,1": "school_gate"},
                "inventory": ["school_gate"],
            }
            storage.save_player(rich_player_payload)
            reloaded = storage.load_state()

            self.assertEqual(reloaded["player"]["level"], 6)
            self.assertEqual(reloaded["player"]["xp"], 700)
            self.assertEqual(reloaded["player"]["coins"], 88)
            self.assertEqual(reloaded["player"]["custom_field"], "kept")
            self.assertEqual(reloaded["player"]["new_metric"], 123)
            self.assertEqual(reloaded["campus"]["grid_size"], 3)
            self.assertEqual(reloaded["campus"]["available_cells"], ["0,0", "1,1"])
            self.assertEqual(reloaded["campus"]["grid"], {"1,1": "school_gate"})
            self.assertEqual(reloaded["collection"]["inventory"], ["school_gate"])


if __name__ == "__main__":
    unittest.main()
