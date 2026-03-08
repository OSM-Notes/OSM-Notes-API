# Pagination design: cursor-based (keyset) option

This document describes **cursor-based pagination** as a complement to the current **page/offset** approach. The cursor mode is implemented and available via the `after` query parameter.

---

## Current behaviour (page/offset)

- **Parameters**: `page` (default 1), `limit` (default 20, max 100).
- **SQL**: `ORDER BY n.created_at DESC LIMIT $limit OFFSET $offset` with `offset = (page - 1) * limit`.
- **Response**: `data[]`, `pagination: { page, limit, total, total_pages }`, plus `Link` and `X-*` headers.

**Limitation**: Deep pages (e.g. `page=500`) cause large `OFFSET` values; the database still has to step over many rows, so latency can grow.

---

## Proposed: cursor-based (keyset) pagination

### Idea

- Client requests “the next N items **after** this position” instead of “page N”.
- Position is encoded in an **opaque cursor** derived from the last item of the previous response.
- No `OFFSET`; the next page uses a `WHERE` on the sort key (and tie-breaker), which can use an index.

### Ordering

- List order remains **newest first**: `ORDER BY n.created_at DESC, n.note_id DESC`.
- Tie-breaker `note_id` makes the order deterministic and allows a stable cursor.

### Parameters (additive, optional)

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `limit`   | integer | Same as today (default 20, max 100). |
| `after`   | string  | Opaque cursor from the previous response’s `next_cursor`. Omit on first request. |

- **Compatibility**: If `after` is present, use cursor mode. If only `page` is used (or neither), keep current page/offset behaviour. Do not mix: e.g. if `after` is set, ignore `page`.

### Cursor format (internal)

- Cursor encodes the position “after the last item returned”.
- Proposal: **last item’s `created_at` (ISO 8601) + `note_id`**, e.g. `1699123456.789_12345` (timestamp_noteid) or `2024-01-15T10:30:00.000Z_12345` for readability. Server encodes when building the response; client sends the same string back in `after`.
- Server decodes to `(cursor_created_at, cursor_note_id)` and applies:

```sql
WHERE (n.created_at, n.note_id) < ($cursor_created_at, $cursor_note_id)
ORDER BY n.created_at DESC, n.note_id DESC
LIMIT $limit
```

- No `OFFSET`; a single range condition on the sort columns (with an index on `(created_at DESC, note_id DESC)`) keeps the query efficient.

### Response (cursor mode)

- **data**: Same list of note objects as today.
- **pagination** (optional in cursor mode):
  - `limit`, `total` (optional; can be omitted to avoid `COUNT(*)` for “infinite scroll”).
  - `page` / `total_pages` can be omitted in cursor mode.
- **next_cursor**: Opaque string to use as `after` for the next request. Omitted if there are no more results (e.g. last batch had fewer than `limit` items).
- **prev_cursor** (optional): For “previous page” if the API wants to support going back.

Headers (e.g. `Link`) can still expose a “next” relation using the cursor in the query string:  
`</notes-api/v1/notes?after=...&limit=20>; rel="next"`.

### Example flow

1. **First request**  
   `GET /notes-api/v1/notes?status=open&limit=20`  
   Response: `data` (20 items), `next_cursor: "2024-01-15T10:30:00.000Z_12345"` (from last item).

2. **Next page**  
   `GET /notes-api/v1/notes?status=open&limit=20&after=2024-01-15T10:30:00.000Z_12345`  
   Server decodes cursor, runs `WHERE (created_at, note_id) < ('2024-01-15 10:30:00', 12345) ORDER BY ... LIMIT 20`.  
   Response: next 20 items, new `next_cursor` or none.

### Scope

- **Endpoints**: Apply first to list endpoints that today use offset (e.g. `GET /notes-api/v1/notes`, advanced search). Same pattern can be reused for `GET /notes-api/v1/hashtags`, etc.
- **Filters**: All current query filters (status, country, bbox, etc.) apply unchanged; only the pagination parameters and response shape change in cursor mode.

### Implementation checklist (when implementing)

- [ ] Define cursor encoding/decoding (format, validation, no sensitive data).
- [ ] Add `after` to validation schema; when `after` is set, ignore `page` and do not send `offset` to SQL.
- [ ] In noteService (and advancedSearchService): branch on “cursor mode”; build `WHERE (created_at, note_id) < ($1, $2)` and `ORDER BY created_at DESC, note_id DESC LIMIT $3`; no `OFFSET`.
- [ ] Optionally skip `COUNT(*)` in cursor mode to save cost.
- [ ] Return `next_cursor` (and optionally `prev_cursor`) in JSON; set `Link` header with cursor in `after` for “next”.
- [ ] Add index on `(created_at DESC, note_id)` (or equivalent) on `public.notes` if not already present.
- [ ] Document in OpenAPI/Swagger and in docs (e.g. Testing.md, README) when to use cursor vs page.
- [ ] Add tests: cursor first page, next page with `after`, invalid cursor (400), empty result (no `next_cursor`).

### Coexistence with page/offset

- Keep existing `page`/`limit` and current response (including `total`, `total_pages`) for clients that need “page 2 of 10”.
- Cursor mode is for clients that want “next N after this” (e.g. infinite scroll) and better performance on deep pages.
- Validation: if `after` is present, use cursor mode and ignore `page`; otherwise use current page/offset behaviour.

---

## References

- PostgreSQL: efficient “keyset” or “cursor” pagination using `WHERE (a, b) < (x, y) ORDER BY a, b LIMIT n` and an index.
- RFC 5988 (Link header); common practice for `rel="next"` with cursor in query string.
