console.log('Page Monitor to n8n: Background service worker loaded');

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
 * Update extension icon to reflect monitoring state
 */
async function updateIconState() {
  try {
    const hasActiveMonitoring = monitoringIntervals.size > 0;
    
    if (hasActiveMonitoring) {
      // Show active monitoring indicator
      await chrome.action.setBadgeText({ text: '●' });
      await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' }); // Green
      await chrome.action.setTitle({ title: 'Page Monitor to n8n - Monitoring Active' });
    } else {
      // Clear indicator
      await chrome.action.setBadgeText({ text: '' });
      await chrome.action.setTitle({ title: 'Page Monitor to n8n' });
    }
  } catch (error) {
    console.error('Error updating icon state:', error);
  }
}

// Initialize icon state on startup
chrome.runtime.onStartup.addListener(() => {
  updateIconState();
});

// Also update icon state when extension is installed/enabled
chrome.runtime.onInstalled.addListener(() => {
  updateIconState();
});

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

    if (!webhookUrl || webhookUrl === 'YOUR_N8N_WEBHOOK_URL') {
      console.error('No webhook URL configured');
      return { success: false, message: 'No webhook URL set. Please configure it in extension options.' };
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

    const config = await getMonitoringConfig(tabId);
    if (!config || !config.selector) {
      console.error('No monitoring config or selector for tab:', tabId);
      return;
    }

    // Reload the tab
    await chrome.tabs.reload(tabId);
    
    // Wait for page to be fully loaded (status = 'complete')
    await waitForTabComplete(tabId, 10000); // Max 10 seconds
    
    // Wait for page to load and content script to be ready
    // Retry mechanism to handle slow-loading pages and dynamic content
    let retries = 0;
    const maxRetries = 10; // Increased retries for slow-loading content
    const retryDelay = 3000; // 3 seconds between retries
    
    const tryExtract = async () => {
      try {
        // Request extraction with validation
        const response = await chrome.tabs.sendMessage(tabId, {
          action: 'extractContent',
          selector: config.selector,
          contentType: config.contentType || 'html',
          tabId: tabId,
          validateContent: true // Request content validation
        });
        
        if (response && response.success) {
          // Validate that content is meaningful (not just headers/empty)
          const contentLength = response.content ? response.content.length : 0;
          const minContentLength = 100; // Minimum content length to consider valid
          
          if (contentLength < minContentLength) {
            console.log(`Content too short (${contentLength} chars), likely still loading...`);
            throw new Error('Content not fully loaded');
          }
          
          // Check for common loading indicators
          if (response.content.includes('NaN') || 
              response.content.includes('undefined') ||
              response.content.includes('Loading...') ||
              response.content.match(/\bNaN\b/)) {
            console.log('Page still loading (detected loading indicators)');
            throw new Error('Content still loading');
          }
          
          console.log('Content extraction successful after refresh');
        } else {
          throw new Error(response?.error || 'Extraction failed');
        }
      } catch (error) {
        if (retries < maxRetries) {
          retries++;
          console.log(`Retrying content extraction (${retries}/${maxRetries})...`);
          setTimeout(tryExtract, retryDelay);
        } else {
          console.error('Failed to extract content after refresh:', error);
        }
      }
    };
    
    // Start trying after initial delay (wait for dynamic content to load)
    setTimeout(tryExtract, 5000); // 5 seconds initial delay for dynamic content
  } catch (error) {
    console.error('Error refreshing page:', error);
  }
}

/**
 * Wait for tab to reach 'complete' status
 * @param {number} tabId - Tab ID
 * @param {number} timeout - Maximum time to wait in milliseconds
 */
async function waitForTabComplete(tabId, timeout = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.status === 'complete') {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 500)); // Check every 500ms
    } catch (error) {
      console.error('Error waiting for tab complete:', error);
      return;
    }
  }
  
  console.warn('Timeout waiting for tab to complete');
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
  
  // Update icon to show active monitoring
  await updateIconState();
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
  
  // Update icon state
  await updateIconState();
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

// Message listener for extension communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Page monitoring actions
  if (request.action === "startMonitoring") {
    handleStartMonitoring(request, sender, sendResponse);
    return true;
  }

  if (request.action === "stopMonitoring") {
    handleStopMonitoring(request, sender, sendResponse);
    return true;
  }

  if (request.action === "getMonitoringStatus") {
    handleGetMonitoringStatus(request, sender, sendResponse);
    return true;
  }

  if (request.action === "contentExtracted") {
    handleContentExtracted(request, sender, sendResponse);
    return true;
  }

  if (request.action === "getTabId") {
    sendResponse({ tabId: sender.tab?.id });
    return true;
  }

  if (request.action === "sendContentNow") {
    handleSendContentNow(request, sender, sendResponse);
    return true;
  }
});

/**
 * Handle start monitoring request
 */
async function handleStartMonitoring(request, sender, sendResponse) {
  try {
    // Use tabId from request if provided (from monitor page), otherwise use sender.tab.id
    const tabId = request.tabId || sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, message: 'No tab ID available' });
      return;
    }

    const config = {
      selector: request.selector,
      refreshInterval: request.refreshInterval || 30000,
      changeDetection: request.changeDetection !== false,
      contentType: request.contentType || 'html',
      url: request.url || sender.tab?.url
    };

    await startMonitoring(tabId, config);
    sendResponse({ success: true, message: 'Monitoring started' });
  } catch (error) {
    sendResponse({ success: false, message: error.message });
  }
}

/**
 * Handle stop monitoring request
 */
async function handleStopMonitoring(request, sender, sendResponse) {
  try {
    const tabId = request.tabId || sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, message: 'No tab ID available' });
      return;
    }

    await stopMonitoring(tabId);
    sendResponse({ success: true, message: 'Monitoring stopped' });
  } catch (error) {
    sendResponse({ success: false, message: error.message });
  }
}

/**
 * Handle get monitoring status request
 */
async function handleGetMonitoringStatus(request, sender, sendResponse) {
  try {
    const tabId = request.tabId || sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, message: 'No tab ID available' });
      return;
    }

    const status = await getMonitoringStatus(tabId);
    sendResponse({ success: true, ...status });
  } catch (error) {
    sendResponse({ success: false, message: error.message });
  }
}

/**
 * Handle content extracted from content script
 */
async function handleContentExtracted(request, sender, sendResponse) {
  try {
    const tabId = request.tabId || sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, message: 'No tab ID available' });
      return;
    }

    await processContentExtraction(tabId, request.data);
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, message: error.message });
  }
}

/**
 * Handle send content now request (manual send)
 */
async function handleSendContentNow(request, sender, sendResponse) {
  try {
    const tabId = request.tabId || sender.tab?.id;
    if (!tabId) {
      sendResponse({ success: false, message: 'No tab ID available' });
      return;
    }

    const { data } = request;
    if (!data || !data.success) {
      sendResponse({ success: false, message: 'Failed to extract content' });
      return;
    }

    // Get the actual tab URL (not from sender.tab which might be extension page)
    let url = data.url;
    if (!url) {
      try {
        const tab = await chrome.tabs.get(tabId);
        url = tab.url;
      } catch (tabError) {
        console.error('Error getting tab URL:', tabError);
        url = data.url || 'Unknown URL';
      }
    }

    // Send directly to webhook (bypass change detection)
    const result = await sendContentToWebhook(
      tabId,
      data.content,
      url,
      data.selector,
      true // Always mark as changed for manual sends
    );

    sendResponse(result);
  } catch (error) {
    console.error('Error in handleSendContentNow:', error);
    sendResponse({ success: false, message: error.message });
  }
}

/**
 * Handle tab removal - cleanup monitoring
 */
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await stopMonitoring(tabId);
  await updateIconState();
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
