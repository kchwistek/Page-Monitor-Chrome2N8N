# Issue: Content Script Connection Error on Monitor Start

## Date
2025-01-22

## Problem Description
When starting monitoring, the extension fails with the error: "Error sending initial extraction request: Error: Could not establish connection. Receiving end does not exist." This error occurs at line 516 in `src/background/background.js` when attempting to send the initial content extraction message to the content script.

## Symptoms

### IS (What is happening)
- Error message: "Error sending initial extraction request: Error: Could not establish connection. Receiving end does not exist."
- Error occurs when starting monitoring from the popup or monitor page
- Error appears in background script console
- Monitoring interval is still set up (monitoring continues)
- Manual "Send Now" button works correctly (user reported "testing sent works well!")

### IS NOT (What should happen)
- Initial extraction should succeed when starting monitoring
- Content script should be available for communication
- No connection errors should occur

## Environment
- Chrome Version: Latest (Manifest V3)
- Extension Version: 1.0.1
- Operating System: Windows 10
- Affected Pages/Components: Background service worker, content script injection
- Specific URLs: All web pages when starting monitoring

## Troubleshooting Steps

### Step 1: Initial Investigation
- **Checked error location**: Error occurs at line 516 in `src/background/background.js`
- **Reviewed code**: `startMonitoring()` function immediately sends message to content script without verification
- **Compared with working code**: Popup and monitor pages have `ensureContentScriptLoaded()` functions that work correctly
- **Result**: Background script lacks content script verification before sending messages

### Step 2: Hypothesis Testing

- **Hypothesis 1**: Content script is not loaded when `startMonitoring()` is called
  - Test: Checked manifest.json - content script is registered with `run_at: "document_end"`
  - Result: Content script may not be loaded yet, especially for newly opened tabs or during page transitions
  - **Confirmed**: This is the root cause

- **Hypothesis 2**: Content script needs to be dynamically injected
  - Test: Reviewed `popup.js` and `monitor.js` - both use `chrome.scripting.executeScript` as fallback
  - Result: Dynamic injection is needed when content script isn't loaded from manifest
  - **Confirmed**: Dynamic injection pattern works in other components

- **Hypothesis 3**: Need to verify content script before sending messages
  - Test: Implemented ping mechanism (already exists in content script)
  - Result: Ping can verify if content script is loaded
  - **Confirmed**: Ping pattern is already used in popup and monitor pages

### Step 3: Root Cause Analysis
- **Distinctions identified**: 
  - Popup/monitor pages: Verify content script before use → Works correctly
  - Background script: Sends message immediately → Fails with connection error
- **What changed recently**: No recent changes, this was a pre-existing issue
- **Unique characteristics**: Background script starts monitoring programmatically, may happen before content script is ready

## Evidence

### Error Messages
```
Error sending initial extraction request: Error: Could not establish connection. Receiving end does not exist.
```

### Code Location
```506:517:src/background/background.js
  // Initial content extraction
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: 'extractContent',
      selector: config.selector,
      contentType: config.contentType || 'html',
      tabId,
      validateContent: true
    });
  } catch (error) {
    console.error('Error sending initial extraction request:', error);
  }
```

### Working Pattern (from popup.js)
```443:474:src/popup/popup.js
  async ensureContentScriptLoaded() {
    if (!this.currentTabId) return false;

    try {
      const tab = await chrome.tabs.get(this.currentTabId);
      if (!this.isValidWebPage(tab.url)) {
        return false;
      }
      await chrome.tabs.sendMessage(this.currentTabId, { action: 'ping' });
      return true;
    } catch (error) {
      if (error.message.includes('Could not establish connection')) {
        try {
          const tab = await chrome.tabs.get(this.currentTabId);
          if (!this.isValidWebPage(tab.url)) {
            return false;
          }
          await chrome.scripting.executeScript({
            target: { tabId: this.currentTabId },
            files: ['src/content-scripts/page-monitor-content.js']
          });
          await new Promise(resolve => setTimeout(resolve, 200));
          await chrome.tabs.sendMessage(this.currentTabId, { action: 'ping' });
          return true;
        } catch (injectError) {
          console.error('Failed to inject content script:', injectError);
          return false;
        }
      }
      throw error;
    }
  }
```

## Root Cause
The `startMonitoring()` function in the background script attempts to send a message to the content script immediately without first verifying that the content script is loaded. The content script may not be available if:
1. The tab was just opened and the content script hasn't been injected yet
2. The page is still loading
3. The content script failed to load from manifest registration

The popup and monitor pages already have `ensureContentScriptLoaded()` functions that handle this correctly, but the background script was missing this verification step.

## Resolution

### Code Changes

1. **Added helper functions to `src/background/background.js`**:
   - `isValidWebPage(url)`: Validates URLs are web pages
   - `ensureContentScriptLoaded(tabId)`: Verifies and injects content script if needed

2. **Updated `startMonitoring()` function**:
   - Calls `ensureContentScriptLoaded()` before initial extraction
   - Only sends extraction message if content script is loaded
   - Logs warning if content script couldn't be loaded (monitoring still starts)

3. **Enhanced `ensureContentScriptLoaded()` function** (Additional fix):
   - Increased wait time after injection from 200ms to 500ms
   - Added retry logic for ping verification (up to 3 retries with 300ms delays)
   - More robust verification that content script is fully initialized

4. **Added retry logic to initial extraction** (Additional fix):
   - Retries up to 5 times if connection error occurs
   - Re-verifies content script is loaded before each retry attempt
   - 500ms delay between retries
   - 300ms initial delay before first attempt to ensure content script is ready

### Implementation Details

```473:592:src/background/background.js
/**
 * Check if URL is a valid web page
 * @param {string} url - URL to check
 * @returns {boolean} True if valid web page
 */
function isValidWebPage(url) {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Ensure content script is loaded, inject if necessary
 * @param {number} tabId - Tab ID
 * @returns {Promise<boolean>} True if content script is loaded
 */
async function ensureContentScriptLoaded(tabId) {
  // ... verification and injection logic ...
}

// Updated startMonitoring() to use ensureContentScriptLoaded()
```

### Additional Fixes Applied

After initial fix, the error persisted due to race conditions:
- **Issue**: Even though ping succeeded, `extractContent` message could still fail
- **Root Cause**: Content script message listeners might not be fully initialized when ping works
- **Solution**: Added retry logic with re-verification before each attempt

### Testing
- ✅ No more connection errors when starting monitoring
- ✅ Content script is automatically injected if missing
- ✅ Initial extraction works correctly with retry logic
- ✅ Monitoring starts successfully even if initial extraction is skipped
- ✅ Pattern matches popup and monitor page implementations
- ✅ Retry mechanism handles race conditions and timing issues

## Prevention
- Always verify content script is loaded before sending messages
- Use the `ensureContentScriptLoaded()` pattern consistently across all components
- Consider adding this check to other message-sending operations if needed

## Related Issues
- Issue #1: Tab-Specific Webhook Configuration Not Used
- Issue #2: Monitor Setting Not Restored on Browser Refresh

