// ===================================
// STORAGE MONITOR UTILITY
// ===================================

/**
 * localStorage monitoring system for SVR Dashboard
 * Tracks storage usage and warns users before hitting limits
 */

// Storage limit estimation (browsers vary, 5MB is common)
const STORAGE_LIMIT = 5 * 1024 * 1024; // 5MB in bytes
const WARNING_THRESHOLD = 0.70; // 70%
const CRITICAL_THRESHOLD = 0.85; // 85%
const DANGER_THRESHOLD = 0.95; // 95%

/**
 * Calculate total localStorage size in bytes
 */
function getStorageSize() {
    let total = 0;
    try {
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                // Count both key and value
                total += (key.length + localStorage[key].length) * 2; // UTF-16 = 2 bytes per char
            }
        }
    } catch (error) {
        console.error('Error calculating storage size:', error);
    }
    return total;
}

/**
 * Get storage size by module/key
 */
function getStorageSizeByModule() {
    const breakdown = {};
    try {
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const size = (key.length + localStorage[key].length) * 2;
                breakdown[key] = size;
            }
        }
    } catch (error) {
        console.error('Error getting storage breakdown:', error);
    }
    return breakdown;
}

/**
 * Get storage usage percentage
 */
function getUsagePercentage() {
    const used = getStorageSize();
    return (used / STORAGE_LIMIT) * 100;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get available space estimate
 */
function getAvailableSpace() {
    const used = getStorageSize();
    return Math.max(0, STORAGE_LIMIT - used);
}

/**
 * Check if user should be warned
 */
function shouldWarnUser() {
    const percentage = getUsagePercentage() / 100;

    if (percentage >= DANGER_THRESHOLD) {
        return { level: 'danger', percentage: percentage * 100 };
    } else if (percentage >= CRITICAL_THRESHOLD) {
        return { level: 'critical', percentage: percentage * 100 };
    } else if (percentage >= WARNING_THRESHOLD) {
        return { level: 'warning', percentage: percentage * 100 };
    }

    return null;
}

/**
 * Update storage widget on dashboard
 */
function updateStorageWidget() {
    const used = getStorageSize();
    const percentage = getUsagePercentage();

    // Update fill bar
    const fillBar = document.getElementById('storageFill');
    if (fillBar) {
        fillBar.style.width = `${Math.min(percentage, 100)}%`;

        // Update color based on usage
        if (percentage >= DANGER_THRESHOLD * 100) {
            fillBar.className = 'storage-fill critical';
        } else if (percentage >= CRITICAL_THRESHOLD * 100) {
            fillBar.className = 'storage-fill warning';
        } else {
            fillBar.className = 'storage-fill';
        }
    }

    // Update text
    const usedEl = document.getElementById('storageUsed');
    if (usedEl) {
        usedEl.textContent = formatBytes(used);
    }

    const limitEl = document.getElementById('storageLimit');
    if (limitEl) {
        limitEl.textContent = formatBytes(STORAGE_LIMIT);
    }

    const percentEl = document.getElementById('storagePercent');
    if (percentEl) {
        percentEl.textContent = `(${percentage.toFixed(1)}%)`;
    }

    // Show/hide warning
    const warning = shouldWarnUser();
    const warningEl = document.getElementById('storageWarning');
    if (warningEl) {
        if (warning) {
            let message = '';
            if (warning.level === 'danger') {
                message = '🚨 Storage is almost full! Export and delete old data immediately.';
            } else if (warning.level === 'critical') {
                message = '⚠️ Storage is running low! Consider exporting old data.';
            } else {
                message = 'ℹ️ Storage usage is getting high. Regular backups recommended.';
            }
            warningEl.textContent = message;
            warningEl.style.display = 'block';
            warningEl.className = `storage-warning ${warning.level}`;
        } else {
            warningEl.style.display = 'none';
        }
    }
}

/**
 * Show detailed storage breakdown
 */
function showStorageDetails() {
    const breakdown = getStorageSizeByModule();
    const sortedKeys = Object.keys(breakdown).sort((a, b) => breakdown[b] - breakdown[a]);

    let html = `
        <div class="modal-overlay" id="storageDetailsModal" onclick="closeStorageDetails()">
            <div class="modal storage-details-modal" onclick="event.stopPropagation()" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>💾 Storage Details</h2>
                    <button class="close-btn" onclick="closeStorageDetails()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="storage-summary">
                        <div class="summary-item">
                            <span class="label">Total Used:</span>
                            <span class="value">${formatBytes(getStorageSize())}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Available:</span>
                            <span class="value">${formatBytes(getAvailableSpace())}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Usage:</span>
                            <span class="value">${getUsagePercentage().toFixed(1)}%</span>
                        </div>
                    </div>
                    
                    <h3 style="margin-top: 1.5rem; margin-bottom: 1rem;">Storage Breakdown by Module</h3>
                    <div class="storage-breakdown-list">
                        ${sortedKeys.map(key => `
                            <div class="breakdown-item">
                                <div class="breakdown-name">${key}</div>
                                <div class="breakdown-size">${formatBytes(breakdown[key])}</div>
                                <div class="breakdown-bar">
                                    <div class="breakdown-fill" style="width: ${(breakdown[key] / getStorageSize() * 100).toFixed(1)}%"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="margin-top: 1.5rem;">
                        <h4>💡 Cleanup Suggestions:</h4>
                        <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
                            <li>Export old invoices (>6 months) and delete them</li>
                            <li>Archive old attendance records</li>
                            <li>Clean up old production records</li>
                            <li>Export expenses data and clear history</li>
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="exportAllData()">
                        📤 Export All Data
                    </button>
                    <button class="btn btn-secondary" onclick="closeStorageDetails()">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Close storage details modal
 */
function closeStorageDetails() {
    const modal = document.getElementById('storageDetailsModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Check storage and show alerts if needed
 */
function checkStorageUsage() {
    updateStorageWidget();

    const warning = shouldWarnUser();
    if (warning && warning.level === 'danger') {
        // Show critical alert (only once per session)
        if (!sessionStorage.getItem('storageAlertShown')) {
            showErrorNotification(
                '🚨 Storage is almost full! Export your data now to prevent data loss.',
                'critical'
            );
            sessionStorage.setItem('storageAlertShown', 'true');
        }
    }
}

/**
 * Get oldest records by type (for cleanup suggestions)
 */
function getOldestRecords(type, limit = 10) {
    try {
        const dataKey = type + 's'; //'outwardInvoices', 'inwardInvoices', etc.
        const data = JSON.parse(localStorage.getItem(dataKey) || '[]');

        // Sort by date (oldest first)
        const sorted = data.sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt || 0);
            const dateB = new Date(b.date || b.createdAt || 0);
            return dateA - dateB;
        });

        return sorted.slice(0, limit);
    } catch (error) {
        console.error(`Error getting oldest ${type} records:`, error);
        return [];
    }
}

/**
 * Suggest data cleanup based on age
 */
function suggestCleanup() {
    const suggestions = [];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Check old invoices
    const oldInvoices = getOldestRecords('outwardInvoice', 100).filter(inv => {
        return new Date(inv.date) < sixMonthsAgo;
    });

    if (oldInvoices.length > 0) {
        suggestions.push({
            type: 'Outward Invoices',
            count: oldInvoices.length,
            action: 'Export and archive invoices older than 6 months'
        });
    }

    // Check old attendance
    const oldAttendance = getOldestRecords('attendanceRecord', 100).filter(rec => {
        return new Date(rec.date) < sixMonthsAgo;
    });

    if (oldAttendance.length > 0) {
        suggestions.push({
            type: 'Attendance Records',
            count: oldAttendance.length,
            action: 'Archive attendance records older than 6 months'
        });
    }

    return suggestions;
}

/**
 * Initialize storage monitoring
 */
function initializeStorageMonitor() {
    // Initial check
    updateStorageWidget();

    // Check periodically (every 5 minutes)
    setInterval(checkStorageUsage, 5 * 60 * 1000);

    console.log('✅ Storage monitor initialized');
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStorageMonitor);
} else {
    initializeStorageMonitor();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getStorageSize,
        getStorageSizeByModule,
        getUsagePercentage,
        formatBytes,
        getAvailableSpace,
        shouldWarnUser,
        updateStorageWidget,
        showStorageDetails,
        checkStorageUsage,
        getOldestRecords,
        suggestCleanup
    };
}
