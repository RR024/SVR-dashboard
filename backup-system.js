// =========================================
// AUTOMATIC BACKUP REMINDER SYSTEM
// =========================================

// Check if backup reminder is needed
function checkBackupReminder() {
    const lastBackup = localStorage.getItem('lastBackupDate');
    const reminderDismissed = localStorage.getItem('backupReminderDismissed');

    const now = new Date();

    // If never backed up, show reminder after first use
    if (!lastBackup) {
        // Wait 24 hours after first use
        const firstUse = localStorage.getItem('firstUseDate');
        if (!firstUse) {
            localStorage.setItem('firstUseDate', now.toISOString());
            return;
        }

        const daysSinceFirstUse = (now - new Date(firstUse)) / (1000 * 60 * 60 * 24);
        if (daysSinceFirstUse >= 1 && !reminderDismissed) {
            showBackupReminder();
        }
        return;
    }

    // Check if it's been more than 7 days
    const lastBackupDate = new Date(lastBackup);
    const daysSinceBackup = (now - lastBackupDate) / (1000 * 60 * 60 * 24);

    // Show reminder if >7 days and not dismissed today
    if (daysSinceBackup >= 7) {
        if (reminderDismissed) {
            const dismissedDate = new Date(reminderDismissed);
            const hoursSinceDismissed = (now - dismissedDate) / (1000 * 60 * 60);

            // Show again after 24 hours
            if (hoursSinceDismissed >= 24) {
                localStorage.removeItem('backupReminderDismissed');
                showBackupReminder();
            }
        } else {
            showBackupReminder();
        }
    }
}

// Show backup reminder modal
function showBackupReminder() {
    const modal = document.getElementById('backupReminderModal');
    if (!modal) return;

    const lastBackup = localStorage.getItem('lastBackupDate');
    const messageEl = document.getElementById('backupReminderMessage');

    if (!lastBackup) {
        messageEl.textContent = "You haven't backed up your data yet. Protect your business data with a quick backup!";
    } else {
        const daysSince = Math.floor((new Date() - new Date(lastBackup)) / (1000 * 60 * 60 * 24));
        messageEl.textContent = `Last backup was ${daysSince} days ago. Time to backup your data!`;
    }

    modal.classList.add('active');
}

// Close backup reminder
function closeBackupReminder() {
    const modal = document.getElementById('backupReminderModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Dismiss reminder for 24 hours
function dismissBackupReminder() {
    localStorage.setItem('backupReminderDismissed', new Date().toISOString());
    closeBackupReminder();
    showToast('Reminder dismissed for 24 hours', 'info');
}

// Quick backup with reminder update
function quickBackup() {
    try {
        // Create backup
        const allData = {
            version: '2.0',
            exportDate: new Date().toISOString(),
            exportedBy: getCurrentUser()?.username || 'admin',
            data: {
                inwardInvoices: getInwardInvoices(),
                outwardInvoices: getOutwardInvoices(),
                customers: getCustomers(),
                employees: getEmployees(),
                attendance: getAttendanceRecords()
            }
        };

        const jsonString = JSON.stringify(allData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        const filename = `SVR_Backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Update last backup date
        localStorage.setItem('lastBackupDate', new Date().toISOString());
        localStorage.removeItem('backupReminderDismissed');

        // Close reminder
        closeBackupReminder();

        showToast('✅ Backup created successfully!', 'success');

        // Update dashboard if backup indicator exists
        updateBackupIndicator();

        return true;
    } catch (error) {
        console.error('Backup error:', error);
        showToast('❌ Backup failed: ' + error.message, 'error');
        return false;
    }
}

// Update backup indicator in dashboard
function updateBackupIndicator() {
    const indicator = document.getElementById('backupIndicator');
    if (!indicator) return;

    const lastBackup = localStorage.getItem('lastBackupDate');
    if (!lastBackup) {
        indicator.innerHTML = '<span style="color: var(--danger);">⚠️ Never backed up</span>';
        return;
    }

    const daysSince = Math.floor((new Date() - new Date(lastBackup)) / (1000 * 60 * 60 * 24));

    let color, icon, text;
    if (daysSince === 0) {
        color = 'var(--success)';
        icon = '✅';
        text = 'Today';
    } else if (daysSince <= 3) {
        color = 'var(--success)';
        icon = '✅';
        text = `${daysSince} day${daysSince > 1 ? 's' : ''} ago`;
    } else if (daysSince <= 7) {
        color = 'var(--warning)';
        icon = '⚠️';
        text = `${daysSince} days ago`;
    } else {
        color = 'var(--danger)';
        icon = '❌';
        text = `${daysSince} days ago`;
    }

    indicator.innerHTML = `<span style="color: ${color};">${icon} Last backup: ${text}</span>`;
}

// Get storage usage
function getStorageUsage() {
    let total = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += localStorage[key].length + key.length;
        }
    }
    return total;
}

// Format bytes to readable size
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Update storage indicator
function updateStorageIndicator() {
    const indicator = document.getElementById('storageIndicator');
    if (!indicator) return;

    const used = getStorageUsage();
    const limit = 5 * 1024 * 1024; // 5MB approximate limit
    const percentage = (used / limit) * 100;

    let color, icon;
    if (percentage < 50) {
        color = 'var(--success)';
        icon = '✅';
    } else if (percentage < 80) {
        color = 'var(--warning)';
        icon = '⚠️';
    } else {
        color = 'var(--danger)';
        icon = '❌';
    }

    indicator.innerHTML = `
        <span style="color: ${color};">
            ${icon} Storage: ${formatBytes(used)} / ${formatBytes(limit)} (${percentage.toFixed(1)}%)
        </span>
    `;

    if (percentage >= 85) {
        showToast('⚠️ Storage almost full! Please export and clear old data.', 'warning');
    }
}

// Export functions
window.checkBackupReminder = checkBackupReminder;
window.showBackupReminder = showBackupReminder;
window.closeBackupReminder = closeBackupReminder;
window.dismissBackupReminder = dismissBackupReminder;
window.quickBackup = quickBackup;
window.updateBackupIndicator = updateBackupIndicator;
window.updateStorageIndicator = updateStorageIndicator;

// =============================================
// MANUAL DATA EXPORT/IMPORT FUNCTIONS
// =============================================

// Export all data to JSON file
function exportAllData() {
    try {
        // Collect all dashboard data
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            data: {
                users: JSON.parse(localStorage.getItem('users') || '[]'),
                outwardInvoices: JSON.parse(localStorage.getItem('outwardInvoices') || '[]'),
                inwardInvoices: JSON.parse(localStorage.getItem('inwardInvoices') || '[]'),
                customers: JSON.parse(localStorage.getItem('customers') || '[]'),
                employees: JSON.parse(localStorage.getItem('employees') || '[]'),
                attendance: JSON.parse(localStorage.getItem('attendance') || '[]'),
                expenses: JSON.parse(localStorage.getItem('manufacturingExpenses') || '[]'),
                recurringExpenses: JSON.parse(localStorage.getItem('recurringExpenses') || '[]')
            }
        };

        // Convert to JSON
        const jsonString = JSON.stringify(exportData, null, 2);

        // Create blob and download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        // Filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 10);
        link.download = `SVR-Dashboard-Backup-${timestamp}.json`;
        link.href = url;
        link.click();

        // Cleanup
        URL.revokeObjectURL(url);

        // Update last backup date
        localStorage.setItem('lastBackupDate', new Date().toISOString());

        showToast('✅ Data exported successfully!', 'success');
        console.log('Export completed:', exportData);
    } catch (error) {
        console.error('Export failed:', error);
        showToast('❌ Export failed: ' + error.message, 'error');
    }
}

// Import data from JSON file
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importData = JSON.parse(event.target.result);

                // Validate data structure
                if (!importData.data) {
                    throw new Error('Invalid backup file format');
                }

                // Confirm before overwriting
                if (!confirm('⚠️ This will REPLACE all existing data. Are you sure?\n\nCurrent data will be lost. Continue?')) {
                    return;
                }

                // Import all data
                if (importData.data.users) {
                    localStorage.setItem('users', JSON.stringify(importData.data.users));
                }
                if (importData.data.outwardInvoices) {
                    localStorage.setItem('outwardInvoices', JSON.stringify(importData.data.outwardInvoices));
                }
                if (importData.data.inwardInvoices) {
                    localStorage.setItem('inwardInvoices', JSON.stringify(importData.data.inwardInvoices));
                }
                if (importData.data.customers) {
                    localStorage.setItem('customers', JSON.stringify(importData.data.customers));
                }
                if (importData.data.employees) {
                    localStorage.setItem('employees', JSON.stringify(importData.data.employees));
                }
                if (importData.data.attendance) {
                    localStorage.setItem('attendance', JSON.stringify(importData.data.attendance));
                }
                if (importData.data.expenses) {
                    localStorage.setItem('manufacturingExpenses', JSON.stringify(importData.data.expenses));
                }
                if (importData.data.recurringExpenses) {
                    localStorage.setItem('recurringExpenses', JSON.stringify(importData.data.recurringExpenses));
                }

                showToast('✅ Data imported successfully! Refreshing...', 'success');
                console.log('Import completed:', importData);

                // Reload page to reflect changes
                setTimeout(() => {
                    location.reload();
                }, 1500);

            } catch (error) {
                console.error('Import failed:', error);
                showToast('❌ Import failed: ' + error.message, 'error');
            }
        };

        reader.readAsText(file);
    };

    input.click();
}

// Clear all data (with confirmation)
function clearAllData() {
    if (!confirm('⚠️ WARNING: This will DELETE ALL data!\n\nThis action cannot be undone. Are you absolutely sure?')) {
        return;
    }

    if (!confirm('⚠️ FINAL WARNING!\n\nAll invoices, customers, employees, and expenses will be permanently deleted.\n\nProceed with deletion?')) {
        return;
    }

    try {
        // Clear all data except users
        localStorage.removeItem('outwardInvoices');
        localStorage.removeItem('inwardInvoices');
        localStorage.removeItem('customers');
        localStorage.removeItem('employees');
        localStorage.removeItem('attendance');
        localStorage.removeItem('manufacturingExpenses');
        localStorage.removeItem('recurringExpenses');

        showToast('✅ All data cleared!', 'success');

        setTimeout(() => {
            location.reload();
        }, 1000);
    } catch (error) {
        console.error('Clear failed:', error);
        showToast('❌ Clear failed: ' + error.message, 'error');
    }
}

// Export new functions
window.exportAllData = exportAllData;
window.importData = importData;
window.clearAllData = clearAllData;
