// Debug script to test popup functionality
console.log('=== POPUP DEBUG SCRIPT ===');

// Test 1: Check if DOM is ready
console.log('DOM ready state:', document.readyState);
console.log('Document body exists:', !!document.body);

// Test 2: Check if status elements exist
const aiStatus = document.getElementById('aiStatus');
const contentScriptStatus = document.getElementById('contentScriptStatus');
const imageFilterStatus = document.getElementById('imageFilterStatus');

console.log('AI Status element:', aiStatus);
console.log('Content Script Status element:', contentScriptStatus);
console.log('Image Filter Status element:', imageFilterStatus);

// Test 3: Check if we can update status elements
if (aiStatus) {
    const aiText = aiStatus.querySelector('.status-text');
    console.log('AI Status text element:', aiText);
    if (aiText) {
        aiText.textContent = 'Debug: Element found and updated';
        console.log('✅ AI Status element can be updated');
    }
}

if (contentScriptStatus) {
    const csText = contentScriptStatus.querySelector('.status-text');
    console.log('Content Script Status text element:', csText);
    if (csText) {
        csText.textContent = 'Debug: Element found and updated';
        console.log('✅ Content Script Status element can be updated');
    }
}

if (imageFilterStatus) {
    const ifText = imageFilterStatus.querySelector('.status-text');
    console.log('Image Filter Status text element:', ifText);
    if (ifText) {
        ifText.textContent = 'Debug: Element found and updated';
        console.log('✅ Image Filter Status element can be updated');
    }
}

// Test 4: Check Chrome APIs
console.log('Chrome runtime available:', !!chrome.runtime);
console.log('Chrome tabs available:', !!chrome.tabs);
console.log('Chrome storage available:', !!chrome.storage);

// Test 5: Try to get active tab
if (chrome.tabs) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        console.log('Active tab query result:', tabs);
        if (tabs && tabs[0]) {
            console.log('Current tab URL:', tabs[0].url);
            console.log('Current tab ID:', tabs[0].id);
        }
    });
}

// Test 6: Try to get storage
if (chrome.storage) {
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
        console.log('Storage sync result:', result);
    });
    
    chrome.storage.local.get(['dailyMetrics'], (result) => {
        console.log('Storage local result:', result);
    });
}

console.log('=== DEBUG SCRIPT COMPLETED ===');
