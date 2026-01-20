# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2025-12-26

### Added - Phase 1 MVP

#### Core API Endpoints

- Notes endpoints:
  - `GET /api/v1/notes/:note_id` - Get note by ID
  - `GET /api/v1/notes/:note_id/comments` - Get note comments
  - `GET /api/v1/notes` - Search notes with filters and pagination
- User profiles endpoint:
  - `GET /api/v1/users/:user_id` - Get user profile with analytics
- Country profiles endpoint:
  - `GET /api/v1/countries/:country_id` - Get country profile with analytics
- Global analytics endpoint:
  - `GET /api/v1/analytics/global` - Get global statistics
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
