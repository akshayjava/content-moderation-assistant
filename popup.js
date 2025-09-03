// Content Moderation Assistant - Popup Script
class ModerationPopup {
    constructor() {
        this.metrics = {
            itemsReviewed: 0,
            violationsFound: 0,
            totalTime: 0,
            startTime: Date.now()
        };
        
        this.timer = {
            isRunning: false,
            timeLeft: 25 * 60, // 25 minutes in seconds
            interval: null
        };
        
        this.imageFilterSettings = {
            enabled: false,
            grayscale: true,
            grayscaleLevel: 100,
            blur: true,
            blurLevel: 5,
            opacity: 0.8,
            applyToBackgroundImages: true,
            applyToVideoThumbnails: true,
            whitelistDomains: [],
            blacklistDomains: []
        };
        
        this.init();
    }

    async init() {
        console.log('Popup initialization started...');
        try {
            console.log('Loading settings...');
            await this.loadSettings();
            console.log('Settings loaded');
            
            console.log('Loading metrics...');
            await this.loadMetrics();
            console.log('Metrics loaded');
            
            console.log('Loading image filter settings...');
            await this.loadImageFilterSettings();
            console.log('Image filter settings loaded');
            
            console.log('Checking AI status...');
            await this.checkAIStatus();
            console.log('AI status checked');
            
            console.log('Checking image filter compatibility...');
            await this.checkImageFilterCompatibility();
            console.log('Image filter compatibility checked');
            
            console.log('Checking content script status...');
            await this.checkContentScriptStatus();
            console.log('Content script status checked');
            
            console.log('Setting up event listeners...');
            this.setupEventListeners();
            console.log('Event listeners set up');
            
            console.log('Updating UI...');
            this.updateUI();
            console.log('UI updated');
            
            console.log('Starting metrics tracking...');
            this.startMetricsTracking();
            console.log('Metrics tracking started');
            
            console.log('Starting metrics refresh...');
            this.startMetricsRefresh();
            console.log('Metrics refresh started');
            
            console.log('Popup initialization completed successfully');
        } catch (error) {
            console.error('Error during popup initialization:', error);
        }
        
        // Retry status checks after a delay to ensure they update
        setTimeout(() => {
            console.log('Retrying status checks...');
            this.checkAIStatus();
            this.checkContentScriptStatus();
            this.checkImageFilterCompatibility();
        }, 1000);
        
        // Add a simple test to verify popup is working
        setTimeout(() => {
            console.log('Popup test: Setting a simple status');
            const testElement = document.getElementById('aiStatus');
            if (testElement) {
                const testText = testElement.querySelector('.status-text');
                if (testText && testText.textContent === 'Checking...') {
                    testText.textContent = 'Popup working - retrying...';
                    console.log('Test status set successfully');
                }
            }
        }, 2000);
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Quick action buttons
        document.getElementById('flagBtn').addEventListener('click', () => this.performAction('flag'));
        document.getElementById('escalateBtn').addEventListener('click', () => this.performAction('escalate'));
        document.getElementById('blockBtn').addEventListener('click', () => this.performAction('block'));

        // Timer controls
        document.getElementById('startTimer').addEventListener('click', () => this.toggleTimer());
        document.getElementById('resetTimer').addEventListener('click', () => this.resetTimer());

        // Quick controls
        document.getElementById('toggleImageFilter').addEventListener('click', () => this.toggleImageFilter());
        document.getElementById('quickGrayscale').addEventListener('input', (e) => this.updateQuickGrayscale(e));

        // Settings
        const openSettingsBtn = document.getElementById('openSettings');
        console.log('Settings button element:', openSettingsBtn);
        if (openSettingsBtn) {
            // Test if button is clickable
            console.log('Button style:', window.getComputedStyle(openSettingsBtn));
            console.log('Button disabled:', openSettingsBtn.disabled);
            console.log('Button pointer-events:', window.getComputedStyle(openSettingsBtn).pointerEvents);
            
            openSettingsBtn.addEventListener('click', (e) => {
                console.log('Settings button clicked!', e);
                e.preventDefault();
                e.stopPropagation();
                this.openSettings();
            });
            console.log('Settings button event listener added');
            
            // Also try adding a mousedown event to test
            openSettingsBtn.addEventListener('mousedown', () => {
                console.log('Settings button mousedown detected');
            });
        } else {
            console.error('Settings button not found');
        }
        
        document.getElementById('openDashboard').addEventListener('click', () => this.openDashboard());
        document.getElementById('refreshMetrics').addEventListener('click', () => this.refreshMetrics());

        // Mindful moment
        document.getElementById('mindfulMoment').addEventListener('click', () => this.showMindfulMoment());
        
        // AI configuration
        document.getElementById('configureAI').addEventListener('click', () => this.openPolicyManager());
        
        // Content script reload
        document.getElementById('reloadContentScript').addEventListener('click', () => this.reloadContentScript());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    async performAction(action) {
        try {
            // Send message to content script
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                this.showNotification('No active tab found', 'error');
                return;
            }

            // Check if content scripts are supported on this page
            if (!(await this.isContentScriptSupported(tab))) {
                this.showNotification(`${action.charAt(0).toUpperCase() + action.slice(1)} action is not supported on this page. Please navigate to a regular webpage.`, 'error');
                return;
            }

            // Check if content script is actually loaded
            const isLoaded = await this.checkContentScriptLoaded(tab);
            if (!isLoaded) {
                this.showNotification('Content script not loaded. Please refresh the page and try again.', 'error');
                return;
            }

            let response;
            try {
                console.log('Sending message to tab:', tab.id, 'URL:', tab.url);
                response = await chrome.tabs.sendMessage(tab.id, {
                    action: action,
                    timestamp: Date.now()
                });
                console.log('Response received:', response);
            } catch (messageError) {
                console.error('Message error:', messageError);
                console.log('Tab URL:', tab.url);
                console.log('Tab ID:', tab.id);
                
                if (messageError.message.includes('receiving end does not exist') || 
                    messageError.message.includes('Could not establish connection')) {
                    this.showNotification('Content script not loaded. Please refresh the page and try again.', 'error');
                } else {
                    this.showNotification(`Failed to communicate with page: ${messageError.message}`, 'error');
                }
                return;
            }

            if (response && response.success) {
                // Send action to background script for proper tracking
                await chrome.runtime.sendMessage({
                    type: 'moderationAction',
                    data: {
                        action: action,
                        content: 'Manual action from popup',
                        url: tab.url,
                        timestamp: Date.now()
                    }
                });
                
                // Refresh metrics from background script
                await this.loadMetrics();
                this.updateMetricsDisplay();
                
                this.showNotification(`${action.charAt(0).toUpperCase() + action.slice(1)} action performed successfully`);
            } else {
                this.showNotification(`Failed to perform ${action} action`, 'error');
            }
        } catch (error) {
            console.error('Error performing action:', error);
            this.showNotification('Error performing action', 'error');
        }
    }

    // updateMetrics method removed - now using background script metrics

    updateMetricsDisplay() {
        // Calculate total actions
        const totalActions = (this.metrics.actions?.flag || 0) + 
                           (this.metrics.actions?.escalate || 0) + 
                           (this.metrics.actions?.block || 0);
        
        // Update the display elements
        document.getElementById('totalActions').textContent = totalActions;
        document.getElementById('flaggedCount').textContent = this.metrics.actions?.flag || 0;
        document.getElementById('escalatedCount').textContent = this.metrics.actions?.escalate || 0;
        document.getElementById('blockedCount').textContent = this.metrics.actions?.block || 0;
        
        console.log('Updated metrics display:', {
            totalActions,
            flagged: this.metrics.actions?.flag || 0,
            escalated: this.metrics.actions?.escalate || 0,
            blocked: this.metrics.actions?.block || 0
        });
    }

    toggleTimer() {
        if (this.timer.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        this.timer.isRunning = true;
        this.timer.interval = setInterval(() => {
            this.timer.timeLeft--;
            this.updateTimerDisplay();
            
            if (this.timer.timeLeft <= 0) {
                this.timerComplete();
            }
        }, 1000);

        document.getElementById('startTimer').textContent = 'Pause Timer';
        this.updateTimerDisplay();
    }

    pauseTimer() {
        this.timer.isRunning = false;
        clearInterval(this.timer.interval);
        document.getElementById('startTimer').textContent = 'Resume Timer';
    }

    resetTimer() {
        this.timer.isRunning = false;
        clearInterval(this.timer.interval);
        this.timer.timeLeft = 25 * 60; // Reset to 25 minutes
        document.getElementById('startTimer').textContent = 'Start Break Timer';
        this.updateTimerDisplay();
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timer.timeLeft / 60);
        const seconds = this.timer.timeLeft % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timerDisplay').textContent = display;
    }

    timerComplete() {
        this.timer.isRunning = false;
        clearInterval(this.timer.interval);
        
        // Show break notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Break Time!',
            message: 'Time for a well-being break. Take a moment to relax and recharge.'
        });

        // Show mindful moment
        this.showMindfulMoment();
        
        // Reset timer for next cycle
        this.timer.timeLeft = 5 * 60; // 5 minute break
        document.getElementById('startTimer').textContent = 'Start Break Timer';
    }

    async showMindfulMoment() {
        const mindfulMessages = [
            "Take three deep breaths and focus on the present moment.",
            "Look away from the screen and focus on something 20 feet away for 20 seconds.",
            "Stretch your arms above your head and take a deep breath.",
            "Think of three things you're grateful for today.",
            "Close your eyes and listen to the sounds around you for 10 seconds."
        ];

        const randomMessage = mindfulMessages[Math.floor(Math.random() * mindfulMessages.length)];
        
        // Show notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Mindful Moment',
            message: randomMessage
        });
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['moderationSettings']);
            if (result.moderationSettings) {
                // Apply settings if needed
                console.log('Settings loaded:', result.moderationSettings);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async loadMetrics() {
        try {
            console.log('Loading metrics from background script...');
            // Get metrics from background script
            const response = await chrome.runtime.sendMessage({ type: 'getMetrics' });
            console.log('Metrics response from background:', response);
            
            if (response) {
                this.metrics = {
                    itemsReviewed: response.itemsReviewed || 0,
                    violationsFound: response.violationsFound || 0,
                    totalTime: response.totalTime || 0,
                    startTime: response.startTime || Date.now(),
                    actions: response.actions || { flag: 0, escalate: 0, block: 0 }
                };
                console.log('Metrics loaded successfully:', this.metrics);
            } else {
                // Initialize with default values
                this.metrics = {
                    itemsReviewed: 0,
                    violationsFound: 0,
                    totalTime: 0,
                    startTime: Date.now(),
                    actions: { flag: 0, escalate: 0, block: 0 }
                };
                console.log('Using default metrics:', this.metrics);
            }
        } catch (error) {
            console.error('Error loading metrics:', error);
            // Fallback to default values
            this.metrics = {
                itemsReviewed: 0,
                violationsFound: 0,
                totalTime: 0,
                startTime: Date.now(),
                actions: { flag: 0, escalate: 0, block: 0 }
            };
        }
    }

    async saveMetrics() {
        try {
            // Save to the same location as background script
            const today = new Date().toDateString();
            const result = await chrome.storage.local.get(['dailyMetrics']);
            const dailyMetrics = result.dailyMetrics || {};
            
            dailyMetrics[today] = {
                itemsReviewed: this.metrics.itemsReviewed,
                violationsFound: this.metrics.violationsFound,
                totalTime: this.metrics.totalTime,
                startTime: this.metrics.startTime,
                actions: {
                    flag: 0,
                    escalate: 0,
                    block: 0
                }
            };
            
            await chrome.storage.local.set({ dailyMetrics });
        } catch (error) {
            console.error('Error saving metrics:', error);
        }
    }

    startMetricsTracking() {
        // Track time spent on current session
        setInterval(() => {
            this.metrics.totalTime = Date.now() - this.metrics.startTime;
            this.updateMetricsDisplay();
        }, 1000);
    }

    startMetricsRefresh() {
        // Refresh metrics every 5 seconds to stay in sync with background script
        setInterval(async () => {
            await this.loadMetrics();
            this.updateMetricsDisplay();
        }, 5000);
    }

    async refreshMetrics() {
        try {
            await this.loadMetrics();
            this.updateMetricsDisplay();
            this.showNotification('Metrics refreshed', 'success');
        } catch (error) {
            console.error('Error refreshing metrics:', error);
            this.showNotification('Error refreshing metrics', 'error');
        }
    }

    async loadImageFilterSettings() {
        try {
            const result = await chrome.storage.sync.get(['imageFilterSettings']);
            if (result.imageFilterSettings) {
                this.imageFilterSettings = { ...this.imageFilterSettings, ...result.imageFilterSettings };
            }
            
            // Update the quick grayscale slider
            const grayscaleSlider = document.getElementById('quickGrayscale');
            const grayscaleValue = document.getElementById('quickGrayscaleValue');
            if (grayscaleSlider && grayscaleValue) {
                grayscaleSlider.value = this.imageFilterSettings.grayscaleLevel || 100;
                grayscaleValue.textContent = (this.imageFilterSettings.grayscaleLevel || 100) + '%';
            }
        } catch (error) {
            console.error('Error loading image filter settings:', error);
        }
    }

    async checkAIStatus() {
        try {
            console.log('Checking AI status...');
            const result = await chrome.storage.sync.get(['geminiApiKey']);
            console.log('AI status result:', result);
            
            // Wait a bit for DOM to be ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const statusElement = document.getElementById('aiStatus');
            console.log('AI status element:', statusElement);
            
            if (!statusElement) {
                console.error('AI status element not found, retrying...');
                // Retry after a longer delay
                setTimeout(() => this.checkAIStatus(), 500);
                return;
            }
            
            const statusText = statusElement.querySelector('.status-text');
            console.log('AI status text element:', statusText);
            
            if (!statusText) {
                console.error('AI status text element not found');
                return;
            }
            
            if (result.geminiApiKey) {
                console.log('AI is configured');
                statusElement.className = 'status-indicator connected';
                statusText.textContent = 'Configured';
            } else {
                console.log('AI is not configured');
                statusElement.className = 'status-indicator';
                statusText.textContent = 'Not configured';
            }
        } catch (error) {
            console.error('Error checking AI status:', error);
            const statusElement = document.getElementById('aiStatus');
            if (statusElement) {
                const statusText = statusElement.querySelector('.status-text');
                if (statusText) {
                    statusElement.className = 'status-indicator error';
                    statusText.textContent = 'Error';
                }
            }
        }
    }

    openPolicyManager() {
        chrome.tabs.create({ url: chrome.runtime.getURL('policy-manager.html') });
    }

    async checkImageFilterCompatibility() {
        try {
            console.log('Checking image filter compatibility...');
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('Active tab:', tab);
            
            const statusElement = document.getElementById('imageFilterStatus');
            console.log('Image filter status element:', statusElement);
            
            if (!statusElement) {
                console.error('Image filter status element not found');
                return;
            }
            
            const statusText = statusElement.querySelector('.status-text');
            console.log('Image filter status text element:', statusText);
            
            if (!statusText) {
                console.error('Image filter status text element not found');
                return;
            }
            
            if (!tab) {
                console.log('No active tab found');
                statusElement.className = 'filter-status incompatible';
                statusText.textContent = 'No active tab';
                return;
            }

            const isSupported = await this.isContentScriptSupported(tab);
            console.log('Content script supported:', isSupported);
            
            if (isSupported) {
                console.log('Setting image filter status to compatible');
                statusElement.className = 'filter-status compatible';
                statusText.textContent = 'Image filtering available';
            } else {
                console.log('Setting image filter status to incompatible');
                statusElement.className = 'filter-status incompatible';
                statusText.textContent = 'Not supported on this page';
            }
        } catch (error) {
            console.error('Error checking image filter compatibility:', error);
            const statusElement = document.getElementById('imageFilterStatus');
            if (statusElement) {
                const statusText = statusElement.querySelector('.status-text');
                if (statusText) {
                    statusElement.className = 'filter-status incompatible';
                    statusText.textContent = 'Error checking compatibility';
                }
            }
        }
    }

    async isContentScriptSupported(tab) {
        // Check if the tab URL supports content scripts
        const unsupportedProtocols = ['chrome:', 'chrome-extension:', 'moz-extension:', 'edge:', 'about:', 'data:', 'file:'];
        const url = tab.url || tab.pendingUrl;
        
        if (!url) return false;
        
        return !unsupportedProtocols.some(protocol => url.startsWith(protocol));
    }

    async checkContentScriptLoaded(tab) {
        try {
            // Try to ping the content script to see if it's loaded
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
            return response && response.success;
        } catch (error) {
            console.log('Content script not loaded:', error.message);
            return false;
        }
    }

    async checkContentScriptStatus() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const statusElement = document.getElementById('contentScriptStatus');
            
            if (!statusElement) {
                console.error('Content script status element not found');
                return;
            }
            
            const statusText = statusElement.querySelector('.status-text');
            
            if (!statusText) {
                console.error('Content script status text element not found');
                return;
            }
            
            if (!tab) {
                statusElement.className = 'status-indicator error';
                statusText.textContent = 'No active tab';
                return;
            }

            if (!(await this.isContentScriptSupported(tab))) {
                statusElement.className = 'status-indicator error';
                statusText.textContent = 'Not supported on this page';
                return;
            }

            const isLoaded = await this.checkContentScriptLoaded(tab);
            if (isLoaded) {
                statusElement.className = 'status-indicator connected';
                statusText.textContent = 'Loaded and ready';
            } else {
                statusElement.className = 'status-indicator error';
                statusText.textContent = 'Not loaded - refresh page';
                
                // Try to get more detailed error information
                try {
                    const response = await chrome.tabs.sendMessage(tab.id, { action: 'test' });
                    console.log('Test response:', response);
                } catch (testError) {
                    console.log('Test message failed:', testError.message);
                    if (testError.message.includes('receiving end does not exist')) {
                        statusText.textContent = 'Script not injected - use Reload Script';
                    } else if (testError.message.includes('Could not establish connection')) {
                        statusText.textContent = 'Connection failed - refresh page';
                    }
                }
            }
        } catch (error) {
            console.error('Error checking content script status:', error);
            const statusElement = document.getElementById('contentScriptStatus');
            const statusText = statusElement.querySelector('.status-text');
            statusElement.className = 'status-indicator error';
            statusText.textContent = 'Error checking status';
        }
    }

    async reloadContentScript() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                this.showNotification('No active tab found', 'error');
                return;
            }

            if (!(await this.isContentScriptSupported(tab))) {
                this.showNotification('Content script is not supported on this page', 'error');
                return;
            }

            // Try to inject the content script manually first
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
                this.showNotification('Content script injected successfully', 'success');
            } catch (injectError) {
                console.log('Manual injection failed, reloading page:', injectError);
                // If manual injection fails, reload the tab
                await chrome.tabs.reload(tab.id);
                this.showNotification('Page reloaded to reload content script', 'success');
            }
            
            // Wait a moment and check status again
            setTimeout(() => {
                this.checkContentScriptStatus();
            }, 2000);
        } catch (error) {
            console.error('Error reloading content script:', error);
            this.showNotification('Error reloading content script', 'error');
        }
    }

    async updateQuickGrayscale(event) {
        try {
            console.log('updateQuickGrayscale called with value:', event.target.value);
            const grayscaleLevel = parseInt(event.target.value);
            const grayscaleValue = document.getElementById('quickGrayscaleValue');
            
            if (!grayscaleValue) {
                throw new Error('Grayscale value element not found');
            }
            
            grayscaleValue.textContent = grayscaleLevel + '%';
            console.log('Updated grayscale value display to:', grayscaleLevel + '%');

            // Update the image filter settings
            this.imageFilterSettings.grayscaleLevel = grayscaleLevel;
            console.log('Updated imageFilterSettings:', this.imageFilterSettings);
            await chrome.storage.sync.set({ imageFilterSettings: this.imageFilterSettings });
            console.log('Saved settings to storage');

            // Apply the change to the current page
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('Active tab:', tab);
            
            if (!tab) {
                throw new Error('No active tab found');
            }

            // Check if content scripts are supported on this page
            if (!(await this.isContentScriptSupported(tab))) {
                throw new Error('Image filtering is not supported on this page. Please navigate to a regular webpage.');
            }

            console.log('Sending message to content script...');
            let response;
            try {
                response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'updateImageFilterSettings',
                    settings: this.imageFilterSettings
                });
                console.log('Response from content script:', response);
            } catch (error) {
                console.log('Error sending message to content script:', error);
                if (error.message.includes('receiving end does not exist')) {
                    throw new Error('Content script not loaded on this page. Please refresh the page and try again.');
                } else {
                    throw new Error(`Failed to communicate with page: ${error.message}`);
                }
            }

            if (response && response.success) {
                this.showNotification(`Grayscale set to ${grayscaleLevel}%`, 'success');
            } else if (response && response.error) {
                if (response.error === 'Image filter not available') {
                    throw new Error('Image filter not loaded. Please refresh the page and try again.');
                } else {
                    throw new Error(response.error);
                }
            } else {
                throw new Error('No response from content script. Please refresh the page and try again.');
            }
        } catch (error) {
            console.error('Error updating grayscale:', error);
            this.showNotification(`Error updating grayscale: ${error.message}`, 'error');
        }
    }

    updateUI() {
        this.updateMetricsDisplay();
        this.updateTimerDisplay();
        this.updateToxicityScore();
    }

    async updateToxicityScore() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getToxicityScore' });
            
            if (response && response.score !== undefined) {
                const scoreElement = document.getElementById('toxicityScore');
                scoreElement.textContent = this.getToxicityLabel(response.score);
                scoreElement.className = `score-value ${this.getToxicityClass(response.score)}`;
            }
        } catch (error) {
            console.error('Error getting toxicity score:', error);
        }
    }

    getToxicityLabel(score) {
        if (score < 0.3) return 'Low';
        if (score < 0.7) return 'Medium';
        return 'High';
    }

    getToxicityClass(score) {
        if (score < 0.3) return '';
        if (score < 0.7) return 'medium';
        return 'high';
    }

    openSettings() {
        try {
            console.log('Opening settings page...');
            chrome.runtime.openOptionsPage();
            console.log('Settings page opened successfully');
        } catch (error) {
            console.error('Error opening settings page:', error);
            // Fallback: try opening in a new tab
            try {
                chrome.tabs.create({
                    url: chrome.runtime.getURL('options.html')
                });
                console.log('Settings page opened in new tab');
            } catch (fallbackError) {
                console.error('Error opening settings in new tab:', fallbackError);
                this.showNotification('Error opening settings page', 'error');
            }
        }
    }

    openDashboard() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('moderation-dashboard.html')
        });
    }

    async toggleImageFilter() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                this.showNotification('No active tab found', 'error');
                return;
            }

            // Check if content scripts are supported on this page
            if (!(await this.isContentScriptSupported(tab))) {
                this.showNotification('Image filtering is not supported on this page. Please navigate to a regular webpage.', 'error');
                return;
            }

            // Check if content script is loaded
            let response;
            try {
                response = await chrome.tabs.sendMessage(tab.id, { action: 'toggleImageFilter' });
            } catch (messageError) {
                console.error('Message error:', messageError);
                this.showNotification('Content script not loaded. Please refresh the page and try again.', 'error');
                return;
            }
            
            if (response && response.success) {
                const button = document.getElementById('toggleImageFilter');
                const icon = button.querySelector('.icon');
                if (response.enabled) {
                    icon.textContent = '🖼️';
                    button.title = 'Disable Image Filter';
                } else {
                    icon.textContent = '🖼️';
                    button.title = 'Enable Image Filter';
                }
                this.showNotification(
                    response.enabled ? 'Image filtering enabled' : 'Image filtering disabled', 
                    'success'
                );
            } else if (response && response.error) {
                this.showNotification(`Error: ${response.error}`, 'error');
            } else {
                this.showNotification('Unknown error occurred', 'error');
            }
        } catch (error) {
            console.error('Error toggling image filter:', error);
            this.showNotification('Error toggling image filter. Please try refreshing the page.', 'error');
        }
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey && e.shiftKey) {
            switch (e.key) {
                case 'F':
                    e.preventDefault();
                    this.performAction('flag');
                    break;
                case 'E':
                    e.preventDefault();
                    this.performAction('escalate');
                    break;
                case 'B':
                    e.preventDefault();
                    this.performAction('block');
                    break;
            }
        }
    }

    showNotification(message, type = 'success') {
        // Create a temporary notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
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

// Global function for onclick fallback
window.openSettings = function() {
    try {
        console.log('Global openSettings called');
        // Try multiple methods
        try {
            chrome.runtime.openOptionsPage();
            console.log('Used chrome.runtime.openOptionsPage()');
        } catch (e1) {
            console.log('chrome.runtime.openOptionsPage() failed, trying chrome.tabs.create()');
            chrome.tabs.create({
                url: chrome.runtime.getURL('options.html')
            });
        }
    } catch (error) {
        console.error('Error in global openSettings:', error);
        // Last resort: try to navigate directly
        try {
            window.location.href = chrome.runtime.getURL('options.html');
        } catch (e2) {
            console.error('All methods failed:', e2);
            alert('Error opening settings page. Please try right-clicking the extension icon and selecting "Options".');
        }
    }
};

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ModerationPopup();
});
