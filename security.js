// ===================================
// SECURITY UTILITIES
// ===================================

/**
 * Security utilities for input sanitization and data protection
 * Protects against XSS, injection attacks, and data exposure
 */

/**
 * Sanitize HTML string to prevent XSS attacks
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeHTML(str) {
    if (typeof str !== 'string') return str;

    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized input
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    if (!input) return input;

    // Replace potentially dangerous characters
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize object - applies sanitization to all string properties
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeInput(value);
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item =>
                typeof item === 'string' ? sanitizeInput(item) : item
            );
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

/**
 * Validate and sanitize email
 * @param {string} email - Email to validate
 * @returns {string|null} - Sanitized email or null if invalid
 */
function sanitizeEmail(email) {
    if (!email) return null;

    email = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        return null;
    }

    return sanitizeInput(email);
}

/**
 * Sanitize phone number (keep only digits and +)
 * @param {string} phone - Phone number
 * @returns {string} - Sanitized phone
 */
function sanitizePhone(phone) {
    if (!phone) return '';
    return phone.replace(/[^0-9+]/g, '');
}

/**
 * Sanitize GSTIN (keep only alphanumeric)
 * @param {string} gstin - GSTIN to sanitize
 * @returns {string} - Sanitized GSTIN
 */
function sanitizeGSTIN(gstin) {
    if (!gstin) return '';
    return gstin.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Sanitize number input
 * @param {any} value - Value to sanitize
 * @returns {number} - Sanitized number
 */
function sanitizeNumber(value) {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}

/**
 * Sanitize invoice data before saving
 * @param {Object} invoiceData - Invoice data
 * @returns {Object} - Sanitized invoice data
 */
function sanitizeInvoiceData(invoiceData) {
    return {
        ...invoiceData,
        invoiceNo: sanitizeInput(invoiceData.invoiceNo),
        buyerName: sanitizeInput(invoiceData.buyerName),
        buyerAddress: sanitizeInput(invoiceData.buyerAddress),
        gstin: sanitizeGSTIN(invoiceData.gstin),
        contact: sanitizePhone(invoiceData.contact),
        email: sanitizeEmail(invoiceData.email),
        // Sanitize products array
        products: invoiceData.products?.map(product => ({
            description: sanitizeInput(product.description),
            hsn: sanitizeInput(product.hsn),
            quantity: sanitizeNumber(product.quantity),
            rate: sanitizeNumber(product.rate),
            value: sanitizeNumber(product.value),
            uom: sanitizeInput(product.uom)
        }))
    };
}

/**
 * Sanitize customer data
 * @param {Object} customerData - Customer data
 * @returns {Object} - Sanitized customer data
 */
function sanitizeCustomerData(customerData) {
    return {
        ...customerData,
        name: sanitizeInput(customerData.name),
        address: sanitizeInput(customerData.address),
        gstin: sanitizeGSTIN(customerData.gstin),
        phone: sanitizePhone(customerData.phone),
        email: sanitizeEmail(customerData.email),
        contact: sanitizeInput(customerData.contact)
    };
}

/**
 * Prevent SQL injection in search queries (even though we use localStorage)
 * Good practice for future backend integration
 * @param {string} query - Search query
 * @returns {string} - Safe query
 */
function sanitizeSearchQuery(query) {
    if (!query) return '';

    // Remove SQL keywords and special characters
    return query
        .replace(/[';"\-\-]/g, '')
        .replace(/(\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b|\bSELECT\b)/gi, '')
        .trim();
}

/**
 * Generate secure random ID
 * Better than using Date.now() alone
 * @returns {string} - Random ID
 */
function generateSecureId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}_${random}`;
}

/**
 * Mask sensitive data for display
 * @param {string} data - Data to mask
 * @param {number} visibleChars - Number of characters to show at end
 * @returns {string} - Masked data
 */
function maskSensitiveData(data, visibleChars = 4) {
    if (!data || data.length <= visibleChars) return data;

    const masked = '*'.repeat(data.length - visibleChars);
    const visible = data.slice(-visibleChars);
    return masked + visible;
}

/**
 * Mask credit card number
 * @param {string} cardNumber - Card number
 * @returns {string} - Masked card number
 */
function maskCardNumber(cardNumber) {
    if (!cardNumber) return '';
    const cleaned = cardNumber.replace(/\s/g, '');
    return maskSensitiveData(cleaned, 4);
}

/**
 * Check for suspicious patterns in input
 * @param {string} input - Input to check
 * @returns {boolean} - True if suspicious
 */
function detectSuspiciousInput(input) {
    if (!input || typeof input !== 'string') return false;

    const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,  // Event handlers like onclick=
        /<iframe/i,
        /eval\(/i,
        /alert\(/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
}

/**
 * Wrapper for safe form data collection
 * @param {string} formId - Form element ID
 * @returns {Object} - Sanitized form data
 */
function getSafeFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};

    const formData = new FormData(form);
    const data = {};

    for (const [key, value] of formData.entries()) {
        data[key] = sanitizeInput(value.toString());
    }

    return data;
}

/**
 * Log security event (for monitoring)
 * @param {string} event - Event type
 * @param {Object} details - Event details
 */
function logSecurityEvent(event, details = {}) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        event,
        details,
        userAgent: navigator.userAgent
    };

    console.warn('[SECURITY]', logEntry);

    // In production, send to monitoring service
    // sendToMonitoring(logEntry);
}

/**
 * Initialize security monitoring
 */
function initSecurityMonitoring() {
    // Monitor for XSS attempts
    const originalCreateElement = document.createElement;
    document.createElement = function (tagName) {
        if (tagName.toLowerCase() === 'script') {
            logSecurityEvent('script_creation_attempt', { tagName });
        }
        return originalCreateElement.call(document, tagName);
    };

    console.log('✅ Security monitoring initialized');
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSecurityMonitoring);
} else {
    initSecurityMonitoring();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sanitizeHTML,
        sanitizeInput,
        sanitizeObject,
        sanitizeEmail,
        sanitizePhone,
        sanitizeGSTIN,
        sanitizeNumber,
        sanitizeInvoiceData,
        sanitizeCustomerData,
        sanitizeSearchQuery,
        generateSecureId,
        maskSensitiveData,
        detectSuspiciousInput,
        getSafeFormData
    };
}
