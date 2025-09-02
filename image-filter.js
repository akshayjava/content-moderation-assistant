// Image Filter System for Content Moderation Assistant
class ImageFilter {
    constructor() {
        this.settings = {
            enabled: false,
            grayscale: true,
            blur: true,
            blurLevel: 5, // 0-20
            opacity: 0.8, // 0.1-1.0
            applyToBackgroundImages: true,
            applyToVideoThumbnails: true,
            whitelistDomains: [],
            blacklistDomains: []
        };
        
        this.filteredImages = new Set();
        this.observer = null;
        
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupMessageListener();
        
        if (this.settings.enabled) {
            this.startFiltering();
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['imageFilterSettings']);
            if (result.imageFilterSettings) {
                this.settings = { ...this.settings, ...result.imageFilterSettings };
            }
        } catch (error) {
            console.error('Error loading image filter settings:', error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({ imageFilterSettings: this.settings });
        } catch (error) {
            console.error('Error saving image filter settings:', error);
        }
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            try {
                switch (request.action) {
                    case 'toggleImageFilter':
                        this.toggleFiltering();
                        sendResponse({ success: true, enabled: this.settings.enabled });
                        break;
                    case 'updateImageFilterSettings':
                        this.updateSettings(request.settings);
                        sendResponse({ success: true });
                        break;
                    case 'getImageFilterSettings':
                        sendResponse({ settings: this.settings });
                        break;
                    case 'clearImageFilters':
                        this.clearAllFilters();
                        sendResponse({ success: true });
                        break;
                    default:
                        sendResponse({ success: false, error: 'Unknown action' });
                }
            } catch (error) {
                console.error('Error in image filter message handler:', error);
                sendResponse({ success: false, error: error.message });
            }
            return true; // Keep message channel open for async response
        });
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        
        if (this.settings.enabled) {
            this.startFiltering();
        } else {
            this.stopFiltering();
        }
    }

    toggleFiltering() {
        this.settings.enabled = !this.settings.enabled;
        this.saveSettings();
        
        if (this.settings.enabled) {
            this.startFiltering();
        } else {
            this.stopFiltering();
        }
    }

    startFiltering() {
        this.filterExistingImages();
        this.setupImageObserver();
        this.setupVideoObserver();
    }

    stopFiltering() {
        this.clearAllFilters();
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    filterExistingImages() {
        // Filter all existing images
        const images = document.querySelectorAll('img');
        images.forEach(img => this.filterImage(img));
        
        // Filter background images
        if (this.settings.applyToBackgroundImages) {
            this.filterBackgroundImages();
        }
    }

    filterImage(img) {
        if (this.shouldSkipImage(img)) return;
        
        const imageId = this.getImageId(img);
        if (this.filteredImages.has(imageId)) return;
        
        this.filteredImages.add(imageId);
        
        // Apply CSS filters
        const filterValue = this.buildFilterValue();
        img.style.filter = filterValue;
        img.style.transition = 'filter 0.3s ease';
        
        // Add hover effect to temporarily show original
        img.addEventListener('mouseenter', () => this.showOriginalImage(img));
        img.addEventListener('mouseleave', () => this.hideOriginalImage(img));
        
        // Add click to toggle (for moderation purposes)
        img.addEventListener('click', (e) => this.toggleImageFilter(e, img));
        
        // Add visual indicator
        this.addFilterIndicator(img);
    }

    shouldSkipImage(img) {
        // Skip if already filtered
        if (img.classList.contains('moderation-filtered')) return true;
        
        // Skip if in whitelist domain
        if (this.settings.whitelistDomains.length > 0) {
            const src = img.src || img.getAttribute('data-src') || '';
            const domain = new URL(src).hostname;
            if (this.settings.whitelistDomains.includes(domain)) return true;
        }
        
        // Skip if in blacklist domain (but this is handled by domain filtering)
        if (this.settings.blacklistDomains.length > 0) {
            const src = img.src || img.getAttribute('data-src') || '';
            const domain = new URL(src).hostname;
            if (this.settings.blacklistDomains.includes(domain)) return false;
        }
        
        // Skip very small images (likely icons)
        if (img.naturalWidth < 50 || img.naturalHeight < 50) return true;
        
        // Skip if image is already hidden
        if (img.style.display === 'none' || img.offsetParent === null) return true;
        
        return false;
    }

    buildFilterValue() {
        let filters = [];
        
        if (this.settings.grayscale) {
            filters.push('grayscale(100%)');
        }
        
        if (this.settings.blur && this.settings.blurLevel > 0) {
            filters.push(`blur(${this.settings.blurLevel}px)`);
        }
        
        if (this.settings.opacity < 1.0) {
            filters.push(`opacity(${this.settings.opacity})`);
        }
        
        return filters.join(' ');
    }

    showOriginalImage(img) {
        if (img.dataset.originalFilter) {
            img.style.filter = img.dataset.originalFilter;
        }
    }

    hideOriginalImage(img) {
        if (img.dataset.originalFilter) {
            img.style.filter = this.buildFilterValue();
        }
    }

    toggleImageFilter(event, img) {
        event.preventDefault();
        event.stopPropagation();
        
        if (img.classList.contains('moderation-filtered')) {
            // Temporarily show original
            img.style.filter = 'none';
            img.classList.add('moderation-temp-unfiltered');
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                if (img.classList.contains('moderation-temp-unfiltered')) {
                    img.style.filter = this.buildFilterValue();
                    img.classList.remove('moderation-temp-unfiltered');
                }
            }, 3000);
        }
    }

    addFilterIndicator(img) {
        img.classList.add('moderation-filtered');
        
        // Add a small indicator
        const indicator = document.createElement('div');
        indicator.className = 'moderation-image-indicator';
        indicator.innerHTML = '👁️';
        indicator.title = 'Click to temporarily view original image';
        indicator.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 10px;
            cursor: pointer;
            z-index: 1000;
            pointer-events: none;
        `;
        
        // Make img container relative if it isn't already
        const container = img.parentElement;
        if (container && getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }
        
        container.appendChild(indicator);
    }

    filterBackgroundImages() {
        const elements = document.querySelectorAll('*');
        elements.forEach(element => {
            const bgImage = getComputedStyle(element).backgroundImage;
            if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) {
                this.filterBackgroundElement(element);
            }
        });
    }

    filterBackgroundElement(element) {
        if (element.classList.contains('moderation-bg-filtered')) return;
        
        element.classList.add('moderation-bg-filtered');
        const filterValue = this.buildFilterValue();
        element.style.filter = filterValue;
        element.style.transition = 'filter 0.3s ease';
    }

    setupImageObserver() {
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check for new images
                        if (node.tagName === 'IMG') {
                            this.filterImage(node);
                        }
                        
                        // Check for images within added nodes
                        const images = node.querySelectorAll && node.querySelectorAll('img');
                        if (images) {
                            images.forEach(img => this.filterImage(img));
                        }
                    }
                });
            });
        });
        
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    setupVideoObserver() {
        if (!this.settings.applyToVideoThumbnails) return;
        
        const videoObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'VIDEO') {
                            this.filterVideoThumbnail(node);
                        }
                        
                        const videos = node.querySelectorAll && node.querySelectorAll('video');
                        if (videos) {
                            videos.forEach(video => this.filterVideoThumbnail(video));
                        }
                    }
                });
            });
        });
        
        videoObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    filterVideoThumbnail(video) {
        if (video.classList.contains('moderation-video-filtered')) return;
        
        video.classList.add('moderation-video-filtered');
        const filterValue = this.buildFilterValue();
        video.style.filter = filterValue;
        video.style.transition = 'filter 0.3s ease';
    }

    clearAllFilters() {
        // Clear image filters
        const filteredImages = document.querySelectorAll('.moderation-filtered');
        filteredImages.forEach(img => {
            img.style.filter = '';
            img.classList.remove('moderation-filtered', 'moderation-temp-unfiltered');
        });
        
        // Clear background filters
        const bgFiltered = document.querySelectorAll('.moderation-bg-filtered');
        bgFiltered.forEach(element => {
            element.style.filter = '';
            element.classList.remove('moderation-bg-filtered');
        });
        
        // Clear video filters
        const videoFiltered = document.querySelectorAll('.moderation-video-filtered');
        videoFiltered.forEach(video => {
            video.style.filter = '';
            video.classList.remove('moderation-video-filtered');
        });
        
        // Remove indicators
        const indicators = document.querySelectorAll('.moderation-image-indicator');
        indicators.forEach(indicator => indicator.remove());
        
        this.filteredImages.clear();
    }

    getImageId(img) {
        return img.src || img.getAttribute('data-src') || img.outerHTML;
    }

    // Utility methods for settings
    addWhitelistDomain(domain) {
        if (!this.settings.whitelistDomains.includes(domain)) {
            this.settings.whitelistDomains.push(domain);
            this.saveSettings();
        }
    }

    removeWhitelistDomain(domain) {
        this.settings.whitelistDomains = this.settings.whitelistDomains.filter(d => d !== domain);
        this.saveSettings();
    }

    addBlacklistDomain(domain) {
        if (!this.settings.blacklistDomains.includes(domain)) {
            this.settings.blacklistDomains.push(domain);
            this.saveSettings();
        }
    }

    removeBlacklistDomain(domain) {
        this.settings.blacklistDomains = this.settings.blacklistDomains.filter(d => d !== domain);
        this.saveSettings();
    }

    getFilterStats() {
        return {
            filteredImages: this.filteredImages.size,
            enabled: this.settings.enabled,
            settings: this.settings
        };
    }
}

// Initialize image filter when DOM is loaded
let imageFilter;

function initializeImageFilter() {
    try {
        if (!imageFilter) {
            imageFilter = new ImageFilter();
            console.log('Image filter initialized successfully');
        }
    } catch (error) {
        console.error('Error initializing image filter:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeImageFilter);
} else {
    // DOM already loaded, initialize immediately
    initializeImageFilter();
}

// Also initialize on window load as a fallback
window.addEventListener('load', () => {
    if (!imageFilter) {
        initializeImageFilter();
    }
});
