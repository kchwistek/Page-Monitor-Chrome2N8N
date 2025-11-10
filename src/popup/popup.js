/**
 * Main class for managing the Page Monitor extension popup
 * Provides quick access to monitoring and settings
 */
class PageMonitorPopup {
    constructor() {
        this.initializeEventListeners();
    }

    /**
     * Sets up all event listeners for popup interactions
     */
    initializeEventListeners() {
        // Monitor button - open monitoring page
        const monitorBtn = document.getElementById('monitorBtn');
        if (monitorBtn) {
            monitorBtn.addEventListener('click', () => {
                chrome.tabs.create({
                    url: chrome.runtime.getURL('src/monitor/monitor.html')
                });
            });
        }

        // Settings button - open settings page
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                chrome.tabs.create({
                    url: chrome.runtime.getURL('src/options/options.html')
                });
            });
        }

        // Settings icon event listener - open in new tab
        const settingsIcon = document.querySelector('.settings-icon');
        if (settingsIcon) {
            settingsIcon.addEventListener('click', (e) => {
                e.preventDefault();
                chrome.tabs.create({
                    url: chrome.runtime.getURL('src/options/options.html')
                });
            });
        }

        // Monitor icon event listener - open monitoring page
        const monitorIcon = document.querySelector('.monitor-icon');
        if (monitorIcon) {
            monitorIcon.addEventListener('click', (e) => {
                e.preventDefault();
                chrome.tabs.create({
                    url: chrome.runtime.getURL('src/monitor/monitor.html')
                });
            });
        }
    }
}

// Initialize the popup application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PageMonitorPopup();
});

// Global error handling for the extension
window.addEventListener('error', (event) => {
    console.error('Extension popup error:', event.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection in popup:', event.reason);
});
