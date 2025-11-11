# 🚀 Page Monitor to n8n - Chrome Extension

A powerful Chrome extension that monitors web pages and sends content changes to your own n8n webhook. Perfect for automation workflows, change detection, and content monitoring.

---

## ✨ Features

### 🎯 Page Monitoring
- **Monitor any website** - Works on any web page
- **Multiple tabs support** - Monitor multiple tabs simultaneously with different configurations
- **Automatic refresh** - Configurable refresh intervals (minimum: 5 seconds)
- **Change detection** - Only sends content when it changes (optional)
- **Flexible content extraction** - Extract HTML or text from any CSS selector
- **Smart content hashing** - Uses SHA-256 to detect changes efficiently
- **Content validation** - Automatically waits for page content to fully load before sending
- **Per-tab webhooks** - Each monitored tab can send to a different webhook URL
- **Monitoring profiles** - Save and reuse monitoring configurations
- **Visual indicators** - Icon badge shows monitoring state of the active tab

---

## 🛠️ Installation (Development mode)

1. **Download the Extension**
   - Download the repo as ZIP and extract it locally.

2. **Open Chrome Extensions**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

3. **Load the Unpacked Extension**
   - Click "Load unpacked"
   - Select the extracted extension folder
   - The Page Monitor icon will appear in your toolbar

---

## ⚙️ Configuration

### Global Settings

1. **Click the Extension icon → Settings icon (⚙️)**
2. **Paste your n8n Webhook URL**
   - Example: `https://your-n8n-instance.com/webhook/page-monitor`
   - This is used as the default webhook for all tabs
3. (Optional) Set default monitoring settings (refresh interval, change detection)
4. (Optional) Click "Save" and "Send Test" to check connectivity
5. Done!

### Per-Tab Configuration

Each tab can have its own monitoring configuration:

1. **Select a tab** from the dropdown
2. **Configure monitoring settings**:
   - CSS selector for the content to monitor
   - Refresh interval (how often to check)
   - Content type (HTML or text)
   - Webhook URL (optional - leave empty to use global webhook)
   - Change detection (send only when content changes)
3. **Start monitoring** or save as a profile for later use

No need to modify files or environment variables.

---

## 🚀 How to Use

### Setting Up Page Monitoring

1. **Click the Extension Icon**
   - The popup will open with all monitoring controls

2. **Select a Tab to Monitor**
   - Choose from the dropdown list of open web page tabs
   - Tabs with active monitoring show a ● indicator

3. **Configure Monitoring**
   - **CSS Selector**: Enter a CSS selector for the HTML block you want to monitor
     - Example: `#content`, `.main-article`, `div[class='article']`
   - **Refresh Interval**: Set how often to check for changes (minimum: 5 seconds)
   - **Content Type**: Choose HTML or text extraction
   - **Webhook URL**: (Optional) Enter a specific webhook URL for this tab
     - Leave empty to use the global webhook from settings
   - **Change Detection**: Enable/disable to send only when content changes

4. **Start Monitoring**
   - Click "Start Monitoring"
   - The extension will automatically refresh the page and extract content
   - Content will be sent to your webhook when changes are detected (if enabled)
   - The icon badge will show a green dot (●) when the active tab is being monitored

### Monitoring Multiple Tabs

You can monitor multiple tabs simultaneously, each with its own configuration:

1. Select Tab 1 → Configure → Click "Start Monitoring"
2. Select Tab 2 → Configure → Click "Start Monitoring"
3. Select Tab 3 → Configure → Click "Start Monitoring"

Each tab will:
- Use its own CSS selector
- Have its own refresh interval
- Send to its own webhook (or global webhook if not specified)
- Monitor independently

### Using Profiles

Save and reuse monitoring configurations:

1. **Save a Profile**
   - Configure your monitoring settings
   - Click the "Save" button next to the profile dropdown
   - Enter a profile name
   - Click "Confirm"

2. **Load a Profile**
   - Select a profile from the dropdown
   - Click "Load"
   - Your settings will be populated automatically

3. **Profiles Include**
   - CSS selector
   - Refresh interval
   - Content type
   - Change detection setting
   - Webhook URL (if specified)

### Finding CSS Selectors

Use browser DevTools (F12) to inspect elements:
1. Right-click on the element you want to monitor
2. Select "Inspect"
3. Right-click on the element in DevTools
4. Select "Copy" → "Copy selector"
5. Paste into the monitoring configuration

---

## 📦 Webhook Payload

The extension sends the following JSON structure to your n8n webhook:

```json
{
  "type": "page_monitor",
  "timestamp": "2025-01-20T10:00:00Z",
  "url": "https://example.com/page",
  "content": "<div>...</div>",
  "selector": "#content-block",
  "changeDetected": true,
  "metadata": {
    "refreshInterval": 30000,
    "tabId": 123,
    "webhookUrl": "https://your-n8n-instance.com/webhook/..."
  }
}
```

### Webhook Configuration

- **Per-Tab Webhook**: Each monitored tab can have its own webhook URL
  - Enter the webhook URL in the monitoring settings for that tab
  - If left empty, uses the global webhook from extension settings
  
- **Global Webhook**: Set a default webhook in extension settings
  - Used when no tab-specific webhook is configured
  - Access via: Extension icon → Settings icon (⚙️)

---

## 🔒 Privacy

- Your webhook URL is stored locally in Chrome, never sent to third parties
- No page content is stored permanently (only hashes for change detection)
- Data is sent directly from your browser to your n8n instance
- Everything runs 100% in your browser
- We never see or store your webhook URL or page content

---

## 🎯 Use Cases

- **Content Change Monitoring** - Get notified when website content updates
- **Price Tracking** - Monitor product prices and get alerts on changes
- **News Monitoring** - Track news sites for new articles
- **Status Page Monitoring** - Monitor status pages for updates
- **Automation Workflows** - Trigger n8n workflows based on page changes
- **Multi-Site Monitoring** - Monitor multiple websites simultaneously, each sending to different webhooks
- **A/B Testing** - Monitor different versions of pages and route to different workflows
- **Content Aggregation** - Collect content from multiple sources into different n8n workflows

---

## 🙋‍♂️ Contributing

Want to contribute or improve it?  
**Developer:** Karel Chwistek  
**Email:** [k.chwistek@volny.cz](mailto:k.chwistek@volny.cz)

---

## 🙏 Acknowledgements

- This project builds on the original [LinkedIn to n8n](https://github.com/Klikwork/linkedin2n8n) extension created by [Klikwork](https://github.com/Klikwork). Huge thanks for the solid foundation and inspiration.

---

## 📄 License

MIT License – see [LICENSE](LICENSE)

---

**Made with ❤️ for better n8n workflows by Karel Chwistek**
