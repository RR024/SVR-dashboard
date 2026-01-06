// ===================================
// SVR Manufacturing - Production Ready Features
// ===================================
// This file adds backup warnings, storage indicators, clipboard backup,
// enhanced validation, and PWA support

// ===================================
// BACKUP STATUS INDICATOR
// ===================================

// Update the backup status indicator in the UI
function updateBackupIndicator() {
    const lastExport = localStorage.getItem('svr_last_export');
    const indicatorContainer = document.getElementById('backupStatusIndicator');
    const lastBackupInfo = document.getElementById('lastBackupInfo');

    let statusHTML = '';
    let statusClass = '';
    let displayText = '';

    if (!lastExport) {
        statusClass = 'danger';
        displayText = 'Never';
        statusHTML = `
            <div class="backup-indicator ${statusClass}" title="No backup found - Export your data now!">
                <span class="indicator-icon">⚠️</span>
                <span class="indicator-text">No Backup</span>
            </div>
        `;
    } else {
        const lastExportDate = new Date(lastExport);
        const now = new Date();
        const daysDiff = Math.floor((now - lastExportDate) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
            statusClass = 'success';
            displayText = 'Today at ' + lastExportDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            statusHTML = `
                <div class="backup-indicator ${statusClass}" title="Backup created today">
                    <span class="indicator-icon">✅</span>
                    <span class="indicator-text">Backed up today</span>
                </div>
            `;
        } else if (daysDiff <= 3) {
            statusClass = 'success';
            displayText = `${daysDiff} day${daysDiff > 1 ? 's' : ''} ago`;
            statusHTML = `
                <div class="backup-indicator ${statusClass}" title="Last backup: ${daysDiff} day(s) ago">
                    <span class="indicator-icon">✅</span>
                    <span class="indicator-text">${daysDiff}d ago</span>
                </div>
            `;
        } else if (daysDiff <= 7) {
            statusClass = 'warning';
            displayText = `${daysDiff} days ago`;
            statusHTML = `
                <div class="backup-indicator ${statusClass}" title="Last backup: ${daysDiff} days ago - Consider backing up">
                    <span class="indicator-icon">⚠️</span>
                    <span class="indicator-text">${daysDiff}d ago</span>
                </div>
            `;
        } else {
            statusClass = 'danger';
            displayText = `${daysDiff} days ago`;
            statusHTML = `
                <div class="backup-indicator ${statusClass}" title="Last backup: ${daysDiff} days ago - BACKUP NOW!">
                    <span class="indicator-icon">🔴</span>
                    <span class="indicator-text">${daysDiff}d ago!</span>
                </div>
            `;
        }
    }

    // Update sidebar indicator if exists
    if (indicatorContainer) {
        indicatorContainer.innerHTML = statusHTML;
    }

    // Update Settings page info
    if (lastBackupInfo) {
        lastBackupInfo.textContent = displayText;
        lastBackupInfo.style.color = statusClass === 'danger' ? '#ef4444' :
            statusClass === 'warning' ? '#f59e0b' : '#10b981';
    }
}

// ===================================
// WEEKLY BACKUP REMINDER POPUP
// ===================================

function checkWeeklyBackupReminder() {
    // IMPORTANT: Only show backup reminders when user is logged in (dashboard visible)
    const appContainer = document.getElementById('appContainer');
    const isLoggedIn = appContainer && appContainer.style.display !== 'none';

    if (!isLoggedIn) {
        // User is on login/signup page, don't show backup reminder
        return;
    }

    const lastExport = localStorage.getItem('svr_last_export');
    const lastPopupShown = localStorage.getItem('svr_backup_popup_shown');

    // Don't show popup if already shown in last 48 hours (2 days)
    if (lastPopupShown) {
        const hoursSincePopup = (new Date() - new Date(lastPopupShown)) / (1000 * 60 * 60);
        if (hoursSincePopup < 48) {
            return;
        }
    }

    // Calculate days since last export
    let daysSinceExport = 999;
    if (lastExport) {
        daysSinceExport = Math.floor((new Date() - new Date(lastExport)) / (1000 * 60 * 60 * 24));
    }

    // Show popup if no export or more than 2 days
    if (daysSinceExport >= 2) {
        showBackupReminderPopup(daysSinceExport, !lastExport);
    }
}

function showBackupReminderPopup(days, neverExported) {
    // Create modal backdrop
    const modal = document.createElement('div');
    modal.id = 'backupReminderModal';
    modal.className = 'modal active';
    modal.style.cssText = 'z-index: 10001;';

    const title = neverExported
        ? '🚨 You\'ve Never Backed Up Your Data!'
        : `⚠️ It\'s Been ${days} Days Since Your Last Backup`;

    const message = neverExported
        ? 'Your data exists only in this browser. If you clear browser data or use a different device, all your invoices, customers, and records will be LOST forever!'
        : `Your last backup was ${days} days ago. Regular backups protect your valuable business data from accidental loss.`;

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px; text-align: center;">
            <div class="modal-header" style="border-bottom: none; justify-content: center;">
                <h3 class="modal-title" style="color: ${neverExported ? '#ef4444' : '#f59e0b'}; font-size: 1.5rem;">
                    ${title}
                </h3>
            </div>
            <div class="modal-body" style="padding: 1.5rem 2rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">${neverExported ? '💾' : '⏰'}</div>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.6;">
                    ${message}
                </p>
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
                    <strong>💡 Tip:</strong> Export your data to a JSON file and save it to your computer or cloud storage.
                </div>
            </div>
            <div class="modal-footer" style="flex-direction: column; gap: 0.75rem; border-top: none;">
                <button onclick="exportToJSON(); closeBackupReminderPopup();" 
                        class="btn btn-primary" style="width: 100%; font-size: 1rem; padding: 0.875rem;">
                    📥 Export Backup Now
                </button>
                <button onclick="quickBackupToClipboard(); closeBackupReminderPopup();" 
                        class="btn btn-secondary" style="width: 100%;">
                    📋 Quick Copy to Clipboard
                </button>
                <button onclick="closeBackupReminderPopup();" 
                        style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 0.5rem;">
                    Remind me later
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Mark popup as shown
    localStorage.setItem('svr_backup_popup_shown', new Date().toISOString());
}

function closeBackupReminderPopup() {
    const modal = document.getElementById('backupReminderModal');
    if (modal) {
        modal.remove();
    }
}

// ===================================
// QUICK BACKUP TO CLIPBOARD
// ===================================

async function quickBackupToClipboard() {
    try {
        const allData = {
            version: '2.0',
            exportDate: new Date().toISOString(),
            exportedBy: typeof getCurrentUser === 'function' ? getCurrentUser()?.username : 'User',
            data: {
                inwardInvoices: typeof getInwardInvoices === 'function' ? getInwardInvoices() : [],
                outwardInvoices: typeof getOutwardInvoices === 'function' ? getOutwardInvoices() : [],
                customers: typeof getCustomers === 'function' ? getCustomers() : [],
                employees: typeof getEmployees === 'function' ? getEmployees() : [],
                attendance: typeof getAttendanceRecords === 'function' ? getAttendanceRecords() : [],
                expenses: typeof getExpenses === 'function' ? getExpenses() : [],
                salaryRecords: typeof getSalaryRecords === 'function' ? getSalaryRecords() : []
            }
        };

        const jsonString = JSON.stringify(allData, null, 2);

        await navigator.clipboard.writeText(jsonString);

        // Update last export time
        localStorage.setItem('svr_last_export', new Date().toISOString());

        // Update indicators
        updateBackupIndicator();
        updateStorageIndicator();

        showToast('✅ Backup copied to clipboard! Paste it into a text file to save.', 'success');

        // Log activity
        if (typeof logActivity === 'function') {
            logActivity('backup', 'Quick backup copied to clipboard');
        }

    } catch (error) {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        const allData = {
            version: '2.0',
            exportDate: new Date().toISOString(),
            data: {
                inwardInvoices: typeof getInwardInvoices === 'function' ? getInwardInvoices() : [],
                outwardInvoices: typeof getOutwardInvoices === 'function' ? getOutwardInvoices() : [],
                customers: typeof getCustomers === 'function' ? getCustomers() : [],
                employees: typeof getEmployees === 'function' ? getEmployees() : [],
                attendance: typeof getAttendanceRecords === 'function' ? getAttendanceRecords() : [],
                expenses: typeof getExpenses === 'function' ? getExpenses() : [],
                salaryRecords: typeof getSalaryRecords === 'function' ? getSalaryRecords() : []
            }
        };

        textArea.value = JSON.stringify(allData, null, 2);
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();

        try {
            document.execCommand('copy');
            localStorage.setItem('svr_last_export', new Date().toISOString());
            updateBackupIndicator();
            showToast('✅ Backup copied to clipboard!', 'success');
        } catch (e) {
            showToast('❌ Could not copy to clipboard. Please use Export instead.', 'error');
        }

        document.body.removeChild(textArea);
    }
}

// Create a quick backup download
function quickBackup() {
    if (typeof exportToJSON === 'function') {
        exportToJSON();
    } else {
        showToast('Export function not available', 'error');
    }
}

// ===================================
// STORAGE USAGE INDICATOR
// ===================================

function updateStorageIndicator() {
    const storageUsageInfo = document.getElementById('storageUsageInfo');
    const storageProgressContainer = document.getElementById('storageProgressContainer');

    // Calculate localStorage usage
    let totalSize = 0;
    let dataBreakdown = {};

    const dataKeys = {
        'inwardInvoices': 'Inward Invoices',
        'outwardInvoices': 'Outward Invoices',
        'customers': 'Customers',
        'employees': 'Employees',
        'attendance': 'Attendance',
        'expenses': 'Expenses',
        'salaryRecords': 'Salary Records',
        'svr_users': 'Users',
        'activities': 'Activity Log',
        'backups': 'Internal Backups'
    };

    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            const itemSize = (localStorage.getItem(key).length + key.length) * 2; // UTF-16
            totalSize += itemSize;

            // Track specific data sizes
            for (const dataKey in dataKeys) {
                if (key.includes(dataKey) || key === dataKey) {
                    dataBreakdown[dataKeys[dataKey]] = (dataBreakdown[dataKeys[dataKey]] || 0) + itemSize;
                }
            }
        }
    }

    // LocalStorage limit is typically 5-10MB, we'll use 5MB as baseline
    const maxStorage = 5 * 1024 * 1024; // 5MB
    const usedPercentage = (totalSize / maxStorage) * 100;

    // Format size
    const sizeKB = (totalSize / 1024).toFixed(2);
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    const displaySize = totalSize > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

    // Update text display
    if (storageUsageInfo) {
        let colorClass = 'success';
        if (usedPercentage > 80) colorClass = 'danger';
        else if (usedPercentage > 50) colorClass = 'warning';

        storageUsageInfo.innerHTML = `
            <span style="color: var(--${colorClass === 'success' ? 'success' : colorClass === 'warning' ? 'warning' : 'danger'});">
                ${displaySize}
            </span>
            <span style="color: var(--text-secondary);"> / 5 MB (${usedPercentage.toFixed(1)}%)</span>
        `;
    }

    // Update progress bar if exists
    if (storageProgressContainer) {
        let barColor = '#10b981'; // green
        if (usedPercentage > 80) barColor = '#ef4444'; // red
        else if (usedPercentage > 50) barColor = '#f59e0b'; // yellow

        storageProgressContainer.innerHTML = `
            <div style="background: var(--bg-tertiary); border-radius: var(--radius-sm); height: 8px; overflow: hidden; margin-top: 0.5rem;">
                <div style="background: ${barColor}; height: 100%; width: ${Math.min(usedPercentage, 100)}%; transition: width 0.3s ease;"></div>
            </div>
            ${usedPercentage > 80 ? '<p style="color: #ef4444; font-size: 0.75rem; margin-top: 0.5rem;">⚠️ Storage is getting full! Export and save your data externally.</p>' : ''}
        `;
    }

    // Show warning if storage is getting full
    if (usedPercentage > 90) {
        showStorageWarning(usedPercentage);
    }
}

function showStorageWarning(percentage) {
    // Only show once per session
    if (sessionStorage.getItem('storage_warning_shown')) return;
    sessionStorage.setItem('storage_warning_shown', 'true');

    showToast(`⚠️ Storage ${percentage.toFixed(0)}% full! Export your data to avoid data loss.`, 'warning');
}

// ===================================
// ENHANCED JSON IMPORT VALIDATION
// ===================================

function validateImportedJSON(importData) {
    const errors = [];
    const warnings = [];

    // Check basic structure
    if (!importData || typeof importData !== 'object') {
        errors.push('Invalid file: Not a valid JSON object');
        return { valid: false, errors, warnings };
    }

    // Check for data property
    if (!importData.data || typeof importData.data !== 'object') {
        errors.push('Invalid backup format: Missing "data" property');
        return { valid: false, errors, warnings };
    }

    // Validate version
    if (importData.version && importData.version !== '2.0' && importData.version !== '1.0') {
        warnings.push(`Unknown backup version: ${importData.version}. Some data may not import correctly.`);
    }

    // Validate each data array
    const expectedArrays = ['inwardInvoices', 'outwardInvoices', 'customers', 'employees', 'attendance', 'expenses', 'salaryRecords'];

    expectedArrays.forEach(key => {
        if (importData.data[key] !== undefined) {
            if (!Array.isArray(importData.data[key])) {
                errors.push(`Invalid data: "${key}" should be an array, got ${typeof importData.data[key]}`);
            } else {
                // Validate individual items have required fields
                importData.data[key].forEach((item, index) => {
                    if (!item.id) {
                        warnings.push(`${key}[${index}] is missing an ID - may cause issues on import`);
                    }
                });
            }
        }
    });

    // Validate invoice structures
    if (importData.data.inwardInvoices && Array.isArray(importData.data.inwardInvoices)) {
        importData.data.inwardInvoices.forEach((inv, index) => {
            if (!inv.invoiceNo) warnings.push(`Inward invoice ${index + 1} missing invoice number`);
            if (!inv.customer) warnings.push(`Inward invoice ${index + 1} missing customer name`);
            if (!inv.date) warnings.push(`Inward invoice ${index + 1} missing date`);
        });
    }

    if (importData.data.outwardInvoices && Array.isArray(importData.data.outwardInvoices)) {
        importData.data.outwardInvoices.forEach((inv, index) => {
            if (!inv.invoiceNo) warnings.push(`Outward invoice ${index + 1} missing invoice number`);
            if (!inv.buyerName) warnings.push(`Outward invoice ${index + 1} missing buyer name`);
            if (!inv.date) warnings.push(`Outward invoice ${index + 1} missing date`);
        });
    }

    // Check for empty data
    let totalItems = 0;
    expectedArrays.forEach(key => {
        if (importData.data[key] && Array.isArray(importData.data[key])) {
            totalItems += importData.data[key].length;
        }
    });

    if (totalItems === 0) {
        errors.push('The backup file contains no data to import');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        totalItems,
        summary: {
            inwardInvoices: importData.data.inwardInvoices?.length || 0,
            outwardInvoices: importData.data.outwardInvoices?.length || 0,
            customers: importData.data.customers?.length || 0,
            employees: importData.data.employees?.length || 0,
            attendance: importData.data.attendance?.length || 0,
            expenses: importData.data.expenses?.length || 0,
            salaryRecords: importData.data.salaryRecords?.length || 0
        }
    };
}

// ===================================
// PWA / SERVICE WORKER REGISTRATION
// ===================================

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then((registration) => {
                    console.log('✅ Service Worker registered:', registration.scope);

                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        console.log('🔄 New Service Worker installing...');

                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New version available
                                showUpdateNotification();
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.warn('❌ Service Worker registration failed:', error);
                });
        });
    }
}

function showUpdateNotification() {
    const banner = document.createElement('div');
    banner.id = 'updateBanner';
    banner.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 15px;
    `;

    banner.innerHTML = `
        <span>🔄 A new version is available!</span>
        <button onclick="location.reload();" 
                style="background: white; color: #667eea; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold;">
            Refresh
        </button>
        <button onclick="this.parentElement.remove();" 
                style="background: transparent; color: white; border: none; cursor: pointer; font-size: 1.2rem;">
            ×
        </button>
    `;

    document.body.appendChild(banner);
}

// PWA Install Prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
});

function showInstallButton() {
    // Add install button to sidebar or header if not already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return; // Already installed as PWA
    }

    const installBtn = document.getElementById('pwaInstallBtn');
    if (installBtn) {
        installBtn.style.display = 'flex';
    }
}

async function installPWA() {
    if (!deferredPrompt) {
        showToast('Please use your browser\'s install option', 'info');
        return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
        showToast('✅ App installed! You can now use it offline.', 'success');
    }

    deferredPrompt = null;
}

// ===================================
// INITIALIZATION
// ===================================

document.addEventListener('DOMContentLoaded', function () {
    // Register service worker
    registerServiceWorker();

    // Update indicators after a short delay to ensure DOM is ready
    setTimeout(() => {
        updateBackupIndicator();
        updateStorageIndicator();

        // Check for weekly reminder (with slight delay to not be intrusive on load)
        setTimeout(() => {
            checkWeeklyBackupReminder();
        }, 3000);
    }, 1000);
});

// Make functions globally available
window.updateBackupIndicator = updateBackupIndicator;
window.updateStorageIndicator = updateStorageIndicator;
window.quickBackupToClipboard = quickBackupToClipboard;
window.quickBackup = quickBackup;
window.validateImportedJSON = validateImportedJSON;
window.closeBackupReminderPopup = closeBackupReminderPopup;
window.installPWA = installPWA;

console.log('✅ Production-ready features loaded');
