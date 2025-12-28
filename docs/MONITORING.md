# Monitoreo y Observabilidad - OSM Notes API

Este documento describe la configuración y uso del sistema de monitoreo basado en Prometheus y Grafana.

## Arquitectura de Monitoreo

```
┌─────────────┐
│   API       │─── Métricas ───┐
│  (Node.js)  │                 │
└─────────────┘                 │
                                 ▼
                          ┌──────────────┐
                          │  Prometheus  │
                          │  (Scraping)  │
                          └──────┬───────┘
                                 │
                                 │ Datasource
                                 ▼
                          ┌──────────────┐
                          │   Grafana    │
                          │ (Dashboards) │
                          └──────────────┘
```

## Componentes

### Prometheus

Prometheus recolecta métricas de la API mediante scraping del endpoint `/metrics`.

**Configuración**: `docker/prometheus/prometheus.yml`

**Puerto**: 9090

**Métricas recolectadas**:
- `http_request_duration_seconds` - Duración de requests HTTP (histograma)
- `http_requests_total` - Total de requests HTTP (contador)
- `http_errors_total` - Total de errores HTTP (contador)
- `rate_limit_exceeded_total` - Total de rate limits excedidos (contador)
- Métricas del sistema Node.js (CPU, memoria, etc.)

### Grafana

Grafana visualiza las métricas recolectadas por Prometheus mediante dashboards.

**Configuración**: `docker/grafana/provisioning/`

**Puerto**: 3001

**Credenciales por defecto**:
- Usuario: `admin`
- Contraseña: `admin` (configurable vía `GRAFANA_PASSWORD`)

**Dashboards incluidos**:
1. **API Overview** - Vista general de la API
   - Requests por segundo
   - Latencia (P50, P95, P99)
   - Errores por tipo
   - Métricas de respuesta

2. **Rate Limiting** - Monitoreo de rate limiting
   - Rate limits excedidos por segundo
   - Top IPs y User-Agents que exceden límites
   - Total de rate limits excedidos

3. **User-Agents** - Análisis de User-Agents
   - Requests por método
   - Top rutas por request rate
   - Distribución de status codes

## Iniciar Monitoreo

### Con Docker Compose

```bash
# Iniciar servicios de monitoreo (Prometheus + Grafana)
docker compose --profile monitoring up -d prometheus grafana

# Ver logs
docker compose --profile monitoring logs -f prometheus grafana
```

### Acceso

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
  - Usuario: `admin`
  - Contraseña: `admin` (o el valor de `GRAFANA_PASSWORD`)

## Dashboards

### API Overview

Dashboard principal con métricas generales de la API:

- **Requests per Second**: Tasa de requests por segundo
- **Request Rate by Status Code**: Distribución de requests por código de estado
- **Response Time - P50, P95, P99**: Percentiles de tiempo de respuesta
- **Error Rate**: Tasa de errores por segundo
- **Total Requests**: Total de requests en la última hora
- **Error Count**: Total de errores en la última hora
- **Average Response Time**: Tiempo promedio de respuesta
- **P95 Response Time**: Percentil 95 de tiempo de respuesta

### Rate Limiting

Dashboard específico para monitorear rate limiting:

- **Rate Limit Exceeded (per second)**: Gráfico de rate limits excedidos
- **Total Rate Limits Exceeded**: Contador total
- **Rate Limit Exceeded by IP**: Tabla de top IPs
- **Rate Limit Exceeded by User-Agent**: Tabla de top User-Agents

### User-Agents

Dashboard de análisis de User-Agents:

- **Requests by Status Code**: Gráfico de pastel
- **Top 10 Routes by Request Rate**: Gráfico de barras
- **Request Rate by Method**: Gráfico temporal

## Alertas

Las alertas están configuradas en `docker/prometheus/alerts.yml` y se evalúan automáticamente por Prometheus.

### Alertas Configuradas

1. **HighErrorRate** (Warning)
   - Condición: Error rate > 10 errors/sec por 5 minutos
   - Severidad: Warning

2. **VeryHighErrorRate** (Critical)
   - Condición: Error rate > 50 errors/sec por 2 minutos
   - Severidad: Critical

3. **HighLatencyP95** (Warning)
   - Condición: P95 latency > 2s por 5 minutos
   - Severidad: Warning

4. **VeryHighLatencyP95** (Critical)
   - Condición: P95 latency > 5s por 2 minutos
   - Severidad: Critical

5. **HighLatencyP99** (Warning)
   - Condición: P99 latency > 5s por 5 minutos
   - Severidad: Warning

6. **FrequentRateLimiting** (Warning)
   - Condición: Rate limit exceeded > 5/sec por 5 minutos
   - Severidad: Warning

7. **VeryFrequentRateLimiting** (Critical)
   - Condición: Rate limit exceeded > 20/sec por 1 minuto
   - Severidad: Critical (posible ataque)

8. **APIDown** (Critical)
   - Condición: API no responde por más de 1 minuto
   - Severidad: Critical

9. **HighRequestRate** (Warning)
   - Condición: Request rate > 1000 requests/sec por 2 minutos
   - Severidad: Warning (posible DDoS)

### Ver Alertas

Las alertas se pueden ver en:
- **Prometheus UI**: http://localhost:9090/alerts
- **Grafana**: Configurar Alertmanager para notificaciones

## Métricas Personalizadas

### Rate Limiting

La métrica `rate_limit_exceeded_total` se incrementa cada vez que se excede un rate limit. Incluye labels:
- `ip`: IP address que excedió el límite
- `user_agent`: User-Agent que excedió el límite

### HTTP Requests

Las métricas HTTP incluyen labels:
- `method`: Método HTTP (GET, POST, etc.)
- `route`: Ruta normalizada (ej: `/api/v1/users/:id`)
- `status_code`: Código de estado HTTP

## Consultas Prometheus Útiles

### Requests por segundo
```promql
rate(http_requests_total[1m])
```

### Latencia P95
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Error rate
```promql
rate(http_errors_total[5m])
```

### Rate limits excedidos por IP
```promql
sum by (ip) (rate(rate_limit_exceeded_total[5m]))
```

### Top rutas por request rate
```promql
topk(10, sum by (route) (rate(http_requests_total[5m])))
```

## Troubleshooting

### Prometheus no recolecta métricas

1. Verificar que la API esté corriendo y exponiendo `/metrics`:
   ```bash
   curl http://localhost:3000/metrics
   ```

2. Verificar configuración de Prometheus:
   ```bash
   docker compose exec prometheus promtool check config /etc/prometheus/prometheus.yml
   ```

3. Verificar logs de Prometheus:
   ```bash
   docker compose logs prometheus
   ```

### Grafana no muestra datos

1. Verificar que Prometheus esté corriendo y accesible desde Grafana
2. Verificar configuración del datasource en Grafana
3. Verificar que las métricas existan en Prometheus:
   ```bash
   curl http://localhost:9090/api/v1/query?query=http_requests_total
   ```

### Alertas no se disparan

1. Verificar que el archivo de alertas esté cargado:
   ```bash
   curl http://localhost:9090/api/v1/alerts
   ```

2. Verificar sintaxis del archivo de alertas:
   ```bash
   docker compose exec prometheus promtool check rules /etc/prometheus/alerts.yml
   ```

## Próximos Pasos

- [ ] Configurar Alertmanager para notificaciones (email, Slack, etc.)
- [ ] Agregar métricas de base de datos (PostgreSQL exporter)
- [ ] Agregar métricas de Redis
- [ ] Crear dashboards adicionales según necesidades
- [ ] Configurar alertas en Grafana para notificaciones visuales
