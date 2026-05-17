# Error Handling

> How errors are handled in this project.

---

## Overview

The project uses a two-tier error handling strategy:
- **User-facing errors**: `ApiError` subclass → HTTP JSON response with human-readable message
- **Internal errors**: caught at top-level handler → `INTERNAL_SERVER_ERROR` (500) with opaque message; logged with traceback

---

## Error Types

### ApiError

```python
class ApiError(ValueError):
    """User-facing API error with an HTTP status."""

    def __init__(self, message, status=HTTPStatus.BAD_REQUEST):
        super().__init__(message)
        self.status = status
```

Defined in `webui/app.py`. Raised by `WebGameApp` methods for validation failures and not-found conditions.

### HTTP Status Conventions

| Status | When |
|--------|------|
| `BAD_REQUEST` (400) | Missing/invalid fields in payload |
| `NOT_FOUND` (404) | Resource does not exist |
| `INTERNAL_SERVER_ERROR` (500) | Unexpected exception (caught at handler level, not exposed to client) |

---

## Error Propagation Patterns

### WebGameApp method level

```python
def get_icon(self, building_id):
    with self._lock:
        icon_ref = self.game.settings.get("custom_icons", {}).get(building_id)
        if not icon_ref:
            raise ApiError("图标不存在。", status=HTTPStatus.NOT_FOUND)
        # ...
```

### RequestHandler level

```python
def _handle_api(self, method, path):
    try:
        payload = self._read_json() if method in {"POST", "PUT", "PATCH"} else {}
        response = self._dispatch_api(method, path, payload)
        if isinstance(response, dict) and "__icon__" in response:
            self._send_data_url(response["__icon__"])
        else:
            self._send_json(HTTPStatus.OK, response)
    except ApiError as exc:
        self._send_json(exc.status, {"error": str(exc)})
    except json.JSONDecodeError:
        self._send_json(HTTPStatus.BAD_REQUEST, {"error": "JSON 请求体格式无效。"})
    except Exception:
        self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "服务器内部错误。"})
```

---

## API Error Responses

All API errors return a JSON object with an `error` key:

```json
{ "error": "图标不存在。" }
```

### Validation errors (400)

```python
raise ApiError(f"缺少必填字段：{field}。")
raise ApiError("无效的图标数据，需要 data:URL 格式。")
```

### Not found errors (404)

```python
raise ApiError("图标不存在。", status=HTTPStatus.NOT_FOUND)
raise ApiError("图标文件不存在。", status=HTTPStatus.NOT_FOUND)
```

### Internal errors (500)

Caught implicitly by the top-level `except Exception` handler — no explicit raise needed. Message is not leaked to client.

---

## Thread Safety

All `WebGameApp` state mutations are protected by `self._lock` (a `threading.RLock`). The lock is held for the minimum surface area — only the mutation + save, not the I/O. Icon file reads in `get_icon` are also inside the lock.

---

## Common Mistakes

### Returning non-JSON for error cases

The `_handle_api` top-level catch-all `except Exception` swallows everything and returns JSON 500. Do NOT return raw bytes or non-JSON from API endpoints.

### Raising plain `ValueError` instead of `ApiError`

Plain `ValueError` is not caught by the `ApiError` handler and will fall through to the 500 catch-all, exposing an internal message to the client. Always use `ApiError` for user-facing validation failures.

### Holding lock during file I/O

`_save_locked()` is called while holding `self._lock`. The JSON write itself is not async-safe for concurrent readers, but the lock protects the write sequence. Do NOT call `os.remove()` or other blocking I/O while holding the lock if the operation can be slow — move non-critical I/O outside the lock scope.

### Upload icon file without creating parent directory

`upload_icon()` calls `os.makedirs(ICONS_DIR, exist_ok=True)` before writing. If creating a new method that writes to the icons directory, ensure the directory exists first.

