/**
 * Page Monitor UI Controller
 * Manages the monitoring interface and communication with background script
 */

class PageMonitor {
  constructor() {
    this.currentTabId = null;
    this.monitorTabId = null; // ID of the monitor.html tab itself
    this.isMonitoring = false;
    this.initializeElements();
    this.attachEventListeners();
    this.getMonitorTabId();
    this.loadTabs().then(() => {
      this.checkMonitoringStatus();
      this.loadProfiles();
    });
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    this.selectorInput = document.getElementById('selector');
    this.refreshIntervalInput = document.getElementById('refreshInterval');
    this.contentTypeSelect = document.getElementById('contentType');
    this.changeDetectionCheckbox = document.getElementById('changeDetection');
    this.tabSelector = document.getElementById('tabSelector');
    this.refreshTabsBtn = document.getElementById('refreshTabsBtn');
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
    
    // Profile management elements
    this.profileSelector = document.getElementById('profileSelector');
    this.loadProfileBtn = document.getElementById('loadProfileBtn');
    this.saveProfileBtn = document.getElementById('saveProfileBtn');
    this.deleteProfileBtn = document.getElementById('deleteProfileBtn');
    this.saveProfileGroup = document.getElementById('saveProfileGroup');
    this.profileNameInput = document.getElementById('profileNameInput');
    this.confirmSaveBtn = document.getElementById('confirmSaveBtn');
    this.cancelSaveBtn = document.getElementById('cancelSaveBtn');
  }

  /**
   * Load and populate tab selector with all web page tabs
   */
  async loadTabs() {
    try {
      // Get all tabs in current window
      const tabs = await chrome.tabs.query({ currentWindow: true });
      
      // Filter out extension pages and special URLs
      const webTabs = tabs.filter(tab => {
        const url = tab.url || '';
        return url && !url.startsWith('chrome-extension://') && 
               !url.startsWith('chrome://') && 
               !url.startsWith('edge://') &&
               !url.startsWith('about:') &&
               (url.startsWith('http://') || url.startsWith('https://'));
      });
      
      // Clear existing options
      this.tabSelector.innerHTML = '';
      
      if (webTabs.length === 0) {
        this.tabSelector.innerHTML = '<option value="">No web page tabs found. Please open a web page first.</option>';
        this.currentTabId = null;
        this.currentTabUrl.textContent = 'No web page tab found';
        return;
      }
      
      // Sort by last accessed time (most recent first)
      const sortedTabs = webTabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
      
      // Populate dropdown
      sortedTabs.forEach(tab => {
        const option = document.createElement('option');
        option.value = tab.id;
        option.textContent = this.formatTabTitle(tab);
        this.tabSelector.appendChild(option);
      });
      
      // Select the most recently accessed tab by default
      if (sortedTabs.length > 0) {
        this.currentTabId = sortedTabs[0].id;
        this.tabSelector.value = sortedTabs[0].id;
        this.updateTabInfo();
      }
      
      // Load defaults from storage
      await this.loadDefaults();
    } catch (error) {
      console.error('Error loading tabs:', error);
      this.tabSelector.innerHTML = '<option value="">Error loading tabs</option>';
      this.currentTabUrl.textContent = 'Error loading tab information';
    }
  }

  /**
   * Format tab title for display
   */
  formatTabTitle(tab) {
    const title = tab.title || 'Untitled';
    const url = new URL(tab.url);
    const domain = url.hostname.replace('www.', '');
    // Truncate title if too long
    const shortTitle = title.length > 40 ? title.substring(0, 37) + '...' : title;
    return `${shortTitle} (${domain})`;
  }

  /**
   * Get the monitor tab ID (the tab this page is running in)
   */
  async getMonitorTabId() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('monitor.html')) {
        this.monitorTabId = tabs[0].id;
      } else {
        // Fallback: find the monitor.html tab
        const allTabs = await chrome.tabs.query({});
        const monitorTab = allTabs.find(tab => tab.url && tab.url.includes('monitor.html'));
        if (monitorTab) {
          this.monitorTabId = monitorTab.id;
        }
      }
    } catch (error) {
      console.error('Error getting monitor tab ID:', error);
    }
  }

  /**
   * Close the monitor tab and switch to the monitored tab
   */
  async closeMonitorTab() {
    try {
      // Switch to the monitored tab first
      if (this.currentTabId) {
        try {
          await chrome.tabs.update(this.currentTabId, { active: true });
        } catch (error) {
          console.error('Error switching to monitored tab:', error);
        }
      }

      // Close the monitor tab after a short delay to allow the success message to be seen
      setTimeout(async () => {
        if (this.monitorTabId) {
          try {
            await chrome.tabs.remove(this.monitorTabId);
          } catch (error) {
            console.error('Error closing monitor tab:', error);
            // If we can't close by ID, try to find and close it
            try {
              const tabs = await chrome.tabs.query({});
              const monitorTab = tabs.find(tab => tab.url && tab.url.includes('monitor.html'));
              if (monitorTab) {
                await chrome.tabs.remove(monitorTab.id);
              }
            } catch (fallbackError) {
              console.error('Error closing monitor tab (fallback):', fallbackError);
            }
          }
        }
      }, 500); // Small delay to show success message
    } catch (error) {
      console.error('Error in closeMonitorTab:', error);
    }
  }

  /**
   * Update tab info display
   */
  async updateTabInfo() {
    if (!this.currentTabId) {
      this.currentTabUrl.textContent = 'No tab selected';
      return;
    }

    try {
      const tab = await chrome.tabs.get(this.currentTabId);
      this.currentTabUrl.textContent = tab.url || 'Unknown URL';
    } catch (error) {
      console.error('Error getting tab info:', error);
      this.currentTabUrl.textContent = 'Error loading tab information';
    }
  }

  /**
   * Load current active tab information (deprecated - use loadTabs instead)
   */
  async loadCurrentTab() {
    // Redirect to new method
    await this.loadTabs();
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
    
    // Tab selector change
    this.tabSelector.addEventListener('change', (e) => {
      const tabId = parseInt(e.target.value);
      if (tabId) {
        this.currentTabId = tabId;
        this.updateTabInfo();
        this.checkMonitoringStatus();
      }
    });

    // Refresh tabs button
    this.refreshTabsBtn.addEventListener('click', () => {
      this.loadTabs();
    });

    // Profile management
    this.loadProfileBtn.addEventListener('click', () => this.loadProfile());
    this.saveProfileBtn.addEventListener('click', () => this.showSaveProfileInput());
    this.deleteProfileBtn.addEventListener('click', () => this.deleteProfile());
    this.confirmSaveBtn.addEventListener('click', () => this.saveProfile());
    this.cancelSaveBtn.addEventListener('click', () => this.hideSaveProfileInput());
    this.profileSelector.addEventListener('change', () => {
      this.deleteProfileBtn.disabled = !this.profileSelector.value;
      this.loadProfileBtn.disabled = !this.profileSelector.value;
    });
    
    // Enter key on selector input
    this.selectorInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.startMonitoring();
      }
    });

    // Enter key on profile name input
    this.profileNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveProfile();
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

    // Validate that the tab is a valid web page
    try {
      const tab = await chrome.tabs.get(this.currentTabId);
      if (!this.isValidWebPage(tab.url)) {
        this.showResult(
          'Cannot monitor extension pages or special URLs. Please open a regular web page.',
          false
        );
        return;
      }
    } catch (error) {
      this.showResult('Error accessing tab: ' + error.message, false);
      return;
    }

    this.setButtonLoading(this.startBtn, true);

    try {
      // Get tab URL
      let url = '';
      try {
        const tab = await chrome.tabs.get(this.currentTabId);
        url = tab.url || '';
      } catch (error) {
        console.error('Error getting tab URL:', error);
      }

      const config = {
        selector: this.selectorInput.value.trim(),
        refreshInterval: parseInt(this.refreshIntervalInput.value) * 1000, // Convert to milliseconds
        changeDetection: this.changeDetectionCheckbox.checked,
        contentType: this.contentTypeSelect.value,
        url: url
      };

      const response = await chrome.runtime.sendMessage({
        action: 'startMonitoring',
        tabId: this.currentTabId,
        ...config
      });

      if (response && response.success) {
        this.setMonitoringState(true);
        this.showStatus('Monitoring active', config);
        this.showResult('Monitoring started successfully!', true);
        
        // Close the monitor tab and switch to the monitored tab
        this.closeMonitorTab();
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
   * Check if a URL is a valid web page (not extension or special page)
   */
  isValidWebPage(url) {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  }

  /**
   * Ensure content script is loaded, inject if necessary
   */
  async ensureContentScriptLoaded() {
    if (!this.currentTabId) {
      return false;
    }

    try {
      // Get tab info to check if it's a valid web page
      const tab = await chrome.tabs.get(this.currentTabId);
      if (!this.isValidWebPage(tab.url)) {
        this.showResult(
          'Cannot monitor extension pages or special URLs. Please open a regular web page.',
          false
        );
        return false;
      }

      // Try to send a ping message to check if content script is loaded
      await chrome.tabs.sendMessage(this.currentTabId, { action: 'ping' });
      return true;
    } catch (error) {
      if (error.message.includes('Could not establish connection')) {
        // Content script not loaded, try to inject it
        try {
          // Double-check it's a valid web page before injecting
          const tab = await chrome.tabs.get(this.currentTabId);
          if (!this.isValidWebPage(tab.url)) {
            return false;
          }

          await chrome.scripting.executeScript({
            target: { tabId: this.currentTabId },
            files: ['src/content-scripts/page-monitor-content.js']
          });
          // Wait a bit for script to initialize, then verify it's loaded
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Retry ping to verify injection was successful
          try {
            await chrome.tabs.sendMessage(this.currentTabId, { action: 'ping' });
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
      // Ensure content script is loaded
      const scriptLoaded = await this.ensureContentScriptLoaded();
      if (!scriptLoaded) {
        this.showResult(
          'Content script not loaded. Please refresh the page and try again.',
          false
        );
        return;
      }

      // Extract content with selector from input
      const response = await chrome.tabs.sendMessage(this.currentTabId, {
        action: 'extractContent',
        selector: selector,
        contentType: this.contentTypeSelect.value || 'html',
        tabId: this.currentTabId
      });

      if (!response || !response.success) {
        this.showResult(
          response?.error || 'Failed to extract content. Make sure the selector is correct and the page is loaded.',
          false
        );
        return;
      }

      // Send to webhook via background script
      // Add timeout to prevent hanging
      let sendResponse;
      try {
        sendResponse = await Promise.race([
          chrome.runtime.sendMessage({
            action: 'sendContentNow',
            tabId: this.currentTabId,
            data: response
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
          )
        ]);
      } catch (timeoutError) {
        console.error('Send request timeout or error:', timeoutError);
        this.showResult('Request timed out. Please check your webhook URL and try again.', false);
        return;
      }

      if (sendResponse && sendResponse.success) {
        this.showResult('✅ Content sent to webhook successfully!', true);
      } else {
        const errorMsg = sendResponse?.message || 'Failed to send content to webhook';
        // Provide helpful message if webhook URL is not set
        if (errorMsg.includes('No webhook URL')) {
          this.showResult('❌ Webhook URL not configured. Please set it in the extension options.', false);
        } else {
          this.showResult(errorMsg, false);
        }
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
      // Ensure content script is loaded
      const scriptLoaded = await this.ensureContentScriptLoaded();
      if (!scriptLoaded) {
        this.showResult(
          'Content script not loaded. Please refresh the page and try again.',
          false
        );
        return;
      }

      // Extract content with selector from input
      const response = await chrome.tabs.sendMessage(this.currentTabId, {
        action: 'extractContent',
        selector: selector,
        contentType: this.contentTypeSelect.value || 'html',
        tabId: this.currentTabId
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

  /**
   * Get current configuration from form
   */
  getCurrentConfig() {
    return {
      selector: this.selectorInput.value.trim(),
      refreshInterval: parseInt(this.refreshIntervalInput.value) * 1000, // Convert to milliseconds
      changeDetection: this.changeDetectionCheckbox.checked,
      contentType: this.contentTypeSelect.value || 'html'
    };
  }

  /**
   * Apply configuration to form
   */
  applyConfig(config) {
    if (config.selector) {
      this.selectorInput.value = config.selector;
    }
    if (config.refreshInterval) {
      this.refreshIntervalInput.value = config.refreshInterval / 1000; // Convert to seconds
    }
    if (config.changeDetection !== undefined) {
      this.changeDetectionCheckbox.checked = config.changeDetection;
    }
    if (config.contentType) {
      this.contentTypeSelect.value = config.contentType;
    }
  }

  /**
   * Load and populate profiles dropdown
   */
  async loadProfiles() {
    try {
      const result = await chrome.storage.local.get(['monitoringProfiles']);
      const profiles = result.monitoringProfiles || {};
      
      // Clear existing options except the first one
      this.profileSelector.innerHTML = '<option value="">-- Select a profile --</option>';
      
      // Populate dropdown
      Object.keys(profiles).sort().forEach(profileName => {
        const option = document.createElement('option');
        option.value = profileName;
        option.textContent = profileName;
        this.profileSelector.appendChild(option);
      });

      // Update button states
      this.deleteProfileBtn.disabled = true;
      this.loadProfileBtn.disabled = true;
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  }

  /**
   * Save current configuration as a profile
   */
  async saveProfile() {
    const profileName = this.profileNameInput.value.trim();
    
    if (!profileName) {
      this.showResult('Please enter a profile name', false);
      return;
    }

    try {
      const result = await chrome.storage.local.get(['monitoringProfiles']);
      const profiles = result.monitoringProfiles || {};
      
      const config = this.getCurrentConfig();
      
      // Validate config
      if (!config.selector) {
        this.showResult('Please enter a CSS selector before saving', false);
        return;
      }

      profiles[profileName] = {
        ...config,
        savedAt: new Date().toISOString()
      };

      await chrome.storage.local.set({ monitoringProfiles: profiles });
      
      this.showResult(`✅ Profile "${profileName}" saved successfully!`, true);
      this.hideSaveProfileInput();
      await this.loadProfiles();
      
      // Select the newly saved profile
      this.profileSelector.value = profileName;
      this.deleteProfileBtn.disabled = false;
      this.loadProfileBtn.disabled = false;
    } catch (error) {
      console.error('Error saving profile:', error);
      this.showResult('❌ Failed to save profile: ' + error.message, false);
    }
  }

  /**
   * Load a selected profile
   */
  async loadProfile() {
    const profileName = this.profileSelector.value;
    
    if (!profileName) {
      this.showResult('Please select a profile to load', false);
      return;
    }

    try {
      const result = await chrome.storage.local.get(['monitoringProfiles']);
      const profiles = result.monitoringProfiles || {};
      
      const profile = profiles[profileName];
      
      if (!profile) {
        this.showResult('Profile not found', false);
        return;
      }

      this.applyConfig(profile);
      this.showResult(`✅ Profile "${profileName}" loaded successfully!`, true);
    } catch (error) {
      console.error('Error loading profile:', error);
      this.showResult('❌ Failed to load profile: ' + error.message, false);
    }
  }

  /**
   * Delete a selected profile
   */
  async deleteProfile() {
    const profileName = this.profileSelector.value;
    
    if (!profileName) {
      this.showResult('Please select a profile to delete', false);
      return;
    }

    if (!confirm(`Are you sure you want to delete the profile "${profileName}"?`)) {
      return;
    }

    try {
      const result = await chrome.storage.local.get(['monitoringProfiles']);
      const profiles = result.monitoringProfiles || {};
      
      delete profiles[profileName];
      
      await chrome.storage.local.set({ monitoringProfiles: profiles });
      
      this.showResult(`✅ Profile "${profileName}" deleted successfully!`, true);
      await this.loadProfiles();
    } catch (error) {
      console.error('Error deleting profile:', error);
      this.showResult('❌ Failed to delete profile: ' + error.message, false);
    }
  }

  /**
   * Show save profile input
   */
  showSaveProfileInput() {
    this.saveProfileGroup.style.display = 'flex';
    this.profileNameInput.focus();
    this.profileNameInput.value = '';
  }

  /**
   * Hide save profile input
   */
  hideSaveProfileInput() {
    this.saveProfileGroup.style.display = 'none';
    this.profileNameInput.value = '';
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

