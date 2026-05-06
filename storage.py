"""JSON storage with versioned state and legacy migration."""

import json
import os
import tempfile
from copy import deepcopy
from datetime import datetime

DATA_FILE = "data.json"
CURRENT_DATA_VERSION = 3

LOAD_STATUS_OK = "ok"
LOAD_STATUS_MISSING = "missing"
LOAD_STATUS_MALFORMED = "malformed"
LOAD_STATUS_IO_ERROR = "io_error"

DEFAULT_STATE = {
    "version": CURRENT_DATA_VERSION,
    "player": {
        "level": 1,
        "xp": 0,
        "coins": 0,
        "streak_days": 0,
        "last_completed_on": None,
        "weekly_progress": {"completed": 0, "target": 15, "week_key": ""},
    },
    "campus": {
        "name": "珞珈山",
        "grid_size": 2,
        "available_cells": ["0,0", "1,0", "0,1", "1,1"],
        "grid": {},
        "prosperity": 0,
        "unlocked_regions": ["core"],
    },
    "collection": {
        "inventory": [],
        "catalog": [],
        "fragments": {},
        "pity_counter": 0,
    },
    "tasks": [],
    "settings": {"theme_name": "campus", "custom_icons": {}},
}

TASK_DEFAULTS = {
    "tags": [],
    "estimated_minutes": 25,
    "subtasks": [],
    "repeat_rule": "none",
    "completed_at": None,
    "scheduled_for_today": False,
}

LEGACY_DEFAULT_CAMPUS_NAMES = {
    "Luojia Hill": "珞珈山",
}


class Storage:
    """Data storage helper."""

    def __init__(self, data_file=DATA_FILE):
        self.data_file = data_file

    def load_state(self):
        raw, load_status = self._load_all()
        if load_status in {LOAD_STATUS_MISSING, LOAD_STATUS_MALFORMED, LOAD_STATUS_IO_ERROR}:
            return deepcopy(DEFAULT_STATE)

        state = self._migrate_data(raw)
        if load_status == LOAD_STATUS_OK and state != raw:
            self._save_all(state)
        return state

    def save_state(self, state):
        payload = state if isinstance(state, dict) else {}
        if self._is_future_version(payload):
            self._save_all(deepcopy(payload))
            return
        self._save_all(self._normalize_state(payload))

    def load_player(self):
        """Legacy helper for old player model consumers."""
        state = self.load_state()
        player = deepcopy(state.get("player", {}))
        campus = state.get("campus", {})
        collection = state.get("collection", {})

        player["grid_size"] = campus.get("grid_size", DEFAULT_STATE["campus"]["grid_size"])
        player["available_cells"] = deepcopy(
            campus.get("available_cells", DEFAULT_STATE["campus"]["available_cells"])
        )
        player["grid"] = deepcopy(campus.get("grid", {}))
        player["inventory"] = deepcopy(collection.get("inventory", []))
        return player

    def load_tasks(self):
        return deepcopy(self.load_state().get("tasks", []))

    def save_player(self, player):
        state = self.load_state()
        if hasattr(player, "to_dict"):
            payload = player.to_dict()
        elif isinstance(player, dict):
            payload = dict(player)
        else:
            payload = {}

        if not isinstance(state.get("player"), dict):
            state["player"] = {}
        if not isinstance(state.get("campus"), dict):
            state["campus"] = {}
        if not isinstance(state.get("collection"), dict):
            state["collection"] = {}

        legacy_campus_keys = {"grid_size", "available_cells", "grid"}
        for key, value in payload.items():
            if key in legacy_campus_keys or key == "inventory":
                continue
            state["player"][key] = deepcopy(value)

        if "grid_size" in payload:
            state["campus"]["grid_size"] = payload.get("grid_size")
        if "available_cells" in payload:
            state["campus"]["available_cells"] = deepcopy(payload.get("available_cells", []))
        if "grid" in payload:
            state["campus"]["grid"] = deepcopy(payload.get("grid", {}))
        if "inventory" in payload:
            state["collection"]["inventory"] = deepcopy(payload.get("inventory", []))

        self.save_state(state)

    def save_tasks(self, tasks):
        state = self.load_state()
        serialized = []
        for task in tasks or []:
            if hasattr(task, "to_dict"):
                serialized.append(task.to_dict())
            elif isinstance(task, dict):
                serialized.append(task)
        state["tasks"] = serialized
        self.save_state(state)

    def reset(self):
        if os.path.exists(self.data_file):
            os.remove(self.data_file)

    def _load_all(self):
        if not os.path.exists(self.data_file):
            return {}, LOAD_STATUS_MISSING

        try:
            with open(self.data_file, "r", encoding="utf-8") as handle:
                return json.load(handle), LOAD_STATUS_OK
        except json.JSONDecodeError:
            self._quarantine_corrupt_file()
            return {}, LOAD_STATUS_MALFORMED
        except OSError:
            return {}, LOAD_STATUS_IO_ERROR

    def _save_all(self, data):
        target_path = os.path.abspath(self.data_file)
        parent_dir = os.path.dirname(target_path) or "."
        os.makedirs(parent_dir, exist_ok=True)

        fd, temp_path = tempfile.mkstemp(prefix=".tmp-storage-", suffix=".json", dir=parent_dir)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(data, handle, ensure_ascii=False, indent=2)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temp_path, target_path)
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass

    def _quarantine_corrupt_file(self):
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        candidate = f"{self.data_file}.corrupt-{timestamp}"
        index = 1
        while os.path.exists(candidate):
            candidate = f"{self.data_file}.corrupt-{timestamp}-{index}"
            index += 1

        try:
            with open(self.data_file, "rb") as source, open(candidate, "wb") as backup:
                backup.write(source.read())
                backup.flush()
                os.fsync(backup.fileno())
        except OSError:
            return None
        return candidate

    def _is_future_version(self, state):
        if not isinstance(state, dict):
            return False
        version = state.get("version")
        return isinstance(version, int) and version > CURRENT_DATA_VERSION

    def _normalize_state(self, state):
        merged = deepcopy(DEFAULT_STATE)
        if isinstance(state.get("player"), dict):
            merged["player"].update(state.get("player", {}))
        if isinstance(state.get("campus"), dict):
            merged["campus"].update(state.get("campus", {}))
        campus_name = merged["campus"].get("name")
        if campus_name in LEGACY_DEFAULT_CAMPUS_NAMES:
            merged["campus"]["name"] = LEGACY_DEFAULT_CAMPUS_NAMES[campus_name]
        if isinstance(state.get("collection"), dict):
            merged["collection"].update(state.get("collection", {}))
        merged["tasks"] = self._normalize_tasks(state.get("tasks", []))
        if isinstance(state.get("settings"), dict):
            merged["settings"].update(state.get("settings", {}))
        if "custom_icons" not in merged["settings"]:
            merged["settings"]["custom_icons"] = {}
        for key, value in state.items():
            if key not in {"version", "player", "campus", "collection", "tasks", "settings"}:
                merged[key] = deepcopy(value)
        merged["version"] = CURRENT_DATA_VERSION
        return merged

    def _normalize_tasks(self, tasks):
        normalized = []
        if not isinstance(tasks, list):
            return normalized

        for task in tasks:
            if not isinstance(task, dict):
                continue
            merged_task = deepcopy(TASK_DEFAULTS)
            merged_task.update(task)
            normalized.append(merged_task)
        return normalized

    def _migrate_data(self, data):
        if not isinstance(data, dict) or not data:
            return deepcopy(DEFAULT_STATE)

        if self._is_future_version(data):
            return deepcopy(data)

        if "version" not in data:
            return self._migrate_legacy_data(data)

        version = data.get("version", 0)
        if version < CURRENT_DATA_VERSION:
            data = self._migrate_to_v3(data)

        return self._normalize_state(data)

    def _migrate_to_v3(self, data):
        # v2 -> v3: add custom_icons to settings
        data = deepcopy(data)
        if isinstance(data.get("settings"), dict):
            if "custom_icons" not in data["settings"]:
                data["settings"]["custom_icons"] = {}
        else:
            data["settings"] = {"custom_icons": {}}
        data["version"] = 3
        return data

    def _migrate_legacy_data(self, data):
        migrated = deepcopy(DEFAULT_STATE)
        legacy_player = data.get("player", {})

        if isinstance(legacy_player, dict):
            migrated["player"]["level"] = legacy_player.get("level", migrated["player"]["level"])
            migrated["player"]["xp"] = legacy_player.get("xp", migrated["player"]["xp"])
            migrated["campus"]["grid_size"] = legacy_player.get(
                "grid_size", migrated["campus"]["grid_size"]
            )
            migrated["campus"]["available_cells"] = deepcopy(
                legacy_player.get("available_cells", migrated["campus"]["available_cells"])
            )
            migrated["campus"]["grid"] = deepcopy(legacy_player.get("grid", migrated["campus"]["grid"]))
            migrated["collection"]["inventory"] = deepcopy(
                legacy_player.get("inventory", migrated["collection"]["inventory"])
            )

            for key, value in legacy_player.items():
                if key not in {"level", "xp", "grid_size", "available_cells", "grid", "inventory"}:
                    migrated["player"][key] = deepcopy(value)

        if isinstance(data.get("campus"), dict):
            migrated["campus"].update(data["campus"])
        if isinstance(data.get("collection"), dict):
            migrated["collection"].update(data["collection"])
        if isinstance(data.get("settings"), dict):
            migrated["settings"].update(data["settings"])
        if "custom_icons" not in migrated["settings"]:
            migrated["settings"]["custom_icons"] = {}

        migrated["tasks"] = self._normalize_tasks(data.get("tasks", []))
        for key, value in data.items():
            if key not in {"player", "campus", "collection", "tasks", "settings"}:
                migrated[key] = deepcopy(value)
        migrated["version"] = CURRENT_DATA_VERSION
        return migrated
