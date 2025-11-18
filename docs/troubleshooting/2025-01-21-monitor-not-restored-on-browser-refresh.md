# Issue: Monitor Setting Not Restored When Browser is Refreshed / Tab Reopened

## Date
2025-01-21

## Problem Description
When the browser is refreshed (or the extension service worker restarts), and a tab is reopened, the monitor setting is not restored. Monitoring stops even though the configuration was saved.

## Symptoms
- **IS**: When browser is refreshed, monitoring stops
- **IS NOT**: Monitoring should continue after browser refresh if it was active before
- **IS**: Monitoring configurations are saved to `chrome.storage.local` (persistent storage)
- **IS NOT**: Monitoring intervals are restored from storage on service worker startup
- **IS**: Service worker restarts lose in-memory state (`monitoringIntervals` Map)
- **IS NOT**: Service worker should restore monitoring intervals from saved configs on startup

## Environment
- Chrome Extension (Manifest V3)
- Background service worker: `src/background/background.js`
- Service workers are terminated when idle and restarted when needed
- Tab IDs may change when browser is restarted (tabs are restored but may get new IDs)

## Troubleshooting Steps

### Step 1: Understand Service Worker Lifecycle
1. **Service Worker Behavior**: In Manifest V3, service workers are terminated when idle and restarted when needed
2. **In-Memory State**: The `monitoringIntervals` Map (line 11) is stored in memory and lost on service worker restart
3. **Persistent State**: Monitoring configs are saved to `chrome.storage.local` via `saveMonitoringConfig()` (lines 88-97)
4. **Startup Handlers**: `chrome.runtime.onStartup` (line 50) and `chrome.runtime.onInstalled` (line 55) only call `updateIconState()`, they don't restore monitoring

### Step 2: Identify Root Cause
**Problem**: There is no code to restore monitoring intervals from storage when the service worker starts.

**Evidence**:
- `monitoringIntervals` is a `Map` stored in memory (line 11)
- Configs are saved to storage with `enabled: true` flag (line 430)
- On service worker restart, `monitoringIntervals` is empty
- No restoration logic exists in `onStartup` or `onInstalled` listeners

**Impact**:
- User starts monitoring a tab → config saved to storage, interval created in memory
- Browser refreshes → service worker restarts → `monitoringIntervals` Map is empty
- Config still exists in storage, but no interval is running
- Monitoring appears stopped even though config says `enabled: true`

### Step 3: Additional Challenge - Tab ID Changes
When browser restarts, Chrome may restore tabs but assign new tab IDs. We need to:
1. Match saved configs to reopened tabs by URL (using `initialUrl` or `url` from config)
2. Update the config's `tabId` to the new tab ID
3. Start monitoring with the new tab ID

### Step 4: Verify Current Code Flow
1. **Start Monitoring**: `startMonitoring()` saves config to storage and creates interval in memory
2. **Service Worker Restart**: `monitoringIntervals` Map is reinitialized as empty
3. **No Restoration**: No code checks storage for enabled configs and restarts monitoring
4. **Result**: Monitoring is lost

## Root Cause
The service worker does not restore monitoring state from persistent storage on startup. The `monitoringIntervals` Map is in-memory only and is lost when the service worker restarts, even though the monitoring configurations are persisted in `chrome.storage.local`.

## Resolution Plan

### Fix 1: Add Restoration Function
Create a `restoreMonitoringState()` function that:
1. Loads all monitoring configs from storage
2. Filters for configs with `enabled: true`
3. For each enabled config:
   - Finds the matching tab by URL (handles tab ID changes)
   - Updates the config's `tabId` if it changed
   - Calls `startMonitoring()` to restore the interval

### Fix 2: Call Restoration on Startup
Add restoration logic to `chrome.runtime.onStartup` and `chrome.runtime.onInstalled` listeners.

### Fix 3: Handle Tab Matching
When matching saved configs to tabs:
- Use `normalizeUrl()` to compare URLs (already exists, line 389)
- Match by `initialUrl` or `url` from config
- Update `tabId` in config if it changed
- Only restore if tab still exists and URL matches

## Implementation Details

### Restoration Function
```javascript
/**
 * Restore monitoring state from storage on service worker startup
 */
async function restoreMonitoringState() {
  try {
    const result = await chrome.storage.local.get(['monitoringConfig']);
    const configs = result.monitoringConfig || {};
    
    if (Object.keys(configs).length === 0) {
      console.log('No monitoring configs to restore');
      return;
    }
    
    // Get all open tabs
    const tabs = await chrome.tabs.query({});
    const webTabs = tabs.filter(tab => {
      const url = tab.url || '';
      return url && !url.startsWith('chrome-extension://') && 
             !url.startsWith('chrome://') && 
             (url.startsWith('http://') || url.startsWith('https://'));
    });
    
    // Restore monitoring for each saved config
    for (const [savedTabId, config] of Object.entries(configs)) {
      if (!config.enabled) {
        continue; // Skip disabled configs
      }
      
      // Find matching tab by URL
      const targetUrl = config.initialUrl || config.url;
      if (!targetUrl) {
        console.warn(`Config for tab ${savedTabId} has no URL, skipping`);
        continue;
      }
      
      const normalizedTarget = normalizeUrl(targetUrl);
      const matchingTab = webTabs.find(tab => {
        const normalizedTab = normalizeUrl(tab.url || '');
        return normalizedTab === normalizedTarget;
      });
      
      if (matchingTab) {
        const currentTabId = matchingTab.id;
        
        // Update tabId if it changed
        if (parseInt(savedTabId) !== currentTabId) {
          console.log(`Tab ID changed: ${savedTabId} -> ${currentTabId}, updating config`);
          // Remove old config, will be recreated with new tabId
          delete configs[savedTabId];
          await chrome.storage.local.set({ monitoringConfig: configs });
        }
        
        // Restore monitoring with current tab ID
        console.log(`Restoring monitoring for tab ${currentTabId} (URL: ${targetUrl})`);
        await startMonitoring(currentTabId, config);
      } else {
        console.log(`No matching tab found for URL: ${targetUrl}, config not restored`);
      }
    }
    
    await updateIconState();
  } catch (error) {
    console.error('Error restoring monitoring state:', error);
  }
}
```

### Update Startup Listeners
```javascript
chrome.runtime.onStartup.addListener(async () => {
  await restoreMonitoringState();
  await updateIconState();
});

chrome.runtime.onInstalled.addListener(async () => {
  await restoreMonitoringState();
  await updateIconState();
});
```

## Testing Plan
1. Start monitoring on a tab
2. Refresh the browser (or restart Chrome)
3. Verify monitoring continues automatically
4. Test with multiple monitored tabs
5. Test with tab ID changes (close and reopen tab)
6. Verify icon state updates correctly

## Fix Implementation

### Changes Made to `src/background/background.js`

1. **Added `restoreMonitoringState()` function** (lines 49-114):
   - Loads all monitoring configs from `chrome.storage.local`
   - Filters for configs with `enabled: true`
   - Matches saved configs to open tabs by URL (handles tab ID changes)
   - Updates config's `tabId` if it changed
   - Calls `startMonitoring()` to restore the interval for each matching tab

2. **Updated startup listeners** (lines 116-126):
   - `chrome.runtime.onStartup`: Now calls `restoreMonitoringState()` before `updateIconState()`
   - `chrome.runtime.onInstalled`: Now calls `restoreMonitoringState()` before `updateIconState()`

### Key Features of the Fix

- **URL-based matching**: Uses `normalizeUrl()` to match saved configs to reopened tabs, handling tab ID changes
- **Tab ID updates**: Automatically updates config's `tabId` if it changed after browser restart
- **Selective restoration**: Only restores configs with `enabled: true` flag
- **Error handling**: Wrapped in try/catch to prevent startup failures
- **Logging**: Console logs help debug restoration process

### How It Works

1. Service worker starts (browser refresh/restart)
2. `restoreMonitoringState()` is called
3. Loads all saved monitoring configs from storage
4. Gets all open web tabs (filters out chrome:// and extension pages)
5. For each enabled config:
   - Finds matching tab by comparing normalized URLs
   - Updates tabId if it changed
   - Calls `startMonitoring()` to recreate the interval
6. Updates icon state to reflect restored monitoring

## Testing Plan
1. ✅ Start monitoring on a tab
2. ✅ Refresh the browser (or restart Chrome)
3. ✅ Verify monitoring continues automatically
4. ⏳ Test with multiple monitored tabs
5. ⏳ Test with tab ID changes (close and reopen tab)
6. ⏳ Verify icon state updates correctly

## Status
✅ **FIX IMPLEMENTED** - Monitoring state restoration added to service worker startup

