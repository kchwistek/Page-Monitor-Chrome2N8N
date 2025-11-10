# Implementation Plan: Page Monitoring & Change Detection

## Overview
Transform the LinkedIn2n8n extension from a manual profile extraction tool into an automated page monitoring system that:
- Monitors pages with automatic refresh and content reading
- Extracts content from specific HTML blocks
- Sends content to webhook only when changes are detected (optional)

---

## 1. Architecture Changes

### 1.1 Current Architecture
- **Manual trigger**: User clicks extension icon → extracts data → sends to webhook
- **Content scripts**: Extract LinkedIn profile data on-demand
- **Background script**: Handles webhook requests
- **Popup**: User interface for manual data sending

### 1.2 New Architecture
- **Automatic monitoring**: Background service monitors active tabs
- **Page refresh mechanism**: Automatically refreshes monitored pages
- **Content extraction**: Extracts specific HTML block content
- **Change detection**: Compares current content with previous state
- **Conditional webhook**: Sends only when content changes (if enabled)

---

## 2. New Components

### 2.1 Background Monitoring Service
**File**: `src/background/page-monitor.js` (new)

**Responsibilities**:
- Track which tabs are being monitored
- Manage refresh intervals per tab
- Coordinate with content scripts for content extraction
- Store previous content hashes for change detection
- Handle webhook sending for monitored pages

**Key Functions**:
- `startMonitoring(tabId, config)` - Start monitoring a tab
- `stopMonitoring(tabId)` - Stop monitoring a tab
- `refreshPage(tabId)` - Trigger page refresh
- `checkForChanges(tabId, currentContent)` - Compare with previous content
- `sendContentToWebhook(tabId, content)` - Send content if changed

### 2.2 Enhanced Content Script
**File**: `src/content-scripts/page-monitor-content.js` (new)

**Responsibilities**:
- Extract content from specified HTML selector
- Listen for monitoring commands from background
- Handle page refresh events
- Extract and return content to background script

**Key Functions**:
- `extractBlockContent(selector)` - Extract HTML/text from selector
- `getContentHash(content)` - Generate hash for change detection
- `handleMonitoringRequest(request)` - Process monitoring commands

### 2.3 Monitoring Configuration UI
**File**: `src/monitor/monitor.html` (new)
**File**: `src/monitor/monitor.js` (new)
**File**: `src/monitor/monitor.css` (new)

**Responsibilities**:
- UI for configuring page monitoring
- Set HTML selector for content extraction
- Configure refresh interval
- Enable/disable change detection
- Start/stop monitoring for current tab
- View monitoring status

**UI Elements**:
- HTML Selector input (CSS selector)
- Refresh interval input (seconds/minutes)
- Change detection toggle (checkbox)
- Start/Stop monitoring button
- Monitoring status indicator
- List of currently monitored tabs

### 2.4 Enhanced Options Page
**File**: `src/options/options.html` (modify)
**File**: `src/options/options.js` (modify)

**New Settings**:
- Default monitoring configuration
- Default refresh interval
- Default change detection setting
- Global monitoring on/off toggle

---

## 3. Data Storage Structure

### 3.1 Chrome Storage Schema

```javascript
{
  // Existing
  webhookUrl: "https://...",
  
  // New monitoring data
  monitoringConfig: {
    [tabId]: {
      enabled: true,
      selector: "#content-block",
      refreshInterval: 30000, // milliseconds
      changeDetection: true,
      lastContentHash: "abc123...",
      lastCheckTime: "2025-01-20T10:00:00Z",
      url: "https://example.com/page"
    }
  },
  
  // Global monitoring defaults
  monitoringDefaults: {
    refreshInterval: 30000,
    changeDetection: true,
    enabled: false
  }
}
```

### 3.2 Content Hash Storage
- Store hash of previous content per monitored tab
- Use SHA-256 or similar for reliable change detection
- Store in Chrome storage with tab ID as key
- Clean up when monitoring stops

---

## 4. Implementation Steps

### Phase 1: Core Monitoring Infrastructure

#### Step 1.1: Create Background Monitoring Service
- [ ] Create `src/background/page-monitor.js`
- [ ] Implement tab tracking system
- [ ] Implement refresh interval management
- [ ] Add message listeners for monitoring commands
- [ ] Integrate with existing background.js

#### Step 1.2: Create Content Script for Monitoring
- [ ] Create `src/content-scripts/page-monitor-content.js`
- [ ] Implement content extraction from CSS selector
- [ ] Implement content hashing (SHA-256)
- [ ] Add message listeners for background communication
- [ ] Handle page refresh events

#### Step 1.3: Update Manifest
- [ ] Add new content script to manifest.json
- [ ] Add permissions for tabs API (if needed)
- [ ] Add permissions for storage API (already have)
- [ ] Update host_permissions if needed for monitoring

### Phase 2: Change Detection System

#### Step 2.1: Implement Content Hashing
- [ ] Add crypto library or use Web Crypto API
- [ ] Create hash generation function
- [ ] Implement hash comparison logic
- [ ] Store/retrieve previous hashes from storage

#### Step 2.2: Change Detection Logic
- [ ] Compare current content hash with stored hash
- [ ] Only send webhook if hash differs (when enabled)
- [ ] Update stored hash after successful comparison
- [ ] Handle edge cases (first run, cleared storage)

### Phase 3: User Interface

#### Step 3.1: Create Monitoring UI
- [ ] Create `src/monitor/monitor.html`
- [ ] Design UI for monitoring configuration
- [ ] Add form inputs for selector, interval, change detection
- [ ] Add start/stop monitoring buttons
- [ ] Add status indicators

#### Step 3.2: Implement Monitoring UI Logic
- [ ] Create `src/monitor/monitor.js`
- [ ] Implement configuration form handling
- [ ] Implement start/stop monitoring functionality
- [ ] Add real-time status updates
- [ ] Add error handling and user feedback

#### Step 3.3: Update Popup (Optional)
- [ ] Add quick access to monitoring UI from popup
- [ ] Show monitoring status in popup
- [ ] Add toggle to start/stop monitoring current tab

#### Step 3.4: Enhance Options Page
- [ ] Add monitoring default settings section
- [ ] Add global monitoring toggle
- [ ] Add default refresh interval setting
- [ ] Add default change detection setting

### Phase 4: Webhook Integration

#### Step 4.1: Extend Background Webhook Handler
- [ ] Modify `processN8nWebhookRequest()` or create new function
- [ ] Support both profile data and monitoring content
- [ ] Add metadata to webhook payload (timestamp, URL, change detected)
- [ ] Maintain backward compatibility with existing profile extraction

#### Step 4.2: Webhook Payload Structure
```javascript
{
  type: "page_monitor", // or "profile_extraction" for existing
  timestamp: "2025-01-20T10:00:00Z",
  url: "https://example.com/page",
  content: "<div>...</div>", // or text content
  contentHash: "abc123...",
  changeDetected: true,
  selector: "#content-block",
  metadata: {
    refreshInterval: 30000,
    monitoringDuration: 3600000
  }
}
```

### Phase 5: Page Refresh Mechanism

#### Step 5.1: Implement Refresh Logic
- [ ] Use Chrome tabs API to refresh pages
- [ ] Handle refresh timing (wait for page load)
- [ ] Implement retry logic for failed refreshes
- [ ] Add configurable delay after refresh before extraction

#### Step 5.2: Handle Dynamic Content
- [ ] Wait for page load completion
- [ ] Handle single-page applications (SPAs)
- [ ] Add configurable wait time for dynamic content
- [ ] Implement MutationObserver for real-time changes (optional)

### Phase 6: Error Handling & Edge Cases

#### Step 6.1: Error Handling
- [ ] Handle invalid CSS selectors
- [ ] Handle missing elements on page
- [ ] Handle network errors during webhook send
- [ ] Handle tab closure during monitoring
- [ ] Handle page navigation during monitoring

#### Step 6.2: Edge Cases
- [ ] First run (no previous hash)
- [ ] Storage cleanup when monitoring stops
- [ ] Multiple tabs monitoring same URL
- [ ] Tab refresh vs manual refresh
- [ ] Extension reload/restart

---

## 5. Technical Considerations

### 5.1 Performance
- **Refresh intervals**: Minimum 5 seconds to prevent excessive load
- **Content extraction**: Use efficient DOM queries
- **Storage**: Limit stored content hashes (cleanup old entries)
- **Memory**: Avoid storing full content in memory, use hashes

### 5.2 Privacy & Security
- **Content extraction**: Only extract what user specifies
- **Storage**: Store hashes, not full content (if possible)
- **Webhook**: Same privacy model as existing (local storage only)
- **Permissions**: Minimal additional permissions needed

### 5.3 Browser Compatibility
- **Chrome Extensions Manifest V3**: Ensure compatibility
- **Service Worker**: Background script limitations
- **Content Scripts**: Injection timing and scope
- **Storage API**: Chrome storage.local usage

### 5.4 User Experience
- **Visual feedback**: Clear monitoring status indicators
- **Error messages**: User-friendly error handling
- **Configuration**: Simple, intuitive setup
- **Performance**: Don't slow down browser

---

## 6. Configuration Options

### 6.1 Per-Tab Configuration
- **HTML Selector**: CSS selector for content block (required)
- **Refresh Interval**: Time between refreshes (default: 30 seconds)
- **Change Detection**: Enable/disable change detection (default: true)
- **Content Type**: HTML or text extraction (default: HTML)

### 6.2 Global Defaults
- **Default Refresh Interval**: 30 seconds
- **Default Change Detection**: Enabled
- **Default Content Type**: HTML
- **Global Monitoring**: Enable/disable all monitoring

---

## 7. Testing Strategy

### 7.1 Unit Tests
- [ ] Content extraction function
- [ ] Hash generation and comparison
- [ ] Configuration validation
- [ ] Webhook payload construction

### 7.2 Integration Tests
- [ ] Background script ↔ Content script communication
- [ ] Storage read/write operations
- [ ] Webhook sending with monitoring data
- [ ] Change detection flow

### 7.3 Manual Testing
- [ ] Monitor various page types
- [ ] Test different CSS selectors
- [ ] Test change detection accuracy
- [ ] Test refresh mechanism
- [ ] Test error scenarios

---

## 8. Migration & Backward Compatibility

### 8.1 Existing Functionality
- **Preserve**: All existing LinkedIn profile extraction features
- **Preserve**: Existing webhook configuration
- **Preserve**: Existing popup functionality
- **Add**: New monitoring features alongside existing

### 8.2 Data Migration
- No migration needed (new feature, separate storage keys)
- Existing webhook URL remains valid
- Existing profile extraction remains unchanged

---

## 9. Documentation Updates

### 9.1 README Updates
- [ ] Add monitoring feature description
- [ ] Add monitoring setup instructions
- [ ] Add configuration examples
- [ ] Update use cases

### 9.2 Code Documentation
- [ ] JSDoc comments for all new functions
- [ ] Inline comments for complex logic
- [ ] Architecture diagrams (if needed)

---

## 10. Future Enhancements (Out of Scope)

- Multiple selector monitoring per page
- Advanced change detection (diff highlighting)
- Monitoring history/logs
- Export monitoring configurations
- Scheduled monitoring (specific times)
- Notification system for changes
- Content filtering/transformation before webhook

---

## 11. File Structure Changes

```
src/
├── background/
│   ├── background.js (modify - add monitoring support)
│   └── page-monitor.js (new)
├── content-scripts/
│   ├── content-normal.js (keep as-is)
│   ├── content-sales.js (keep as-is)
│   └── page-monitor-content.js (new)
├── monitor/
│   ├── monitor.html (new)
│   ├── monitor.js (new)
│   └── monitor.css (new)
├── options/
│   ├── options.html (modify - add monitoring defaults)
│   ├── options.js (modify - add monitoring settings)
│   └── options.css (modify - style new sections)
└── popup/
    ├── popup.html (modify - add monitoring quick access)
    ├── popup.js (modify - add monitoring status)
    └── popup.css (modify - style new elements)

manifest.json (modify - add new content script)
```

---

## 12. Implementation Priority

### High Priority (Core Features)
1. Background monitoring service
2. Content extraction from selector
3. Basic webhook sending
4. Monitoring UI

### Medium Priority (Enhanced Features)
5. Change detection
6. Content hashing
7. Refresh mechanism
8. Error handling

### Low Priority (Polish)
9. Enhanced UI/UX
10. Advanced configuration
11. Monitoring history
12. Performance optimizations

---

## 13. Success Criteria

- [ ] User can configure HTML selector for content extraction
- [ ] User can set refresh interval
- [ ] Extension automatically refreshes and extracts content
- [ ] Content is sent to webhook when changes detected (if enabled)
- [ ] Extension works on any website (not just LinkedIn)
- [ ] Existing LinkedIn profile extraction still works
- [ ] No performance degradation
- [ ] Clear error messages and user feedback

---

## Notes

- This plan maintains backward compatibility with existing LinkedIn profile extraction
- The monitoring feature is designed to work on any website, not just LinkedIn
- All data remains stored locally, maintaining privacy model
- Implementation should be modular to allow easy testing and maintenance

