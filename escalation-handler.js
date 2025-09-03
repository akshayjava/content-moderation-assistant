// Enhanced Escalation Handler for Content Moderation Assistant
class EscalationHandler {
    constructor() {
        this.config = {
            // Configuration options for where escalated content goes
            destinations: {
                local: true,           // Store locally in Chrome storage
                clipboard: true,       // Copy to clipboard
                file: false,          // Save to local file
                api: false,           // Send to external API
                email: false,         // Send via email
                slack: false,         // Send to Slack webhook
                discord: false        // Send to Discord webhook
            },
            // API configuration (if using external API)
            api: {
                url: 'https://your-moderation-api.com/escalate',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer YOUR_API_KEY'
                }
            },
            // Email configuration (if using email)
            email: {
                to: 'moderation@yourcompany.com',
                subject: 'Content Escalation Alert'
            },
            // Slack webhook (if using Slack)
            slack: {
                webhookUrl: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
            }
        };
    }

    async handleEscalation(data, sender) {
        const escalationData = await this.prepareEscalationData(data, sender);
        
        // Handle each configured destination
        const results = {};
        
        if (this.config.destinations.local) {
            results.local = await this.storeLocally(escalationData);
        }
        
        if (this.config.destinations.clipboard) {
            results.clipboard = await this.copyToClipboard(escalationData);
        }
        
        if (this.config.destinations.file) {
            results.file = await this.saveToFile(escalationData);
        }
        
        if (this.config.destinations.api) {
            results.api = await this.sendToAPI(escalationData);
        }
        
        if (this.config.destinations.email) {
            results.email = await this.sendEmail(escalationData);
        }
        
        if (this.config.destinations.slack) {
            results.slack = await this.sendToSlack(escalationData);
        }
        
        return results;
    }

    async prepareEscalationData(data, sender) {
        // Capture screenshot
        const screenshot = await this.captureScreenshot(sender.tab.id);
        
        // Get page content
        const pageContent = await this.getPageContent(sender.tab.id);
        
        // Get user info if available
        const userInfo = await this.extractUserInfo(sender.tab.id);
        
        return {
            id: `ESC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            action: 'escalate',
            severity: data.rule?.severity || 'high',
            rule: data.rule,
            content: data.content,
            url: data.url,
            pageTitle: pageContent?.title || document.title,
            screenshot: screenshot,
            userInfo: userInfo,
            moderator: {
                browser: navigator.userAgent,
                extensionVersion: chrome.runtime.getManifest().version
            },
            metadata: {
                tabId: sender.tab?.id,
                windowId: sender.tab?.windowId,
                domain: new URL(data.url).hostname
            }
        };
    }

    async storeLocally(escalationData) {
        try {
            const logs = await this.getStoredData('escalationLogs') || [];
            logs.push(escalationData);
            
            // Keep only last 1000 escalations
            if (logs.length > 1000) {
                logs.splice(0, logs.length - 1000);
            }
            
            await this.setStoredData('escalationLogs', logs);
            return { success: true, message: 'Stored locally' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async copyToClipboard(escalationData) {
        try {
            const report = this.formatEscalationReport(escalationData);
            await navigator.clipboard.writeText(report);
            return { success: true, message: 'Copied to clipboard' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async saveToFile(escalationData) {
        try {
            const report = this.formatEscalationReport(escalationData);
            const blob = new Blob([report], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `escalation_${escalationData.id}.txt`;
            a.click();
            
            URL.revokeObjectURL(url);
            return { success: true, message: 'Saved to file' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async sendToAPI(escalationData) {
        try {
            const response = await fetch(this.config.api.url, {
                method: 'POST',
                headers: this.config.api.headers,
                body: JSON.stringify(escalationData)
            });
            
            if (response.ok) {
                const result = await response.json();
                return { success: true, message: 'Sent to API', data: result };
            } else {
                throw new Error(`API request failed: ${response.status}`);
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async sendEmail(escalationData) {
        try {
            const subject = `${this.config.email.subject} - ${escalationData.rule?.name || 'Manual Escalation'}`;
            const body = this.formatEscalationReport(escalationData);
            
            const mailtoLink = `mailto:${this.config.email.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            
            // Open email client
            window.open(mailtoLink);
            return { success: true, message: 'Opened email client' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async sendToSlack(escalationData) {
        try {
            const slackMessage = {
                text: `🚨 Content Escalation Alert`,
                attachments: [{
                    color: 'danger',
                    fields: [
                        { title: 'Rule', value: escalationData.rule?.name || 'Manual', short: true },
                        { title: 'Severity', value: escalationData.severity, short: true },
                        { title: 'URL', value: escalationData.url, short: false },
                        { title: 'Content', value: escalationData.content.substring(0, 1000), short: false }
                    ],
                    footer: 'Content Moderation Assistant',
                    ts: Math.floor(Date.now() / 1000)
                }]
            };
            
            const response = await fetch(this.config.slack.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(slackMessage)
            });
            
            if (response.ok) {
                return { success: true, message: 'Sent to Slack' };
            } else {
                throw new Error(`Slack request failed: ${response.status}`);
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    formatEscalationReport(escalationData) {
        return `🚨 CONTENT ESCALATION REPORT

ID: ${escalationData.id}
Timestamp: ${escalationData.timestamp}
Severity: ${escalationData.severity.toUpperCase()}

RULE VIOLATION:
Name: ${escalationData.rule?.name || 'Manual Escalation'}
Severity: ${escalationData.rule?.severity || 'Unknown'}

CONTENT:
${escalationData.content}

PAGE INFORMATION:
URL: ${escalationData.url}
Title: ${escalationData.pageTitle}
Domain: ${escalationData.metadata.domain}

USER INFORMATION:
${escalationData.userInfo ? JSON.stringify(escalationData.userInfo, null, 2) : 'No user information available'}

SCREENSHOT: ${escalationData.screenshot ? 'Available' : 'Not available'}

MODERATOR INFO:
Browser: ${escalationData.moderator.browser}
Extension Version: ${escalationData.moderator.extensionVersion}

---
Generated by Content Moderation Assistant
`;
    }

    async captureScreenshot(tabId) {
        try {
            return await chrome.tabs.captureVisibleTab(null, { format: 'png' });
        } catch (error) {
            console.error('Error capturing screenshot:', error);
            return null;
        }
    }

    async getPageContent(tabId) {
        try {
            // Check if scripting API is available
            if (!chrome.scripting || !chrome.scripting.executeScript) {
                console.warn('Chrome scripting API not available for page content extraction');
                return null;
            }
            
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => ({
                    title: document.title,
                    url: window.location.href,
                    textContent: document.body.textContent.substring(0, 1000)
                })
            });
            return results[0]?.result || null;
        } catch (error) {
            console.error('Error getting page content:', error);
            return null;
        }
    }

    async extractUserInfo(tabId) {
        try {
            // Check if scripting API is available
            if (!chrome.scripting || !chrome.scripting.executeScript) {
                console.warn('Chrome scripting API not available for user info extraction');
                return null;
            }
            
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    // Look for common user identification patterns
                    const userSelectors = [
                        '[data-user-id]', '[data-username]', '.username', 
                        '.user-name', '.author', '.poster', '.user'
                    ];
                    
                    for (const selector of userSelectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            return {
                                username: element.textContent?.trim(),
                                userId: element.getAttribute('data-user-id'),
                                element: selector
                            };
                        }
                    }
                    return null;
                }
            });
            return results[0]?.result || null;
        } catch (error) {
            console.error('Error extracting user info:', error);
            return null;
        }
    }

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

    // Configuration methods
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    getConfig() {
        return this.config;
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EscalationHandler;
} else {
    window.EscalationHandler = EscalationHandler;
}
