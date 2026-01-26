---
title: "Development Guide"
description: "Guide for developers working on OSM Notes API."
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


# Development Guide

Guide for developers working on OSM Notes API.

## Development Workflow

### 1. Setup Development Environment

```bash
# Clone repository
git clone https://github.com/OSM-Notes/OSM-Notes-API.git
cd OSM-Notes-API

# Install dependencies
npm install

# Setup Git hooks
npm run prepare

# Configure environment
cp .env.example .env
# Edit .env with your settings
```

### 2. Create Feature Branch

```bash
# Create branch from main
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/your-bug-description
```

### 3. Development Process

**Follow Test-Driven Development (TDD) when possible:**

1. Write tests first
2. Implement minimal code to pass tests
3. Refactor while keeping tests green

```bash
# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- tests/unit/services/userService.test.ts
```

### 4. Code Quality Checks

**Pre-commit hooks automatically run these checks** before each commit:

- ✅ Code formatting (Prettier)
- ✅ Linting (ESLint)
- ✅ Type checking (TypeScript)

You can also run them manually:

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Formatting check
npm run format:check

# Format code automatically
npm run format

# Tests
npm test
```

**Note**: If pre-commit hooks fail, fix the issues before committing. The hooks prevent commits with code quality issues.

### 5. Commit Changes

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>(<scope>): <subject>

# Examples:
git commit -m "feat(users): add user search endpoint"
git commit -m "fix(middleware): correct User-Agent validation"
git commit -m "docs(readme): update installation instructions"
git commit -m "test(services): add tests for noteService"
```

**Commit Message Validation**: 
- The `commit-msg` hook automatically validates commit messages using commitlint
- Invalid format will prevent the commit
- Follow the format: `<type>(<scope>): <subject>`

**Commit Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Other changes (dependencies, etc.)
- `revert`: Revert previous commit

### 6. Push and Create Pull Request

```bash
# Push branch
git push origin feature/your-feature-name

# Create PR on GitHub
# PR title should follow conventional commits format
```

## Code Review Process

### For Contributors

1. **Ensure PR is ready**:
   - All tests pass
   - Code is formatted and linted
   - Documentation is updated
   - CHANGELOG.md is updated if needed

2. **Create Pull Request**:
   - Clear title following conventional commits
   - Detailed description
   - Reference related issues (closes #123)
   - Add screenshots/logs if applicable

3. **Respond to feedback**:
   - Address review comments
   - Update code as requested
   - Keep PR updated with main branch

### For Reviewers

1. **Review Checklist**:
   - [ ] Code follows project standards
   - [ ] Tests are included and pass
   - [ ] Documentation is updated
   - [ ] No security issues
   - [ ] Performance considerations addressed
   - [ ] Error handling is appropriate

2. **Provide constructive feedback**:
   - Be specific about issues
   - Suggest improvements
   - Approve when ready

## Code Standards

### TypeScript

- Use TypeScript strict mode
- Define types explicitly
- Avoid `any` type (use `unknown` if necessary)
- Use interfaces for object shapes
- Use enums for constants

### Code Style

- Follow ESLint rules
- Use Prettier for formatting
- Maximum line length: 100 characters
- Use meaningful variable names
- Add JSDoc comments for public functions

### Testing

- Write tests for all new features
- Aim for 80%+ code coverage
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies

### Error Handling

- Use try-catch for async operations
- Return appropriate HTTP status codes
- Provide clear error messages
- Log errors appropriately

## Git Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/changes
- `chore/` - Maintenance tasks

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Examples**:

```
feat(users): add user search endpoint

Implements search functionality for users with filters by country and activity level.

Closes #123
```

```
fix(middleware): correct User-Agent validation regex

The previous regex was too strict and rejected valid User-Agents with URLs.

Fixes #456
```

## Semantic Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (x.0.0): Breaking changes
- **MINOR** (0.x.0): New features (backward compatible)
- **PATCH** (0.0.x): Bug fixes (backward compatible)

**Current Version**: 0.1.0 (MVP in development)

## API Versioning Strategy

See [docs/API_VERSIONING.md](API_Versioning.md) for detailed API versioning strategy.

**Summary**:
- API versioned via URL path: `/api/v1`, `/api/v2`, etc.
- Breaking changes require new version
- Deprecation timeline: 6 months minimum
- Version support: Current + previous version

## Development Tools

### VS Code Recommended Extensions

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Jest Runner
- GitLens

### Useful Commands

```bash
# Development with hot reload
npm run dev

# Run specific test suite
npm run test:unit
npm run test:integration

# Check code quality
npm run lint
npm run type-check
npm run format:check

# Build for production
npm run build
```

## Debugging

### Local Development

```bash
# Run with debug logging
LOG_LEVEL=debug npm run dev

# Run specific test with verbose output
npm test -- --verbose tests/unit/services/userService.test.ts
```

### Docker Development

```bash
# View logs
docker compose -f docker/docker compose.yml logs -f api

# Execute commands in container
docker compose -f docker/docker compose.yml exec api sh
```

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

