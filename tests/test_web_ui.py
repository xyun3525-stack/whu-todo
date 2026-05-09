import json
import pathlib
import tempfile
import threading
import unittest
import urllib.request
from unittest.mock import patch

from buildings_data import BUILDINGS
from game_logic import GameLogic
from models import Campus, Collection, Player, Task
from storage import Storage
from webui.app import STATIC_DIR, WebGameApp, create_server


class WebAppStateTests(unittest.TestCase):
    def test_state_snapshot_contains_all_web_views(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            storage = Storage(f"{tmp_dir}/data.json")
            player = Player(
                level=2,
                xp=120,
                coins=9,
                streak_days=3,
                weekly_progress={"completed": 4, "target": 15, "week_key": "2026-W17"},
            )
            campus = Campus(name="珞珈网页校区", prosperity=22)
            collection = Collection(catalog=["school_gate"], inventory=["school_gate"])
            tasks = [Task("今日事项", scheduled_for_today=True)]
            app = WebGameApp(storage=storage, game=GameLogic(player, campus, collection, tasks))

            state = app.get_state()

        self.assertEqual(state["today"]["summary"]["campus_name"], "珞珈网页校区")
        self.assertEqual(state["growth"]["level"], 2)
        self.assertEqual(state["settings"]["coins"], 9)
        self.assertEqual(state["campus"]["inventory_stacks"][0]["id"], "school_gate")
        self.assertEqual(len(state["tasks"]["today"]), 1)


class WebAppFlowTests(unittest.TestCase):
    @patch("game_logic.random.choice", return_value=BUILDINGS["teaching_building"])
    @patch("game_logic.random.random", return_value=0.01)
    def test_complete_task_then_apply_upgrade_preserves_flow(self, *_):
        with tempfile.TemporaryDirectory() as tmp_dir:
            storage = Storage(f"{tmp_dir}/data.json")
            player = Player(level=1, xp=90)
            campus = Campus()
            app = WebGameApp(
                storage=storage,
                game=GameLogic(
                    player,
                    campus,
                    Collection(),
                    [Task("升级冲刺", scheduled_for_today=True)],
                ),
            )
            task_id = app.game.tasks[0].id

            completion = app.complete_task(task_id)
            upgraded = app.apply_upgrade("unlock_cells")
            reloaded = storage.load_state()

        self.assertTrue(completion["reward"]["leveled_up"])
        self.assertEqual(completion["reward"]["new_level"], 2)
        self.assertEqual(reloaded["player"]["level"], 2)
        self.assertGreaterEqual(upgraded["state"]["campus"]["unlocked_cells"], 4)

    def test_pending_upgrade_blocks_second_completion(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            storage = Storage(f"{tmp_dir}/data.json")
            player = Player(level=1, xp=90)
            tasks = [
                Task("第一项", scheduled_for_today=True),
                Task("第二项", scheduled_for_today=True),
            ]
            app = WebGameApp(
                storage=storage,
                game=GameLogic(player, Campus(), Collection(), tasks),
            )

            app.complete_task(tasks[0].id)

            with self.assertRaisesRegex(ValueError, "升级奖励"):
                app.complete_task(tasks[1].id)


class WebServerSmokeTests(unittest.TestCase):
    def test_static_frontend_assets_exist(self):
        self.assertTrue((pathlib.Path(STATIC_DIR) / "index.html").exists())
        self.assertTrue((pathlib.Path(STATIC_DIR) / "styles.css").exists())
        self.assertTrue((pathlib.Path(STATIC_DIR) / "app.js").exists())
        self.assertTrue((pathlib.Path(STATIC_DIR) / "campus-art.js").exists())

    def test_http_server_serves_frontend_and_api(self):
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

                index_html = urllib.request.urlopen(f"{base_url}/").read().decode("utf-8")
                self.assertIn("校园成长待办", index_html)

                state = json.loads(urllib.request.urlopen(f"{base_url}/api/state").read())
                self.assertIn("today", state)

                request = urllib.request.Request(
                    f"{base_url}/api/tasks",
                    data=json.dumps({"title": "浏览器任务", "scheduled_for_today": True}).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                created = json.loads(urllib.request.urlopen(request).read())

                complete_request = urllib.request.Request(
                    f"{base_url}/api/tasks/{created['task']['id']}/complete",
                    data=b"{}",
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                completed = json.loads(urllib.request.urlopen(complete_request).read())
            finally:
                server.shutdown()
                thread.join(timeout=5)
                server.server_close()

        self.assertEqual(created["task"]["title"], "浏览器任务")
        self.assertIn("reward", completed)

    def test_static_buildings_endpoint(self):
        """GET /api/static-buildings returns all static buildings."""
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

                data = json.loads(urllib.request.urlopen(f"{base_url}/api/static-buildings").read())
                buildings = data["buildings"]
                static_ids = {b["id"] for b in buildings}

                self.assertEqual(len(buildings), 5)
                self.assertIn("teaching_building", static_ids)
                self.assertIn("leijun_building", static_ids)
                for b in buildings:
                    self.assertIn("id", b)
                    self.assertIn("name", b)
                    self.assertIn("emoji", b)
                    self.assertIn("rarity", b)
                    self.assertIn("effects", b)
            finally:
                server.shutdown()
                thread.join(timeout=5)
                server.server_close()


if __name__ == "__main__":
    unittest.main()
