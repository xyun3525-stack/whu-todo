"""
游戏逻辑
XP计算、升级、掉落、网格操作
"""

import random
from buildings_data import BUILDINGS, get_building_by_id


class GameLogic:
    """游戏逻辑类"""

    RARITY_DROP_RATES = {
        "common": 0.60,
        "rare": 0.30,
        "epic": 0.10
    }

    def __init__(self, player, tasks):
        self.player = player
        self.tasks = tasks
        self.pending_level_up = False

    def add_task(self, title, priority="normal", deadline=None):
        """添加任务"""
        from models import Task
        task = Task(title, priority, deadline)
        self.tasks.append(task)
        return task

    def complete_task(self, task_id):
        """完成任务，返回 (XP奖励, 掉落建筑, 是否升级)"""
        task = self._find_task(task_id)
        if not task or task.completed:
            return None, None, False

        task.complete()

        base_xp = task.get_xp_reward()
        xp_bonus = self.player.get_total_xp_bonus()
        final_xp = int(base_xp * (1 + xp_bonus))

        leveled_up = self.player.add_xp(final_xp)

        dropped_building = self._roll_building_drop()

        return final_xp, dropped_building, leveled_up

    def _find_task(self, task_id):
        """根据ID查找任务"""
        for task in self.tasks:
            if task.id == task_id:
                return task
        return None

    def delete_task(self, task_id):
        """删除任务"""
        task = self._find_task(task_id)
        if task:
            self.tasks.remove(task)
            return True
        return False

    def get_incomplete_tasks(self):
        """获取未完成的任务"""
        return [t for t in self.tasks if not t.completed]

    def get_completed_tasks(self):
        """获取已完成的任务"""
        return [t for t in self.tasks if t.completed]

    def _roll_building_drop(self):
        """随机掉落建筑"""
        roll = random.random()
        cumulative = 0.0
        for rarity, rate in self.RARITY_DROP_RATES.items():
            cumulative += rate
            if roll < cumulative:
                building = self._get_random_building_by_rarity(rarity)
                if building:
                    self.player.add_to_inventory(building["id"])
                return building
        return None

    def _get_random_building_by_rarity(self, rarity):
        """根据稀有度获取随机建筑"""
        candidates = [b for b in BUILDINGS.values() if b["rarity"] == rarity]
        if candidates:
            return random.choice(candidates)
        return None

    def handle_level_up_choice(self, choice):
        """
        处理升级选择
        choice: "expand" (扩大山体) 或 "clearing" (开垦荒地)
        """
        if choice == "expand":
            self.player.expand_grid()
        elif choice == "clearing":
            self.player.add_empty_slots(4)

    def place_building(self, building_id, x, y):
        """放置建筑到网格"""
        if building_id not in self.player.inventory:
            return False
        return self.player.place_building(x, y, building_id)

    def get_building_info(self, building_id):
        """获取建筑信息"""
        return get_building_by_id(building_id)

    def get_grid_display(self):
        """获取网格显示信息"""
        grid = []
        for y in range(self.player.grid_size):
            row = []
            for x in range(self.player.grid_size):
                key = f"{x},{y}"
                building_id = self.player.grid.get(key)
                if building_id:
                    building = get_building_by_id(building_id)
                    row.append(building["emoji"] if building else "❓")
                else:
                    row.append("⬜")
            grid.append(row)
        return grid
