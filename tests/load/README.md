# Tests de Carga con k6

Este directorio contiene scripts de tests de carga usando [k6](https://k6.io/).

## Requisitos

Instalar k6:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6

# Docker
docker pull grafana/k6
```

## Scripts Disponibles

### 1. users.js
Tests de carga para endpoints de usuarios.

```bash
# Test básico (10 VUS, 30s)
k6 run tests/load/users.js

# Test con más carga
k6 run --vus 50 --duration 5m tests/load/users.js

# Test con URL personalizada
BASE_URL=http://api.example.com k6 run tests/load/users.js
```

**Endpoints probados**:
- `GET /api/v1/users/:id` - Perfil de usuario
- `GET /api/v1/search/users` - Búsqueda de usuarios
- `GET /api/v1/users/rankings` - Rankings de usuarios

### 2. notes.js
Tests de carga para endpoints de notas.

```bash
k6 run tests/load/notes.js
k6 run --vus 30 --duration 3m tests/load/notes.js
```

**Endpoints probados**:
- `GET /api/v1/notes/:id` - Detalle de nota
- `GET /api/v1/notes/:id/comments` - Comentarios de nota
- `GET /api/v1/notes` - Búsqueda de notas

### 3. analytics.js
Tests de carga para endpoints de analytics (queries más pesadas).

```bash
k6 run tests/load/analytics.js
k6 run --vus 10 --duration 5m tests/load/analytics.js
```

**Endpoints probados**:
- `GET /api/v1/analytics/global` - Analytics globales
- `GET /api/v1/analytics/trends` - Tendencias
- `GET /api/v1/analytics/comparison` - Comparaciones

**Nota**: Este test usa menos VUS porque las queries de analytics son más pesadas.

### 4. all-endpoints.js
Test comprehensivo que simula uso realista de todos los endpoints.

```bash
k6 run tests/load/all-endpoints.js
k6 run --vus 40 --duration 10m tests/load/all-endpoints.js
```

**Distribución de requests**:
- 30% - Endpoints de usuarios
- 20% - Endpoints de países
- 20% - Endpoints de notas
- 15% - Endpoints de búsqueda
- 15% - Endpoints de analytics

## Configuración

### Variables de Entorno

- `BASE_URL`: URL base de la API (default: `http://localhost:3000`)

### Opciones de k6

- `--vus`: Número de usuarios virtuales (default: según script)
- `--duration`: Duración del test (default: según script)
- `--iterations`: Número total de iteraciones
- `--max-redirects`: Máximo de redirects permitidos
- `--no-summary`: No mostrar resumen al final
- `--summary-export`: Exportar resumen a archivo JSON

## Resultados

Los resultados se guardan en `tests/load/results/`:

- `users-summary.json` - Resumen del test de usuarios
- `notes-summary.json` - Resumen del test de notas
- `analytics-summary.json` - Resumen del test de analytics
- `all-endpoints-summary.json` - Resumen del test comprehensivo

## Thresholds (Umbrales)

Cada script define thresholds que deben cumplirse:

### users.js y notes.js
- P95 latency < 500ms
- P99 latency < 1000ms
- Error rate < 1%

### analytics.js
- P95 latency < 1000ms (más permisivo por queries pesadas)
- P99 latency < 2000ms
- Error rate < 1%

### all-endpoints.js
- P95 latency < 500ms
- P99 latency < 1000ms
- Error rate < 2% (más permisivo por variedad de endpoints)

## Ejemplos de Uso

### Test Rápido
```bash
# Test rápido de usuarios (30 segundos)
k6 run --vus 10 --duration 30s tests/load/users.js
```

### Test de Stress
```bash
# Test de stress (100 VUS por 10 minutos)
k6 run --vus 100 --duration 10m tests/load/all-endpoints.js
```

### Test de Spike
```bash
# Test de spike (rápido aumento de carga)
k6 run --vus 1 --duration 1m --stage 0s:1,30s:100,1m:1 tests/load/users.js
```

### Test con Resultados Detallados
```bash
# Exportar resultados detallados
k6 run --summary-export=results/detailed.json tests/load/users.js
```

## Interpretación de Resultados

### Métricas Clave

- **http_reqs**: Total de requests HTTP
- **http_req_duration**: Duración de requests
  - `avg`: Promedio
  - `min`: Mínimo
  - `max`: Máximo
  - `p(50)`, `p(95)`, `p(99)`: Percentiles
- **http_req_failed**: Tasa de requests fallidos
- **errors**: Tasa de errores personalizados

### Ejemplo de Salida

```
✓ user profile status is 200
✓ user profile has user_id
✓ user search status is 200
✓ user search returns data
✓ user rankings status is 200
✓ user rankings returns data

checks.........................: 100.00% ✓ 1500  ✗ 0
data_received..................: 2.5 MB  42 kB/s
data_sent......................: 150 kB  2.5 kB/s
http_req_duration..............: avg=45.2ms min=12ms med=42ms max=234ms p(95)=89ms p(99)=156ms
http_req_failed................: 0.00%  ✓ 0    ✗ 500
http_reqs......................: 500    8.33/s
iteration_duration.............: avg=3.1s min=2.1s med=3.0s max=4.5s p(95)=3.8s p(99)=4.2s
iterations.....................: 500    8.33/s
vus............................: 10     min=10  max=10
```

## Troubleshooting

### Error: "Cannot connect to API"

1. Verificar que la API esté corriendo:
   ```bash
   curl http://localhost:3000/health
   ```

2. Verificar que el User-Agent sea válido (k6 usa uno por defecto)

3. Verificar rate limiting (puede estar bloqueando requests)

### Error: "Rate limit exceeded"

Los tests pueden exceder rate limits si hay muchos VUS. Soluciones:

1. Reducir número de VUS
2. Aumentar duración del test (menos requests por segundo)
3. Usar diferentes User-Agents (requiere modificar scripts)

### Tests muy lentos

1. Verificar latencia de red si la API está en servidor remoto
2. Verificar carga del servidor
3. Revisar queries de base de datos (pueden ser lentas)

## Integración con CI/CD

Ejemplo para GitHub Actions:

```yaml
- name: Run load tests
  run: |
    k6 run --summary-export=results/load-test.json tests/load/users.js
    k6 run --summary-export=results/load-test-notes.json tests/load/notes.js
```

## Próximos Pasos

- [ ] Agregar tests de carga para endpoints específicos según necesidades
- [ ] Configurar tests de carga en CI/CD
- [ ] Crear dashboards de Grafana para visualizar resultados de tests
- [ ] Integrar con herramientas de análisis de performance
