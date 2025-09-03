// Policy Manager - Configure AI-powered content analysis
class PolicyManager {
    constructor() {
        console.log('PolicyManager constructor called');
        this.geminiAnalyzer = null;
        this.settings = {
            analysisMode: 'automatic',
            confidenceThreshold: 75,
            maxContentLength: 4000,
            enableContextAnalysis: true,
            enableScreenshotAnalysis: true
        };
        
        this.init();
    }

    async init() {
        try {
            console.log('PolicyManager init started');
            
            // Initialize Gemini analyzer
            console.log('Creating GeminiContentAnalyzer...');
            this.geminiAnalyzer = new GeminiContentAnalyzer();
            console.log('GeminiContentAnalyzer created, initializing...');
            await this.geminiAnalyzer.init();
            console.log('GeminiContentAnalyzer initialized');
            
            console.log('Setting up event listeners...');
            this.setupEventListeners();
            console.log('Event listeners set up');
            
            console.log('Loading settings...');
            await this.loadSettings();
            console.log('Settings loaded');
            
            console.log('Loading API key...');
            await this.loadApiKey();
            console.log('API key loaded');
            
            console.log('Rendering policies...');
            this.renderGeneralPolicies();
            this.renderCustomPolicies();
            console.log('Policies rendered');
            
            console.log('Updating UI...');
            this.updateApiStatus();
            this.updateUI();
            console.log('UI updated');
            
            console.log('PolicyManager init completed successfully');
        } catch (error) {
            console.error('Error in PolicyManager init:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // API Configuration
        document.getElementById('saveApiKey').addEventListener('click', () => this.saveApiKey());
        document.getElementById('testApiKey').addEventListener('click', () => this.testApiConnection());
        document.getElementById('toggleApiKey').addEventListener('click', () => this.toggleApiKeyVisibility());
        document.getElementById('debugApi').addEventListener('click', () => this.debugApiStatus());

        // Navigation
        document.getElementById('backToOptions').addEventListener('click', () => this.goBackToOptions());

        // Policy Management
        document.getElementById('addCustomPolicy').addEventListener('click', () => this.showPolicyModal());
        document.getElementById('importPolicies').addEventListener('click', () => this.importPolicies());
        document.getElementById('exportPolicies').addEventListener('click', () => this.exportPolicies());

        // Analysis Settings
        document.getElementById('analysisMode').addEventListener('change', (e) => {
            this.settings.analysisMode = e.target.value;
            this.saveSettings();
        });
        
        document.getElementById('confidenceThreshold').addEventListener('input', (e) => {
            this.settings.confidenceThreshold = parseInt(e.target.value);
            document.getElementById('confidenceValue').textContent = e.target.value + '%';
            this.saveSettings();
        });
        
        document.getElementById('maxContentLength').addEventListener('change', (e) => {
            this.settings.maxContentLength = parseInt(e.target.value);
            this.saveSettings();
        });
        
        document.getElementById('enableContextAnalysis').addEventListener('change', (e) => {
            this.settings.enableContextAnalysis = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('enableScreenshotAnalysis').addEventListener('change', (e) => {
            this.settings.enableScreenshotAnalysis = e.target.checked;
            this.saveSettings();
        });

        // Test Analysis
        document.getElementById('analyzeUrl').addEventListener('click', () => this.testUrlAnalysis());
        document.getElementById('analyzeContent').addEventListener('click', () => this.testContentAnalysis());

        // Modal Events
        document.getElementById('savePolicy').addEventListener('click', () => this.saveCustomPolicy());
        document.getElementById('cancelPolicy').addEventListener('click', () => this.hidePolicyModal());
        document.querySelector('.modal-close').addEventListener('click', () => this.hidePolicyModal());
        
        // Close modal on outside click
        document.getElementById('policyModal').addEventListener('click', (e) => {
            if (e.target.id === 'policyModal') {
                this.hidePolicyModal();
            }
        });
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['policyManagerSettings']);
            if (result.policyManagerSettings) {
                this.settings = { ...this.settings, ...result.policyManagerSettings };
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async loadApiKey() {
        try {
            // The analyzer's init() method already calls loadConfiguration()
            // Just check if it's configured and update the UI
            if (this.geminiAnalyzer.isConfigured()) {
                // Update the API key input field to show it's configured (but don't show the actual key)
                const apiKeyInput = document.getElementById('apiKey');
                if (apiKeyInput) {
                    apiKeyInput.value = '••••••••••••••••'; // Show dots to indicate it's configured
                }
            }
        } catch (error) {
            console.error('Error loading API key:', error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({ policyManagerSettings: this.settings });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    updateUI() {
        document.getElementById('analysisMode').value = this.settings.analysisMode;
        document.getElementById('confidenceThreshold').value = this.settings.confidenceThreshold;
        document.getElementById('confidenceValue').textContent = this.settings.confidenceThreshold + '%';
        document.getElementById('maxContentLength').value = this.settings.maxContentLength;
        document.getElementById('enableContextAnalysis').checked = this.settings.enableContextAnalysis;
        document.getElementById('enableScreenshotAnalysis').checked = this.settings.enableScreenshotAnalysis;
    }

    async saveApiKey() {
        const apiKey = document.getElementById('apiKey').value.trim();
        if (!apiKey || apiKey === '••••••••••••••••') {
            this.showNotification('Please enter a new API key', 'error');
            return;
        }

        try {
            // Use the analyzer's setApiKey method which handles storage properly
            await this.geminiAnalyzer.setApiKey(apiKey);
            
            // Update UI to show it's configured
            const apiKeyInput = document.getElementById('apiKey');
            if (apiKeyInput) {
                apiKeyInput.value = '••••••••••••••••';
            }
            
            // Force refresh the status
            await this.loadApiKey();
            this.updateApiStatus();
            this.showNotification('API key saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving API key:', error);
            this.showNotification('Error saving API key: ' + error.message, 'error');
        }
    }

    async testApiConnection() {
        if (!this.geminiAnalyzer.isConfigured()) {
            this.showNotification('Please configure API key first', 'error');
            return;
        }

        try {
            // Test with a simple prompt
            const testPrompt = "Test connection. Respond with 'OK' if you can read this.";
            const response = await this.geminiAnalyzer.callGeminiAPI(testPrompt);
            
            if (response && response.toLowerCase().includes('ok')) {
                this.updateApiStatus('connected');
                this.showNotification('API connection successful!', 'success');
            } else {
                throw new Error('Unexpected response');
            }
        } catch (error) {
            console.error('API test failed:', error);
            this.updateApiStatus('error');
            this.showNotification('API connection failed: ' + error.message, 'error');
        }
    }

    toggleApiKeyVisibility() {
        const input = document.getElementById('apiKey');
        const button = document.getElementById('toggleApiKey');
        
        // If the input shows dots, it means the API key is already configured
        if (input.value === '••••••••••••••••') {
            this.showNotification('API key is already configured. Enter a new key to replace it.', 'info');
            return;
        }
        
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = 'Hide';
        } else {
            input.type = 'password';
            button.textContent = 'Show';
        }
    }

    updateApiStatus(status = null) {
        const statusElement = document.getElementById('apiStatus');
        const statusDot = statusElement.querySelector('.status-dot');
        const statusText = statusElement.querySelector('.status-text');

        if (status === 'connected') {
            statusElement.className = 'status-indicator connected';
            statusText.textContent = 'Connected';
        } else if (status === 'error') {
            statusElement.className = 'status-indicator error';
            statusText.textContent = 'Connection failed';
        } else if (this.geminiAnalyzer && this.geminiAnalyzer.isConfigured()) {
            statusElement.className = 'status-indicator connected';
            statusText.textContent = 'Configured (not tested)';
        } else {
            statusElement.className = 'status-indicator';
            statusText.textContent = 'Not configured';
        }
    }

    async debugApiStatus() {
        try {
            const result = await chrome.storage.sync.get(['geminiApiKey']);
            console.log('Storage result:', result);
            console.log('Analyzer configured:', this.geminiAnalyzer ? this.geminiAnalyzer.isConfigured() : 'No analyzer');
            console.log('Analyzer API key:', this.geminiAnalyzer ? this.geminiAnalyzer.apiKey : 'No analyzer');
        } catch (error) {
            console.error('Debug error:', error);
        }
    }

    renderGeneralPolicies() {
        const container = document.getElementById('generalPolicies');
        const policies = this.geminiAnalyzer.policies.general;
        
        container.innerHTML = Object.entries(policies).map(([key, policy]) => `
            <div class="policy-card">
                <div class="policy-header">
                    <div class="policy-info">
                        <div class="policy-type general">General</div>
                        <div class="policy-name">${policy.name}</div>
                        <div class="policy-description">${policy.description}</div>
                    </div>
                </div>
                <div class="policy-meta">
                    <span class="policy-severity ${policy.severity}">${policy.severity}</span>
                    <span>${policy.examples.length} examples</span>
                </div>
            </div>
        `).join('');
    }

    renderCustomPolicies() {
        const container = document.getElementById('customPolicies');
        const policies = this.geminiAnalyzer.policies.custom;
        
        if (policies.length === 0) {
            container.innerHTML = `
                <div class="no-policies">
                    <p>No custom policies yet. Click "Add Custom Policy" to create your first one.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = policies.map(policy => `
            <div class="policy-card">
                <div class="policy-header">
                    <div class="policy-info">
                        <div class="policy-type custom">Custom</div>
                        <div class="policy-name">${policy.name}</div>
                        <div class="policy-description">${policy.description}</div>
                    </div>
                </div>
                <div class="policy-meta">
                    <span class="policy-severity ${policy.severity}">${policy.severity}</span>
                    <span>Created: ${new Date(policy.created).toLocaleDateString()}</span>
                </div>
                <div class="policy-actions">
                    <button class="btn btn-small btn-secondary" onclick="policyManager.editPolicy('${policy.id}')">
                        Edit
                    </button>
                    <button class="btn btn-small btn-danger" onclick="policyManager.deletePolicy('${policy.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    showPolicyModal(policy = null) {
        const modal = document.getElementById('policyModal');
        const title = document.getElementById('modalTitle');
        
        if (policy) {
            title.textContent = 'Edit Custom Policy';
            this.editingPolicyId = policy.id;
            this.populatePolicyForm(policy);
        } else {
            title.textContent = 'Add Custom Policy';
            this.editingPolicyId = null;
            this.clearPolicyForm();
        }
        
        modal.style.display = 'block';
    }

    hidePolicyModal() {
        document.getElementById('policyModal').style.display = 'none';
        this.editingPolicyId = null;
        this.clearPolicyForm();
    }

    populatePolicyForm(policy) {
        document.getElementById('policyName').value = policy.name;
        document.getElementById('policyDescription').value = policy.description;
        document.getElementById('policySeverity').value = policy.severity;
        document.getElementById('policyExamples').value = policy.examples.join('\n');
        document.getElementById('policyEnabled').checked = policy.enabled !== false;
    }

    clearPolicyForm() {
        document.getElementById('policyName').value = '';
        document.getElementById('policyDescription').value = '';
        document.getElementById('policySeverity').value = 'medium';
        document.getElementById('policyExamples').value = '';
        document.getElementById('policyEnabled').checked = true;
    }

    async saveCustomPolicy() {
        const name = document.getElementById('policyName').value.trim();
        const description = document.getElementById('policyDescription').value.trim();
        const severity = document.getElementById('policySeverity').value;
        const examplesText = document.getElementById('policyExamples').value.trim();
        const enabled = document.getElementById('policyEnabled').checked;

        if (!name || !description) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        const examples = examplesText ? examplesText.split('\n').map(e => e.trim()).filter(e => e) : [];

        const policy = {
            name,
            description,
            severity,
            examples,
            enabled
        };

        try {
            if (this.editingPolicyId) {
                await this.geminiAnalyzer.updateCustomPolicy(this.editingPolicyId, policy);
                this.showNotification('Policy updated successfully!', 'success');
            } else {
                await this.geminiAnalyzer.addCustomPolicy(policy);
                this.showNotification('Policy created successfully!', 'success');
            }
            
            this.renderCustomPolicies();
            this.hidePolicyModal();
        } catch (error) {
            console.error('Error saving policy:', error);
            this.showNotification('Error saving policy: ' + error.message, 'error');
        }
    }

    async editPolicy(policyId) {
        const policy = this.geminiAnalyzer.policies.custom.find(p => p.id === policyId);
        if (policy) {
            this.showPolicyModal(policy);
        }
    }

    async deletePolicy(policyId) {
        if (!confirm('Are you sure you want to delete this policy?')) return;

        try {
            await this.geminiAnalyzer.deleteCustomPolicy(policyId);
            this.renderCustomPolicies();
            this.showNotification('Policy deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting policy:', error);
            this.showNotification('Error deleting policy: ' + error.message, 'error');
        }
    }

    async importPolicies() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const text = await file.text();
                    const importedPolicies = JSON.parse(text);
                    
                    if (Array.isArray(importedPolicies)) {
                        for (const policy of importedPolicies) {
                            await this.geminiAnalyzer.addCustomPolicy(policy);
                        }
                        this.renderCustomPolicies();
                        this.showNotification('Policies imported successfully!', 'success');
                    } else {
                        this.showNotification('Invalid policies file format', 'error');
                    }
                } catch (error) {
                    console.error('Error importing policies:', error);
                    this.showNotification('Error importing policies', 'error');
                }
            }
        };
        
        input.click();
    }

    exportPolicies() {
        const policies = this.geminiAnalyzer.policies.custom;
        const dataStr = JSON.stringify(policies, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'custom-policies.json';
        link.click();
        
        this.showNotification('Policies exported successfully!', 'success');
    }

    async testUrlAnalysis() {
        const url = document.getElementById('testUrl').value.trim();
        if (!url) {
            this.showNotification('Please enter a URL to test', 'error');
            return;
        }

        if (!this.geminiAnalyzer.isConfigured()) {
            this.showNotification('Please configure Gemini API key first', 'error');
            return;
        }

        const resultsContainer = document.getElementById('testResults');
        resultsContainer.innerHTML = '<div class="loading">Analyzing URL...</div>';

        try {
            const analysis = await this.geminiAnalyzer.analyzeURL(url);
            this.displayTestResults(analysis);
        } catch (error) {
            console.error('Error analyzing URL:', error);
            resultsContainer.innerHTML = `
                <div class="error">
                    <h4>Analysis Failed</h4>
                    <p>Error: ${error.message}</p>
                </div>
            `;
        }
    }

    async testContentAnalysis() {
        const content = document.getElementById('testContent').value.trim();
        if (!content) {
            this.showNotification('Please enter content to test', 'error');
            return;
        }

        if (!this.geminiAnalyzer.isConfigured()) {
            this.showNotification('Please configure Gemini API key first', 'error');
            return;
        }

        const resultsContainer = document.getElementById('testResults');
        resultsContainer.innerHTML = '<div class="loading">Analyzing content...</div>';

        try {
            const analysis = await this.geminiAnalyzer.analyzeContent(content, 'test://content');
            this.displayTestResults({ analysis, url: 'test://content' });
        } catch (error) {
            console.error('Error analyzing content:', error);
            resultsContainer.innerHTML = `
                <div class="error">
                    <h4>Analysis Failed</h4>
                    <p>Error: ${error.message}</p>
                </div>
            `;
        }
    }

    displayTestResults(result) {
        const resultsContainer = document.getElementById('testResults');
        const analysis = result.analysis;
        
        let violationsHtml = '';
        if (analysis.violations && analysis.violations.length > 0) {
            violationsHtml = analysis.violations.map(violation => `
                <div class="violation-item">
                    <div class="violation-header">
                        <span class="violation-policy">${violation.policy}</span>
                        <span class="violation-severity ${violation.severity}">${violation.severity}</span>
                        <span class="violation-confidence">${violation.confidence}% confidence</span>
                    </div>
                    <div class="violation-text">"${violation.violating_text}"</div>
                    <div class="violation-explanation">${violation.explanation}</div>
                </div>
            `).join('');
        } else {
            violationsHtml = '<div class="no-violations">No policy violations detected.</div>';
        }

        resultsContainer.innerHTML = `
            <div class="analysis-results">
                <h4>Analysis Results</h4>
                <div class="analysis-summary">
                    <p><strong>URL:</strong> ${result.url}</p>
                    <p><strong>Overall Toxicity Score:</strong> ${(analysis.overall_toxicity_score * 100).toFixed(1)}%</p>
                    <p><strong>Violations Found:</strong> ${analysis.violations ? analysis.violations.length : 0}</p>
                    <p><strong>Summary:</strong> ${analysis.summary}</p>
                    <p><strong>Model:</strong> ${analysis.model_used}</p>
                    <p><strong>Timestamp:</strong> ${new Date(analysis.timestamp).toLocaleString()}</p>
                </div>
                <div class="violations-section">
                    <h5>Policy Violations</h5>
                    ${violationsHtml}
                </div>
            </div>
        `;
    }

    goBackToOptions() {
        chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
    }

    showNotification(message, type = 'success') {
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
        
        setTimeout(() => notification.style.opacity = '1', 10);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }
}

// Initialize policy manager when DOM is loaded
let policyManager;
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Initializing Policy Manager...');
        policyManager = new PolicyManager();
        console.log('Policy Manager initialized successfully');
    } catch (error) {
        console.error('Error initializing Policy Manager:', error);
        // Show error notification to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #e74c3c;
            color: white;
            padding: 12px 16px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        errorDiv.textContent = 'Error loading Policy Manager. Please check console for details.';
        document.body.appendChild(errorDiv);
    }
});
