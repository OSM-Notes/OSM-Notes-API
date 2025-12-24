# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for OSM Notes API.

## What are ADRs?

Architecture Decision Records are documents that capture important architectural decisions made during the project. They help:

- Track why decisions were made
- Understand the context and alternatives considered
- Share knowledge with the team
- Avoid revisiting the same decisions

## ADR Format

Each ADR follows this structure:

- **Status**: Proposed | Accepted | Rejected | Deprecated | Superseded
- **Context**: The issue motivating the decision
- **Decision**: The decision made
- **Consequences**: Positive and negative impacts
- **Alternatives Considered**: Other options that were evaluated

## Current ADRs

- [ADR-0001](0001-record-architecture-decisions.md): Record Architecture Decisions
- [ADR-0002](0002-use-nodejs-express.md): Use Node.js + Express
- [ADR-0003](0003-use-redis-for-cache.md): Use Redis for Cache
- [ADR-0004](0004-hybrid-oauth-approach.md): Hybrid OAuth Approach
- [ADR-0005](0005-restrictive-rate-limiting.md): Restrictive Rate Limiting

## Creating a New ADR

1. Copy [template.md](template.md) to a new file: `000X-short-title.md`
2. Fill in the template
3. Update this README with the new ADR
4. Commit with message: `docs(adr): add ADR-000X for [decision]`

## References

- [ADR GitHub](https://adr.github.io/)
- [Michael Nygard's Article](http://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions)

