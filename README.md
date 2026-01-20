# OSM Notes API

REST API for OSM Notes Analytics and Ingestion. Unified programmatic access to user profiles, country analytics, advanced search capabilities, rankings, comparisons, and real-time metrics. Extends OSM API 0.6 with specialized analytics features.

## 📋 Description

OSM Notes API provides programmatic access to OpenStreetMap notes analytics data, including:

- **User Profiles**: Detailed statistics of contributors
- **Country Analytics**: Aggregated metrics by country
- **Advanced Search**: Complex filters and dynamic queries
- **Rankings**: User and country classifications
- **Comparisons**: Comparative analysis between entities
- **Trends**: Temporal data analysis
- **Notes and Comments**: Access to OSM notes and their comments

## ⚠️ Important Note

**This API is COMPLEMENTARY to the static JSON system, NOT a replacement.**

- ✅ **JSON system maintained**: The Viewer and other consumers continue using static JSON files
- ✅ **API is additional**: For use cases requiring dynamic queries or integrations
- ✅ **Both coexist**: Each system is used according to the specific use case

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL 15+ (with access to `osm_notes_dwh`)
- Redis 7+ (optional but recommended)

### Installation

```bash
# Clone repository
git clone https://github.com/OSM-Notes/OSM-Notes-API.git
cd OSM-Notes-API

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your configurations

# Build TypeScript
npm run build

# Load mock data (optional, for testing)
# Requires OSM-Notes-Ingestion repository cloned
./scripts/load_mock_data.sh

# Start application
npm start
```

### With Docker

```bash
# Start services
docker compose -f docker/docker-compose.yml up -d

# View logs
docker compose -f docker/docker-compose.yml logs -f api
```

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for detailed instructions.

### Quick Usage Examples

**Health Check**:

```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/health
```

**Get a Note**:

```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/notes/12345
```

**Search Notes**:

```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     "http://localhost:3000/api/v1/notes?status=open&country=42&limit=10"
```

**Get User Profile**:

```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/users/12345
```

**Get Country Profile**:

```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/countries/42
```

**Get Global Analytics**:

```bash
curl -H "User-Agent: MyApp/1.0 (contact@example.com)" \
     http://localhost:3000/api/v1/analytics/global
```

**Interactive API Documentation**:

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs/json`

See [docs/USAGE.md](docs/USAGE.md) for complete usage guide.

## 📚 Documentation

### Getting Started
- [Installation](docs/INSTALLATION.md) - Complete installation guide
- [Usage](docs/USAGE.md) - API usage manual with examples
- [API Reference](docs/API.md) - Complete API reference documentation
- [API Reference (OpenAPI)](docs/api/) - OpenAPI/Swagger documentation

### Operations & Deployment
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions
- [Production Deployment (192.168.0.7)](docs/DEPLOYMENT_PRODUCTION.md) - Specific guide for production server
- [Operations Runbook](docs/RUNBOOK.md) - Operational procedures and runbook
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [CI/CD Guide](docs/CI_CD.md) - Continuous Integration and Deployment

### Performance & Monitoring
- [Performance Guide](docs/PERFORMANCE.md) - Performance optimization and benchmarking
- [SLA/SLOs](docs/SLA.md) - Service Level Agreements and Objectives
- [Monitoring Guide](docs/MONITORING.md) - Prometheus and Grafana setup

### Operations & Compliance
- [Disaster Recovery](docs/operations/DISASTER_RECOVERY.md) - Disaster recovery procedures
- [Backup Strategy](docs/operations/BACKUP_STRATEGY.md) - Backup and restore procedures
- [Capacity Planning](docs/operations/CAPACITY_PLANNING.md) - Capacity planning guide
- [Terms of Service](docs/legal/TERMS_OF_SERVICE.md) - API terms of service
- [Privacy Policy](docs/legal/PRIVACY_POLICY.md) - Privacy policy (GDPR compliant)

### Development
- [Database Schema](docs/DATABASE_SCHEMA.md) - Database schema and data requirements
- [Database User Setup](docs/DATABASE_USER_SETUP.md) - Create read-only database user
- [Redis Setup (Optional)](docs/REDIS_OPTIONAL.md) - Redis configuration (optional but recommended)
- [Redis Troubleshooting](docs/TROUBLESHOOTING_REDIS.md) - Fix Redis connection issues
- [Testing Guide](docs/TESTING.md) - Testing documentation
- [Security Testing](docs/TESTING_SECURITY.md) - OWASP ZAP security testing guide
- [Development Guide](docs/DEVELOPMENT.md) - Development guidelines
- [Contributing](CONTRIBUTING.md) - Contributor guide
- [Architecture Decision Records](docs/adr/) - ADRs documenting technical decisions

### Reference
- [Changelog](CHANGELOG.md) - Change history
- [API Versioning](docs/API_VERSIONING.md) - API versioning strategy

## 🏗️ Project Structure

```text
OSM-Notes-API/
├── src/                    # Source code
│   ├── config/            # Configuration
│   ├── routes/            # API routes
│   ├── controllers/       # Controllers
│   ├── services/          # Business logic
│   ├── middleware/        # Custom middleware
│   ├── utils/             # Utilities
│   └── types/             # TypeScript types
├── tests/                  # Tests
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── load/              # Load tests
├── docs/                   # Documentation
│   ├── INSTALLATION.md    # Installation manual
│   ├── USAGE.md           # Usage manual
│   └── api/               # OpenAPI documentation
├── docker/                 # Docker configuration
└── package.json           # Dependencies and scripts
```

## 🛠️ Available Scripts

### Development
```bash
npm run build          # Build TypeScript
npm start              # Run compiled application
npm run dev            # Development with hot reload
npm run type-check     # Verify TypeScript types
```

### Testing
```bash
npm test               # Run all tests
npm run test:unit      # Unit tests only
npm run test:integration  # Integration tests only
npm run test:coverage  # Tests with coverage report
npm run test:watch     # Run tests in watch mode
npm run test:light     # Run unit tests with 1 worker (for performance)
npm run test:integration:single  # Run integration tests sequentially
```

### Code Quality
```bash
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint errors automatically
npm run format         # Format code with Prettier
npm run format:check   # Check code formatting
```

### Performance & Database
```bash
# Run performance benchmarks
./scripts/run_benchmarks.sh

# Create database indexes
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/create_indexes.sql

# Analyze query performance
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f scripts/analyze_queries.sql
```

### Load Testing (requires k6)
```bash
# Install k6 first (see tests/load/README.md)
k6 run tests/load/users.js
k6 run tests/load/notes.js
k6 run tests/load/analytics.js
k6 run tests/load/all-endpoints.js
```

## 🔒 Security

- **User-Agent required**: All requests must include a valid User-Agent with format `AppName/Version (Contact)`
- **Rate Limiting**: 50 requests/15min for anonymous users, 1000 req/hour for authenticated
- **Anti-abuse protection**: Automatic blocking of known AIs and bots without OAuth
- **Security headers**: Helmet.js configured with security best practices
- **Input validation**: All inputs validated with Joi schemas
- **Optional OAuth**: Available for advanced features (Phase 5)

See [docs/USAGE.md](docs/USAGE.md) and [docs/security/](docs/security/) for more security details.

## 📈 Monitoring & Observability

- **Prometheus Metrics**: Available at `/metrics` endpoint
- **Grafana Dashboards**: Pre-configured dashboards for:
  - Request rate and latency (P50, P95, P99)
  - Error rates by endpoint
  - Rate limiting events
  - User-Agent statistics
- **Health Checks**: `/health` endpoint with database and Redis status
- **Structured Logging**: JSON logs with Winston
- **Alerting**: Prometheus alerts configured for:
  - High error rates
  - High latency
  - Frequent rate limiting
  - Service downtime

See [docs/MONITORING.md](docs/MONITORING.md) for monitoring setup.

## ⚡ Performance

- **Response Times**: 
  - Simple endpoints (datamarts): P95 < 500ms
  - Complex analytics: P95 < 2000ms
- **Caching**: Redis-based response caching with configurable TTL
- **Database Optimization**: 
  - Indexes created via `scripts/create_indexes.sql`
  - Query analysis via `scripts/analyze_queries.sql`
- **Benchmarks**: Performance benchmarks script available (`scripts/run_benchmarks.sh`)

See [docs/PERFORMANCE.md](docs/PERFORMANCE.md) for performance optimization guide.

## 📊 Project Status

**Version**: 0.1.0 (Production Ready - Phases 1-4 Complete)

**Test Coverage**: 87.54% statements, 93.93% branches, 87.56% functions
- ✅ 224+ tests passing (100% pass rate)
- ✅ 25+ test suites passing
- ✅ Unit tests: 100% pass rate
- ✅ Integration tests: 100% pass rate
- ✅ CI/CD pipeline configured with GitHub Actions
- ✅ Load testing scripts (k6) available

**Implementation Phases**:

- ✅ **Phase 1: MVP** (Core endpoints, basic features, documentation)
  - ✅ Notes endpoints (get, search, comments)
  - ✅ User profiles endpoint
  - ✅ Country profiles endpoint
  - ✅ Global analytics endpoint
  - ✅ User-Agent validation
  - ✅ Rate limiting
  - ✅ Anti-abuse protection
  - ✅ OpenAPI/Swagger documentation
  - ✅ Comprehensive integration tests
  - ✅ Test database configuration

- ✅ **Phase 2: Basic Features** (Rankings, search, caching)
  - ✅ User and country rankings
  - ✅ Basic search functionality
  - ✅ Pagination support
  - ✅ Redis caching implementation
  - ✅ Prometheus metrics

- ✅ **Phase 3: Advanced Features** (Advanced search, monitoring)
  - ✅ Advanced search with multiple filters
  - ✅ Hashtags endpoints
  - ✅ Analytics comparisons
  - ✅ Trends analysis
  - ✅ Grafana dashboards
  - ✅ Prometheus alerts
  - ✅ Load testing scripts (k6)

- ✅ **Phase 4: Production** (Documentation, operations, compliance)
  - ✅ CI/CD pipeline configured
  - ✅ Complete documentation (installation, usage, API reference)
  - ✅ Operations runbook
  - ✅ Disaster recovery plan
  - ✅ Backup strategy
  - ✅ Capacity planning
  - ✅ SLA/SLOs defined
  - ✅ Legal documentation (Terms of Service, Privacy Policy)
  - ✅ Performance benchmarks
  - ✅ Performance optimization scripts

- ⏳ **Phase 5: Webhooks and Notifications** (Future - if needed)
  - ⏳ Webhook system
  - ⏳ Event subscriptions
  - ⏳ OAuth integration

## 🤝 Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and pull request process.

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Related Links

- [OSM-Notes-Ingestion](https://github.com/OSM-Notes/OSM-Notes-Ingestion)
- [OSM-Notes-Analytics](https://github.com/OSM-Notes/OSM-Notes-Analytics)
- [OSM-Notes-Viewer](https://github.com/OSM-Notes/OSM-Notes-Viewer)
- [OpenStreetMap](https://www.openstreetmap.org/)

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Note**: This project is part of the OSM Notes ecosystem and is designed to work together with the other projects in the ecosystem.
