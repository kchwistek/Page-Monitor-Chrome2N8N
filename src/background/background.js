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
 * Update extension icon to reflect monitoring state of the active tab
 */
async function updateIconState() {
  try {
    // Get the active tab in the current window
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    
    if (!activeTab) {
      // No active tab, clear indicator
      await chrome.action.setBadgeText({ text: '' });
      await chrome.action.setTitle({ title: 'Page Monitor to n8n' });
      return;
    }
    
    const activeTabId = activeTab.id;
    const isActiveTabMonitored = monitoringIntervals.has(activeTabId);
    
    if (isActiveTabMonitored) {
      // Show active monitoring indicator for the active tab
      await chrome.action.setBadgeText({ text: '●' });
      await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' }); // Green
      await chrome.action.setTitle({ title: 'Page Monitor to n8n - Monitoring Active' });
    } else {
      // Clear indicator if active tab is not monitored
      await chrome.action.setBadgeText({ text: '' });
      await chrome.action.setTitle({ title: 'Page Monitor to n8n' });
    }
  } catch (error) {
    console.error('Error updating icon state:', error);
  }
}

/**
 * Restore monitoring state from storage on service worker startup
 * This handles browser refresh scenarios where the service worker restarts
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

// Initialize icon state and restore monitoring on startup
chrome.runtime.onStartup.addListener(async () => {
  await restoreMonitoringState();
  await updateIconState();
});

// Also restore monitoring and update icon state when extension is installed/enabled
chrome.runtime.onInstalled.addListener(async () => {
  await restoreMonitoringState();
  await updateIconState();
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
 * @param {string|null} overrideWebhookUrl - Optional webhook URL to use (from form input)
 */
async function sendContentToWebhook(tabId, content, url, selector, changeDetected, overrideWebhookUrl = null) {
  try {
    console.log('=== sendContentToWebhook Debug ===');
    console.log('overrideWebhookUrl parameter:', overrideWebhookUrl);
    console.log('overrideWebhookUrl type:', typeof overrideWebhookUrl);
    
    // Get config first (needed for metadata regardless of webhook source)
    const config = await getMonitoringConfig(tabId);
    console.log('Tab config:', config);
    
    let webhookUrl = overrideWebhookUrl;
    
    // If no override provided, get tab-specific webhook URL from config, fallback to global webhook
    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
      console.log('No valid override webhook, checking saved config...');
      webhookUrl = config?.webhookUrl;
      console.log('Webhook URL from config:', webhookUrl);
      
      // Only use tab-specific webhook if it's a valid non-empty string
      if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
        console.log('No valid webhook in config, checking global webhook...');
        // Fall back to global webhook
        const storage = await chrome.storage.local.get('webhookUrl');
        webhookUrl = storage.webhookUrl;
        console.log('Global webhook from storage:', webhookUrl);
        
        // Validate webhook URL after checking both tab-specific and global
        if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim() || webhookUrl === 'YOUR_N8N_WEBHOOK_URL') {
          console.error('❌ No webhook URL configured. Tab config:', config, 'Global webhook:', storage.webhookUrl);
          return { success: false, message: 'No webhook URL set. Please configure it in the monitoring settings or extension options.' };
        }
      } else {
        // Tab-specific webhook is set, validate it
        if (webhookUrl === 'YOUR_N8N_WEBHOOK_URL') {
          console.error('Invalid webhook URL in tab config:', config);
          return { success: false, message: 'Invalid webhook URL configured. Please update it in the monitoring settings.' };
        }
      }
    } else {
      console.log('✅ Using override webhook URL:', webhookUrl);
      // Override webhook URL provided, validate it
      if (webhookUrl === 'YOUR_N8N_WEBHOOK_URL') {
        console.error('Invalid webhook URL provided:', webhookUrl);
        return { success: false, message: 'Invalid webhook URL. Please check the URL in the monitoring settings.' };
      }
    }
    
    console.log('Final webhook URL to use:', webhookUrl);

    const payload = {
      type: 'page_monitor',
      timestamp: new Date().toISOString(),
      url: url,
      content: content,
      selector: selector,
      changeDetected: changeDetected,
      metadata: {
        refreshInterval: config?.refreshInterval || 30000,
        tabId: tabId,
        webhookUrl: webhookUrl // Include which webhook was used
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

    const targetUrl = config.initialUrl || config.url || '';
    if (targetUrl && tab.url) {
      const normalizedTarget = normalizeUrl(targetUrl);
      const normalizedCurrent = normalizeUrl(tab.url);

      if (normalizedTarget !== normalizedCurrent) {
        console.warn(`Tab ${tabId} navigated away from monitored URL. Stopping monitoring to avoid refreshing unrelated tab.`);
        await stopMonitoring(tabId);
        return;
      }
    }

    // Reload the specific monitored tab only
    await chrome.tabs.reload(tabId);

    // Wait for the tab to fully load before attempting extraction
    await waitForTabComplete(tabId, 10000); // Max 10 seconds

    // Retry mechanism to handle slow-loading pages and dynamic content
    let retries = 0;
    const maxRetries = 10;
    const retryDelay = 3000; // 3 seconds between retries

    const tryExtract = async () => {
      try {
        const response = await chrome.tabs.sendMessage(tabId, {
          action: 'extractContent',
          selector: config.selector,
          contentType: config.contentType || 'html',
          tabId,
          validateContent: true
        });

        if (response && response.success) {
          const contentLength = response.content ? response.content.length : 0;
          const minContentLength = 100;

          if (contentLength < minContentLength) {
            console.log(`Content too short (${contentLength} chars), likely still loading...`);
            throw new Error('Content not fully loaded');
          }

          if (
            response.content.includes('NaN') ||
            response.content.includes('undefined') ||
            response.content.includes('Loading...') ||
            /\bNaN\b/.test(response.content)
          ) {
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
          console.log(`Retrying content extraction for tab ${tabId} (${retries}/${maxRetries})...`);
          setTimeout(tryExtract, retryDelay);
        } else {
          console.error('Failed to extract content after refresh:', error);
        }
      }
    };

    // Delay initial extraction attempt to allow dynamic content loading
    setTimeout(tryExtract, 5000);
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
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error waiting for tab complete:', error);
      return;
    }
  }

  console.warn(`Timeout waiting for tab ${tabId} to complete loading`);
}

function normalizeUrl(url) {
  if (!url) {
    return '';
  }

  try {
    const parsed = new URL(url);
    parsed.hash = '';
    const normalized = parsed.href.replace(/\/+$/, '');
    return normalized;
  } catch (error) {
    return url;
  }
}

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
  try {
    // Get tab info to check if it's a valid web page
    const tab = await chrome.tabs.get(tabId);
    if (!isValidWebPage(tab.url)) {
      console.warn('Cannot monitor extension pages or special URLs:', tab.url);
      return false;
    }

    // Try to send a ping message to check if content script is loaded
    try {
      await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      return true;
    } catch (error) {
      if (error.message.includes('Could not establish connection')) {
        // Content script not loaded, try to inject it
        try {
          // Double-check it's a valid web page before injecting
          const tab = await chrome.tabs.get(tabId);
          if (!isValidWebPage(tab.url)) {
            return false;
          }

          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['src/content-scripts/page-monitor-content.js']
          });
          // Wait a bit for script to initialize, then verify it's loaded
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Retry ping to verify injection was successful
          try {
            await chrome.tabs.sendMessage(tabId, { action: 'ping' });
            return true;
          } catch (retryError) {
            console.error('Content script still not responding after injection:', retryError);
            return false;
          }
        } catch (injectError) {
          console.error('Failed to inject content script:', injectError);
          // Some pages (like chrome://) don't allow script injection
          return false;
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Error ensuring content script loaded:', error);
    return false;
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

  let tabInfo = null;
  try {
    tabInfo = await chrome.tabs.get(tabId);
  } catch (error) {
    console.error('Error getting tab info:', error);
  }

  const resolvedUrl = config.url || tabInfo?.url || '';
  const windowId = tabInfo?.windowId ?? null;

  await saveMonitoringConfig(tabId, {
    ...config,
    enabled: true,
    url: resolvedUrl,
    initialUrl: resolvedUrl,
    tabId,
    windowId
  });

  // Ensure content script is loaded before initial extraction
  const contentScriptLoaded = await ensureContentScriptLoaded(tabId);
  if (!contentScriptLoaded) {
    console.warn(`Content script could not be loaded for tab ${tabId}, initial extraction will be skipped`);
  }

  // Initial content extraction (only if content script is loaded)
  if (contentScriptLoaded) {
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

  if (request.action === "getAllMonitoringStatus") {
    handleGetAllMonitoringStatus(request, sender, sendResponse);
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
    console.log('🔵 Background received sendContentNow action');
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

    // Support both request.config (from popup) and direct properties (from monitor page)
    const configData = request.config || request;
    
    const config = {
      selector: configData.selector,
      refreshInterval: configData.refreshInterval || 30000,
      changeDetection: configData.changeDetection !== false,
      contentType: configData.contentType || 'html',
      url: configData.url || request.url || sender.tab?.url
    };
    
    // Only include webhookUrl if it's a non-empty string (null/empty means use global)
    if (configData.webhookUrl && typeof configData.webhookUrl === 'string' && configData.webhookUrl.trim()) {
      config.webhookUrl = configData.webhookUrl.trim();
    }

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
 * Handle get all monitoring status request
 */
async function handleGetAllMonitoringStatus(request, sender, sendResponse) {
  try {
    // Return all tab IDs that are currently being monitored
    const monitoredTabs = Array.from(monitoringIntervals.keys());
    sendResponse({ success: true, monitoredTabs });
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

    // Use webhook URL from request if provided (from popup form), otherwise use saved config or global
    console.log('=== handleSendContentNow Debug ===');
    console.log('Request object:', request);
    console.log('Request.webhookUrl:', request.webhookUrl);
    console.log('Request.webhookUrl type:', typeof request.webhookUrl);
    
    let webhookUrl = null;
    if (request.webhookUrl && typeof request.webhookUrl === 'string' && request.webhookUrl.trim()) {
      webhookUrl = request.webhookUrl.trim();
      console.log('✅ Using webhook URL from form:', webhookUrl);
    } else {
      console.log('⚠️ No valid webhook URL in request. Value:', request.webhookUrl);
      console.log('Will check saved config and global webhook...');
    }

    // Send directly to webhook (bypass change detection)
    const result = await sendContentToWebhook(
      tabId,
      data.content,
      url,
      data.selector,
      true, // Always mark as changed for manual sends
      webhookUrl // Pass webhook URL if provided from form
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
 * Handle tab activation - update icon state when user switches tabs
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateIconState();
});

/**
 * Handle tab update - check if URL changed and update icon if it's the active tab
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
  
  // Update icon state if this is the active tab and status changed
  if (changeInfo.status === 'complete' || changeInfo.status === 'loading') {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].id === tabId) {
      await updateIconState();
    }
  }
});
