# Content Moderation Assistant

A comprehensive Chrome extension designed to assist content moderators in their daily tasks by providing automated content analysis, workflow automation, and well-being features.

## Features

### Core Functionality
- **Content Identification**: Automatically analyze on-page content to identify potential policy violations
- **Content Highlighting**: Highlight keywords, phrases, and visual elements matching configurable rule sets
- **One-Click Actions**: Quick actions for flagging, escalating, or blocking content/users
- **User Information Overlay**: Hover over usernames to see moderation history
- **Reporting & Metrics**: Track actions taken, violation types, and time spent on moderation

### Well-being Features
- **Break Reminders**: Configurable timer for work intervals and break reminders
- **Toxicity Scoring**: Algorithm-based scoring of content toxicity levels
- **Mindful Moments**: Calming suggestions and activities during breaks
- **Metrics Dashboard**: Visual tracking of daily moderation activities

### Customization
- **Custom Rule Sets**: Create and manage your own moderation rules
- **Keyboard Shortcuts**: Configurable shortcuts for quick actions
- **Settings Management**: Comprehensive options for personalization
- **Data Export/Import**: Backup and restore your settings and rules

## Installation

### For Development
1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The extension will appear in your browser toolbar

### For Production
1. Download the extension from the Chrome Web Store (when available)
2. Click "Add to Chrome" to install
3. Follow the setup wizard to configure your preferences

## Usage

### Basic Usage
1. **Right-click** on any webpage to access moderation tools
2. **Select text** and use the context menu for quick actions
3. **Click the extension icon** to open the main dashboard
4. **Use keyboard shortcuts** for faster workflow:
   - `Ctrl+Shift+F`: Flag content
   - `Ctrl+Shift+E`: Escalate content
   - `Ctrl+Shift+B`: Block user

### Configuration
1. Click the extension icon and select "Settings"
2. Configure your custom rules and preferences
3. Set up break reminders and well-being features
4. Import/export your settings for backup

### Custom Rules
1. Go to Settings > Custom Rules
2. Click "Add New Rule"
3. Define keywords, severity level, and highlight color
4. Save and the rules will be applied immediately

## File Structure

```
Content-Moderation-Assistant/
├── manifest.json          # Extension manifest
├── popup.html             # Main popup interface
├── popup.css              # Popup styles
├── popup.js               # Popup functionality
├── content.js             # Content script for page analysis
├── content.css            # Content script styles
├── background.js          # Background service worker
├── options.html           # Settings page
├── options.css            # Settings page styles
├── options.js             # Settings functionality
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

## Development

### Prerequisites
- Chrome browser (latest version)
- Basic knowledge of HTML, CSS, and JavaScript
- Chrome extension development experience (helpful but not required)

### Building from Source
1. Clone the repository
2. Ensure all files are in the correct directory structure
3. Load the extension in Chrome as described in the Installation section
4. Make changes to the source files
5. Reload the extension in `chrome://extensions/` to see changes

### Testing
- Test on various websites to ensure compatibility
- Verify all features work as expected
- Check performance impact on target websites
- Test with different content types and languages

## API Reference

### Chrome APIs Used
- `chrome.tabs`: For tab management and content injection
- `chrome.storage`: For settings and data persistence
- `chrome.contextMenus`: For right-click context menus
- `chrome.notifications`: For break reminders and alerts
- `chrome.scripting`: For content script injection
- `chrome.commands`: For keyboard shortcuts

### Message Passing
The extension uses Chrome's message passing API for communication between components:
- Popup ↔ Content Script
- Background Script ↔ Content Script
- Options Page ↔ Background Script

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Privacy & Security

- All data is stored locally in your browser
- No personal information is sent to external servers
- Content analysis happens entirely in your browser
- You have full control over your data and settings

## Troubleshooting

### Common Issues
1. **Extension not working**: Ensure it's enabled in `chrome://extensions/`
2. **Highlights not showing**: Check if highlighting is enabled in settings
3. **Context menu missing**: Right-click on page content, not empty areas
4. **Settings not saving**: Check browser permissions and storage

### Support
- Check the [Issues](https://github.com/your-repo/issues) page for known problems
- Create a new issue for bugs or feature requests
- Include browser version and extension version in bug reports

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for content moderators and trust & safety professionals
- Inspired by the need for better moderation tools and well-being support
- Thanks to the Chrome extension development community

## Version History

### v1.0.0
- Initial release
- Core moderation features
- Well-being and break reminders
- Custom rule management
- Comprehensive settings and options

---

**Note**: This extension is designed to assist human moderators, not replace them. Always use your judgment when making moderation decisions.
