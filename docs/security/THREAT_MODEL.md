# Threat Model

This document identifies potential threats to OSM Notes API and the mitigations in place.

## Assets

### Data Assets

- **User Analytics Data**: Aggregated statistics from `dwh.datamartUsers`
- **Country Analytics Data**: Aggregated statistics from `dwh.datamartCountries`
- **Notes Data**: OSM notes and comments (read-only access)
- **User Information**: OSM user IDs and usernames

### Infrastructure Assets

- **API Server**: Application server (192.168.0.7)
- **PostgreSQL Database**: Analytics database (`osm_notes_dwh`)
- **Redis Cache**: Cache and rate limiting storage
- **API Endpoints**: REST API endpoints

### System Assets

- **API Availability**: Service uptime and performance
- **Database Performance**: Query performance and availability
- **Server Resources**: CPU, memory, disk space

## Threat Actors

### 1. Automated Bots and Scrapers

**Description**: Automated tools attempting to scrape all data

**Capabilities**:
- High request volume
- Distributed requests (multiple IPs)
- User-Agent spoofing

**Motivation**: Data collection, competitive intelligence

**Threat Level**: HIGH

### 2. AI Systems (GPT, Claude, etc.)

**Description**: AI systems making massive requests for training data

**Capabilities**:
- Very high request volume
- Can adapt to rate limits
- May use multiple accounts

**Motivation**: Training data collection

**Threat Level**: HIGH

### 3. Malicious Users

**Description**: Users attempting to abuse the system

**Capabilities**:
- Can create multiple accounts
- Can use VPNs/proxies
- Can reverse engineer API

**Motivation**: Denial of service, data theft

**Threat Level**: MEDIUM

### 4. Script Kiddies

**Description**: Low-skilled attackers using automated tools

**Capabilities**:
- Use existing attack tools
- Follow online tutorials
- Limited customization

**Motivation**: Curiosity, reputation

**Threat Level**: LOW-MEDIUM

## Threat Scenarios

### T1: Mass Data Scraping

**Scenario**: Attacker attempts to download all user/country data

**Attack Vector**: Automated script making sequential requests

**Impact**:
- High database load
- Degraded service for legitimate users
- Potential data exfiltration

**Mitigations**:
- ✅ Rate limiting (50 req/15min)
- ✅ User-Agent validation
- ✅ IP-based tracking
- ✅ Monitoring and alerting

**Residual Risk**: MEDIUM (distributed attacks)

### T2: AI Training Data Collection

**Scenario**: AI system attempts to collect all data for training

**Attack Vector**: High-volume requests from AI User-Agents

**Impact**:
- Very high database load
- Service degradation
- Unauthorized data collection

**Mitigations**:
- ✅ OAuth required for detected AIs
- ✅ Rate limiting
- ✅ User-Agent detection
- ✅ Monitoring

**Residual Risk**: LOW (blocked automatically)

### T3: Denial of Service (DoS)

**Scenario**: Attacker floods API with requests

**Attack Vector**: High-volume requests from multiple IPs

**Impact**:
- Service unavailability
- Database overload
- Resource exhaustion

**Mitigations**:
- ✅ Rate limiting
- ✅ Connection pooling
- ✅ Query optimization
- ✅ Caching
- ✅ Monitoring and alerting

**Residual Risk**: MEDIUM (distributed attacks)

### T4: SQL Injection

**Scenario**: Attacker attempts SQL injection through API parameters

**Attack Vector**: Malicious input in query parameters

**Impact**:
- Data breach
- Data modification
- Database compromise

**Mitigations**:
- ✅ Parameterized queries (pg library)
- ✅ Input validation (Joi/Zod)
- ✅ Type safety (TypeScript)
- ✅ Read-only database access

**Residual Risk**: LOW

### T5: Information Disclosure

**Scenario**: Error messages reveal sensitive information

**Attack Vector**: Triggering errors to extract information

**Impact**:
- Database structure exposure
- System information leakage
- Attack surface expansion

**Mitigations**:
- ✅ Generic error messages in production
- ✅ Detailed errors only in development
- ✅ Error logging without exposing details
- ✅ Security headers (Helmet)

**Residual Risk**: LOW

### T6: Dependency Vulnerabilities

**Scenario**: Vulnerable dependencies exploited

**Attack Vector**: Known vulnerabilities in npm packages

**Impact**:
- Remote code execution
- Data breach
- System compromise

**Mitigations**:
- ✅ Regular dependency updates (Dependabot)
- ✅ Security audits (npm audit in CI/CD)
- ✅ Minimal dependencies
- ✅ Security monitoring

**Residual Risk**: LOW-MEDIUM

### T7: Credential Theft

**Scenario**: Database/Redis credentials exposed

**Attack Vector**: Environment variable exposure, code leaks

**Impact**:
- Unauthorized database access
- Data breach
- System compromise

**Mitigations**:
- ✅ Environment variables (never in code)
- ✅ `.env` in `.gitignore`
- ✅ Secrets management documentation
- ✅ Least privilege access

**Residual Risk**: LOW

## Threat Matrix

| Threat | Likelihood | Impact | Risk Level | Mitigations |
|--------|-----------|--------|------------|-------------|
| Mass Data Scraping | HIGH | MEDIUM | HIGH | Rate limiting, User-Agent validation |
| AI Data Collection | MEDIUM | HIGH | HIGH | OAuth required, Detection |
| DoS Attack | MEDIUM | HIGH | MEDIUM | Rate limiting, Caching, Monitoring |
| SQL Injection | LOW | HIGH | LOW | Parameterized queries, Validation |
| Information Disclosure | LOW | MEDIUM | LOW | Generic errors, Security headers |
| Dependency Vulnerabilities | MEDIUM | HIGH | MEDIUM | Dependabot, npm audit |
| Credential Theft | LOW | HIGH | LOW | Environment variables, Secrets mgmt |

## Security Controls

### Preventive Controls

- ✅ Input validation (Joi/Zod)
- ✅ Parameterized queries
- ✅ Rate limiting
- ✅ User-Agent validation
- ✅ OAuth for AIs
- ✅ Security headers (Helmet)
- ✅ Type safety (TypeScript)

### Detective Controls

- ✅ Logging (structured logs)
- ✅ Monitoring (Prometheus)
- ✅ Alerting (Grafana)
- ✅ Security audits (npm audit)

### Corrective Controls

- ✅ Error handling
- ✅ Automatic blocking (AIs, bots)
- ✅ Dependency updates (Dependabot)
- ✅ Incident response plan (documented in SECURITY_POLICY.md and RUNBOOK.md)

## Risk Assessment

### High Risk Threats

1. **Mass Data Scraping**: Mitigated with rate limiting and monitoring
2. **AI Data Collection**: Mitigated with OAuth requirement

### Medium Risk Threats

1. **DoS Attacks**: Mitigated with rate limiting and caching
2. **Dependency Vulnerabilities**: Mitigated with automated updates

### Low Risk Threats

1. **SQL Injection**: Well mitigated with parameterized queries
2. **Information Disclosure**: Mitigated with generic errors
3. **Credential Theft**: Mitigated with proper secrets management

## Review Schedule

This threat model should be reviewed:
- When new features are added
- When new threats are identified
- Annually or after security incidents

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

