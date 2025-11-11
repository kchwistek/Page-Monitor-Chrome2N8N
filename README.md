# 🚀 Page Monitor to n8n - Chrome Extension

A powerful Chrome extension that monitors web pages and sends content changes to your own n8n webhook. Perfect for automation workflows, change detection, and content monitoring.

---

## ✨ Features

### 🎯 Page Monitoring
- **Monitor any website** - Works on any web page
- **Automatic refresh** - Configurable refresh intervals
- **Change detection** - Only sends content when it changes (optional)
- **Flexible content extraction** - Extract HTML or text from any CSS selector
- **Smart content hashing** - Uses SHA-256 to detect changes efficiently

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

1. **Click the Extension icon → Settings (or right-click → Options)**
2. **Paste your n8n Webhook URL**
   - Example: `https://your-n8n-instance.com/webhook/page-monitor`
3. (Optional) Set default monitoring settings (refresh interval, change detection)
4. (Optional) Click "Save" and "Send Test" to check connectivity
5. Done!

No need to modify files or environment variables.

---

## 🚀 How to Use

### Setting Up Page Monitoring

1. **Navigate to the page you want to monitor**
   - Any website works!

2. **Open the Monitor Page**
   - Click the extension icon → "Monitor Page" button
   - Or click the eye icon in the popup header

3. **Configure Monitoring**
   - Enter a CSS selector for the HTML block you want to monitor
     - Example: `#content`, `.main-article`, `div[class='article']`
   - Set refresh interval (minimum: 5 seconds)
   - Choose content type (HTML or text)
   - Enable/disable change detection

4. **Start Monitoring**
   - Click "Start Monitoring"
   - The extension will automatically refresh the page and extract content
   - Content will be sent to your webhook when changes are detected (if enabled)

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
    "tabId": 123
  }
}
```

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
