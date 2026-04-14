"""
建筑数据定义
珞珈山上的各类建筑
"""

BUILDINGS = {
    "teaching_building": {
        "id": "teaching_building",
        "name": "教学楼",
        "emoji": "🏫",
        "rarity": "common",
        "xp_bonus": 0.05,
        "description": "日常教学场所"
    },
    "college_building": {
        "id": "college_building",
        "name": "学院楼",
        "emoji": "🏢",
        "rarity": "common",
        "xp_bonus": 0.05,
        "description": "院系办公地点"
    },
    "office_building": {
        "id": "office_building",
        "name": "办公楼",
        "emoji": "🏗️",
        "rarity": "common",
        "xp_bonus": 0.05,
        "description": "行政管理办公"
    },
    "school_gate": {
        "id": "school_gate",
        "name": "校门",
        "emoji": "🚪",
        "rarity": "rare",
        "xp_bonus": 0.10,
        "description": "学校门面"
    },
    "leijun_building": {
        "id": "leijun_building",
        "name": "雷军楼",
        "emoji": "🏛️",
        "rarity": "epic",
        "xp_bonus": 0.20,
        "description": "珞珈山最尊贵建筑！"
    }
}

RARITY_COLORS = {
    "common": "#888888",
    "rare": "#4169E1",
    "epic": "#FFD700"
}

RARITY_NAMES = {
    "common": "普通",
    "rare": "稀有",
    "epic": "史诗"
}


def get_all_buildings():
    """返回所有建筑的列表"""
    return list(BUILDINGS.values())


def get_building_by_id(building_id):
    """根据ID获取建筑数据"""
    return BUILDINGS.get(building_id)


def get_random_building_by_rarity(rarity):
    """根据稀有度获取随机建筑"""
    candidates = [b for b in BUILDINGS.values() if b["rarity"] == rarity]
    if candidates:
        import random
        return candidates[random.randint(0, len(candidates) - 1)]
    return None
