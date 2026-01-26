// ===================================
// THEME MANAGER - Dark/Light Mode Toggle
// ===================================

/**
 * Manages theme switching between dark and light modes
 * Persists user preference in localStorage
 */

const THEME_KEY = 'svr_theme_preference';
const DEFAULT_THEME = 'dark'; // App defaults to dark

/**
 * Initialize theme on page load
 */
function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
    setTheme(savedTheme, false); // false = don't save again
    console.log('✅ Theme initialized:', savedTheme);
}

/**
 * Set theme and update UI
 * @param {string} theme - 'dark' or 'light'
 * @param {boolean} save - Whether to save preference (default: true)
 */
function setTheme(theme, save = true) {
    // Validate theme
    if (theme !== 'dark' && theme !== 'light') {
        console.warn('Invalid theme:', theme, '- defaulting to dark');
        theme = DEFAULT_THEME;
    }

    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);

    // Save preference
    if (save) {
        localStorage.setItem(THEME_KEY, theme);
    }

    // Update toggle button icon
    updateThemeIcon(theme);

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
}

/**
 * Toggle between dark and light theme
 */
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
    const newTheme = current === 'dark' ? 'light' : 'dark';

    setTheme(newTheme);

    // Show notification
    showSuccessNotification(
        `Switched to ${newTheme === 'dark' ? '🌙 Dark' : '☀️ Light'} mode`
    );
}

/**
 * Update theme toggle button icon
 */
function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (!icon) return;

    if (theme === 'dark') {
        icon.textContent = '🌙';
        icon.setAttribute('title', 'Switch to Light Mode');
    } else {
        icon.textContent = '☀️';
        icon.setAttribute('title', 'Switch to Dark Mode');
    }
}

/**
 * Get current theme
 */
function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
}

/**
 * Check if dark mode is active
 */
function isDarkMode() {
    return getCurrentTheme() === 'dark';
}

/**
 * Detect system preference (optional enhancement)
 */
function detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

/**
 * Auto-detect and apply system theme (if no saved preference)
 */
function autoDetectTheme() {
    if (!localStorage.getItem(THEME_KEY)) {
        const systemTheme = detectSystemTheme();
        setTheme(systemTheme);
    }
}

/**
 * Listen for system theme changes
 */
function listenForSystemThemeChanges() {
    if (window.matchMedia) {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

        darkModeQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't set a preference
            if (!localStorage.getItem(THEME_KEY)) {
                const newTheme = e.matches ? 'dark' : 'light';
                setTheme(newTheme, false);
            }
        });
    }
}

// Initialize theme as soon as script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
} else {
    initTheme();
}

// Optional: Listen for system theme changes
// listenForSystemThemeChanges();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initTheme,
        setTheme,
        toggleTheme,
        getCurrentTheme,
        isDarkMode
    };
}
