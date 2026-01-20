# Service Level Agreement (SLA) and Service Level Objectives (SLOs)

This document defines the Service Level Agreements (SLAs) and Service Level Objectives (SLOs) for the OSM Notes API.

## Overview

**Service Name**: OSM Notes API  
**Service Type**: REST API  
**Current Version**: v1.0  
**Last Updated**: 2025-12-28

---

## Service Level Objectives (SLOs)

### Availability SLO

**Target**: 99.5% uptime (monthly)

**Measurement**:
- Uptime calculated as: `(Total Time - Downtime) / Total Time * 100`
- Downtime: Periods when the API is unavailable or returning errors > 1% of requests
- Excludes scheduled maintenance windows
- Measured over rolling 30-day period

**Current Status**: 
- Monitoring via Prometheus and Grafana
- Health checks every 30 seconds
- Alerting configured for downtime events

### Latency SLO

**Targets**:
- **P50 (Median)**: < 200ms for datamart queries
- **P95**: < 500ms for datamart queries
- **P99**: < 1000ms for datamart queries
- **P95**: < 2000ms for complex analytics queries

**Measurement**:
- Response time measured from request received to response sent
- Excludes network latency
- Measured over rolling 7-day period
- Per-endpoint tracking available in Grafana

**Current Status**:
- Metrics collected via Prometheus (`http_request_duration_seconds`)
- Dashboards available in Grafana
- Alerting configured for latency violations

### Error Rate SLO

**Target**: < 0.5% error rate (5xx errors)

**Measurement**:
- Error rate = `(5xx errors / total requests) * 100`
- Excludes 4xx errors (client errors)
- Measured over rolling 7-day period

**Current Status**:
- Metrics collected via Prometheus (`http_errors_total`)
- Dashboards available in Grafana
- Alerting configured for high error rates

### Throughput SLO

**Target**: Support 100 requests/second sustained load

**Measurement**:
- Requests per second measured over 1-minute windows
- Sustained load: 5+ minutes at target rate
- Measured via Prometheus (`rate(http_requests_total[1m])`)

**Current Status**:
- Rate limiting configured: 50 req/15min per IP+User-Agent
- Load testing scripts available (k6)
- Monitoring via Grafana dashboards

---

## Service Level Agreements (SLAs)

### Availability SLA

**Commitment**: 99.5% monthly uptime

**Remediation**:
- If uptime falls below 99.5% in a calendar month:
  - Incident post-mortem within 7 days
  - Root cause analysis and mitigation plan
  - Public status update on service status

**Exclusions**:
- Scheduled maintenance windows (announced 48 hours in advance)
- Force majeure events
- DDoS attacks or security incidents
- Upstream service dependencies (database, Redis)

### Response Time SLA

**Commitment**: 
- 95% of requests complete within P95 latency targets
- Measured over rolling 7-day period

**Remediation**:
- If latency exceeds targets:
  - Performance analysis within 24 hours
  - Optimization plan within 7 days
  - Status update to users

### Support SLA

**Response Times**:
- **Critical Issues** (Service Down): 1 hour response time
- **High Priority** (Degraded Performance): 4 hour response time
- **Medium Priority** (Feature Requests): 2 business days
- **Low Priority** (Documentation, Questions): 5 business days

**Support Channels**:
- GitHub Issues: https://github.com/OSM-Notes/OSM-Notes-API/issues
- Email: (if configured)

---

## Monitoring and Alerting

### Metrics Tracked

1. **Availability**:
   - Uptime percentage
   - Health check status
   - Service downtime incidents

2. **Performance**:
   - Response time (P50, P95, P99)
   - Request rate (requests/second)
   - Database query performance
   - Cache hit/miss rates

3. **Reliability**:
   - Error rate (4xx, 5xx)
   - Rate limit violations
   - Database connection errors
   - Redis connection errors

### Alerting Rules

**Critical Alerts** (Immediate Response):
- Service down (> 1 minute)
- Error rate > 5% (5 minutes)
- P95 latency > 5s (5 minutes)

**Warning Alerts** (Investigation Required):
- Error rate > 1% (5 minutes)
- P95 latency > 2s (5 minutes)
- Rate limiting frequent (> 5/sec for 5 minutes)

**Info Alerts** (Monitoring):
- High request rate (> 1000 req/sec)
- Database connection pool exhaustion
- Cache hit rate < 80%

**Alert Channels**:
- Prometheus alerts configured
- Grafana dashboards available
- (Email/Slack integration can be configured)

---

## Maintenance Windows

### Scheduled Maintenance

**Policy**: 
- Maintenance windows announced 48 hours in advance
- Typically scheduled during low-traffic periods
- Maximum duration: 2 hours per window

**Notification**:
- GitHub Issues
- Status page (if configured)
- Email to registered users (if applicable)

### Emergency Maintenance

**Policy**:
- Performed only for critical security issues or service stability
- Post-notification within 1 hour of completion
- Post-mortem within 7 days

---

## Service Dependencies

### Critical Dependencies

1. **PostgreSQL Database** (`osm_notes_dwh`)
   - Required for all data queries
   - Impact: Complete service outage if unavailable
   - Monitoring: Health check includes DB status

2. **Redis** (Optional but Recommended)
   - Used for caching and rate limiting
   - Impact: Degraded performance if unavailable
   - Fallback: In-memory rate limiting, no cache

### Non-Critical Dependencies

1. **Prometheus** (Monitoring)
   - Impact: Loss of metrics, no impact on API functionality

2. **Grafana** (Dashboards)
   - Impact: Loss of visualization, no impact on API functionality

---

## Performance Benchmarks

### Current Performance (Baseline)

**Datamart Queries** (from `dwh.datamartUsers`, `dwh.datamartCountries`):
- P50: ~50-100ms
- P95: ~150-300ms
- P99: ~500-800ms

**Complex Analytics Queries** (trends, comparisons):
- P50: ~200-500ms
- P95: ~1000-2000ms
- P99: ~2000-5000ms

**Simple Queries** (health check, single note):
- P50: ~10-50ms
- P95: ~50-100ms
- P99: ~100-200ms

**Note**: Performance varies based on:
- Database load
- Cache hit rate
- Query complexity
- Data volume

---

## Improvement Roadmap

### Short-term (Next 3 months)
- [ ] Optimize slow queries identified in performance analysis
- [ ] Increase cache hit rate to > 90%
- [ ] Implement query result caching for frequently accessed endpoints
- [ ] Add database connection pooling optimization

### Medium-term (3-6 months)
- [ ] Implement read replicas for database (if needed)
- [ ] Add CDN for static responses (if applicable)
- [ ] Optimize analytics queries with materialized views
- [ ] Implement request queuing for high-load scenarios

### Long-term (6+ months)
- [ ] Horizontal scaling (multiple API instances)
- [ ] Database sharding (if data volume requires)
- [ ] Advanced caching strategies
- [ ] Performance optimization based on usage patterns

---

## Compliance and Reporting

### Monthly Reports

**Metrics Reported**:
- Uptime percentage
- Average response times (P50, P95, P99)
- Error rate
- Total requests processed
- Top endpoints by usage
- Incidents and resolutions

**Reporting Period**: Calendar month  
**Publication**: GitHub repository (if public) or internal dashboard

### Incident Reporting

**Incident Types**:
- Service outages
- Performance degradation
- Security incidents
- Data issues

**Incident Documentation**:
- Incident report within 7 days
- Root cause analysis
- Mitigation steps taken
- Prevention measures implemented

---

## Contact and Support

**Service Owner**: OSM Notes Team  
**Repository**: https://github.com/OSM-Notes/OSM-Notes-API  
**Issues**: https://github.com/OSM-Notes/OSM-Notes-API/issues  
**Documentation**: https://github.com/OSM-Notes/OSM-Notes-API/tree/main/docs

---

## Revision History

- **2025-12-28**: Initial SLA/SLO definition
- Future revisions will be documented here

---

## Notes

- This SLA applies to the public API endpoints
- Internal/admin endpoints may have different SLAs
- SLAs may be adjusted based on service evolution and user feedback
- Current SLAs are conservative and may be improved as the service matures
