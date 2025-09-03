// Moderation Dashboard - View and manage all moderation actions
class ModerationDashboard {
    constructor() {
        this.actions = [];
        this.filteredActions = [];
        this.selectedActions = new Set();
        this.filters = {
            action: 'all',
            severity: 'all',
            date: 'all',
            search: ''
        };
        
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.renderStats();
        this.renderActions();
        this.renderDailyMetrics();
    }

    setupEventListeners() {
        // Header actions
        document.getElementById('refreshData').addEventListener('click', () => this.refreshData());
        document.getElementById('exportData').addEventListener('click', () => this.exportAllData());
        document.getElementById('clearData').addEventListener('click', () => this.clearAllData());

        // Filters
        document.getElementById('actionFilter').addEventListener('change', (e) => {
            this.filters.action = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('severityFilter').addEventListener('change', (e) => {
            this.filters.severity = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('dateFilter').addEventListener('change', (e) => {
            this.filters.date = e.target.value;
            this.applyFilters();
        });
        
        document.getElementById('searchFilter').addEventListener('input', (e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Action controls
        document.getElementById('selectAll').addEventListener('click', () => this.selectAll());
        document.getElementById('bulkDelete').addEventListener('click', () => this.bulkDelete());
        
        // Action buttons (using event delegation to avoid CSP issues)
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action]')) {
                const action = e.target.getAttribute('data-action');
                const actionId = e.target.getAttribute('data-id');
                
                switch (action) {
                    case 'view':
                        this.viewAction(actionId);
                        break;
                    case 'copy':
                        this.copyAction(actionId);
                        break;
                    case 'delete':
                        this.deleteAction(actionId);
                        break;
                }
            }
        });

        // Modal events
        document.getElementById('closeModal').addEventListener('click', () => this.hideModal());
        document.querySelector('.modal-close').addEventListener('click', () => this.hideModal());
        document.getElementById('copyAction').addEventListener('click', () => this.copyActionDetails());
        document.getElementById('exportAction').addEventListener('click', () => this.exportActionDetails());

        // Close modal on outside click
        document.getElementById('actionModal').addEventListener('click', (e) => {
            if (e.target.id === 'actionModal') {
                this.hideModal();
            }
        });
    }

    async loadData() {
        try {
            console.log('Loading moderation data...');
            
            // Load moderation logs
            const logsResult = await chrome.storage.local.get(['moderationLogs']);
            console.log('Raw logs result:', logsResult);
            this.actions = logsResult.moderationLogs || [];
            console.log('Loaded actions:', this.actions);

            // Load daily metrics
            const metricsResult = await chrome.storage.local.get(['dailyMetrics']);
            console.log('Raw metrics result:', metricsResult);
            this.dailyMetrics = metricsResult.dailyMetrics || {};

            console.log(`Loaded ${this.actions.length} moderation actions`);
            console.log('Actions with IDs:', this.actions.map(a => ({ id: a.id, action: a.action })));
        } catch (error) {
            console.error('Error loading data:', error);
            this.actions = [];
            this.dailyMetrics = {};
        }
    }

    async refreshData() {
        await this.loadData();
        this.renderStats();
        this.renderActions();
        this.renderDailyMetrics();
        this.showNotification('Data refreshed successfully!', 'success');
    }

    renderStats() {
        const stats = this.calculateStats();
        
        document.getElementById('totalActions').textContent = stats.total;
        document.getElementById('flaggedCount').textContent = stats.flag;
        document.getElementById('escalatedCount').textContent = stats.escalate;
        document.getElementById('blockedCount').textContent = stats.block;
    }

    calculateStats() {
        const stats = { total: 0, flag: 0, escalate: 0, block: 0 };
        
        this.actions.forEach(action => {
            stats.total++;
            if (stats[action.action] !== undefined) {
                stats[action.action]++;
            }
        });
        
        return stats;
    }

    applyFilters() {
        this.filteredActions = this.actions.filter(action => {
            // Action type filter
            if (this.filters.action !== 'all' && action.action !== this.filters.action) {
                return false;
            }

            // Severity filter
            if (this.filters.severity !== 'all' && action.rule?.severity !== this.filters.severity) {
                return false;
            }

            // Date filter
            if (this.filters.date !== 'all') {
                const actionDate = new Date(action.timestamp);
                const now = new Date();
                
                switch (this.filters.date) {
                    case 'today':
                        if (actionDate.toDateString() !== now.toDateString()) return false;
                        break;
                    case 'week':
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        if (actionDate < weekAgo) return false;
                        break;
                    case 'month':
                        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        if (actionDate < monthAgo) return false;
                        break;
                }
            }

            // Search filter
            if (this.filters.search) {
                const searchText = this.filters.search;
                const content = action.content?.toLowerCase() || '';
                const url = action.url?.toLowerCase() || '';
                const ruleName = action.rule?.name?.toLowerCase() || '';
                
                if (!content.includes(searchText) && !url.includes(searchText) && !ruleName.includes(searchText)) {
                    return false;
                }
            }

            return true;
        });

        this.renderActions();
    }

    renderActions() {
        const actionsList = document.getElementById('actionsList');
        const showingCount = document.getElementById('showingCount');
        const totalCount = document.getElementById('totalCount');

        showingCount.textContent = this.filteredActions.length;
        totalCount.textContent = this.actions.length;

        if (this.filteredActions.length === 0) {
            actionsList.innerHTML = `
                <div class="no-actions">
                    <p>No moderation actions found matching your filters.</p>
                    <p>Try adjusting your filters or perform some moderation actions.</p>
                </div>
            `;
            return;
        }

        actionsList.innerHTML = this.filteredActions.map(action => this.createActionElement(action)).join('');
    }

    createActionElement(action) {
        const date = new Date(action.timestamp);
        const timeAgo = this.getTimeAgo(date);
        
        return `
            <div class="action-item" data-action-id="${action.id}">
                <div class="action-header">
                    <div class="action-info">
                        <div class="action-type ${action.action}">${action.action}</div>
                        <div class="action-title">${action.rule?.name || 'Manual Action'}</div>
                        <div class="action-meta">
                            ${timeAgo} • ${action.url ? new URL(action.url).hostname : 'Unknown site'}
                            ${action.rule?.severity ? ` • ${action.rule.severity} severity` : ''}
                        </div>
                    </div>
                    <input type="checkbox" class="action-checkbox" data-action-id="${action.id}">
                </div>
                
                <div class="action-content" data-action-id="${action.id}">
                    ${this.escapeHtml(action.content || 'No content available')}
                </div>
                
                ${action.url ? `<a href="${action.url}" target="_blank" class="action-url">${action.url}</a>` : ''}
                
                <div class="action-actions">
                    <button class="btn btn-small btn-primary" data-action="view" data-id="${action.id}">
                        View Details
                    </button>
                    <button class="btn btn-small btn-secondary" data-action="copy" data-id="${action.id}">
                        Copy
                    </button>
                    <button class="btn btn-small btn-danger" data-action="delete" data-id="${action.id}">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    viewAction(actionId) {
        const action = this.actions.find(a => a.id === actionId);
        if (!action) return;

        const modal = document.getElementById('actionModal');
        const title = document.getElementById('modalTitle');
        const details = document.getElementById('actionDetails');

        title.textContent = `${action.action.charAt(0).toUpperCase() + action.action.slice(1)} Action Details`;
        
        details.innerHTML = `
            <div class="action-detail-section">
                <h4>Basic Information</h4>
                <p><strong>Action:</strong> ${action.action}</p>
                <p><strong>Timestamp:</strong> ${new Date(action.timestamp).toLocaleString()}</p>
                <p><strong>Rule:</strong> ${action.rule?.name || 'Manual'}</p>
                <p><strong>Severity:</strong> ${action.rule?.severity || 'Unknown'}</p>
            </div>
            
            <div class="action-detail-section">
                <h4>Content</h4>
                <div class="content-preview">${this.escapeHtml(action.content || 'No content available')}</div>
            </div>
            
            <div class="action-detail-section">
                <h4>Page Information</h4>
                <p><strong>URL:</strong> <a href="${action.url}" target="_blank">${action.url}</a></p>
                <p><strong>Tab ID:</strong> ${action.tabId || 'Unknown'}</p>
            </div>
            
            <div class="action-detail-section">
                <h4>Raw Data</h4>
                <pre class="raw-data">${JSON.stringify(action, null, 2)}</pre>
            </div>
        `;

        modal.style.display = 'block';
        this.currentAction = action;
    }

    async copyAction(actionId) {
        const action = this.actions.find(a => a.id === actionId);
        if (!action) return;

        const report = this.formatActionReport(action);
        await navigator.clipboard.writeText(report);
        this.showNotification('Action details copied to clipboard!', 'success');
    }

    async copyActionDetails() {
        if (!this.currentAction) return;
        await this.copyAction(this.currentAction.id);
    }

    async exportActionDetails() {
        if (!this.currentAction) return;
        
        const report = this.formatActionReport(this.currentAction);
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `moderation-action-${this.currentAction.id}.txt`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Action exported successfully!', 'success');
    }

    formatActionReport(action) {
        return `MODERATION ACTION REPORT

ID: ${action.id}
Action: ${action.action}
Timestamp: ${new Date(action.timestamp).toLocaleString()}
Rule: ${action.rule?.name || 'Manual'}
Severity: ${action.rule?.severity || 'Unknown'}

CONTENT:
${action.content || 'No content available'}

PAGE INFORMATION:
URL: ${action.url || 'Unknown'}
Tab ID: ${action.tabId || 'Unknown'}

FULL DATA:
${JSON.stringify(action, null, 2)}

---
Generated by Content Moderation Assistant Dashboard
`;
    }

    async deleteAction(actionId) {
        try {
            console.log('Deleting action with ID:', actionId);
            console.log('Current actions count:', this.actions.length);
            
            if (!confirm('Are you sure you want to delete this action?')) {
                console.log('Deletion cancelled by user');
                return;
            }

            const originalCount = this.actions.length;
            this.actions = this.actions.filter(a => a.id !== actionId);
            const newCount = this.actions.length;
            
            console.log('Actions before deletion:', originalCount);
            console.log('Actions after deletion:', newCount);
            
            if (originalCount === newCount) {
                console.error('No action was deleted - action ID not found:', actionId);
                this.showNotification('Error: Action not found', 'error');
                return;
            }
            
            await this.saveActions();
            console.log('Actions saved successfully');
            
            this.renderStats();
            this.applyFilters();
            this.showNotification('Action deleted successfully!', 'success');
            console.log('Deletion completed successfully');
        } catch (error) {
            console.error('Error deleting action:', error);
            this.showNotification('Error deleting action: ' + error.message, 'error');
        }
    }

    selectAll() {
        const checkboxes = document.querySelectorAll('.action-checkbox');
        const allSelected = Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(cb => {
            cb.checked = !allSelected;
            const actionId = cb.dataset.actionId;
            if (cb.checked) {
                this.selectedActions.add(actionId);
            } else {
                this.selectedActions.delete(actionId);
            }
        });

        this.updateSelectedActions();
    }

    updateSelectedActions() {
        const actionItems = document.querySelectorAll('.action-item');
        actionItems.forEach(item => {
            const actionId = item.dataset.actionId;
            if (this.selectedActions.has(actionId)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    async bulkDelete() {
        if (this.selectedActions.size === 0) {
            this.showNotification('No actions selected for deletion', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete ${this.selectedActions.size} selected actions?`)) return;

        this.actions = this.actions.filter(a => !this.selectedActions.has(a.id));
        this.selectedActions.clear();
        
        await this.saveActions();
        this.renderStats();
        this.applyFilters();
        this.showNotification(`${this.selectedActions.size} actions deleted successfully!`, 'success');
    }

    async exportAllData() {
        const data = {
            actions: this.actions,
            dailyMetrics: this.dailyMetrics,
            exportDate: new Date().toISOString(),
            totalActions: this.actions.length
        };

        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `moderation-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('All data exported successfully!', 'success');
    }

    async clearAllData() {
        if (!confirm('Are you sure you want to clear ALL moderation data? This action cannot be undone.')) return;

        try {
            await chrome.storage.local.remove(['moderationLogs', 'dailyMetrics']);
            this.actions = [];
            this.dailyMetrics = {};
            this.selectedActions.clear();
            
            this.renderStats();
            this.renderActions();
            this.renderDailyMetrics();
            
            this.showNotification('All data cleared successfully!', 'success');
        } catch (error) {
            console.error('Error clearing data:', error);
            this.showNotification('Error clearing data', 'error');
        }
    }

    async saveActions() {
        try {
            console.log('Saving actions to storage:', this.actions.length, 'actions');
            await chrome.storage.local.set({ moderationLogs: this.actions });
            console.log('Actions saved successfully to storage');
        } catch (error) {
            console.error('Error saving actions:', error);
            throw error; // Re-throw to let caller handle it
        }
    }

    renderDailyMetrics() {
        const metricsContainer = document.getElementById('dailyMetrics');
        
        if (Object.keys(this.dailyMetrics).length === 0) {
            metricsContainer.innerHTML = '<p>No daily metrics available yet.</p>';
            return;
        }

        const sortedDays = Object.keys(this.dailyMetrics).sort((a, b) => new Date(b) - new Date(a));
        
        metricsContainer.innerHTML = sortedDays.slice(0, 7).map(day => {
            const metrics = this.dailyMetrics[day];
            return `
                <div class="metric-day">
                    <div class="metric-date">${new Date(day).toLocaleDateString()}</div>
                    <div class="metric-stats">
                        <span class="metric-stat">Reviewed: ${metrics.itemsReviewed || 0}</span>
                        <span class="metric-stat">Violations: ${metrics.violationsFound || 0}</span>
                        <span class="metric-stat">Flagged: ${metrics.actions?.flag || 0}</span>
                        <span class="metric-stat">Escalated: ${metrics.actions?.escalate || 0}</span>
                        <span class="metric-stat">Blocked: ${metrics.actions?.block || 0}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    hideModal() {
        document.getElementById('actionModal').style.display = 'none';
        this.currentAction = null;
    }

    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

// Initialize dashboard when DOM is loaded
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new ModerationDashboard();
});
