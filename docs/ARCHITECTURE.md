# Architecture Documentation

This document describes the architecture of OSM Notes API using the C4 Model.

## System Context (Level 1)

```mermaid
graph TB
    subgraph "OSM Notes API"
        API[OSM Notes API<br/>This System]
    end
    
    subgraph "External Systems"
        PG_Analytics[PostgreSQL<br/>Analytics DB<br/>osm_notes_dwh]
        Redis[Redis<br/>Cache & Rate Limiting]
        PG_Ingestion[PostgreSQL<br/>Ingestion DB<br/>osm_notes]
    end
    
    subgraph "Actors"
        Consumers[API Consumers<br/>Applications, Bots, Mobile Apps]
        Developers[Developers<br/>Integrating with API]
        Admins[System Administrators<br/>Managing & Monitoring]
    end
    
    Consumers -->|HTTP/JSON| API
    Developers -->|Integration| API
    Admins -->|Management| API
    
    API -->|Read Analytics Data| PG_Analytics
    API -->|Cache & Rate Limiting| Redis
    PG_Analytics -->|FDW Foreign Data Wrapper| PG_Ingestion
```

### Actors

- **API Consumers**: Applications, bots, mobile apps using the API
- **Developers**: Developers integrating with the API
- **System Administrators**: Managing and monitoring the API

### External Systems

- **PostgreSQL Analytics Database** (`osm_notes_dwh`): Contains datamarts and analytics data (from OSM-Notes-Analytics)
- **PostgreSQL Ingestion Database** (`osm_notes`): Contains raw notes data (from OSM-Notes-Ingestion, accessed via FDW)
- **Redis**: Cache and rate limiting storage

### OSM Notes Ecosystem

This API is part of the **OSM-Notes ecosystem**, consisting of 8 interconnected projects:

- **OSM-Notes-Ingestion** (base project): Provides base database (`osm_notes`)
- **OSM-Notes-Analytics**: Provides data warehouse (`osm_notes_dwh`) - **REQUIRED** for this API
- **OSM-Notes-API** (this project): REST API for programmatic access
- **OSM-Notes-Data**: JSON files exported from Analytics (served via GitHub Pages)
- **OSM-Notes-Viewer**: Web application consuming Data (complementary to this API)
- **OSM-Notes-WMS**: Web Map Service using Ingestion database
- **OSM-Notes-Monitoring**: Monitors all ecosystem components including this API
- **OSM-Notes-Common**: Shared libraries (not used by this API - Node.js project)

See the main [README.md](../../README.md) for complete ecosystem overview.

## Container Diagram (Level 2)

```mermaid
graph TB
    subgraph "OSM Notes API Application"
        Express[Express Server<br/>HTTP Server]
        Middleware[Middleware Layer<br/>User-Agent, Rate Limit,<br/>Anti-Abuse, Error Handling]
        Controllers[Controllers Layer<br/>Request/Response Handling]
        Services[Services Layer<br/>Business Logic]
        DB_Access[Database Access<br/>PostgreSQL Queries]
        Cache_Mgr[Cache Manager<br/>Redis Operations]
    end
    
    subgraph "External Systems"
        PostgreSQL[(PostgreSQL<br/>Analytics Database)]
        Redis[(Redis<br/>Cache & Rate Limiting)]
    end
    
    Express -->|HTTP Requests| Middleware
    Middleware -->|Validated Requests| Controllers
    Controllers -->|Business Logic| Services
    Services -->|Data Access| DB_Access
    Services -->|Cache Operations| Cache_Mgr
    DB_Access -->|SQL Queries| PostgreSQL
    Cache_Mgr -->|Cache Operations| Redis
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

```mermaid
sequenceDiagram
    participant Client
    participant UserAgent as validateUserAgent
    participant AntiAbuse as antiAbuse
    participant RateLimit as rateLimit
    participant Controller
    participant Service
    participant Cache
    participant Database as PostgreSQL
    participant Redis
    
    Client->>UserAgent: HTTP Request with User-Agent
    UserAgent->>UserAgent: Validate format & contact
    alt Invalid User-Agent
        UserAgent->>Client: 400 Bad Request
    else Valid User-Agent
        UserAgent->>AntiAbuse: Pass request
        AntiAbuse->>AntiAbuse: Check for AIs/bots
        alt AI/Bot detected
            AntiAbuse->>Client: 403 Forbidden or Rate Limited
        else Legitimate request
            AntiAbuse->>RateLimit: Pass request
            RateLimit->>Redis: Check rate limit
            Redis-->>RateLimit: Rate limit status
            alt Rate limit exceeded
                RateLimit->>Client: 429 Too Many Requests
            else Within limit
                RateLimit->>Controller: Pass request
                Controller->>Service: Process request
                Service->>Cache: Check cache
                Cache->>Redis: Get cached data
                alt Cache hit
                    Redis-->>Cache: Cached data
                    Cache-->>Service: Return cached data
                else Cache miss
                    Redis-->>Cache: Cache miss
                    Cache-->>Service: Cache miss
                    Service->>Database: Query database
                    Database-->>Service: Query results
                    Service->>Cache: Store in cache
                    Cache->>Redis: Set cached data
                end
                Service-->>Controller: Business logic result
                Controller-->>Client: JSON Response
            end
        end
    end
```

## Data Flow Diagram

```mermaid
graph TB
    subgraph "OSM-Notes-Analytics"
        ETL[ETL Process]
        DWH[DWH Datamarts]
        ETL -->|Load Data| DWH
    end
    
    subgraph "OSM-Notes-API"
        Express_Server[Express Server]
        Controller[Controller Layer]
        Service_Layer[Service Layer]
        Cache_Manager[Cache Manager]
        DB_Access[Database Access]
        
        Express_Server -->|HTTP Requests| Controller
        Controller -->|Business Logic| Service_Layer
        Service_Layer -->|Data Access| DB_Access
        Service_Layer -->|Cache Operations| Cache_Manager
    end
    
    subgraph "External Systems"
        PG_Analytics[(PostgreSQL<br/>Analytics DB)]
        PG_Ingestion[(PostgreSQL<br/>Ingestion DB)]
        Redis[(Redis<br/>Cache)]
        Consumers[API Consumers]
    end
    
    DWH -.->|FDW Foreign Data Wrapper| PG_Ingestion
    DB_Access -->|Read Analytics| PG_Analytics
    PG_Analytics -.->|FDW if separate| PG_Ingestion
    Cache_Manager -->|Cache Operations| Redis
    Express_Server -->|HTTP/JSON| Consumers
    
    style DWH fill:#e1f5ff
    style PG_Analytics fill:#e1f5ff
    style PG_Ingestion fill:#e1f5ff
    style Redis fill:#ffe1e1
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Server: 192.168.0.7"
        subgraph "Application Services"
            API_Container["`**Docker Container**<br/>OSM Notes API<br/>Port: 3000`"]
        end
        
        subgraph "Data Services"
            PG_Container["`**Docker Container**<br/>PostgreSQL<br/>Port: 5432`"]
            Redis_Container["`**Docker Container**<br/>Redis<br/>Port: 6379`"]
        end
        
        subgraph "Monitoring Services"
            Prometheus_Container["`**Docker Container**<br/>Prometheus<br/>Port: 9090`"]
            Grafana_Container["`**Docker Container**<br/>Grafana<br/>Port: 3001`"]
        end
    end
    
    subgraph "External"
        Internet[Internet<br/>API Consumers]
    end
    
    Internet -->|HTTP/JSON| API_Container
    API_Container -->|SQL Queries| PG_Container
    API_Container -->|Cache & Rate Limiting| Redis_Container
    API_Container -->|Metrics| Prometheus_Container
    Prometheus_Container -->|Dashboards| Grafana_Container
    
    style API_Container fill:#4a90e2,color:#fff
    style PG_Container fill:#336791,color:#fff
    style Redis_Container fill:#dc382d,color:#fff
    style Prometheus_Container fill:#e6522c,color:#fff
    style Grafana_Container fill:#f46800,color:#fff
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

