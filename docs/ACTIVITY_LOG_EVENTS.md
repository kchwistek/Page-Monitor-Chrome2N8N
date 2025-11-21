# Activity Log Events Reference

This document lists all activities that are logged by the Page Monitor extension.

## Log Entry Structure

Each log entry contains:
- `id`: Unique identifier
- `timestamp`: Unix timestamp in milliseconds
- `level`: `info`, `success`, `warning`, or `error`
- `category`: Event category
- `message`: Human-readable message
- `details`: Context object (tabId, url, error, etc.)
- `metadata`: Additional metadata (selector, contentLength, etc.)

---

## Categories

### 1. System Events (`system`)

| Level | Message | When |
|-------|---------|------|
| `info` | Service worker started | On service worker startup |
| `info` | Extension installed/enabled | On extension install/enable |

---

### 2. Monitoring Lifecycle (`monitoring`)

| Level | Message | When |
|-------|---------|------|
| `success` | Monitoring started | When monitoring begins for a tab |
| `info` | Monitoring stopped | When monitoring stops for a tab |
| `info` | Monitoring restored after browser restart | When monitoring is restored from storage |
| `info` | Starting refresh cycle | When refresh cycle begins |
| `info` | Page reloaded | When page is reloaded |
| `warning` | Tab not found, stopping monitoring | When tab is not found |
| `warning` | Tab navigated away from monitored URL, stopping monitoring | When tab URL changes |
| `warning` | No monitoring config or selector found | When config is missing |
| `warning` | Auto-stopping monitoring after N consecutive failures | When failure threshold reached |
| `info` | Tab closed, stopping monitoring | When monitored tab is closed |

---

### 3. Content Script (`content_script`)

| Level | Message | When |
|-------|---------|------|
| `success` | Content script verified | When ping to content script succeeds |
| `info` | Injecting content script | When dynamically injecting content script |
| `success` | Content script injected and verified | When injection and verification succeed |
| `warning` | Cannot monitor extension pages or special URLs | When trying to monitor invalid URLs |
| `error` | Content script failed to respond after injection | When injection fails after retries |
| `error` | Failed to inject content script | When injection fails |
| `error` | Error ensuring content script loaded | When verification fails |

---

### 4. Content Extraction (`extraction`)

| Level | Message | When |
|-------|---------|------|
| `success` | Initial content extraction request sent | When initial extraction message is sent |
| `info` | Retrying initial extraction (N/M) | When retrying initial extraction |
| `error` | Initial extraction failed after retries | When initial extraction fails completely |
| `warning` | Content script no longer loaded, skipping initial extraction | When content script unavailable |
| `info` | Attempting content extraction after refresh | When extraction attempt starts after refresh |
| `info` | Content too short (N chars), likely still loading | When content is too short |
| `info` | Page still loading (detected loading indicators) | When loading indicators detected |
| `info` | Retrying content extraction (N/M) | When retrying extraction after refresh |
| `success` | Content extracted successfully after refresh | When extraction succeeds |
| `error` | Content extraction failed after all retries | When all extraction retries fail |

---

### 5. Change Detection (`change`)

| Level | Message | When |
|-------|---------|------|
| `info` | Content change detected | When content hash changes |
| `info` | No content change detected, skipping webhook | When content hash unchanged |

---

### 6. Webhook Communication (`webhook`)

| Level | Message | When |
|-------|---------|------|
| `success` | Content sent to webhook successfully | When webhook request succeeds |
| `error` | Webhook request failed | When webhook returns error status |
| `error` | Network error sending to webhook | When network error occurs |

---

## Refresh Cycle Flow

When a page is refreshed, the following events are logged (in order):

1. **`monitoring` - `info`**: "Starting refresh cycle"
2. **`monitoring` - `info`**: "Page reloaded"
3. **`extraction` - `info`**: "Attempting content extraction after refresh" (first attempt only)
4. **`extraction` - `info`**: "Content too short..." or "Page still loading..." (if applicable)
5. **`extraction` - `info`**: "Retrying content extraction (N/M)" (if retrying)
6. **`extraction` - `success`**: "Content extracted successfully after refresh" (on success)
   - OR
   - **`extraction` - `error`**: "Content extraction failed after all retries" (on failure)
7. **`change` - `info`**: "Content change detected" or "No content change detected"
8. **`webhook` - `success`** or **`error`**: Webhook result (if change detected)

---

## Failure Tracking

The system tracks consecutive failures per tab:

- **Failure recorded**: When extraction fails after all retries
- **Success recorded**: When extraction succeeds (resets counter)
- **Auto-stop**: When failure count reaches 5, monitoring stops automatically

---

## Filtering in UI

The activity log UI supports filtering by:

- **All**: Shows last 20 entries
- **Errors Only**: Shows only error-level entries
- **Warnings**: Shows only warning-level entries
- **Monitoring**: Shows only monitoring category entries
- **Extraction**: Shows only extraction category entries
- **Webhook**: Shows only webhook category entries

---

## Example Log Sequence

```
[info] monitoring: Starting refresh cycle (Tab: 123, URL: https://example.com)
[info] monitoring: Page reloaded (Tab: 123)
[info] extraction: Attempting content extraction after refresh (Tab: 123)
[info] extraction: Content too short (45 chars), likely still loading
[info] extraction: Retrying content extraction (1/10)
[success] extraction: Content extracted successfully after refresh (Tab: 123, Content: 1234 chars)
[info] change: Content change detected (Tab: 123)
[success] webhook: Content sent to webhook successfully (Tab: 123)
```

---

## Notes

- Log entries are stored in a circular buffer (max 100 entries)
- Last 50 entries are persisted to storage (survives restart)
- Sensitive data (webhook URLs) are masked in logs
- Log refreshes automatically in UI every 2 seconds

