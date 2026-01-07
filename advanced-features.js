// =========================================
// SVR Manufacturing - Advanced Features Extension
// =========================================
// This file adds authentication, export/import, search, reports, and PDF features

// ===================================
// AUTHENTICATION SYSTEM
// ===================================

// Default users database
function initializeUsers() {
    let users = loadFromStorage('users');
    if (!users || users.length === 0) {
        users = [
            {
                id: '1',
                username: 'admin',
                password: 'admin123', // In production, use hashed passwords
                fullName: 'System Administrator',
                role: 'Admin',
                status: 'Active',
                createdAt: new Date().toISOString()
            }
        ];
        saveToStorage('users', users);
    }
    return users;
}

// Login function - LEGACY, now handled by auth.js
// This function is kept for backwards compatibility but auth logic is in auth.js
function login(username, password) {
    const users = initializeUsers();
    const user = users.find(u => u.username === username && u.password === password && u.status === 'Active');

    if (user) {
        // Log activity only - session is handled by auth.js
        logActivity('login', `User ${username} logged in`);
        return true;
    }
    return false;
}

// Logout function - now delegates to auth.js
function logout() {
    const user = getCurrentUser();
    if (user) {
        logActivity('logout', `User ${user.username} logged out`);
    }

    // Use auth.js clearSession function
    if (typeof clearSession === 'function') {
        clearSession();
    }

    // Hide app, show login
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginPage').style.display = 'flex';

    showToast('Logged out successfully', 'info');
}

// Get current user - now delegates to auth.js
function getCurrentUser() {
    // Use the new auth.js getSession function
    if (typeof getSession === 'function') {
        return getSession();
    }
    return null;
}

// Check authentication - now delegates to auth.js
function checkAuth() {
    // Use the new auth.js validateSession function
    if (typeof validateSession === 'function') {
        const isValid = validateSession();
        if (!isValid) {
            document.getElementById('appContainer').style.display = 'none';
            document.getElementById('loginPage').style.display = 'flex';
            return false;
        }
        return true;
    }
    return false;
}

// Handle login form submission
document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;

            if (login(username, password)) {
                document.getElementById('loginPage').style.display = 'none';
                document.getElementById('appContainer').style.display = 'flex';
                showToast(`Welcome back, ${getCurrentUser().fullName}!`, 'success');

                // Initialize app after login
                initializeApp();
            } else {
                showToast('Invalid username or password', 'error');
            }
        });
    }

    // Check if already logged in
    if (!checkAuth()) {
        console.log('Not authenticated, showing login page');
    } else {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('appContainer').style.display = 'flex';
    }
});

// User management functions
function openUserModal(userId = null) {
    // To be implemented with HTML modal
    showToast('User management modal - to be implemented', 'info');
}

// Activity logging
function logActivity(action, description) {
    let activities = loadFromStorage('activities') || [];
    activities.push({
        id: Date.now().toString(),
        user: getCurrentUser()?.username || 'System',
        action: action,
        description: description,
        timestamp: new Date().toISOString()
    });

    // Keep last 100 activities
    if (activities.length > 100) {
        activities = activities.slice(-100);
    }

    saveToStorage('activities', activities);
}

// ===================================
// BACKUP REMINDER SYSTEM
// ===================================

// Check if backup reminder should be shown
function checkBackupReminder() {
    const lastExport = localStorage.getItem('svr_last_export');
    const reminderDismissed = localStorage.getItem('svr_backup_reminder_dismissed');

    // If reminder was dismissed, check if it's been more than 24 hours
    if (reminderDismissed) {
        const dismissedAt = new Date(reminderDismissed);
        const hoursSinceDismissed = (new Date() - dismissedAt) / (1000 * 60 * 60);
        if (hoursSinceDismissed < 24) {
            return; // Don't show reminder yet
        }
    }

    // Calculate days since last export
    let daysSinceExport = 999; // Default to high number if never exported
    if (lastExport) {
        const lastExportDate = new Date(lastExport);
        daysSinceExport = Math.floor((new Date() - lastExportDate) / (1000 * 60 * 60 * 24));
    }

    // Show reminder if no export or more than 7 days
    if (daysSinceExport >= 7) {
        showBackupReminderBanner(daysSinceExport, !lastExport);
    }
}

// Show backup reminder banner
function showBackupReminderBanner(days, neverExported) {
    // Remove existing banner if any
    const existingBanner = document.getElementById('backupReminderBanner');
    if (existingBanner) {
        existingBanner.remove();
    }

    const message = neverExported
        ? "⚠️ You've never backed up your data! Export your data now to avoid losing it."
        : `⚠️ It's been ${days} days since your last backup. Export your data to keep it safe!`;

    const banner = document.createElement('div');
    banner.id = 'backupReminderBanner';
    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
        padding: 12px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        z-index: 10000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-size: 14px;
    `;

    banner.innerHTML = `
        <span>${message}</span>
        <div style="display: flex; gap: 10px; align-items: center;">
            <button onclick="exportToJSON(); dismissBackupReminder();" 
                    style="background: white; color: #d97706; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                📥 Export Now
            </button>
            <button onclick="dismissBackupReminder()" 
                    style="background: transparent; color: white; border: 1px solid white; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                Remind Later
            </button>
        </div>
    `;

    document.body.insertBefore(banner, document.body.firstChild);

    // Adjust main content to account for banner
    const appContainer = document.getElementById('appContainer');
    if (appContainer) {
        appContainer.style.marginTop = '60px';
    }
}

// Dismiss backup reminder for 24 hours
function dismissBackupReminder() {
    localStorage.setItem('svr_backup_reminder_dismissed', new Date().toISOString());

    const banner = document.getElementById('backupReminderBanner');
    if (banner) {
        banner.remove();
    }

    // Reset margin
    const appContainer = document.getElementById('appContainer');
    if (appContainer) {
        appContainer.style.marginTop = '';
    }
}

// Get last export info for display
function getLastExportInfo() {
    const lastExport = localStorage.getItem('svr_last_export');
    if (!lastExport) {
        return 'Never exported';
    }

    const date = new Date(lastExport);
    const now = new Date();
    const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
        return 'Today';
    } else if (daysDiff === 1) {
        return 'Yesterday';
    } else {
        return `${daysDiff} days ago (${date.toLocaleDateString()})`;
    }
}

// ===================================
// DATA EXPORT/IMPORT FUNCTIONS
// ===================================

// Export all data to JSON
function exportToJSON() {
    const allData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        exportedBy: getCurrentUser()?.username,
        data: {
            inwardInvoices: getInwardInvoices(),
            outwardInvoices: getOutwardInvoices(),
            customers: getCustomers(),
            employees: getEmployees(),
            attendance: getAttendanceRecords(),
            expenses: getExpenses(),
            salaryRecords: typeof getSalaryRecords === 'function' ? getSalaryRecords() : [],
            users: loadFromStorage('users') || [],
            activities: loadFromStorage('activities') || []
        }
    };

    const jsonString = JSON.stringify(allData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `SVR_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Track last export date for backup reminder
    localStorage.setItem('svr_last_export', new Date().toISOString());

    logActivity('export', 'Exported all data to JSON');
    showToast('Data exported successfully!', 'success');
}

// Export to Excel using SheetJS
function exportToExcel(module) {
    if (typeof XLSX === 'undefined') {
        showToast('Excel library not loaded', 'error');
        return;
    }

    let data, filename;

    switch (module) {
        case 'inward':
            data = getInwardInvoices();
            filename = 'Inward_Invoices';
            break;
        case 'outward':
            data = getOutwardInvoices();
            filename = 'Outward_Invoices';
            break;
        case 'employees':
            data = getEmployees();
            filename = 'Employees';
            break;
        case 'attendance':
            data = getAttendanceRecords();
            filename = 'Attendance_Records';
            break;
        default:
            showToast('Invalid module', 'error');
            return;
    }

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, module.charAt(0).toUpperCase() + module.slice(1));

    // Download
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);

    logActivity('export', `Exported ${module} to Excel`);
    showToast(`${filename} exported to Excel!`, 'success');
}

// Import from JSON
function importFromJSON(fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
        showToast('Please select a valid JSON file', 'error');
        fileInput.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            let importData;

            // Try to parse JSON
            try {
                importData = JSON.parse(e.target.result);
            } catch (parseError) {
                throw new Error('File is not valid JSON. Please select a valid backup file.');
            }

            // Validate structure
            if (!importData || typeof importData !== 'object') {
                throw new Error('Invalid file structure. Expected an object.');
            }

            if (!importData.data || typeof importData.data !== 'object') {
                throw new Error('Invalid backup file format. Missing "data" property.');
            }

            // Validate data arrays (all should be arrays or undefined)
            const dataKeys = ['inwardInvoices', 'outwardInvoices', 'customers', 'employees', 'attendance', 'expenses', 'salaryRecords'];
            for (const key of dataKeys) {
                if (importData.data[key] !== undefined && !Array.isArray(importData.data[key])) {
                    throw new Error(`Invalid data format: "${key}" should be an array.`);
                }
            }

            // Count items to be imported
            let itemCount = 0;
            dataKeys.forEach(key => {
                if (importData.data[key]) {
                    itemCount += importData.data[key].length;
                }
            });

            if (itemCount === 0) {
                showToast('The backup file contains no data to import', 'warning');
                fileInput.value = '';
                return;
            }

            // Show import summary
            const exportDate = importData.exportDate ? new Date(importData.exportDate).toLocaleDateString() : 'Unknown date';
            const exportedBy = importData.exportedBy || 'Unknown';

            const confirmMessage = `Import data from ${exportDate}?
            
Exported by: ${exportedBy}
Total items: ${itemCount}

• Invoices (In): ${importData.data.inwardInvoices?.length || 0}
• Invoices (Out): ${importData.data.outwardInvoices?.length || 0}
• Customers: ${importData.data.customers?.length || 0}
• Employees: ${importData.data.employees?.length || 0}
• Attendance: ${importData.data.attendance?.length || 0}
• Expenses: ${importData.data.expenses?.length || 0}
• Salary Records: ${importData.data.salaryRecords?.length || 0}

This will merge with existing data.`;

            if (!confirm(confirmMessage)) {
                fileInput.value = '';
                return;
            }

            // Merge data
            if (importData.data.inwardInvoices) {
                const existing = getInwardInvoices();
                const merged = mergeArrays(existing, importData.data.inwardInvoices);
                saveToStorage('inwardInvoices', merged);
            }

            if (importData.data.outwardInvoices) {
                const existing = getOutwardInvoices();
                const merged = mergeArrays(existing, importData.data.outwardInvoices);
                saveToStorage('outwardInvoices', merged);
            }

            if (importData.data.customers) {
                const existing = getCustomers();
                const merged = mergeArrays(existing, importData.data.customers);
                saveToStorage('customers', merged);
            }

            if (importData.data.employees) {
                const existing = getEmployees();
                const merged = mergeArrays(existing, importData.data.employees);
                saveToStorage('employees', merged);
            }

            if (importData.data.attendance) {
                const existing = getAttendanceRecords();
                const merged = mergeArrays(existing, importData.data.attendance);
                saveToStorage('attendance', merged);
            }

            if (importData.data.expenses) {
                const existing = getExpenses();
                const merged = mergeArrays(existing, importData.data.expenses);
                saveToStorage('expenses', merged);
            }

            if (importData.data.salaryRecords) {
                const existing = typeof getSalaryRecords === 'function' ? getSalaryRecords() : [];
                const merged = mergeArrays(existing, importData.data.salaryRecords);
                localStorage.setItem('salaryRecords', JSON.stringify(merged));
            }

            logActivity('import', 'Imported data from JSON backup');
            showToast('Data imported successfully! Reloading...', 'success');

            // Reload the page to refresh all modules with imported data
            setTimeout(() => {
                location.reload();
            }, 1000);

        } catch (error) {
            showToast('Error importing data: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);

    // Reset file input
    fileInput.value = '';
}

// Merge arrays by ID, newer data wins
function mergeArrays(existing, imported) {
    const idMap = new Map();

    // Add existing items
    existing.forEach(item => {
        if (item.id) idMap.set(item.id, item);
    });

    // Add/update with imported items
    imported.forEach(item => {
        if (item.id) idMap.set(item.id, item);
    });

    return Array.from(idMap.values());
}

// ===================================
// AUTOMATIC BACKUP SYSTEM
// ===================================

function createManualBackup() {
    const backup = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        createdBy: getCurrentUser()?.username,
        size: calculateDataSize(),
        data: {
            inwardInvoices: getInwardInvoices(),
            outwardInvoices: getOutwardInvoices(),
            customers: getCustomers(),
            employees: getEmployees(),
            attendance: getAttendanceRecords(),
            expenses: getExpenses(),
            salaryRecords: typeof getSalaryRecords === 'function' ? getSalaryRecords() : []
        }
    };

    let backups = loadFromStorage('backups') || [];
    backups.push(backup);

    // Keep last 7 backups
    if (backups.length > 7) {
        backups = backups.slice(-7);
    }

    saveToStorage('backups', backups);
    logActivity('backup', 'Created manual backup');
    showToast('Backup created successfully!', 'success');

    loadBackupList();
}

function calculateDataSize() {
    const data = {
        inwardInvoices: getInwardInvoices(),
        outwardInvoices: getOutwardInvoices(),
        customers: getCustomers(),
        employees: getEmployees(),
        attendance: getAttendanceRecords(),
        expenses: getExpenses()
    };
    return JSON.stringify(data).length;
}

function toggleAutoBackup(enabled) {
    saveToStorage('autoBackupEnabled', enabled);
    if (enabled) {
        scheduleAutoBackup();
        showToast('Auto-backup enabled', 'success');
    } else {
        showToast('Auto-backup disabled', 'info');
    }
}

function scheduleAutoBackup() {
    // Check daily at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const timeUntilMidnight = tomorrow - now;

    setTimeout(() => {
        if (loadFromStorage('autoBackupEnabled')) {
            createManualBackup();
            scheduleAutoBackup(); // Schedule next backup
        }
    }, timeUntilMidnight);

    // Update UI
    const nextBackupElem = document.getElementById('nextBackupTime');
    if (nextBackupElem) {
        nextBackupElem.textContent = `Next backup: ${tomorrow.toLocaleString()}`;
    }
}

function loadBackupList() {
    const backups = loadFromStorage('backups') || [];
    const container = document.getElementById('backupList');

    if (!container) return;

    if (backups.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No backups yet</p>';
        return;
    }

    let html = '';
    backups.reverse().forEach(backup => {
        const date = new Date(backup.date);
        const sizeKB = (backup.size / 1024).toFixed(2);
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-md);">
                <div>
                    <strong>${date.toLocaleString()}</strong>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">
                        By: ${backup.createdBy} | Size: ${sizeKB} KB
                    </div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="restoreBackup('${backup.id}')">
                    ↩️ Restore
                </button>
            </div>
        `;
    });

    container.innerHTML = html;
}

function restoreBackup(backupId) {
    if (!confirm('Are you sure you want to restore this backup? Current data will be replaced.')) {
        return;
    }

    const backups = loadFromStorage('backups') || [];
    const backup = backups.find(b => b.id === backupId);

    if (!backup) {
        showToast('Backup not found', 'error');
        return;
    }

    // Restore data
    saveToStorage('inwardInvoices', backup.data.inwardInvoices);
    saveToStorage('outwardInvoices', backup.data.outwardInvoices);
    saveToStorage('customers', backup.data.customers || []);
    saveToStorage('employees', backup.data.employees);
    saveToStorage('attendance', backup.data.attendance);
    saveToStorage('expenses', backup.data.expenses || []);
    localStorage.setItem('salaryRecords', JSON.stringify(backup.data.salaryRecords || []));

    logActivity('restore', `Restored backup from ${backup.date}`);
    showToast('Backup restored successfully!', 'success');

    // Reload page
    location.reload();
}

// ===================================
// SEARCH & FILTER FUNCTIONS
// ===================================

// Global search across all modules
function globalSearch(query) {
    if (!query || query.length < 2) return;

    query = query.toLowerCase();
    const results = {
        inwardInvoices: [],
        outwardInvoices: [],
        employees: [],
        attendance: []
    };

    // Search inward invoices
    getInwardInvoices().forEach(inv => {
        if (inv.customer.toLowerCase().includes(query) ||
            inv.invoiceNo.toLowerCase().includes(query) ||
            inv.material.toLowerCase().includes(query)) {
            results.inwardInvoices.push(inv);
        }
    });

    // Search outward invoices
    getOutwardInvoices().forEach(inv => {
        if (inv.buyerName.toLowerCase().includes(query) ||
            inv.invoiceNo.toLowerCase().includes(query) ||
            inv.gstin.toLowerCase().includes(query)) {
            results.outwardInvoices.push(inv);
        }
    });

    // Search employees
    getEmployees().forEach(emp => {
        if (emp.name.toLowerCase().includes(query) ||
            emp.empId.toLowerCase().includes(query) ||
            emp.department.toLowerCase().includes(query)) {
            results.employees.push(emp);
        }
    });

    return results;
}

// Filter functions
function filterByDateRange(data, startDate, endDate, dateField = 'date') {
    return data.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate >= new Date(startDate) && itemDate <= new Date(endDate);
    });
}

function filterByStatus(data, status) {
    return data.filter(item => item.paymentStatus === status || item.status === status);
}

function filterByCustomer(data, customer) {
    return data.filter(item =>
        (item.customer && item.customer.toLowerCase().includes(customer.toLowerCase())) ||
        (item.buyerName && item.buyerName.toLowerCase().includes(customer.toLowerCase()))
    );
}

// ===================================
// REPORTS & ANALYTICS
// ===================================

// Initialize charts
function initializeCharts() {
    if (typeof Chart === 'undefined') {
        console.log('Chart.js not loaded yet');
        return;
    }

    createRevenueChart();
    createStatusChart();
}

// Revenue chart (monthly)
function createRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    const outwardInvoices = getOutwardInvoices();
    const monthlyData = {};

    // Aggregate by month
    outwardInvoices.forEach(inv => {
        const month = new Date(inv.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        monthlyData[month] = (monthlyData[month] || 0) + parseFloat(inv.total || 0);
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(monthlyData),
            datasets: [{
                label: 'Revenue (₹)',
                data: Object.values(monthlyData),
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Status pie chart
function createStatusChart() {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    const allInvoices = [...getInwardInvoices(), ...getOutwardInvoices()];
    const statusCount = {
        'Paid': 0,
        'Pending': 0,
        'Partial': 0
    };

    allInvoices.forEach(inv => {
        statusCount[inv.paymentStatus] = (statusCount[inv.paymentStatus] || 0) + 1;
    });

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(statusCount),
            datasets: [{
                data: Object.values(statusCount),
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Generate reports
function generateMonthlyReport() {
    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            showToast('PDF library not loaded', 'error');
            return;
        }

        const doc = new jsPDF();
        const outwardInvoices = getOutwardInvoices();

        // Group by month
        const monthlyData = {};
        outwardInvoices.forEach(inv => {
            const month = new Date(inv.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            if (!monthlyData[month]) {
                monthlyData[month] = { invoices: [], total: 0 };
            }
            monthlyData[month].invoices.push(inv);
            monthlyData[month].total += parseFloat(inv.total || 0);
        });

        // Header
        doc.setFontSize(20);
        doc.setTextColor(102, 126, 234);
        doc.text('SVR Manufacturing', 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Monthly Revenue Report', 105, 22, { align: 'center' });
        doc.setFontSize(9);
        doc.setTextColor(128, 128, 128);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });

        let yPos = 40;

        // Table for each month
        Object.keys(monthlyData).forEach((month, index) => {
            const data = monthlyData[month];

            // Add new page if needed
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            // Month header
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text(month, 14, yPos);
            yPos += 7;

            // Table
            const tableData = data.invoices.map(inv => [
                inv.invoiceNo,
                new Date(inv.date).toLocaleDateString(),
                inv.buyerName,
                `₹${parseFloat(inv.total || 0).toFixed(2)}`,
                inv.paymentStatus
            ]);

            doc.autoTable({
                startY: yPos,
                head: [['Invoice No', 'Date', 'Customer', 'Amount', 'Status']],
                body: tableData,
                foot: [[{ content: `Total: ₹${data.total.toFixed(2)}`, colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }]],
                styles: { fontSize: 9, cellPadding: 2 },
                headStyles: { fillColor: [102, 126, 234] },
                theme: 'striped'
            });

            yPos = doc.lastAutoTable.finalY + 10;
        });

        // Grand total
        const grandTotal = Object.values(monthlyData).reduce((sum, data) => sum + data.total, 0);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Grand Total: ₹${grandTotal.toFixed(2)}`, 14, yPos);

        // Save
        doc.save(`Monthly_Revenue_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('Monthly report generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating monthly report:', error);
        showToast('Error generating report: ' + error.message, 'error');
    }
}

function generateOutstandingReport() {
    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            showToast('PDF library not loaded', 'error');
            return;
        }

        const doc = new jsPDF();

        // Get pending invoices
        const allInvoices = [
            ...getInwardInvoices().map(inv => ({ ...inv, type: 'Purchase' })),
            ...getOutwardInvoices().map(inv => ({ ...inv, type: 'Sales' }))
        ];

        const pendingInvoices = allInvoices.filter(inv =>
            inv.paymentStatus === 'Pending' || inv.paymentStatus === 'Partial'
        );

        // Header
        doc.setFontSize(20);
        doc.setTextColor(102, 126, 234);
        doc.text('SVR Manufacturing', 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Outstanding Payments Report', 105, 22, { align: 'center' });
        doc.setFontSize(9);
        doc.setTextColor(128, 128, 128);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });

        if (pendingInvoices.length === 0) {
            doc.setFontSize(12);
            doc.text('No outstanding payments found!', 105, 50, { align: 'center' });
        } else {
            // Table
            const tableData = pendingInvoices.map(inv => [
                inv.type,
                inv.invoiceNo || inv.supplierInvoiceNo,
                new Date(inv.date).toLocaleDateString(),
                inv.buyerName || inv.customer,
                `₹${parseFloat(inv.total || inv.totalAmount || 0).toFixed(2)}`,
                inv.paymentStatus
            ]);

            doc.autoTable({
                startY: 40,
                head: [['Type', 'Invoice No', 'Date', 'Party', 'Amount', 'Status']],
                body: tableData,
                styles: { fontSize: 9, cellPadding: 2 },
                headStyles: { fillColor: [239, 68, 68] },
                theme: 'striped'
            });

            // Summary
            const totalOutstanding = pendingInvoices.reduce((sum, inv) =>
                sum + parseFloat(inv.total || inv.totalAmount || 0), 0
            );

            doc.setFontSize(12);
            doc.text(`Total Outstanding: ₹${totalOutstanding.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);
            doc.text(`Number of Pending Invoices: ${pendingInvoices.length}`, 14, doc.lastAutoTable.finalY + 18);
        }

        doc.save(`Outstanding_Payments_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('Outstanding payments report generated!', 'success');
    } catch (error) {
        console.error('Error generating outstanding report:', error);
        showToast('Error generating report: ' + error.message, 'error');
    }
}

function generateAttendanceReport() {
    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            showToast('PDF library not loaded', 'error');
            return;
        }

        const doc = new jsPDF();
        const attendance = getAttendanceRecords();
        const employees = getEmployees();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(102, 126, 234);
        doc.text('SVR Manufacturing', 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Attendance Summary Report', 105, 22, { align: 'center' });
        doc.setFontSize(9);
        doc.setTextColor(128, 128, 128);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });

        if (attendance.length === 0) {
            doc.setFontSize(12);
            doc.text('No attendance records found!', 105, 50, { align: 'center' });
        } else {
            // Calculate statistics per employee
            const employeeStats = {};

            attendance.forEach(record => {
                if (!employeeStats[record.empId]) {
                    employeeStats[record.empId] = {
                        name: record.name,
                        present: 0,
                        absent: 0,
                        halfDay: 0,
                        leave: 0
                    };
                }

                const status = record.status.toLowerCase();
                if (status.includes('present')) employeeStats[record.empId].present++;
                else if (status.includes('absent')) employeeStats[record.empId].absent++;
                else if (status.includes('half')) employeeStats[record.empId].halfDay++;
                else if (status.includes('leave')) employeeStats[record.empId].leave++;
            });

            // Table
            const tableData = Object.values(employeeStats).map(stats => [
                stats.name,
                stats.present,
                stats.absent,
                stats.halfDay,
                stats.leave,
                stats.present + stats.absent + stats.halfDay + stats.leave
            ]);

            doc.autoTable({
                startY: 40,
                head: [['Employee', 'Present', 'Absent', 'Half Day', 'Leave', 'Total Days']],
                body: tableData,
                styles: { fontSize: 9, cellPadding: 2 },
                headStyles: { fillColor: [59, 130, 246] },
                theme: 'striped'
            });

            // Summary
            doc.setFontSize(12);
            doc.text(`Total Employees: ${employees.length}`, 14, doc.lastAutoTable.finalY + 10);
            doc.text(`Total Attendance Records: ${attendance.length}`, 14, doc.lastAutoTable.finalY + 18);
        }

        doc.save(`Attendance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('Attendance report generated!', 'success');
    } catch (error) {
        console.error('Error generating attendance report:', error);
        showToast('Error generating report: ' + error.message, 'error');
    }
}

function generateGSTReport() {
    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            showToast('PDF library not loaded', 'error');
            return;
        }

        const doc = new jsPDF();
        const outwardInvoices = getOutwardInvoices();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(102, 126, 234);
        doc.text('SVR Manufacturing', 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('GST Tax Summary Report', 105, 22, { align: 'center' });
        doc.setFontSize(9);
        doc.setTextColor(128, 128, 128);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 28, { align: 'center' });

        if (outwardInvoices.length === 0) {
            doc.setFontSize(12);
            doc.text('No GST records found!', 105, 50, { align: 'center' });
        } else {
            // Calculate GST summary
            let totalTaxable = 0;
            let totalCGST = 0;
            let totalSGST = 0;
            let totalIGST = 0;

            const tableData = outwardInvoices.map(inv => {
                const taxable = parseFloat(inv.taxableValue || 0);
                const cgst = parseFloat(inv.cgst || 0);
                const sgst = parseFloat(inv.sgst || 0);
                const igst = parseFloat(inv.igst || 0);

                totalTaxable += taxable;
                totalCGST += cgst;
                totalSGST += sgst;
                totalIGST += igst;

                return [
                    inv.invoiceNo,
                    new Date(inv.date).toLocaleDateString(),
                    inv.buyerName,
                    inv.gstin || 'N/A',
                    `₹${taxable.toFixed(2)}`,
                    `₹${cgst.toFixed(2)}`,
                    `₹${sgst.toFixed(2)}`,
                    `₹${igst.toFixed(2)}`,
                    `₹${parseFloat(inv.total || 0).toFixed(2)}`
                ];
            });

            doc.autoTable({
                startY: 40,
                head: [['Invoice No', 'Date', 'Customer', 'GSTIN', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total']],
                body: tableData,
                foot: [[
                    { content: 'Total', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
                    `₹${totalTaxable.toFixed(2)}`,
                    `₹${totalCGST.toFixed(2)}`,
                    `₹${totalSGST.toFixed(2)}`,
                    `₹${totalIGST.toFixed(2)}`,
                    `₹${(totalTaxable + totalCGST + totalSGST + totalIGST).toFixed(2)}`
                ]],
                styles: { fontSize: 8, cellPadding: 1.5 },
                headStyles: { fillColor: [16, 185, 129] },
                footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
                theme: 'striped',
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 20 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 25 }
                }
            });

            // Summary box
            const yPos = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(11);
            doc.setFillColor(240, 240, 240);
            doc.rect(14, yPos, 180, 30, 'F');
            doc.setTextColor(0, 0, 0);
            doc.text('GST Summary', 17, yPos + 7);
            doc.setFontSize(9);
            doc.text(`Total CGST Collected: ₹${totalCGST.toFixed(2)}`, 17, yPos + 14);
            doc.text(`Total SGST Collected: ₹${totalSGST.toFixed(2)}`, 17, yPos + 20);
            doc.text(`Total IGST Collected: ₹${totalIGST.toFixed(2)}`, 17, yPos + 26);
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text(`Total Tax Collected: ₹${(totalCGST + totalSGST + totalIGST).toFixed(2)}`, 120, yPos + 20);
        }

        doc.save(`GST_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('GST summary generated!', 'success');
    } catch (error) {
        console.error('Error generating GST report:', error);
        showToast('Error generating report: ' + error.message, 'error');
    }
}

function exportAllReports() {
    showToast('Generating all reports. This may take a moment...', 'info');

    // Generate all reports with slight delays to avoid overwhelming the browser
    setTimeout(() => generateMonthlyReport(), 100);
    setTimeout(() => generateOutstandingReport(), 500);
    setTimeout(() => generateAttendanceReport(), 900);
    setTimeout(() => generateGSTReport(), 1300);

    setTimeout(() => {
        showToast('All reports generated successfully!', 'success');
    }, 2000);
}

// ===================================
// ENHANCED PDF GENERATION
// ===================================

// Will be implemented using jsPDF library
// This will replace the current browser print invoice function

// ===================================
// ENHANCED INVOICE MANAGEMENT
// ===================================

// Better invoice number generation with locks
const invoiceNumberLocks = new Map();

function getNextInvoiceNumberEnhanced(type) {
    // Check if number is locked
    const lockKey = `${type}_lock`;
    if (invoiceNumberLocks.has(lockKey)) {
        throw new Error('Invoice number generation in progress');
    }

    // Lock
    invoiceNumberLocks.set(lockKey, true);

    try {
        const invoices = type === 'inward' ? getInwardInvoices() : getOutwardInvoices();
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');

        // Find highest number for this month
        const prefix = type === 'inward' ? 'INV-IN' : 'SVR/TI';
        const thisMonthInvoices = invoices.filter(inv =>
            inv.invoiceNo.startsWith(`${prefix}/${year}/${month}`)
        );

        let nextNum = 1;
        if (thisMonthInvoices.length > 0) {
            const numbers = thisMonthInvoices.map(inv => {
                const parts = inv.invoiceNo.split('/');
                return parseInt(parts[parts.length - 1]);
            });
            nextNum = Math.max(...numbers) + 1;
        }

        const invoiceNo = `${prefix}/${year}/${month}/${String(nextNum).padStart(4, '0')}`;

        return invoiceNo;
    } finally {
        // Unlock
        invoiceNumberLocks.delete(lockKey);
    }
}

// Duplicate detection
function checkDuplicateInvoice(invoiceNo, type) {
    const invoices = type === 'inward' ? getInwardInvoices() : getOutwardInvoices();
    return invoices.some(inv => inv.invoiceNo === invoiceNo);
}

// ===================================
// MODULE LOAD FUNCTIONS
// ===================================

function loadReportsModule() {
    setTimeout(() => {
        initializeCharts();
    }, 100);
}

function loadSettingsModule() {
    // Load users
    loadUsers();

    // Load backups
    loadBackupList();

    // Set auto-backup checkbox
    const autoBackupEnabled = loadFromStorage('autoBackupEnabled');
    const checkbox = document.getElementById('autoBackupEnabled');
    if (checkbox) {
        checkbox.checked = autoBackupEnabled || false;
    }

    // Schedule auto-backup if enabled
    if (autoBackupEnabled) {
        scheduleAutoBackup();
    }
}

function loadUsers() {
    const users = initializeUsers();
    const tbody = document.getElementById('usersTableBody');

    if (!tbody) return;

    let html = '';
    users.forEach(user => {
        const badgeClass = user.status === 'Active' ? 'success' : 'danger';
        html += `
            <tr>
                <td>${user.username}</td>
                <td>${user.fullName}</td>
                <td>${user.role}</td>
                <td><span class="badge badge-${badgeClass}">${user.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn edit" onclick="editUser('${user.id}')" title="Edit">✏️</button>
                        ${user.username !== 'admin' ? `<button class="icon-btn delete" onclick="deleteUser('${user.id}')" title="Delete">🗑️</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Export advanced features to global scope
window.login = login;
window.logout = logout;
window.exportToJSON = exportToJSON;
window.exportToExcel = exportToExcel;
window.importFromJSON = importFromJSON;
window.createManualBackup = createManualBackup;
window.toggleAutoBackup = toggleAutoBackup;
window.restoreBackup = restoreBackup;
window.generateMonthlyReport = generateMonthlyReport;
window.generateOutstandingReport = generateOutstandingReport;
window.generateAttendanceReport = generateAttendanceReport;
window.generateGSTReport = generateGSTReport;
window.exportAllReports = exportAllReports;
window.openUserModal = openUserModal;
window.checkBackupReminder = checkBackupReminder;
window.dismissBackupReminder = dismissBackupReminder;
window.getLastExportInfo = getLastExportInfo;
