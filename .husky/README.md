# Husky Git Hooks

This directory contains Git hooks managed by [Husky](https://typicode.github.io/husky/).

## Available Hooks

### pre-commit

Runs before each commit to ensure code quality:

- **ESLint**: Lints TypeScript/JavaScript files and auto-fixes issues
- **Prettier**: Formats code, removes trailing whitespace
- **JSON/YAML**: Validates and formats configuration files

### commit-msg

Validates commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
```

## What Gets Checked

| File Type       | Checks            |
| --------------- | ----------------- |
| `*.ts, *.tsx`   | ESLint + Prettier |
| `*.js, *.jsx`   | ESLint + Prettier |
| `*.json`        | Prettier          |
| `*.yml, *.yaml` | Prettier          |
| `*.md`          | Prettier          |
| `*.css, *.scss` | Prettier          |

## Bypassing Hooks

In emergency situations, you can bypass hooks with:

```bash
git commit --no-verify -m "emergency fix"
```

**Note**: This should be used sparingly and only when necessary.

## Manual Commands

```bash
# Run lint-staged manually
pnpm lint-staged

# Format all files
pnpm format

# Check formatting without writing
pnpm format:check

# Lint all files
pnpm lint
```
