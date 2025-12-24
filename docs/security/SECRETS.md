# Secrets Management

This document describes how secrets and sensitive configuration are managed in OSM Notes API.

## Principles

1. **Never commit secrets to version control**
2. **Use environment variables for all secrets**
3. **Document required secrets in `.env.example`**
4. **Rotate secrets regularly**
5. **Use least privilege access**

## Secrets in This Project

### Database Credentials

```env
DB_HOST=192.168.0.7
DB_PORT=5432
DB_NAME=osm_notes_dwh
DB_USER=analytics_user
DB_PASSWORD=<SECRET>
DB_SSL=false
```

**Storage**: Environment variables  
**Access**: Application server only  
**Rotation**: When compromised or quarterly

### Redis Credentials

```env
REDIS_HOST=192.168.0.7
REDIS_PORT=6379
REDIS_PASSWORD=<SECRET>
REDIS_DB=0
```

**Storage**: Environment variables  
**Access**: Application server only  
**Rotation**: When compromised or quarterly

### OAuth Credentials (Phase 5)

```env
OSM_OAUTH_CLIENT_ID=<SECRET>
OSM_OAUTH_CLIENT_SECRET=<SECRET>
OAUTH_CALLBACK_URL=http://localhost:3000/auth/callback
```

**Storage**: Environment variables  
**Access**: Application server only  
**Rotation**: When compromised

## Best Practices

### Development

1. **Use `.env.example`** as template:
   ```bash
   cp .env.example .env
   # Edit .env with actual secrets (never commit)
   ```

2. **Never commit `.env`**:
   - Already in `.gitignore`
   - Verify before committing: `git status`

3. **Use different secrets** for development and production

### Production

1. **Environment variables**:
   - Set in Docker Compose or container orchestration
   - Never hardcode in Dockerfile
   - Use secrets management if available (Docker secrets, Kubernetes secrets)

2. **Access control**:
   - Limit who can access production secrets
   - Use read-only database users
   - Rotate credentials regularly

3. **Monitoring**:
   - Monitor for credential exposure
   - Alert on suspicious access patterns

## Secret Rotation

### When to Rotate

- After security incident
- Quarterly (recommended)
- When team member leaves
- When compromised or suspected

### Rotation Process

1. Generate new secret
2. Update in environment variables
3. Update in all environments (dev, staging, prod)
4. Restart application
5. Verify application works
6. Revoke old secret (if possible)

## Emergency Procedures

### If Secrets Are Exposed

1. **Immediately rotate** all exposed secrets
2. **Review access logs** for unauthorized access
3. **Notify team** and stakeholders
4. **Document incident** in security log
5. **Review and improve** security practices

### If Database Credentials Compromised

1. Rotate database password immediately
2. Review database access logs
3. Check for unauthorized data access
4. Update application with new credentials
5. Monitor for suspicious activity

## Tools and Resources

### Recommended Tools

- **Docker Secrets**: For Docker Swarm deployments
- **Kubernetes Secrets**: For Kubernetes deployments
- **HashiCorp Vault**: For advanced secret management (if scaling)
- **AWS Secrets Manager**: If using AWS (not applicable here)

### Current Setup

- **Development**: `.env` file (local, not committed)
- **Production**: Environment variables in Docker Compose
- **CI/CD**: GitHub Secrets (if needed for CI)

## Checklist

- [ ] All secrets in environment variables
- [ ] `.env` in `.gitignore`
- [ ] `.env.example` documented (without real values)
- [ ] Secrets rotated regularly
- [ ] Access to secrets limited
- [ ] Monitoring for exposure
- [ ] Incident response plan documented

## References

- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12 Factor App - Config](https://12factor.net/config)

