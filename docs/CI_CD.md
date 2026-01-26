---
title: "CI/CD Documentation"
description: "The CI/CD pipeline consists of the following jobs:"
version: "1.0.0"
last_updated: "2026-01-25"
author: "AngocA"
tags:
  - "documentation"
audience:
  - "developers"
project: "OSM-Notes-API"
status: "active"
---


# CI/CD Documentation

## Overview

This project uses GitHub Actions for Continuous Integration and Continuous Deployment (CI/CD). The CI/CD pipeline automatically runs tests, linting, type checking, and security audits on every push and pull request.

## Workflow Structure

The CI/CD pipeline consists of the following jobs:

### 1. Lint and Type Check

**Purpose**: Validates code quality and type safety

**Steps**:
- Runs ESLint to check code style and potential errors
- Runs TypeScript compiler to verify type correctness
- Checks code formatting with Prettier

**Triggers**: On every push and pull request

### 2. Build

**Purpose**: Ensures the project compiles successfully

**Steps**:
- Compiles TypeScript to JavaScript
- Uploads build artifacts for potential deployment

**Triggers**: On every push and pull request

### 3. Unit Tests

**Purpose**: Validates unit test coverage

**Steps**:
- Runs all unit tests
- Generates coverage report
- Uploads coverage to Codecov (if token is configured)
- Uploads coverage artifacts

**Triggers**: On every push and pull request

**Coverage**: Currently targeting 80%+ coverage

### 4. Integration Tests

**Purpose**: Validates integration with external services

**Services**:
- PostgreSQL 15 (test database)
- Redis 7 (for rate limiting)

**Steps**:
- Sets up PostgreSQL and Redis services
- Creates test database
- Runs integration tests
- Uses test database: `osm_notes_api_test`

**Environment Variables**:
- `DB_HOST`: localhost
- `DB_PORT`: 5432
- `DB_NAME`: osm_notes_api_test
- `DB_USER`: osm_notes_test_user
- `DB_PASSWORD`: osm_notes_test_pass
- `REDIS_HOST`: localhost
- `REDIS_PORT`: 6379

**Triggers**: On every push and pull request

### 5. Security Audit

**Purpose**: Identifies security vulnerabilities in dependencies

**Steps**:
- Runs `npm audit` with moderate severity threshold
- Uploads audit results if vulnerabilities are found
- Does not fail the pipeline (continue-on-error: true)

**Triggers**: On every push and pull request

### 6. All Tests Summary

**Purpose**: Provides a summary of all test results

**Steps**:
- Aggregates results from all previous jobs
- Provides status summary

**Triggers**: After all other jobs complete

## Workflow Triggers

The CI/CD pipeline runs automatically on:

- **Push** to `main` or `develop` branches
- **Pull requests** targeting `main` or `develop` branches

## Manual Workflow Execution

You can manually trigger workflows from the GitHub Actions tab:

1. Go to the "Actions" tab in your repository
2. Select the workflow you want to run
3. Click "Run workflow"
4. Select the branch and click "Run workflow"

## Environment Variables

### Required for Codecov (Optional)

If you want to upload coverage to Codecov, add a secret:

1. Go to repository Settings → Secrets and variables → Actions
2. Add a new secret named `CODECOV_TOKEN`
3. Get your token from [codecov.io](https://codecov.io)

### Test Database Credentials

The integration tests use the following credentials (configured in the workflow):

- **Database**: `osm_notes_api_test`
- **User**: `osm_notes_test_user`
- **Password**: `osm_notes_test_pass`

These match the local test database configuration.

## Workflow Status Badge

Add this badge to your README.md to show CI/CD status:

```markdown
![CI/CD](https://github.com/OSM-Notes/OSM-Notes-API/workflows/CI/CD%20Pipeline/badge.svg)
```

## Troubleshooting

### Tests Failing Locally but Passing in CI

- Ensure you're using the same Node.js version (18.x)
- Check that your local database matches the test database configuration
- Run `npm ci` instead of `npm install` to match CI environment

### Integration Tests Failing

- Verify PostgreSQL and Redis services are running
- Check that test database credentials match workflow configuration
- Ensure test database exists and has proper permissions

### Coverage Not Uploading

- Verify `CODECOV_TOKEN` secret is configured (optional)
- Check that coverage files are being generated in `coverage/lcov.info`
- Review Codecov action logs for errors

### Build Failing

- Check TypeScript compilation errors
- Verify all dependencies are installed correctly
- Review build logs for specific error messages

## Best Practices

1. **Always run tests locally** before pushing
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

2. **Keep dependencies updated** to avoid security vulnerabilities
   ```bash
   npm audit
   npm audit fix
   ```

3. **Review CI/CD logs** when tests fail to understand the issue

4. **Don't skip CI checks** - they ensure code quality

5. **Use conventional commits** - they integrate well with CI/CD

## Future Enhancements

Potential improvements to the CI/CD pipeline:

- [ ] Add deployment jobs for staging/production
- [ ] Add performance testing
- [ ] Add Docker image building and publishing
- [ ] Add automated dependency updates (Dependabot)
- [ ] Add code quality gates (minimum coverage thresholds)
- [ ] Add automated changelog generation
- [ ] Add release automation

## Related Documentation

- [Testing Guide](TESTING.md)
- [Installation Guide](INSTALLATION.md)
- [Development Guide](DEVELOPMENT.md)

