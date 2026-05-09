# Backend Development Guidelines

> Best practices for backend development in this project.

---

## Overview

Python application with two UI layers (tkinter + web) sharing a common core. Business logic is in `game_logic.py`, persistence in `storage.py`, and the web API server is a Python stdlib HTTP server in `app.py`.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module layout, route organization | ✅ Filled |
| [Database Guidelines](./database-guidelines.md) | ORM patterns, migrations | To fill |
| [Error Handling](./error-handling.md) | ApiError, 400/404/500 conventions | ✅ Filled |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | To fill |
| [Logging Guidelines](./logging-guidelines.md) | Structured logging, log levels | To fill |

---

## Key Conventions

- **Data classes**: `models.py` with `from_dict()` / `to_dict()` for serialization
- **Business logic**: `GameLogic` class — all game rules, XP, upgrades, campus grid
- **Persistence**: `Storage` class — JSON file with versioned migrations
- **Thread safety**: `threading.RLock` protects all `WebGameApp` state mutations
- **API errors**: `ApiError` with HTTP status — user-facing; 500 for internal
- **Routes**: `if` chain in `_dispatch_api()`, pattern-matched on segments + method
- **Icon storage**: files on disk at `icons/{building_id}.{ext}`, extension stored in `settings.custom_icons`
- **Web server**: `ThreadingHTTPServer` from stdlib — no third-party HTTP framework

---

## How to Update These Guidelines

After fixing a bug or discovering a pattern worth preserving:
1. Update the relevant file above
2. Note the change in the guidelines index table
3. Commit with `docs: update backend spec` message
