// Button Test Script for Content Moderation Extension
console.log('=== BUTTON TEST SCRIPT ===');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, starting button tests...');
    
    // List of all buttons to test
    const buttonsToTest = [
        'flagBtn',
        'escalateBtn', 
        'blockBtn',
        'startTimer',
        'resetTimer',
        'toggleImageFilter',
        'openSettings',
        'testButton',
        'openDashboard',
        'refreshMetrics',
        'mindfulMoment',
        'configureAI',
        'reloadContentScript'
    ];
    
    // Test each button
    buttonsToTest.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            console.log(`✅ Button found: ${buttonId}`);
            
            // Check if button is visible and enabled
            const style = window.getComputedStyle(button);
            const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
            const isEnabled = !button.disabled;
            
            console.log(`   - Visible: ${isVisible}`);
            console.log(`   - Enabled: ${isEnabled}`);
            console.log(`   - Pointer events: ${style.pointerEvents}`);
            
            // Test click event
            button.addEventListener('click', (e) => {
                console.log(`🎯 Button clicked: ${buttonId}`, e);
            });
            
        } else {
            console.error(`❌ Button not found: ${buttonId}`);
        }
    });
    
    // Test grayscale slider
    const grayscaleSlider = document.getElementById('quickGrayscale');
    if (grayscaleSlider) {
        console.log('✅ Grayscale slider found');
        grayscaleSlider.addEventListener('input', (e) => {
            console.log('🎯 Grayscale slider changed:', e.target.value);
        });
    } else {
        console.error('❌ Grayscale slider not found');
    }
    
    console.log('=== BUTTON TEST COMPLETED ===');
});

// Also run immediately if DOM is already ready
if (document.readyState !== 'loading') {
    console.log('DOM already ready, running button tests immediately');
    // Trigger the test
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);
}
