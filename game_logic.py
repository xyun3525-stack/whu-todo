import random
from dataclasses import dataclass
from datetime import datetime

from buildings_data import BUILDINGS, get_building_by_id as _static_get_building_by_id
from models import Campus, Collection, Player, Task


def get_building_def(building_id, custom_buildings=None):
    """Merge lookup: custom_buildings takes priority, fallback to static BUILDINGS."""
    if custom_buildings and building_id in custom_buildings:
        return custom_buildings[building_id]
    return _static_get_building_by_id(building_id)


@dataclass
class RewardResult:
    xp: int
    coins: int
    campus_points: int
    leveled_up: bool
    new_level: int
    upgrade_options: list
    dropped_building: dict | None
    streak_days: int
    weekly_completed: int
    repeated_task: object | None


class GameLogic:
    RARITY_DROP_RATES = {"common": 0.68, "rare": 0.24, "epic": 0.08}

    def __init__(self, player, campus, collection, tasks, settings=None):
        self.player = player
        self.campus = campus
        self.collection = collection
        self.tasks = tasks
        self.settings = settings if settings is not None else {}

    def _find_task(self, task_id):
        for task in self.tasks:
            if task.id == task_id:
                return task
        return None

    def _get_building_effect_bonus(self, effect_name):
        custom_buildings = self.settings.get("custom_buildings") if self.settings else None
        total = 0.0
        for building_id in self.collection.inventory:
            building = get_building_def(building_id, custom_buildings)
            if building:
                total += building.get("effects", {}).get(effect_name, 0.0)
        for building_id in self.campus.grid.values():
            if building_id:
                building = get_building_def(building_id, custom_buildings)
                if building:
                    total += building.get("effects", {}).get(effect_name, 0.0)
        return total

    def _calculate_fixed_rewards(self, task):
        base = task.get_xp_reward()
        duration_bonus = min(task.estimated_minutes, 120) // 30 * 3
        today_bonus = 4 if task.scheduled_for_today else 0
        repeat_multiplier = 0.85 if task.repeat_rule != "none" else 1.0
        micro_multiplier = 0.7 if task.estimated_minutes <= 15 else 1.0
        streak_multiplier = 1 + min(self.player.streak_days, 10) * 0.03
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
        custom_buildings = self.settings.get("custom_buildings") if self.settings else None
        all_buildings = list(BUILDINGS.values())
        if custom_buildings:
            all_buildings = all_buildings + list(custom_buildings.values())
        candidates = [building for building in all_buildings if building["rarity"] == rarity]
        if not candidates:
            return None
        return random.choice(candidates)

    def _roll_building_drop(self):
        rare_bonus = self._get_building_effect_bonus("rare_drop_bonus")
        roll = random.random()
        raw_rates = {
            "common": max(self.RARITY_DROP_RATES["common"] - rare_bonus / 2, 0.4),
            "rare": self.RARITY_DROP_RATES["rare"] + rare_bonus / 2,
            "epic": self.RARITY_DROP_RATES["epic"] + rare_bonus / 2,
        }
        total = sum(raw_rates.values())
        if total <= 0:
            return None
        cumulative = 0.0
        for rarity in ("common", "rare", "epic"):
            cumulative += raw_rates[rarity] / total
            if roll < cumulative:
                return self._get_random_building_by_rarity(rarity)
        return self._get_random_building_by_rarity("common")

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
        today = datetime.now().date()
        completed_today = [
            task
            for task in self.get_tasks("completed")
            if task.completed_at and task.completed_at.startswith(today.isoformat())
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

    def reset_state(self):
        self.player = Player()
        self.campus = Campus()
        self.collection = Collection()
        self.tasks = []

    def place_building(self, building_id, x, y):
        if building_id not in self.collection.inventory:
            return False
        custom_buildings = self.settings.get("custom_buildings") if self.settings else None
        if get_building_def(building_id, custom_buildings) is None:
            return False
        if self.campus.place_building(x, y, building_id):
            self.collection.inventory.remove(building_id)
            return True
        return False

    def get_upgrade_options(self):
        return [
            {
                "type": "expand_campus",
                "label": "扩大山体",
                "desc": f"网格扩至 {self.campus.grid_size + 1}x{self.campus.grid_size + 1}，新格子全部可用",
                "new_grid_size": self.campus.grid_size + 1,
            },
            {
                "type": "unlock_cells",
                "label": "开垦荒地",
                "desc": f"额外解锁 2 格（当前 {len(self.campus.available_cells)}/{self.campus.grid_size * self.campus.grid_size} 格）",
                "cells_gained": 2,
            },
        ]

    def apply_upgrade_choice(self, choice_type):
        if choice_type == "expand_campus":
            self.campus.expand_grid()
        elif choice_type == "unlock_cells":
            self.campus.add_empty_slots(2)

    def get_building_info(self, building_id):
        custom_buildings = self.settings.get("custom_buildings") if self.settings else None
        return get_building_def(building_id, custom_buildings)

    def to_state(self):
        return {
            "player": self.player.to_dict(),
            "campus": self.campus.to_dict(),
            "collection": self.collection.to_dict(),
            "tasks": [task.to_dict() for task in self.tasks],
            "settings": {"theme_name": "campus", "custom_icons": {}} | self.settings,
        }

    def complete_task(self, task_id):
        task = self._find_task(task_id)
        if not task or task.completed:
            return None

        rewards = self._calculate_fixed_rewards(task)
        task.complete()
        completed_dt = datetime.fromisoformat(task.completed_at)
        self.player.register_completion(completed_at=completed_dt)
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
            new_level=self.player.level if leveled_up else 0,
            upgrade_options=self.get_upgrade_options() if leveled_up else [],
            dropped_building=dropped_building,
            streak_days=self.player.streak_days,
            weekly_completed=self.player.weekly_progress["completed"],
            repeated_task=repeated_task,
        )