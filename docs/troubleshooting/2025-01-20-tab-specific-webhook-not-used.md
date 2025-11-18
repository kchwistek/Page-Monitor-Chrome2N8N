# Issue: Tab-Specific Webhook Configuration Not Used

## Date
2025-01-20

## Problem Description
End user reported that tab-specific webhook configuration is not being taken into consideration. When the global webhook is not set properly, per-tab actions are failing even when a tab-specific webhook is configured.

## Symptoms
- **IS**: Tab-specific webhook URLs entered in the popup form are not being used when sending data to webhooks
- **IS NOT**: Tab-specific webhook URLs should be used when configured, falling back to global webhook only when tab-specific is not set
- **IS**: When global webhook is not set or invalid, monitoring fails even if tab-specific webhook is configured
- **IS NOT**: Should work with tab-specific webhook even when global webhook is missing/invalid

## Environment
- Chrome Extension (Manifest V3)
- Background service worker: `src/background/background.js`
- Popup UI: `src/popup/popup.js`

## Troubleshooting Steps

### Step 1: Verify Webhook URL Flow
1. Checked `src/popup/popup.js` - Confirmed that `webhookUrl` is correctly sent in the config object (line 285)
2. Checked `src/background/background.js` - Found that `sendContentToWebhook` function (lines 155-203) correctly implements the fallback logic:
   - First checks for tab-specific webhook from config
   - Falls back to global webhook if tab-specific is not set
3. Checked `handleStartMonitoring` function (lines 507-532) - **ROOT CAUSE IDENTIFIED**

### Step 2: Root Cause Analysis
**Problem**: In `handleStartMonitoring` function, when creating the config object to pass to `startMonitoring`, the `webhookUrl` property from `configData` is NOT included.

**Evidence**:
- Popup sends: `webhookUrl: webhookUrl || null` (line 285 of popup.js)
- `handleStartMonitoring` receives `configData` with `webhookUrl` property
- But when creating the config object (lines 519-525), only these properties are included:
  - `selector`
  - `refreshInterval`
  - `changeDetection`
  - `contentType`
  - `url`
- **Missing**: `webhookUrl`

**Impact**: 
- Tab-specific webhook URL is never saved to the monitoring config
- When `sendContentToWebhook` tries to retrieve `config?.webhookUrl`, it's always `undefined`
- Falls back to global webhook, which may be missing or invalid
- Results in failure even when tab-specific webhook is properly configured

### Step 3: Verify Other Code Paths
- Checked `src/background/page-monitor.js` - This file has an old implementation that only uses global webhook, but it's not used (manifest.json points to `background.js`)
- Verified `sendContentToWebhook` implementation is correct and ready to use tab-specific webhook once it's saved

## Root Cause
The `handleStartMonitoring` function in `src/background/background.js` does not include `webhookUrl` in the config object it creates, even though:
1. The popup correctly sends it
2. The `sendContentToWebhook` function correctly checks for it
3. The storage functions are ready to save it

## Resolution
Two fixes were applied:

### Fix 1: Save webhookUrl in handleStartMonitoring
Only include `webhookUrl` in the config if it's a valid non-empty string. This prevents saving `null` or empty strings.

### Fix 2: Improved validation in sendContentToWebhook
Enhanced validation to properly check for valid webhook URLs (non-empty strings) before falling back to global webhook.

## Fix Implementation

### Fix 1: handleStartMonitoring (lines 519-530)
```javascript
const config = {
  selector: configData.selector,
  refreshInterval: configData.refreshInterval || 30000,
  changeDetection: configData.changeDetection !== false,
  contentType: configData.contentType || 'html',
  url: configData.url || request.url || sender.tab?.url
};

// Only include webhookUrl if it's a non-empty string (null/empty means use global)
if (configData.webhookUrl && typeof configData.webhookUrl === 'string' && configData.webhookUrl.trim()) {
  config.webhookUrl = configData.webhookUrl.trim();
}
```

### Fix 2: sendContentToWebhook (lines 161-178)
```javascript
// Only use tab-specific webhook if it's a valid non-empty string
if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
  // Fall back to global webhook
  const storage = await chrome.storage.local.get('webhookUrl');
  webhookUrl = storage.webhookUrl;
  
  // Validate webhook URL after checking both tab-specific and global
  if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim() || webhookUrl === 'YOUR_N8N_WEBHOOK_URL') {
    console.error('No webhook URL configured. Tab config:', config, 'Global webhook:', storage.webhookUrl);
    return { success: false, message: 'No webhook URL set. Please configure it in the monitoring settings or extension options.' };
  }
} else {
  // Tab-specific webhook is set, validate it
  if (webhookUrl === 'YOUR_N8N_WEBHOOK_URL') {
    console.error('Invalid webhook URL in tab config:', config);
    return { success: false, message: 'Invalid webhook URL configured. Please update it in the monitoring settings.' };
  }
}
```

This ensures that:
1. Tab-specific webhook URLs are saved to the monitoring config only when they're valid non-empty strings
2. `sendContentToWebhook` can retrieve and use tab-specific webhooks correctly
3. Per-tab monitoring works independently of global webhook configuration
4. `null` or empty webhook URLs are not saved, allowing proper fallback to global webhook

## Additional Fix: Send Now Button

**Issue Found**: The "Send Now" button was not using the webhook URL from the popup form input field. It only checked the saved monitoring config or global webhook.

**Fix Applied**: Modified `sendNow` in popup.js to pass the webhook URL from the form input, and updated `handleSendContentNow` and `sendContentToWebhook` to accept and use an override webhook URL parameter.

### Fix 3: sendNow in popup.js (lines 403-411)
```javascript
// Get webhook URL from input field (if provided)
const webhookUrl = this.webhookUrlInput.value.trim() || null;

const sendResponse = await Promise.race([
  chrome.runtime.sendMessage({
    action: 'sendContentNow',
    tabId: this.currentTabId,
    data: response,
    webhookUrl: webhookUrl // Pass webhook URL from form
  }),
  // ...
]);
```

### Fix 4: sendContentToWebhook signature (line 156)
Added optional `overrideWebhookUrl` parameter to prioritize webhook URL from form input over saved config.

## Additional Notes
- If monitoring was started before this fix, the user may need to stop and restart monitoring for the webhook URL to be saved correctly
- The "Send Now" button now uses the webhook URL from the popup form input field if provided
- Check browser console for detailed error messages showing which webhook (tab-specific vs global) is being checked

## Debugging Steps Added

Comprehensive debugging has been added to trace the webhook URL flow:

1. **Popup (sendNow)**: Logs raw input value, trimmed value, and element details
2. **Background (handleSendContentNow)**: Logs the request object and webhook URL value
3. **Background (sendContentToWebhook)**: Logs the entire decision tree for webhook URL selection

### How to Debug:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Open extension popup
4. Enter webhook URL in the input field
5. Click "Send" button
6. Check console for debug messages starting with `=== Send Now Debug ===`, `=== handleSendContentNow Debug ===`, and `=== sendContentToWebhook Debug ===`

### Expected Flow:
1. Popup reads webhook URL from input field
2. Popup sends it in the `sendContentNow` message
3. Background receives it and passes to `sendContentToWebhook` as `overrideWebhookUrl`
4. `sendContentToWebhook` uses override if valid, otherwise falls back to config/global

### Common Issues:
- **Extension not reloaded**: Service worker needs to be reloaded for changes to take effect
- **Input field empty**: Check if profile loading or status loading is clearing the input
- **Value not being passed**: Check console logs to see if webhook URL is in the request object

