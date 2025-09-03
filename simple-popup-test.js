// Simple popup test to verify basic functionality
console.log('=== SIMPLE POPUP TEST ===');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - starting simple test');
    
    // Simple status update test
    setTimeout(() => {
        console.log('Running simple status update test...');
        
        // Test AI Status
        const aiStatus = document.getElementById('aiStatus');
        if (aiStatus) {
            const aiText = aiStatus.querySelector('.status-text');
            if (aiText) {
                aiText.textContent = 'Simple test: Working';
                console.log('✅ AI Status updated successfully');
            }
        }
        
        // Test Content Script Status
        const csStatus = document.getElementById('contentScriptStatus');
        if (csStatus) {
            const csText = csStatus.querySelector('.status-text');
            if (csText) {
                csText.textContent = 'Simple test: Working';
                console.log('✅ Content Script Status updated successfully');
            }
        }
        
        // Test Image Filter Status
        const ifStatus = document.getElementById('imageFilterStatus');
        if (ifStatus) {
            const ifText = ifStatus.querySelector('.status-text');
            if (ifText) {
                ifText.textContent = 'Simple test: Working';
                console.log('✅ Image Filter Status updated successfully');
            }
        }
        
        console.log('Simple test completed');
    }, 1000);
});

console.log('Simple popup test script loaded');
