"""
JSON 文件存储
负责数据的持久化
"""

import json
import os

DATA_FILE = "data.json"


class Storage:
    """数据存储类"""

    def load_player(self):
        """加载玩家数据"""
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("player", {})
            except (json.JSONDecodeError, IOError):
                return {}
        return {}

    def load_tasks(self):
        """加载任务数据"""
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("tasks", [])
            except (json.JSONDecodeError, IOError):
                return []
        return []

    def save_player(self, player):
        """保存玩家数据"""
        data = self._load_all()
        data["player"] = player.to_dict()
        self._save_all(data)

    def save_tasks(self, tasks):
        """保存任务数据"""
        data = self._load_all()
        data["tasks"] = [t.to_dict() for t in tasks]
        self._save_all(data)

    def _load_all(self):
        """加载所有数据"""
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return {}
        return {}

    def _save_all(self, data):
        """保存所有数据"""
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def reset(self):
        """重置所有数据"""
        if os.path.exists(DATA_FILE):
            os.remove(DATA_FILE)
