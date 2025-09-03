// Content Moderation Assistant - Content Script
console.log('Content script loading...');

class ContentModerator {
    constructor() {
        console.log('ContentModerator constructor called');
        this.rules = [];
        this.highlightedElements = [];
        this.toxicityScore = 0;
        this.isActive = true;
        this.geminiAnalyzer = null;
        this.analysisMode = 'automatic';
        this.aiAnalysisResults = null;
        
        this.init();
    }

    async init() {
        console.log('ContentModerator init started');
        try {
            await this.loadRules();
            console.log('Rules loaded');
            await this.loadSettings();
            console.log('Settings loaded');
            await this.initializeGeminiAnalyzer();
            console.log('Gemini analyzer initialized');
            this.setupMessageListener();
            console.log('Message listener setup');
            this.analyzePage();
            console.log('Page analysis started');
            this.createFloatingToolbar();
            console.log('Floating toolbar created');
            this.setupKeyboardShortcuts();
            console.log('Keyboard shortcuts setup');
            console.log('ContentModerator init completed successfully');
        } catch (error) {
            console.error('Error in ContentModerator init:', error);
        }
    }

    async loadRules() {
        try {
            const result = await chrome.storage.sync.get(['moderationRules']);
            if (result.moderationRules) {
                this.rules = result.moderationRules;
            } else {
                // Default rules
                this.rules = this.getDefaultRules();
                await this.saveRules();
            }
        } catch (error) {
            console.error('Error loading rules:', error);
            this.rules = this.getDefaultRules();
        }
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

    async saveRules() {
        try {
            await chrome.storage.sync.set({ moderationRules: this.rules });
        } catch (error) {
            console.error('Error saving rules:', error);
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['policyManagerSettings']);
            if (result.policyManagerSettings) {
                this.analysisMode = result.policyManagerSettings.analysisMode || 'automatic';
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async initializeGeminiAnalyzer() {
        try {
            // Check if Gemini analyzer is available
            if (typeof GeminiContentAnalyzer !== 'undefined') {
                this.geminiAnalyzer = new GeminiContentAnalyzer();
                await this.geminiAnalyzer.init();
            }
        } catch (error) {
            console.error('Error initializing Gemini analyzer:', error);
        }
    }

    setupMessageListener() {
        console.log('Setting up message listener...');
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Message received:', request.action);
            try {
                switch (request.action) {
                    case 'ping':
                        console.log('Ping received, responding...');
                        sendResponse({ success: true, message: 'Content script is loaded' });
                        break;
                    case 'test':
                        console.log('Test message received, responding...');
                        sendResponse({ 
                            success: true, 
                            message: 'Content script test successful',
                            timestamp: new Date().toISOString(),
                            url: window.location.href,
                            readyState: document.readyState
                        });
                        break;
                    case 'flag':
                        console.log('Content script received flag action');
                        this.flagContent();
                        sendResponse({ success: true });
                        break;
                    case 'escalate':
                        console.log('Content script received escalate action');
                        this.escalateContent();
                        sendResponse({ success: true });
                        break;
                    case 'block':
                        this.blockUser();
                        sendResponse({ success: true });
                        break;
                    case 'getToxicityScore':
                        sendResponse({ score: this.toxicityScore });
                        break;
                    case 'toggleHighlighting':
                        this.toggleHighlighting();
                        sendResponse({ success: true, active: this.isActive });
                        break;
                    case 'analyzeWithAI':
                        this.performAIAnalysis().then(result => sendResponse(result));
                        return true; // Keep message channel open for async response
                    case 'getAIAnalysis':
                        sendResponse({ analysis: this.aiAnalysisResults });
                        break;
                    case 'toggleImageFilter':
                        // Forward to image filter if available
                        if (window.imageFilter) {
                            window.imageFilter.toggleFiltering();
                            sendResponse({ success: true, enabled: window.imageFilter.settings.enabled });
                        } else {
                            sendResponse({ success: false, error: 'Image filter not available' });
                        }
                        break;
                    case 'updateImageFilterSettings':
                        console.log('Content script received updateImageFilterSettings message:', request.settings);
                        console.log('window.imageFilter available:', !!window.imageFilter);
                        if (window.imageFilter) {
                            console.log('Updating image filter settings...');
                            window.imageFilter.updateSettings(request.settings);
                            console.log('Image filter settings updated successfully');
                            sendResponse({ success: true });
                        } else {
                            console.log('Image filter not available, sending error response');
                            sendResponse({ success: false, error: 'Image filter not available' });
                        }
                        break;
                    case 'clearImageFilters':
                        if (window.imageFilter) {
                            window.imageFilter.clearAllFilters();
                            sendResponse({ success: true });
                        } else {
                            sendResponse({ success: false, error: 'Image filter not available' });
                        }
                        break;
                    default:
                        sendResponse({ success: false, error: 'Unknown action' });
                }
            } catch (error) {
                console.error('Error in content script message handler:', error);
                sendResponse({ success: false, error: error.message });
            }
        });
    }

    async analyzePage() {
        if (!this.isActive) return;

        this.clearHighlights();
        
        // Perform analysis based on mode
        if (this.analysisMode === 'ai_only' || this.analysisMode === 'automatic') {
            await this.performAIAnalysis();
        }
        
        if (this.analysisMode === 'rules_only' || this.analysisMode === 'automatic') {
            this.highlightContent();
            this.calculateToxicityScore();
        }
        
        this.detectUserInfo();
    }

    highlightContent() {
        const textNodes = this.getTextNodes();
        
        textNodes.forEach(node => {
            const text = node.textContent.toLowerCase();
            let hasViolation = false;
            let highestSeverity = 'low';
            let matchedRule = null;

            // Check against all rules
            this.rules.forEach(rule => {
                rule.keywords.forEach(keyword => {
                    if (text.includes(keyword.toLowerCase())) {
                        hasViolation = true;
                        if (this.getSeverityLevel(rule.severity) > this.getSeverityLevel(highestSeverity)) {
                            highestSeverity = rule.severity;
                            matchedRule = rule;
                        }
                    }
                });
            });

            if (hasViolation && matchedRule) {
                this.highlightNode(node, matchedRule);
            }
        });
    }

    getTextNodes() {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Skip script and style elements
                    const parent = node.parentElement;
                    if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // Only process nodes with meaningful text
                    return node.textContent.trim().length > 3 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            }
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        return textNodes;
    }

    highlightNode(textNode, rule) {
        const parent = textNode.parentElement;
        if (!parent || parent.classList.contains('moderation-highlight')) return;

        const wrapper = document.createElement('span');
        wrapper.className = 'moderation-highlight';
        wrapper.style.cssText = `
            background-color: ${rule.color}40;
            border: 2px solid ${rule.color};
            border-radius: 3px;
            padding: 1px 2px;
            margin: 0 1px;
            position: relative;
            cursor: pointer;
        `;

        wrapper.setAttribute('data-rule-id', rule.id);
        wrapper.setAttribute('data-rule-name', rule.name);
        wrapper.setAttribute('data-severity', rule.severity);

        // Add tooltip
        wrapper.title = `Violation: ${rule.name} (${rule.severity})`;

        // Wrap the text node
        textNode.parentNode.insertBefore(wrapper, textNode);
        wrapper.appendChild(textNode);

        // Add click handler for quick actions
        wrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showQuickActions(e, rule);
        });

        this.highlightedElements.push(wrapper);
    }

    showQuickActions(event, rule) {
        // Remove existing quick actions
        const existing = document.querySelector('.moderation-quick-actions');
        if (existing) {
            existing.remove();
        }

        const actions = document.createElement('div');
        actions.className = 'moderation-quick-actions';
        actions.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            min-width: 120px;
        `;

        const actionButtons = [
            { text: 'Flag', action: 'flag', color: '#ffeb3b' },
            { text: 'Escalate', action: 'escalate', color: '#ff9800' },
            { text: 'Block User', action: 'block', color: '#f44336' }
        ];

        actionButtons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.text;
            button.style.cssText = `
                padding: 8px 12px;
                border: none;
                background: ${btn.color};
                color: white;
                cursor: pointer;
                font-size: 12px;
                border-bottom: 1px solid rgba(0,0,0,0.1);
            `;
            button.addEventListener('click', () => {
                this.performQuickAction(btn.action, rule);
                actions.remove();
            });
            actions.appendChild(button);
        });

        event.target.appendChild(actions);

        // Position the actions
        const rect = event.target.getBoundingClientRect();
        actions.style.left = '0px';
        actions.style.top = '100%';

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', () => actions.remove(), { once: true });
        }, 100);
    }

    performQuickAction(action, rule) {
        const data = {
            action: action,
            rule: rule,
            content: this.getSelectedText(),
            url: window.location.href,
            timestamp: Date.now()
        };

        // Send to background script for processing
        chrome.runtime.sendMessage({
            type: 'moderationAction',
            data: data
        });

        // Visual feedback
        this.showActionFeedback(action);
    }

    getSelectedText() {
        try {
            const selection = window.getSelection();
            if (selection && selection.toString().trim()) {
                return selection.toString().trim();
            }
            
            // Check for highlighted content
            const highlightedElement = document.querySelector('.moderation-highlight:hover');
            if (highlightedElement && highlightedElement.textContent.trim()) {
                return highlightedElement.textContent.trim();
            }
            
            // Check for any text selection
            const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
            if (range && range.toString().trim()) {
                return range.toString().trim();
            }
            
            return '';
        } catch (error) {
            console.error('Error getting selected text:', error);
            return '';
        }
    }

    showActionFeedback(action, customMessage = null) {
        const feedback = document.createElement('div');
        const isError = customMessage && customMessage.includes('Please');
        
        feedback.textContent = customMessage || `${action.charAt(0).toUpperCase() + action.slice(1)} action performed`;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${isError ? '#e74c3c' : '#27ae60'};
            color: white;
            padding: 12px 16px;
            border-radius: 4px;
            z-index: 10001;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            max-width: 300px;
            word-wrap: break-word;
        `;

        document.body.appendChild(feedback);
        setTimeout(() => feedback.remove(), isError ? 5000 : 3000);
    }

    calculateToxicityScore() {
        let totalScore = 0;
        let totalWords = 0;

        const textNodes = this.getTextNodes();
        
        textNodes.forEach(node => {
            const words = node.textContent.toLowerCase().split(/\s+/);
            totalWords += words.length;

            this.rules.forEach(rule => {
                const severityWeight = this.getSeverityLevel(rule.severity);
                rule.keywords.forEach(keyword => {
                    words.forEach(word => {
                        if (word.includes(keyword.toLowerCase())) {
                            totalScore += severityWeight;
                        }
                    });
                });
            });
        });

        this.toxicityScore = totalWords > 0 ? Math.min(totalScore / totalWords, 1) : 0;
    }

    getSeverityLevel(severity) {
        const levels = { low: 0.1, medium: 0.3, high: 0.7 };
        return levels[severity] || 0.1;
    }

    detectUserInfo() {
        // Look for common user identification patterns
        const userSelectors = [
            '[data-user-id]',
            '[data-username]',
            '.username',
            '.user-name',
            '.author',
            '.poster'
        ];

        userSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                this.addUserInfoOverlay(element);
            });
        });
    }

    addUserInfoOverlay(element) {
        if (element.classList.contains('moderation-user-info')) return;

        element.classList.add('moderation-user-info');
        element.style.position = 'relative';
        element.style.cursor = 'pointer';

        element.addEventListener('mouseenter', (e) => {
            this.showUserInfo(e.target);
        });

        element.addEventListener('mouseleave', () => {
            this.hideUserInfo();
        });
    }

    showUserInfo(element) {
        const existing = document.querySelector('.moderation-user-popup');
        if (existing) existing.remove();

        const popup = document.createElement('div');
        popup.className = 'moderation-user-popup';
        popup.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: 200px;
            font-size: 12px;
        `;

        // Mock user data - in real implementation, this would come from an API
        const userData = {
            username: element.textContent || 'Unknown User',
            violations: Math.floor(Math.random() * 5),
            warnings: Math.floor(Math.random() * 3),
            lastActivity: '2 hours ago'
        };

        popup.innerHTML = `
            <div><strong>${userData.username}</strong></div>
            <div>Violations: ${userData.violations}</div>
            <div>Warnings: ${userData.warnings}</div>
            <div>Last Active: ${userData.lastActivity}</div>
        `;

        element.appendChild(popup);
    }

    hideUserInfo() {
        const popup = document.querySelector('.moderation-user-popup');
        if (popup) popup.remove();
    }

    createFloatingToolbar() {
        const toolbar = document.createElement('div');
        toolbar.id = 'moderation-toolbar';
        toolbar.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.95);
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 8px;
            z-index: 10000;
            display: flex;
            gap: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;

        const buttons = [
            { icon: '🚩', action: 'flag', title: 'Flag Content' },
            { icon: '⬆️', action: 'escalate', title: 'Escalate' },
            { icon: '🚫', action: 'block', title: 'Block User' },
            { icon: '👁️', action: 'toggle', title: 'Toggle Highlighting' }
        ];

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.innerHTML = btn.icon;
            button.title = btn.title;
            button.style.cssText = `
                width: 32px;
                height: 32px;
                border: none;
                background: #f5f5f5;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            button.addEventListener('click', () => {
                if (btn.action === 'toggle') {
                    this.toggleHighlighting();
                } else {
                    this.performQuickAction(btn.action, null);
                }
            });

            toolbar.appendChild(button);
        });

        document.body.appendChild(toolbar);
    }

    toggleHighlighting() {
        this.isActive = !this.isActive;
        
        if (this.isActive) {
            this.analyzePage();
        } else {
            this.clearHighlights();
        }

        // Update toolbar button
        const toggleBtn = document.querySelector('#moderation-toolbar button[title="Toggle Highlighting"]');
        if (toggleBtn) {
            toggleBtn.style.background = this.isActive ? '#f5f5f5' : '#ffeb3b';
        }
    }

    clearHighlights() {
        this.highlightedElements.forEach(element => {
            if (element.parentNode) {
                element.parentNode.insertBefore(element.firstChild, element);
                element.parentNode.removeChild(element);
            }
        });
        this.highlightedElements = [];
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey) {
                switch (e.key) {
                    case 'F':
                        e.preventDefault();
                        this.performQuickAction('flag', null);
                        break;
                    case 'E':
                        e.preventDefault();
                        this.performQuickAction('escalate', null);
                        break;
                    case 'B':
                        e.preventDefault();
                        this.performQuickAction('block', null);
                        break;
                }
            }
        });
    }

    flagContent() {
        const selectedText = this.getSelectedText();
        if (selectedText) {
            this.performQuickAction('flag', { name: 'Manual Flag', severity: 'medium' });
        } else {
            // If no text is selected, allow flagging the current page
            const pageTitle = document.title || 'Current Page';
            const pageUrl = window.location.href;
            
            // Create a manual flag for the current page
            const data = {
                action: 'flag',
                content: `Page flagged: ${pageTitle}`,
                url: pageUrl,
                timestamp: Date.now(),
                rule: { name: 'Manual Page Flag', severity: 'medium' }
            };

            // Send to background script for processing
            chrome.runtime.sendMessage({
                type: 'moderationAction',
                data: data
            });

            this.showActionFeedback('flag', 'Page flagged successfully');
        }
    }

    escalateContent() {
        const selectedText = this.getSelectedText();
        if (selectedText) {
            this.performQuickAction('escalate', { name: 'Manual Escalation', severity: 'high' });
        } else {
            // If no text is selected, allow escalating the current page
            const pageTitle = document.title || 'Current Page';
            const pageUrl = window.location.href;
            
            // Create a manual escalation for the current page
            const data = {
                action: 'escalate',
                content: `Page escalated: ${pageTitle}`,
                url: pageUrl,
                timestamp: Date.now(),
                rule: { name: 'Manual Page Escalation', severity: 'high' }
            };

            // Send to background script for processing
            chrome.runtime.sendMessage({
                type: 'moderationAction',
                data: data
            });

            this.showActionFeedback('escalate', 'Page escalated successfully');
        }
    }

    blockUser() {
        const userElement = document.querySelector('.moderation-user-info:hover');
        if (userElement) {
            this.performQuickAction('block', { name: 'User Block', severity: 'high' });
        } else {
            this.showActionFeedback('block', 'Please hover over a user element to block');
        }
    }

    async performAIAnalysis() {
        if (!this.geminiAnalyzer || !this.geminiAnalyzer.isConfigured()) {
            console.log('Gemini analyzer not configured, skipping AI analysis');
            return { success: false, error: 'AI analyzer not configured' };
        }

        try {
            // Get page content
            const pageContent = await this.geminiAnalyzer.extractPageContent();
            const urlContext = await this.geminiAnalyzer.getURLContext(window.location.href);
            
            // Perform AI analysis
            const analysis = await this.geminiAnalyzer.analyzeContent(
                pageContent.text, 
                window.location.href, 
                urlContext
            );

            this.aiAnalysisResults = analysis;
            
            // Highlight AI-detected violations
            if (analysis.violations && analysis.violations.length > 0) {
                this.highlightAIViolations(analysis.violations);
            }

            // Update toxicity score
            this.toxicityScore = analysis.overall_toxicity_score || 0;

            return { success: true, analysis: analysis };
        } catch (error) {
            console.error('Error performing AI analysis:', error);
            return { success: false, error: error.message };
        }
    }

    highlightAIViolations(violations) {
        violations.forEach(violation => {
            if (violation.violating_text && violation.start_index !== undefined && violation.end_index !== undefined) {
                this.highlightAIViolation(violation);
            }
        });
    }

    highlightAIViolation(violation) {
        const textNodes = this.getTextNodes();
        const violationText = violation.violating_text.toLowerCase();
        
        textNodes.forEach(node => {
            const nodeText = node.textContent.toLowerCase();
            const index = nodeText.indexOf(violationText);
            
            if (index !== -1) {
                const parent = node.parentElement;
                if (!parent || parent.classList.contains('ai-violation-highlight')) return;

                const wrapper = document.createElement('span');
                wrapper.className = 'ai-violation-highlight';
                wrapper.style.cssText = `
                    background-color: ${this.getViolationColor(violation.severity)}40;
                    border: 2px solid ${this.getViolationColor(violation.severity)};
                    border-radius: 3px;
                    padding: 1px 2px;
                    margin: 0 1px;
                    position: relative;
                    cursor: pointer;
                `;

                wrapper.setAttribute('data-violation-id', violation.policy);
                wrapper.setAttribute('data-severity', violation.severity);
                wrapper.setAttribute('data-confidence', violation.confidence);
                wrapper.setAttribute('data-explanation', violation.explanation);

                // Add tooltip
                wrapper.title = `AI Detected: ${violation.policy} (${violation.severity}, ${violation.confidence}% confidence)`;

                // Wrap the text node
                textNode.parentNode.insertBefore(wrapper, textNode);
                wrapper.appendChild(textNode);

                // Add click handler for AI violation details
                wrapper.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showAIViolationDetails(e, violation);
                });

                this.highlightedElements.push(wrapper);
            }
        });
    }

    getViolationColor(severity) {
        const colors = {
            low: '#4caf50',
            medium: '#ff9800',
            high: '#f44336'
        };
        return colors[severity] || '#ff9800';
    }

    showAIViolationDetails(event, violation) {
        // Remove existing AI violation details
        const existing = document.querySelector('.ai-violation-details');
        if (existing) {
            existing.remove();
        }

        const details = document.createElement('div');
        details.className = 'ai-violation-details';
        details.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: 300px;
            max-width: 400px;
            padding: 12px;
        `;

        details.innerHTML = `
            <div class="violation-header">
                <h4>AI Detected Violation</h4>
                <div class="violation-meta">
                    <span class="severity ${violation.severity}">${violation.severity}</span>
                    <span class="confidence">${violation.confidence}% confidence</span>
                </div>
            </div>
            <div class="violation-content">
                <p><strong>Policy:</strong> ${violation.policy}</p>
                <p><strong>Explanation:</strong> ${violation.explanation}</p>
                <p><strong>Violating Text:</strong> "${violation.violating_text}"</p>
            </div>
            <div class="violation-actions">
                <button class="btn btn-small btn-primary" onclick="this.closest('.ai-violation-details').remove()">
                    Close
                </button>
                <button class="btn btn-small btn-secondary" onclick="navigator.clipboard.writeText('${violation.explanation}')">
                    Copy Details
                </button>
            </div>
        `;

        event.target.appendChild(details);

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', () => details.remove(), { once: true });
        }, 100);
    }
}

// Initialize content moderator when page loads
console.log('Content script initialization starting...');
console.log('Document ready state:', document.readyState);
console.log('Current URL:', window.location.href);
console.log('Script loaded at:', new Date().toISOString());

// Function to initialize the content moderator
function initializeContentModerator() {
    try {
        console.log('Creating ContentModerator instance...');
        window.contentModerator = new ContentModerator();
        console.log('ContentModerator instance created and assigned to window.contentModerator');
        console.log('Content script fully initialized and ready');
        return true;
    } catch (error) {
        console.error('Error creating ContentModerator:', error);
        return false;
    }
}

// Try multiple initialization strategies
if (document.readyState === 'loading') {
    console.log('Document still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded fired, creating ContentModerator...');
        initializeContentModerator();
    });
} else if (document.readyState === 'interactive') {
    console.log('Document is interactive, creating ContentModerator...');
    initializeContentModerator();
} else {
    console.log('Document is complete, creating ContentModerator immediately...');
    initializeContentModerator();
}

// Fallback initialization after a short delay
setTimeout(() => {
    if (!window.contentModerator) {
        console.log('Fallback initialization: ContentModerator not found, trying again...');
        initializeContentModerator();
    }
}, 1000);

// Global test function for debugging
window.testContentScript = function() {
    console.log('=== Content Script Test ===');
    console.log('ContentModerator exists:', !!window.contentModerator);
    console.log('ContentModerator instance:', window.contentModerator);
    console.log('Document ready state:', document.readyState);
    console.log('Current URL:', window.location.href);
    console.log('Script loaded at:', new Date().toISOString());
    
    if (window.contentModerator) {
        console.log('ContentModerator isActive:', window.contentModerator.isActive);
        console.log('ContentModerator rules count:', window.contentModerator.rules.length);
        console.log('ContentModerator geminiAnalyzer:', !!window.contentModerator.geminiAnalyzer);
    }
    
    return {
        loaded: !!window.contentModerator,
        readyState: document.readyState,
        url: window.location.href,
        timestamp: new Date().toISOString()
    };
};
