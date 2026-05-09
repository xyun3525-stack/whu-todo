# Directory Structure

> How backend code is organized in this project.

---

## Overview

The project is a hybrid Python application with two UI frontends (tkinter GUI + vanilla JS web UI) sharing a common Python backend layer.

**Python core layer** (root level):
- `models.py` — data classes: `Player`, `Campus`, `Collection`, `Task`
- `game_logic.py` — `GameLogic` class: game rules, XP, upgrades, building placement
- `buildings_data.py` — static building definitions (`BUILDINGS` dict + helpers)
- `storage.py` — JSON file persistence with versioned migrations

**Web UI layer** (`webui/`):
- `webui/app.py` — `WebGameApp` controller + `make_handler()` factory + `create_server()` + `run()`
- `webui/static/` — vanilla JS/CSS frontend: `app.js`, `styles.css`, `campus-art.js`, `index.html`
- `webui/__init__.py` — empty (package marker)

**tkinter GUI layer** (`ui/`):
- `ui/main_window.py` — main application window
- `ui/dialogs/` — dialog windows
- `ui/tabs/` — tab panels

**Shared tests** (`tests/`):
- Unit and integration tests for each module

**Ephemeral uploads** (`icons/`):
- Uploaded icon files. Gitignored. Created at runtime when icons are uploaded.

---

## Directory Layout

```
whu-todo/
├── buildings_data.py    # Static building definitions (source of truth)
├── game_logic.py       # GameLogic: core rules, XP, upgrades, campus grid
├── models.py           # Data classes: Player, Campus, Collection, Task
├── storage.py          # JSON persistence with versioned migrations
├── gui.py             # tkinter GUI entry point
├── main.py            # CLI entry point
│
├── webui/
│   ├── __init__.py
│   ├── app.py         # WebGameApp (controller) + HTTP server + API routes
│   └── static/
│       ├── index.html
│       ├── styles.css
│       ├── app.js      # Single-file vanilla JS frontend (~1200 lines)
│       └── campus-art.js  # SVG illustration helpers (rarity palettes + shapes)
│
├── ui/
│   ├── __init__.py
│   ├── main_window.py
│   ├── dialogs/
│   └── tabs/
│
├── tests/
│   ├── test_game_logic.py
│   ├── test_models.py
│   ├── test_storage.py
│   ├── test_web_ui.py   # HTTP server integration tests
│   └── ...
│
└── icons/              # Uploaded icon files (gitignored, not committed)
```

---

## Module Organization

### Core Layer (root)

| File | Responsibility |
|------|----------------|
| `models.py` | Immutable data classes with `from_dict()` / `to_dict()` |
| `game_logic.py` | `GameLogic` — all game rules, building placement, task completion |
| `buildings_data.py` | Static `BUILDINGS` dict + `_get_building_by_id()` helpers |
| `storage.py` | `Storage` — JSON read/write, versioned migration, quarantine |

### Web Layer (`webui/`)

| File | Responsibility |
|------|----------------|
| `app.py` | `WebGameApp` (thin controller over GameLogic) + `make_handler()` (RequestHandler factory) + `create_server()` |
| `static/*.js` | Vanilla JS frontend — state management, DOM rendering, event delegation |

### API Route Organization (in `app.py`)

Routes are defined as `if` chains inside `_dispatch_api()`. New routes are added there.

Pattern for a new route:
```python
if len(segments) == 3 and segments[:2] == ["api", "<resource>"]:
    resource_id = segments[2]
    if method == "GET":
        return app.get_<resource>(resource_id)
    if method == "POST":
        return app.create_<resource>(self._read_json())
    if method == "DELETE":
        return app.delete_<resource>(resource_id)
```

---

## Naming Conventions

- **Python modules**: lowercase, underscore-separated (`game_logic.py`)
- **Python classes**: CamelCase (`WebGameApp`, `GameLogic`, `ApiError`)
- **Python methods**: snake_case (`get_icon`, `upload_icon`, `_parse_data_url`)
- **HTTP endpoints**: `/api/<resource>` plural nouns, `/api/<resource>/<id>` for specifics
- **Icon files on disk**: `{building_id}.{ext}` (e.g., `teaching_building.png`)

---

## Examples

### Adding a new API endpoint

1. Add method to `WebGameApp` class in `app.py`
2. Add route case to `_dispatch_api()` chain
3. Add test in `tests/test_web_ui.py`

### Adding a new static building

1. Add entry to `BUILDINGS` dict in `buildings_data.py`
2. Add SVG case in `campus-art.js` `renderBuildingShape()`
3. Frontend auto-fetches via `GET /api/static-buildings`

