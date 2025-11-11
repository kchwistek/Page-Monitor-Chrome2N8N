# 📦 Publishing Guide - Chrome Web Store

This guide will help you publish the **Page Monitor to n8n** Chrome extension to the Chrome Web Store.

---

## ✅ Pre-Publishing Checklist

Before submitting, ensure you have:

- [x] **All icons** (16, 32, 48, 128px) in `assets/icons/`
- [x] **manifest.json** is valid and complete
- [x] **Privacy Policy** (`PRIVACY.md`) is ready and accessible
- [x] **LICENSE** file is included
- [x] Extension tested and working correctly
- [x] No console errors or warnings
- [x] All permissions are justified in the store listing
- [x] **Extension signing:** Not required - Chrome Web Store signs automatically (see [docs/SIGNING.md](docs/SIGNING.md))

---

## 📋 Step 1: Prepare the Package

### Option A: Using npm script (Recommended)

```bash
npm run package
```

This will:
1. Validate the extension configuration
2. Create a zip file: `page-monitor-to-n8n-v1.0.0.zip`
3. Exclude development files (node_modules, tests, docs, etc.)

### Option B: Manual Packaging

1. Create a new folder (e.g., `extension-package`)
2. Copy the following files/folders:
   - `manifest.json`
   - `LICENSE`
   - `PRIVACY.md`
   - `src/` (entire directory)
   - `assets/` (entire directory)
3. **Do NOT include:**
   - `node_modules/`
   - `tests/`
   - `docs/`
   - `scripts/`
   - `.git/`
   - `package.json`
   - `package-lock.json`
   - Any `.zip` files
4. Zip the folder contents (not the folder itself)

---

## 🚀 Step 2: Chrome Web Store Developer Dashboard

1. **Go to Chrome Web Store Developer Dashboard**
   - Visit: https://chrome.google.com/webstore/devconsole
   - Sign in with your Google account
   - Pay the one-time $5 registration fee (if not already paid)

2. **Create New Item**
   - Click "New Item"
   - Upload your zip file (`page-monitor-to-n8n-v1.0.0.zip`)
   - Wait for upload and validation to complete

---

## 📝 Step 3: Store Listing Information

Fill in the following information:

### Basic Information

- **Name:** `Page Monitor to n8n`
- **Summary:** `Monitor web pages and send content changes to your n8n webhook. Perfect for automation workflows.`
- **Description:** (Use the README.md content or see below)

### Detailed Description

```
🚀 Page Monitor to n8n - Chrome Extension

A powerful Chrome extension that monitors web pages and sends content changes to your own n8n webhook. Perfect for automation workflows, change detection, and content monitoring.

✨ Features:

🎯 Page Monitoring
• Monitor any website - Works on any web page
• Multiple tabs support - Monitor multiple tabs simultaneously with different configurations
• Automatic refresh - Configurable refresh intervals (minimum: 5 seconds)
• Change detection - Only sends content when it changes (optional)
• Flexible content extraction - Extract HTML or text from any CSS selector
• Smart content hashing - Uses SHA-256 to detect changes efficiently
• Content validation - Automatically waits for page content to fully load before sending
• Per-tab webhooks - Each monitored tab can send to a different webhook URL
• Monitoring profiles - Save and reuse monitoring configurations
• Visual indicators - Icon badge shows monitoring state of the active tab

🎯 Use Cases:
• Content Change Monitoring - Get notified when website content updates
• Price Tracking - Monitor product prices and get alerts on changes
• News Monitoring - Track news sites for new articles
• Status Page Monitoring - Monitor status pages for updates
• Automation Workflows - Trigger n8n workflows based on page changes
• Multi-Site Monitoring - Monitor multiple websites simultaneously

🔒 Privacy:
• Your webhook URL is stored locally in Chrome, never sent to third parties
• No page content is stored permanently (only hashes for change detection)
• Data is sent directly from your browser to your n8n instance
• Everything runs 100% in your browser
• We never see or store your webhook URL or page content

Made with ❤️ for better n8n workflows
```

### Category

- **Primary Category:** Productivity
- **Secondary Category:** Developer Tools (optional)

### Language

- Select: English (and any other languages you support)

---

## 🖼️ Step 4: Store Assets

### Small Tile (128x128px)
- Use: `assets/icons/icon128.png`

### Large Tile (440x280px)
- Create a promotional image showing the extension in action
- Recommended: Screenshot of the popup interface or a diagram showing the workflow

### Screenshots (1280x800px or 640x400px)
Create at least 1-3 screenshots showing:
1. Extension popup interface
2. Settings page
3. Example of monitoring in action

### Promotional Images (Optional)
- Small promotional tile (440x280px)
- Marquee promotional tile (920x680px)

---

## 🔒 Step 5: Privacy & Permissions

### Privacy Policy

- **Privacy Policy URL:** 
  - If hosting on GitHub: `https://raw.githubusercontent.com/KarelChwistek/Page-Monitor-Chrome2N8N/main/PRIVACY.md`
  - Or host on your own website

### Permissions Justification

For each permission, provide justification:

1. **activeTab**
   - "Needed to read page content when user configures monitoring or clicks 'Send Now'"

2. **storage**
   - "Needed to save user's n8n webhook URL and monitoring configuration locally in the browser"

3. **tabs**
   - "Needed to manage page refresh and monitoring across browser tabs"

4. **scripting**
   - "Needed to inject content scripts for page monitoring functionality"

5. **host_permissions (<all_urls>)**
   - "Needed to monitor any website the user chooses to monitor"

---

## 📊 Step 6: Distribution

### Visibility

- **Unlisted** (recommended for initial testing)
  - Only people with the link can install
  - Good for testing before public release
- **Public** (after testing)
  - Anyone can find and install from Chrome Web Store

### Regions

- Select regions where you want to distribute
- Or select "All regions"

---

## ✅ Step 7: Review & Submit

1. **Review all information** carefully
2. **Check for errors** in the store listing
3. **Verify privacy policy** is accessible
4. **Test the uploaded package** if possible
5. **Click "Submit for Review"**

---

## ⏱️ Review Process

- **Initial Review:** Usually 1-3 business days
- **Review Status:** Check dashboard for updates
- **Common Issues:**
  - Missing privacy policy
  - Unclear permission justifications
  - Screenshots don't match functionality
  - Description doesn't match extension behavior

---

## 🔄 Step 8: Updates & Maintenance

### Updating the Extension

1. **Update version** in `manifest.json`
2. **Create new package:** `npm run package`
3. **Upload new zip** in Developer Dashboard
4. **Submit for review** (updates usually review faster)

### Version Numbering

- Use semantic versioning: `MAJOR.MINOR.PATCH`
- Example: `1.0.0` → `1.0.1` (patch), `1.1.0` (minor), `2.0.0` (major)

---

## 📞 Support & Resources

### Chrome Web Store Resources

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)

### Extension Resources

- **Repository:** https://github.com/KarelChwistek/Page-Monitor-Chrome2N8N
- **Issues:** https://github.com/KarelChwistek/Page-Monitor-Chrome2N8N/issues
- **Developer:** Karel Chwistek (k.chwistek@volny.cz)

---

## 🎉 After Publishing

1. **Share the link** with users
2. **Monitor reviews** and respond to feedback
3. **Track analytics** in the Developer Dashboard
4. **Plan updates** based on user feedback

---

## 📝 Notes

- The extension uses Manifest V3 (required for new extensions)
- All data is processed locally - no server-side processing
- Privacy-first design - minimal data collection
- Open source - users can review the code

---

**Good luck with your submission! 🚀**

