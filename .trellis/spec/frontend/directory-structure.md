# Directory Structure

> How frontend code is organized in this project.

---

## Overview

The web frontend is a **single-file vanilla JS application** (`app.js`) with no build step, no framework, and no package manager. It communicates with a Python stdlib HTTP server (`app.py`) over a JSON API.

Static assets are served directly from `webui/static/` without a CDN or bundler.

---

## Directory Layout

```
webui/
├── __init__.py           # Empty package marker
├── app.py                # Python: WebGameApp controller + HTTP server + API routes
│
└── static/
    ├── index.html        # Single HTML entry point
    ├── styles.css        # All styles (flat CSS, no preprocessor)
    ├── app.js            # Single-file vanilla JS frontend (~1200 lines)
    └── campus-art.js     # SVG illustration helpers (rarity palettes + building shapes)
```

---

## File Responsibilities

### `app.js` — Frontend Brain

`app.js` is the entire frontend logic. It is organized into these sections (top-to-bottom):

| Section | What it does |
|---------|-------------|
| `const BUILDINGS = []` | Remote-loaded building list (fetched from `GET /api/static-buildings` on init) |
| `State / UI state` | Single `uiState` object + view management |
| `initStaticBuildings()` | Fetches static buildings and populates `BUILDINGS` |
| `_ensureIcon()` | Loads icon file refs into `window._iconCache`, returns data:URL |
| `bindEvents()` | Event delegation on `#app` container; all interactions handled here |
| `switchView()` | Tabs: today / growth / campus / settings; calls `renderByView()` |
| `renderByView()` | Calls `renderTasks()`, `renderGrowth()`, `renderCampus()`, `renderSettings()` |
| `renderTasks()` | Renders task list with search/priority filter; uses event delegation |
| `renderGrowth()` | Renders XP progress and upgrade panel |
| `renderCampus()` | Renders campus grid; async — fetches all needed icons before rendering |
| `renderBuildingIconsManager()` | Settings sub-view for managing custom building icons |
| `handleIconUpload()` / `handleIconDelete()` | POST/DELETE to `/api/icons/{id}` |
| `api()` | Thin fetch wrapper: `GET/POST/PUT/DELETE` helpers |
| `completeTask()` / `updateTask()` | Task mutation calls |

### `campus-art.js` — SVG Illustrations

Pure functions (no side effects, no DOM access) that return SVG HTML strings:

| Function | What it does |
|---------|-------------|
| `renderBuildingIllustration()` | Renders building SVG or `<img>` if custom icon cached |
| `renderBuildingShape()` | Switch-case on `buildingId` — emits SVG paths |
| `renderCampusTileIllustration()` | Grid cell: locked mountain / open land / building art |
| `renderOpenLandIllustration()` | Empty grid cell art |
| `renderLockedMountainIllustration()` | Locked grid cell art |

Building icons are resolved from `window._iconCache` before falling back to SVG generation.

### `styles.css` — Styling

Flat CSS with CSS variables for theme colors. No preprocessor, no BEM, no utility classes.

Theme variables are defined at `:root` level and referenced throughout.

---

## State Management

**Single source of truth**: Python backend (`WebGameApp`). Frontend holds a snapshot (`uiState.data`) refreshed on each API call.

**No reactive framework** — all rendering is imperative:
1. API call updates `uiState.data`
2. `renderByView()` re-renders the active view by replacing `innerHTML`

**View-scoped rendering**: only the active tab panel is re-rendered on `switchView()`. Hero area (`#hero`) is preserved.

---

## Event Delegation Pattern

All interactive elements inside `#app` are handled by a **single event listener** on the container:

```javascript
document.getElementById("app").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-complete-task]");
    if (btn) { completeTask(btn.dataset.completeTask); return; }
    // ...
});
```

**Why**: avoids O(n) listener attachment; new DOM elements are automatically covered.

---

## Icon Loading

1. On page load, `BUILDINGS` is fetched from `GET /api/static-buildings`
2. When a building icon is needed (campus grid, icon manager), `_ensureIcon(buildingId, iconRef)` is called
3. If `iconRef` is a file extension (e.g., `".png"`) — fetch from `GET /api/icons/{buildingId}`, cache as data:URL in `window._iconCache`
4. If `iconRef` is `null` or missing — skip (no custom icon)
5. `campus-art.js` checks `window._iconCache` before generating SVG

---

## Naming Conventions

- JS functions: camelCase (`renderTasks`, `handleIconUpload`, `_ensureIcon`)
- JS private helpers: prefix `_` (`_ensureIcon`, `_escapeHtml`)
- CSS classes: kebab-case (`.task-search-bar`, `.art-svg-tile`)
- HTML `data-*` attributes: kebab-case (`data-complete-task`, `data-building-id`)

---

## Adding a New View

1. Add a new tab button in `index.html` with `data-view="newview"`
2. Add `case "newview": renderNewView(); break;` inside `switchView()`
3. Add `renderNewView()` function in `app.js`
4. Add event handlers via the existing delegation container

---

## Adding a New API Endpoint

1. Backend: add method to `WebGameApp` in `app.py`, add route in `_dispatch_api()`
2. Frontend: add caller function in `app.js`, add to `api()` wrapper if needed
3. No rebuild step — changes are live on next page refresh

