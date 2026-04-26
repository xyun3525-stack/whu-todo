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