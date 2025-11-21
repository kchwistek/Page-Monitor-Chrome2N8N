/**
 * Activity Log with Circular Buffer
 * Tracks monitoring events, failures, and system activities
 */

/**
 * Circular buffer for storing log entries
 */
class ActivityLog {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;           // Maximum number of entries
    this.entries = [];                 // Array of log entries
    this.writeIndex = 0;               // Current write position
    this.size = 0;                     // Current number of entries
  }

  /**
   * Add entry to circular buffer
   * @param {Object} entry - Log entry object
   */
  add(entry) {
    // Add entry at writeIndex, overwriting if buffer is full
    this.entries[this.writeIndex] = entry;
    this.writeIndex = (this.writeIndex + 1) % this.maxSize;
    if (this.size < this.maxSize) {
      this.size++;
    }
  }

  /**
   * Get all entries in chronological order (oldest first)
   * @returns {Array} Array of log entries
   */
  getAll() {
    if (this.size < this.maxSize) {
      return this.entries.slice(0, this.size);
    }
    // Buffer is full, return entries in chronological order
    return [
      ...this.entries.slice(this.writeIndex),
      ...this.entries.slice(0, this.writeIndex)
    ];
  }

  /**
   * Get entries filtered by tabId
   * @param {number} tabId - Tab ID to filter by
   * @returns {Array} Filtered log entries
   */
  getByTabId(tabId) {
    return this.getAll().filter(entry => entry.tabId === tabId);
  }

  /**
   * Get entries filtered by level
   * @param {string} level - Log level (info, success, warning, error)
   * @returns {Array} Filtered log entries
   */
  getByLevel(level) {
    return this.getAll().filter(entry => entry.level === level);
  }

  /**
   * Get entries filtered by category
   * @param {string} category - Log category
   * @returns {Array} Filtered log entries
   */
  getByCategory(category) {
    return this.getAll().filter(entry => entry.category === category);
  }

  /**
   * Get most recent entries
   * @param {number} count - Number of recent entries to return
   * @returns {Array} Recent log entries
   */
  getRecent(count = 10) {
    const all = this.getAll();
    return all.slice(-count);
  }

  /**
   * Clear all entries
   */
  clear() {
    this.entries = [];
    this.writeIndex = 0;
    this.size = 0;
  }
}

/**
 * Activity Log Manager
 * Manages logging, persistence, and failure tracking
 */
class ActivityLogManager {
  constructor() {
    this.buffer = new ActivityLog(100); // 100 entries max
    this.failureCounters = new Map(); // Track failures per tabId
    this.FAILURE_THRESHOLD = 5; // Auto-stop after 5 consecutive failures
    this.loadFromStorage(); // Restore on startup
  }

  /**
   * Create and add log entry
   * @param {string} level - Log level (info, success, warning, error)
   * @param {string} category - Log category
   * @param {string} message - Human-readable message
   * @param {Object} details - Additional context
   * @param {Object} metadata - Optional metadata
   * @returns {Object} Created log entry
   */
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

    // Add tabId and url from details if present
    if (details.tabId) {
      entry.tabId = details.tabId;
    }
    if (details.url) {
      entry.url = details.url;
    }

    this.buffer.add(entry);
    this.saveToStorage(); // Persist periodically
    return entry;
  }

  /**
   * Log info level message
   */
  info(category, message, details = {}, metadata = {}) {
    return this.log('info', category, message, details, metadata);
  }

  /**
   * Log success level message
   */
  success(category, message, details = {}, metadata = {}) {
    return this.log('success', category, message, details, metadata);
  }

  /**
   * Log warning level message
   */
  warning(category, message, details = {}, metadata = {}) {
    return this.log('warning', category, message, details, metadata);
  }

  /**
   * Log error level message
   */
  error(category, message, details = {}, metadata = {}) {
    return this.log('error', category, message, details, metadata);
  }

  /**
   * Record a failure for a tab
   * @param {number} tabId - Tab ID
   * @returns {number} Current failure count
   */
  recordFailure(tabId) {
    const count = (this.failureCounters.get(tabId) || 0) + 1;
    this.failureCounters.set(tabId, count);
    return count;
  }

  /**
   * Record a success for a tab (resets failure counter)
   * @param {number} tabId - Tab ID
   */
  recordSuccess(tabId) {
    if (this.failureCounters.has(tabId)) {
      this.failureCounters.delete(tabId);
    }
  }

  /**
   * Get failure count for a tab
   * @param {number} tabId - Tab ID
   * @returns {number} Failure count
   */
  getFailureCount(tabId) {
    return this.failureCounters.get(tabId) || 0;
  }

  /**
   * Check if failure threshold is reached
   * @param {number} tabId - Tab ID
   * @returns {boolean} True if threshold reached
   */
  isFailureThresholdReached(tabId) {
    return this.getFailureCount(tabId) >= this.FAILURE_THRESHOLD;
  }

  /**
   * Save recent entries to storage
   */
  async saveToStorage() {
    try {
      const recent = this.buffer.getRecent(50); // Save last 50 entries
      await chrome.storage.local.set({ activityLog: recent });
    } catch (error) {
      console.error('Error saving activity log to storage:', error);
    }
  }

  /**
   * Load entries from storage
   */
  async loadFromStorage() {
    try {
      const result = await chrome.storage.local.get(['activityLog']);
      if (result.activityLog && Array.isArray(result.activityLog)) {
        // Restore entries (may be less than maxSize)
        result.activityLog.forEach(entry => this.buffer.add(entry));
        console.log(`Loaded ${result.activityLog.length} activity log entries from storage`);
      }
    } catch (error) {
      console.error('Error loading activity log from storage:', error);
    }
  }

  /**
   * Query methods
   */
  getAll() {
    return this.buffer.getAll();
  }

  getByTabId(tabId) {
    return this.buffer.getByTabId(tabId);
  }

  getByLevel(level) {
    return this.buffer.getByLevel(level);
  }

  getByCategory(category) {
    return this.buffer.getByCategory(category);
  }

  getRecent(count) {
    return this.buffer.getRecent(count);
  }

  getErrors() {
    return this.getByLevel('error');
  }

  getWarnings() {
    return this.getByLevel('warning');
  }

  /**
   * Clear all log entries
   */
  clear() {
    this.buffer.clear();
    this.failureCounters.clear();
    chrome.storage.local.remove('activityLog');
  }

  /**
   * Mask sensitive URL data
   * @param {string} url - URL to mask
   * @returns {string} Masked URL
   */
  maskUrl(url) {
    if (!url) return undefined;
    try {
      const urlObj = new URL(url);
      const pathPreview = urlObj.pathname.length > 20 
        ? urlObj.pathname.substring(0, 20) + '...' 
        : urlObj.pathname;
      return `${urlObj.protocol}//${urlObj.hostname}${pathPreview}`;
    } catch {
      return '***';
    }
  }
}

// Singleton instance
const activityLog = new ActivityLogManager();

