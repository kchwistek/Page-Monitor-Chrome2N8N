/**
 * Page Monitoring Service
 * Handles automatic page monitoring, refresh, and change detection
 */

console.log('Page Monitor: Background service loaded');

// Store active monitoring intervals
const monitoringIntervals = new Map();
// Store monitoring configurations
const monitoringConfigs = new Map();

/**
 * Generate SHA-256 hash of content
 * @param {string} content - Content to hash
 * @returns {Promise<string>} Hash string
 */
async function generateContentHash(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get monitoring configuration for a tab
 * @param {number} tabId - Tab ID
 * @returns {Promise<Object>} Monitoring configuration
 */
async function getMonitoringConfig(tabId) {
  const result = await chrome.storage.local.get(['monitoringConfig']);
  const configs = result.monitoringConfig || {};
  return configs[tabId] || null;
}

/**
 * Save monitoring configuration for a tab
 * @param {number} tabId - Tab ID
 * @param {Object} config - Configuration object
 */
async function saveMonitoringConfig(tabId, config) {
  const result = await chrome.storage.local.get(['monitoringConfig']);
  const configs = result.monitoringConfig || {};
  configs[tabId] = {
    ...config,
    lastCheckTime: new Date().toISOString()
  };
  await chrome.storage.local.set({ monitoringConfig: configs });
  monitoringConfigs.set(tabId, configs[tabId]);
}

/**
 * Remove monitoring configuration for a tab
 * @param {number} tabId - Tab ID
 */
async function removeMonitoringConfig(tabId) {
  const result = await chrome.storage.local.get(['monitoringConfig']);
  const configs = result.monitoringConfig || {};
  delete configs[tabId];
  await chrome.storage.local.set({ monitoringConfig: configs });
  monitoringConfigs.delete(tabId);
}

/**
 * Check if content has changed
 * @param {number} tabId - Tab ID
 * @param {string} currentContent - Current content
 * @returns {Promise<boolean>} True if content changed
 */
async function hasContentChanged(tabId, currentContent) {
  const config = await getMonitoringConfig(tabId);
  if (!config || !config.changeDetection) {
    return true; // Always send if change detection is disabled
  }

  const currentHash = await generateContentHash(currentContent);
  const previousHash = config.lastContentHash;

  if (!previousHash) {
    // First run, save hash but don't send
    await saveMonitoringConfig(tabId, {
      ...config,
      lastContentHash: currentHash
    });
    return false;
  }

  if (currentHash === previousHash) {
    return false; // No change
  }

  // Content changed, update hash
  await saveMonitoringConfig(tabId, {
    ...config,
    lastContentHash: currentHash
  });
  return true;
}

/**
 * Send content to webhook
 * @param {number} tabId - Tab ID
 * @param {string} content - Content to send
 * @param {string} url - Page URL
 * @param {string} selector - CSS selector used
 * @param {boolean} changeDetected - Whether change was detected
 */
async function sendContentToWebhook(tabId, content, url, selector, changeDetected) {
  try {
    const { webhookUrl } = await chrome.storage.local.get('webhookUrl');

    if (!webhookUrl) {
      console.error('No webhook URL configured');
      return { success: false, message: 'No webhook URL set' };
    }

    const config = await getMonitoringConfig(tabId);
    const payload = {
      type: 'page_monitor',
      timestamp: new Date().toISOString(),
      url: url,
      content: content,
      selector: selector,
      changeDetected: changeDetected,
      metadata: {
        refreshInterval: config?.refreshInterval || 30000,
        tabId: tabId
      }
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('Content sent to webhook successfully');
      return { success: true, message: 'Content sent successfully' };
    } else {
      console.error('Webhook failed:', response.status);
      return { success: false, message: `Webhook failed (HTTP ${response.status})` };
    }
  } catch (error) {
    console.error('Error sending to webhook:', error);
    return { success: false, message: 'Network error: ' + error.message };
  }
}

/**
 * Process content extraction from content script
 * @param {number} tabId - Tab ID
 * @param {Object} data - Content data from content script
 */
async function processContentExtraction(tabId, data) {
  try {
    const config = await getMonitoringConfig(tabId);
    if (!config) {
      console.log('No monitoring config for tab:', tabId);
      return;
    }

    const { content, url, selector } = data;
    
    if (!content) {
      console.warn('No content extracted from page');
      return;
    }

    // Check for changes
    const changed = await hasContentChanged(tabId, content);

    // Send to webhook if changed (or if change detection is disabled)
    if (changed) {
      await sendContentToWebhook(tabId, content, url, selector, changed);
    } else {
      console.log('Content unchanged, skipping webhook');
    }
  } catch (error) {
    console.error('Error processing content extraction:', error);
  }
}

/**
 * Refresh a monitored page
 * @param {number} tabId - Tab ID
 */
async function refreshPage(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab) {
      console.error('Tab not found:', tabId);
      stopMonitoring(tabId);
      return;
    }

    // Reload the tab
    await chrome.tabs.reload(tabId);
    
    // Wait for page to load and content script to be ready
    // Retry mechanism to handle slow-loading pages
    let retries = 0;
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds
    
    const tryExtract = async () => {
      try {
        await chrome.tabs.sendMessage(tabId, {
          action: 'extractContent'
        });
        console.log('Content extraction requested after refresh');
      } catch (error) {
        if (retries < maxRetries) {
          retries++;
          console.log(`Retrying content extraction (${retries}/${maxRetries})...`);
          setTimeout(tryExtract, retryDelay);
        } else {
          console.error('Failed to request content extraction after refresh:', error);
        }
      }
    };
    
    // Start trying after initial delay
    setTimeout(tryExtract, retryDelay);
  } catch (error) {
    console.error('Error refreshing page:', error);
  }
}

/**
 * Start monitoring a tab
 * @param {number} tabId - Tab ID
 * @param {Object} config - Monitoring configuration
 */
async function startMonitoring(tabId, config) {
  // Stop existing monitoring if any
  stopMonitoring(tabId);

  // Validate configuration
  if (!config.selector || !config.refreshInterval) {
    throw new Error('Invalid monitoring configuration');
  }

  // Save configuration
  await saveMonitoringConfig(tabId, {
    ...config,
    enabled: true,
    url: config.url || ''
  });

  // Get tab URL if not provided
  let url = config.url;
  if (!url) {
    try {
      const tab = await chrome.tabs.get(tabId);
      url = tab.url;
      await saveMonitoringConfig(tabId, { ...config, url });
    } catch (error) {
      console.error('Error getting tab URL:', error);
    }
  }

  // Initial content extraction
  try {
    await chrome.tabs.sendMessage(tabId, {
      action: 'extractContent'
    });
  } catch (error) {
    console.error('Error sending initial extraction request:', error);
  }

  // Set up refresh interval
  const intervalId = setInterval(() => {
    refreshPage(tabId);
  }, config.refreshInterval);

  monitoringIntervals.set(tabId, intervalId);
  console.log(`Started monitoring tab ${tabId} with interval ${config.refreshInterval}ms`);
}

/**
 * Stop monitoring a tab
 * @param {number} tabId - Tab ID
 */
async function stopMonitoring(tabId) {
  // Clear interval
  const intervalId = monitoringIntervals.get(tabId);
  if (intervalId) {
    clearInterval(intervalId);
    monitoringIntervals.delete(tabId);
  }

  // Remove configuration
  await removeMonitoringConfig(tabId);
  
  console.log(`Stopped monitoring tab ${tabId}`);
}

/**
 * Get monitoring status for a tab
 * @param {number} tabId - Tab ID
 * @returns {Promise<Object>} Monitoring status
 */
async function getMonitoringStatus(tabId) {
  const config = await getMonitoringConfig(tabId);
  const isActive = monitoringIntervals.has(tabId);
  
  return {
    isMonitoring: isActive,
    config: config
  };
}

/**
 * Handle tab removal - cleanup monitoring
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  stopMonitoring(tabId);
});

/**
 * Handle tab update - check if URL changed
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    const config = await getMonitoringConfig(tabId);
    if (config) {
      // URL changed, update config
      await saveMonitoringConfig(tabId, {
        ...config,
        url: tab.url
      });
    }
  }
});

// Export functions for use in background.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    startMonitoring,
    stopMonitoring,
    getMonitoringStatus,
    processContentExtraction
  };
}

