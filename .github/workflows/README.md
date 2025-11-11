# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD.

## Workflows

### `ci.yml` - Continuous Integration

Runs on every push and pull request to main branches.

**Jobs:**
- Validate extension configuration
- Run test suite
- Build extension package
- Code quality checks
- Security scans
- Publish readiness validation

### `release.yml` - Release Workflow

Runs when:
- A version tag (v*.*.*) is pushed
- Manually triggered via workflow_dispatch

**Actions:**
- Builds release package
- Creates GitHub Release
- Attaches package to release

### `hooks-check.yml` - Git Hooks Verification

Runs when git hooks or setup scripts are modified.

**Actions:**
- Verifies hooks are properly configured
- Ensures hooks are executable

## Usage

### Triggering CI

CI runs automatically on:
- Push to `main`, `master`, or `develop` branches
- Pull requests to `main`, `master`, or `develop` branches
- Manual trigger via workflow_dispatch

### Creating a Release

**Using tags:**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**Using GitHub UI:**
1. Go to Actions → Release Workflow
2. Click "Run workflow"
3. Enter version number
4. Click "Run workflow"

## Viewing Workflow Runs

Visit: `https://github.com/kchwistek/Page-Monitor-Chrome2N8N/actions`

## Workflow Status

Add badges to README:
```markdown
![CI](https://github.com/kchwistek/Page-Monitor-Chrome2N8N/workflows/CI%2FCD%20Pipeline/badge.svg)
![Release](https://github.com/kchwistek/Page-Monitor-Chrome2N8N/workflows/Release%20Workflow/badge.svg)
```

