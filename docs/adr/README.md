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

- [ADR-0001](0001_Record_Architecture_Decisions.md): Record Architecture Decisions
- [ADR-0002](0002_Use_Nodejs_Express.md): Use Node.js + Express
- [ADR-0003](0003_Use_Redis_For_Cache.md): Use Redis for Cache
- [ADR-0004](0004_Hybrid_Oauth_Approach.md): Hybrid OAuth Approach
- [ADR-0005](0005_Restrictive_Rate_Limiting.md): Restrictive Rate Limiting

## Creating a New ADR

1. Copy [Template.md](Template.md) to a new file: `000X-short-title.md`
2. Fill in the template
3. Update this README with the new ADR
4. Commit with message: `docs(adr): add ADR-000X for [decision]`

## References

- [ADR GitHub](https://adr.github.io/)
- [Michael Nygard's Article](http://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions)

