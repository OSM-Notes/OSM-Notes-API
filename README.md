# OSM Notes API

REST API for OSM Notes Analytics and Ingestion. Unified programmatic access to user profiles, country analytics, advanced search capabilities, rankings, comparisons, and real-time metrics. Extends OSM API 0.6 with specialized analytics features.

## 📋 Descripción

OSM Notes API proporciona acceso programático a los datos de análisis de notas de OpenStreetMap, incluyendo:

- **Perfiles de usuarios**: Estadísticas detalladas de contribuidores
- **Análisis por países**: Métricas agregadas por país
- **Búsqueda avanzada**: Filtros complejos y consultas dinámicas
- **Rankings**: Clasificaciones de usuarios y países
- **Comparaciones**: Análisis comparativo entre entidades
- **Tendencias**: Análisis temporal de datos
- **Notas y comentarios**: Acceso a notas OSM y sus comentarios

## ⚠️ Nota Importante

**Esta API es COMPLEMENTARIA al sistema JSON estático, NO un reemplazo.**

- ✅ **Sistema JSON se mantiene**: El Viewer y otros consumidores siguen usando JSON estáticos
- ✅ **API es adicional**: Para casos de uso que requieren consultas dinámicas o integraciones
- ✅ **Ambos coexisten**: Cada sistema se usa según el caso de uso específico

## 🚀 Inicio Rápido

### Requisitos Previos

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL 15+ (con acceso a `osm_notes_dwh`)
- Redis 7+ (opcional pero recomendado)

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/osmlatam/OSM-Notes-API.git
cd OSM-Notes-API

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Compilar TypeScript
npm run build

# Iniciar aplicación
npm start
```

### Con Docker

```bash
# Levantar servicios
docker-compose -f docker/docker-compose.yml up -d

# Ver logs
docker-compose -f docker/docker-compose.yml logs -f api
```

Ver [docs/INSTALLATION.md](docs/INSTALLATION.md) para instrucciones detalladas.

## 📚 Documentación

- [Instalación](docs/INSTALLATION.md) - Guía completa de instalación
- [Uso](docs/USAGE.md) - Manual de uso de la API
- [API Reference](docs/api/) - Documentación OpenAPI/Swagger
- [Contribuir](CONTRIBUTING.md) - Guía para contribuidores
- [Changelog](CHANGELOG.md) - Historial de cambios

## 🏗️ Estructura del Proyecto

```
OSM-Notes-API/
├── src/                    # Código fuente
│   ├── config/            # Configuración
│   ├── routes/            # Rutas de API
│   ├── controllers/       # Controladores
│   ├── services/          # Lógica de negocio
│   ├── middleware/        # Middleware personalizado
│   ├── utils/             # Utilidades
│   └── types/             # Tipos TypeScript
├── tests/                  # Tests
│   ├── unit/              # Tests unitarios
│   ├── integration/       # Tests de integración
│   └── load/              # Tests de carga
├── docs/                   # Documentación
│   ├── INSTALLATION.md    # Manual de instalación
│   ├── USAGE.md           # Manual de uso
│   └── api/               # Documentación OpenAPI
├── docker/                 # Configuración Docker
└── package.json           # Dependencias y scripts
```

## 🛠️ Scripts Disponibles

```bash
npm run build          # Compilar TypeScript
npm start              # Ejecutar aplicación compilada
npm run dev            # Desarrollo con hot reload
npm test               # Ejecutar tests
npm run test:unit      # Solo tests unitarios
npm run test:coverage  # Tests con cobertura
npm run lint           # Ejecutar ESLint
npm run format         # Formatear código con Prettier
npm run type-check     # Verificar tipos TypeScript
```

## 🔒 Seguridad

- **User-Agent requerido**: Todos los requests deben incluir un User-Agent válido con formato `AppName/Version (Contact)`
- **Rate Limiting**: 50 requests/15min para usuarios anónimos
- **Protección anti-abuso**: Bloqueo automático de AIs y bots conocidos
- **OAuth opcional**: Disponible para funcionalidades avanzadas (Fase 5)

Ver [docs/USAGE.md](docs/USAGE.md) para más detalles sobre seguridad.

## 📊 Estado del Proyecto

**Versión**: 0.1.0 (MVP en desarrollo)

**Fases de Implementación**:
- ✅ Fase 1: MVP (en progreso)
- ⏳ Fase 2: Funcionalidades Básicas
- ⏳ Fase 3: Funcionalidades Avanzadas
- ⏳ Fase 4: Producción
- ⏳ Fase 5: Webhooks y Notificaciones

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor lee [CONTRIBUTING.md](CONTRIBUTING.md) para detalles sobre nuestro código de conducta y proceso de pull requests.

## 📝 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver [LICENSE](LICENSE) para más detalles.

## 🔗 Enlaces Relacionados

- [OSM-Notes-Ingestion](https://github.com/osmlatam/OSM-Notes-Ingestion)
- [OSM-Notes-Analytics](https://github.com/osmlatam/OSM-Notes-Analytics)
- [OSM-Notes-Viewer](https://github.com/osmlatam/OSM-Notes-Viewer)
- [OpenStreetMap](https://www.openstreetmap.org/)

## 📧 Contacto

Para preguntas o soporte, por favor abre un issue en GitHub.

---

**Nota**: Este proyecto es parte del ecosistema OSM Notes y está diseñado para trabajar junto con los otros proyectos del ecosistema.
