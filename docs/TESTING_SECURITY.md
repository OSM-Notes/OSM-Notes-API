# Security Testing with OWASP ZAP

This guide explains how to run security tests using OWASP ZAP (Zed Attack Proxy) for the OSM Notes API.

## What is OWASP ZAP?

**OWASP ZAP (Zed Attack Proxy)** is a free, open-source security testing tool used to find vulnerabilities in web applications. It's designed to be used by both those new to application security as well as professional penetration testers.

## Why Use OWASP ZAP?

- **Automated Security Scanning**: Detects common vulnerabilities (OWASP Top 10)
- **API Security Testing**: Specifically designed for testing REST APIs
- **Free and Open Source**: No licensing costs
- **CI/CD Integration**: Can be integrated into automated pipelines
- **Comprehensive Reports**: Generates detailed security reports

## Prerequisites

### Installation Options

#### Option 1: Docker (Recommended)

```bash
# Pull OWASP ZAP Docker image
docker pull owasp/zap2docker-stable

# Or use the latest version
docker pull owasp/zap2docker-latest
```

#### Option 2: Standalone Application

**Linux**:
```bash
# Download from https://www.zaproxy.org/download/
# Or use package manager (if available)
wget https://github.com/zaproxy/zaproxy/releases/latest/download/ZAP_2.14.0_Linux.tar.gz
tar -xzf ZAP_2.14.0_Linux.tar.gz
cd ZAP_2.14.0
./zap.sh
```

**macOS**:
```bash
# Download DMG from https://www.zaproxy.org/download/
# Or use Homebrew
brew install --cask owasp-zap
```

**Windows**:
- Download installer from https://www.zaproxy.org/download/
- Run the installer

#### Option 3: Command Line (ZAP Baseline)

```bash
# Docker version (easiest)
docker pull owasp/zap2docker-baseline
```

## Running Security Tests

### Method 1: Baseline Scan (Quick Scan)

**Best for**: Quick security check, CI/CD integration

```bash
# Using Docker
docker run -t owasp/zap2docker-baseline zap-baseline.py \
  -t http://localhost:3000 \
  -J zap-report.json \
  -r zap-report.html \
  -I

# With custom configuration
docker run -t owasp/zap2docker-baseline zap-baseline.py \
  -t http://localhost:3000 \
  -J zap-report.json \
  -r zap-report.html \
  -I \
  -c zap-baseline.conf
```

**Parameters**:
- `-t`: Target URL (API base URL)
- `-J`: JSON report output
- `-r`: HTML report output
- `-I`: Ignore warnings (don't fail on warnings)
- `-c`: Configuration file (optional)

### Method 2: Full Scan (Comprehensive)

**Best for**: Complete security assessment

```bash
# Using Docker
docker run -t owasp/zap2docker-stable zap-full-scan.py \
  -t http://localhost:3000 \
  -J zap-report.json \
  -r zap-report.html \
  -I
```

### Method 3: API Scan (Recommended for REST APIs)

**Best for**: Testing REST APIs specifically

```bash
# Using Docker
docker run -t owasp/zap2docker-stable zap-api-scan.py \
  -t http://localhost:3000/docs/json \
  -f openapi \
  -J zap-report.json \
  -r zap-report.html \
  -I
```

**Parameters**:
- `-t`: OpenAPI/Swagger spec URL
- `-f`: Format (openapi, swagger, etc.)

### Method 4: Manual Testing with ZAP Desktop

1. **Start ZAP Desktop**:
   ```bash
   zap.sh  # Linux/Mac
   # Or launch from GUI
   ```

2. **Configure Target**:
   - Set target URL: `http://localhost:3000`
   - Configure authentication if needed (OAuth, etc.)

3. **Run Spider**:
   - Right-click on target → Attack → Spider
   - Wait for spider to complete

4. **Run Active Scan**:
   - Right-click on target → Attack → Active Scan
   - Configure scan policy
   - Wait for scan to complete

5. **Review Results**:
   - Check Alerts tab for vulnerabilities
   - Export report: Report → Generate Report

## Configuration for OSM Notes API

### Custom Configuration File

Create `zap-baseline.conf`:

```conf
# OWASP ZAP Baseline Configuration for OSM Notes API

# Exclude false positives
# Example: Exclude specific alerts that are false positives
# -alert:10021  # Example alert ID

# Include User-Agent header
# ZAP needs to include User-Agent for API requests
header "User-Agent: ZAP-Security-Scan/1.0 (security@example.com)"

# Rate limiting considerations
# ZAP may trigger rate limiting - consider:
# 1. Running scan from whitelisted IP
# 2. Temporarily increasing rate limits for testing
# 3. Using authenticated requests (if OAuth available)

# API-specific settings
# Focus on API endpoints
api: true
```

### Environment Setup

**Before running scans**:

1. **Start API**:
   ```bash
   npm start
   # Or
   docker compose -f docker/docker compose.yml up -d api
   ```

2. **Verify API is accessible**:
   ```bash
   curl -H "User-Agent: Test/1.0 (test@example.com)" \
        http://localhost:3000/health
   ```

3. **Consider Rate Limiting**:
   - ZAP may make many requests quickly
   - Consider temporarily increasing rate limits for testing
   - Or run from whitelisted IP address
   - Or use authenticated requests (if OAuth available)

## Expected Vulnerabilities to Check

### OWASP Top 10 (2021)

1. **A01:2021 – Broken Access Control**
   - Test: Verify rate limiting works correctly
   - Test: Verify User-Agent validation works
   - Test: Verify OAuth endpoints (if available)

2. **A02:2021 – Cryptographic Failures**
   - Test: Verify HTTPS in production
   - Test: Verify sensitive data encryption

3. **A03:2021 – Injection**
   - Test: SQL injection in query parameters
   - Test: NoSQL injection (if applicable)
   - Test: Command injection

4. **A04:2021 – Insecure Design**
   - Review: API design security
   - Review: Authentication/authorization design

5. **A05:2021 – Security Misconfiguration**
   - Test: Security headers (Helmet.js)
   - Test: CORS configuration
   - Test: Error messages don't leak sensitive info

6. **A06:2021 – Vulnerable and Outdated Components**
   - Check: npm audit results
   - Check: Dependency versions

7. **A07:2021 – Identification and Authentication Failures**
   - Test: User-Agent validation
   - Test: Rate limiting effectiveness
   - Test: OAuth implementation (if available)

8. **A08:2021 – Software and Data Integrity Failures**
   - Review: CI/CD security
   - Review: Dependency integrity

9. **A09:2021 – Security Logging and Monitoring Failures**
   - Verify: Security events are logged
   - Verify: Monitoring alerts configured

10. **A10:2021 – Server-Side Request Forgery (SSRF)**
    - Test: SSRF vulnerabilities (if applicable)

### API-Specific Tests

- **Input Validation**: All query parameters, path parameters
- **Rate Limiting**: Verify limits are enforced
- **CORS**: Verify CORS headers are correct
- **Error Handling**: Verify errors don't leak sensitive info
- **Authentication**: Verify User-Agent validation
- **Authorization**: Verify access controls (if OAuth available)

## Interpreting Results

### Report Structure

ZAP reports include:

1. **Summary**: Overall security status
2. **Alerts**: List of vulnerabilities found
3. **Risk Levels**:
   - **High**: Critical vulnerabilities requiring immediate attention
   - **Medium**: Important vulnerabilities to fix
   - **Low**: Minor issues or informational
   - **Informational**: Best practices or recommendations

### Common False Positives

- **Missing Anti-CSRF Tokens**: May be flagged, but API uses REST (stateless)
- **Missing Secure Flag on Cookies**: May not apply if no cookies used
- **Session Management**: May not apply if stateless API

### Action Items

1. **Review High/Medium Risk Alerts**: Prioritize fixing these
2. **Verify False Positives**: Mark as false positive if not applicable
3. **Document Findings**: Update security documentation
4. **Fix Vulnerabilities**: Address real vulnerabilities
5. **Re-scan**: Verify fixes after addressing issues

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Security Scan

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  workflow_dispatch:

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Start API
        run: |
          npm install
          npm run build
          npm start &
          sleep 10
      
      - name: Run ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.10.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'
      
      - name: Upload ZAP Report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: zap-report
          path: report_html.html
```

## Best Practices

1. **Run Regularly**: Schedule weekly or monthly scans
2. **Fix High/Medium Risks**: Prioritize critical vulnerabilities
3. **Document False Positives**: Keep record of known false positives
4. **Update ZAP**: Keep ZAP updated to latest version
5. **Review Reports**: Don't ignore informational alerts
6. **Integrate with CI/CD**: Automate security scanning

## Resources

- **OWASP ZAP Documentation**: https://www.zaproxy.org/docs/
- **OWASP ZAP API**: https://www.zaproxy.org/docs/api/
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **ZAP Docker Images**: https://github.com/zaproxy/zaproxy/wiki/Docker

## Notes

- **Rate Limiting**: ZAP may trigger rate limiting. Consider:
  - Running scans during low-traffic periods
  - Temporarily increasing limits for testing
  - Using authenticated requests
  
- **Performance Impact**: Full scans can take 30+ minutes
- **False Positives**: Review all findings, not all are real vulnerabilities
- **API-Specific**: Some web vulnerabilities don't apply to REST APIs

---

**Last Updated**: 2025-12-28
