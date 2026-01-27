# Git Hooks - OSM-Notes-API

Unified Git hooks for TypeScript/JavaScript projects in the OSM-Notes ecosystem.

## Overview

This project uses Husky for Git hooks management, ensuring code quality before commits and pushes. The hooks are designed to be consistent with other projects in the OSM-Notes ecosystem.

## Available Hooks

### Pre-commit Hook

**Location**: `.husky/pre-commit`

**Checks before each commit:**

1. ✅ **Prettier** - Code formatting (TypeScript/JavaScript)
2. ✅ **Prettier** - Formatting for Markdown, JSON, YAML, CSS, HTML
3. ✅ **Black/Ruff** - Python formatting (if Python files are staged)
4. ✅ **ESLint** - JavaScript/TypeScript linting
5. ✅ **TypeScript type checking** - Type validation

**Installation:**

Husky hooks are automatically installed when running `npm install` (via the `prepare` script).

**Manual installation:**

```bash
npm run prepare
```

**Bypass (not recommended):**

```bash
git commit --no-verify
```

### Pre-push Hook

**Location**: `.husky/pre-push`

**Executes before each push:**

1. ✅ **Type checking** - TypeScript validation
2. ✅ **Linting** - ESLint checks
3. ✅ **Unit tests** - Light mode tests (if available)

**Bypass:**

```bash
git push --no-verify
```

### Commit-msg Hook

**Location**: `.husky/commit-msg`

**Validates commit message format:**

- Ensures commit messages follow Conventional Commits format
- Uses commitlint for validation

**Format**: `<type>(<scope>): <subject>`

**Types**: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

## Unified Structure

TypeScript/JavaScript projects in the OSM-Notes ecosystem use Husky:

- **OSM-Notes-API** ✅ (Husky)

This ensures consistent code quality standards across all projects.

## Requirements

The hooks require:

- Node.js and npm
- Project dependencies installed (`npm install`)

## Notes

- Hooks are automatically installed via Husky's `prepare` script
- CI/CD uses GitHub Actions workflows for additional validation
- Pre-push hook runs light tests for faster feedback
