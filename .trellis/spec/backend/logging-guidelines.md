# Logging Guidelines

> How structured logging is organized in this project.

---

## Overview

The backend uses Python's stdlib `logging` module. All logging is done via a module-level `_logger` configured at import time. The frontend (vanilla JS) has no logging — all debugging is done via browser devtools.

---

## Logger Configuration

Defined in `webui/app.py` at import time:

```python
import logging
_logger = logging.getLogger("whu_todo.app")
_logger.setLevel(logging.INFO)
_handler = logging.StreamHandler()
_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
_logger.addHandler(_handler)
```

This logs to stderr (captured by the terminal running the server).

---

## Log Levels and Usage

### User-Facing Errors (WARNING)

`ApiError` and `json.JSONDecodeError` are user-facing validation failures — the client receives a JSON error response. These are logged at `WARNING` level:

```python
except ApiError as exc:
    _logger.warning("API error %s %s: %s", method, path, exc)
    self._send_json(exc.status, {"error": str(exc)})
except json.JSONDecodeError:
    _logger.warning("API error %s %s: invalid JSON", method, path)
    self._send_json(HTTPStatus.BAD_REQUEST, {"error": "JSON 请求体格式无效。"})
```

Format: `2026-05-10 12:34:56 WARNING API error GET /api/tasks: 缺少必填字段：title。`

### Internal Errors (ERROR with traceback)

Unexpected exceptions indicate bugs or environmental issues — logged at `ERROR` level with full traceback via `_logger.exception()`:

```python
except Exception as exc:
    _logger.exception("Internal error handling %s %s", method, path)
    self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "服务器内部错误。"})
```

`_logger.exception()` automatically includes `exc_info=True` (traceback). The message is generic ("Internal error handling...") to avoid leaking internal details.

---

## Log Format

`%(asctime)s %(levelname)s %(message)s` — ISO timestamp, level name, and formatted message:

```
2026-05-10 12:34:56 WARNING API error POST /api/tasks: 缺少必填字段：title。
2026-05-10 12:34:57 ERROR Internal error handling GET /api/state
Traceback (most recent call last):
  File "...", line 123, in _handle_api
    ...
```

---

## What NOT to Log

- **User input values in error messages**: `f"API error ...: {exc}"` is fine when `exc` is an ApiError with a user-safe message. Never log raw user-provided strings in ERROR-level messages.
- **Secrets**: Not applicable to current auth model (none), but avoid logging if added.
- **Large request bodies**: Icon upload payloads can be large. Only log method/path.

---

## Startup Log

The `run()` function uses `print()` (not logging) for the startup URL message since it's a one-time user-facing event:

```python
print(f"校园网页界面已启动：{url}")
```

---

## Frontend Logging

No frontend logging. All debugging is done via browser devtools (console.log, Network tab). The frontend communicates with the server via JSON and can be inspected in the browser's Network tab.
