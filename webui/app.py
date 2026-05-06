"""Local HTTP server and API for the web-based UI."""

from __future__ import annotations

import json
import mimetypes
import threading
import webbrowser
from dataclasses import asdict
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from buildings_data import get_building_by_id as _static_get_building_by_id, BUILDINGS as _STATIC_BUILDINGS
from game_logic import GameLogic, get_building_def
from models import Campus, Collection, Player, Task
from storage import Storage

STATIC_DIR = Path(__file__).resolve().parent / "static"


class ApiError(ValueError):
    """User-facing API error with an HTTP status."""

    def __init__(self, message, status=HTTPStatus.BAD_REQUEST):
        super().__init__(message)
        self.status = status


class WebGameApp:
    """Thin web controller that wraps GameLogic and persistence."""

    VALID_PRIORITIES = set(Task.PRIORITY_XP)
    VALID_REPEAT_RULES = {"none", "daily", "weekly"}

    def __init__(self, storage=None, game=None):
        self.storage = storage or Storage()
        self._lock = threading.RLock()
        self._pending_upgrade = None
        self.game = game or self._load_game(self.storage.load_state())

    def _load_game(self, state):
        settings = state.get("settings", {})
        return GameLogic(
            Player.from_dict(state["player"]),
            Campus.from_dict(state["campus"]),
            Collection.from_dict(state["collection"]),
            [Task.from_dict(item) for item in state["tasks"]],
            settings=settings,
        )

    def _save_locked(self):
        self.storage.save_state(self.game.to_state())

    def _serialize_building(self, building):
        payload = building
        if isinstance(building, str):
            custom_buildings = self.game.settings.get("custom_buildings") if self.game.settings else None
            payload = get_building_def(building, custom_buildings)
        if not payload:
            return None
        return {
            "id": payload["id"],
            "name": payload["name"],
            "emoji": payload["emoji"],
            "rarity": payload["rarity"],
            "category": payload["category"],
            "effects": dict(payload.get("effects", {})),
            "description": payload.get("description", ""),
        }

    def _serialize_task(self, task):
        payload = task.to_dict()
        payload["is_overdue"] = task.is_overdue()
        payload["is_due_today"] = task.is_due_today()
        return payload

    def _serialize_tasks(self, view):
        return [self._serialize_task(task) for task in self.game.get_tasks(view)]

    def _serialize_campus(self):
        summary = self.game.get_campus_summary()
        available = set(self.game.campus.available_cells)
        grid_cells = []
        inventory_details = []
        inventory_stacks = {}

        for index, building_id in enumerate(summary["inventory"]):
            building = self._serialize_building(building_id)
            if not building:
                continue
            inventory_details.append(
                {
                    "instance_key": f"{building_id}:{index}",
                    **building,
                }
            )
            stack = inventory_stacks.setdefault(
                building_id,
                {
                    **building,
                    "count": 0,
                },
            )
            stack["count"] += 1

        for y in range(summary["grid_size"]):
            for x in range(summary["grid_size"]):
                key = f"{x},{y}"
                building_id = summary["grid"].get(key)
                grid_cells.append(
                    {
                        "key": key,
                        "x": x,
                        "y": y,
                        "unlocked": key in available,
                        "building_id": building_id,
                        "building": self._serialize_building(building_id) if building_id else None,
                    }
                )

        return {
            **summary,
            "available_cells": sorted(available),
            "grid_cells": grid_cells,
            "inventory_details": inventory_details,
            "inventory_stacks": list(inventory_stacks.values()),
        }

    def _serialize_settings(self):
        return {
            "campus_name": self.game.campus.name,
            "level": self.game.player.level,
            "xp": self.game.player.xp,
            "coins": self.game.player.coins,
            "inventory_count": len(self.game.collection.inventory),
            "catalog_count": len(self.game.collection.catalog),
            "custom_icons": dict(self.game.settings.get("custom_icons") or {}),
        }

    def _serialize_reward(self, result):
        payload = asdict(result)
        payload["dropped_building"] = self._serialize_building(payload["dropped_building"])
        payload["repeated_task"] = (
            self._serialize_task(result.repeated_task) if result.repeated_task else None
        )
        return payload

    def _snapshot_locked(self):
        return {
            "today": {
                "summary": self.game.get_today_summary(),
                "tasks": self._serialize_tasks("today"),
            },
            "tasks": {
                "planned": self._serialize_tasks("planned"),
                "today": self._serialize_tasks("today"),
                "completed": self._serialize_tasks("completed"),
            },
            "growth": self.game.get_growth_summary(),
            "campus": self._serialize_campus(),
            "settings": self._serialize_settings(),
        }

    def get_state(self):
        with self._lock:
            return self._snapshot_locked()

    def _parse_task_payload(self, payload):
        title = str(payload.get("title", "")).strip()
        if not title:
            raise ApiError("任务标题不能为空。")

        priority = payload.get("priority", "normal")
        if priority not in self.VALID_PRIORITIES:
            raise ApiError("任务优先级无效。")

        repeat_rule = payload.get("repeat_rule", "none")
        if repeat_rule not in self.VALID_REPEAT_RULES:
            raise ApiError("重复规则无效。")

        deadline = self._normalize_deadline(payload.get("deadline"))
        estimated_minutes = self._coerce_positive_int(
            payload.get("estimated_minutes", 25),
            "预计分钟数",
        )

        return {
            "title": title,
            "priority": priority,
            "deadline": deadline,
            "estimated_minutes": estimated_minutes,
            "repeat_rule": repeat_rule,
            "scheduled_for_today": bool(payload.get("scheduled_for_today", False)),
            "tags": list(payload.get("tags", [])),
            "subtasks": list(payload.get("subtasks", [])),
        }

    def _normalize_deadline(self, deadline):
        value = str(deadline or "").strip()
        if not value:
            return None
        try:
            datetime.strptime(value, "%Y-%m-%d")
        except ValueError as exc:
            raise ApiError("截止日期必须使用 YYYY-MM-DD 格式。") from exc
        return value

    def _coerce_positive_int(self, value, label):
        try:
            number = int(value)
        except (TypeError, ValueError) as exc:
            raise ApiError(f"{label}必须是数字。") from exc
        if number <= 0:
            raise ApiError(f"{label}必须大于 0。")
        return number

    def _coerce_non_negative_int(self, value, label):
        try:
            number = int(value)
        except (TypeError, ValueError) as exc:
            raise ApiError(f"{label}必须是数字。") from exc
        if number < 0:
            raise ApiError(f"{label}必须大于或等于 0。")
        return number

    def add_task(self, payload):
        with self._lock:
            task = self.game.add_task(**self._parse_task_payload(payload))
            self._save_locked()
            return {"task": self._serialize_task(task), "state": self._snapshot_locked()}

    def update_task(self, task_id, payload):
        with self._lock:
            task = self.game.update_task(task_id, **self._parse_task_payload(payload))
            if not task:
                raise ApiError("未找到任务。", status=HTTPStatus.NOT_FOUND)
            self._save_locked()
            return {"task": self._serialize_task(task), "state": self._snapshot_locked()}

    def delete_task(self, task_id):
        with self._lock:
            if not self.game.delete_task(task_id):
                raise ApiError("未找到任务。", status=HTTPStatus.NOT_FOUND)
            self._save_locked()
            return {"state": self._snapshot_locked()}

    def complete_task(self, task_id):
        with self._lock:
            if self._pending_upgrade:
                raise ApiError("请先选择当前待领取的升级奖励。")
            result = self.game.complete_task(task_id)
            if not result:
                raise ApiError("任务无法完成。", status=HTTPStatus.NOT_FOUND)
            if result.leveled_up:
                self._pending_upgrade = [option["type"] for option in result.upgrade_options]
            self._save_locked()
            return {
                "reward": self._serialize_reward(result),
                "state": self._snapshot_locked(),
            }

    def apply_upgrade(self, choice_type):
        with self._lock:
            valid_choices = set(self._pending_upgrade or [])
            if choice_type not in valid_choices:
                raise ApiError("升级选项无效。")
            self.game.apply_upgrade_choice(choice_type)
            self._pending_upgrade = None
            self._save_locked()
            return {"state": self._snapshot_locked()}

    def rename_campus(self, name):
        with self._lock:
            value = str(name or "").strip()
            if not value:
                raise ApiError("校园名称不能为空。")
            self.game.rename_campus(value)
            self._save_locked()
            return {"state": self._snapshot_locked()}

    def place_building(self, payload):
        with self._lock:
            building_id = str(payload.get("building_id", "")).strip()
            if not building_id:
                raise ApiError("请先选择一个建筑。")

            x = self._coerce_non_negative_int(payload.get("x"), "横坐标")
            y = self._coerce_non_negative_int(payload.get("y"), "纵坐标")
            if not self.game.place_building(building_id, x, y):
                raise ApiError("该地块未解锁或已被占用。")
            self._save_locked()
            return {"state": self._snapshot_locked()}

    def reset(self):
        with self._lock:
            self.game.reset_state()
            self._pending_upgrade = None
            self.storage.reset()
            self._save_locked()
            return {"state": self._snapshot_locked()}

    def update_settings(self, payload):
        with self._lock:
            if "custom_icons" in payload:
                icons_update = payload["custom_icons"]
                current = dict(self.game.settings.get("custom_icons") or {})
                if icons_update is None:
                    current = {}
                else:
                    current.update(icons_update)
                    for key in list(current.keys()):
                        if current[key] is None:
                            del current[key]
                self.game.settings["custom_icons"] = current
            if "custom_buildings" in payload:
                # Full replace of custom_buildings
                self.game.settings["custom_buildings"] = dict(payload["custom_buildings"])
            self._save_locked()
            return {"state": self._snapshot_locked()}

    VALID_RARITIES = {"common", "rare", "epic"}

    def list_buildings(self):
        with self._lock:
            custom_buildings = self.game.settings.get("custom_buildings") or {}
            all_buildings = []
            for building_id in _STATIC_BUILDINGS:
                building = get_building_def(building_id, custom_buildings)
                if building:
                    all_buildings.append({
                        "id": building["id"],
                        "name": building["name"],
                        "emoji": building["emoji"],
                        "rarity": building["rarity"],
                        "category": building["category"],
                        "effects": dict(building.get("effects", {})),
                        "description": building.get("description", ""),
                    })
            for building_id, building in custom_buildings.items():
                if building_id not in _STATIC_BUILDINGS:
                    all_buildings.append({
                        "id": building["id"],
                        "name": building["name"],
                        "emoji": building["emoji"],
                        "rarity": building["rarity"],
                        "category": building.get("category", "functional"),
                        "effects": dict(building.get("effects", {})),
                        "description": building.get("description", ""),
                    })
            return {"buildings": all_buildings, "state": self._snapshot_locked()}

    def _validate_building_payload(self, payload, is_update=False):
        """Validate and return building payload. Raises ApiError on failure."""
        required = ["id", "name", "emoji", "rarity"]
        if not is_update:
            for field in required:
                if field not in payload or not payload[field]:
                    raise ApiError(f"缺少必填字段：{field}。")

        building_id = str(payload.get("id", "")).strip()
        name = str(payload.get("name", "")).strip()
        emoji = str(payload.get("emoji", "")).strip()
        rarity = payload.get("rarity", "")

        if is_update:
            if not building_id:
                raise ApiError("建筑 ID 不能为空。")
        if name and not name:
            raise ApiError("建筑名称不能为空。")
        if emoji and not emoji:
            raise ApiError("建筑 Emoji 不能为空。")
        if rarity not in self.VALID_RARITIES:
            raise ApiError("rarity 必须是 common/rare/epic 之一。")

        effects = payload.get("effects", {})
        if not isinstance(effects, dict):
            raise ApiError("effects 必须是字典。")
        for key, value in effects.items():
            try:
                num = float(value)
                if num < 0:
                    raise ApiError(f"效果数值不能为负数：{key}={value}。")
            except (TypeError, ValueError):
                raise ApiError(f"效果数值无效：{key}={value}。")

        return {
            "id": building_id,
            "name": name,
            "emoji": emoji,
            "rarity": rarity,
            "category": payload.get("category", "functional"),
            "effects": effects,
            "description": str(payload.get("description", "") or "").strip(),
        }

    def create_building(self, payload):
        with self._lock:
            validated = self._validate_building_payload(payload, is_update=False)
            custom_buildings = self.game.settings.get("custom_buildings") or {}
            if validated["id"] in custom_buildings or validated["id"] in _STATIC_BUILDINGS:
                raise ApiError(f"建筑 ID {validated['id']} 已存在。")
            custom_buildings = dict(custom_buildings)
            custom_buildings[validated["id"]] = validated
            self.game.settings["custom_buildings"] = custom_buildings
            self._save_locked()
            return {"building": validated, "state": self._snapshot_locked()}

    def update_building(self, building_id, payload):
        with self._lock:
            validated = self._validate_building_payload(payload, is_update=True)
            custom_buildings = self.game.settings.get("custom_buildings") or {}
            # Can only edit custom buildings, not static ones
            if building_id not in custom_buildings:
                raise ApiError("只能编辑自定义建筑，不能编辑静态建筑。")
            if validated["id"] != building_id:
                raise ApiError("不能修改建筑 ID。")
            custom_buildings = dict(custom_buildings)
            custom_buildings[building_id] = validated
            self.game.settings["custom_buildings"] = custom_buildings
            self._save_locked()
            return {"building": validated, "state": self._snapshot_locked()}

    def delete_building(self, building_id):
        with self._lock:
            custom_buildings = self.game.settings.get("custom_buildings") or {}
            if building_id not in custom_buildings:
                raise ApiError("只能删除自定义建筑，不能删除静态建筑。")
            # Check for instances in inventory, catalog, or campus grid
            collection = self.game.collection
            campus = self.game.campus
            if building_id in collection.inventory:
                raise ApiError("该建筑仍有实例，无法删除。")
            if building_id in collection.catalog:
                raise ApiError("该建筑仍有实例，无法删除。")
            if building_id in campus.grid.values():
                raise ApiError("该建筑仍有实例，无法删除。")
            custom_buildings = dict(custom_buildings)
            deleted = custom_buildings.pop(building_id, None)
            self.game.settings["custom_buildings"] = custom_buildings
            self._save_locked()
            return {"building": deleted, "state": self._snapshot_locked()}


class AppServer(ThreadingHTTPServer):
    daemon_threads = True


def make_handler(app):
    class RequestHandler(BaseHTTPRequestHandler):
        server_version = "CampusWebUI/1.0"

        def do_GET(self):
            parsed = urlparse(self.path)
            if parsed.path.startswith("/api/"):
                self._handle_api("GET", parsed.path)
                return
            self._serve_static(parsed.path)

        def do_POST(self):
            parsed = urlparse(self.path)
            self._handle_api("POST", parsed.path)

        def do_PUT(self):
            parsed = urlparse(self.path)
            self._handle_api("PUT", parsed.path)

        def do_PATCH(self):
            parsed = urlparse(self.path)
            self._handle_api("PATCH", parsed.path)

        def log_message(self, *_args):
            return

        def _serve_static(self, path):
            relative = "index.html" if path in {"", "/"} else path.lstrip("/")
            candidate = (STATIC_DIR / relative).resolve()
            try:
                candidate.relative_to(STATIC_DIR)
            except ValueError:
                self._send_json(HTTPStatus.FORBIDDEN, {"error": "禁止访问。"})
                return

            if not candidate.exists() or not candidate.is_file():
                self._send_json(HTTPStatus.NOT_FOUND, {"error": "未找到资源。"})
                return

            content_type = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
            body = candidate.read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _handle_api(self, method, path):
            try:
                payload = self._read_json() if method in {"POST", "PUT", "PATCH"} else {}
                response = self._dispatch_api(method, path, payload)
                self._send_json(HTTPStatus.OK, response)
            except ApiError as exc:
                self._send_json(exc.status, {"error": str(exc)})
            except json.JSONDecodeError:
                self._send_json(HTTPStatus.BAD_REQUEST, {"error": "JSON 请求体格式无效。"})
            except Exception:
                self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "服务器内部错误。"})

        def _dispatch_api(self, method, path, payload):
            segments = [segment for segment in path.split("/") if segment]

            if segments == ["api", "state"] and method == "GET":
                return app.get_state()

            if segments == ["api", "tasks"] and method == "POST":
                return app.add_task(payload)

            if len(segments) == 3 and segments[:2] == ["api", "tasks"]:
                task_id = segments[2]
                if method == "PUT":
                    return app.update_task(task_id, payload)
                if method == "DELETE":
                    return app.delete_task(task_id)

            if len(segments) == 4 and segments[:2] == ["api", "tasks"] and segments[3] == "complete":
                if method == "POST":
                    return app.complete_task(segments[2])

            if segments == ["api", "upgrades"] and method == "POST":
                return app.apply_upgrade(payload.get("choice_type"))

            if segments == ["api", "campus", "rename"] and method == "POST":
                return app.rename_campus(payload.get("name"))

            if segments == ["api", "campus", "place"] and method == "POST":
                return app.place_building(payload)

            if segments == ["api", "reset"] and method == "POST":
                return app.reset()

            if segments == ["api", "settings"] and method == "PATCH":
                return app.update_settings(payload)

            if segments == ["api", "buildings"] and method == "GET":
                return app.list_buildings()

            if segments == ["api", "buildings"] and method == "POST":
                return app.create_building(payload)

            if len(segments) == 3 and segments[:2] == ["api", "buildings"]:
                building_id = segments[2]
                if method == "PUT":
                    return app.update_building(building_id, payload)
                if method == "DELETE":
                    return app.delete_building(building_id)

            raise ApiError("接口不存在。", status=HTTPStatus.NOT_FOUND)

        def _read_json(self):
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0:
                return {}
            body = self.rfile.read(length)
            if not body:
                return {}
            return json.loads(body.decode("utf-8"))

        def _send_json(self, status, payload):
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    return RequestHandler


def create_server(app=None, host="127.0.0.1", port=8000):
    web_app = app or WebGameApp()
    return AppServer((host, port), make_handler(web_app))


def run(host="127.0.0.1", port=8000, open_browser=True):
    try:
        server = create_server(host=host, port=port)
    except OSError:
        server = create_server(host=host, port=0)

    actual_port = server.server_address[1]
    url = f"http://127.0.0.1:{actual_port}/"
    print(f"校园网页界面已启动：{url}")

    if open_browser:
        try:
            webbrowser.open(url)
        except Exception:
            pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
