/**
 * Page Monitor Content Script
 * Extracts content from specified HTML blocks and sends to background script
 */

console.log('Page Monitor: Content script loaded on:', window.location.href);

/**
 * Extract content from a CSS selector
 * @param {string} selector - CSS selector for the content block
 * @param {string} contentType - 'html' or 'text'
 * @returns {Object} Extracted content data
 */
function extractBlockContent(selector, contentType = 'html') {
  try {
    if (!selector || selector.trim() === '') {
      return {
        success: false,
        error: 'No selector provided'
      };
    }

    const element = document.querySelector(selector);
    
    if (!element) {
      return {
        success: false,
        error: `Element not found for selector: ${selector}`
      };
    }

    let content;
    if (contentType === 'text') {
      content = element.innerText || element.textContent || '';
    } else {
      content = element.innerHTML || element.outerHTML || '';
    }

    return {
      success: true,
      content: content.trim(),
      selector: selector,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error extracting content:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get monitoring configuration from storage
 * @param {number} tabId - Tab ID
 * @returns {Promise<Object>} Configuration
 */
async function getMonitoringConfig(tabId) {
  try {
    const result = await chrome.storage.local.get(['monitoringConfig']);
    const configs = result.monitoringConfig || {};
    return configs[tabId] || null;
  } catch (error) {
    console.error('Error getting monitoring config:', error);
    return null;
  }
}

/**
 * Handle content extraction request from background script
 */
async function handleExtractContent(sender) {
  try {
    // Get tab ID from sender or try to get from message
    let tabId = sender?.tab?.id;
    
    if (!tabId) {
      // Try to get from storage using URL pattern
      const result = await chrome.storage.local.get(['monitoringConfig']);
      const configs = result.monitoringConfig || {};
      // Find config matching current URL
      for (const [id, cfg] of Object.entries(configs)) {
        if (cfg.url === window.location.href) {
          tabId = parseInt(id);
          break;
        }
      }
    }

    // If we still don't have tab ID, try to get config from current URL
    let config = null;
    if (tabId) {
      config = await getMonitoringConfig(tabId);
    }

    // If no config found, try to get from storage using URL pattern
    if (!config) {
      const result = await chrome.storage.local.get(['monitoringConfig']);
      const configs = result.monitoringConfig || {};
      // Find config matching current URL
      for (const [id, cfg] of Object.entries(configs)) {
        if (cfg.url === window.location.href) {
          config = cfg;
          tabId = parseInt(id);
          break;
        }
      }
    }

    if (!config || !config.selector) {
      return {
        success: false,
        error: 'No monitoring configuration found for this page'
      };
    }

    const contentType = config.contentType || 'html';
    const result = extractBlockContent(config.selector, contentType);

    if (result.success && tabId) {
      // Send to background script
      chrome.runtime.sendMessage({
        action: 'contentExtracted',
        tabId: tabId,
        data: result
      });
    }

    return result;
  } catch (error) {
    console.error('Error handling extract content:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Message listener for background script communication
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Page Monitor content script received message:', request.action);

  if (request.action === 'extractContent') {
    // Handle async extraction
    handleExtractContent(sender).then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({
        success: false,
        error: error.message
      });
    });
    return true; // Keep channel open for async response
  }

  if (request.action === 'getMonitoringConfig') {
    // Get tab ID from sender
    const tabId = sender.tab?.id;
    if (tabId) {
      getMonitoringConfig(tabId).then(config => {
        sendResponse({ success: true, config });
      });
    } else {
      sendResponse({ success: false, error: 'Could not determine tab ID' });
    }
    return true;
  }
});

/**
 * Watch for DOM changes (optional - for real-time monitoring without refresh)
 * This can be enabled for pages that update dynamically
 */
let mutationObserver = null;

function startMutationObserver(selector, callback) {
  if (mutationObserver) {
    mutationObserver.disconnect();
  }

  const targetNode = document.querySelector(selector);
  if (!targetNode) {
    console.warn('Target node not found for mutation observer:', selector);
    return;
  }

  mutationObserver = new MutationObserver((mutations) => {
    callback();
  });

  mutationObserver.observe(targetNode, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true
  });
}

function stopMutationObserver() {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
}

// Listen for page load completion
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Page Monitor: DOM loaded');
  });
} else {
  console.log('Page Monitor: DOM already loaded');
}

