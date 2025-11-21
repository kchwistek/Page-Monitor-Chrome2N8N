# Implementation Plan: Activity Log with Circular Buffer

## Overview
Add an activity log system with a circular buffer to track monitoring events, failures, and system activities. This will help users understand what's happening with their monitoring and diagnose issues.

## Goals
1. Track all monitoring activities (start, stop, success, failures)
2. Provide visibility into system health
3. Enable debugging and troubleshooting
4. Store recent activity in a circular buffer (fixed size, oldest entries overwritten)
5. Display activity log in UI (popup and/or monitor page)

---

## 1. Data Structure Design

### 1.1 Log Entry Format
```javascript
{
  id: string,              // Unique ID (timestamp + random)
  timestamp: number,       // Unix timestamp in milliseconds
  level: string,          // 'info', 'success', 'warning', 'error'
  category: string,       // 'monitoring', 'extraction', 'webhook', 'system'
  tabId: number,          // Tab ID (if applicable)
  url: string,            // Page URL (if applicable)
  message: string,         // Human-readable message
  details: object,         // Additional context (error details, config, etc.)
  metadata: {              // Optional metadata
    selector: string,
    refreshInterval: number,
    webhookUrl: string,    // (masked for privacy)
    contentLength: number,
    changeDetected: boolean,
    retryCount: number,
    consecutiveFailures: number
  }
}
```

### 1.2 Circular Buffer Implementation
```javascript
class ActivityLog {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;           // Maximum number of entries
    this.entries = [];                 // Array of log entries
    this.writeIndex = 0;               // Current write position
    this.size = 0;                     // Current number of entries
  }

  add(entry) {
    // Add entry at writeIndex, overwriting if buffer is full
    this.entries[this.writeIndex] = entry;
    this.writeIndex = (this.writeIndex + 1) % this.maxSize;
    if (this.size < this.maxSize) {
      this.size++;
    }
  }

  getAll() {
    // Return entries in chronological order (oldest first)
    if (this.size < this.maxSize) {
      return this.entries.slice(0, this.size);
    }
    return [
      ...this.entries.slice(this.writeIndex),
      ...this.entries.slice(0, this.writeIndex)
    ];
  }

  getByTabId(tabId) {
    return this.getAll().filter(entry => entry.tabId === tabId);
  }

  getByLevel(level) {
    return this.getAll().filter(entry => entry.level === level);
  }

  getByCategory(category) {
    return this.getAll().filter(entry => entry.category === category);
  }

  getRecent(count = 10) {
    const all = this.getAll();
    return all.slice(-count);
  }

  clear() {
    this.entries = [];
    this.writeIndex = 0;
    this.size = 0;
  }
}
```

### 1.3 Storage Strategy
- **Primary**: In-memory circular buffer (fast, lost on service worker restart)
- **Secondary**: Optional persistence to `chrome.storage.local` for last N entries (survives restart)
- **Size**: Default 100 entries (configurable)
- **Persistence**: Store last 50 entries to storage, sync on service worker startup

---

## 2. Events to Log

### 2.1 Monitoring Lifecycle
- `monitoring.started` - Monitoring started for a tab
- `monitoring.stopped` - Monitoring stopped for a tab
- `monitoring.restored` - Monitoring restored after browser restart
- `monitoring.auto_stopped` - Monitoring auto-stopped due to failures

### 2.2 Content Extraction
- `extraction.success` - Content extracted successfully
- `extraction.failed` - Content extraction failed
- `extraction.retry` - Retrying content extraction
- `extraction.skipped` - Extraction skipped (content unchanged)
- `extraction.content_too_short` - Content too short, likely still loading
- `extraction.loading_indicators` - Loading indicators detected

### 2.3 Content Script
- `content_script.injected` - Content script injected dynamically
- `content_script.verified` - Content script verified (ping successful)
- `content_script.failed` - Content script injection/verification failed
- `content_script.connection_error` - Connection error with content script

### 2.4 Webhook Communication
- `webhook.success` - Content sent to webhook successfully
- `webhook.failed` - Webhook request failed
- `webhook.network_error` - Network error sending to webhook
- `webhook.invalid_url` - Invalid webhook URL configured

### 2.5 Change Detection
- `change.detected` - Content change detected
- `change.not_detected` - No content change (skipped webhook)
- `change.hash_calculated` - Content hash calculated

### 2.6 System Events
- `system.service_worker_started` - Service worker started
- `system.monitoring_restored` - Monitoring state restored
- `system.tab_closed` - Tab closed, monitoring stopped
- `system.tab_navigated` - Tab navigated away, monitoring stopped
- `system.error` - General system error

### 2.7 Failure Tracking
- `failure.consecutive_count` - Track consecutive failures per tab
- `failure.threshold_reached` - Failure threshold reached, auto-stop triggered

---

## 3. Implementation Components

### 3.1 Activity Log Manager (`src/background/activity-log.js`)
```javascript
class ActivityLogManager {
  constructor() {
    this.log = new ActivityLog(100); // 100 entries max
    this.failureCounters = new Map(); // Track failures per tabId
    this.loadFromStorage(); // Restore on startup
  }

  // Log entry creation
  log(level, category, message, details = {}, metadata = {}) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level,
      category,
      message,
      details,
      metadata: {
        ...metadata,
        // Mask sensitive data
        webhookUrl: metadata.webhookUrl ? this.maskUrl(metadata.webhookUrl) : undefined
      }
    };
    
    this.log.add(entry);
    this.saveToStorage(); // Persist periodically
    return entry;
  }

  // Convenience methods
  info(category, message, details, metadata) {
    return this.log('info', category, message, details, metadata);
  }

  success(category, message, details, metadata) {
    return this.log('success', category, message, details, metadata);
  }

  warning(category, message, details, metadata) {
    return this.log('warning', category, message, details, metadata);
  }

  error(category, message, details, metadata) {
    return this.log('error', category, message, details, metadata);
  }

  // Failure tracking
  recordFailure(tabId) {
    const count = (this.failureCounters.get(tabId) || 0) + 1;
    this.failureCounters.set(tabId, count);
    return count;
  }

  recordSuccess(tabId) {
    this.failureCounters.delete(tabId);
  }

  getFailureCount(tabId) {
    return this.failureCounters.get(tabId) || 0;
  }

  // Storage
  async saveToStorage() {
    const recent = this.log.getRecent(50); // Save last 50 entries
    await chrome.storage.local.set({ activityLog: recent });
  }

  async loadFromStorage() {
    const result = await chrome.storage.local.get(['activityLog']);
    if (result.activityLog && Array.isArray(result.activityLog)) {
      // Restore entries (may be less than maxSize)
      result.activityLog.forEach(entry => this.log.add(entry));
    }
  }

  // Query methods
  getAll() { return this.log.getAll(); }
  getByTabId(tabId) { return this.log.getByTabId(tabId); }
  getByLevel(level) { return this.log.getByLevel(level); }
  getByCategory(category) { return this.log.getByCategory(category); }
  getRecent(count) { return this.log.getRecent(count); }
  getErrors() { return this.getByLevel('error'); }
  getWarnings() { return this.getByLevel('warning'); }

  // Utility
  maskUrl(url) {
    if (!url) return undefined;
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname.substring(0, 20)}...`;
    } catch {
      return '***';
    }
  }

  clear() {
    this.log.clear();
    this.failureCounters.clear();
    chrome.storage.local.remove('activityLog');
  }
}

// Singleton instance
const activityLog = new ActivityLogManager();
```

### 3.2 Integration Points in `background.js`

#### In `startMonitoring()`:
```javascript
activityLog.success('monitoring', 'Monitoring started', {
  tabId,
  url: resolvedUrl
}, {
  selector: config.selector,
  refreshInterval: config.refreshInterval,
  contentType: config.contentType,
  changeDetection: config.changeDetection
});
```

#### In `stopMonitoring()`:
```javascript
activityLog.info('monitoring', 'Monitoring stopped', { tabId });
activityLog.recordSuccess(tabId); // Reset failure counter
```

#### In `ensureContentScriptLoaded()`:
```javascript
// On success
activityLog.success('content_script', 'Content script verified', { tabId });

// On injection
activityLog.info('content_script', 'Content script injected', { tabId });

// On failure
activityLog.error('content_script', 'Content script failed to load', {
  tabId,
  error: error.message
});
```

#### In `refreshPage()`:
```javascript
// On extraction success
activityLog.success('extraction', 'Content extracted successfully', {
  tabId,
  url: tab.url
}, {
  contentLength: response.content.length,
  selector: config.selector
});

// On extraction failure
const failureCount = activityLog.recordFailure(tabId);
activityLog.error('extraction', 'Content extraction failed', {
  tabId,
  retryCount: retries,
  consecutiveFailures: failureCount
});

// Check threshold
if (failureCount >= 5) {
  activityLog.warning('monitoring', 'Auto-stopping monitoring due to consecutive failures', {
    tabId,
    consecutiveFailures: failureCount
  });
  await stopMonitoring(tabId);
}
```

#### In `sendContentToWebhook()`:
```javascript
// On success
activityLog.success('webhook', 'Content sent to webhook', {
  tabId,
  url
}, {
  contentLength: content.length,
  changeDetected
});

// On failure
activityLog.error('webhook', 'Webhook request failed', {
  tabId,
  error: error.message,
  statusCode: response?.status
});
```

#### In `processContentExtraction()`:
```javascript
if (changed) {
  activityLog.info('change', 'Content change detected', {
    tabId,
    url: data.url
  });
} else {
  activityLog.info('change', 'No content change detected', {
    tabId,
    url: data.url
  });
}
```

---

## 4. API for Accessing Logs

### 4.1 Message Handlers in `background.js`
```javascript
if (request.action === "getActivityLog") {
  handleGetActivityLog(request, sender, sendResponse);
  return true;
}

async function handleGetActivityLog(request, sender, sendResponse) {
  try {
    const { tabId, level, category, limit } = request;
    
    let entries;
    if (tabId) {
      entries = activityLog.getByTabId(tabId);
    } else if (level) {
      entries = activityLog.getByLevel(level);
    } else if (category) {
      entries = activityLog.getByCategory(category);
    } else if (limit) {
      entries = activityLog.getRecent(limit);
    } else {
      entries = activityLog.getAll();
    }
    
    sendResponse({ success: true, entries });
  } catch (error) {
    sendResponse({ success: false, message: error.message });
  }
}
```

### 4.2 Message Actions
- `getActivityLog` - Get all or filtered log entries
- `getActivityLogByTab` - Get logs for specific tab
- `getActivityLogErrors` - Get only error entries
- `clearActivityLog` - Clear the log buffer

---

## 5. UI Components

### 5.1 Popup UI (`src/popup/popup.html`)
Add a new section or tab for activity log:
```html
<!-- Activity Log Section -->
<div class="activity-log-section" id="activityLogSection" style="display: none;">
  <div class="activity-log-header">
    <h3>Activity Log</h3>
    <div class="activity-log-controls">
      <select id="logFilter">
        <option value="all">All</option>
        <option value="errors">Errors Only</option>
        <option value="warnings">Warnings</option>
        <option value="monitoring">Monitoring</option>
        <option value="extraction">Extraction</option>
        <option value="webhook">Webhook</option>
      </select>
      <button id="clearLogBtn" class="btn-icon" title="Clear Log">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  </div>
  <div class="activity-log-entries" id="activityLogEntries">
    <!-- Log entries will be rendered here -->
  </div>
</div>
```

### 5.2 Popup JavaScript (`src/popup/popup.js`)
```javascript
async function loadActivityLog(filter = 'all') {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getActivityLog',
      filter
    });
    
    if (response.success) {
      renderActivityLog(response.entries);
    }
  } catch (error) {
    console.error('Error loading activity log:', error);
  }
}

function renderActivityLog(entries) {
  const container = document.getElementById('activityLogEntries');
  container.innerHTML = entries.map(entry => `
    <div class="activity-log-entry activity-log-${entry.level}">
      <div class="activity-log-time">${formatTimestamp(entry.timestamp)}</div>
      <div class="activity-log-message">${entry.message}</div>
      ${entry.details ? `<div class="activity-log-details">${formatDetails(entry.details)}</div>` : ''}
    </div>
  `).join('');
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}
```

### 5.3 Monitor Page UI (`src/monitor/monitor.html`)
Similar activity log section for the monitor page.

### 5.4 CSS Styling (`src/popup/popup.css`)
```css
.activity-log-section {
  max-height: 400px;
  overflow-y: auto;
  border-top: 1px solid #ddd;
  padding: 12px;
}

.activity-log-entry {
  padding: 8px;
  margin-bottom: 8px;
  border-left: 3px solid #ccc;
  background: #f9f9f9;
  font-size: 12px;
}

.activity-log-entry.activity-log-error {
  border-left-color: #e74c3c;
  background: #fee;
}

.activity-log-entry.activity-log-warning {
  border-left-color: #f39c12;
  background: #fff8e1;
}

.activity-log-entry.activity-log-success {
  border-left-color: #27ae60;
  background: #e8f5e9;
}

.activity-log-time {
  font-size: 10px;
  color: #666;
  margin-bottom: 4px;
}

.activity-log-message {
  font-weight: 500;
  margin-bottom: 4px;
}

.activity-log-details {
  font-size: 11px;
  color: #888;
  margin-top: 4px;
}
```

---

## 6. Auto-Stop on Failures

### 6.1 Failure Threshold Configuration
```javascript
const FAILURE_THRESHOLD = 5; // Stop after 5 consecutive failures
const FAILURE_RESET_TIME = 60000; // Reset counter after 1 minute of success
```

### 6.2 Implementation in `refreshPage()`
```javascript
// After extraction failure
const failureCount = activityLog.recordFailure(tabId);

if (failureCount >= FAILURE_THRESHOLD) {
  activityLog.warning('monitoring', 
    `Auto-stopping monitoring for tab ${tabId} after ${failureCount} consecutive failures`,
    { tabId, consecutiveFailures: failureCount }
  );
  await stopMonitoring(tabId);
  
  // Notify user (optional)
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'assets/icons/icon48.png',
    title: 'Monitoring Stopped',
    message: `Monitoring stopped due to ${failureCount} consecutive failures`
  });
}
```

---

## 7. Implementation Steps

### Phase 1: Core Infrastructure
1. ✅ Create `ActivityLog` class (circular buffer)
2. ✅ Create `ActivityLogManager` class
3. ✅ Add storage persistence
4. ✅ Integrate into `background.js`

### Phase 2: Logging Integration
1. ✅ Add logging to `startMonitoring()`
2. ✅ Add logging to `stopMonitoring()`
3. ✅ Add logging to `ensureContentScriptLoaded()`
4. ✅ Add logging to `refreshPage()`
5. ✅ Add logging to `sendContentToWebhook()`
6. ✅ Add logging to `processContentExtraction()`

### Phase 3: Failure Tracking
1. ✅ Implement failure counter per tab
2. ✅ Add auto-stop logic when threshold reached
3. ✅ Reset counter on success

### Phase 4: API & Communication
1. ✅ Add message handlers for log access
2. ✅ Add `getActivityLog` action
3. ✅ Add filtering options

### Phase 5: UI Implementation
1. ✅ Add activity log section to popup
2. ✅ Add activity log section to monitor page
3. ✅ Implement log rendering
4. ✅ Add filtering UI
5. ✅ Add clear log functionality

### Phase 6: Testing & Polish
1. ✅ Test circular buffer behavior
2. ✅ Test persistence across restarts
3. ✅ Test UI rendering and filtering
4. ✅ Test auto-stop functionality
5. ✅ Performance testing (large log sizes)

---

## 8. Configuration Options

### 8.1 Defaults
```javascript
const ACTIVITY_LOG_CONFIG = {
  maxSize: 100,              // Maximum entries in buffer
  persistCount: 50,          // Number of entries to persist
  failureThreshold: 5,        // Auto-stop after N failures
  failureResetTime: 60000,   // Reset counter after 1 min success
  autoRefresh: true,          // Auto-refresh log in UI
  refreshInterval: 2000      // UI refresh interval (ms)
};
```

### 8.2 User Settings
- Allow users to configure log size
- Allow users to configure failure threshold
- Allow users to enable/disable auto-stop
- Allow users to export log (JSON/CSV)

---

## 9. Privacy & Security Considerations

1. **Mask Sensitive Data**:
   - Mask webhook URLs (show only domain + partial path)
   - Don't log full content (only length)
   - Don't log user input (selectors, etc. are OK)

2. **Storage**:
   - Logs stored locally only
   - Not synced across devices
   - Cleared when extension is uninstalled

3. **Performance**:
   - Circular buffer prevents memory growth
   - Limit persisted entries
   - Lazy loading in UI

---

## 10. Future Enhancements

1. **Export Functionality**:
   - Export log to JSON/CSV
   - Copy log to clipboard
   - Share log for debugging

2. **Advanced Filtering**:
   - Filter by date range
   - Filter by multiple criteria
   - Search in log messages

3. **Statistics**:
   - Success/failure rates
   - Average extraction time
   - Most common errors

4. **Notifications**:
   - Browser notifications for critical errors
   - Badge count for errors
   - Sound alerts (optional)

5. **Log Levels**:
   - Configurable log levels (debug, info, warning, error)
   - Filter by log level in UI

---

## 11. File Structure

```
src/
  background/
    activity-log.js          # ActivityLog and ActivityLogManager classes
    background.js            # Integration with activity log
  popup/
    popup.html              # Add activity log section
    popup.js                # Activity log UI logic
    popup.css               # Activity log styles
  monitor/
    monitor.html            # Add activity log section
    monitor.js              # Activity log UI logic
    monitor.css             # Activity log styles
```

---

## 12. Testing Checklist

- [ ] Circular buffer overwrites oldest entries when full
- [ ] Log entries are in chronological order
- [ ] Filtering by tabId works correctly
- [ ] Filtering by level works correctly
- [ ] Filtering by category works correctly
- [ ] Persistence survives service worker restart
- [ ] Failure counter increments correctly
- [ ] Auto-stop triggers after threshold
- [ ] Failure counter resets on success
- [ ] UI renders log entries correctly
- [ ] UI filtering works
- [ ] Clear log functionality works
- [ ] Performance with 100+ entries is acceptable
- [ ] Sensitive data is masked
- [ ] No memory leaks

---

## Summary

This implementation plan provides:
1. ✅ **Circular buffer** for efficient log storage
2. ✅ **Comprehensive event logging** for all monitoring activities
3. ✅ **Failure tracking** with auto-stop capability
4. ✅ **UI components** for viewing logs
5. ✅ **API** for accessing logs
6. ✅ **Persistence** across service worker restarts
7. ✅ **Privacy** considerations (masked sensitive data)
8. ✅ **Performance** optimization (fixed size buffer)

The activity log will help users understand what's happening with their monitoring and diagnose issues when things go wrong.

