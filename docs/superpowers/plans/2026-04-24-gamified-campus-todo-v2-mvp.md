# Gamified Campus Todo V2 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the V2 first release from the approved spec: versioned storage, richer task data, fixed+random rewards, today/growth pages, campus rename, and a split UI shell that still ships as one working desktop app.

**Architecture:** Keep the current Python + `tkinter` application intact while incrementally extracting focused domain models, service-style methods inside `game_logic.py`, and tab/dialog modules under a new `ui/` package. Persist the whole app through one versioned JSON state object so every UI action can update memory, save atomically, and refresh all tabs from the same source of truth.

**Tech Stack:** Python 3.x, `tkinter`/`ttk`, standard-library `unittest`, JSON file storage, existing `buildings_data.py` content.

---

## Scope Guard

This plan covers only the approved `V2 首版必须交付` scope:

- `今日` page
- richer task management with edit/repeat/today flags
- fixed rewards plus random drops
- `校园` page with rename support
- `成长` page with streak/weekly progress/catalog summaries
- versioned storage and migration

It intentionally does **not** include accounts, sync, multiplayer, or a deeper economy.

## File Map

### Existing files to modify

- `main.py`: load the new versioned state and start the split UI shell
- `models.py`: define the V2 domain objects `Task`, `Player`, `Campus`, and `Collection`
- `game_logic.py`: keep the public facade, add reward/progression/task helper methods, and expose summary dictionaries for UI tabs
- `storage.py`: introduce `load_state()` / `save_state()` plus migration from the current legacy schema
- `buildings_data.py`: add building categories/effects used by the new reward and campus summaries
- `gui.py`: keep a compatibility shim that re-exports `MainWindow`

### New UI files to create

- `ui/__init__.py`: package marker
- `ui/main_window.py`: notebook shell, persistence callback, and shared refresh flow
- `ui/tabs/__init__.py`: tabs package marker
- `ui/tabs/today_tab.py`: daily summary and quick-add UI
- `ui/tabs/tasks_tab.py`: filtered task list, add/edit/delete/complete actions
- `ui/tabs/campus_tab.py`: campus grid, inventory summary, rename action
- `ui/tabs/growth_tab.py`: XP, streak, weekly progress, and catalog summary
- `ui/tabs/settings_tab.py`: reset and debug stats
- `ui/dialogs/__init__.py`: dialogs package marker
- `ui/dialogs/task_dialog.py`: add/edit task modal
- `ui/dialogs/reward_dialog.py`: completion summary modal

### New test files to create

- `tests/__init__.py`: test package marker
- `tests/test_storage.py`: migration and persistence tests
- `tests/test_models.py`: model round-trip/default tests
- `tests/test_game_logic.py`: reward/progression/task service tests
- `tests/test_ui_smoke.py`: notebook/tab/dialog smoke tests
- `tests/test_integration.py`: save/reload end-to-end test

## Task 1: Introduce Versioned Storage and the Test Harness

**Files:**
- Create: `tests/__init__.py`
- Create: `tests/test_storage.py`
- Modify: `storage.py`

- [ ] **Step 1: Write the failing storage migration test**

```python
import json
import tempfile
import unittest

from storage import CURRENT_DATA_VERSION, Storage


class StorageMigrationTests(unittest.TestCase):
    def test_load_state_migrates_legacy_payload_to_v2_schema(self):
        legacy_payload = {
            "player": {
                "level": 2,
                "xp": 120,
                "grid_size": 3,
                "available_cells": ["0,0", "1,0"],
                "inventory": ["school_gate"],
                "grid": {"0,0": "teaching_building"},
            },
            "tasks": [
                {
                    "id": "task-1",
                    "title": "Ship demo",
                    "priority": "important",
                    "completed": False,
                    "created_at": "2026-04-24T10:00:00",
                }
            ],
        }

        with tempfile.TemporaryDirectory() as tmpdir:
            data_path = f"{tmpdir}/data.json"
            with open(data_path, "w", encoding="utf-8") as handle:
                json.dump(legacy_payload, handle, ensure_ascii=False, indent=2)

            storage = Storage(data_path)
            state = storage.load_state()

        self.assertEqual(state["version"], CURRENT_DATA_VERSION)
        self.assertEqual(state["campus"]["name"], "珞珈山")
        self.assertEqual(state["collection"]["inventory"], ["school_gate"])
        self.assertEqual(state["tasks"][0]["estimated_minutes"], 25)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m unittest tests.test_storage.StorageMigrationTests.test_load_state_migrates_legacy_payload_to_v2_schema -v`

Expected: `ERROR` with `TypeError: Storage() takes no arguments`

- [ ] **Step 3: Implement versioned state loading and migration**

```python
import json
import os
from copy import deepcopy

DATA_FILE = "data.json"
CURRENT_DATA_VERSION = 2

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
    "settings": {"theme_name": "campus"},
}


class Storage:
    def __init__(self, data_file=DATA_FILE):
        self.data_file = data_file

    def load_state(self):
        raw = self._load_all()
        state = self._migrate_data(raw)
        if state != raw:
            self._save_all(state)
        return state

    def save_state(self, state):
        merged = deepcopy(DEFAULT_STATE)
        merged["player"].update(state.get("player", {}))
        merged["campus"].update(state.get("campus", {}))
        merged["collection"].update(state.get("collection", {}))
        merged["tasks"] = state.get("tasks", [])
        merged["settings"].update(state.get("settings", {}))
        merged["version"] = CURRENT_DATA_VERSION
        self._save_all(merged)

    def load_player(self):
        return self.load_state()["player"]

    def load_tasks(self):
        return self.load_state()["tasks"]

    def load_campus(self):
        return self.load_state()["campus"]

    def load_collection(self):
        return self.load_state()["collection"]

    def save_player(self, player):
        state = self.load_state()
        state["player"] = player.to_dict()
        self.save_state(state)

    def save_tasks(self, tasks):
        state = self.load_state()
        state["tasks"] = [task.to_dict() for task in tasks]
        self.save_state(state)

    def reset(self):
        if os.path.exists(self.data_file):
            os.remove(self.data_file)

    def _load_all(self):
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, "r", encoding="utf-8") as handle:
                    return json.load(handle)
            except (json.JSONDecodeError, IOError):
                return {}
        return {}

    def _save_all(self, data):
        with open(self.data_file, "w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)

    def _migrate_data(self, data):
        if not data:
            return deepcopy(DEFAULT_STATE)

        if "version" not in data:
            legacy_player = data.get("player", {})
            migrated = deepcopy(DEFAULT_STATE)
            migrated["player"]["level"] = legacy_player.get("level", 1)
            migrated["player"]["xp"] = legacy_player.get("xp", 0)
            migrated["campus"]["grid_size"] = legacy_player.get("grid_size", 2)
            migrated["campus"]["available_cells"] = legacy_player.get(
                "available_cells", ["0,0", "1,0", "0,1", "1,1"]
            )
            migrated["campus"]["grid"] = legacy_player.get("grid", {})
            migrated["collection"]["inventory"] = legacy_player.get("inventory", [])
            migrated["tasks"] = [
                {
                    "tags": [],
                    "estimated_minutes": 25,
                    "subtasks": [],
                    "repeat_rule": "none",
                    "completed_at": None,
                    "scheduled_for_today": False,
                    **task,
                }
                for task in data.get("tasks", [])
            ]
            return migrated

        migrated = deepcopy(DEFAULT_STATE)
        migrated["player"].update(data.get("player", {}))
        migrated["campus"].update(data.get("campus", {}))
        migrated["collection"].update(data.get("collection", {}))
        migrated["tasks"] = data.get("tasks", [])
        migrated["settings"].update(data.get("settings", {}))
        migrated["version"] = CURRENT_DATA_VERSION
        return migrated
```

- [ ] **Step 4: Run the storage test to verify it passes**

Run: `python -m unittest tests.test_storage.StorageMigrationTests.test_load_state_migrates_legacy_payload_to_v2_schema -v`

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add storage.py tests/__init__.py tests/test_storage.py
git commit -m "test: add versioned storage migration"
```

## Task 2: Expand the Domain Models for V2 Data

**Files:**
- Modify: `models.py`
- Create: `tests/test_models.py`

- [ ] **Step 1: Write the failing model tests**

```python
import unittest

from models import Campus, Collection, Player, Task


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
            name="珞珈山",
            grid_size=3,
            available_cells={"0,0", "1,0"},
            grid={"0,0": "school_gate"},
            prosperity=18,
            unlocked_regions=["core", "library"],
        )

        restored = Campus.from_dict(campus.to_dict())

        self.assertEqual(restored.name, "珞珈山")
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
```

- [ ] **Step 2: Run the model tests to verify they fail**

Run: `python -m unittest tests.test_models -v`

Expected: `ImportError` for `Campus` and `Collection`

- [ ] **Step 3: Implement the V2 model layer**

```python
import uuid
from datetime import date, datetime, timedelta


class Task:
    PRIORITY_XP = {"normal": 12, "important": 20, "urgent": 30}

    def __init__(
        self,
        title,
        priority="normal",
        deadline=None,
        tags=None,
        estimated_minutes=25,
        subtasks=None,
        repeat_rule="none",
        completed_at=None,
        scheduled_for_today=False,
    ):
        self.id = str(uuid.uuid4())[:8]
        self.title = title
        self.priority = priority
        self.deadline = deadline
        self.tags = tags or []
        self.estimated_minutes = estimated_minutes
        self.subtasks = subtasks or []
        self.repeat_rule = repeat_rule
        self.completed = False
        self.completed_at = completed_at
        self.scheduled_for_today = scheduled_for_today
        self.created_at = datetime.now().isoformat()

    def complete(self):
        self.completed = True
        self.completed_at = datetime.now().isoformat()

    def get_xp_reward(self):
        return self.PRIORITY_XP.get(self.priority, 12)

    def is_overdue(self):
        if not self.deadline or self.completed:
            return False
        deadline_date = datetime.strptime(self.deadline, "%Y-%m-%d").date()
        return date.today() > deadline_date

    def is_due_today(self):
        return bool(self.deadline and self.deadline == date.today().isoformat())

    def copy_for_repeat(self):
        next_deadline = None
        if self.deadline and self.repeat_rule in {"daily", "weekly"}:
            step = 1 if self.repeat_rule == "daily" else 7
            next_deadline = (
                datetime.strptime(self.deadline, "%Y-%m-%d") + timedelta(days=step)
            ).strftime("%Y-%m-%d")
        clone = Task(
            title=self.title,
            priority=self.priority,
            deadline=next_deadline,
            tags=list(self.tags),
            estimated_minutes=self.estimated_minutes,
            subtasks=list(self.subtasks),
            repeat_rule=self.repeat_rule,
            scheduled_for_today=False,
        )
        return clone

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "priority": self.priority,
            "deadline": self.deadline,
            "tags": self.tags,
            "estimated_minutes": self.estimated_minutes,
            "subtasks": self.subtasks,
            "repeat_rule": self.repeat_rule,
            "completed": self.completed,
            "completed_at": self.completed_at,
            "scheduled_for_today": self.scheduled_for_today,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data):
        task = cls(
            data["title"],
            data.get("priority", "normal"),
            data.get("deadline"),
            tags=data.get("tags", []),
            estimated_minutes=data.get("estimated_minutes", 25),
            subtasks=data.get("subtasks", []),
            repeat_rule=data.get("repeat_rule", "none"),
            completed_at=data.get("completed_at"),
            scheduled_for_today=data.get("scheduled_for_today", False),
        )
        task.id = data["id"]
        task.completed = data.get("completed", False)
        task.created_at = data.get("created_at", datetime.now().isoformat())
        return task


class Player:
    LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500]

    def __init__(
        self,
        level=1,
        xp=0,
        coins=0,
        streak_days=0,
        last_completed_on=None,
        weekly_progress=None,
    ):
        self.level = level
        self.xp = xp
        self.coins = coins
        self.streak_days = streak_days
        self.last_completed_on = last_completed_on
        self.weekly_progress = weekly_progress or {
            "completed": 0,
            "target": 15,
            "week_key": "",
        }

    def add_xp(self, amount):
        self.xp += amount
        leveled_up = False
        while self._can_level_up():
            self.level += 1
            leveled_up = True
        return leveled_up

    def _can_level_up(self):
        if self.level >= len(self.LEVEL_THRESHOLDS):
            return False
        return self.xp >= self.LEVEL_THRESHOLDS[self.level]

    def register_completion(self, completed_at=None):
        timestamp = completed_at or datetime.now()
        today_iso = timestamp.date().isoformat()
        week_key = timestamp.strftime("%G-W%V")

        if self.weekly_progress.get("week_key") != week_key:
            self.weekly_progress = {"completed": 0, "target": 15, "week_key": week_key}

        self.weekly_progress["completed"] += 1

        if self.last_completed_on is None:
            self.streak_days = 1
        else:
            previous = datetime.strptime(self.last_completed_on, "%Y-%m-%d").date()
            delta_days = (timestamp.date() - previous).days
            if delta_days == 0:
                pass
            elif delta_days == 1:
                self.streak_days += 1
            else:
                self.streak_days = 1

        self.last_completed_on = today_iso

    def get_xp_for_next_level(self):
        if self.level >= len(self.LEVEL_THRESHOLDS):
            return float("inf")
        return self.LEVEL_THRESHOLDS[self.level]

    def get_xp_progress(self):
        if self.level >= len(self.LEVEL_THRESHOLDS):
            return 1.0
        current_threshold = self.LEVEL_THRESHOLDS[self.level - 1]
        next_threshold = self.LEVEL_THRESHOLDS[self.level]
        progress = (self.xp - current_threshold) / (next_threshold - current_threshold)
        return max(0.0, min(1.0, progress))

    def to_dict(self):
        return {
            "level": self.level,
            "xp": self.xp,
            "coins": self.coins,
            "streak_days": self.streak_days,
            "last_completed_on": self.last_completed_on,
            "weekly_progress": self.weekly_progress,
        }

    @classmethod
    def from_dict(cls, data):
        return cls(
            level=data.get("level", 1),
            xp=data.get("xp", 0),
            coins=data.get("coins", 0),
            streak_days=data.get("streak_days", 0),
            last_completed_on=data.get("last_completed_on"),
            weekly_progress=data.get("weekly_progress"),
        )


class Campus:
    def __init__(
        self,
        name="珞珈山",
        grid_size=2,
        available_cells=None,
        grid=None,
        prosperity=0,
        unlocked_regions=None,
    ):
        self.name = name
        self.grid_size = grid_size
        self.available_cells = set(available_cells or {"0,0", "1,0", "0,1", "1,1"})
        self.grid = grid or {}
        self.prosperity = prosperity
        self.unlocked_regions = unlocked_regions or ["core"]
        self._ensure_grid()

    def _ensure_grid(self):
        for y in range(self.grid_size):
            for x in range(self.grid_size):
                self.grid.setdefault(f"{x},{y}", None)

    def rename(self, name):
        self.name = name.strip() or self.name

    def add_prosperity(self, amount):
        self.prosperity += amount
        if self.prosperity >= 50 and "library" not in self.unlocked_regions:
            self.unlocked_regions.append("library")
            self.add_empty_slots(2)

    def expand_grid(self):
        self.grid_size += 1
        self._ensure_grid()

    def add_empty_slots(self, count):
        candidates = []
        for y in range(self.grid_size):
            for x in range(self.grid_size):
                key = f"{x},{y}"
                if key not in self.available_cells:
                    candidates.append(key)
        for key in candidates[:count]:
            self.available_cells.add(key)

    def place_building(self, x, y, building_id):
        key = f"{x},{y}"
        if key not in self.available_cells or self.grid.get(key) is not None:
            return False
        self.grid[key] = building_id
        return True

    def remove_building(self, x, y):
        key = f"{x},{y}"
        building_id = self.grid.get(key)
        self.grid[key] = None
        return building_id

    def to_dict(self):
        return {
            "name": self.name,
            "grid_size": self.grid_size,
            "available_cells": sorted(self.available_cells),
            "grid": self.grid,
            "prosperity": self.prosperity,
            "unlocked_regions": self.unlocked_regions,
        }

    @classmethod
    def from_dict(cls, data):
        return cls(
            name=data.get("name", "珞珈山"),
            grid_size=data.get("grid_size", 2),
            available_cells=set(data.get("available_cells", ["0,0", "1,0", "0,1", "1,1"])),
            grid=data.get("grid", {}),
            prosperity=data.get("prosperity", 0),
            unlocked_regions=data.get("unlocked_regions", ["core"]),
        )


class Collection:
    def __init__(self, inventory=None, catalog=None, fragments=None, pity_counter=0):
        self.inventory = inventory or []
        self.catalog = catalog or []
        self.fragments = fragments or {}
        self.pity_counter = pity_counter

    def add_building(self, building_id):
        self.inventory.append(building_id)
        if building_id not in self.catalog:
            self.catalog.append(building_id)
        self.pity_counter = 0

    def record_fragment(self, building_id, amount=1):
        self.fragments[building_id] = self.fragments.get(building_id, 0) + amount
        self.pity_counter += 1

    def to_dict(self):
        return {
            "inventory": self.inventory,
            "catalog": self.catalog,
            "fragments": self.fragments,
            "pity_counter": self.pity_counter,
        }

    @classmethod
    def from_dict(cls, data):
        return cls(
            inventory=data.get("inventory", []),
            catalog=data.get("catalog", []),
            fragments=data.get("fragments", {}),
            pity_counter=data.get("pity_counter", 0),
        )
```

- [ ] **Step 4: Run the model tests to verify they pass**

Run: `python -m unittest tests.test_models -v`

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add models.py tests/test_models.py
git commit -m "feat: add v2 task player campus models"
```

## Task 3: Upgrade Building Metadata and Reward/Progression Logic

**Files:**
- Modify: `buildings_data.py`
- Modify: `game_logic.py`
- Create: `tests/test_game_logic.py`

- [ ] **Step 1: Write the failing reward tests**

```python
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
```

- [ ] **Step 2: Run the reward tests to verify they fail**

Run: `python -m unittest tests.test_game_logic.RewardEngineTests -v`

Expected: `TypeError` because `GameLogic` still expects the legacy constructor

- [ ] **Step 3: Implement building effects plus the new reward engine**

```python
BUILDINGS = {
    "teaching_building": {
        "id": "teaching_building",
        "name": "教学楼",
        "emoji": "🏫",
        "rarity": "common",
        "category": "functional",
        "effects": {"xp_bonus": 0.05},
        "description": "日常教学场所",
    },
    "college_building": {
        "id": "college_building",
        "name": "学院楼",
        "emoji": "🏢",
        "rarity": "common",
        "category": "functional",
        "effects": {"weekly_bonus": 0.05},
        "description": "学院与办公室区域",
    },
    "office_building": {
        "id": "office_building",
        "name": "办公楼",
        "emoji": "🏬",
        "rarity": "common",
        "category": "functional",
        "effects": {"coin_bonus": 0.05},
        "description": "行政管理中心",
    },
    "school_gate": {
        "id": "school_gate",
        "name": "校门",
        "emoji": "🏛",
        "rarity": "rare",
        "category": "landmark",
        "effects": {"rare_drop_bonus": 0.08},
        "description": "校园地标入口",
    },
    "leijun_building": {
        "id": "leijun_building",
        "name": "雷军楼",
        "emoji": "🌟",
        "rarity": "epic",
        "category": "landmark",
        "effects": {"streak_bonus": 0.1, "rare_drop_bonus": 0.12},
        "description": "高稀有度校园地标",
    },
}
```

```python
import random
from dataclasses import dataclass

from buildings_data import BUILDINGS, get_building_by_id


@dataclass
class RewardResult:
    xp: int
    coins: int
    campus_points: int
    leveled_up: bool
    dropped_building: dict | None
    streak_days: int
    weekly_completed: int
    repeated_task: object | None


class GameLogic:
    RARITY_DROP_RATES = {"common": 0.68, "rare": 0.24, "epic": 0.08}

    def __init__(self, player, campus, collection, tasks):
        self.player = player
        self.campus = campus
        self.collection = collection
        self.tasks = tasks

    def _find_task(self, task_id):
        for task in self.tasks:
            if task.id == task_id:
                return task
        return None

    def _get_building_effect_bonus(self, effect_name):
        total = 0.0
        for building_id in self.collection.inventory:
            building = get_building_by_id(building_id)
            if building:
                total += building.get("effects", {}).get(effect_name, 0.0)
        for building_id in self.campus.grid.values():
            if building_id:
                building = get_building_by_id(building_id)
                if building:
                    total += building.get("effects", {}).get(effect_name, 0.0)
        return total

    def _calculate_fixed_rewards(self, task):
        base = task.get_xp_reward()
        duration_bonus = min(task.estimated_minutes, 120) // 30 * 3
        today_bonus = 4 if task.scheduled_for_today else 0
        repeat_multiplier = 0.85 if task.repeat_rule != "none" else 1.0
        micro_multiplier = 0.7 if task.estimated_minutes <= 15 else 1.0
        streak_multiplier = 1 + min(self.player.streak_days, 5) * 0.03
        xp_multiplier = 1 + self._get_building_effect_bonus("xp_bonus")

        total_xp = int(
            (base + duration_bonus + today_bonus)
            * repeat_multiplier
            * micro_multiplier
            * streak_multiplier
            * xp_multiplier
        )

        return {
            "xp": max(total_xp, 6),
            "coins": max(int(total_xp * (0.3 + self._get_building_effect_bonus("coin_bonus"))), 3),
            "campus_points": max(int(total_xp * 0.5), 5),
        }

    def _get_random_building_by_rarity(self, rarity):
        candidates = [building for building in BUILDINGS.values() if building["rarity"] == rarity]
        if not candidates:
            return None
        return random.choice(candidates)

    def _roll_building_drop(self):
        rare_bonus = self._get_building_effect_bonus("rare_drop_bonus")
        roll = random.random()
        adjusted_rates = {
            "common": max(self.RARITY_DROP_RATES["common"] - rare_bonus / 2, 0.4),
            "rare": self.RARITY_DROP_RATES["rare"] + rare_bonus / 2,
            "epic": self.RARITY_DROP_RATES["epic"] + rare_bonus / 2,
        }
        cumulative = 0.0
        for rarity in ("common", "rare", "epic"):
            cumulative += adjusted_rates[rarity]
            if roll < cumulative:
                return self._get_random_building_by_rarity(rarity)
        return self._get_random_building_by_rarity("common")

    def complete_task(self, task_id):
        task = self._find_task(task_id)
        if not task or task.completed:
            return None

        rewards = self._calculate_fixed_rewards(task)
        task.complete()
        self.player.register_completion()
        leveled_up = self.player.add_xp(rewards["xp"])
        self.player.coins += rewards["coins"]
        self.campus.add_prosperity(rewards["campus_points"])

        dropped_building = self._roll_building_drop()
        if dropped_building:
            self.collection.add_building(dropped_building["id"])

        repeated_task = None
        return RewardResult(
            xp=rewards["xp"],
            coins=rewards["coins"],
            campus_points=rewards["campus_points"],
            leveled_up=leveled_up,
            dropped_building=dropped_building,
            streak_days=self.player.streak_days,
            weekly_completed=self.player.weekly_progress["completed"],
            repeated_task=repeated_task,
        )
```

- [ ] **Step 4: Run the reward tests to verify they pass**

Run: `python -m unittest tests.test_game_logic.RewardEngineTests -v`

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add buildings_data.py game_logic.py tests/test_game_logic.py
git commit -m "feat: add v2 reward and progression engine"
```

## Task 4: Add Task Views, Editing, and Repeat Scheduling

**Files:**
- Modify: `game_logic.py`
- Modify: `models.py`
- Modify: `tests/test_game_logic.py`

- [ ] **Step 1: Add failing task service tests**

```python
class TaskServiceTests(unittest.TestCase):
    def test_get_tasks_supports_today_planned_and_completed_views(self):
        today_task = Task("Today", scheduled_for_today=True)
        planned_task = Task("Planned")
        completed_task = Task("Done")
        completed_task.complete()
        logic = GameLogic(Player(), Campus(), Collection(), [today_task, planned_task, completed_task])

        self.assertEqual([task.title for task in logic.get_tasks("today")], ["Today"])
        self.assertEqual(
            [task.title for task in logic.get_tasks("planned")],
            ["Today", "Planned"],
        )
        self.assertEqual([task.title for task in logic.get_tasks("completed")], ["Done"])

    def test_completing_daily_repeat_task_spawns_next_copy(self):
        task = Task(
            "Review inbox",
            deadline="2026-04-24",
            repeat_rule="daily",
            scheduled_for_today=True,
        )
        logic = GameLogic(Player(), Campus(), Collection(), [task])

        result = logic.complete_task(task.id)

        self.assertIsNotNone(result.repeated_task)
        self.assertEqual(result.repeated_task.deadline, "2026-04-25")
        self.assertFalse(result.repeated_task.completed)
```

- [ ] **Step 2: Run the task service tests to verify they fail**

Run: `python -m unittest tests.test_game_logic.TaskServiceTests -v`

Expected: `AttributeError` for `get_tasks`

- [ ] **Step 3: Implement filtered task access, updates, and repeat spawning**

```python
from datetime import date


class GameLogic:
    def add_task(self, title, priority="normal", deadline=None, **extra):
        task = Task(
            title=title,
            priority=priority,
            deadline=deadline,
            tags=extra.get("tags", []),
            estimated_minutes=extra.get("estimated_minutes", 25),
            subtasks=extra.get("subtasks", []),
            repeat_rule=extra.get("repeat_rule", "none"),
            scheduled_for_today=extra.get("scheduled_for_today", False),
        )
        self.tasks.append(task)
        return task

    def update_task(self, task_id, **changes):
        task = self._find_task(task_id)
        if not task:
            return None
        for field in (
            "title",
            "priority",
            "deadline",
            "tags",
            "estimated_minutes",
            "subtasks",
            "repeat_rule",
            "scheduled_for_today",
        ):
            if field in changes:
                setattr(task, field, changes[field])
        return task

    def delete_task(self, task_id):
        task = self._find_task(task_id)
        if not task:
            return False
        self.tasks.remove(task)
        return True

    def get_tasks(self, view="planned"):
        if view == "today":
            return [
                task
                for task in self.tasks
                if not task.completed and (task.scheduled_for_today or task.is_due_today())
            ]
        if view == "completed":
            return [task for task in self.tasks if task.completed]
        return [task for task in self.tasks if not task.completed]

    def _spawn_repeat_task(self, task):
        if task.repeat_rule == "none":
            return None
        repeated_task = task.copy_for_repeat()
        self.tasks.append(repeated_task)
        return repeated_task

    def get_today_summary(self):
        completed_today = [
            task
            for task in self.get_tasks("completed")
            if task.completed_at and task.completed_at.startswith(date.today().isoformat())
        ]
        return {
            "today_count": len(self.get_tasks("today")),
            "completed_today": len(completed_today),
            "streak_days": self.player.streak_days,
            "weekly_completed": self.player.weekly_progress["completed"],
            "weekly_target": self.player.weekly_progress["target"],
            "campus_name": self.campus.name,
            "campus_progress": self.campus.prosperity,
        }

    def get_growth_summary(self):
        return {
            "level": self.player.level,
            "xp": self.player.xp,
            "xp_ratio": self.player.get_xp_progress(),
            "streak_days": self.player.streak_days,
            "weekly_completed": self.player.weekly_progress["completed"],
            "weekly_target": self.player.weekly_progress["target"],
            "catalog_count": len(self.collection.catalog),
            "inventory_count": len(self.collection.inventory),
        }

    def to_state(self):
        return {
            "player": self.player.to_dict(),
            "campus": self.campus.to_dict(),
            "collection": self.collection.to_dict(),
            "tasks": [task.to_dict() for task in self.tasks],
            "settings": {"theme_name": "campus"},
        }

    def complete_task(self, task_id):
        task = self._find_task(task_id)
        if not task or task.completed:
            return None

        rewards = self._calculate_fixed_rewards(task)
        task.complete()
        self.player.register_completion()
        leveled_up = self.player.add_xp(rewards["xp"])
        self.player.coins += rewards["coins"]
        self.campus.add_prosperity(rewards["campus_points"])

        dropped_building = self._roll_building_drop()
        if dropped_building:
            self.collection.add_building(dropped_building["id"])

        repeated_task = self._spawn_repeat_task(task)
        return RewardResult(
            xp=rewards["xp"],
            coins=rewards["coins"],
            campus_points=rewards["campus_points"],
            leveled_up=leveled_up,
            dropped_building=dropped_building,
            streak_days=self.player.streak_days,
            weekly_completed=self.player.weekly_progress["completed"],
            repeated_task=repeated_task,
        )
```

- [ ] **Step 4: Run the task service tests to verify they pass**

Run: `python -m unittest tests.test_game_logic.TaskServiceTests -v`

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add game_logic.py models.py tests/test_game_logic.py
git commit -m "feat: add v2 task views and repeat scheduling"
```

## Task 5: Split the UI Shell into a Package and Centralize Persistence

**Files:**
- Create: `ui/__init__.py`
- Create: `ui/main_window.py`
- Create: `ui/tabs/__init__.py`
- Create: `ui/tabs/today_tab.py`
- Create: `ui/tabs/tasks_tab.py`
- Create: `ui/tabs/campus_tab.py`
- Create: `ui/tabs/growth_tab.py`
- Create: `ui/tabs/settings_tab.py`
- Create: `ui/dialogs/__init__.py`
- Create: `ui/dialogs/reward_dialog.py`
- Modify: `main.py`
- Modify: `gui.py`
- Create: `tests/test_ui_smoke.py`

- [ ] **Step 1: Write the failing UI shell smoke test**

```python
import tkinter as tk
import unittest

from game_logic import GameLogic
from models import Campus, Collection, Player
from ui.main_window import MainWindow


class DummyStorage:
    def __init__(self):
        self.saved_state = None

    def save_state(self, state):
        self.saved_state = state


class UIShellTests(unittest.TestCase):
    def test_main_window_exposes_v2_tabs(self):
        root = tk.Tk()
        root.withdraw()
        game = GameLogic(Player(), Campus(), Collection(), [])
        window = MainWindow(root, game, DummyStorage())

        labels = [
            window.notebook.tab(index, "text")
            for index in range(window.notebook.index("end"))
        ]

        self.assertEqual(labels, ["今日", "任务", "校园", "成长", "设置"])
        window.destroy()
        root.destroy()


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the smoke test to verify it fails**

Run: `python -m unittest tests.test_ui_smoke.UIShellTests.test_main_window_exposes_v2_tabs -v`

Expected: `ModuleNotFoundError: No module named 'ui'`

- [ ] **Step 3: Create the new UI package, wire `main.py`, and add a save/refresh shell**

```python
# ui/__init__.py
from ui.main_window import MainWindow

__all__ = ["MainWindow"]
```

```python
# ui/main_window.py
import tkinter as tk
from tkinter import ttk

from ui.tabs.campus_tab import CampusTab
from ui.tabs.growth_tab import GrowthTab
from ui.tabs.settings_tab import SettingsTab
from ui.tabs.tasks_tab import TasksTab
from ui.tabs.today_tab import TodayTab


class MainWindow(tk.Frame):
    def __init__(self, parent, game, storage):
        super().__init__(parent)
        self.game = game
        self.storage = storage
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill="both", expand=True, padx=10, pady=10)

        self.today_tab = TodayTab(self.notebook, self.game, self.handle_state_change)
        self.tasks_tab = TasksTab(self.notebook, self.game, self.handle_state_change)
        self.campus_tab = CampusTab(self.notebook, self.game, self.handle_state_change)
        self.growth_tab = GrowthTab(self.notebook, self.game)
        self.settings_tab = SettingsTab(self.notebook, self.game, self.storage)

        self.notebook.add(self.today_tab, text="今日")
        self.notebook.add(self.tasks_tab, text="任务")
        self.notebook.add(self.campus_tab, text="校园")
        self.notebook.add(self.growth_tab, text="成长")
        self.notebook.add(self.settings_tab, text="设置")
        self.refresh_all()

    def handle_state_change(self):
        self.storage.save_state(self.game.to_state())
        self.refresh_all()

    def refresh_all(self):
        for tab in (
            self.today_tab,
            self.tasks_tab,
            self.campus_tab,
            self.growth_tab,
            self.settings_tab,
        ):
            if hasattr(tab, "refresh"):
                tab.refresh()
```

```python
# ui/tabs/today_tab.py
import tkinter as tk


class TodayTab(tk.Frame):
    def __init__(self, parent, game, on_change):
        super().__init__(parent)
        self.game = game
        self.on_change = on_change

    def refresh(self):
        return None
```

```python
# ui/tabs/tasks_tab.py
import tkinter as tk


class TasksTab(tk.Frame):
    def __init__(self, parent, game, on_change):
        super().__init__(parent)
        self.game = game
        self.on_change = on_change

    def refresh(self):
        return None
```

```python
# ui/tabs/campus_tab.py
import tkinter as tk


class CampusTab(tk.Frame):
    def __init__(self, parent, game, on_change):
        super().__init__(parent)
        self.game = game
        self.on_change = on_change

    def refresh(self):
        return None
```

```python
# ui/tabs/growth_tab.py
import tkinter as tk


class GrowthTab(tk.Frame):
    def __init__(self, parent, game):
        super().__init__(parent)
        self.game = game

    def refresh(self):
        return None
```

```python
# ui/tabs/settings_tab.py
import tkinter as tk


class SettingsTab(tk.Frame):
    def __init__(self, parent, game, storage):
        super().__init__(parent)
        self.game = game
        self.storage = storage

    def refresh(self):
        return None
```

```python
# ui/tabs/__init__.py and ui/dialogs/__init__.py
# Leave both files empty.
```

```python
# ui/dialogs/reward_dialog.py
import tkinter as tk


class RewardDialog(tk.Toplevel):
    def __init__(self, parent, result):
        super().__init__(parent)
        self.title("任务完成")
        tk.Label(self, text=f"XP +{result.xp}").pack(padx=12, pady=12)
```

```python
# gui.py
from ui.main_window import MainWindow

__all__ = ["MainWindow"]
```

```python
# main.py
import io
import sys
import tkinter as tk

from game_logic import GameLogic
from models import Campus, Collection, Player, Task
from storage import Storage
from ui.main_window import MainWindow

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")


def main():
    storage = Storage()
    state = storage.load_state()
    player = Player.from_dict(state["player"])
    campus = Campus.from_dict(state["campus"])
    collection = Collection.from_dict(state["collection"])
    tasks = [Task.from_dict(item) for item in state["tasks"]]
    game = GameLogic(player, campus, collection, tasks)

    root = tk.Tk()
    root.title("珞珈山养成 Todo")
    root.geometry("980x720")
    root.resizable(True, True)

    app = MainWindow(root, game, storage)
    app.pack(fill="both", expand=True)
    root.mainloop()


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run the UI shell smoke test to verify it passes**

Run: `python -m unittest tests.test_ui_smoke.UIShellTests.test_main_window_exposes_v2_tabs -v`

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add main.py gui.py ui tests/test_ui_smoke.py
git commit -m "refactor: split ui shell into package"
```

## Task 6: Implement the Today and Growth Tabs

**Files:**
- Modify: `ui/tabs/today_tab.py`
- Modify: `ui/tabs/growth_tab.py`
- Modify: `tests/test_ui_smoke.py`

- [ ] **Step 1: Extend the UI smoke tests for today/growth summaries**

```python
from ui.tabs.growth_tab import GrowthTab
from ui.tabs.today_tab import TodayTab


class TodayAndGrowthTabTests(unittest.TestCase):
    def test_today_and_growth_tabs_render_summary_text(self):
        root = tk.Tk()
        root.withdraw()

        player = Player(level=2, xp=120, streak_days=3, weekly_progress={"completed": 4, "target": 15, "week_key": "2026-W17"})
        campus = Campus(name="珞珈山", prosperity=22)
        collection = Collection(catalog=["school_gate"], inventory=["school_gate"])
        tasks = [Task("Today item", scheduled_for_today=True)]
        game = GameLogic(player, campus, collection, tasks)

        today_tab = TodayTab(root, game, lambda: None)
        growth_tab = GrowthTab(root, game)
        today_tab.refresh()
        growth_tab.refresh()

        self.assertIn("今日任务 1 项", today_tab.summary_var.get())
        self.assertIn("连击 3 天", growth_tab.streak_var.get())
        self.assertIn("图鉴 1 项", growth_tab.catalog_var.get())

        today_tab.destroy()
        growth_tab.destroy()
        root.destroy()
```

- [ ] **Step 2: Run the new tab test to verify it fails**

Run: `python -m unittest tests.test_ui_smoke.TodayAndGrowthTabTests.test_today_and_growth_tabs_render_summary_text -v`

Expected: `AttributeError` for `summary_var`

- [ ] **Step 3: Implement both summary tabs**

```python
# ui/tabs/today_tab.py
import tkinter as tk
from tkinter import ttk


class TodayTab(tk.Frame):
    def __init__(self, parent, game, on_change):
        super().__init__(parent, bg="#F4F8EE")
        self.game = game
        self.on_change = on_change
        self.summary_var = tk.StringVar()
        self.progress_var = tk.StringVar()
        self.quick_title_var = tk.StringVar()

        card = tk.Frame(self, bg="#FFFFFF", bd=2, relief="groove")
        card.pack(fill="x", padx=16, pady=16)
        tk.Label(card, text="今日总览", font=("Arial", 14, "bold"), bg="#FFFFFF").pack(anchor="w", padx=12, pady=(12, 4))
        tk.Label(card, textvariable=self.summary_var, font=("Arial", 11), bg="#FFFFFF").pack(anchor="w", padx=12)
        tk.Label(card, textvariable=self.progress_var, font=("Arial", 10), bg="#FFFFFF", fg="#456A45").pack(anchor="w", padx=12, pady=(4, 12))

        quick = tk.Frame(self, bg="#F4F8EE")
        quick.pack(fill="x", padx=16)
        tk.Entry(quick, textvariable=self.quick_title_var, font=("Arial", 11)).pack(side="left", fill="x", expand=True)
        ttk.Button(quick, text="快速添加", command=self._quick_add).pack(side="left", padx=8)

    def _quick_add(self):
        title = self.quick_title_var.get().strip()
        if not title:
            return
        self.game.add_task(title, scheduled_for_today=True)
        self.quick_title_var.set("")
        self.on_change()

    def refresh(self):
        summary = self.game.get_today_summary()
        self.summary_var.set(
            f"今日任务 {summary['today_count']} 项 | 已完成 {summary['completed_today']} 项 | 校园 {summary['campus_name']}"
        )
        self.progress_var.set(
            f"连击 {summary['streak_days']} 天 | 周进度 {summary['weekly_completed']}/{self.game.player.weekly_progress['target']} | 建设度 {summary['campus_progress']}"
        )
```

```python
# ui/tabs/growth_tab.py
import tkinter as tk
from tkinter import ttk


class GrowthTab(tk.Frame):
    def __init__(self, parent, game):
        super().__init__(parent, bg="#FFF8E7")
        self.game = game
        self.level_var = tk.StringVar()
        self.streak_var = tk.StringVar()
        self.catalog_var = tk.StringVar()
        self.progress = ttk.Progressbar(self, maximum=100, mode="determinate", length=320)
        tk.Label(self, text="成长", font=("Arial", 14, "bold"), bg="#FFF8E7").pack(anchor="w", padx=16, pady=(16, 8))
        tk.Label(self, textvariable=self.level_var, font=("Arial", 11), bg="#FFF8E7").pack(anchor="w", padx=16)
        self.progress.pack(anchor="w", padx=16, pady=8)
        tk.Label(self, textvariable=self.streak_var, font=("Arial", 11), bg="#FFF8E7").pack(anchor="w", padx=16)
        tk.Label(self, textvariable=self.catalog_var, font=("Arial", 11), bg="#FFF8E7").pack(anchor="w", padx=16, pady=(4, 0))

    def refresh(self):
        summary = self.game.get_growth_summary()
        self.level_var.set(f"Lv.{summary['level']} | XP {summary['xp']}")
        self.streak_var.set(
            f"连击 {summary['streak_days']} 天 | 周目标 {summary['weekly_completed']}/{summary['weekly_target']}"
        )
        self.catalog_var.set(
            f"图鉴 {summary['catalog_count']} 项 | 背包 {summary['inventory_count']} 项"
        )
        self.progress["value"] = summary["xp_ratio"] * 100
```

- [ ] **Step 4: Run the new tab test to verify it passes**

Run: `python -m unittest tests.test_ui_smoke.TodayAndGrowthTabTests.test_today_and_growth_tabs_render_summary_text -v`

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add ui/tabs/today_tab.py ui/tabs/growth_tab.py tests/test_ui_smoke.py
git commit -m "feat: add today and growth tabs"
```

## Task 7: Implement the Task Dialog and the V2 Tasks Tab

**Files:**
- Create: `ui/dialogs/task_dialog.py`
- Modify: `ui/tabs/tasks_tab.py`
- Modify: `tests/test_ui_smoke.py`

- [ ] **Step 1: Add the failing tasks tab smoke test**

```python
from ui.tabs.tasks_tab import TasksTab


class TasksTabTests(unittest.TestCase):
    def test_tasks_tab_switches_between_today_planned_and_completed(self):
        root = tk.Tk()
        root.withdraw()

        today_task = Task("Today", scheduled_for_today=True)
        completed_task = Task("Done")
        completed_task.complete()
        game = GameLogic(Player(), Campus(), Collection(), [today_task, completed_task])
        tab = TasksTab(root, game, lambda: None)

        tab.view_var.set("今日")
        tab.refresh()
        self.assertEqual(tab.task_listbox.size(), 1)

        tab.view_var.set("已完成")
        tab.refresh()
        self.assertEqual(tab.task_listbox.size(), 1)

        tab.destroy()
        root.destroy()
```

- [ ] **Step 2: Run the tasks tab test to verify it fails**

Run: `python -m unittest tests.test_ui_smoke.TasksTabTests.test_tasks_tab_switches_between_today_planned_and_completed -v`

Expected: `AttributeError` for `view_var`

- [ ] **Step 3: Implement the task dialog and filtered tasks tab**

```python
# ui/dialogs/task_dialog.py
import tkinter as tk
from tkinter import ttk


class TaskDialog(tk.Toplevel):
    def __init__(self, parent, title="任务", initial=None):
        super().__init__(parent)
        self.result = None
        self.title(title)
        self.resizable(False, False)
        initial = initial or {}

        self.title_var = tk.StringVar(value=initial.get("title", ""))
        self.priority_var = tk.StringVar(value=initial.get("priority", "normal"))
        self.deadline_var = tk.StringVar(value=initial.get("deadline") or "")
        self.minutes_var = tk.StringVar(value=str(initial.get("estimated_minutes", 25)))
        self.repeat_var = tk.StringVar(value=initial.get("repeat_rule", "none"))
        self.today_var = tk.BooleanVar(value=initial.get("scheduled_for_today", False))

        form = tk.Frame(self, padx=12, pady=12)
        form.pack(fill="both", expand=True)
        tk.Label(form, text="标题").grid(row=0, column=0, sticky="w")
        tk.Entry(form, textvariable=self.title_var, width=28).grid(row=0, column=1, sticky="ew")
        tk.Label(form, text="优先级").grid(row=1, column=0, sticky="w")
        ttk.Combobox(form, textvariable=self.priority_var, values=["normal", "important", "urgent"], state="readonly").grid(row=1, column=1, sticky="ew")
        tk.Label(form, text="截止日期").grid(row=2, column=0, sticky="w")
        tk.Entry(form, textvariable=self.deadline_var, width=28).grid(row=2, column=1, sticky="ew")
        tk.Label(form, text="预计分钟").grid(row=3, column=0, sticky="w")
        tk.Entry(form, textvariable=self.minutes_var, width=28).grid(row=3, column=1, sticky="ew")
        tk.Label(form, text="重复").grid(row=4, column=0, sticky="w")
        ttk.Combobox(form, textvariable=self.repeat_var, values=["none", "daily", "weekly"], state="readonly").grid(row=4, column=1, sticky="ew")
        tk.Checkbutton(form, text="加入今日", variable=self.today_var).grid(row=5, column=1, sticky="w")
        ttk.Button(form, text="保存", command=self._save).grid(row=6, column=0, columnspan=2, pady=(12, 0))

        self.grab_set()

    def _save(self):
        self.result = {
            "title": self.title_var.get().strip(),
            "priority": self.priority_var.get(),
            "deadline": self.deadline_var.get().strip() or None,
            "estimated_minutes": int(self.minutes_var.get()),
            "repeat_rule": self.repeat_var.get(),
            "scheduled_for_today": self.today_var.get(),
        }
        self.destroy()
```

```python
# ui/tabs/tasks_tab.py
import tkinter as tk
from tkinter import messagebox, ttk

from ui.dialogs.reward_dialog import RewardDialog
from ui.dialogs.task_dialog import TaskDialog


class TasksTab(tk.Frame):
    VIEW_MAP = {"今日": "today", "计划中": "planned", "已完成": "completed"}

    def __init__(self, parent, game, on_change):
        super().__init__(parent, bg="#F6FBF0")
        self.game = game
        self.on_change = on_change
        self.view_var = tk.StringVar(value="计划中")
        self.visible_tasks = []

        top = tk.Frame(self, bg="#F6FBF0")
        top.pack(fill="x", padx=16, pady=16)
        ttk.Button(top, text="新增任务", command=self._add_task).pack(side="left")
        ttk.Button(top, text="编辑任务", command=self._edit_task).pack(side="left", padx=8)
        ttk.Button(top, text="完成任务", command=self._complete_task).pack(side="left")
        ttk.Button(top, text="删除任务", command=self._delete_task).pack(side="left", padx=8)
        ttk.Combobox(top, textvariable=self.view_var, values=list(self.VIEW_MAP.keys()), state="readonly").pack(side="right")
        self.view_var.trace_add("write", lambda *_: self.refresh())

        self.task_listbox = tk.Listbox(self, font=("Arial", 11), height=18)
        self.task_listbox.pack(fill="both", expand=True, padx=16, pady=(0, 16))

    def _selected_task(self):
        selection = self.task_listbox.curselection()
        if not selection:
            return None
        return self.visible_tasks[selection[0]]

    def _add_task(self):
        dialog = TaskDialog(self, title="新增任务")
        self.wait_window(dialog)
        if dialog.result and dialog.result["title"]:
            self.game.add_task(**dialog.result)
            self.on_change()

    def _edit_task(self):
        task = self._selected_task()
        if not task:
            messagebox.showwarning("提示", "请先选择任务")
            return
        dialog = TaskDialog(self, title="编辑任务", initial=task.to_dict())
        self.wait_window(dialog)
        if dialog.result and dialog.result["title"]:
            self.game.update_task(task.id, **dialog.result)
            self.on_change()

    def _complete_task(self):
        task = self._selected_task()
        if not task:
            messagebox.showwarning("提示", "请先选择任务")
            return
        result = self.game.complete_task(task.id)
        if result:
            RewardDialog(self, result)
            self.on_change()

    def _delete_task(self):
        task = self._selected_task()
        if not task:
            messagebox.showwarning("提示", "请先选择任务")
            return
        self.game.delete_task(task.id)
        self.on_change()

    def refresh(self):
        self.task_listbox.delete(0, tk.END)
        self.visible_tasks = self.game.get_tasks(self.VIEW_MAP[self.view_var.get()])
        for task in self.visible_tasks:
            status = "已完成" if task.completed else task.priority
            today_flag = " [今日]" if task.scheduled_for_today else ""
            repeat_flag = "" if task.repeat_rule == "none" else f" [{task.repeat_rule}]"
            self.task_listbox.insert(
                tk.END,
                f"{status}{today_flag}{repeat_flag} {task.title} ({task.estimated_minutes}m)",
            )
```

- [ ] **Step 4: Run the tasks tab smoke test to verify it passes**

Run: `python -m unittest tests.test_ui_smoke.TasksTabTests.test_tasks_tab_switches_between_today_planned_and_completed -v`

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add ui/dialogs/task_dialog.py ui/tabs/tasks_tab.py tests/test_ui_smoke.py
git commit -m "feat: add v2 tasks tab and task dialog"
```

## Task 8: Implement the Campus Tab and Completion Reward Dialog

**Files:**
- Create: `ui/dialogs/reward_dialog.py`
- Modify: `ui/tabs/campus_tab.py`
- Modify: `game_logic.py`
- Modify: `tests/test_ui_smoke.py`

- [ ] **Step 1: Add the failing campus smoke test**

```python
from ui.tabs.campus_tab import CampusTab


class CampusTabTests(unittest.TestCase):
    def test_campus_tab_applies_new_campus_name(self):
        root = tk.Tk()
        root.withdraw()
        game = GameLogic(Player(), Campus(name="旧山名"), Collection(), [])
        tab = CampusTab(root, game, lambda: None)

        tab.apply_campus_name("新山名")

        self.assertEqual(game.campus.name, "新山名")
        tab.destroy()
        root.destroy()
```

- [ ] **Step 2: Run the campus test to verify it fails**

Run: `python -m unittest tests.test_ui_smoke.CampusTabTests.test_campus_tab_applies_new_campus_name -v`

Expected: `AttributeError` for `apply_campus_name`

- [ ] **Step 3: Implement the campus view plus reward dialog**

```python
# game_logic.py
class GameLogic:
    def get_campus_summary(self):
        return {
            "name": self.campus.name,
            "prosperity": self.campus.prosperity,
            "grid_size": self.campus.grid_size,
            "unlocked_cells": len(self.campus.available_cells),
            "total_cells": self.campus.grid_size * self.campus.grid_size,
            "regions": self.campus.unlocked_regions,
            "inventory": list(self.collection.inventory),
            "grid": dict(self.campus.grid),
        }

    def rename_campus(self, name):
        self.campus.rename(name)

    def place_building(self, building_id, x, y):
        if building_id not in self.collection.inventory:
            return False
        if self.campus.place_building(x, y, building_id):
            self.collection.inventory.remove(building_id)
            return True
        return False
```

```python
# ui/dialogs/reward_dialog.py
import tkinter as tk


class RewardDialog(tk.Toplevel):
    def __init__(self, parent, result):
        super().__init__(parent)
        self.title("任务完成")
        self.resizable(False, False)
        lines = [
            f"XP +{result.xp}",
            f"金币 +{result.coins}",
            f"建设度 +{result.campus_points}",
            f"连击 {result.streak_days} 天",
        ]
        if result.dropped_building:
            lines.append(
                f"获得建筑 {result.dropped_building['emoji']} {result.dropped_building['name']}"
            )
        if result.repeated_task:
            lines.append(f"已生成重复任务 {result.repeated_task.title}")

        tk.Label(self, text="任务完成", font=("Arial", 13, "bold")).pack(padx=16, pady=(16, 8))
        for line in lines:
            tk.Label(self, text=line, font=("Arial", 11)).pack(anchor="w", padx=16)
        tk.Button(self, text="关闭", command=self.destroy).pack(pady=16)
        self.grab_set()
```

```python
# ui/tabs/campus_tab.py
import tkinter as tk
from tkinter import simpledialog

from buildings_data import get_building_by_id


class CampusTab(tk.Frame):
    def __init__(self, parent, game, on_change):
        super().__init__(parent, bg="#EFF8E8")
        self.game = game
        self.on_change = on_change
        self.name_var = tk.StringVar()
        self.stats_var = tk.StringVar()
        self.inventory_var = tk.StringVar()
        tk.Label(self, textvariable=self.name_var, font=("Arial", 15, "bold"), bg="#EFF8E8").pack(anchor="w", padx=16, pady=(16, 8))
        tk.Label(self, textvariable=self.stats_var, font=("Arial", 11), bg="#EFF8E8").pack(anchor="w", padx=16)
        tk.Label(self, textvariable=self.inventory_var, font=("Arial", 11), bg="#EFF8E8").pack(anchor="w", padx=16, pady=(4, 12))
        tk.Button(self, text="修改山体名称", command=self._rename_campus).pack(anchor="w", padx=16)

    def _rename_campus(self):
        new_name = simpledialog.askstring("山体名称", "输入新的山体名称", parent=self)
        if new_name:
            self.apply_campus_name(new_name)

    def apply_campus_name(self, new_name):
        self.game.rename_campus(new_name)
        self.on_change()

    def refresh(self):
        summary = self.game.get_campus_summary()
        self.name_var.set(summary["name"])
        self.stats_var.set(
            f"建设度 {summary['prosperity']} | 地块 {summary['unlocked_cells']}/{summary['total_cells']} | 区域 {'/'.join(summary['regions'])}"
        )
        inventory_labels = []
        for building_id in summary["inventory"]:
            building = get_building_by_id(building_id)
            if building:
                inventory_labels.append(f"{building['emoji']} {building['name']}")
        self.inventory_var.set("背包: " + ("、".join(inventory_labels) if inventory_labels else "空"))
```

- [ ] **Step 4: Run the campus smoke test to verify it passes**

Run: `python -m unittest tests.test_ui_smoke.CampusTabTests.test_campus_tab_applies_new_campus_name -v`

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add game_logic.py ui/dialogs/reward_dialog.py ui/tabs/campus_tab.py tests/test_ui_smoke.py
git commit -m "feat: add campus tab and reward dialog"
```

## Task 9: Finish Settings, Add the End-to-End Regression Test, and Run the Full Suite

**Files:**
- Modify: `ui/tabs/settings_tab.py`
- Create: `tests/test_integration.py`
- Modify: `tests/test_storage.py`
- Modify: `tests/test_ui_smoke.py`

- [ ] **Step 1: Write the failing integration test**

```python
from ui.tabs.settings_tab import SettingsTab


class SettingsTabTests(unittest.TestCase):
    def test_settings_tab_refresh_shows_campus_and_inventory_summary(self):
        root = tk.Tk()
        root.withdraw()
        player = Player(level=3, xp=320, coins=18)
        campus = Campus(name="珞珈新峰")
        collection = Collection(inventory=["school_gate"], catalog=["school_gate"])
        tab = SettingsTab(root, GameLogic(player, campus, collection, []), DummyStorage())

        tab.refresh()

        self.assertIn("山体: 珞珈新峰", tab.summary_var.get())
        self.assertIn("背包: 1", tab.summary_var.get())
        tab.destroy()
        root.destroy()
```

```python
import tempfile
import unittest

from game_logic import GameLogic
from models import Campus, Collection, Player, Task
from storage import Storage


class IntegrationTests(unittest.TestCase):
    def test_complete_flow_saves_and_reloads_v2_state(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            data_path = f"{tmpdir}/data.json"
            storage = Storage(data_path)

            player = Player()
            campus = Campus()
            collection = Collection()
            task = Task("Ship V2", scheduled_for_today=True, repeat_rule="daily")
            logic = GameLogic(player, campus, collection, [task])

            logic.rename_campus("珞珈新峰")
            result = logic.complete_task(task.id)
            storage.save_state(logic.to_state())
            reloaded = storage.load_state()

        self.assertEqual(reloaded["campus"]["name"], "珞珈新峰")
        self.assertEqual(reloaded["player"]["streak_days"], 1)
        self.assertEqual(len(reloaded["tasks"]), 2)
        self.assertEqual(reloaded["tasks"][1]["repeat_rule"], "daily")
        self.assertEqual(result.weekly_completed, 1)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the new settings smoke test to verify it fails**

Run: `python -m unittest tests.test_ui_smoke.SettingsTabTests.test_settings_tab_refresh_shows_campus_and_inventory_summary -v`

Expected: `AttributeError` for `summary_var`

- [ ] **Step 3: Implement the final settings panel and make the end-to-end state durable**

```python
# ui/tabs/settings_tab.py
import tkinter as tk
from tkinter import messagebox


class SettingsTab(tk.Frame):
    def __init__(self, parent, game, storage):
        super().__init__(parent, bg="#FFFFFF")
        self.game = game
        self.storage = storage
        self.summary_var = tk.StringVar()
        tk.Label(self, text="设置", font=("Arial", 14, "bold"), bg="#FFFFFF").pack(anchor="w", padx=16, pady=(16, 8))
        tk.Label(self, textvariable=self.summary_var, font=("Arial", 11), bg="#FFFFFF", justify="left").pack(anchor="w", padx=16)
        tk.Button(self, text="重置本地数据", fg="red", command=self._reset_data).pack(anchor="w", padx=16, pady=12)

    def refresh(self):
        self.summary_var.set(
            f"山体: {self.game.campus.name}\n"
            f"等级: Lv.{self.game.player.level}\n"
            f"金币: {self.game.player.coins}\n"
            f"背包: {len(self.game.collection.inventory)}\n"
            f"图鉴: {len(self.game.collection.catalog)}"
        )

    def _reset_data(self):
        confirmed = messagebox.askyesno("确认", "确定要重置所有本地数据吗？")
        if not confirmed:
            return
        self.storage.reset()
        messagebox.showinfo("完成", "数据已清空，重新启动应用后会生成新存档。")
```

```python
# tests/test_storage.py
class StorageRoundTripTests(unittest.TestCase):
    def test_save_state_persists_versioned_payload(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            data_path = f"{tmpdir}/data.json"
            storage = Storage(data_path)
            payload = {
                "player": {"level": 3, "xp": 320, "coins": 15, "streak_days": 4, "last_completed_on": "2026-04-24", "weekly_progress": {"completed": 5, "target": 15, "week_key": "2026-W17"}},
                "campus": {"name": "珞珈新峰", "grid_size": 2, "available_cells": ["0,0", "1,0", "0,1", "1,1"], "grid": {}, "prosperity": 20, "unlocked_regions": ["core"]},
                "collection": {"inventory": ["school_gate"], "catalog": ["school_gate"], "fragments": {}, "pity_counter": 0},
                "tasks": [],
                "settings": {"theme_name": "campus"},
            }

            storage.save_state(payload)
            restored = storage.load_state()

        self.assertEqual(restored["version"], CURRENT_DATA_VERSION)
        self.assertEqual(restored["campus"]["name"], "珞珈新峰")
        self.assertEqual(restored["player"]["coins"], 15)
```

- [ ] **Step 4: Run the full regression suite**

Run: `python -m unittest discover -s tests -v`

Expected: all tests `OK`

- [ ] **Step 5: Commit**

```bash
git add ui/tabs/settings_tab.py tests/test_storage.py tests/test_integration.py tests/test_ui_smoke.py
git commit -m "test: add v2 integration coverage"
```

## Manual Verification Checklist

- [ ] Launch the app with `python main.py`
- [ ] Add one task from `今日` and confirm it appears in `任务`
- [ ] Edit the task and set `repeat_rule` to `daily`
- [ ] Complete the task and confirm the reward dialog shows XP, coins, and campus points
- [ ] Confirm the repeated copy appears in `计划中`
- [ ] Rename the mountain in `校园` and restart the app
- [ ] Confirm the new mountain name still appears after restart
- [ ] Open `成长` and confirm streak/weekly/catalog values match the completed task

## Self-Review

### Spec coverage

- Versioned storage and migration: Task 1 and Task 9
- New task/player/campus/collection model shape: Task 2
- Fixed rewards + random drops + anti-farming baseline: Task 3
- Today/planned/completed views, edit flow, repeat tasks: Task 4 and Task 7
- `今日` page: Task 6
- `成长` page: Task 6
- `校园` page plus rename: Task 8
- Split UI shell and shared persistence refresh: Task 5
- Settings/reset and end-to-end persistence check: Task 9

### Placeholder scan

- No unfinished placeholder markers remain in this plan
- Every task includes an exact test command, expected result, code step, and commit step

### Type consistency

The plan uses these names consistently across tasks:

- `Storage.load_state()` / `Storage.save_state()`
- `GameLogic(player, campus, collection, tasks)`
- `Task.copy_for_repeat()`
- `GameLogic.get_today_summary()` / `get_growth_summary()` / `get_campus_summary()`
- `MainWindow.handle_state_change()`
