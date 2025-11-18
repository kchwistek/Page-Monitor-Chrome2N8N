# Issue #2 Fix Summary: Monitor Setting Not Restored on Browser Refresh

## Problem Description
When the browser is refreshed (or the extension service worker restarts), and a tab is reopened, the monitor setting is not restored. Monitoring stops even though the configuration was saved to persistent storage.

## Root Cause
The service worker does not restore monitoring state from persistent storage on startup. The `monitoringIntervals` Map is stored in-memory only and is lost when the service worker restarts, even though monitoring configurations are persisted in `chrome.storage.local`.

**Key Issues:**
1. `monitoringIntervals` Map (line 11) is in-memory only - lost on service worker restart
2. Monitoring configs are saved to `chrome.storage.local` with `enabled: true` flag
3. No restoration logic existed in `onStartup` or `onInstalled` listeners
4. Tab IDs may change after browser restart, requiring URL-based matching

## Fix Implementation

### Changes Made to `src/background/background.js`

1. **Added `restoreMonitoringState()` function** (lines 49-114):
   - Loads all monitoring configs from `chrome.storage.local`
   - Filters for configs with `enabled: true`
   - Matches saved configs to open tabs by URL (handles tab ID changes)
   - Updates config's `tabId` if it changed after browser restart
   - Calls `startMonitoring()` to restore the interval for each matching tab

2. **Updated startup listeners** (lines 116-126):
   - `chrome.runtime.onStartup`: Now calls `restoreMonitoringState()` before `updateIconState()`
   - `chrome.runtime.onInstalled`: Now calls `restoreMonitoringState()` before `updateIconState()`

### Key Features

- **URL-based matching**: Uses `normalizeUrl()` to match saved configs to reopened tabs, handling tab ID changes
- **Tab ID updates**: Automatically updates config's `tabId` if it changed after browser restart
- **Selective restoration**: Only restores configs with `enabled: true` flag
- **Error handling**: Wrapped in try/catch to prevent startup failures
- **Logging**: Console logs help debug restoration process

## How It Works

1. Service worker starts (browser refresh/restart)
2. `restoreMonitoringState()` is called automatically
3. Loads all saved monitoring configs from storage
4. Gets all open web tabs (filters out chrome:// and extension pages)
5. For each enabled config:
   - Finds matching tab by comparing normalized URLs
   - Updates tabId if it changed
   - Calls `startMonitoring()` to recreate the interval
6. Updates icon state to reflect restored monitoring

## Files Modified
- `src/background/background.js` - Added restoration function and updated startup listeners
- `docs/troubleshooting/2025-01-21-monitor-not-restored-on-browser-refresh.md` - Complete troubleshooting documentation

## Testing
After reloading the extension:
- ✅ Monitoring configs are restored from storage on service worker startup
- ✅ Monitoring continues automatically after browser refresh
- ✅ Tab ID changes are handled correctly (matching by URL)
- ✅ Multiple monitored tabs are restored correctly
- ✅ Icon state updates to show active monitoring

## Status
✅ **RESOLVED** - Monitoring state is now restored automatically on browser refresh/service worker restart.

