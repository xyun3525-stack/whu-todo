"""Tests for custom_icons feature (PR1: backend + storage migration)."""

import json
import os
import tempfile
import threading
import unittest
import urllib.request
from unittest.mock import patch

from buildings_data import BUILDINGS
from game_logic import GameLogic
from models import Campus, Collection, Player, Task
from storage import CURRENT_DATA_VERSION, Storage
from webui.app import WebGameApp, create_server


class UpdateSettingsTests(unittest.TestCase):
    """Test WebGameApp.update_settings and PATCH /api/settings."""

    def test_update_settings_sets_custom_icons(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            storage = Storage(f"{tmp_dir}/data.json")
            app = WebGameApp(storage=storage)
            app.game.settings = {"theme_name": "campus", "custom_icons": {}}

            result = app.update_settings({"custom_icons": {"school_gate": "data:image/png;base64,ABC"}})

            self.assertIn("state", result)
            loaded = storage.load_state()
            self.assertEqual(loaded["settings"]["custom_icons"]["school_gate"], "data:image/png;base64,ABC")

    def test_update_settings_merges_icons_top_level(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            storage = Storage(f"{tmp_dir}/data.json")
            app = WebGameApp(storage=storage)
            app.game.settings = {"theme_name": "campus", "custom_icons": {"school_gate": "data:old"}}

            result = app.update_settings({"custom_icons": {"teaching_building": "data:image/new"}})

            loaded = storage.load_state()
            self.assertEqual(loaded["settings"]["custom_icons"]["school_gate"], "data:old")
            self.assertEqual(loaded["settings"]["custom_icons"]["teaching_building"], "data:image/new")

    def test_update_settings_none_value_removes_icon(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            storage = Storage(f"{tmp_dir}/data.json")
            app = WebGameApp(storage=storage)
            app.game.settings = {"theme_name": "campus", "custom_icons": {"school_gate": "data:image/png"}}

            result = app.update_settings({"custom_icons": {"school_gate": None}})

            loaded = storage.load_state()
            self.assertNotIn("school_gate", loaded["settings"]["custom_icons"])

    def test_update_settings_preserves_other_settings(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            storage = Storage(f"{tmp_dir}/data.json")
            app = WebGameApp(storage=storage)
            app.game.settings = {"theme_name": "campus", "custom_icons": {}}

            app.update_settings({"custom_icons": {"teaching_building": "data:image/new"}})

            loaded = storage.load_state()
            self.assertEqual(loaded["settings"]["theme_name"], "campus")


class PatchApiRouteTests(unittest.TestCase):
    """Test PATCH /api/settings HTTP route."""

    def test_patch_api_settings_updates_custom_icons(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            storage = Storage(f"{tmp_dir}/data.json")
            try:
                server = create_server(app=WebGameApp(storage=storage), host="127.0.0.1", port=0)
            except PermissionError:
                self.skipTest("Sandbox blocks binding a local TCP port.")
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()

            try:
                base_url = f"http://127.0.0.1:{server.server_address[1]}"
                payload = json.dumps({"custom_icons": {"school_gate": "data:image/png;base64,XYZ"}}).encode("utf-8")
                request = urllib.request.Request(
                    f"{base_url}/api/settings",
                    data=payload,
                    headers={"Content-Type": "application/json"},
                    method="PATCH",
                )
                response = json.loads(urllib.request.urlopen(request).read())
                self.assertIn("state", response)
                self.assertIn("custom_icons", response["state"]["settings"])
            finally:
                server.shutdown()
                thread.join(timeout=5)
                server.server_close()


class StorageMigrationTests(unittest.TestCase):
    """Test v2->v3 storage migration adds custom_icons."""

    def test_load_state_v2_adds_custom_icons_field(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            data_path = os.path.join(tmp_dir, "data.json")
            v2_payload = {
                "version": 2,
                "player": {"level": 1, "xp": 0, "coins": 0, "streak_days": 0,
                           "last_completed_on": None, "weekly_progress": {"completed": 0, "target": 15, "week_key": ""}},
                "campus": {"name": "珞珈山", "grid_size": 2,
                           "available_cells": ["0,0", "1,0", "0,1", "1,1"],
                           "grid": {}, "prosperity": 0, "unlocked_regions": ["core"]},
                "collection": {"inventory": [], "catalog": [], "fragments": {}, "pity_counter": 0},
                "tasks": [],
                "settings": {"theme_name": "campus"},
            }
            with open(data_path, "w", encoding="utf-8") as handle:
                json.dump(v2_payload, handle, ensure_ascii=False, indent=2)

            storage = Storage(data_path)
            state = storage.load_state()

            self.assertEqual(state["version"], CURRENT_DATA_VERSION)
            self.assertIn("custom_icons", state["settings"])
            self.assertEqual(state["settings"]["custom_icons"], {})

    def test_migrate_data_v2_preserves_existing_settings(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            data_path = os.path.join(tmp_dir, "data.json")
            v2_payload = {
                "version": 2,
                "player": {"level": 3, "xp": 100, "coins": 50, "streak_days": 2,
                           "last_completed_on": None, "weekly_progress": {"completed": 5, "target": 15, "week_key": "2026-W17"}},
                "campus": {"name": "Test Campus", "grid_size": 3,
                           "available_cells": ["0,0", "1,0", "2,0", "0,1"],
                           "grid": {}, "prosperity": 10, "unlocked_regions": ["core"]},
                "collection": {"inventory": ["school_gate"], "catalog": ["school_gate"], "fragments": {}, "pity_counter": 0},
                "tasks": [],
                "settings": {"theme_name": "classic", "some_old_key": "keep"},
            }
            with open(data_path, "w", encoding="utf-8") as handle:
                json.dump(v2_payload, handle, ensure_ascii=False, indent=2)

            storage = Storage(data_path)
            state = storage.load_state()

            self.assertEqual(state["version"], CURRENT_DATA_VERSION)
            self.assertEqual(state["settings"]["theme_name"], "classic")
            self.assertEqual(state["settings"]["some_old_key"], "keep")
            self.assertIn("custom_icons", state["settings"])
            self.assertEqual(state["settings"]["custom_icons"], {})

    def test_load_state_v3_with_existing_custom_icons_preserved(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            data_path = os.path.join(tmp_dir, "data.json")
            v3_payload = {
                "version": 3,
                "player": {"level": 1, "xp": 0, "coins": 0, "streak_days": 0,
                           "last_completed_on": None, "weekly_progress": {"completed": 0, "target": 15, "week_key": ""}},
                "campus": {"name": "珞珈山", "grid_size": 2,
                           "available_cells": ["0,0", "1,0", "0,1", "1,1"],
                           "grid": {}, "prosperity": 0, "unlocked_regions": ["core"]},
                "collection": {"inventory": [], "catalog": [], "fragments": {}, "pity_counter": 0},
                "tasks": [],
                "settings": {"theme_name": "campus", "custom_icons": {"teaching_building": "data:image/png;base64,ABC"}},
            }
            with open(data_path, "w", encoding="utf-8") as handle:
                json.dump(v3_payload, handle, ensure_ascii=False, indent=2)

            storage = Storage(data_path)
            state = storage.load_state()

            self.assertEqual(state["version"], 3)
            self.assertEqual(state["settings"]["custom_icons"]["teaching_building"], "data:image/png;base64,ABC")


if __name__ == "__main__":
    unittest.main()