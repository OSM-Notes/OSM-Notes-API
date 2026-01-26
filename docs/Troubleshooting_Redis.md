---
title: "Troubleshooting Redis Connection Issues"
description: "Troubleshooting guide for Redis connection errors, including connection refused errors and configuration steps"
version: "1.0.0"
last_updated: "2026-01-25"
author: "AngocA"
tags:
  - "troubleshooting"
audience:
  - "users"
  - "developers"
project: "OSM-Notes-API"
status: "active"
---


# Troubleshooting Redis Connection Issues

## Error: "Connection refused"

If you get `Could not connect to Redis at 192.168.0.7:6379: Connection refused`, follow these steps:

## Step 1: Verify Redis is installed

```bash
# Check if Redis is installed
which redis-server
which redis-cli

# If not installed, install:
sudo apt-get update
sudo apt-get install redis-server
```

## Step 2: Verify Redis is running

```bash
# Check service status
sudo systemctl status redis-server

# Or if it uses a different name:
sudo systemctl status redis

# Check Redis processes
ps aux | grep redis
```

## Step 3: Start Redis if not running

```bash
# Start Redis
sudo systemctl start redis-server

# Enable automatic startup
sudo systemctl enable redis-server

# Verify it's running
sudo systemctl status redis-server
```

## Step 4: Verify Redis configuration

Redis by default only listens on `localhost` (127.0.0.1). To connect from another machine or IP, you need to configure it:

```bash
# Edit Redis configuration
sudo vi /etc/redis/redis.conf

# Or on some systems:
sudo vi /etc/redis.conf
```

**Find and modify**:

```conf
# Original line (localhost only):
bind 127.0.0.1

# Change to (listen on all interfaces):
bind 0.0.0.0

# Or specifically on your IP:
bind 192.168.0.7
```

**Also verify**:

```conf
# Ensure it's not in protected mode (or configure password)
protected-mode no

# Or if you want security, use password:
requirepass your_secure_password_here
```

**Restart Redis after changes**:

```bash
sudo systemctl restart redis-server
```

## Step 5: Verify firewall

```bash
# Check if port 6379 is open
sudo ufw status

# If blocked, open the port:
sudo ufw allow 6379/tcp

# Or specifically from your network:
sudo ufw allow from 192.168.0.0/24 to any port 6379
```

## Step 6: Test local connection first

```bash
# Test local connection (should work)
redis-cli ping
# Expected: PONG

# Test with password if configured
redis-cli -a your_password ping
```

## Step 7: Test remote connection

```bash
# From the same machine but using the IP
redis-cli -h 192.168.0.7 -p 6379 ping

# With password
redis-cli -h 192.168.0.7 -p 6379 -a your_password ping

# Or using environment variables
export REDIS_HOST=192.168.0.7
export REDIS_PORT=6379
export REDIS_PASSWORD=your_password
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
```

## Step 8: Verify what Redis is listening on

```bash
# See what IPs and ports Redis is listening on
sudo netstat -tlnp | grep redis
# Or
sudo ss -tlnp | grep redis

# Should show something like:
# tcp  0  0  0.0.0.0:6379  0.0.0.0:*  LISTEN  pid/redis-server
```

## Quick Solution: Use localhost if Redis is on the same machine

If Redis is running on the same machine as the API, use `localhost` instead of the IP:

```env
# .env
REDIS_HOST=localhost  # Instead of 192.168.0.7
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

## Alternative Solution: Disable Redis (if you don't need it)

**Redis is optional**. If you don't need it now, simply leave it disabled:

```env
# .env
REDIS_HOST=  # Empty = Redis disabled
# API will work with in-memory rate limiting
```

## Final Verification

```bash
# 1. Verify Redis is running
sudo systemctl status redis-server

# 2. Verify it's listening on the correct port
sudo netstat -tlnp | grep 6379

# 3. Test local connection
redis-cli ping

# 4. Test remote connection (if applicable)
redis-cli -h 192.168.0.7 -p 6379 ping

# 5. Test with password (should respond PONG)
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
# Expected: PONG (the warning about password is just informational)

# 6. Verify from API
curl http://localhost:3000/health | jq .redis
# Should show: "status": "up"
```

## ✅ Successful Connection

If `redis-cli ping` responds `PONG`, Redis is working correctly. The warning about using password in the command line is just informational (for security, the password remains in history) but doesn't affect functionality.

## Useful Commands

```bash
# View Redis logs
sudo journalctl -u redis-server -f

# View current configuration
redis-cli CONFIG GET bind
redis-cli CONFIG GET protected-mode
redis-cli CONFIG GET requirepass

# Restart Redis
sudo systemctl restart redis-server

# Stop Redis
sudo systemctl stop redis-server
```

## Diagnostic Checklist

- [ ] Redis is installed (`which redis-server`)
- [ ] Redis is running (`sudo systemctl status redis-server`)
- [ ] Redis listens on the correct IP (`sudo netstat -tlnp | grep redis`)
- [ ] Firewall allows connections to port 6379 (`sudo ufw status`)
- [ ] Local connection works (`redis-cli ping`)
- [ ] Redis configuration allows remote connections (`bind 0.0.0.0` or specific IP)
- [ ] Password configured correctly (if applicable)

---

**Note**: If after all these steps Redis still doesn't work, you can simply leave `REDIS_HOST` empty in `.env` and the API will work normally with in-memory rate limiting.
