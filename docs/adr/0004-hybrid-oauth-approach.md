# ADR-0004: Hybrid OAuth Approach

## Status

Accepted

## Context

We need to decide on authentication strategy:
- Public endpoints should be accessible without barriers
- Need to prevent abuse (especially from AIs)
- Advanced features (webhooks, subscriptions) need user identification
- Balance between ease of adoption and security

## Decision

We will use a **hybrid approach**:

1. **Phases 1-4**: No OAuth required
   - Only User-Agent header required (with strict format)
   - Rate limiting: 50 req/15min for anonymous users
   - OAuth **required** for detected AIs (GPT, Claude, etc.)
   - OAuth **required** for detected bots (curl, python-requests, etc.)

2. **Phase 5**: OAuth required for advanced features
   - OAuth optional for basic endpoints (better rate limits: 1000 req/hour)
   - OAuth required for subscriptions and webhooks
   - OAuth required for all endpoints if abuse detected

## Consequences

### Positive

- ✅ **Easy adoption**: Developers can start using API immediately
- ✅ **Protection against abuse**: AIs and bots blocked automatically
- ✅ **Flexibility**: Can escalate protection if needed
- ✅ **User identification**: Available when needed for advanced features
- ✅ **Gradual migration**: Users can adopt OAuth when ready

### Negative

- ⚠️ **Complexity**: Need to maintain both anonymous and authenticated flows
- ⚠️ **Rate limiting less precise**: Anonymous users tracked by IP (can affect multiple users)

### Alternatives Considered

- **No OAuth**: Too vulnerable to abuse, especially from AIs
- **OAuth always required**: Too high barrier for adoption, reduces usage

## References

- [OSM OAuth Documentation](https://wiki.openstreetmap.org/wiki/OAuth)
- [HDYC Example](https://github.com/resultmaps/HDYC) - Uses OAuth for visualization

