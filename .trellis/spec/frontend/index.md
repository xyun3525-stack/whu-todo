# Frontend Development Guidelines

> Best practices for frontend development in this project.

---

## Overview

This is a vanilla JS single-file frontend (~1200 lines in `app.js`) with no build step, no framework, and no package manager. It communicates with a Python stdlib HTTP API server (`app.py`) over JSON.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | File layout, single-file app structure | ✅ Filled |
| [State Management](./state-management.md) | uiState pattern, no reactivity | ✅ Filled |
| [Hook Guidelines](./hook-guidelines.md) | Data fetching, init, event delegation | ✅ Filled |
| [Component Guidelines](./component-guidelines.md) | SVG rendering, view functions | To fill |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | To fill |
| [Type Safety](./type-safety.md) | JS type patterns | To fill |

---

## Key Conventions

- **Single-file frontend**: all JS in `webui/static/app.js`
- **No build step**: changes are live on page reload
- **Event delegation**: single listener on `#app` container
- **View-scoped rendering**: only active tab panel is re-rendered
- **Icon caching**: `window._iconCache` + `_ensureIcon()` helper
- **SVG art**: `campus-art.js` pure functions return SVG strings
- **State**: single `uiState` object, replaced entirely on each API call
- **Async renders**: `renderCampus()` and `renderBuildingIconsManager()` pre-fetch icons before rendering

---

## How to Update These Guidelines

After fixing a bug or discovering a pattern worth preserving:
1. Update the relevant file above
2. Note the change in the guidelines index table
3. Commit with `docs: update frontend spec` message
