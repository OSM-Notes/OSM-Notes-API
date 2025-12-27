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
git clone https://github.com/osmlatam/OSM-Notes-API.git
cd OSM-Notes-API

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your configurations

# Build TypeScript
npm run build

# Start application
npm start
```

### With Docker

```bash
# Start services
docker-compose -f docker/docker-compose.yml up -d

# View logs
docker-compose -f docker/docker-compose.yml logs -f api
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

- [Installation](docs/INSTALLATION.md) - Complete installation guide
- [Usage](docs/USAGE.md) - API usage manual with examples
- [API Reference](docs/API.md) - Complete API reference documentation
- [API Reference (OpenAPI)](docs/api/) - OpenAPI/Swagger documentation
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions
- [Operations Runbook](docs/RUNBOOK.md) - Operational procedures and runbook
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [CI/CD Guide](docs/CI_CD.md) - Continuous Integration and Deployment
- [Testing Guide](docs/TESTING.md) - Testing documentation
- [Contributing](CONTRIBUTING.md) - Contributor guide
- [Changelog](CHANGELOG.md) - Change history

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

```bash
npm run build          # Build TypeScript
npm start              # Run compiled application
npm run dev            # Development with hot reload
npm test               # Run all tests
npm run test:unit      # Unit tests only
npm run test:integration  # Integration tests only
npm run test:coverage  # Tests with coverage report
npm run test:watch     # Run tests in watch mode
npm run test:light     # Run unit tests with 1 worker (for performance)
npm run test:integration:single  # Run integration tests sequentially
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint errors automatically
npm run format         # Format code with Prettier
npm run format:check   # Check code formatting
npm run type-check     # Verify TypeScript types
```

## 🔒 Security

- **User-Agent required**: All requests must include a valid User-Agent with format `AppName/Version (Contact)`
- **Rate Limiting**: 50 requests/15min for anonymous users
- **Anti-abuse protection**: Automatic blocking of known AIs and bots
- **Optional OAuth**: Available for advanced features (Phase 5)

See [docs/USAGE.md](docs/USAGE.md) for more security details.

## 📊 Project Status

**Version**: 0.1.0 (MVP - Phase 1)

**Test Coverage**: 86% statements, 85.87% lines
- ✅ 224 tests passing (100% pass rate)
- ✅ 25 test suites passing
- ✅ Unit tests: 100% pass rate
- ✅ Integration tests: 100% pass rate
- ✅ CI/CD pipeline configured with GitHub Actions

**Implementation Phases**:

- ✅ Phase 1: MVP (Core endpoints, basic features, documentation)
  - ✅ Notes endpoints (get, search, comments)
  - ✅ User profiles endpoint
  - ✅ Country profiles endpoint
  - ✅ Global analytics endpoint
  - ✅ User-Agent validation
  - ✅ Rate limiting
  - ✅ Anti-abuse protection
  - ✅ OpenAPI/Swagger documentation
  - ✅ Comprehensive integration tests (198 tests)
  - ✅ Test database configuration
- ⏳ Phase 2: Basic Features (Rankings, comparisons, trends)
- ⏳ Phase 3: Advanced Features (Advanced search, caching, performance)
- ⏳ Phase 4: Production (monitoring, scaling)
  - ✅ CI/CD pipeline configured
- ⏳ Phase 5: Webhooks and Notifications (if needed)

## 🤝 Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and pull request process.

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Related Links

- [OSM-Notes-Ingestion](https://github.com/osmlatam/OSM-Notes-Ingestion)
- [OSM-Notes-Analytics](https://github.com/osmlatam/OSM-Notes-Analytics)
- [OSM-Notes-Viewer](https://github.com/osmlatam/OSM-Notes-Viewer)
- [OpenStreetMap](https://www.openstreetmap.org/)

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Note**: This project is part of the OSM Notes ecosystem and is designed to work together with the other projects in the ecosystem.
