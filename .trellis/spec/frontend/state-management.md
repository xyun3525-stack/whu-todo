# State Management

> How state is managed in this project.

---

## Overview

The frontend is a **vanilla JS single-file app** with no framework and no reactive system. State management is explicit and imperative: a single `uiState` object holds the frontend's snapshot of server state, and all rendering is done by replacing DOM innerHTML.

---

## State Categories

### Server State (source of truth)

All game state lives in Python (`WebGameApp`). The frontend fetches it via `GET /api/state` and stores a copy in `uiState.data`.

```javascript
const uiState = {
    currentView: "today",   // "today" | "growth" | "campus" | "settings"
    taskView: "today",       // "today" | "all" | "completed"
    data: null,             // populated by fetchState()
};
```

### Derived UI State

Computed from `uiState.data` at render time (no caching):

```javascript
// In renderGrowth():
const level = uiState.data.growth.level;
// In renderTasks():
const tasks = uiState.data.tasks[uiState.taskView] || [];
```

### DOM State (ephemeral)

DOM-only state (input values, scroll position) is read directly from DOM elements at interaction time, not stored in `uiState`.

```javascript
const searchTerm = document.getElementById("task-search-input")?.value || "";
```

---

## State Flow

```
User action
    ↓
API call (fetch/POST/PUT/DELETE)
    ↓
uiState.data = response
    ↓
renderByView(uiState.currentView)  // or renderAll()
```

There is no optimistic update pattern — the UI always reflects the server response.

---

## No Framework, No Reactivity

Every interactive function that changes state:
1. Makes an API call
2. On success: updates `uiState.data` from the response
3. Calls the appropriate render function

There is no `useState`, no `store`, no `context`. If two views need the same data, they each fetch it fresh or read from the shared `uiState.data`.

---

## Common Mistakes

### Mutating `uiState.data` in place

`uiState.data` should be replaced entirely on each fetch (`uiState.data = response`). Mutating fields in place (e.g., `uiState.data.player.xp += 10`) creates inconsistency with the server state and causes incorrect renders.

### Calling render functions without updating state first

Always update `uiState.data` BEFORE calling render. Never update the DOM while `uiState.data` still holds stale data.

### Storing user input in state

Input values (search text, filter dropdowns) should be read from the DOM at interaction time, not stored in `uiState`. These are ephemeral and should not trigger server sync.

