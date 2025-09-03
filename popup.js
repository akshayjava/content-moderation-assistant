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
        await this.loadSettings();
        await this.loadMetrics();
        await this.loadImageFilterSettings();
        await this.checkAIStatus();
        await this.checkImageFilterCompatibility();
        this.setupEventListeners();
        this.updateUI();
        this.startMetricsTracking();
        this.startMetricsRefresh();
    }

    setupEventListeners() {
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
        document.getElementById('openSettings').addEventListener('click', () => this.openSettings());
        document.getElementById('openDashboard').addEventListener('click', () => this.openDashboard());
        document.getElementById('refreshMetrics').addEventListener('click', () => this.refreshMetrics());

        // Mindful moment
        document.getElementById('mindfulMoment').addEventListener('click', () => this.showMindfulMoment());
        
        // AI configuration
        document.getElementById('configureAI').addEventListener('click', () => this.openPolicyManager());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    async performAction(action) {
        try {
            // Send message to content script
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: action,
                timestamp: Date.now()
            });

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
        document.getElementById('itemsReviewed').textContent = this.metrics.itemsReviewed;
        document.getElementById('violationsFound').textContent = this.metrics.violationsFound;
        
        const avgTime = this.metrics.itemsReviewed > 0 
            ? Math.round(this.metrics.totalTime / this.metrics.itemsReviewed / 1000 / 60)
            : 0;
        document.getElementById('avgTime').textContent = `${avgTime}m`;
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
            // Get today's metrics from background script
            const today = new Date().toDateString();
            const result = await chrome.storage.local.get(['dailyMetrics']);
            
            if (result.dailyMetrics && result.dailyMetrics[today]) {
                const todayMetrics = result.dailyMetrics[today];
                this.metrics = {
                    itemsReviewed: todayMetrics.itemsReviewed || 0,
                    violationsFound: todayMetrics.violationsFound || 0,
                    totalTime: todayMetrics.totalTime || 0,
                    startTime: todayMetrics.startTime || Date.now()
                };
            } else {
                // Initialize with default values
                this.metrics = {
                    itemsReviewed: 0,
                    violationsFound: 0,
                    totalTime: 0,
                    startTime: Date.now()
                };
            }
        } catch (error) {
            console.error('Error loading metrics:', error);
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
            const result = await chrome.storage.sync.get(['geminiApiKey']);
            const statusElement = document.getElementById('aiStatus');
            const statusText = statusElement.querySelector('.status-text');
            
            if (result.geminiApiKey) {
                statusElement.className = 'status-indicator connected';
                statusText.textContent = 'Configured';
            } else {
                statusElement.className = 'status-indicator';
                statusText.textContent = 'Not configured';
            }
        } catch (error) {
            console.error('Error checking AI status:', error);
            const statusElement = document.getElementById('aiStatus');
            const statusText = statusElement.querySelector('.status-text');
            statusElement.className = 'status-indicator error';
            statusText.textContent = 'Error';
        }
    }

    openPolicyManager() {
        chrome.tabs.create({ url: chrome.runtime.getURL('policy-manager.html') });
    }

    async checkImageFilterCompatibility() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const statusElement = document.getElementById('imageFilterStatus');
            const statusText = statusElement.querySelector('.status-text');
            
            if (!tab) {
                statusElement.className = 'filter-status incompatible';
                statusText.textContent = 'No active tab';
                return;
            }

            if (await this.isContentScriptSupported(tab)) {
                statusElement.className = 'filter-status compatible';
                statusText.textContent = 'Image filtering available';
            } else {
                statusElement.className = 'filter-status incompatible';
                statusText.textContent = 'Not supported on this page';
            }
        } catch (error) {
            console.error('Error checking image filter compatibility:', error);
            const statusElement = document.getElementById('imageFilterStatus');
            const statusText = statusElement.querySelector('.status-text');
            statusElement.className = 'filter-status incompatible';
            statusText.textContent = 'Error checking compatibility';
        }
    }

    async isContentScriptSupported(tab) {
        // Check if the tab URL supports content scripts
        const unsupportedProtocols = ['chrome:', 'chrome-extension:', 'moz-extension:', 'edge:', 'about:', 'data:', 'file:'];
        const url = tab.url || tab.pendingUrl;
        
        if (!url) return false;
        
        return !unsupportedProtocols.some(protocol => url.startsWith(protocol));
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
        chrome.runtime.openOptionsPage();
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

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ModerationPopup();
});
