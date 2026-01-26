---
title: "Testing Performance Guide"
description: "This guide explains how to run tests efficiently without overwhelming your system."
version: "1.0.0"
last_updated: "2026-01-25"
author: "AngocA"
tags:
  - "performance"
  - "testing"
audience:
  - "developers"
project: "OSM-Notes-API"
status: "active"
---


# Testing Performance Guide

This guide explains how to run tests efficiently without overwhelming your system.

## Problem

Integration tests can be resource-intensive because they:
- Create real HTTP requests
- Connect to databases and Redis
- Run multiple concurrent requests
- Execute many tests in parallel

This can cause:
- High CPU usage
- High memory consumption
- System slowdowns
- Test timeouts

## Solutions

### 1. Run Tests Sequentially

For integration tests, run them one at a time:

```bash
# Run integration tests sequentially (one at a time)
npm run test:integration:single
```

This uses `--runInBand` which runs tests serially in the current process.

### 2. Run Only Unit Tests

Unit tests are faster and less resource-intensive:

```bash
# Run only unit tests
npm run test:unit
```

### 3. Run Tests with Limited Workers

The default configuration limits workers to 2, but you can override:

```bash
# Run with only 1 worker (slower but uses less resources)
jest --maxWorkers=1

# Run with 50% of available CPUs
jest --maxWorkers=50%
```

### 4. Run Specific Test Files

Instead of running all tests, run only what you need:

```bash
# Run a specific test file
jest tests/integration/notes.test.ts

# Run tests matching a pattern
jest --testNamePattern="should return 200"
```

### 5. Skip Resource-Intensive Tests

You can temporarily skip tests that are too heavy:

```typescript
// Skip a test
it.skip('should apply rate limiting', async () => {
  // ...
});

// Or skip an entire describe block
describe.skip('Rate Limiting Security', () => {
  // ...
});
```

## Optimizations Applied

### Reduced Concurrent Requests

Tests that previously made 60-100 concurrent requests have been reduced:

- **Rate limiting tests**: Reduced from 60 to 15 requests
- **Security tests**: Reduced from 100 to 20 requests per endpoint
- **Concurrent request tests**: Kept at 10 (reasonable)

### Jest Configuration

- **maxWorkers**: Limited to 2 workers (or 50% in CI)
- **testTimeout**: Increased to 15 seconds
- **Sequential execution**: Available via `--runInBand` flag

## Recommended Workflow

### During Development

```bash
# Run only unit tests (fast)
npm run test:unit

# Run specific integration test
jest tests/integration/notes.test.ts
```

### Before Committing

```bash
# Run all tests but sequentially for integration tests
npm run test:unit
npm run test:integration:single
```

### In CI/CD

```bash
# Full test suite (CI handles parallelism better)
npm test
```

## Performance Tips

1. **Close unnecessary applications** while running tests
2. **Use SSD** for faster database operations
3. **Ensure sufficient RAM** (4GB+ recommended)
4. **Close browser tabs** to free up memory
5. **Run tests when system is idle**

## Troubleshooting

### Tests are still slow

- Check if database/Redis connections are timing out
- Verify network latency to database
- Consider using test database instead of production

### System still gets overwhelmed

- Use `--runInBand` flag to run tests completely sequentially
- Run tests in smaller batches
- Consider using a more powerful machine or CI/CD

### Memory issues

- Reduce `maxWorkers` to 1
- Close other applications
- Increase Node.js memory limit: `NODE_OPTIONS=--max-old-space-size=4096`

## Test Execution Times (Approximate)

- **Unit tests only**: ~5-10 seconds
- **Integration tests (parallel)**: ~30-60 seconds
- **Integration tests (sequential)**: ~60-120 seconds
- **Full test suite**: ~90-180 seconds

Times vary based on system resources and database latency.

