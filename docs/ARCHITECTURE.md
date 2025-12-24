# Architecture Documentation

This document describes the architecture of OSM Notes API using the C4 Model.

## System Context (Level 1)

```
┌─────────────────────────────────────────────────────────────┐
│                    OSM Notes API                             │
│                  (This System)                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────┐      ┌──────────────┐
│  PostgreSQL  │      │    Redis     │
│  Analytics DB │      │    Cache     │
│ (osm_notes_dwh)│     │              │
└──────────────┘      └──────────────┘
        │
        │ (FDW)
        ▼
┌──────────────┐
│  PostgreSQL  │
│  Ingestion DB│
│  (osm_notes) │
└──────────────┘
```

### Actors

- **API Consumers**: Applications, bots, mobile apps using the API
- **Developers**: Developers integrating with the API
- **System Administrators**: Managing and monitoring the API

### External Systems

- **PostgreSQL Analytics Database** (`osm_notes_dwh`): Contains datamarts and analytics data
- **PostgreSQL Ingestion Database** (`osm_notes`): Contains raw notes data (accessed via FDW)
- **Redis**: Cache and rate limiting storage

## Container Diagram (Level 2)

```
┌─────────────────────────────────────────────────────────────┐
│                    OSM Notes API                             │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Express     │  │  Middleware  │  │  Controllers │     │
│  │   Server     │──│   Layer      │──│   Layer      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                 │                   │             │
│         │                 │                   │             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Services    │  │   Database    │  │    Cache     │     │
│  │   Layer      │──│   Access      │──│   Manager    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
┌──────────────┐          ┌──────────────┐
│  PostgreSQL  │          │    Redis     │
│  Analytics   │          │              │
└──────────────┘          └──────────────┘
```

### Components

1. **Express Server**: HTTP server handling requests
2. **Middleware Layer**: 
   - User-Agent validation
   - Rate limiting
   - Anti-abuse protection
   - Error handling
   - Authentication (Phase 5)
3. **Controllers Layer**: Request/response handling
4. **Services Layer**: Business logic
5. **Database Access**: PostgreSQL queries
6. **Cache Manager**: Redis operations

## Component Diagram (Level 3)

### Request Flow

```
Client Request
    │
    ▼
┌─────────────────┐
│ validateUserAgent│  Validate User-Agent format
└────────┬────────┘
         │
    ┌────▼────┐
    │ antiAbuse│  Check for AIs/bots
    └────┬────┘
         │
    ┌────▼────┐
    │ rateLimit│  Check rate limits
    └────┬────┘
         │
    ┌────▼────┐
    │ Controller│  Handle request
    └────┬────┘
         │
    ┌────▼────┐
    │  Service │  Business logic
    └────┬────┘
         │
    ┌────▼────┐
    │   Cache  │  Check cache
    └────┬────┘
         │
    ┌────▼────┐
    │ Database │  Query PostgreSQL
    └────┬────┘
         │
    ┌────▼────┐
    │ Response │  Return JSON
    └─────────┘
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              OSM-Notes-Analytics                            │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │     ETL      │────────▶│   DWH        │                  │
│  │   Process    │         │  (Datamarts) │                  │
│  └──────────────┘         └──────┬───────┘                  │
└───────────────────────────────────┼─────────────────────────┘
                                     │
                                     │ (FDW if separate DBs)
                                     │
┌───────────────────────────────────┼─────────────────────────┐
│              OSM-Notes-API         │                          │
│                                     │                          │
│  ┌──────────────┐         ┌────────▼──────┐                  │
│  │   Service    │────────▶│   Database    │                  │
│  │   Layer     │         │   Access      │                  │
│  └──────┬───────┘         └───────────────┘                  │
│         │                                                    │
│  ┌──────▼───────┐         ┌──────────────┐                  │
│  │   Cache      │────────▶│    Redis     │                  │
│  │   Manager   │         │              │                  │
│  └──────┬───────┘         └──────────────┘                  │
│         │                                                    │
│  ┌──────▼───────┐                                            │
│  │   Controller  │                                            │
│  └──────┬───────┘                                            │
│         │                                                    │
│  ┌──────▼───────┐                                            │
│  │   Express     │                                            │
│  │   Server      │                                            │
│  └──────┬───────┘                                            │
└─────────┼────────────────────────────────────────────────────┘
           │
           │ HTTP/JSON
           ▼
    ┌──────────────┐
    │   API        │
    │  Consumers   │
    └──────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Server: 192.168.0.7                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Docker     │  │   Docker     │  │   Docker     │     │
│  │   API        │  │  PostgreSQL  │  │   Redis      │     │
│  │   Container  │  │  Container   │  │  Container   │     │
│  │   :3000      │  │   :5432      │  │   :6379      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │   Docker     │  │   Docker     │                         │
│  │  Prometheus  │  │   Grafana    │                         │
│  │   :9090      │  │   :3001      │                         │
│  └──────────────┘  └──────────────┘                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **Testing**: Jest + Supertest
- **Monitoring**: Prometheus + Grafana
- **Containerization**: Docker + Docker Compose

## References

- [C4 Model](https://c4model.com/)
- [Architecture Decision Records](https://adr.github.io/)

