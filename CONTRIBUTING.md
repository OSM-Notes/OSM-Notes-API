# Contributing Guide

Thank you for your interest in contributing to OSM Notes API. This document provides guidelines and standards for contributing to the project.

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How Can I Contribute?

### Reporting Bugs

If you find a bug:

1. Check that it hasn't already been reported in [Issues](https://github.com/OSM-Notes/OSM-Notes-API/issues)
2. If not, create a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Node.js version and operating system
   - Relevant logs if applicable

### Suggesting Enhancements

To suggest new features:

1. Check that it hasn't already been suggested
2. Create an issue with:
   - Clear description of the feature
   - Use case and justification
   - Examples of how it would be used

### Contributing Code

#### Development Process

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Develop** your change following project standards
4. **Write tests** for your code (TDD preferred)
5. **Ensure** all tests pass:
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```
6. **Commit** your changes using [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat: add new feature X"
   ```
7. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
8. **Open a Pull Request** with clear description

#### Code Standards

- **TypeScript**: Use TypeScript with strict mode
- **ESLint**: Code must pass `npm run lint` without errors
- **Prettier**: Code must be formatted (`npm run format`)
- **Tests**: New code must include tests (minimum 80% coverage)
- **Documentation**: Document public functions with JSDoc

#### Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Formatting, semicolons, etc. (no code changes)
- `refactor:` Code refactoring
- `test:` Add or modify tests
- `chore:` Build changes, dependencies, etc.

Examples:
```bash
git commit -m "feat: add user search endpoint"
git commit -m "fix: correct User-Agent validation"
git commit -m "docs: update README with examples"
```

#### Pull Request Structure

A good PR includes:

- **Clear title** describing the change
- **Description** explaining what and why
- **References** to related issues (closes #123)
- **Tests** validating the change
- **Documentation** updated if applicable

#### Code Review

- PRs require at least one approval
- Maintainers will review:
  - Code quality
  - Test coverage
  - Standards compliance
  - Documentation

## Development Environment Setup

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for detailed instructions.

Quick summary:

```bash
# Clone and setup
git clone https://github.com/OSM-Notes/OSM-Notes-API.git
cd OSM-Notes-API
npm install

# Configure environment variables
cp .env.example .env
# Edit .env

# Run tests
npm test

# Development
npm run dev
```

## Questions

If you have questions about contributing, you can:

- Open an issue with the `question` label
- Contact the maintainers

## Recognition

All contributions are valuable and will be recognized. Thank you for helping improve OSM Notes API!
