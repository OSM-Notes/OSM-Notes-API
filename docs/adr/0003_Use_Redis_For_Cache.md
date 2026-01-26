# ADR-0003: Use Redis for Cache

## Status

Accepted

## Context

The API needs caching to:
- Reduce database load
- Improve response times
- Support rate limiting
- Enable future features (webhooks, queues in Phase 5)

We already have Redis available in the infrastructure (192.168.0.7).

## Decision

We will use **Redis** for:
- Response caching
- Rate limiting state
- Session storage (if needed in Phase 5)
- Queue system (BullMQ in Phase 5)

## Consequences

### Positive

- ✅ **Reuse existing infrastructure**: Redis already available
- ✅ **High performance**: In-memory storage, very fast
- ✅ **Multiple use cases**: Cache, rate limiting, queues
- ✅ **Mature ecosystem**: Well-supported libraries (`redis`, `ioredis`, `bullmq`)
- ✅ **Persistence options**: Can persist data if needed
- ✅ **No additional cost**: Uses existing Redis instance

### Negative

- ⚠️ **Single point of failure**: If Redis goes down, cache and rate limiting affected (mitigated by graceful degradation)
- ⚠️ **Memory limits**: Need to monitor memory usage

### Alternatives Considered

- **In-memory cache (node-cache)**: Simpler but doesn't support distributed setup or queues
- **PostgreSQL as cache**: Possible but less efficient than Redis

## References

- [Redis Documentation](https://redis.io/docs/)
- [BullMQ Documentation](https://docs.bullmq.io/)

