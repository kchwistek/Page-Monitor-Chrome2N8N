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
      this.loadActivityLog();
      // Auto-refresh log every 2 seconds
      this.logRefreshInterval = setInterval(() => {
        this.loadActivityLog();
      }, 2000);
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
    this.webhookUrlInput = document.getElementById('webhookUrl');
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
    this.saveAsProfileBtn = document.getElementById('saveAsProfileBtn');
    this.saveProfileGroup = document.getElementById('saveProfileGroup');
    this.profileNameInput = document.getElementById('profileNameInput');
    this.confirmSaveBtn = document.getElementById('confirmSaveBtn');
    this.cancelSaveBtn = document.getElementById('cancelSaveBtn');
    
    // Settings icon
    this.settingsIcon = document.getElementById('settingsIcon');
    
    // Activity log elements
    this.logFilter = document.getElementById('logFilter');
    this.clearLogBtn = document.getElementById('clearLogBtn');
    this.refreshLogBtn = document.getElementById('refreshLogBtn');
    this.activityLogEntries = document.getElementById('activityLogEntries');
    this.logRefreshInterval = null;
  }

  /**
   * Load and populate tab selector
   */
  async loadTabs() {
    try {
      // Store current selection before refreshing (preserve user's choice)
      const currentSelection = this.tabSelector.value;
      const wasUserSelecting = document.activeElement === this.tabSelector;
      
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
      
      // Restore previous selection if it still exists and user wasn't actively selecting
      if (currentSelection && !wasUserSelecting) {
        const optionExists = this.tabSelector.querySelector(`option[value="${currentSelection}"]`);
        if (optionExists) {
          this.tabSelector.value = currentSelection;
          this.currentTabId = parseInt(currentSelection);
        } else if (sortedTabs.length > 0) {
          // Selected tab was closed, select first available
          this.currentTabId = sortedTabs[0].id;
          this.tabSelector.value = sortedTabs[0].id;
        }
      } else if (sortedTabs.length > 0 && !currentSelection) {
        // No previous selection, select first tab
        this.currentTabId = sortedTabs[0].id;
        this.tabSelector.value = sortedTabs[0].id;
      }
      
      // Only load defaults if we don't have a current tab selected
      if (!this.currentTabId) {
        await this.loadDefaults();
      }
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
      const result = await chrome.storage.local.get(['monitoringDefaults', 'webhookUrl']);
      
      // Load global webhook URL as default if no tab-specific webhook is set
      if (result.webhookUrl && !this.webhookUrlInput.value) {
        this.webhookUrlInput.placeholder = `Global: ${result.webhookUrl.substring(0, 40)}...`;
      }
      
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
      if (tabId && tabId !== this.currentTabId) {
        this.currentTabId = tabId;
        // Only check status when tab actually changes (not during refresh)
        this.checkMonitoringStatus();
      }
    });
    
    // Refresh tab list periodically to update monitoring indicators
    // Use longer interval and check if user is interacting to avoid interrupting input
    setInterval(() => {
      // Only refresh if popup has focus and user is not actively interacting with tab selector
      // Check if any form input has focus (user might be editing)
      const activeElement = document.activeElement;
      const isUserInteracting = activeElement === this.tabSelector ||
                                activeElement === this.selectorInput ||
                                activeElement === this.refreshIntervalInput ||
                                activeElement === this.contentTypeSelect ||
                                activeElement === this.webhookUrlInput ||
                                activeElement === this.profileSelector ||
                                activeElement === this.profileNameInput;
      
      // Only refresh if user is not interacting and popup has focus
      if (!isUserInteracting && document.hasFocus()) {
        this.loadTabs();
      }
    }, 5000); // Increased to 5 seconds to reduce interruptions

    // Profile management
    this.loadProfileBtn.addEventListener('click', () => this.loadProfile());
    this.saveProfileBtn.addEventListener('click', () => this.saveProfile());
    this.saveAsProfileBtn.addEventListener('click', () => this.showSaveProfileInput());
    this.confirmSaveBtn.addEventListener('click', () => this.saveProfileAs());
    this.cancelSaveBtn.addEventListener('click', () => this.hideSaveProfileInput());
    
    // Update Save button state when profile selection changes
    this.profileSelector.addEventListener('change', () => this.updateSaveButtonState());
    
    // Settings icon
    if (this.settingsIcon) {
      this.settingsIcon.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({
          url: chrome.runtime.getURL('src/options/options.html')
        });
      });
    }
    
    // Activity log controls
    if (this.logFilter) {
      this.logFilter.addEventListener('change', () => this.loadActivityLog());
    }
    if (this.clearLogBtn) {
      this.clearLogBtn.addEventListener('click', () => this.clearActivityLog());
    }
    if (this.refreshLogBtn) {
      this.refreshLogBtn.addEventListener('click', () => this.loadActivityLog());
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
        await this.updateUIFromStatus(response);
      }
    } catch (error) {
      console.error('Error checking monitoring status:', error);
    }
  }

  /**
   * Update UI from status
   */
  async updateUIFromStatus(status) {
    if (status.isMonitoring && status.config) {
      // Only update fields if user is not actively editing them
      if (document.activeElement !== this.selectorInput) {
        this.selectorInput.value = status.config.selector || '';
      }
      if (document.activeElement !== this.refreshIntervalInput) {
        this.refreshIntervalInput.value = (status.config.refreshInterval / 1000) || 30;
      }
      if (document.activeElement !== this.contentTypeSelect) {
        this.contentTypeSelect.value = status.config.contentType || 'html';
      }
      // Checkbox can be updated (no typing involved)
      this.changeDetectionCheckbox.checked = status.config.changeDetection !== false;
      if (document.activeElement !== this.webhookUrlInput) {
        this.webhookUrlInput.value = status.config.webhookUrl || '';
      }
      this.setMonitoringState(true);
      
      // Update profile selector to reflect the active profile
      await this.updateProfileSelectorFromConfig(status.config);
    } else {
      this.setMonitoringState(false);
      // Clear profile selector when not monitoring
      this.profileSelector.value = '';
    }
  }

  /**
   * Update profile selector based on configuration
   * @param {Object} config - Configuration object
   */
  async updateProfileSelectorFromConfig(config) {
    // First check if config has a profileName property
    if (config.profileName) {
      // Ensure profiles are loaded
      await this.loadProfiles();
      // Set the selector to the profile name if it exists
      if (this.profileSelector.querySelector(`option[value="${config.profileName}"]`)) {
        this.profileSelector.value = config.profileName;
        return;
      }
    }
    
    // If no profileName in config, try to match the config to a profile
    const matchedProfile = await this.matchConfigToProfile(config);
    if (matchedProfile) {
      // Ensure profiles are loaded
      await this.loadProfiles();
      if (this.profileSelector.querySelector(`option[value="${matchedProfile}"]`)) {
        this.profileSelector.value = matchedProfile;
      }
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

      const webhookUrl = this.webhookUrlInput.value.trim();
      
      // Include profile name if a profile is selected
      const selectedProfileName = this.profileSelector.value || null;
      
      const response = await chrome.runtime.sendMessage({
        action: 'startMonitoring',
        tabId: this.currentTabId,
        config: {
          selector: selector,
          refreshInterval: refreshInterval * 1000,
          contentType: this.contentTypeSelect.value || 'html',
          changeDetection: this.changeDetectionCheckbox.checked,
          webhookUrl: webhookUrl || null, // null means use global webhook
          url: tab.url,
          profileName: selectedProfileName // Store profile name in config
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
    console.log('🔵 sendNow() called');
    
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

      // Get webhook URL from input field (if provided)
      const rawWebhookValue = this.webhookUrlInput.value;
      const webhookUrl = rawWebhookValue ? rawWebhookValue.trim() : null;
      
      console.log('=== Send Now Debug ===');
      console.log('Raw webhook input value:', rawWebhookValue);
      console.log('Trimmed webhook URL:', webhookUrl);
      console.log('Input element:', this.webhookUrlInput);
      console.log('Input element ID:', this.webhookUrlInput?.id);
      console.log('Current tab ID:', this.currentTabId);
      console.log('About to send message with webhookUrl:', webhookUrl);

      const sendResponse = await Promise.race([
        chrome.runtime.sendMessage({
          action: 'sendContentNow',
          tabId: this.currentTabId,
          data: response,
          webhookUrl: webhookUrl // Pass webhook URL from form
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
      contentType: this.contentTypeSelect.value || 'html',
      webhookUrl: this.webhookUrlInput.value.trim() || null
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
    if (config.webhookUrl !== undefined) this.webhookUrlInput.value = config.webhookUrl || '';
    // Note: profileName is handled separately in updateUIFromStatus
  }

  /**
   * Match current configuration to a saved profile
   * @returns {Promise<string|null>} Profile name if match found, null otherwise
   */
  async matchConfigToProfile(config) {
    try {
      const result = await chrome.storage.local.get(['monitoringProfiles']);
      const profiles = result.monitoringProfiles || {};
      
      // Compare config with each profile
      for (const [profileName, profile] of Object.entries(profiles)) {
        // Compare relevant fields (excluding metadata like savedAt)
        if (profile.selector === config.selector &&
            profile.refreshInterval === config.refreshInterval &&
            profile.changeDetection === config.changeDetection &&
            profile.contentType === config.contentType &&
            (profile.webhookUrl || null) === (config.webhookUrl || null)) {
          return profileName;
        }
      }
      return null;
    } catch (error) {
      console.error('Error matching config to profile:', error);
      return null;
    }
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
      
      // Update Save button state after loading profiles
      this.updateSaveButtonState();
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  }

  /**
   * Update Save button state based on profile selection
   */
  updateSaveButtonState() {
    const profileName = this.profileSelector.value;
    if (this.saveProfileBtn) {
      this.saveProfileBtn.disabled = !profileName;
      if (!profileName) {
        this.saveProfileBtn.title = 'Select a profile to save';
      } else {
        this.saveProfileBtn.title = `Save to "${profileName}"`;
      }
    }
  }

  /**
   * Save profile to currently selected profile
   */
  async saveProfile() {
    const profileName = this.profileSelector.value;
    
    if (!profileName) {
      this.showResult('Please select a profile to save, or use "Save As" to create a new profile', false);
      return;
    }

    try {
      const result = await chrome.storage.local.get(['monitoringProfiles']);
      const profiles = result.monitoringProfiles || {};
      
      // Check if profile exists
      if (!profiles[profileName]) {
        this.showResult('Selected profile not found. Use "Save As" to create a new profile.', false);
        return;
      }
      
      const config = this.getCurrentConfig();
      
      if (!config.selector) {
        this.showResult('Please enter a CSS selector before saving', false);
        return;
      }

      // Save to the selected profile
      profiles[profileName] = {
        ...config,
        savedAt: new Date().toISOString()
      };

      await chrome.storage.local.set({ monitoringProfiles: profiles });
      
      this.showResult(`✅ Profile "${profileName}" saved!`, true);
      await this.loadProfiles();
      this.profileSelector.value = profileName;
    } catch (error) {
      console.error('Error saving profile:', error);
      this.showResult('❌ Failed to save profile: ' + error.message, false);
    }
  }

  /**
   * Save profile as new profile (Save As)
   */
  async saveProfileAs() {
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

      // Check if profile already exists and ask for confirmation
      if (profiles[profileName]) {
        const overwrite = confirm(`Profile "${profileName}" already exists. Overwrite?`);
        if (!overwrite) {
          return;
        }
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
      this.updateSaveButtonState();
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
      // Profile selector is already set to the selected profile, so no need to update it
      this.updateSaveButtonState();
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

  /**
   * Load activity log from background script
   */
  async loadActivityLog() {
    try {
      const filter = this.logFilter ? this.logFilter.value : 'all';
      let request = { action: 'getActivityLog' };
      
      if (filter === 'errors') {
        request.level = 'error';
      } else if (filter === 'warnings') {
        request.level = 'warning';
      } else if (filter === 'monitoring') {
        request.category = 'monitoring';
      } else if (filter === 'extraction') {
        request.category = 'extraction';
      } else if (filter === 'webhook') {
        request.category = 'webhook';
      } else {
        request.limit = 20; // Show last 20 entries for "all"
      }
      
      const response = await chrome.runtime.sendMessage(request);
      
      if (response && response.success) {
        this.renderActivityLog(response.entries);
      }
    } catch (error) {
      console.error('Error loading activity log:', error);
    }
  }

  /**
   * Render activity log entries
   */
  renderActivityLog(entries) {
    if (!this.activityLogEntries) return;
    
    if (entries.length === 0) {
      this.activityLogEntries.innerHTML = '<div class="activity-log-empty">No activity yet</div>';
      return;
    }
    
    this.activityLogEntries.innerHTML = entries.map(entry => {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      const details = entry.details && Object.keys(entry.details).length > 0
        ? `<div class="activity-log-details">${this.formatDetails(entry.details)}</div>`
        : '';
      
      return `
        <div class="activity-log-entry activity-log-${entry.level}">
          <div class="activity-log-time">${time}</div>
          <div class="activity-log-message">
            <span class="activity-log-category">${entry.category}</span>
            ${entry.message}
          </div>
          ${details}
        </div>
      `;
    }).join('');
    
    // Auto-scroll to bottom
    this.activityLogEntries.scrollTop = this.activityLogEntries.scrollHeight;
  }

  /**
   * Format details object for display
   */
  formatDetails(details) {
    const parts = [];
    if (details.tabId) parts.push(`Tab: ${details.tabId}`);
    if (details.error) parts.push(`Error: ${details.error}`);
    if (details.retryCount !== undefined) parts.push(`Retries: ${details.retryCount}`);
    if (details.consecutiveFailures) parts.push(`Failures: ${details.consecutiveFailures}`);
    return parts.join(' • ');
  }

  /**
   * Clear activity log
   */
  async clearActivityLog() {
    if (!confirm('Clear all activity log entries?')) {
      return;
    }
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'clearActivityLog'
      });
      
      if (response && response.success) {
        this.loadActivityLog();
      }
    } catch (error) {
      console.error('Error clearing activity log:', error);
    }
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
