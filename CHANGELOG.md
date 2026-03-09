# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Production deployment**: API deployed on server 192.168.0.7 using Docker Compose
  (`docker-compose.host-db.yml`): API and Redis in containers, PostgreSQL on host; health and
  version headers verified; optional Redis-in-Docker so host Redis config is not required.
- **Paginated list endpoints**: `GET /notes-api/v1/users` and `GET /notes-api/v1/countries` with
  `page`, `limit`, `sort`, and `order` query parameters (completes API proposal scope).
- **OSM API 0.6 compatibility layer** at `/api/0.6/notes`: read-only endpoints matching
  api.openstreetmap.org for notes (bbox, search, get by id); responses in OSM-style GeoJSON.
- **OpenAPI spec from file**: Specification loaded from YAML file; canonical source in
  OSM-Notes-Common repo, with submodule at `lib/osm-common` and local fallback at `openapi/`.
- **OSM-Notes-Common as Git submodule** at `lib/osm-common` for shared schemas (e.g. OpenAPI).
- **Documentation**: `docs/API_Proposal_Status.md` (proposal implementation status),
  `docs/OSM_06_Notes_Compat.md` (OSM 0.6 notes compat and write-proxy recommendation),
  `docs/OpenAPI_Spec.md` (where the spec lives and how to sync with Common).

### Changed

- **API base path**: Project API base path changed from `/api/v1` to `/notes-api/v1`; OSM
  compatibility remains under `/api/0.6/notes`.
- **OpenAPI tooling**: Replaced swagger-jsdoc with file-based spec; added `js-yaml` for YAML
  loading; spec path configurable via `OPENAPI_SPEC_PATH`.
- **Pagination**: `Link` header now always includes `rel="first"` when `total_pages > 1` (including
  on page 1).
- **Database config**: Optional `DB_HOST`/`DB_PORT` to allow Unix socket connection and peer
  authentication when omitted.
- **API proposal**: `docs/API_Proposal.md` archived to `docs/archive/`; current API reference is
  `docs/API.md` and the OpenAPI spec.

## [2026-01-26] - Recent Updates and Improvements

### Added

- **CI/CD Testing Infrastructure**: Added local CI testing scripts and improved test workflows
- **New API Endpoints**: Added trends, comparison, rankings, and advanced search endpoints
- **Enhanced Search**: Implemented advanced search service with logical operators and text search
  capabilities
- **Metrics and Monitoring**: Added Prometheus metrics middleware and endpoint for observability

### Changed

- **Documentation**: Comprehensive documentation updates including standardized links, metadata
  sections, and Mermaid diagrams

## [0.1.0] - 2025-12-26

### Added - Phase 1 MVP

#### Core API Endpoints

- Notes endpoints:
  - `GET /notes-api/v1/notes/:note_id` - Get note by ID
  - `GET /notes-api/v1/notes/:note_id/comments` - Get note comments
  - `GET /notes-api/v1/notes` - Search notes with filters and pagination
- User profiles endpoint:
  - `GET /notes-api/v1/users/:user_id` - Get user profile with analytics
- Country profiles endpoint:
  - `GET /notes-api/v1/countries/:country_id` - Get country profile with analytics
- Global analytics endpoint:
  - `GET /notes-api/v1/analytics/global` - Get global statistics
- Health check endpoint:
  - `GET /health` - API and dependencies status

#### Security & Middleware

- User-Agent validation middleware (required format: `AppName/Version (Contact)`)
- Rate limiting middleware (50 requests/15min for anonymous users)
- Anti-abuse protection (AI detection, bot detection)
- CORS configuration
- Helmet security headers
- Input validation with Joi
- Error handling middleware

#### Infrastructure

- PostgreSQL database integration with connection pooling
- Redis integration for caching and rate limiting (optional)
- Environment variable validation with Joi
- Structured logging with Winston (JSON in production, human-readable in development)
- TypeScript strict mode configuration
- Docker and Docker Compose configuration
- Health check with database and Redis status

#### Testing

- Unit tests for all services (noteService, userService, countryService, analyticsService)
- Unit tests for middleware (validateUserAgent, rateLimit, antiAbuse)
- Integration tests for all endpoints
- Integration tests for complete flows (end-to-end scenarios)
- Edge cases and boundary condition tests
- Comprehensive security tests (SQL injection, XSS, path traversal, etc.)
- Test coverage reporting

#### Documentation

- OpenAPI/Swagger documentation with interactive UI (`/docs`)
- Complete API reference documentation
- Installation guide (`docs/INSTALLATION.md`)
- Usage manual (`docs/USAGE.md`)
- Deployment guide (`docs/DEPLOYMENT.md`)
- Testing guide (`docs/TESTING.md`)
- Updated README with quick start examples

#### Code Quality

- ESLint configuration with strict rules
- Prettier configuration for code formatting
- Pre-commit hooks with Husky (lint, type-check, format-check)
- Commitlint for Conventional Commits
- TypeScript strict type checking
- All code follows established standards

#### Project Setup

- Initial project structure
- TypeScript configuration with strict mode
- ESLint and Prettier configuration
- Jest testing framework setup
- Docker configuration (Dockerfile, docker-compose.yml)
- License (MIT)
- Contributing guidelines
- Code of Conduct

[Unreleased]: https://github.com/OSM-Notes/OSM-Notes-API/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/OSM-Notes/OSM-Notes-API/releases/tag/v0.1.0

---

**Note**: This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and
uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
