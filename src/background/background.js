console.log('Page Monitor to n8n: Background service worker loaded');

// Import page monitoring functions
importScripts('src/background/page-monitor.js');

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
    const tabId = sender.tab?.id;
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

    // Send directly to webhook (bypass change detection)
    const result = await sendContentToWebhook(
      tabId,
      data.content,
      data.url || sender.tab?.url,
      data.selector,
      true // Always mark as changed for manual sends
    );

    sendResponse(result);
  } catch (error) {
    sendResponse({ success: false, message: error.message });
  }
}
