// ===================================
// VALIDATION UTILITY
// ===================================

/**
 * Data validation system for SVR Dashboard
 * Provides schema-based validation for all entities
 */

// Validation Schemas
const VALIDATION_SCHEMAS = {
    invoice: {
        invoiceNo: {
            required: true,
            pattern: /^SVR\d{4}\/\d{2}-\d{2}$/,
            message: 'Invoice number must be in format SVR0001/24-25'
        },
        date: {
            required: true,
            type: 'date',
            message: 'Valid date is required'
        },
        buyerName: {
            required: true,
            minLength: 2,
            maxLength: 100,
            message: 'Customer name is required (2-100 characters)'
        },
        products: {
            required: true,
            minItems: 1,
            message: 'At least one product is required'
        },
        totalAmount: {
            required: true,
            min: 0,
            message: 'Total amount must be a positive number'
        }
    },

    customer: {
        name: {
            required: true,
            minLength: 2,
            maxLength: 100,
            message: 'Customer name is required (2-100 characters)'
        },
        gstin: {
            required: false,
            pattern: /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d{1}[A-Z]{1}\d{1}$/,
            message: 'GSTIN must be in valid format (e.g., 29ABCDE1234F1Z5)'
        },
        email: {
            required: false,
            type: 'email',
            message: 'Valid email address required'
        },
        phone: {
            required: true,
            pattern: /^\d{10}$/,
            message: 'Phone number must be 10 digits'
        },
        address: {
            required: false,
            maxLength: 500,
            message: 'Address cannot exceed 500 characters'
        }
    },

    employee: {
        name: {
            required: true,
            minLength: 2,
            maxLength: 100,
            message: 'Employee name is required (2-100 characters)'
        },
        employeeId: {
            required: true,
            pattern: /^EMP\d{4}$/,
            message: 'Employee ID must be in format EMP0001'
        },
        phone: {
            required: true,
            pattern: /^\d{10}$/,
            message: 'Phone number must be 10 digits'
        },
        department: {
            required: true,
            message: 'Department is required'
        },
        salary: {
            required: false,
            min: 0,
            message: 'Salary must be a positive number'
        }
    },

    expense: {
        date: {
            required: true,
            type: 'date',
            message: 'Date is required'
        },
        category: {
            required: true,
            message: 'Category is required'
        },
        amount: {
            required: true,
            min: 0,
            message: 'Amount must be a positive number'
        },
        description: {
            required: false,
            maxLength: 500,
            message: 'Description cannot exceed 500 characters'
        }
    },

    product: {
        description: {
            required: true,
            minLength: 2,
            maxLength: 200,
            message: 'Product description is required (2-200 characters)'
        },
        hsnCode: {
            required: false,
            pattern: /^\d{4,8}$/,
            message: 'HSN code must be 4-8 digits'
        },
        quantity: {
            required: true,
            min: 0,
            message: 'Quantity must be a positive number'
        },
        rate: {
            required: true,
            min: 0,
            message: 'Rate must be a positive number'
        },
        gstRate: {
            required: true,
            options: [0, 5, 12, 18, 28],
            message: 'GST rate must be 0, 5, 12, 18, or 28'
        }
    }
};

/**
 * Validate a value against afield rule
 */
function validateField(fieldName, value, rule) {
    const errors = [];

    // Required check
    if (rule.required) {
        if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
            return rule.message || `${fieldName} is required`;
        }
    }

    // If not required and empty, skip other validations
    if (!value && !rule.required) {
        return null;
    }

    // Type validations
    if (rule.type === 'email') {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) {
            return rule.message || 'Invalid email format';
        }
    }

    if (rule.type === 'date') {
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
            return rule.message || 'Invalid date';
        }
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
        return rule.message || `${fieldName} format is invalid`;
    }

    // Length validations
    if (rule.minLength && value.length < rule.minLength) {
        return rule.message || `${fieldName} must be at least ${rule.minLength} characters`;
    }

    if (rule.maxLength && value.length > rule.maxLength) {
        return rule.message || `${fieldName} cannot exceed ${rule.maxLength} characters`;
    }

    // Numeric validations
    if (rule.min !== undefined) {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < rule.min) {
            return rule.message || `${fieldName} must be at least ${rule.min}`;
        }
    }

    if (rule.max !== undefined) {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue > rule.max) {
            return rule.message || `${fieldName} cannot exceed ${rule.max}`;
        }
    }

    // Array validations
    if (rule.minItems && Array.isArray(value) && value.length < rule.minItems) {
        return rule.message || `At least ${rule.minItems} items required`;
    }

    // Options validation
    if (rule.options && !rule.options.includes(value)) {
        return rule.message || `${fieldName} must be one of: ${rule.options.join(', ')}`;
    }

    return null; // No errors
}

/**
 * Validate an entity against its schema
 */
function validateEntity(entityType, data) {
    const schema = VALIDATION_SCHEMAS[entityType];
    if (!schema) {
        console.warn(`No validation schema found for ${entityType}`);
        return { isValid: true, errors: {} };
    }

    const errors = {};
    let isValid = true;

    // Validate each field
    for (const [fieldName, rule] of Object.entries(schema)) {
        const value = data[fieldName];
        const error = validateField(fieldName, value, rule);

        if (error) {
            errors[fieldName] = error;
            isValid = false;
        }
    }

    return { isValid, errors };
}

/**
 * Validate invoice
 */
function validateInvoice(invoiceData) {
    return validateEntity('invoice', invoiceData);
}

/**
 * Validate customer
 */
function validateCustomer(customerData) {
    return validateEntity('customer', customerData);
}

/**
 * Validate employee
 */
function validateEmployee(employeeData) {
    return validateEntity('employee', employeeData);
}

/**
 * Validate expense
 */
function validateExpense(expenseData) {
    return validateEntity('expense', expenseData);
}

/**
 * Validate product
 */
function validateProduct(productData) {
    return validateEntity('product', productData);
}

/**
 * Validate GSTIN format
 */
function validateGSTIN(gstin) {
    if (!gstin) return true; // Optional field
    const pattern = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d{1}[A-Z]{1}\d{1}$/;
    return pattern.test(gstin);
}

/**
 * Validate email format
 */
function validateEmail(email) {
    if (!email) return true; // Optional field
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

/**
 * Validate phone number (10 digits)
 */
function validatePhone(phone) {
    if (!phone) return false; // Required field
    const pattern = /^\d{10}$/;
    return pattern.test(phone);
}

/**
 * Validate invoice number format
 */
function validateInvoiceNumber(invoiceNo) {
    const pattern = /^SVR\d{4}\/\d{2}-\d{2}$/;
    return pattern.test(invoiceNo);
}

/**
 * Validate required field
 */
function validateRequired(value, fieldName) {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        return `${fieldName} is required`;
    }
    return null;
}

/**
 * Validate number range
 */
function validateNumber(value, min = -Infinity, max = Infinity) {
    const num = parseFloat(value);
    if (isNaN(num)) {
        return 'Must be a valid number';
    }
    if (num < min) {
        return `Must be at least ${min}`;
    }
    if (num > max) {
        return `Cannot exceed ${max}`;
    }
    return null;
}

/**
 * Validate date
 */
function validateDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return 'Invalid date format';
    }
    return null;
}

/**
 * Show validation errors on form
 */
function showValidationErrors(errors) {
    // Clear existing errors
    clearValidationErrors();

    // Show each error
    for (const [fieldName, errorMessage] of Object.entries(errors)) {
        const field = document.getElementById(fieldName) ||
            document.querySelector(`[name="${fieldName}"]`);

        if (field) {
            // Add error class to field
            field.classList.add('field-error');

            // Create error message element
            const errorEl = document.createElement('div');
            errorEl.className = 'field-error-message';
            errorEl.textContent = errorMessage;

            // Insert after field
            field.parentNode.insertBefore(errorEl, field.nextSibling);
        }
    }

    // Show error notification
    const errorCount = Object.keys(errors).length;
    showErrorNotification(`Please fix ${errorCount} validation error${errorCount > 1 ? 's' : ''}`);
}

/**
 * Show error for a specific field
 */
function showFieldError(field, errorMessage) {
    // Add error class
    field.classList.add('field-error');

    // Remove existing error message
    const existingError = field.nextElementSibling;
    if (existingError && existingError.classList.contains('field-error-message')) {
        existingError.remove();
    }

    // Create new error message
    const errorEl = document.createElement('div');
    errorEl.className = 'field-error-message';
    errorEl.textContent = errorMessage;

    // Insert after field
    field.parentNode.insertBefore(errorEl, field.nextSibling);
}

/**
 * Clear error for a specific field
 */
function clearFieldError(field) {
    field.classList.remove('field-error');

    const errorMessage = field.nextElementSibling;
    if (errorMessage && errorMessage.classList.contains('field-error-message')) {
        errorMessage.remove();
    }
}

/**
 * Clear all validation errors
 */
function clearValidationErrors() {
    // Remove error classes
    document.querySelectorAll('.field-error').forEach(field => {
        field.classList.remove('field-error');
    });

    // Remove error messages
    document.querySelectorAll('.field-error-message').forEach(msg => {
        msg.remove();
    });
}

/**
 * Setup real-time validation for a form
 */
function setupRealtimeValidation(formId, entityType) {
    const form = document.getElementById(formId);
    if (!form) return;

    const schema = VALIDATION_SCHEMAS[entityType];
    if (!schema) return;

    // Add blur event listeners to all fields
    for (const fieldName of Object.keys(schema)) {
        const field = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
        if (!field) continue;

        field.addEventListener('blur', () => {
            const rule = schema[fieldName];
            const error = validateField(fieldName, field.value, rule);

            if (error) {
                showFieldError(field, error);
            } else {
                clearFieldError(field);
            }
        });

        field.addEventListener('input', () => {
            // Clear error on input
            if (field.classList.contains('field-error')) {
                clearFieldError(field);
            }
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateInvoice,
        validateCustomer,
        validateEmployee,
        validateExpense,
        validateProduct,
        validateGSTIN,
        validateEmail,
        validatePhone,
        validateInvoiceNumber,
        validateRequired,
        validateNumber,
        validateDate,
        showValidationErrors,
        showFieldError,
        clearFieldError,
        clearValidationErrors,
        setupRealtimeValidation
    };
}
