# Privacy Policy for Page Monitor to n8n Chrome Extension

**Last Updated:** November 10, 2025

## Overview

Page Monitor to n8n ("the Extension") is a Chrome browser extension developed by Karel Chwistek that allows users to monitor web pages and send content changes directly to their own n8n webhook instance. We are committed to protecting your privacy and being transparent about how the Extension works.

## Developer Information

**Developer:** Karel Chwistek  
**Contact:** k.chwistek@volny.cz  
**Extension Name:** Page Monitor to n8n

## Data Collection and Usage

### What Data We Collect

The Extension collects the following information from web pages **only when you explicitly configure monitoring or click "Send Now"**:

- **Page Content:**
  - HTML or text content from specified CSS selectors
  - Page URL being monitored
  - Timestamp of content extraction
  - CSS selector used for extraction

### How We Use Your Data

**Important:** We do not collect, store, or process any of your data on our servers.

When you use the Extension:

1. **Content is extracted** from the web page you are monitoring
2. **Content is sent directly** from your browser to your own n8n webhook URL
3. **No intermediate storage** occurs - data goes straight from your browser to your n8n instance
4. **We never see your data** - all processing happens client-side in your browser
5. **Change detection** uses SHA-256 hashing - only content hashes are stored locally, not the actual content

### Your n8n Webhook URL

- Your n8n webhook URL is stored **locally in your browser** using Chrome's storage API
- This URL **never leaves your device** except when your browser uses it to send page content
- We do not have access to your webhook URL
- You can delete this URL at any time through the extension settings

### Monitoring Configuration

- Your monitoring settings (CSS selectors, refresh intervals, etc.) are stored **locally in your browser**
- These settings **never leave your device**
- We do not have access to your monitoring configurations

## Data We Do NOT Collect

The Extension does NOT collect, store, or transmit:

- Your browsing history
- Your login credentials for any website
- Your personal messages or communications
- Your location data
- Your financial information
- Analytics or tracking data about your usage of the Extension
- Full page content (only extracts what you specify via CSS selector)

## Data Storage

- **Page Content:** Not stored permanently - sent directly to your n8n instance. Only content hashes are stored temporarily for change detection.
- **Webhook URL:** Stored locally in your browser only (chrome.storage.local)
- **Monitoring Configuration:** Stored locally in your browser only (chrome.storage.local)
- **Content Hashes:** Stored locally temporarily for change detection, deleted when monitoring stops

## Data Sharing and Third Parties

We do **NOT**:
- Sell your data to third parties
- Share your data with third parties
- Use your data for advertising
- Track your activity across websites
- Store your data on our servers

The only "third party" that receives data is **your own n8n instance** that you configure.

## Data Security

- All data transmission occurs directly between your browser and your n8n instance
- The Extension uses HTTPS for all webhook communications
- Your webhook URL and monitoring configuration are stored securely using Chrome's built-in storage API
- No data passes through our servers or infrastructure
- Content hashing uses SHA-256 cryptographic algorithm

## Your Rights and Control

You have complete control over your data:

- **Access:** All extracted content is visible to you before sending
- **Deletion:** Clear your webhook URL and monitoring configuration anytime through extension settings
- **Opt-out:** Simply don't start monitoring or click "Send Now" if you don't want to share page content
- **Uninstall:** Removing the extension deletes all locally stored data

## Children's Privacy

The Extension is not intended for use by children under 13 years of age. We do not knowingly collect data from children.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify users of any material changes by:
- Updating the "Last Updated" date at the top of this policy
- Providing notice through the Chrome Web Store listing (if published)

## Compliance

This Extension complies with:
- Chrome Web Store Developer Program Policies
- GDPR (General Data Protection Regulation)
- CCPA (California Consumer Privacy Act)

## Permissions Explanation

The Extension requires the following Chrome permissions:

- **activeTab:** To read page content when you configure monitoring or click "Send Now"
- **storage:** To save your n8n webhook URL and monitoring configuration locally in your browser
- **tabs:** To manage page refresh and monitoring across browser tabs
- **host_permissions (<all_urls>):** To monitor any website you choose

These permissions are used **only** for the stated purpose of monitoring pages and sending content to your n8n instance.

## Contact Us

If you have questions about this Privacy Policy or the Extension's data practices, please contact:

**Developer:** Karel Chwistek  
**Email:** k.chwistek@volny.cz

## Open Source

This Extension is open source. You can review the complete source code in the repository.

## Consent

By installing and using the Page Monitor to n8n Extension, you consent to this Privacy Policy.
