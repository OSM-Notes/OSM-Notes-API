# ADR-0005: Restrictive Rate Limiting

## Status

Accepted

## Context

We need to protect the API from abuse, especially from:
- AI scraping tools (GPT, Claude, etc.)
- Automated bots
- Excessive usage that could overload the database

At the same time, we want to allow legitimate use cases.

## Decision

We will implement **restrictive rate limiting**:

- **Anonymous users**: 50 requests/15 minutes per IP + User-Agent
- **Detected bots**: 10 requests/hour per IP + User-Agent (very restrictive)
- **Per IP (aggregate)**: 150 requests/15 minutes across all User-Agents from the same IP (mitigates `User-Agent` rotation)
- **Authenticated users** (Phase 5): 1000 requests/hour (planned; not enforced until OAuth is wired)
- **Primary key for per-client limits**: IP address + User-Agent combination (or parsed app name/version)

## Consequences

### Positive

- ✅ **Strong protection**: Prevents abuse and overload
- ✅ **AI protection**: Very low limits force AIs to use OAuth
- ✅ **Database protection**: Limits queries to database
- ✅ **Cost control**: Prevents excessive resource usage

### Negative

- ⚠️ **May affect legitimate users**: 50 req/15min might be low for some use cases
- ⚠️ **IP-based tracking**: Can affect multiple users behind same IP (NAT, corporate networks)

### Mitigation

- Authenticated users get much higher limits (1000 req/hour)
- Clear error messages guide users to authenticate if needed
- Can adjust limits based on usage patterns

## References

- [express-rate-limit Documentation](https://github.com/express-rate-limit/express-rate-limit)

