"""
数据模型
Task 和 Player 类
"""

import uuid
from datetime import datetime


class Task:
    """待办任务"""

    PRIORITY_XP = {
        "normal": 10,
        "important": 20,
        "urgent": 30
    }

    def __init__(self, title, priority="normal", deadline=None):
        self.id = str(uuid.uuid4())[:8]
        self.title = title
        self.priority = priority
        self.deadline = deadline  # 格式: "YYYY-MM-DD" 或 None
        self.completed = False
        self.created_at = datetime.now().isoformat()

    def complete(self):
        """标记任务完成"""
        self.completed = True

    def get_xp_reward(self):
        """获取完成此任务获得的XP"""
        return self.PRIORITY_XP.get(self.priority, 10)

    def is_overdue(self):
        """检查是否逾期"""
        if not self.deadline or self.completed:
            return False
        try:
            deadline_date = datetime.strptime(self.deadline, "%Y-%m-%d")
            return datetime.now() > deadline_date
        except:
            return False

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "priority": self.priority,
            "deadline": self.deadline,
            "completed": self.completed,
            "created_at": self.created_at
        }

    @classmethod
    def from_dict(cls, data):
        task = cls(data["title"], data["priority"], data.get("deadline"))
        task.id = data["id"]
        task.completed = data["completed"]
        task.created_at = data["created_at"]
        return task


class Player:
    """玩家/珞珈山"""

    LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500]

    def __init__(self):
        self.level = 1
        self.xp = 0
        self.grid_size = 2
        self.available_cells = set()  # 已解锁的格子集合
        self.inventory = []
        self.grid = {}
        self._init_grid()

    def _init_grid(self):
        """初始化网格"""
        for y in range(self.grid_size):
            for x in range(self.grid_size):
                key = f"{x},{y}"
                self.grid[key] = None
                self.available_cells.add(key)  # 初始 2x2 都可用

    def add_xp(self, amount):
        """添加XP，返回是否升级"""
        self.xp += amount
        leveled_up = False
        while self._can_level_up():
            self._level_up()
            leveled_up = True
        return leveled_up

    def _can_level_up(self):
        """检查是否可以升级"""
        if self.level >= len(self.LEVEL_THRESHOLDS):
            return False
        return self.xp >= self.LEVEL_THRESHOLDS[self.level]

    def _level_up(self):
        """升级"""
        self.level += 1

    def get_xp_for_next_level(self):
        """获取下一级需要的XP"""
        if self.level >= len(self.LEVEL_THRESHOLDS):
            return float('inf')
        return self.LEVEL_THRESHOLDS[self.level]

    def get_xp_progress(self):
        """获取当前等级XP进度 (0-1)"""
        if self.level >= len(self.LEVEL_THRESHOLDS):
            return 1.0
        current_threshold = self.LEVEL_THRESHOLDS[self.level - 1]
        next_threshold = self.LEVEL_THRESHOLDS[self.level]
        progress = (self.xp - current_threshold) / (next_threshold - current_threshold)
        return max(0.0, min(1.0, progress))

    def expand_grid(self):
        """扩大网格 (grid_size + 1)，新增格子为森林（锁定状态）"""
        old_size = self.grid_size
        self.grid_size += 1
        for y in range(self.grid_size):
            for x in range(self.grid_size):
                key = f"{x},{y}"
                if key not in self.grid:
                    self.grid[key] = None
                    # 新增格子默认是森林，不加入 available_cells

    def add_empty_slots(self, count):
        """开垦荒地：从森林格子中解锁指定数量的格子"""
        forest_cells = []
        for y in range(self.grid_size):
            for x in range(self.grid_size):
                key = f"{x},{y}"
                if key not in self.available_cells:
                    forest_cells.append(key)

        import random
        random.shuffle(forest_cells)
        for i in range(min(count, len(forest_cells))):
            self.available_cells.add(forest_cells[i])

    def add_to_inventory(self, building_id):
        """添加建筑到背包"""
        self.inventory.append(building_id)

    def place_building(self, x, y, building_id):
        """放置建筑"""
        key = f"{x},{y}"
        if key in self.available_cells and self.grid.get(key) is None:
            self.grid[key] = building_id
            if building_id in self.inventory:
                self.inventory.remove(building_id)
            return True
        return False

    def get_unlocked_count(self):
        """获取已解锁格子数"""
        return len(self.available_cells)

    def get_empty_unlocked_count(self):
        """获取已解锁的空格子数"""
        count = 0
        for key in self.available_cells:
            if self.grid.get(key) is None:
                count += 1
        return count

    def remove_building(self, x, y):
        """移除建筑"""
        key = f"{x},{y}"
        building_id = self.grid.get(key)
        if building_id:
            self.grid[key] = None
            self.inventory.append(building_id)
            return True
        return False

    def get_total_xp_bonus(self):
        """计算总XP加成"""
        total = 0.0
        for building_id in self.inventory:
            from buildings_data import get_building_by_id
            building = get_building_by_id(building_id)
            if building:
                total += building["xp_bonus"]
        for building_id in self.grid.values():
            if building_id:
                from buildings_data import get_building_by_id
                building = get_building_by_id(building_id)
                if building:
                    total += building["xp_bonus"]
        return total

    def to_dict(self):
        return {
            "level": self.level,
            "xp": self.xp,
            "grid_size": self.grid_size,
            "available_cells": list(self.available_cells),
            "inventory": self.inventory,
            "grid": self.grid
        }

    @classmethod
    def from_dict(cls, data):
        player = cls()
        if data:
            player.level = data.get("level", 1)
            player.xp = data.get("xp", 0)
            player.grid_size = data.get("grid_size", 2)
            player.available_cells = set(data.get("available_cells", []))
            player.inventory = data.get("inventory", [])
            player.grid = data.get("grid", {})
            if not player.grid:
                player._init_grid()
        return player
