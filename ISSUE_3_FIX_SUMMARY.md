# Issue #3 Fix Summary: Content Script Connection Error on Monitor Start

## Problem Description
When starting monitoring, the extension fails with the error: "Error sending initial extraction request: Error: Could not establish connection. Receiving end does not exist." This occurs because the background script attempts to send a message to the content script before it's loaded or injected into the tab.

## Root Cause
The `startMonitoring()` function in `src/background/background.js` immediately tries to send a message to the content script for initial content extraction without first verifying that the content script is loaded. The content script may not be loaded if:
1. The tab was just opened and the content script hasn't been injected yet
2. The page is still loading
3. The content script failed to load from the manifest registration

**Key Issues:**
1. No verification that content script exists before sending messages
2. No dynamic injection fallback if content script isn't loaded
3. The popup and monitor pages have `ensureContentScriptLoaded()` functions, but the background script doesn't use this pattern

## Fix Implementation

### Changes Made to `src/background/background.js`

1. **Added `isValidWebPage()` helper function** (lines 478-481):
   - Validates that a URL is a valid web page (http/https)
   - Prevents attempts to inject scripts into chrome:// or extension pages

2. **Added `ensureContentScriptLoaded()` function** (lines 488-538):
   - Checks if content script is loaded by sending a ping message
   - If not loaded, dynamically injects the content script using `chrome.scripting.executeScript`
   - Waits 200ms for script initialization
   - Verifies injection was successful by pinging again
   - Returns `true` if content script is ready, `false` otherwise

3. **Updated `startMonitoring()` function** (lines 583-620):
   - Calls `ensureContentScriptLoaded()` before attempting initial extraction
   - Only sends extraction message if content script is successfully loaded
   - Logs a warning if content script couldn't be loaded (monitoring still starts, may work on refresh)
   - **Added retry logic** (up to 5 retries) for initial extraction to handle race conditions
   - Re-verifies content script is loaded before each retry attempt

4. **Enhanced `ensureContentScriptLoaded()` function** (Additional fix):
   - Increased wait time after injection from 200ms to 500ms
   - Added retry logic for ping verification (up to 3 retries with 300ms delays)
   - More robust verification that content script is fully initialized

### Key Features

- **Proactive verification**: Checks if content script exists before communication
- **Dynamic injection**: Automatically injects content script if missing
- **Error handling**: Gracefully handles cases where injection fails
- **Consistent pattern**: Matches the approach used in `popup.js` and `monitor.js`
- **Non-blocking**: Monitoring still starts even if initial extraction fails (will work on refresh)

## How It Works

1. `startMonitoring()` is called with tab ID and config
2. Configuration is saved to storage
3. `ensureContentScriptLoaded()` is called:
   - Validates tab URL is a web page
   - Sends ping message to check if content script is loaded
   - If connection fails, injects content script dynamically
   - Waits 500ms for initialization (increased from 200ms)
   - Verifies with ping (with retry logic - up to 3 attempts)
4. If content script is loaded, attempts initial extraction with retry logic:
   - Waits 300ms before first attempt
   - Re-verifies content script is loaded before each retry
   - Retries up to 5 times with 500ms delays if connection error occurs
5. Sets up refresh interval (monitoring continues regardless of initial extraction success)

## Additional Fixes (After Initial Implementation)

The initial fix resolved most cases, but race conditions could still cause errors:
- **Problem**: Ping could succeed but `extractContent` message could still fail
- **Solution**: Added retry logic with re-verification before each attempt
- **Result**: More robust handling of timing issues and race conditions

## Files Modified
- `src/background/background.js` - Added content script verification and injection logic
- `docs/troubleshooting/2025-01-22-content-script-connection-error.md` - Complete troubleshooting documentation

## Testing
After reloading the extension:
- ✅ No more "Could not establish connection" errors when starting monitoring
- ✅ Content script is automatically injected if not already loaded
- ✅ Initial extraction works correctly with retry logic handling race conditions
- ✅ Monitoring starts successfully even if initial extraction is skipped
- ✅ Pattern matches popup and monitor page implementations
- ✅ Retry mechanism handles timing issues and ensures content script is fully ready

## Status
✅ **RESOLVED** - Content script connection errors are now prevented by ensuring the script is loaded before communication.

