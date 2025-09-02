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
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        await this.loadMetrics();
        this.setupEventListeners();
        this.updateUI();
        this.startMetricsTracking();
    }

    setupEventListeners() {
        // Quick action buttons
        document.getElementById('flagBtn').addEventListener('click', () => this.performAction('flag'));
        document.getElementById('escalateBtn').addEventListener('click', () => this.performAction('escalate'));
        document.getElementById('blockBtn').addEventListener('click', () => this.performAction('block'));

        // Timer controls
        document.getElementById('startTimer').addEventListener('click', () => this.toggleTimer());
        document.getElementById('resetTimer').addEventListener('click', () => this.resetTimer());

        // Settings
        document.getElementById('openSettings').addEventListener('click', () => this.openSettings());
        document.getElementById('openDashboard').addEventListener('click', () => this.openDashboard());
        document.getElementById('toggleImageFilter').addEventListener('click', () => this.toggleImageFilter());

        // Mindful moment
        document.getElementById('mindfulMoment').addEventListener('click', () => this.showMindfulMoment());

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
                this.updateMetrics(action);
                this.showNotification(`${action.charAt(0).toUpperCase() + action.slice(1)} action performed successfully`);
            } else {
                this.showNotification(`Failed to perform ${action} action`, 'error');
            }
        } catch (error) {
            console.error('Error performing action:', error);
            this.showNotification('Error performing action', 'error');
        }
    }

    updateMetrics(action) {
        this.metrics.itemsReviewed++;
        
        if (action === 'flag' || action === 'escalate' || action === 'block') {
            this.metrics.violationsFound++;
        }

        this.saveMetrics();
        this.updateMetricsDisplay();
    }

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
            const result = await chrome.storage.local.get(['moderationMetrics']);
            if (result.moderationMetrics) {
                this.metrics = { ...this.metrics, ...result.moderationMetrics };
            }
        } catch (error) {
            console.error('Error loading metrics:', error);
        }
    }

    async saveMetrics() {
        try {
            await chrome.storage.local.set({ moderationMetrics: this.metrics });
        } catch (error) {
            console.error('Error saving metrics:', error);
        }
    }

    startMetricsTracking() {
        // Track time spent on current session
        setInterval(() => {
            this.metrics.totalTime = Date.now() - this.metrics.startTime;
        }, 1000);
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
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggleImageFilter' });
            
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
            }
        } catch (error) {
            console.error('Error toggling image filter:', error);
            this.showNotification('Error toggling image filter', 'error');
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
