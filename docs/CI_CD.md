# CI/CD Documentation

This document describes the Continuous Integration and Continuous Deployment setup for the Page Monitor to n8n Chrome extension.

## 🔧 Git Hooks

### Pre-commit Hook

The pre-commit hook runs automatically before each commit to ensure code quality:

**Checks performed:**
- ✅ Validates `manifest.json` structure and required fields
- ✅ Checks for `console.log` statements (warns, doesn't block)
- ✅ Validates file sizes (warns about large files)
- ✅ Scans for potential sensitive data (API keys, secrets, etc.)

**Location:** `.git/hooks/pre-commit`

**To bypass (not recommended):**
```bash
git commit --no-verify
```

### Pre-push Hook

The pre-push hook runs automatically before pushing to remote:

**Checks performed:**
- ✅ Validates `manifest.json`
- ✅ Runs test suite (`npm test`)
- ✅ Builds the extension package
- ✅ Verifies package can be created successfully

**Location:** `.git/hooks/pre-push`

**To bypass (not recommended):**
```bash
git push --no-verify
```

### Setting Up Hooks

For new contributors or after cloning the repository:

```bash
npm run setup-hooks
```

Or manually:
```bash
bash scripts/setup-hooks.sh
```

This will:
- Create `.git/hooks/` directory if it doesn't exist
- Install pre-commit and pre-push hooks
- Make hooks executable

## 🚀 GitHub Actions Workflows

### CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main`, `master`, or `develop` branches.

**Jobs:**

1. **Validate** - Validates extension configuration
   - Checks `manifest.json` syntax
   - Validates extension structure
   - Verifies all required files exist

2. **Test** - Runs test suite
   - Executes unit tests
   - Runs Jest tests
   - Generates test coverage reports
   - Uploads coverage to Codecov (if configured)

3. **Build** - Creates extension package
   - Builds the extension package
   - Verifies package contents
   - Uploads package as artifact

4. **Lint** - Code quality checks
   - Checks for `console.log` statements
   - Validates file sizes
   - Code quality checks

5. **Security** - Security checks
   - Runs `npm audit` for dependency vulnerabilities
   - Scans for sensitive data in code

6. **Publish Check** - Validates publish readiness
   - Verifies all required files exist
   - Checks icon files are present
   - Validates version format (semver)

**View workflow runs:**
- Go to: `https://github.com/kchwistek/Page-Monitor-Chrome2N8N/actions`

### Release Workflow (`.github/workflows/release.yml`)

Runs when:
- A tag matching `v*.*.*` is pushed
- Manually triggered via workflow_dispatch

**Actions:**
- Validates extension
- Builds release package
- Creates GitHub Release
- Attaches package to release
- Generates release notes

**To create a release:**

1. **Using tags:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Using GitHub UI:**
   - Go to Actions → Release Workflow
   - Click "Run workflow"
   - Enter version number
   - Click "Run workflow"

## 📊 Workflow Status Badges

Add these badges to your README:

```markdown
![CI](https://github.com/kchwistek/Page-Monitor-Chrome2N8N/workflows/CI%2FCD%20Pipeline/badge.svg)
![Release](https://github.com/kchwistek/Page-Monitor-Chrome2N8N/workflows/Release%20Workflow/badge.svg)
```

## 🔍 Local Testing

### Test CI Checks Locally

```bash
# Test pre-commit hook
npm run precommit

# Test pre-push hook
npm run prepush

# Run all validation
npm run build-config

# Run tests
npm test

# Build package
npm run package
```

## 🛠️ Troubleshooting

### Hooks Not Running

1. **Check if hooks are executable:**
   ```bash
   ls -la .git/hooks/
   ```
   Should show `-rwxr-xr-x` (executable)

2. **Reinstall hooks:**
   ```bash
   npm run setup-hooks
   ```

3. **Check git version:**
   ```bash
   git --version
   ```
   Should be 2.9+ for hooks to work properly

### CI Pipeline Failing

1. **Check workflow logs:**
   - Go to GitHub Actions tab
   - Click on failed workflow run
   - Review job logs

2. **Common issues:**
   - Missing dependencies → Check `package.json`
   - Test failures → Run tests locally
   - Manifest errors → Run `npm run build-config`
   - Missing files → Verify all required files exist

### Bypassing Hooks (Emergency Only)

**Pre-commit:**
```bash
git commit --no-verify -m "Emergency commit"
```

**Pre-push:**
```bash
git push --no-verify
```

⚠️ **Warning:** Only use `--no-verify` in emergencies. It bypasses important quality checks.

## 📝 Best Practices

1. **Always run hooks locally** before pushing
2. **Fix failing tests** before committing
3. **Keep hooks updated** with project requirements
4. **Review CI logs** regularly
5. **Don't bypass hooks** unless absolutely necessary
6. **Update hooks** when adding new checks

## 🔄 Updating Hooks

To update hooks:

1. Edit hook files in `scripts/hooks/`
2. Run `npm run setup-hooks` to reinstall
3. Test hooks with `npm run precommit` or `npm run prepush`
4. Commit changes to repository

## 📚 Additional Resources

- [Git Hooks Documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)

---

**Last Updated:** CI/CD setup complete

