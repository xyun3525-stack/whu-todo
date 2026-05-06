"""Domain models for the app state."""

import uuid
from datetime import date, datetime, timedelta


class Task:
    PRIORITY_XP = {
        "normal": 12,
        "important": 20,
        "urgent": 30,
    }

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
        try:
            deadline_date = datetime.strptime(self.deadline, "%Y-%m-%d").date()
        except ValueError:
            return False
        return date.today() > deadline_date

    def is_due_today(self):
        return bool(self.deadline and self.deadline == date.today().isoformat())

    def copy_for_repeat(self):
        next_deadline = None
        if self.deadline and self.repeat_rule in {"daily", "weekly"}:
            delta = 1 if self.repeat_rule == "daily" else 7
            next_deadline = (
                datetime.strptime(self.deadline, "%Y-%m-%d") + timedelta(days=delta)
            ).strftime("%Y-%m-%d")

        cloned = Task(
            title=self.title,
            priority=self.priority,
            deadline=next_deadline,
            tags=list(self.tags),
            estimated_minutes=self.estimated_minutes,
            subtasks=list(self.subtasks),
            repeat_rule=self.repeat_rule,
            scheduled_for_today=False,
        )
        return cloned

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
            title=data["title"],
            priority=data.get("priority", "normal"),
            deadline=data.get("deadline"),
            tags=data.get("tags", []),
            estimated_minutes=data.get("estimated_minutes", 25),
            subtasks=data.get("subtasks", []),
            repeat_rule=data.get("repeat_rule", "none"),
            completed_at=data.get("completed_at"),
            scheduled_for_today=data.get("scheduled_for_today", False),
        )
        task.id = data.get("id") or str(uuid.uuid4())[:8]
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
            self.weekly_progress = {
                "completed": 0,
                "target": 15,
                "week_key": week_key,
            }

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
        if self.level <= 0:
            return 0.0
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
        valid = {f"{x},{y}" for x in range(self.grid_size) for y in range(self.grid_size)}
        for y in range(self.grid_size):
            for x in range(self.grid_size):
                self.grid.setdefault(f"{x},{y}", None)
        for key in list(self.grid):
            if key not in valid:
                del self.grid[key]
        self.available_cells &= valid

    def rename(self, name):
        self.name = name.strip() or self.name

    def add_prosperity(self, amount):
        self.prosperity += amount
        if self.prosperity >= 50 and "library" not in self.unlocked_regions:
            self.unlocked_regions.append("library")
            self.add_empty_slots(2)
            self.prosperity -= 50

    def expand_grid(self):
        old_size = self.grid_size
        self.grid_size += 1
        self._ensure_grid()
        for y in range(old_size, self.grid_size):
            for x in range(self.grid_size):
                self.available_cells.add(f"{x},{y}")
        for x in range(old_size):
            self.available_cells.add(f"{x},{self.grid_size - 1}")

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
