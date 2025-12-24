# ADR-0002: Use Node.js + Express

## Status

Accepted

## Context

We need to choose a runtime and framework for the OSM Notes API. The API needs to:
- Provide REST endpoints for analytics data
- Handle high concurrency
- Integrate with PostgreSQL database
- Support real-time features (webhooks in Phase 5)
- Be maintainable and have good ecosystem support

## Decision

We will use **Node.js 18+** with **Express.js** framework.

## Consequences

### Positive

- ✅ **Fast development**: Rich ecosystem, many libraries available
- ✅ **Good performance**: Non-blocking I/O suitable for API workloads
- ✅ **TypeScript support**: Type safety and better developer experience
- ✅ **Large community**: Extensive documentation and support
- ✅ **Easy maintenance**: Well-known patterns and conventions
- ✅ **Good PostgreSQL support**: `pg` library is mature and well-maintained
- ✅ **Real-time ready**: Can easily add WebSocket support for Phase 5

### Negative

- ⚠️ **Single-threaded**: CPU-intensive tasks can block event loop (mitigated by using worker threads if needed)
- ⚠️ **Memory usage**: Can be higher than compiled languages (acceptable for this use case)

### Alternatives Considered

- **Python + FastAPI**: Good performance but smaller ecosystem for this specific use case
- **Go + Gin/Echo**: Excellent performance but steeper learning curve and less flexibility

## References

- [Node.js Official Site](https://nodejs.org/)
- [Express.js Documentation](https://expressjs.com/)

