# 🚀 Release Guide

This guide covers how to release the Page Monitor to n8n extension.

## 📦 Release Options

You have two main release options:

1. **GitHub Release** - Create a tagged release on GitHub (automatic package creation)
2. **Chrome Web Store** - Submit to Chrome Web Store for public distribution

---

## Option 1: GitHub Release (Recommended First Step)

### Step 1: Update Version

Update the version in `manifest.json`:

```json
{
  "version": "1.0.0"  // Change to your new version (e.g., "1.0.1", "1.1.0", "2.0.0")
}
```

### Step 2: Commit and Push Changes

```bash
# Stage changes
git add manifest.json

# Commit
git commit -m "Release v1.0.0"

# Push to remote
git push origin main
```

### Step 3: Create and Push Tag

```bash
# Create a tag (use the same version as in manifest.json)
git tag v1.0.0

# Push the tag
git push origin v1.0.0
```

### Step 4: GitHub Actions Will Automatically:

- ✅ Validate the extension
- ✅ Build the release package
- ✅ Create a GitHub Release
- ✅ Attach the package to the release
- ✅ Generate release notes

**View the release:**
- Go to: `https://github.com/kchwistek/Page-Monitor-Chrome2N8N/releases`
- Or check Actions: `https://github.com/kchwistek/Page-Monitor-Chrome2N8N/actions`

### Alternative: Manual Release via GitHub UI

1. Go to your repository on GitHub
2. Click "Releases" → "Create a new release"
3. Choose tag: `v1.0.0` (or create new tag)
4. Release title: `v1.0.0` or `Page Monitor to n8n v1.0.0`
5. Description: Add release notes
6. Upload the package file (if not using automatic workflow)
7. Click "Publish release"

---

## Option 2: Chrome Web Store Release

### Step 1: Create Package

**If you have `zip` installed:**

```bash
npm run package
```

This creates: `page-monitor-to-n8n-v1.0.0.zip`

**If you don't have `zip` installed:**

Install zip first:
```bash
# Ubuntu/Debian
sudo apt-get install zip

# macOS
brew install zip

# Then run
npm run package
```

**Or create manually:**

1. Create a folder: `extension-package`
2. Copy these files/folders:
   - `manifest.json`
   - `LICENSE`
   - `PRIVACY.md`
   - `src/` (entire directory)
   - `assets/` (entire directory)
3. Zip the contents (not the folder itself)

### Step 2: Chrome Web Store Developer Dashboard

1. **Go to Developer Dashboard**
   - Visit: https://chrome.google.com/webstore/devconsole
   - Sign in with your Google account
   - Pay the one-time $5 registration fee (if not already paid)

2. **Create New Item** (First Time)
   - Click "New Item"
   - Upload your zip file: `page-monitor-to-n8n-v1.0.0.zip`
   - Wait for upload and validation

3. **Update Existing Item** (Updates)
   - Find your extension in the dashboard
   - Click "Package" tab
   - Upload new zip file
   - Update version number

### Step 3: Fill Store Listing

**Required Information:**

- **Name:** `Page Monitor to n8n`
- **Summary:** `Monitor web pages and send content changes to your n8n webhook. Perfect for automation workflows.`
- **Description:** See [PUBLISHING.md](PUBLISHING.md) for full description template
- **Category:** Productivity
- **Privacy Policy URL:** 
  - GitHub: `https://raw.githubusercontent.com/kchwistek/Page-Monitor-Chrome2N8N/main/PRIVACY.md`
  - Or host on your own website

**Screenshots:**
- Create at least 1-3 screenshots (1280x800px or 640x400px)
- Show: Extension popup, settings page, monitoring in action

**Icons:**
- Small tile (128x128px): Use `assets/icons/icon128.png`
- Large tile (440x280px): Create promotional image

### Step 4: Submit for Review

1. Review all information
2. Check privacy policy is accessible
3. Verify all permissions are justified
4. Click "Submit for Review"

**Review Process:**
- Usually takes 1-3 business days
- Check dashboard for status updates

---

## 🔄 Updating a Release

### For GitHub Releases:

1. Update version in `manifest.json`
2. Commit and push changes
3. Create and push new tag:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
4. GitHub Actions will create the new release automatically

### For Chrome Web Store:

1. Update version in `manifest.json`
2. Create new package: `npm run package`
3. Go to Chrome Web Store Developer Dashboard
4. Find your extension → "Package" tab
5. Upload new zip file
6. Submit for review (updates usually review faster)

---

## 📋 Quick Release Checklist

### Before Releasing:

- [ ] Version updated in `manifest.json`
- [ ] All tests passing
- [ ] Extension tested locally
- [ ] No console errors
- [ ] Privacy policy accessible
- [ ] All icons present (16, 32, 48, 128px)
- [ ] README updated (if needed)
- [ ] Changelog updated (if maintaining one)

### For GitHub Release:

- [ ] Version committed and pushed
- [ ] Tag created and pushed
- [ ] Release notes prepared

### For Chrome Web Store:

- [ ] Package created (`npm run package`)
- [ ] Store listing information ready
- [ ] Screenshots prepared
- [ ] Privacy policy URL ready
- [ ] Permissions justified

---

## 🎯 Recommended Release Flow

1. **First Release:**
   - Create GitHub Release (v1.0.0)
   - Test the package from GitHub release
   - Submit to Chrome Web Store

2. **Subsequent Releases:**
   - Update version
   - Create GitHub Release
   - Update Chrome Web Store

---

## 📝 Version Numbering

Use [Semantic Versioning](https://semver.org/):

- **MAJOR** (2.0.0): Breaking changes
- **MINOR** (1.1.0): New features, backward compatible
- **PATCH** (1.0.1): Bug fixes, backward compatible

Examples:
- `1.0.0` → `1.0.1` (patch - bug fix)
- `1.0.0` → `1.1.0` (minor - new feature)
- `1.0.0` → `2.0.0` (major - breaking change)

---

## 🔗 Useful Links

- **GitHub Releases:** https://github.com/kchwistek/Page-Monitor-Chrome2N8N/releases
- **Chrome Web Store Dashboard:** https://chrome.google.com/webstore/devconsole
- **Publishing Guide:** [PUBLISHING.md](PUBLISHING.md)
- **CI/CD Documentation:** [docs/CI_CD.md](docs/CI_CD.md)

---

## 💡 Tips

1. **Test Before Release:** Always test the extension locally before releasing
2. **Version Consistency:** Keep version in `manifest.json` and git tag in sync
3. **Release Notes:** Write clear release notes describing changes
4. **Incremental Updates:** Start with GitHub releases, then submit to Chrome Web Store
5. **Monitor Reviews:** Check Chrome Web Store reviews and respond to feedback

---

**Ready to release?** Follow the steps above based on your release type!

