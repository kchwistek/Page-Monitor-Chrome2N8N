/**
 * Page Monitor UI Controller
 * Manages the monitoring interface and communication with background script
 */

class PageMonitor {
  constructor() {
    this.currentTabId = null;
    this.isMonitoring = false;
    this.initializeElements();
    this.loadCurrentTab();
    this.attachEventListeners();
    this.checkMonitoringStatus();
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    this.selectorInput = document.getElementById('selector');
    this.refreshIntervalInput = document.getElementById('refreshInterval');
    this.contentTypeSelect = document.getElementById('contentType');
    this.changeDetectionCheckbox = document.getElementById('changeDetection');
    this.startBtn = document.getElementById('startBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.testBtn = document.getElementById('testBtn');
    this.sendNowBtn = document.getElementById('sendNowBtn');
    this.currentTabUrl = document.getElementById('currentTabUrl');
    this.monitoringStatus = document.getElementById('monitoringStatus');
    this.statusDot = document.getElementById('statusDot');
    this.statusText = document.getElementById('statusText');
    this.statusDetails = document.getElementById('statusDetails');
    this.resultMessage = document.getElementById('resultMessage');
  }

  /**
   * Load current active tab information
   */
  async loadCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        this.currentTabId = tabs[0].id;
        this.currentTabUrl.textContent = tabs[0].url || 'Unknown URL';
      } else {
        this.currentTabUrl.textContent = 'No active tab found';
      }
      
      // Load defaults from storage
      await this.loadDefaults();
    } catch (error) {
      console.error('Error loading current tab:', error);
      this.currentTabUrl.textContent = 'Error loading tab information';
    }
  }

  /**
   * Load monitoring defaults from storage
   */
  async loadDefaults() {
    try {
      const result = await chrome.storage.local.get(['monitoringDefaults']);
      if (result.monitoringDefaults) {
        if (result.monitoringDefaults.refreshInterval) {
          this.refreshIntervalInput.value = result.monitoringDefaults.refreshInterval / 1000;
        }
        if (result.monitoringDefaults.changeDetection !== undefined) {
          this.changeDetectionCheckbox.checked = result.monitoringDefaults.changeDetection;
        }
      }
    } catch (error) {
      console.error('Error loading defaults:', error);
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    this.startBtn.addEventListener('click', () => this.startMonitoring());
    this.stopBtn.addEventListener('click', () => this.stopMonitoring());
    this.testBtn.addEventListener('click', () => this.testExtraction());
    this.sendNowBtn.addEventListener('click', () => this.sendNow());
    
    // Enter key on selector input
    this.selectorInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.startMonitoring();
      }
    });
  }

  /**
   * Check current monitoring status
   */
  async checkMonitoringStatus() {
    if (!this.currentTabId) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getMonitoringStatus',
        tabId: this.currentTabId
      });

      if (response && response.success) {
        this.isMonitoring = response.isMonitoring;
        this.updateUIFromStatus(response);
      }
    } catch (error) {
      console.error('Error checking monitoring status:', error);
    }
  }

  /**
   * Update UI based on monitoring status
   */
  updateUIFromStatus(status) {
    if (status.isMonitoring && status.config) {
      // Load existing config into form
      this.selectorInput.value = status.config.selector || '';
      this.refreshIntervalInput.value = (status.config.refreshInterval / 1000) || 30;
      this.contentTypeSelect.value = status.config.contentType || 'html';
      this.changeDetectionCheckbox.checked = status.config.changeDetection !== false;
      
      // Update UI state
      this.setMonitoringState(true);
      this.showStatus('Monitoring active', status.config);
    } else {
      this.setMonitoringState(false);
    }
  }

  /**
   * Set monitoring UI state
   */
  setMonitoringState(isMonitoring) {
    this.isMonitoring = isMonitoring;
    this.startBtn.disabled = isMonitoring;
    this.stopBtn.disabled = !isMonitoring;
    
    if (isMonitoring) {
      this.monitoringStatus.style.display = 'block';
    } else {
      this.monitoringStatus.style.display = 'none';
    }
  }

  /**
   * Show monitoring status
   */
  showStatus(text, config) {
    this.statusText.textContent = text;
    this.statusDot.className = 'fas fa-circle status-dot active';
    
    if (config) {
      const intervalSeconds = (config.refreshInterval / 1000) || 30;
      this.statusDetails.innerHTML = `
        <strong>Selector:</strong> ${config.selector || 'N/A'}<br>
        <strong>Interval:</strong> ${intervalSeconds} seconds<br>
        <strong>Change Detection:</strong> ${config.changeDetection ? 'Enabled' : 'Disabled'}
      `;
    }
  }

  /**
   * Validate form inputs
   */
  validateForm() {
    const selector = this.selectorInput.value.trim();
    const interval = parseInt(this.refreshIntervalInput.value);

    if (!selector) {
      this.showResult('Please enter a CSS selector', false);
      return false;
    }

    if (isNaN(interval) || interval < 5) {
      this.showResult('Refresh interval must be at least 5 seconds', false);
      return false;
    }

    return true;
  }

  /**
   * Start monitoring
   */
  async startMonitoring() {
    if (!this.validateForm()) {
      return;
    }

    if (!this.currentTabId) {
      this.showResult('No active tab found', false);
      return;
    }

    this.setButtonLoading(this.startBtn, true);

    try {
      const config = {
        selector: this.selectorInput.value.trim(),
        refreshInterval: parseInt(this.refreshIntervalInput.value) * 1000, // Convert to milliseconds
        changeDetection: this.changeDetectionCheckbox.checked,
        contentType: this.contentTypeSelect.value
      };

      const response = await chrome.runtime.sendMessage({
        action: 'startMonitoring',
        ...config
      });

      if (response && response.success) {
        this.setMonitoringState(true);
        this.showStatus('Monitoring active', config);
        this.showResult('Monitoring started successfully!', true);
      } else {
        this.showResult(response?.message || 'Failed to start monitoring', false);
      }
    } catch (error) {
      console.error('Error starting monitoring:', error);
      this.showResult('Error: ' + error.message, false);
    } finally {
      this.setButtonLoading(this.startBtn, false);
    }
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring() {
    if (!this.currentTabId) {
      return;
    }

    this.setButtonLoading(this.stopBtn, true);

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'stopMonitoring',
        tabId: this.currentTabId
      });

      if (response && response.success) {
        this.setMonitoringState(false);
        this.showResult('Monitoring stopped', true);
      } else {
        this.showResult(response?.message || 'Failed to stop monitoring', false);
      }
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      this.showResult('Error: ' + error.message, false);
    } finally {
      this.setButtonLoading(this.stopBtn, false);
    }
  }

  /**
   * Send content to webhook immediately
   */
  async sendNow() {
    const selector = this.selectorInput.value.trim();
    
    if (!selector) {
      this.showResult('Please enter a CSS selector first', false);
      return;
    }

    if (!this.currentTabId) {
      this.showResult('No active tab found', false);
      return;
    }

    this.setButtonLoading(this.sendNowBtn, true);

    try {
      // Extract content
      const response = await chrome.tabs.sendMessage(this.currentTabId, {
        action: 'extractContent'
      });

      if (!response || !response.success) {
        this.showResult(
          response?.error || 'Failed to extract content. Make sure the selector is correct and the page is loaded.',
          false
        );
        return;
      }

      // Send to webhook via background script
      const sendResponse = await chrome.runtime.sendMessage({
        action: 'sendContentNow',
        tabId: this.currentTabId,
        data: response
      });

      if (sendResponse && sendResponse.success) {
        this.showResult('✅ Content sent to webhook successfully!', true);
      } else {
        this.showResult(sendResponse?.message || 'Failed to send content to webhook', false);
      }
    } catch (error) {
      console.error('Error sending content:', error);
      if (error.message.includes('Could not establish connection')) {
        this.showResult(
          'Content script not loaded. Please refresh the page and try again.',
          false
        );
      } else {
        this.showResult('Error: ' + error.message, false);
      }
    } finally {
      this.setButtonLoading(this.sendNowBtn, false);
    }
  }

  /**
   * Test content extraction
   */
  async testExtraction() {
    const selector = this.selectorInput.value.trim();
    
    if (!selector) {
      this.showResult('Please enter a CSS selector first', false);
      return;
    }

    if (!this.currentTabId) {
      this.showResult('No active tab found', false);
      return;
    }

    this.setButtonLoading(this.testBtn, true);

    try {
      // Inject content script and request extraction
      const response = await chrome.tabs.sendMessage(this.currentTabId, {
        action: 'extractContent'
      });

      if (response && response.success) {
        const contentPreview = response.content.substring(0, 200);
        this.showResult(
          `✅ Content extracted successfully! (${response.content.length} characters)\nPreview: ${contentPreview}...`,
          true
        );
      } else {
        this.showResult(
          response?.error || 'Failed to extract content. Make sure the selector is correct and the page is loaded.',
          false
        );
      }
    } catch (error) {
      console.error('Error testing extraction:', error);
      if (error.message.includes('Could not establish connection')) {
        this.showResult(
          'Content script not loaded. Please refresh the page and try again.',
          false
        );
      } else {
        this.showResult('Error: ' + error.message, false);
      }
    } finally {
      this.setButtonLoading(this.testBtn, false);
    }
  }

  /**
   * Show result message
   */
  showResult(message, isSuccess) {
    this.resultMessage.textContent = message;
    this.resultMessage.className = `result-message ${isSuccess ? 'success' : 'error'}`;
    this.resultMessage.style.display = 'flex';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.resultMessage.style.display = 'none';
    }, 5000);
  }

  /**
   * Set button loading state
   */
  setButtonLoading(button, isLoading) {
    if (isLoading) {
      button.classList.add('loading');
      button.disabled = true;
    } else {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PageMonitor();
});

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Monitor page error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

