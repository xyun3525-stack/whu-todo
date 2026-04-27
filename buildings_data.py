"""Static building definitions used by reward and campus systems."""

BUILDINGS = {
    "teaching_building": {
        "id": "teaching_building",
        "name": "Teaching Hall",
        "emoji": "🏫",
        "rarity": "common",
        "category": "functional",
        "effects": {"xp_bonus": 0.05},
        "description": "Core teaching area.",
    },
    "college_building": {
        "id": "college_building",
        "name": "College Block",
        "emoji": "🏢",
        "rarity": "common",
        "category": "functional",
        "effects": {"weekly_bonus": 0.05},
        "description": "College and faculty offices.",
    },
    "office_building": {
        "id": "office_building",
        "name": "Office Center",
        "emoji": "🏬",
        "rarity": "common",
        "category": "functional",
        "effects": {"coin_bonus": 0.05},
        "description": "Administrative center.",
    },
    "school_gate": {
        "id": "school_gate",
        "name": "Main Gate",
        "emoji": "🏛",
        "rarity": "rare",
        "category": "landmark",
        "effects": {"rare_drop_bonus": 0.08},
        "description": "Campus landmark gate.",
    },
    "leijun_building": {
        "id": "leijun_building",
        "name": "Innovation Tower",
        "emoji": "🌟",
        "rarity": "epic",
        "category": "landmark",
        "effects": {"streak_bonus": 0.1, "rare_drop_bonus": 0.12},
        "description": "High-rarity landmark building.",
    },
}

RARITY_COLORS = {
    "common": "#888888",
    "rare": "#4169E1",
    "epic": "#FFD700",
}

RARITY_NAMES = {
    "common": "Common",
    "rare": "Rare",
    "epic": "Epic",
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
