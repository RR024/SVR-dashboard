// ===================================
// ERROR HANDLER UTILITY
// ===================================

/**
 * Global error handling system for SVR Dashboard
 * Provides centralized error handling, logging, and user notifications
 */

// Custom Error Types
class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

class StorageError extends Error {
    constructor(message) {
        super(message);
        this.name = 'StorageError';
    }
}

class DataError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DataError';
    }
}

// Error notification queue to prevent spam
let notificationTimeout = null;
let errorQueue = [];

/**
 * Main error handler - handles all errors uniformly
 * @param {Error} error - The error object
 * @param {string} context - Where the error occurred
 * @param {Object} options - Additional options
 */
function handleError(error, context = 'Unknown', options = {}) {
    const {
        showNotification = true,
        logToConsole = true,
        critical = false
    } = options;

    // Log error
    if (logToConsole) {
        logError(error, context);
    }

    // Show notification to user
    if (showNotification) {
        const userMessage = getUserFriendlyMessage(error, context);
        showErrorNotification(userMessage, critical ? 'critical' : 'error');
    }

    // Attempt recovery for known error types
    if (error instanceof StorageError) {
        recoverFromStorageError(error);
    }

    return {
        success: false,
        error: error.message,
        type: error.name
    };
}

/**
 * Log error details to console with timestamp
 */
function logError(error, context) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Error in ${context}:`);
    console.error('Message:', error.message);
    console.error('Type:', error.name);
    console.error('Stack:', error.stack);
}

/**
 * Convert technical error to user-friendly message
 */
function getUserFriendlyMessage(error, context) {
    // Storage quota errors
    if (error.message.includes('quota') || error.message.includes('QuotaExceededError')) {
        return '💾 Storage is full! Please export your data and clear old records.';
    }

    // Validation errors
    if (error instanceof ValidationError) {
        return `❌ ${error.message}`;
    }

    // Network/fetch errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
        return '🌐 Network error. Please check your connection.';
    }

    // JSON parsing errors
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return '⚠️ Data format error. Your data may be corrupted. Please restore from backup.';
    }

    // Generic errors with context
    const contextMessages = {
        'saveInvoice': 'Failed to save invoice. Please try again.',
        'saveCustomer': 'Failed to save customer. Please try again.',
        'saveExpense': 'Failed to save expense. Please try again.',
        'deleteInvoice': 'Failed to delete invoice. Please try again.',
        'exportData': 'Failed to export data. Please try again.',
        'importData': 'Failed to import data. Please check the file format.'
    };

    return contextMessages[context] || `⚠️ An error occurred: ${error.message}`;
}

/**
 * Show error notification to user
 * @param {string} message - Error message to display
 * @param {string} type - 'error', 'warning', 'critical'
 */
function showErrorNotification(message, type = 'error') {
    // Clear existing notification
    const existing = document.getElementById('error-notification');
    if (existing) {
        existing.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'error-notification';
    notification.className = `error-notification ${type}`;
    notification.innerHTML = `
        <div class="error-content">
            <span class="error-message">${message}</span>
            <button class="error-close" onclick="closeErrorNotification()">✕</button>
        </div>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Auto-dismiss after 5 seconds (10 for critical)
    const duration = type === 'critical' ? 10000 : 5000;
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }
    notificationTimeout = setTimeout(() => {
        closeErrorNotification();
    }, duration);
}

/**
 * Close error notification
 */
function closeErrorNotification() {
    const notification = document.getElementById('error-notification');
    if (notification) {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }
}

/**
 * Show success notification
 */
function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'error-notification success';
    notification.innerHTML = `
        <div class="error-content">
            <span class="error-message">✅ ${message}</span>
            <button class="error-close" onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Attempt recovery from storage errors
 */
function recoverFromStorageError(error) {
    console.warn('Attempting storage error recovery...');

    // Try to free up space by clearing temporary data
    try {
        // Clear any cached/temporary data
        localStorage.removeItem('tempData');
        localStorage.removeItem('cache');

        console.log('Cleared temporary data');
        showErrorNotification('⚠️ Storage full. Cleared temporary data. Please export old records.', 'warning');
    } catch (e) {
        console.error('Recovery failed:', e);
    }
}

/**
 * Safe localStorage wrapper with error handling
 */
const SafeStorage = {
    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return { success: true };
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                handleError(new StorageError('Storage quota exceeded'), 'SafeStorage.setItem');
            } else {
                handleError(error, 'SafeStorage.setItem');
            }
            return { success: false, error: error.message };
        }
    },

    getItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            handleError(error, 'SafeStorage.getItem');
            return null;
        }
    },

    removeItem(key) {
        try {
            localStorage.removeItem(key);
            return { success: true };
        } catch (error) {
            handleError(error, 'SafeStorage.removeItem');
            return { success: false, error: error.message };
        }
    },

    clear() {
        try {
            localStorage.clear();
            return { success: true };
        } catch (error) {
            handleError(error, 'SafeStorage.clear');
            return { success: false, error: error.message };
        }
    }
};

/**
 * Safe JSON parse with error handling
 */
function safeJSONParse(str, defaultValue = null) {
    try {
        return JSON.parse(str);
    } catch (error) {
        handleError(error, 'JSON.parse', { showNotification: false });
        return defaultValue;
    }
}

/**
 * Safe JSON stringify with error handling
 */
function safeJSONStringify(obj, defaultValue = '{}') {
    try {
        return JSON.stringify(obj);
    } catch (error) {
        handleError(error, 'JSON.stringify', { showNotification: false });
        return defaultValue;
    }
}

/**
 * Initialize global error handlers
 */
function initializeErrorHandlers() {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
        handleError(event.error || new Error(event.message), 'Global Error', {
            logToConsole: true,
            showNotification: true
        });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        handleError(
            event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
            'Unhandled Promise',
            { logToConsole: true, showNotification: true }
        );
    });

    console.log('✅ Error handlers initialized');
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeErrorHandlers);
} else {
    initializeErrorHandlers();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleError,
        showErrorNotification,
        showSuccessNotification,
        ValidationError,
        StorageError,
        DataError,
        SafeStorage,
        safeJSONParse,
        safeJSONStringify
    };
}
