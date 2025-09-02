// Content Moderation Assistant - Options Page Script
class OptionsManager {
    constructor() {
        this.settings = {};
        this.rules = [];
        this.editingRuleId = null;
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadRules();
        this.setupEventListeners();
        this.renderRules();
        this.updateUI();
    }

    setupEventListeners() {
        // Save settings
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        
        // Reset settings
        document.getElementById('resetSettings').addEventListener('click', () => this.resetSettings());
        
        // Rules management
        document.getElementById('addRule').addEventListener('click', () => this.showRuleModal());
        document.getElementById('importRules').addEventListener('click', () => this.importRules());
        document.getElementById('exportRules').addEventListener('click', () => this.exportRules());
        
        // Data management
        document.getElementById('clearData').addEventListener('click', () => this.clearAllData());
        document.getElementById('exportData').addEventListener('click', () => this.exportAllData());
        document.getElementById('importData').addEventListener('click', () => this.importAllData());
        
        // Modal events
        document.getElementById('saveRule').addEventListener('click', () => this.saveRule());
        document.getElementById('cancelRule').addEventListener('click', () => this.hideRuleModal());
        document.querySelector('.modal-close').addEventListener('click', () => this.hideRuleModal());
        
        // Close modal on outside click
        document.getElementById('ruleModal').addEventListener('click', (e) => {
            if (e.target.id === 'ruleModal') {
                this.hideRuleModal();
            }
        });
        
        // Help link
        document.getElementById('helpLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showHelp();
        });

        // Policy manager
        document.getElementById('openPolicyManager').addEventListener('click', () => this.openPolicyManager());
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['moderationSettings']);
            this.settings = result.moderationSettings || this.getDefaultSettings();
            this.updateSettingsUI();
        } catch (error) {
            console.error('Error loading settings:', error);
            this.settings = this.getDefaultSettings();
        }
    }

    async loadRules() {
        try {
            const result = await chrome.storage.sync.get(['moderationRules']);
            this.rules = result.moderationRules || this.getDefaultRules();
        } catch (error) {
            console.error('Error loading rules:', error);
            this.rules = this.getDefaultRules();
        }
    }

    getDefaultSettings() {
        return {
            highlightingEnabled: true,
            notificationsEnabled: true,
            autoReport: false,
            breakInterval: 25,
            breakDuration: 5
        };
    }

    getDefaultRules() {
        return [
            {
                id: 'spam',
                name: 'Spam Detection',
                keywords: ['buy now', 'click here', 'free money', 'make money fast', 'viagra', 'casino'],
                severity: 'medium',
                color: '#ffeb3b'
            },
            {
                id: 'harassment',
                name: 'Harassment',
                keywords: ['kill yourself', 'you should die', 'hate you', 'stupid', 'idiot', 'moron'],
                severity: 'high',
                color: '#f44336'
            },
            {
                id: 'hate_speech',
                name: 'Hate Speech',
                keywords: ['nazi', 'hitler', 'white power', 'black lives don\'t matter', 'terrorist'],
                severity: 'high',
                color: '#d32f2f'
            },
            {
                id: 'violence',
                name: 'Violence',
                keywords: ['bomb', 'shoot', 'kill', 'murder', 'violence', 'attack'],
                severity: 'high',
                color: '#c62828'
            },
            {
                id: 'adult_content',
                name: 'Adult Content',
                keywords: ['porn', 'sex', 'nude', 'naked', 'xxx', 'adult'],
                severity: 'medium',
                color: '#ff9800'
            }
        ];
    }

    updateSettingsUI() {
        document.getElementById('highlightingEnabled').checked = this.settings.highlightingEnabled;
        document.getElementById('notificationsEnabled').checked = this.settings.notificationsEnabled;
        document.getElementById('autoReport').checked = this.settings.autoReport;
        document.getElementById('breakInterval').value = this.settings.breakInterval;
        document.getElementById('breakDuration').value = this.settings.breakDuration;
    }

    updateUI() {
        this.updateSettingsUI();
        this.renderRules();
    }

    async saveSettings() {
        try {
            // Collect settings from UI
            this.settings = {
                highlightingEnabled: document.getElementById('highlightingEnabled').checked,
                notificationsEnabled: document.getElementById('notificationsEnabled').checked,
                autoReport: document.getElementById('autoReport').checked,
                breakInterval: parseInt(document.getElementById('breakInterval').value),
                breakDuration: parseInt(document.getElementById('breakDuration').value)
            };

            // Save to storage
            await chrome.storage.sync.set({ moderationSettings: this.settings });
            await chrome.storage.sync.set({ moderationRules: this.rules });

            this.showNotification('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Error saving settings', 'error');
        }
    }

    async resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults? This will also reset your custom rules.')) {
            this.settings = this.getDefaultSettings();
            this.rules = this.getDefaultRules();
            this.updateUI();
            await this.saveSettings();
            this.showNotification('Settings reset to defaults', 'success');
        }
    }

    renderRules() {
        const rulesList = document.getElementById('rulesList');
        rulesList.innerHTML = '';

        this.rules.forEach(rule => {
            const ruleElement = this.createRuleElement(rule);
            rulesList.appendChild(ruleElement);
        });
    }

    createRuleElement(rule) {
        const div = document.createElement('div');
        div.className = 'rule-item';
        div.innerHTML = `
            <div class="rule-color" style="background-color: ${rule.color}"></div>
            <div class="rule-info">
                <div class="rule-name">${rule.name}</div>
                <div class="rule-details">
                    ${rule.keywords.length} keywords • Severity: ${rule.severity}
                </div>
            </div>
            <div class="rule-actions">
                <button class="btn btn-small btn-secondary edit-rule" data-rule-id="${rule.id}">Edit</button>
                <button class="btn btn-small btn-danger delete-rule" data-rule-id="${rule.id}">Delete</button>
            </div>
        `;

        // Add event listeners
        div.querySelector('.edit-rule').addEventListener('click', () => this.editRule(rule.id));
        div.querySelector('.delete-rule').addEventListener('click', () => this.deleteRule(rule.id));

        return div;
    }

    showRuleModal(rule = null) {
        const modal = document.getElementById('ruleModal');
        const title = document.getElementById('modalTitle');
        
        if (rule) {
            title.textContent = 'Edit Rule';
            this.editingRuleId = rule.id;
            this.populateRuleForm(rule);
        } else {
            title.textContent = 'Add New Rule';
            this.editingRuleId = null;
            this.clearRuleForm();
        }
        
        modal.style.display = 'block';
    }

    hideRuleModal() {
        document.getElementById('ruleModal').style.display = 'none';
        this.editingRuleId = null;
        this.clearRuleForm();
    }

    populateRuleForm(rule) {
        document.getElementById('ruleName').value = rule.name;
        document.getElementById('ruleKeywords').value = rule.keywords.join('\n');
        document.getElementById('ruleSeverity').value = rule.severity;
        document.getElementById('ruleColor').value = rule.color;
    }

    clearRuleForm() {
        document.getElementById('ruleName').value = '';
        document.getElementById('ruleKeywords').value = '';
        document.getElementById('ruleSeverity').value = 'medium';
        document.getElementById('ruleColor').value = '#ffeb3b';
    }

    saveRule() {
        const name = document.getElementById('ruleName').value.trim();
        const keywordsText = document.getElementById('ruleKeywords').value.trim();
        const severity = document.getElementById('ruleSeverity').value;
        const color = document.getElementById('ruleColor').value;

        if (!name || !keywordsText) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        const keywords = keywordsText.split('\n').map(k => k.trim()).filter(k => k);

        if (keywords.length === 0) {
            this.showNotification('Please enter at least one keyword', 'error');
            return;
        }

        const rule = {
            id: this.editingRuleId || this.generateRuleId(),
            name,
            keywords,
            severity,
            color
        };

        if (this.editingRuleId) {
            // Update existing rule
            const index = this.rules.findIndex(r => r.id === this.editingRuleId);
            if (index !== -1) {
                this.rules[index] = rule;
            }
        } else {
            // Add new rule
            this.rules.push(rule);
        }

        this.renderRules();
        this.hideRuleModal();
        this.showNotification('Rule saved successfully!', 'success');
    }

    editRule(ruleId) {
        const rule = this.rules.find(r => r.id === ruleId);
        if (rule) {
            this.showRuleModal(rule);
        }
    }

    deleteRule(ruleId) {
        if (confirm('Are you sure you want to delete this rule?')) {
            this.rules = this.rules.filter(r => r.id !== ruleId);
            this.renderRules();
            this.showNotification('Rule deleted successfully!', 'success');
        }
    }

    generateRuleId() {
        return 'rule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async importRules() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const importedRules = JSON.parse(text);
                    
                    if (Array.isArray(importedRules)) {
                        this.rules = [...this.rules, ...importedRules];
                        this.renderRules();
                        this.showNotification('Rules imported successfully!', 'success');
                    } else {
                        this.showNotification('Invalid rules file format', 'error');
                    }
                } catch (error) {
                    console.error('Error importing rules:', error);
                    this.showNotification('Error importing rules', 'error');
                }
            }
        };
        
        input.click();
    }

    exportRules() {
        const dataStr = JSON.stringify(this.rules, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'moderation-rules.json';
        link.click();
        
        this.showNotification('Rules exported successfully!', 'success');
    }

    async clearAllData() {
        if (confirm('Are you sure you want to clear ALL data? This includes settings, rules, metrics, and logs. This action cannot be undone.')) {
            try {
                await chrome.storage.local.clear();
                await chrome.storage.sync.clear();
                
                this.settings = this.getDefaultSettings();
                this.rules = this.getDefaultRules();
                this.updateUI();
                
                this.showNotification('All data cleared successfully!', 'success');
            } catch (error) {
                console.error('Error clearing data:', error);
                this.showNotification('Error clearing data', 'error');
            }
        }
    }

    async exportAllData() {
        try {
            const localData = await chrome.storage.local.get();
            const syncData = await chrome.storage.sync.get();
            
            const allData = {
                local: localData,
                sync: syncData,
                exportDate: new Date().toISOString()
            };
            
            const dataStr = JSON.stringify(allData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `moderation-data-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.showNotification('Data exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showNotification('Error exporting data', 'error');
        }
    }

    async importAllData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const importedData = JSON.parse(text);
                    
                    if (importedData.local) {
                        await chrome.storage.local.set(importedData.local);
                    }
                    
                    if (importedData.sync) {
                        await chrome.storage.sync.set(importedData.sync);
                    }
                    
                    // Reload settings and rules
                    await this.loadSettings();
                    await this.loadRules();
                    this.updateUI();
                    
                    this.showNotification('Data imported successfully!', 'success');
                } catch (error) {
                    console.error('Error importing data:', error);
                    this.showNotification('Error importing data', 'error');
                }
            }
        };
        
        input.click();
    }

    showHelp() {
        const helpContent = `
# Content Moderation Assistant - Help

## Getting Started
1. Install the extension and reload your browser
2. Right-click on any webpage to access moderation tools
3. Configure your settings and custom rules in this options page

## Features
- **Content Highlighting**: Automatically highlights potential violations
- **AI Analysis**: Gemini-powered content analysis with custom policies
- **Quick Actions**: Flag, escalate, or block content with one click
- **Custom Rules**: Create your own moderation rules
- **Well-being**: Break reminders and mindful moments
- **Reporting**: Generate detailed moderation reports

## AI-Powered Analysis
- Configure Gemini API for advanced content analysis
- Create custom policies for specific needs
- URL context analysis for comprehensive detection
- Confidence scoring and detailed explanations

## Keyboard Shortcuts
- Ctrl+Shift+F: Flag selected content
- Ctrl+Shift+E: Escalate selected content
- Ctrl+Shift+B: Block selected user

## Support
For more help, visit our documentation or contact support.
        `;
        
        alert(helpContent);
    }

    openPolicyManager() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('policy-manager.html')
        });
    }

    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
            color: white;
            padding: 12px 16px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        document.body.appendChild(notification);
        
        // Fade in
        setTimeout(() => notification.style.opacity = '1', 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }
}

// Initialize options manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OptionsManager();
});
