// Content Moderation Assistant - Background Script
class ModerationBackground {
    constructor() {
        this.init();
    }

    init() {
        this.setupContextMenus();
        this.setupMessageListener();
        this.setupAlarms();
        this.setupInstallation();
    }

    setupContextMenus() {
        // Remove existing context menus
        chrome.contextMenus.removeAll(() => {
            // Create main context menu
            chrome.contextMenus.create({
                id: 'moderation-main',
                title: 'Moderation Assistant',
                contexts: ['selection', 'page']
            });

            // Flag content
            chrome.contextMenus.create({
                id: 'flag-content',
                parentId: 'moderation-main',
                title: '🚩 Flag Content',
                contexts: ['selection']
            });

            // Escalate content
            chrome.contextMenus.create({
                id: 'escalate-content',
                parentId: 'moderation-main',
                title: '⬆️ Escalate',
                contexts: ['selection']
            });

            // Block user
            chrome.contextMenus.create({
                id: 'block-user',
                parentId: 'moderation-main',
                title: '🚫 Block User',
                contexts: ['selection']
            });

            // Generate report
            chrome.contextMenus.create({
                id: 'generate-report',
                parentId: 'moderation-main',
                title: '📄 Generate Report',
                contexts: ['selection']
            });

            // Separator
            chrome.contextMenus.create({
                id: 'separator1',
                parentId: 'moderation-main',
                type: 'separator',
                contexts: ['selection']
            });

            // Toggle highlighting
            chrome.contextMenus.create({
                id: 'toggle-highlighting',
                parentId: 'moderation-main',
                title: '👁️ Toggle Highlighting',
                contexts: ['page']
            });

            // Settings
            chrome.contextMenus.create({
                id: 'open-settings',
                parentId: 'moderation-main',
                title: '⚙️ Settings',
                contexts: ['page']
            });
        });
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            switch (request.type) {
                case 'moderationAction':
                    this.handleModerationAction(request.data, sender);
                    sendResponse({ success: true });
                    break;
                case 'getMetrics':
                    this.getMetrics().then(metrics => sendResponse(metrics));
                    return true; // Keep message channel open for async response
                case 'updateMetrics':
                    this.updateMetrics(request.data);
                    sendResponse({ success: true });
                    break;
                case 'scheduleBreak':
                    this.scheduleBreak(request.duration);
                    sendResponse({ success: true });
                    break;
                default:
                    sendResponse({ success: false, error: 'Unknown message type' });
            }
        });
    }

    async handleModerationAction(data, sender) {
        try {
            console.log('Background: Handling moderation action:', data);
            
            // Log the action
            await this.logModerationAction(data, sender);

            // Update metrics
            await this.updateMetrics({
                action: data.action,
                timestamp: Date.now(),
                url: data.url
            });

            console.log('Background: Metrics updated for action:', data.action);

            // Send notification if needed
            if (data.action === 'escalate' || data.action === 'block') {
                this.sendNotification(data);
            }

            // Generate report if requested
            if (data.action === 'generate-report') {
                await this.generateReport(data, sender);
            }

        } catch (error) {
            console.error('Error handling moderation action:', error);
        }
    }

    async logModerationAction(data, sender) {
        try {
            const logs = await this.getStoredData('moderationLogs') || [];
            const logEntry = {
                id: Date.now(),
                action: data.action,
                rule: data.rule,
                content: data.content,
                url: data.url,
                timestamp: data.timestamp,
                tabId: sender.tab?.id
            };

            logs.push(logEntry);

            // Keep only last 1000 entries
            if (logs.length > 1000) {
                logs.splice(0, logs.length - 1000);
            }

            await this.setStoredData('moderationLogs', logs);
        } catch (error) {
            console.error('Error logging moderation action:', error);
        }
    }

    async updateMetrics(data) {
        try {
            console.log('Background: Updating metrics with data:', data);
            const today = new Date().toDateString();
            const metrics = await this.getStoredData('dailyMetrics') || {};
            
            console.log('Background: Current metrics for today:', metrics[today]);
            
            if (!metrics[today]) {
                metrics[today] = {
                    itemsReviewed: 0,
                    violationsFound: 0,
                    actions: {
                        flag: 0,
                        escalate: 0,
                        block: 0
                    },
                    totalTime: 0,
                    startTime: Date.now()
                };
                console.log('Background: Created new metrics for today');
            }

            metrics[today].itemsReviewed++;
            console.log('Background: Items reviewed incremented to:', metrics[today].itemsReviewed);
            
            if (data.action && ['flag', 'escalate', 'block'].includes(data.action)) {
                metrics[today].violationsFound++;
                metrics[today].actions[data.action]++;
                console.log('Background: Action', data.action, 'incremented to:', metrics[today].actions[data.action]);
            }

            await this.setStoredData('dailyMetrics', metrics);
            console.log('Background: Metrics saved to storage:', metrics[today]);
        } catch (error) {
            console.error('Error updating metrics:', error);
        }
    }

    async getMetrics() {
        try {
            const today = new Date().toDateString();
            const metrics = await this.getStoredData('dailyMetrics') || {};
            const todayMetrics = metrics[today] || {
                itemsReviewed: 0,
                violationsFound: 0,
                actions: { flag: 0, escalate: 0, block: 0 },
                totalTime: 0
            };
            
            console.log('Background: Getting metrics for today:', today, 'Result:', todayMetrics);
            return todayMetrics;
        } catch (error) {
            console.error('Error getting metrics:', error);
            return null;
        }
    }

    sendNotification(data) {
        const messages = {
            escalate: {
                title: 'Content Escalated',
                message: 'Content has been escalated for review'
            },
            block: {
                title: 'User Blocked',
                message: 'User has been blocked successfully'
            }
        };

        const notification = messages[data.action];
        if (notification) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: notification.title,
                message: notification.message
            });
        }
    }

    async generateReport(data, sender) {
        try {
            // Capture screenshot
            const screenshot = await this.captureScreenshot(sender.tab.id);
            
            // Get page content
            const pageContent = await this.getPageContent(sender.tab.id);
            
            // Generate report
            const report = {
                timestamp: new Date().toISOString(),
                url: data.url,
                action: data.action,
                rule: data.rule,
                content: data.content,
                screenshot: screenshot,
                pageContent: pageContent,
                userAgent: navigator.userAgent
            };

            // Copy to clipboard
            await this.copyToClipboard(this.formatReport(report));
            
            // Show notification
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'Report Generated',
                message: 'Moderation report has been copied to clipboard'
            });

        } catch (error) {
            console.error('Error generating report:', error);
        }
    }

    async captureScreenshot(tabId) {
        try {
            const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
            return dataUrl;
        } catch (error) {
            console.error('Error capturing screenshot:', error);
            return null;
        }
    }

    async getPageContent(tabId) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    return {
                        title: document.title,
                        url: window.location.href,
                        textContent: document.body.textContent.substring(0, 1000) // Limit content
                    };
                }
            });
            return results[0]?.result || null;
        } catch (error) {
            console.error('Error getting page content:', error);
            return null;
        }
    }

    formatReport(report) {
        return `# Moderation Report

**Date:** ${report.timestamp}
**URL:** ${report.url}
**Action:** ${report.action}
**Rule:** ${report.rule?.name || 'Manual'}
**Severity:** ${report.rule?.severity || 'Unknown'}

## Content
\`\`\`
${report.content}
\`\`\`

## Page Information
- **Title:** ${report.pageContent?.title || 'N/A'}
- **User Agent:** ${report.userAgent}

## Screenshot
${report.screenshot ? 'Screenshot captured and available' : 'Screenshot not available'}

---
Generated by Content Moderation Assistant
`;
    }

    async copyToClipboard(text) {
        try {
            // Create a temporary textarea to copy text
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        } catch (error) {
            console.error('Error copying to clipboard:', error);
        }
    }

    setupAlarms() {
        // Set up break reminders
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'break-reminder') {
                this.showBreakReminder();
            }
        });
    }

    scheduleBreak(duration = 25) {
        chrome.alarms.create('break-reminder', {
            delayInMinutes: duration
        });
    }

    showBreakReminder() {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Break Time!',
            message: 'Time for a well-being break. Take a moment to relax and recharge.'
        });
    }

    setupInstallation() {
        chrome.runtime.onInstalled.addListener((details) => {
            if (details.reason === 'install') {
                // Set up default settings
                this.setupDefaultSettings();
                
                // Show welcome notification
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon48.png',
                    title: 'Welcome to Content Moderation Assistant!',
                    message: 'Right-click on any page to access moderation tools.'
                });
            }
        });
    }

    async setupDefaultSettings() {
        const defaultSettings = {
            highlightingEnabled: true,
            breakInterval: 25, // minutes
            breakDuration: 5, // minutes
            notificationsEnabled: true,
            autoReport: false,
            customRules: []
        };

        await this.setStoredData('moderationSettings', defaultSettings);
    }

    // Context menu click handler
    setupContextMenuHandler() {
        chrome.contextMenus.onClicked.addListener((info, tab) => {
            switch (info.menuItemId) {
                case 'flag-content':
                    this.performContextAction('flag', info, tab);
                    break;
                case 'escalate-content':
                    this.performContextAction('escalate', info, tab);
                    break;
                case 'block-user':
                    this.performContextAction('block', info, tab);
                    break;
                case 'generate-report':
                    this.performContextAction('generate-report', info, tab);
                    break;
                case 'toggle-highlighting':
                    this.toggleHighlighting(tab);
                    break;
                case 'open-settings':
                    chrome.runtime.openOptionsPage();
                    break;
            }
        });
    }

    async performContextAction(action, info, tab) {
        try {
            const data = {
                action: action,
                content: info.selectionText || '',
                url: tab.url,
                timestamp: Date.now()
            };

            await chrome.tabs.sendMessage(tab.id, {
                action: action,
                data: data
            });

        } catch (error) {
            console.error('Error performing context action:', error);
        }
    }

    async toggleHighlighting(tab) {
        try {
            await chrome.tabs.sendMessage(tab.id, {
                action: 'toggleHighlighting'
            });
        } catch (error) {
            console.error('Error toggling highlighting:', error);
        }
    }

    // Utility methods
    async getStoredData(key) {
        try {
            const result = await chrome.storage.local.get([key]);
            return result[key];
        } catch (error) {
            console.error('Error getting stored data:', error);
            return null;
        }
    }

    async setStoredData(key, value) {
        try {
            await chrome.storage.local.set({ [key]: value });
        } catch (error) {
            console.error('Error setting stored data:', error);
        }
    }
}

// Initialize background script
const moderationBackground = new ModerationBackground();
moderationBackground.setupContextMenuHandler();
