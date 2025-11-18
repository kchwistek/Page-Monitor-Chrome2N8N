# Changelog

All notable changes to the Page Monitor to n8n extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-01-21

### Fixed
- **Issue #1**: Tab-specific webhook configuration now works correctly
  - Fixed `handleStartMonitoring` to save `webhookUrl` in monitoring config
  - Updated "Send Now" button to use webhook URL from popup form input
  - Fixed variable scope bug in `sendContentToWebhook` function
  - Implemented proper fallback chain: form input > tab-specific > global webhook

- **Issue #2**: Monitoring state is now restored after browser refresh
  - Added `restoreMonitoringState()` function to restore monitoring intervals from storage on service worker startup
  - Updated `onStartup` and `onInstalled` listeners to automatically restore monitoring
  - Handles tab ID changes by matching tabs by URL
  - Monitoring continues automatically after browser refresh or service worker restart

### Changed
- Improved webhook URL handling with better validation and fallback logic
- Enhanced monitoring state persistence across browser sessions

## [1.0.0] - Initial Release

### Added
- Page monitoring with CSS selector support
- Automatic content change detection using SHA-256 hashing
- Configurable refresh intervals
- Tab-specific and global webhook URL configuration
- Profile management for saving monitoring configurations
- Content extraction (HTML and text modes)
- Extension popup interface for quick monitoring setup
- Options page for global settings
- Monitor page for advanced monitoring management

