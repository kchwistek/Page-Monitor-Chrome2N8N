/**
 * Options page functionality for Page Monitor to n8n Chrome extension
 * Handles webhook URL management, testing, and settings storage
 */
class OptionsManager {
  constructor() {
    this.initializeElements();
    this.loadSavedSettings();
    this.attachEventListeners();
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    this.webhookUrlInput = document.getElementById('webhookUrl');
    this.saveButton = document.getElementById('saveBtn');
    this.testButton = document.getElementById('testBtn');
    this.clearButton = document.getElementById('clearBtn');
    this.saveStatus = document.getElementById('saveStatus');
    
    // Monitoring defaults
    this.defaultRefreshIntervalInput = document.getElementById('defaultRefreshInterval');
    this.defaultChangeDetectionCheckbox = document.getElementById('defaultChangeDetection');
    this.saveDefaultsButton = document.getElementById('saveDefaultsBtn');
    this.defaultsStatus = document.getElementById('defaultsStatus');
    
    // Profile management
    this.exportProfilesBtn = document.getElementById('exportProfilesBtn');
    this.importProfilesBtn = document.getElementById('importProfilesBtn');
    this.importFileInput = document.getElementById('importFileInput');
    this.profileStatus = document.getElementById('profileStatus');
  }

  /**
   * Load saved settings from Chrome storage
   */
  async loadSavedSettings() {
    try {
      const result = await chrome.storage.local.get(['webhookUrl', 'monitoringDefaults']);
      if (result.webhookUrl) {
        this.webhookUrlInput.value = result.webhookUrl;
      }
      
      // Load monitoring defaults
      if (result.monitoringDefaults) {
        if (result.monitoringDefaults.refreshInterval) {
          this.defaultRefreshIntervalInput.value = result.monitoringDefaults.refreshInterval / 1000;
        }
        if (result.monitoringDefaults.changeDetection !== undefined) {
          this.defaultChangeDetectionCheckbox.checked = result.monitoringDefaults.changeDetection;
        }
      }
    } catch (error) {
      console.error('Error loading saved settings:', error);
    }
  }

  /**
   * Attach event listeners to interactive elements
   */
  attachEventListeners() {
    this.saveButton.addEventListener('click', () => this.saveSettings());
    this.testButton.addEventListener('click', () => this.testWebhook());
    this.clearButton.addEventListener('click', () => this.clearSettings());
    this.saveDefaultsButton.addEventListener('click', () => this.saveMonitoringDefaults());
    
    // Profile management
    this.exportProfilesBtn.addEventListener('click', () => this.exportProfiles());
    this.importProfilesBtn.addEventListener('click', () => this.importFileInput.click());
    this.importFileInput.addEventListener('change', (e) => this.importProfiles(e));
    
    // Save on Enter key press in URL input
    this.webhookUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveSettings();
      }
    });
  }

  /**
   * Display status message with styling
   * @param {string} message - Message to display
   * @param {boolean} isSuccess - Whether this is a success or error message
   * @param {number} duration - How long to show the message (ms)
   */
  showStatus(message, isSuccess = true, duration = 3000) {
    this.saveStatus.textContent = message;
    this.saveStatus.className = isSuccess ? 'success' : 'error';
    this.saveStatus.style.opacity = '1';
    
    // Auto-hide after specified duration
    setTimeout(() => {
      this.saveStatus.style.opacity = '0';
    }, duration);
  }

  /**
   * Set loading state for a button
   * @param {HTMLElement} button - Button element
   * @param {boolean} isLoading - Whether to show loading state
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
   * Validate webhook URL format
   * @param {string} url - URL to validate
   * @returns {Object} Validation result
   */
  validateWebhookUrl(url) {
    if (!url || url.trim() === '') {
      return { isValid: false, message: 'Please enter a webhook URL' };
    }

    try {
      const urlObj = new URL(url.trim());
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { isValid: false, message: 'URL must start with http:// or https://' };
      }
      return { isValid: true };
    } catch (error) {
      return { isValid: false, message: 'Please enter a valid URL' };
    }
  }

  /**
   * Save webhook URL to Chrome storage
   */
  async saveSettings() {
    const webhookUrl = this.webhookUrlInput.value.trim();
    
    // Validate URL
    const validation = this.validateWebhookUrl(webhookUrl);
    if (!validation.isValid) {
      this.showStatus(validation.message, false);
      return;
    }

    this.setButtonLoading(this.saveButton, true);

    try {
      await chrome.storage.local.set({ webhookUrl });
      this.showStatus('✅ Settings saved successfully!', true);
      console.log('Webhook URL saved:', webhookUrl);
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showStatus('❌ Failed to save settings: ' + error.message, false);
    } finally {
      this.setButtonLoading(this.saveButton, false);
    }
  }

  /**
   * Test webhook connectivity by sending test data
   */
  async testWebhook() {
    const webhookUrl = this.webhookUrlInput.value.trim();
    
    // Validate URL first
    const validation = this.validateWebhookUrl(webhookUrl);
    if (!validation.isValid) {
      this.showStatus(validation.message, false);
      return;
    }

    this.setButtonLoading(this.testButton, true);

    // Test data payload
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Test connection from Page Monitor to n8n extension',
      type: 'page_monitor',
      url: 'https://example.com/test',
      content: 'This is a test message to verify webhook connectivity',
      selector: '#test-selector',
      changeDetected: false
    };

    try {
      console.log('Testing webhook:', webhookUrl);
      console.log('Test data:', testData);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        this.showStatus(`✅ Test successful! (${response.status} ${response.statusText})`, true, 5000);
        console.log('Test successful:', response.status, response.statusText);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Test webhook error:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        this.showStatus('❌ Network error: Check your URL and internet connection', false, 5000);
      } else {
        this.showStatus(`❌ Test failed: ${error.message}`, false, 5000);
      }
    } finally {
      this.setButtonLoading(this.testButton, false);
    }
  }

  /**
   * Clear all saved settings
   */
  async clearSettings() {
    if (!confirm('Are you sure you want to clear all settings? This action cannot be undone.')) {
      return;
    }

    this.setButtonLoading(this.clearButton, true);

    try {
      await chrome.storage.local.clear();
      this.webhookUrlInput.value = '';
      this.defaultRefreshIntervalInput.value = 30;
      this.defaultChangeDetectionCheckbox.checked = true;
      this.showStatus('🗑️ All settings cleared', true);
      console.log('Settings cleared');
    } catch (error) {
      console.error('Error clearing settings:', error);
      this.showStatus('❌ Failed to clear settings: ' + error.message, false);
    } finally {
      this.setButtonLoading(this.clearButton, false);
    }
  }

  /**
   * Save monitoring defaults
   */
  async saveMonitoringDefaults() {
    const refreshInterval = parseInt(this.defaultRefreshIntervalInput.value);
    
    if (isNaN(refreshInterval) || refreshInterval < 5) {
      this.showDefaultsStatus('Refresh interval must be at least 5 seconds', false);
      return;
    }

    this.setButtonLoading(this.saveDefaultsButton, true);

    try {
      const defaults = {
        refreshInterval: refreshInterval * 1000, // Convert to milliseconds
        changeDetection: this.defaultChangeDetectionCheckbox.checked
      };

      await chrome.storage.local.set({ monitoringDefaults: defaults });
      this.showDefaultsStatus('✅ Defaults saved successfully!', true);
      console.log('Monitoring defaults saved:', defaults);
    } catch (error) {
      console.error('Error saving monitoring defaults:', error);
      this.showDefaultsStatus('❌ Failed to save defaults: ' + error.message, false);
    } finally {
      this.setButtonLoading(this.saveDefaultsButton, false);
    }
  }

  /**
   * Show status for defaults save
   */
  showDefaultsStatus(message, isSuccess) {
    this.defaultsStatus.textContent = message;
    this.defaultsStatus.className = isSuccess ? 'success' : 'error';
    this.defaultsStatus.style.opacity = '1';
    
    setTimeout(() => {
      this.defaultsStatus.style.opacity = '0';
    }, 3000);
  }

  /**
   * Show status for profile operations
   */
  showProfileStatus(message, isSuccess = true, duration = 5000) {
    this.profileStatus.textContent = message;
    this.profileStatus.className = isSuccess ? 'success' : 'error';
    this.profileStatus.style.opacity = '1';
    
    setTimeout(() => {
      this.profileStatus.style.opacity = '0';
    }, duration);
  }

  /**
   * Export all profiles to a JSON file
   */
  async exportProfiles() {
    this.setButtonLoading(this.exportProfilesBtn, true);

    try {
      const result = await chrome.storage.local.get(['monitoringProfiles']);
      const profiles = result.monitoringProfiles || {};

      // Create export object with metadata
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        profiles: profiles
      };

      // Convert to JSON string
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      a.download = `page-monitor-profiles-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const profileCount = Object.keys(profiles).length;
      this.showProfileStatus(`✅ Exported ${profileCount} profile${profileCount !== 1 ? 's' : ''}`, true);
    } catch (error) {
      console.error('Error exporting profiles:', error);
      this.showProfileStatus('❌ Failed to export profiles: ' + error.message, false);
    } finally {
      this.setButtonLoading(this.exportProfilesBtn, false);
    }
  }

  /**
   * Validate imported profile data structure
   */
  validateProfileData(profiles) {
    if (!profiles || typeof profiles !== 'object') {
      return { isValid: false, message: 'Invalid profile data: must be an object' };
    }

    const requiredFields = ['selector', 'refreshInterval'];
    const errors = [];

    for (const [profileName, profile] of Object.entries(profiles)) {
      if (typeof profile !== 'object' || profile === null) {
        errors.push(`Profile "${profileName}" is not a valid object`);
        continue;
      }

      for (const field of requiredFields) {
        if (!(field in profile)) {
          errors.push(`Profile "${profileName}" is missing required field: ${field}`);
        }
      }

      // Validate refreshInterval is a number
      if (profile.refreshInterval !== undefined && typeof profile.refreshInterval !== 'number') {
        errors.push(`Profile "${profileName}" has invalid refreshInterval (must be a number)`);
      }
    }

    if (errors.length > 0) {
      return { isValid: false, message: errors.join('; ') };
    }

    return { isValid: true };
  }

  /**
   * Import profiles from a JSON file
   */
  async importProfiles(event) {
    const file = event.target.files[0];
    if (!file) {
      return; // User cancelled
    }

    // Reset file input
    event.target.value = '';

    this.setButtonLoading(this.importProfilesBtn, true);

    try {
      // Read file as text
      const fileText = await file.text();
      
      // Parse JSON
      let importData;
      try {
        importData = JSON.parse(fileText);
      } catch (error) {
        throw new Error('Invalid JSON file: ' + error.message);
      }

      // Validate structure
      if (!importData.profiles || typeof importData.profiles !== 'object') {
        throw new Error('Invalid file format: missing or invalid "profiles" object');
      }

      // Validate profile data
      const validation = this.validateProfileData(importData.profiles);
      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      // Get existing profiles
      const result = await chrome.storage.local.get(['monitoringProfiles']);
      const existingProfiles = result.monitoringProfiles || {};
      const importedProfiles = importData.profiles;

      // Identify conflicts (profiles that exist in both)
      const conflicts = [];
      for (const profileName of Object.keys(importedProfiles)) {
        if (existingProfiles[profileName]) {
          conflicts.push(profileName);
        }
      }

      // Handle conflicts
      let overwriteList = [];
      let skipAll = false;

      if (conflicts.length > 0) {
        // Ask user about each conflict
        for (const profileName of conflicts) {
          if (skipAll) break;

          const response = confirm(
            `Profile "${profileName}" already exists.\n\n` +
            `Click OK to overwrite, or Cancel to skip.\n\n` +
            `(Cancel and then "Skip All" to skip all remaining conflicts)`
          );

          if (response) {
            overwriteList.push(profileName);
          } else {
            // Check if user wants to skip all remaining conflicts
            if (conflicts.length > overwriteList.length + 1) {
              const skipAllResponse = confirm(
                `Skip all remaining ${conflicts.length - overwriteList.length - 1} conflict${conflicts.length - overwriteList.length - 1 !== 1 ? 's' : ''}?`
              );
              if (skipAllResponse) {
                skipAll = true;
              }
            }
          }
        }
      }

      // Merge profiles
      const mergedProfiles = { ...existingProfiles };

      let added = 0;
      let updated = 0;
      let skipped = 0;

      for (const [profileName, profile] of Object.entries(importedProfiles)) {
        if (existingProfiles[profileName]) {
          if (overwriteList.includes(profileName)) {
            mergedProfiles[profileName] = {
              ...profile,
              savedAt: new Date().toISOString() // Update saved timestamp
            };
            updated++;
          } else {
            skipped++;
          }
        } else {
          mergedProfiles[profileName] = {
            ...profile,
            savedAt: profile.savedAt || new Date().toISOString()
          };
          added++;
        }
      }

      // Save merged profiles
      await chrome.storage.local.set({ monitoringProfiles: mergedProfiles });

      // Show summary
      const summaryParts = [];
      if (added > 0) summaryParts.push(`${added} new`);
      if (updated > 0) summaryParts.push(`${updated} updated`);
      if (skipped > 0) summaryParts.push(`${skipped} skipped`);

      const summary = summaryParts.length > 0
        ? `✅ Import complete: ${summaryParts.join(', ')} profile${summaryParts.some(p => parseInt(p) !== 1) ? 's' : ''}`
        : '✅ Import complete';

      this.showProfileStatus(summary, true, 7000);
      console.log('Profiles imported:', { added, updated, skipped });
    } catch (error) {
      console.error('Error importing profiles:', error);
      this.showProfileStatus('❌ Import failed: ' + error.message, false, 7000);
    } finally {
      this.setButtonLoading(this.importProfilesBtn, false);
    }
  }
}

// Initialize the options manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Options page error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
