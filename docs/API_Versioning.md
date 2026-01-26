---
title: "API Versioning Strategy"
description: "This document outlines the API versioning strategy for OSM Notes API."
version: "1.0.0"
last_updated: "2026-01-25"
author: "AngocA"
tags:
  - "api"
audience:
  - "developers"
project: "OSM-Notes-API"
status: "active"
---


# API Versioning Strategy

This document outlines the API versioning strategy for OSM Notes API.

## Versioning Approach

### URL Path Versioning

API versions are specified in the URL path:

```
/api/v1/users/12345
/api/v2/users/12345
```

**Format**: `/api/v{major_version}/...`

### Version Numbering

We follow [Semantic Versioning](https://semver.org/) for the API:

- **v1, v2, v3...**: Major versions (breaking changes)
- **Minor and patch versions**: Not exposed in URL (handled internally)

## Version Lifecycle

### Version Support Policy

- **Current Version**: Fully supported, receives all updates
- **Previous Version**: Supported for bug fixes and security patches only
- **Older Versions**: Deprecated, may be removed after deprecation period

### Deprecation Process

1. **Announcement**: Deprecation announced in:
   - CHANGELOG.md
   - API documentation
   - Response headers (`Deprecation: true`, `Sunset: <date>`)

2. **Deprecation Period**: Minimum 6 months from announcement

3. **Removal**: After deprecation period, version may be removed

### Example Deprecation Timeline

```
v1.0.0 released: 2025-01-01
v2.0.0 released: 2025-07-01
v1.0.0 deprecated: 2025-07-01
v1.0.0 sunset: 2026-01-01 (6 months later)
```

## Breaking Changes

### What Constitutes a Breaking Change?

- Removing endpoints
- Removing required fields from responses
- Changing field types (string → number, etc.)
- Changing required request parameters
- Changing authentication requirements
- Changing error response formats

### What is NOT a Breaking Change?

- Adding new endpoints
- Adding optional fields to responses
- Adding optional request parameters
- Adding new error codes
- Performance improvements
- Bug fixes that don't change behavior

## Version Headers

### Request Headers

Clients can optionally specify preferred API version:

```
API-Version: v1
```

If not specified, defaults to latest stable version.

### Response Headers

Responses include version information:

```
API-Version: v1
Deprecation: false
Sunset: (only if deprecated)
```

## Migration Guide

When a new version is released, a migration guide will be provided:

- `docs/migration/v1-to-v2.md` - Migration from v1 to v2
- `docs/migration/v2-to-v3.md` - Migration from v2 to v3

Migration guides include:
- List of breaking changes
- Code examples for migration
- Common pitfalls
- Timeline for migration

## Current Versions

### v1 (Current)

- **Status**: Active development
- **Released**: TBD
- **Endpoints**: All MVP endpoints
- **Breaking Changes**: None (initial version)

### Future Versions

- **v2**: Planned for Phase 5 (Webhooks and Notifications)
  - May include breaking changes for subscription endpoints
  - Timeline: TBD

## Best Practices for Clients

### 1. Pin to Specific Version

```bash
# ✅ Good: Pin to specific version
GET /api/v1/users/12345

# ⚠️ Avoid: Using latest without version
GET /api/users/12345  # Not supported
```

### 2. Handle Deprecation Headers

```javascript
const response = await fetch('/api/v1/users/12345');
const deprecation = response.headers.get('Deprecation');
const sunset = response.headers.get('Sunset');

if (deprecation === 'true') {
  console.warn(`API version deprecated. Sunset date: ${sunset}`);
  // Plan migration to newer version
}
```

### 3. Test Against Multiple Versions

If your application needs to support multiple versions:

```javascript
// Support both v1 and v2
const apiVersion = userPreferences.apiVersion || 'v1';
const url = `/api/${apiVersion}/users/12345`;
```

### 4. Monitor Deprecation Notices

- Subscribe to repository releases
- Monitor CHANGELOG.md
- Check API response headers regularly

## Implementation Notes

### Version Routing

```typescript
// Express router setup
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);
```

### Version Detection

```typescript
// Middleware to detect API version from URL
function detectApiVersion(req: Request): string {
  const match = req.path.match(/^\/api\/v(\d+)\//);
  return match ? `v${match[1]}` : 'v1';
}
```

## FAQ

### Q: Can I use multiple versions simultaneously?

A: Yes, you can make requests to different versions in the same application.

### Q: How long will deprecated versions be supported?

A: Minimum 6 months from deprecation announcement.

### Q: Will I be notified before a version is removed?

A: Yes, deprecation is announced at least 6 months before removal.

### Q: Can I request features in older versions?

A: No, new features are only added to the current version.

### Q: What happens if I don't specify a version?

A: Requests without version will default to the latest stable version (v1 initially).

## References

- [Semantic Versioning](https://semver.org/)
- [REST API Versioning Best Practices](https://restfulapi.net/versioning/)
- [API Versioning Strategy](https://www.baeldung.com/rest-versioning)

