# Commit Message Guide

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

## Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Type (Required)

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

## Scope (Optional)

The scope specifies what part of the codebase is affected:
- `users`, `notes`, `countries`, `middleware`, `config`, etc.

## Subject (Required)

- Use imperative mood: "add" not "added" or "adds"
- No period at the end
- Maximum 72 characters (header max is 100 including type and scope)
- First letter lowercase

## Examples

### Simple Commit

```bash
git commit -m "feat: add user search endpoint"
```

### With Scope

```bash
git commit -m "feat(users): add search functionality"
```

### With Body

```bash
git commit -m "feat(users): add search endpoint

Implements search functionality for users with filters by country and activity level.

Closes #123"
```

### Multiple Changes

```bash
git commit -m "chore: configure commitlint and husky hooks

- Add commitlint configuration
- Setup husky pre-commit hook
- Setup husky commit-msg hook
- Add CI workflow for tests"
```

## Common Mistakes

### ❌ Too Long

```bash
# ❌ Header too long (212 characters)
git commit -m "Add configuration files for commit linting, Husky hooks, and Dependabot. Introduce CI workflows for testing, linting, and security audits. Update package dependencies and documentation for development guidelines."
```

### ✅ Correct

```bash
# ✅ Short and clear
git commit -m "chore: configure commitlint and development tools

- Add commitlint configuration
- Setup husky git hooks
- Add CI workflows
- Configure Dependabot"
```

### ❌ Missing Type

```bash
# ❌ Missing type
git commit -m "add new feature"
```

### ✅ Correct

```bash
# ✅ With type
git commit -m "feat: add new feature"
```

### ❌ Period at End

```bash
# ❌ Period at end
git commit -m "feat: add new feature."
```

### ✅ Correct

```bash
# ✅ No period
git commit -m "feat: add new feature"
```

## Tips

1. **Keep it short**: Subject should be concise (50-72 chars)
2. **Use body for details**: If you need more explanation, use the body
3. **Reference issues**: Use footer to close issues: `Closes #123`
4. **One change per commit**: Keep commits focused on one change

## Quick Reference

```bash
# Feature
git commit -m "feat(scope): add new feature"

# Bug fix
git commit -m "fix(scope): correct bug description"

# Documentation
git commit -m "docs: update README"

# Configuration
git commit -m "chore: update dependencies"
```

