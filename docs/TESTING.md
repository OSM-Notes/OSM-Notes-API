# Testing Guide

Esta guía explica cómo probar los endpoints de la API OSM Notes.

## Métodos de Prueba

### 1. Tests Automatizados (Recomendado)

Los tests automatizados ya están implementados y cubren:
- Tests unitarios de servicios
- Tests de integración de endpoints
- Validación de middleware

#### Ejecutar todos los tests:
```bash
npm test
```

#### Ejecutar solo tests unitarios:
```bash
npm run test:unit
```

#### Ejecutar solo tests de integración:
```bash
npm run test:integration
```

#### Ejecutar tests con cobertura:
```bash
npm run test:coverage
```

#### Ejecutar tests en modo watch (desarrollo):
```bash
npm run test:watch
```

**Nota**: Los tests de integración requieren una base de datos PostgreSQL en ejecución. Configura las variables de entorno antes de ejecutar:

```bash
export DB_HOST=localhost
export DB_NAME=osm_notes_dwh
export DB_USER=tu_usuario
export DB_PASSWORD=tu_password
export DB_PORT=5432
export DB_SSL=false
```

### 2. Pruebas Manuales con curl

#### Configuración Inicial

Primero, asegúrate de tener el servidor corriendo:

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm run build
npm start
```

El servidor estará disponible en `http://localhost:3000` (o el puerto configurado en `PORT`).

#### Ejemplos de Pruebas con curl

**1. Health Check:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/health
```

**2. Obtener una nota por ID:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/notes/12345
```

**3. Obtener comentarios de una nota:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/notes/12345/comments
```

**4. Buscar notas con filtros:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     "http://localhost:3000/api/v1/notes?status=open&country=42&limit=10"
```

**5. Obtener perfil de usuario:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/users/12345
```

**6. Obtener perfil de país:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/countries/42
```

**7. Obtener analytics global:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/analytics/global
```

#### Pruebas de Validación

**Probar sin User-Agent (debe fallar):**
```bash
curl http://localhost:3000/api/v1/notes/12345
# Esperado: 400 Bad Request
```

**Probar con User-Agent inválido:**
```bash
curl -H "User-Agent: InvalidFormat" \
     http://localhost:3000/api/v1/notes/12345
# Esperado: 400 Bad Request
```

**Probar con ID inválido:**
```bash
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/notes/invalid
# Esperado: 400 Bad Request
```

**Probar rate limiting (hacer muchas requests rápidas):**
```bash
for i in {1..60}; do
  curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
       http://localhost:3000/api/v1/notes/12345
  echo ""
done
# Después de 50 requests, debería retornar 429 Too Many Requests
```

### 3. Pruebas con httpie (Alternativa a curl)

Si tienes `httpie` instalado, es más fácil de usar:

```bash
# Instalar httpie
pip install httpie

# Ejemplos de uso
http GET localhost:3000/health User-Agent:"TestApp/1.0 (test@example.com)"

http GET localhost:3000/api/v1/notes/12345 User-Agent:"TestApp/1.0 (test@example.com)"

http GET localhost:3000/api/v1/notes \
  User-Agent:"TestApp/1.0 (test@example.com)" \
  status==open \
  country==42 \
  limit==10
```

### 4. Pruebas con Postman

1. **Importar colección** (puedes crear una desde los ejemplos):
   - Crea una nueva colección en Postman
   - Agrega las siguientes requests:

2. **Configurar Variables de Entorno**:
   - `base_url`: `http://localhost:3000`
   - `user_agent`: `TestApp/1.0 (test@example.com)`

3. **Headers Globales**:
   - `User-Agent`: `{{user_agent}}`

4. **Ejemplos de Requests**:

   - **GET Health Check**
     - URL: `{{base_url}}/health`
     - Method: GET

   - **GET Note by ID**
     - URL: `{{base_url}}/api/v1/notes/12345`
     - Method: GET

   - **GET Note Comments**
     - URL: `{{base_url}}/api/v1/notes/12345/comments`
     - Method: GET

   - **GET Search Notes**
     - URL: `{{base_url}}/api/v1/notes`
     - Method: GET
     - Params:
       - `status`: `open`
       - `country`: `42`
       - `limit`: `10`

   - **GET User Profile**
     - URL: `{{base_url}}/api/v1/users/12345`
     - Method: GET

   - **GET Country Profile**
     - URL: `{{base_url}}/api/v1/countries/42`
     - Method: GET

   - **GET Global Analytics**
     - URL: `{{base_url}}/api/v1/analytics/global`
     - Method: GET

### 5. Pruebas con Scripts de Node.js

Puedes crear scripts de prueba personalizados:

```javascript
// test-endpoints.js
const http = require('http');

const BASE_URL = 'http://localhost:3000';
const USER_AGENT = 'TestApp/1.0 (test@example.com)';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data: JSON.parse(data) });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testEndpoints() {
  try {
    console.log('Testing endpoints...\n');

    // Test health check
    const health = await makeRequest('/health');
    console.log('Health Check:', health.status, health.data);

    // Test notes
    const notes = await makeRequest('/api/v1/notes/12345');
    console.log('Note:', notes.status);

    // Test users
    const users = await makeRequest('/api/v1/users/12345');
    console.log('User:', users.status);

    // Test countries
    const countries = await makeRequest('/api/v1/countries/42');
    console.log('Country:', countries.status);

    // Test analytics
    const analytics = await makeRequest('/api/v1/analytics/global');
    console.log('Analytics:', analytics.status);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testEndpoints();
```

Ejecutar:
```bash
node test-endpoints.js
```

### 6. Pruebas con Docker Compose

Si tienes Docker Compose configurado:

```bash
# Levantar servicios
cd docker
docker compose -f docker compose.dev.yml up -d

# Esperar a que los servicios estén listos
sleep 10

# Probar endpoints
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/health

# Detener servicios
docker compose -f docker compose.dev.yml down
```

### 7. Verificar Respuestas JSON

Para formatear las respuestas JSON en la terminal:

```bash
# Con curl y jq
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/notes/12345 | jq

# Con curl y python
curl -H "User-Agent: TestApp/1.0 (test@example.com)" \
     http://localhost:3000/api/v1/notes/12345 | python -m json.tool
```

## Checklist de Pruebas

### Funcionalidad Básica
- [ ] Health check retorna 200
- [ ] Endpoints retornan JSON válido
- [ ] Respuestas tienen estructura correcta

### Validación
- [ ] Requests sin User-Agent son rechazados (400)
- [ ] User-Agent inválido es rechazado (400)
- [ ] IDs inválidos son rechazados (400)
- [ ] Parámetros inválidos son rechazados (400)

### Rate Limiting
- [ ] Rate limiting funciona correctamente
- [ ] Headers de rate limit están presentes
- [ ] 429 retornado cuando se excede el límite

### Errores
- [ ] 404 retornado para recursos no encontrados
- [ ] 500 manejado correctamente
- [ ] Mensajes de error son claros y útiles

### Endpoints Específicos
- [ ] GET /api/v1/notes/:note_id
- [ ] GET /api/v1/notes/:note_id/comments
- [ ] GET /api/v1/notes (búsqueda)
- [ ] GET /api/v1/users/:user_id
- [ ] GET /api/v1/countries/:country_id
- [ ] GET /api/v1/analytics/global

## Troubleshooting

### Error: "Cannot connect to database"
- Verifica que PostgreSQL esté corriendo
- Verifica las variables de entorno de base de datos
- Verifica que la base de datos exista

### Error: "User-Agent required"
- Asegúrate de incluir el header User-Agent en todas las requests
- Formato: `AppName/Version (Contact)`

### Error: "Rate limit exceeded"
- Espera 15 minutos o reinicia Redis
- Usa un User-Agent diferente
- Usa una IP diferente

### Error: "404 Not Found"
- Verifica que el ID exista en la base de datos
- Verifica que la tabla correspondiente tenga datos

## Recursos Adicionales

- [Documentación de la API](USAGE.md)
- [Guía de Instalación](INSTALLATION.md)
- [Arquitectura](ARCHITECTURE.md)



