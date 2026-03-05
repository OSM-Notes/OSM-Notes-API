# OpenAPI Specification

The API is described by an **OpenAPI 3.0** specification. The server loads the spec from file instead of generating it from code (Option A: single source of truth).

## Where the spec lives

- **Canonical (shared)**: [OSM-Notes-Common](https://github.com/OSM-Notes/OSM-Notes-Common) at `schemas/openapi/notes-api-v1.yaml`. Use this for client generation, validation, or documentation shared across the ecosystem.
- **This repo**: OSM-Notes-Common is added as a **git submodule** at `lib/osm-common`. The app loads the spec from `lib/osm-common/schemas/openapi/notes-api-v1.yaml` when present; otherwise it falls back to the local copy at `openapi/notes-api-v1.yaml`.

## How the API loads the spec

On startup, the app resolves the spec path in this order:

1. **`OPENAPI_SPEC_PATH`** (env): absolute or relative path to the YAML/JSON file.
2. **OSM-Notes-Common submodule**: `lib/osm-common/schemas/openapi/notes-api-v1.yaml` if the submodule is added.
3. **Local**: `openapi/notes-api-v1.yaml` in the project root.

So you can run without Common by keeping the local `openapi/notes-api-v1.yaml`, or point to Common via the submodule or `OPENAPI_SPEC_PATH`.

## Serving the spec

- **Swagger UI**: `GET /docs` (interactive docs).
- **Raw spec (JSON)**: `GET /docs/json` (spec as JSON for tools or clients).

## Syncing with OSM-Notes-Common

The Common repo is included as a submodule at `lib/osm-common`. The spec is at `lib/osm-common/schemas/openapi/notes-api-v1.yaml`.

**To push the spec to the Common repo** (first time or after editing the local copy):

```bash
cd lib/osm-common
git add schemas/openapi/notes-api-v1.yaml
git commit -m "Add or update OpenAPI spec for OSM-Notes-API"
git push
cd ../..
git add lib/osm-common
git commit -m "Update osm-common submodule (OpenAPI spec)"
```

**To clone this repo with the submodule:**

```bash
git clone --recurse-submodules https://github.com/OSM-Notes/OSM-Notes-API.git
# or after a plain clone:
git submodule update --init
```

When you add or change endpoints or schemas, edit `lib/osm-common/schemas/openapi/notes-api-v1.yaml` (or the local `openapi/notes-api-v1.yaml` and then copy it into the submodule), then commit and push in Common so the canonical spec stays in sync.
