---
title: "Monitoring and Observability - OSM Notes API"
description: "Configuration and usage guide for monitoring system based on Prometheus and Grafana for OSM Notes API"
version: "1.0.0"
last_updated: "2026-01-25"
author: "AngocA"
tags:
  - "monitoring"
audience:
  - "system-admins"
  - "developers"
project: "OSM-Notes-API"
status: "active"
---


# Monitoring and Observability - OSM Notes API

This document describes the configuration and usage of the monitoring system based on Prometheus and Grafana.

## Monitoring Architecture

```
┌─────────────┐
│   API       │─── Metrics ───┐
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

## Components

### Prometheus

Prometheus collects metrics from the API by scraping the `/metrics` endpoint.

**Configuration**: `docker/prometheus/prometheus.yml`

**Port**: 9090

**Collected Metrics**:
- `http_request_duration_seconds` - HTTP request duration (histogram)
- `http_requests_total` - Total HTTP requests (counter)
- `http_errors_total` - Total HTTP errors (counter)
- `rate_limit_exceeded_total` - Total rate limits exceeded (counter)
- Node.js system metrics (CPU, memory, etc.)

### Grafana

Grafana visualizes metrics collected by Prometheus through dashboards.

**Configuration**: `docker/grafana/provisioning/`

**Port**: 3001

**Default Credentials**:
- Username: `admin`
- Password: `admin` (configurable via `GRAFANA_PASSWORD`)

**Included Dashboards**:
1. **API Overview** - API overview
   - Requests per second
   - Latency (P50, P95, P99)
   - Errors by type
   - Response metrics

2. **Rate Limiting** - Rate limiting monitoring
   - Rate limits exceeded per second
   - Top IPs and User-Agents exceeding limits
   - Total rate limits exceeded

3. **User-Agents** - User-Agent analysis
   - Requests by method
   - Top routes by request rate
   - Status code distribution

## Starting Monitoring

### With Docker Compose

```bash
# Start monitoring services (Prometheus + Grafana)
docker compose --profile monitoring up -d prometheus grafana

# View logs
docker compose --profile monitoring logs -f prometheus grafana
```

### Access

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
  - Username: `admin`
  - Password: `admin` (or the value of `GRAFANA_PASSWORD`)

## Dashboards

### API Overview

Main dashboard with general API metrics:

- **Requests per Second**: Requests per second rate
- **Request Rate by Status Code**: Request distribution by status code
- **Response Time - P50, P95, P99**: Response time percentiles
- **Error Rate**: Errors per second rate
- **Total Requests**: Total requests in the last hour
- **Error Count**: Total errors in the last hour
- **Average Response Time**: Average response time
- **P95 Response Time**: 95th percentile response time

### Rate Limiting

Specific dashboard for monitoring rate limiting:

- **Rate Limit Exceeded (per second)**: Rate limits exceeded chart
- **Total Rate Limits Exceeded**: Total counter
- **Rate Limit Exceeded by IP**: Top IPs table
- **Rate Limit Exceeded by User-Agent**: Top User-Agents table

### User-Agents

User-Agent analysis dashboard:

- **Requests by Status Code**: Pie chart
- **Top 10 Routes by Request Rate**: Bar chart
- **Request Rate by Method**: Time series chart

## Alerts

Alerts are configured in `docker/prometheus/alerts.yml` and automatically evaluated by Prometheus.

### Configured Alerts

1. **HighErrorRate** (Warning)
   - Condition: Error rate > 10 errors/sec for 5 minutes
   - Severity: Warning

2. **VeryHighErrorRate** (Critical)
   - Condition: Error rate > 50 errors/sec for 2 minutes
   - Severity: Critical

3. **HighLatencyP95** (Warning)
   - Condition: P95 latency > 2s for 5 minutes
   - Severity: Warning

4. **VeryHighLatencyP95** (Critical)
   - Condition: P95 latency > 5s for 2 minutes
   - Severity: Critical

5. **HighLatencyP99** (Warning)
   - Condition: P99 latency > 5s for 5 minutes
   - Severity: Warning

6. **FrequentRateLimiting** (Warning)
   - Condition: Rate limit exceeded > 5/sec for 5 minutes
   - Severity: Warning

7. **VeryFrequentRateLimiting** (Critical)
   - Condition: Rate limit exceeded > 20/sec for 1 minute
   - Severity: Critical (possible attack)

8. **APIDown** (Critical)
   - Condition: API does not respond for more than 1 minute
   - Severity: Critical

9. **HighRequestRate** (Warning)
   - Condition: Request rate > 1000 requests/sec for 2 minutes
   - Severity: Warning (possible DDoS)

### Viewing Alerts

Alerts can be viewed at:
- **Prometheus UI**: http://localhost:9090/alerts
- **Grafana**: Configure Alertmanager for notifications

## Custom Metrics

### Rate Limiting

The `rate_limit_exceeded_total` metric increments each time a rate limit is exceeded. Includes labels:
- `ip`: IP address that exceeded the limit
- `user_agent`: User-Agent that exceeded the limit

### HTTP Requests

HTTP metrics include labels:
- `method`: HTTP method (GET, POST, etc.)
- `route`: Normalized route (e.g., `/api/v1/users/:id`)
- `status_code`: HTTP status code

## Useful Prometheus Queries

### Requests per second
```promql
rate(http_requests_total[1m])
```

### P95 Latency
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Error rate
```promql
rate(http_errors_total[5m])
```

### Rate limits exceeded by IP
```promql
sum by (ip) (rate(rate_limit_exceeded_total[5m]))
```

### Top routes by request rate
```promql
topk(10, sum by (route) (rate(http_requests_total[5m])))
```

## Troubleshooting

### Prometheus not collecting metrics

1. Verify that the API is running and exposing `/metrics`:
   ```bash
   curl http://localhost:3000/metrics
   ```

2. Verify Prometheus configuration:
   ```bash
   docker compose exec prometheus promtool check config /etc/prometheus/prometheus.yml
   ```

3. Verify Prometheus logs:
   ```bash
   docker compose logs prometheus
   ```

### Grafana not showing data

1. Verify that Prometheus is running and accessible from Grafana
2. Verify datasource configuration in Grafana
3. Verify that metrics exist in Prometheus:
   ```bash
   curl http://localhost:9090/api/v1/query?query=http_requests_total
   ```

### Alerts not firing

1. Verify that the alerts file is loaded:
   ```bash
   curl http://localhost:9090/api/v1/alerts
   ```

2. Verify alerts file syntax:
   ```bash
   docker compose exec prometheus promtool check rules /etc/prometheus/alerts.yml
   ```

## Next Steps

- [ ] Configure Alertmanager for notifications (email, Slack, etc.)
- [ ] Add database metrics (PostgreSQL exporter)
- [ ] Add Redis metrics
- [ ] Create additional dashboards as needed
- [ ] Configure Grafana alerts for visual notifications
