# Hook Guidelines

> How side-effect and data-fetching logic is organized in this project.

---

## Overview

This project uses vanilla JS — there are no React hooks. Instead, the equivalent pattern is **plain JS functions that perform data fetching or DOM side effects**. These are organized by responsibility and called explicitly at init time or interaction time.

---

## Data Fetching Pattern: `_ensureIcon()`

The primary stateful side-effect function is `_ensureIcon(buildingId, iconRef)`:

```javascript
const _iconCache = {};

async function _ensureIcon(buildingId, iconRef) {
    if (!iconRef) return null;
    if (iconRef.startsWith("data:")) return iconRef;
    if (_iconCache[buildingId]) return _iconCache[buildingId];
    try {
        const data = await api(`/api/icons/${encodeURIComponent(buildingId)}`, "GET");
        _iconCache[buildingId] = data.__icon__;
        return _iconCache[buildingId];
    } catch { return null; }
}
```

This function:
- Takes an icon reference (file extension or `null`)
- Returns a data:URL or `null`
- Caches results in `window._iconCache` (shared across renders)
- Is idempotent and awaitable

### Usage

```javascript
// In renderCampus (async):
const icons = await Promise.all(cells.map(async cell => {
    const ref = cell.building ? cell.building.id : null;
    return cell.building ? await _ensureIcon(ref, uiState.data.settings?.custom_icons?.[ref]) : null;
}));
```

---

## Init Pattern: `DOMContentLoaded`

Side effects that need to run on page load are inside the `DOMContentLoaded` async handler:

```javascript
document.addEventListener("DOMContentLoaded", async () => {
    await initStaticBuildings();   // fetch BUILDINGS list
    bindEvents();                  // set up event delegation
    await fetchState();            // load initial uiState.data
    switchView("today");           // render initial view
});
```

All init steps are sequential (not parallel) to ensure `BUILDINGS` is populated before any render runs.

---

## Event Binding Pattern

Events use **delegation** — a single listener on `#app` handles all interactions. No per-element listeners.

```javascript
function bindEvents() {
    document.getElementById("app").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-complete-task]");
        if (btn) { completeTask(btn.dataset.completeTask); return; }
        // ... other handlers
    });

    document.getElementById("app").addEventListener("change", (e) => {
        if (e.target.id === "task-search-input") { renderTasks(); }
        // ...
    });
}
```

Each handler reads from `uiState` directly — there are no closure captures of stale state.

---

## Naming Conventions

| Pattern | Name | Example |
|---------|------|---------|
| Init functions | `initX()` | `initStaticBuildings()` |
| Side-effect helpers | `_ensureX()` | `_ensureIcon()` |
| Render functions | `renderX()` | `renderTasks()` |
| API call functions | `verbX()` | `completeTask()`, `updateTask()` |
| Event delegation root | `bindEvents()` | — |

---

## Common Mistakes

### Forgetting to `await` `_ensureIcon()`

`_ensureIcon()` is async. Calling it without `await` in an async render function results in a Promise being stored instead of the data:URL. Always `await` it inside an async context, or use `Promise.all()` for parallel loads.

### Binding events outside `bindEvents()`

All event binding must happen inside `bindEvents()` which is called once at `DOMContentLoaded`. Adding `addEventListener` directly on elements (outside delegation) creates duplicate listeners if the DOM is replaced by a re-render.

### Race conditions in async renders

If an async render starts but the user switches views before it completes, `_iconCache` may be left in an inconsistent intermediate state. This is acceptable for icon caching (subsequent calls will return the cached value). For other async operations that mutate `uiState.data`, prefer awaiting all Promises before rendering.
