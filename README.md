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

## 📚 Documentation

- [Installation](docs/INSTALLATION.md) - Complete installation guide
- [Usage](docs/USAGE.md) - API usage manual
- [API Reference](docs/api/) - OpenAPI/Swagger documentation
- [Contributing](CONTRIBUTING.md) - Contributor guide
- [Changelog](CHANGELOG.md) - Change history

## 🏗️ Project Structure

```
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
npm test               # Run tests
npm run test:unit      # Unit tests only
npm run test:coverage  # Tests with coverage
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
npm run type-check     # Verify TypeScript types
```

## 🔒 Security

- **User-Agent required**: All requests must include a valid User-Agent with format `AppName/Version (Contact)`
- **Rate Limiting**: 50 requests/15min for anonymous users
- **Anti-abuse protection**: Automatic blocking of known AIs and bots
- **Optional OAuth**: Available for advanced features (Phase 5)

See [docs/USAGE.md](docs/USAGE.md) for more security details.

## 📊 Project Status

**Version**: 0.1.0 (MVP in development)

**Implementation Phases**:
- ✅ Phase 1: MVP (in progress)
- ⏳ Phase 2: Basic Features
- ⏳ Phase 3: Advanced Features
- ⏳ Phase 4: Production
- ⏳ Phase 5: Webhooks and Notifications

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
