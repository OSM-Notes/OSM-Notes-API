# Backup Strategy

This document outlines the backup strategy for the OSM Notes API infrastructure and data.

## Overview

**Purpose**: Ensure data availability and service recovery in case of data loss or system failure.

**Scope**:
- Database backups (PostgreSQL)
- Application code (Git)
- Configuration files
- Monitoring data (Prometheus)

---

## Database Backups

### Backup Types

#### Full Backups

**Frequency**: Daily at 02:00 UTC

**Method**: `pg_dump` with custom format

**Command**:
```bash
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -F c -b -v -f "backup_$(date +%Y%m%d_%H%M%S).dump"
```

**Storage**:
- Local: `/backups/postgres/daily/`
- Retention: 30 days
- Compression: Yes (custom format is compressed)

#### Incremental Backups (Optional)

**Frequency**: Hourly (if configured)

**Method**: PostgreSQL WAL archiving

**Configuration**:
```sql
-- Enable WAL archiving
archive_mode = on
archive_command = 'cp %p /backups/postgres/wal/%f'
```

**Storage**:
- Local: `/backups/postgres/wal/`
- Retention: 24 hours
- Used for point-in-time recovery

#### Weekly Backups

**Frequency**: Weekly (Sunday at 02:00 UTC)

**Method**: Full backup with extended retention

**Storage**:
- Local: `/backups/postgres/weekly/`
- Retention: 12 weeks
- Compression: Yes

#### Monthly Backups

**Frequency**: Monthly (1st of month at 02:00 UTC)

**Method**: Full backup with long-term retention

**Storage**:
- Local: `/backups/postgres/monthly/`
- Retention: 12 months
- Compression: Yes
- Off-site: Recommended

### Backup Verification

**Automated Checks**:
- Verify backup file exists
- Verify backup file size > 0
- Verify backup file integrity (pg_restore --list)

**Manual Verification** (Weekly):
- Restore backup to test database
- Run data integrity checks
- Verify critical queries work
- Document results

### Backup Restoration

#### Full Restore

```bash
# Stop API service
systemctl stop osm-notes-api

# Drop existing database (if needed)
dropdb -h $DB_HOST -U $DB_USER $DB_NAME

# Create new database
createdb -h $DB_HOST -U $DB_USER $DB_NAME

# Restore backup
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -v backup_YYYYMMDD_HHMMSS.dump

# Verify restoration
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -c "SELECT COUNT(*) FROM information_schema.tables;"

# Start API service
systemctl start osm-notes-api
```

#### Point-in-Time Recovery (if WAL archiving enabled)

```bash
# Restore base backup
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME \
  backup_YYYYMMDD_HHMMSS.dump

# Recover to specific point in time
# (Requires PostgreSQL recovery configuration)
```

---

## Application Code Backups

### Git Repository

**Method**: Git version control (GitHub)

**Backup Frequency**: Continuous (every commit)

**Restoration**:
```bash
git clone https://github.com/osmlatam/OSM-Notes-API.git
cd OSM-Notes-API
git checkout <tag-or-commit>
```

**Tags**: 
- Create release tags for stable versions
- Tag format: `v1.0.0`, `v1.1.0`, etc.

### Build Artifacts

**Frequency**: On each release

**Storage**: 
- GitHub Releases (attached artifacts)
- Local: `/backups/builds/`
- Retention: Last 10 releases

---

## Configuration Backups

### Environment Variables

**Files to Backup**:
- `.env` (production)
- `.env.example` (template)
- `docker compose.yml`
- `docker compose.prod.yml`

**Frequency**: 
- Before each deployment
- After configuration changes
- Weekly automated backup

**Storage**:
- Encrypted storage (required for secrets)
- Version controlled (non-sensitive configs)
- Secure secret management system (recommended)

**Restoration**:
```bash
# Restore from backup
cp backup/.env .env

# Verify configuration
npm run type-check  # Validates env vars
```

### Docker Configurations

**Files to Backup**:
- `docker/docker compose.yml`
- `docker/Dockerfile`
- `docker/prometheus/prometheus.yml`
- `docker/prometheus/alerts.yml`
- `docker/grafana/provisioning/`

**Frequency**: 
- Before each deployment
- After configuration changes

**Storage**: 
- Git repository (version controlled)
- Local backup: `/backups/docker/`

---

## Monitoring Data Backups

### Prometheus Data

**Frequency**: 
- Prometheus retention: 200 hours (configured)
- Long-term storage: Optional (via remote write)

**Backup Method**:
```bash
# Export Prometheus data (if needed)
promtool tsdb export /prometheus > prometheus_backup.tar.gz
```

**Storage**:
- Prometheus TSDB: Local storage
- Long-term: Optional external storage (Thanos, etc.)

### Grafana Dashboards

**Backup Method**: 
- Dashboards provisioned from files (already backed up in Git)
- Manual export: Grafana UI → Export dashboard

**Storage**:
- Git repository: `docker/grafana/provisioning/dashboards/`
- Manual exports: `/backups/grafana/`

---

## Backup Storage Locations

### Primary Storage

**Location**: `/backups/` on backup server

**Structure**:
```
/backups/
├── postgres/
│   ├── daily/
│   ├── weekly/
│   ├── monthly/
│   └── wal/ (if WAL archiving enabled)
├── config/
│   ├── env/
│   └── docker/
├── builds/
└── monitoring/
```

### Off-Site Storage (Recommended)

**Options**:
- Cloud storage (AWS S3, Google Cloud Storage, etc.)
- Remote server
- Tape backups (for long-term)

**Frequency**: 
- Daily: Critical backups
- Weekly: Full system backups
- Monthly: Long-term archives

**Encryption**: Required for all off-site backups

---

## Backup Automation

### Scripts

**Daily Database Backup Script** (`scripts/backup_db.sh`):
```bash
#!/bin/bash
# Daily PostgreSQL backup script

BACKUP_DIR="/backups/postgres/daily"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.dump"

# Create backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -F c -b -v -f "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
  echo "Backup successful: $BACKUP_FILE"
  
  # Cleanup old backups (keep 30 days)
  find $BACKUP_DIR -name "backup_*.dump" -mtime +30 -delete
else
  echo "Backup failed!"
  exit 1
fi
```

**Cron Schedule**:
```cron
# Daily backup at 02:00 UTC
0 2 * * * /path/to/scripts/backup_db.sh

# Weekly backup on Sunday at 02:00 UTC
0 2 * * 0 /path/to/scripts/backup_weekly.sh

# Monthly backup on 1st at 02:00 UTC
0 2 1 * * /path/to/scripts/backup_monthly.sh
```

---

## Backup Verification and Testing

### Automated Verification

**Daily Checks**:
- Backup file exists
- Backup file size > 0
- Backup file age < 25 hours

**Weekly Checks**:
- Restore test (automated)
- Data integrity verification
- Query test on restored database

### Manual Testing

**Frequency**: Monthly

**Procedure**:
1. Select random backup
2. Restore to test environment
3. Verify data integrity
4. Test critical queries
5. Document results
6. Update procedures if needed

---

## Disaster Recovery Integration

### Backup Role in Disaster Recovery

Backups are critical for:
- Database restoration
- Configuration restoration
- Application code restoration
- Point-in-time recovery

**See**: `docs/operations/DISASTER_RECOVERY.md` for full recovery procedures

---

## Backup Retention Policy

### Retention Schedule

| Backup Type | Frequency | Retention | Storage Location |
|------------|-----------|-----------|------------------|
| Daily DB | Daily | 30 days | Local + Off-site |
| Weekly DB | Weekly | 12 weeks | Local + Off-site |
| Monthly DB | Monthly | 12 months | Local + Off-site |
| WAL Archives | Continuous | 24 hours | Local |
| Config | On change | 90 days | Git + Encrypted |
| Builds | On release | 10 releases | GitHub + Local |

### Cleanup Procedures

**Automated Cleanup**:
- Old backups deleted automatically based on retention policy
- Cleanup runs after each backup
- Logs cleanup actions

**Manual Cleanup**:
- Review retention policies quarterly
- Archive important backups before deletion
- Document cleanup decisions

---

## Security Considerations

### Backup Encryption

**Requirements**:
- All backups containing sensitive data must be encrypted
- Encryption at rest for backup storage
- Encrypted transfer for off-site backups

**Encryption Method**:
```bash
# Encrypt backup
gpg --symmetric --cipher-algo AES256 backup.dump

# Decrypt backup
gpg --decrypt backup.dump.gpg > backup.dump
```

### Access Control

**Backup Access**:
- Limited to authorized personnel only
- Audit log of backup access
- Secure storage of backup credentials

**Backup Permissions**:
- Read: Backup operators, DBAs
- Write: Automated backup scripts
- Delete: Authorized administrators only

---

## Monitoring and Alerting

### Backup Monitoring

**Metrics Tracked**:
- Backup success/failure
- Backup file size
- Backup duration
- Storage usage

**Alerts**:
- Backup failure (immediate)
- Backup size anomaly (warning)
- Storage space low (warning)
- Backup age > 26 hours (warning)

**Dashboards**:
- Backup status dashboard (if configured)
- Storage usage graphs
- Backup history

---

## Revision History

- **2025-12-28**: Initial backup strategy document created

---

## Notes

- Backup strategy should be reviewed quarterly
- Backup procedures should be tested monthly
- Retention policies may be adjusted based on storage capacity
- Off-site backups are strongly recommended for production
