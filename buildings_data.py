"""Static building definitions used by reward and campus systems."""

BUILDINGS = {
    "teaching_building": {
        "id": "teaching_building",
        "name": "教学楼",
        "emoji": "🏫",
        "rarity": "common",
        "category": "functional",
        "effects": {"xp_bonus": 0.05},
        "description": "日常学习与课堂推进的核心区域。",
    },
    "college_building": {
        "id": "college_building",
        "name": "学院楼",
        "emoji": "🏢",
        "rarity": "common",
        "category": "functional",
        "effects": {"weekly_bonus": 0.05},
        "description": "学院与教师办公所在的功能楼群。",
    },
    "office_building": {
        "id": "office_building",
        "name": "行政楼",
        "emoji": "🏬",
        "rarity": "common",
        "category": "functional",
        "effects": {"coin_bonus": 0.05},
        "description": "带来更稳定金币收益的行政中心。",
    },
    "school_gate": {
        "id": "school_gate",
        "name": "校门",
        "emoji": "🏛",
        "rarity": "rare",
        "category": "landmark",
        "effects": {"rare_drop_bonus": 0.08},
        "description": "极具辨识度的校园地标入口。",
    },
    "leijun_building": {
        "id": "leijun_building",
        "name": "雷军楼",
        "emoji": "🌟",
        "rarity": "epic",
        "category": "landmark",
        "effects": {"streak_bonus": 0.1, "rare_drop_bonus": 0.12},
        "description": "高稀有度地标建筑，拥有更强成长加成。",
    },
}

RARITY_COLORS = {
    "common": "#888888",
    "rare": "#4169E1",
    "epic": "#FFD700",
}

RARITY_NAMES = {
    "common": "普通",
    "rare": "稀有",
    "epic": "史诗",
}


def get_all_buildings():
    return list(BUILDINGS.values())


def get_building_by_id(building_id):
    return BUILDINGS.get(building_id)


def get_random_building_by_rarity(rarity):
    candidates = [item for item in BUILDINGS.values() if item["rarity"] == rarity]
    if not candidates:
        return None
    import random

    return random.choice(candidates)
