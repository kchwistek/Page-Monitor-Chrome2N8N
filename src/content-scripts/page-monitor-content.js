/**
 * Page Monitor Content Script
 * Extracts content from specified HTML blocks and sends to background script
 */

console.log('Page Monitor: Content script loaded on:', window.location.href);

/**
 * Extract content from a CSS selector
 * @param {string} selector - CSS selector for the content block
 * @param {string} contentType - 'html' or 'text'
 * @param {boolean} validateContent - Whether to validate the extracted content
 * @returns {Object} Extracted content data
 */
function extractBlockContent(selector, contentType = 'html', validateContent = false) {
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

    const trimmedContent = content.trim();

    if (validateContent) {
      const minContentLength = 100;
      if (trimmedContent.length < minContentLength) {
        return {
          success: false,
          error: 'Content too short, page may still be loading',
          content: trimmedContent
        };
      }

      const loadingIndicators = [
        'NaN',
        'undefined',
        'Loading...',
        'loading',
        /\bNaN\b/,
        /undefined items/,
        /of NaN pages/
      ];

      for (const indicator of loadingIndicators) {
        if (typeof indicator === 'string' && trimmedContent.includes(indicator)) {
          return {
            success: false,
            error: 'Page still loading (detected loading indicators)',
            content: trimmedContent
          };
        }

        if (indicator instanceof RegExp && indicator.test(trimmedContent)) {
          return {
            success: false,
            error: 'Page still loading (detected loading indicators)',
            content: trimmedContent
          };
        }
      }

      if (contentType === 'text') {
        const lines = trimmedContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length < 3) {
          return {
            success: false,
            error: 'Content appears incomplete (too few lines)',
            content: trimmedContent
          };
        }
      }
    }

    return {
      success: true,
      content: trimmedContent,
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
async function handleExtractContent(request, sender) {
  try {
    // Check if selector is provided directly in the request
    if (request.selector) {
      const contentType = request.contentType || 'html';
      const validateContent = request.validateContent || false;
      const result = extractBlockContent(request.selector, contentType, validateContent);
      
      // If tabId is provided and extraction successful, notify background
      if (result.success && request.tabId) {
        chrome.runtime.sendMessage({
          action: 'contentExtracted',
          tabId: request.tabId,
          data: result
        });
      }
      
      return result;
    }

    // Fallback: Get tab ID from sender or try to get from message
    let tabId = request.tabId || sender?.tab?.id;
    
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
    const result = extractBlockContent(config.selector, contentType, request.validateContent || false);

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

  // Handle ping to check if script is loaded
  if (request.action === 'ping') {
    sendResponse({ success: true, loaded: true });
    return true;
  }

  if (request.action === 'extractContent') {
    // Handle async extraction
    handleExtractContent(request, sender).then(result => {
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

