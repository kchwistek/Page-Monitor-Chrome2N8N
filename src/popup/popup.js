/**
 * Page Monitor Popup Controller
 * Integrates monitoring functionality into the popup dropdown
 */

class PageMonitorPopup {
  constructor() {
    this.currentTabId = null;
    this.isMonitoring = false;
    this.initializeElements();
    this.attachEventListeners();
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
    this.startBtn = document.getElementById('startBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.testBtn = document.getElementById('testBtn');
    this.sendNowBtn = document.getElementById('sendNowBtn');
    this.statusDisplay = document.getElementById('statusDisplay');
    this.statusDot = document.getElementById('statusDot');
    this.statusText = document.getElementById('statusText');
    this.resultMessage = document.getElementById('resultMessage');
    
    // Profile management elements
    this.profileSelector = document.getElementById('profileSelector');
    this.loadProfileBtn = document.getElementById('loadProfileBtn');
    this.saveProfileBtn = document.getElementById('saveProfileBtn');
    this.saveProfileGroup = document.getElementById('saveProfileGroup');
    this.profileNameInput = document.getElementById('profileNameInput');
    this.confirmSaveBtn = document.getElementById('confirmSaveBtn');
    this.cancelSaveBtn = document.getElementById('cancelSaveBtn');
    
    // Settings icon
    this.settingsIcon = document.getElementById('settingsIcon');
  }

  /**
   * Load and populate tab selector
   */
  async loadTabs() {
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const webTabs = tabs.filter(tab => {
        const url = tab.url || '';
        return url && !url.startsWith('chrome-extension://') && 
               !url.startsWith('chrome://') && 
               !url.startsWith('edge://') &&
               !url.startsWith('about:') &&
               (url.startsWith('http://') || url.startsWith('https://'));
      });
      
      this.tabSelector.innerHTML = '';
      
      if (webTabs.length === 0) {
        this.tabSelector.innerHTML = '<option value="">No web page tabs found</option>';
        this.currentTabId = null;
        return;
      }
      
      const sortedTabs = webTabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
      
      // Check which tabs are being monitored
      const monitoredTabs = await this.getMonitoredTabs();
      
      sortedTabs.forEach(tab => {
        const option = document.createElement('option');
        option.value = tab.id;
        const isMonitored = monitoredTabs.has(tab.id);
        const indicator = isMonitored ? '● ' : '';
        option.textContent = indicator + this.formatTabTitle(tab);
        this.tabSelector.appendChild(option);
      });
      
      if (sortedTabs.length > 0) {
        this.currentTabId = sortedTabs[0].id;
        this.tabSelector.value = sortedTabs[0].id;
      }
      
      await this.loadDefaults();
    } catch (error) {
      console.error('Error loading tabs:', error);
      this.tabSelector.innerHTML = '<option value="">Error loading tabs</option>';
    }
  }

  /**
   * Format tab title for display
   */
  formatTabTitle(tab) {
    const title = tab.title || 'Untitled';
    const url = new URL(tab.url);
    const domain = url.hostname.replace('www.', '');
    const shortTitle = title.length > 30 ? title.substring(0, 27) + '...' : title;
    return `${shortTitle} (${domain})`;
  }

  /**
   * Get list of currently monitored tabs
   */
  async getMonitoredTabs() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getAllMonitoringStatus'
      });
      
      if (response && response.success && response.monitoredTabs) {
        return new Set(response.monitoredTabs);
      }
    } catch (error) {
      console.error('Error getting monitored tabs:', error);
    }
    return new Set();
  }

  /**
   * Load monitoring defaults
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
    
    this.tabSelector.addEventListener('change', (e) => {
      const tabId = parseInt(e.target.value);
      if (tabId) {
        this.currentTabId = tabId;
        this.checkMonitoringStatus();
      }
    });
    
    // Refresh tab list periodically to update monitoring indicators
    setInterval(() => {
      this.loadTabs();
    }, 2000); // Refresh every 2 seconds

    // Profile management
    this.loadProfileBtn.addEventListener('click', () => this.loadProfile());
    this.saveProfileBtn.addEventListener('click', () => this.showSaveProfileInput());
    this.confirmSaveBtn.addEventListener('click', () => this.saveProfile());
    this.cancelSaveBtn.addEventListener('click', () => this.hideSaveProfileInput());
    
    // Settings icon
    if (this.settingsIcon) {
      this.settingsIcon.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({
          url: chrome.runtime.getURL('src/options/options.html')
        });
      });
    }
  }

  /**
   * Check monitoring status
   */
  async checkMonitoringStatus() {
    if (!this.currentTabId) return;

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
   * Update UI from status
   */
  updateUIFromStatus(status) {
    if (status.isMonitoring && status.config) {
      this.selectorInput.value = status.config.selector || '';
      this.refreshIntervalInput.value = (status.config.refreshInterval / 1000) || 30;
      this.contentTypeSelect.value = status.config.contentType || 'html';
      this.changeDetectionCheckbox.checked = status.config.changeDetection !== false;
      this.setMonitoringState(true);
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
      this.statusDisplay.style.display = 'block';
      this.statusDot.classList.remove('inactive');
      this.statusText.textContent = 'Monitoring active';
    } else {
      this.statusDisplay.style.display = 'none';
      this.statusDot.classList.add('inactive');
    }
  }

  /**
   * Start monitoring
   */
  async startMonitoring() {
    if (!this.currentTabId) {
      this.showResult('Please select a tab to monitor', false);
      return;
    }

    const selector = this.selectorInput.value.trim();
    if (!selector) {
      this.showResult('Please enter a CSS selector', false);
      return;
    }

    const refreshInterval = parseInt(this.refreshIntervalInput.value);
    if (isNaN(refreshInterval) || refreshInterval < 5) {
      this.showResult('Refresh interval must be at least 5 seconds', false);
      return;
    }

    try {
      const tab = await chrome.tabs.get(this.currentTabId);
      if (!tab) {
        this.showResult('Tab not found', false);
        return;
      }

      const response = await chrome.runtime.sendMessage({
        action: 'startMonitoring',
        tabId: this.currentTabId,
        config: {
          selector: selector,
          refreshInterval: refreshInterval * 1000,
          contentType: this.contentTypeSelect.value || 'html',
          changeDetection: this.changeDetectionCheckbox.checked,
          url: tab.url
        }
      });

      if (response && response.success) {
        this.showResult('✅ Monitoring started!', true);
        this.setMonitoringState(true);
        await this.loadTabs(); // Refresh tab list to show indicator
      } else {
        this.showResult('❌ ' + (response?.message || 'Failed to start monitoring'), false);
      }
    } catch (error) {
      console.error('Error starting monitoring:', error);
      this.showResult('❌ Error: ' + error.message, false);
    }
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring() {
    if (!this.currentTabId) return;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'stopMonitoring',
        tabId: this.currentTabId
      });

      if (response && response.success) {
        this.showResult('✅ Monitoring stopped', true);
        this.setMonitoringState(false);
        await this.loadTabs(); // Refresh tab list to remove indicator
      } else {
        this.showResult('❌ ' + (response?.message || 'Failed to stop monitoring'), false);
      }
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      this.showResult('❌ Error: ' + error.message, false);
    }
  }

  /**
   * Test extraction
   */
  async testExtraction() {
    if (!this.currentTabId) {
      this.showResult('Please select a tab', false);
      return;
    }

    const selector = this.selectorInput.value.trim();
    if (!selector) {
      this.showResult('Please enter a CSS selector', false);
      return;
    }

    try {
      const scriptLoaded = await this.ensureContentScriptLoaded();
      if (!scriptLoaded) {
        this.showResult('Content script not loaded. Please refresh the page.', false);
        return;
      }

      const response = await chrome.tabs.sendMessage(this.currentTabId, {
        action: 'extractContent',
        selector: selector,
        contentType: this.contentTypeSelect.value || 'html',
        tabId: this.currentTabId
      });

      if (response && response.success) {
        const preview = response.content.substring(0, 100);
        this.showResult(`✅ Content extracted (${response.content.length} chars): ${preview}...`, true);
      } else {
        this.showResult('❌ ' + (response?.error || 'Extraction failed'), false);
      }
    } catch (error) {
      console.error('Error testing extraction:', error);
      this.showResult('❌ Error: ' + error.message, false);
    }
  }

  /**
   * Send content now
   */
  async sendNow() {
    if (!this.currentTabId) {
      this.showResult('Please select a tab', false);
      return;
    }

    const selector = this.selectorInput.value.trim();
    if (!selector) {
      this.showResult('Please enter a CSS selector', false);
      return;
    }

    try {
      const scriptLoaded = await this.ensureContentScriptLoaded();
      if (!scriptLoaded) {
        this.showResult('Content script not loaded. Please refresh the page.', false);
        return;
      }

      const response = await chrome.tabs.sendMessage(this.currentTabId, {
        action: 'extractContent',
        selector: selector,
        contentType: this.contentTypeSelect.value || 'html',
        tabId: this.currentTabId
      });

      if (!response || !response.success) {
        this.showResult('❌ ' + (response?.error || 'Failed to extract content'), false);
        return;
      }

      const sendResponse = await Promise.race([
        chrome.runtime.sendMessage({
          action: 'sendContentNow',
          tabId: this.currentTabId,
          data: response
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
        )
      ]);

      if (sendResponse && sendResponse.success) {
        this.showResult('✅ Content sent to webhook!', true);
      } else {
        this.showResult('❌ ' + (sendResponse?.message || 'Failed to send content'), false);
      }
    } catch (error) {
      console.error('Error sending content:', error);
      this.showResult('❌ Error: ' + error.message, false);
    }
  }

  /**
   * Ensure content script is loaded
   */
  async ensureContentScriptLoaded() {
    if (!this.currentTabId) return false;

    try {
      const tab = await chrome.tabs.get(this.currentTabId);
      if (!this.isValidWebPage(tab.url)) {
        return false;
      }
      await chrome.tabs.sendMessage(this.currentTabId, { action: 'ping' });
      return true;
    } catch (error) {
      if (error.message.includes('Could not establish connection')) {
        try {
          const tab = await chrome.tabs.get(this.currentTabId);
          if (!this.isValidWebPage(tab.url)) {
            return false;
          }
          await chrome.scripting.executeScript({
            target: { tabId: this.currentTabId },
            files: ['src/content-scripts/page-monitor-content.js']
          });
          await new Promise(resolve => setTimeout(resolve, 200));
          await chrome.tabs.sendMessage(this.currentTabId, { action: 'ping' });
          return true;
        } catch (injectError) {
          console.error('Failed to inject content script:', injectError);
          return false;
        }
      }
      throw error;
    }
  }

  /**
   * Check if URL is a valid web page
   */
  isValidWebPage(url) {
    if (!url) return false;
    return !url.startsWith('chrome-extension://') &&
           !url.startsWith('chrome://') &&
           !url.startsWith('edge://') &&
           !url.startsWith('about:') &&
           (url.startsWith('http://') || url.startsWith('https://'));
  }

  /**
   * Show result message
   */
  showResult(message, isSuccess) {
    this.resultMessage.textContent = message;
    this.resultMessage.className = `result-message ${isSuccess ? 'success' : 'error'}`;
    this.resultMessage.style.display = 'flex';
    
    setTimeout(() => {
      this.resultMessage.style.display = 'none';
    }, 5000);
  }

  /**
   * Get current configuration
   */
  getCurrentConfig() {
    return {
      selector: this.selectorInput.value.trim(),
      refreshInterval: parseInt(this.refreshIntervalInput.value) * 1000,
      changeDetection: this.changeDetectionCheckbox.checked,
      contentType: this.contentTypeSelect.value || 'html'
    };
  }

  /**
   * Apply configuration
   */
  applyConfig(config) {
    if (config.selector) this.selectorInput.value = config.selector;
    if (config.refreshInterval) this.refreshIntervalInput.value = config.refreshInterval / 1000;
    if (config.changeDetection !== undefined) this.changeDetectionCheckbox.checked = config.changeDetection;
    if (config.contentType) this.contentTypeSelect.value = config.contentType;
  }

  /**
   * Load profiles
   */
  async loadProfiles() {
    try {
      const result = await chrome.storage.local.get(['monitoringProfiles']);
      const profiles = result.monitoringProfiles || {};
      
      this.profileSelector.innerHTML = '<option value="">-- Select --</option>';
      
      Object.keys(profiles).sort().forEach(profileName => {
        const option = document.createElement('option');
        option.value = profileName;
        option.textContent = profileName;
        this.profileSelector.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  }

  /**
   * Save profile
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
      
      if (!config.selector) {
        this.showResult('Please enter a CSS selector before saving', false);
        return;
      }

      profiles[profileName] = {
        ...config,
        savedAt: new Date().toISOString()
      };

      await chrome.storage.local.set({ monitoringProfiles: profiles });
      
      this.showResult(`✅ Profile "${profileName}" saved!`, true);
      this.hideSaveProfileInput();
      await this.loadProfiles();
      this.profileSelector.value = profileName;
    } catch (error) {
      console.error('Error saving profile:', error);
      this.showResult('❌ Failed to save profile: ' + error.message, false);
    }
  }

  /**
   * Load profile
   */
  async loadProfile() {
    const profileName = this.profileSelector.value;
    
    if (!profileName) {
      this.showResult('Please select a profile', false);
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
      this.showResult(`✅ Profile "${profileName}" loaded!`, true);
    } catch (error) {
      console.error('Error loading profile:', error);
      this.showResult('❌ Failed to load profile: ' + error.message, false);
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
  new PageMonitorPopup();
});

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Popup error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
