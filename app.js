// ===================================
// SVR Manufacturing - Application Logic
// ===================================

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

// ===================================
// INITIALIZATION
// ===================================

function initializeApp() {
    // Set default date for attendance (if element exists)
    const attendanceDateEl = document.getElementById('attendanceDate');
    if (attendanceDateEl) {
        attendanceDateEl.valueAsDate = new Date();
    }

    // Setup navigation
    setupNavigation();

    // Auto-calculate amounts in forms
    setupFormCalculations();

    // Load dashboard
    loadDashboard();

    // Generate next invoice number
    generateOutwardInvoiceNumber();

    // Check backup reminder (delayed to not block UI)
    setTimeout(() => {
        if (typeof checkBackupReminder === 'function') {
            checkBackupReminder();
        }
        if (typeof updateBackupIndicator === 'function') {
            updateBackupIndicator();
        }
        if (typeof updateStorageIndicator === 'function') {
            updateStorageIndicator();
        }
        // Check for expense reminders
        if (typeof checkExpenseReminders === 'function') {
            checkExpenseReminders();
        }
    }, 2000);
}

// ===================================
// NAVIGATION SYSTEM
// ===================================

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            // Remove active class from all links and modules
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));

            // Add active class to clicked link
            this.classList.add('active');

            // Show corresponding module
            const moduleId = this.getAttribute('data-module');
            const moduleElement = document.getElementById(moduleId);
            if (moduleElement) moduleElement.classList.add('active');

            // Load module data
            loadModuleData(moduleId);
        });
    });
}

function loadModuleData(moduleId) {
    switch (moduleId) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'inward-invoice':
            loadInwardInvoices();
            populateCustomerFilterDropdowns();
            break;
        case 'outward-invoice':
            loadOutwardInvoices();
            populateCustomerFilterDropdowns();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'hr-management':
            loadHRModule();
            break;
        case 'employees':
            // Legacy support - redirect to HR
            loadEmployees();
            break;
        case 'attendance':
            // Legacy support
            loadAttendanceUI();
            loadAttendanceHistory();
            break;
        case 'expenses':
            if (typeof loadExpenses === 'function') {
                loadExpenses();
            }
            break;
        case 'salary':
            // Legacy support
            if (typeof loadSalaryTable === 'function') {
                loadSalaryTable();
                if (typeof initSalaryModule === 'function') {
                    initSalaryModule();
                }
            }
            break;
        case 'production':
            if (typeof loadProductionModule === 'function') {
                loadProductionModule();
            }
            break;
        case 'reports':
            if (typeof loadReportsModule === 'function') {
                loadReportsModule();
            }
            break;
        case 'settings':
            if (typeof loadSettingsModule === 'function') {
                loadSettingsModule();
            }
            break;
    }
}

// ===================================
// HR MANAGEMENT MODULE
// ===================================

// Load HR Module - loads both employees and salary data
function loadHRModule() {
    // Load employees
    loadEmployees();

    // Load salary data
    if (typeof loadSalaryTable === 'function') {
        loadSalaryTable();
        if (typeof initSalaryModule === 'function') {
            initSalaryModule();
        }
    }

    // Update HR summary cards
    updateHRSummary();

    // Set default attendance date if not set
    const attendanceDateEl = document.getElementById('attendanceDate');
    if (attendanceDateEl && !attendanceDateEl.value) {
        attendanceDateEl.valueAsDate = new Date();
    }
}

// Update HR summary cards
function updateHRSummary() {
    const employees = getEmployees();

    // Update total employees count
    const hrTotalEmployeesEl = document.getElementById('hrTotalEmployees');
    if (hrTotalEmployeesEl) {
        hrTotalEmployeesEl.textContent = employees.length;
    }
}

// Switch HR Tab
function switchHRTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.hr-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary', 'active');
        } else {
            btn.classList.remove('btn-primary', 'active');
            btn.classList.add('btn-secondary');
        }
    });

    // Show/hide tab content
    document.querySelectorAll('.hr-tab-content').forEach(content => {
        content.style.display = 'none';
    });

    const activeContent = document.getElementById(`hr-${tabName}`);
    if (activeContent) {
        activeContent.style.display = 'block';
    }

    // Load tab-specific data
    if (tabName === 'attendance') {
        loadAttendanceUI();
        loadAttendanceHistory();
    } else if (tabName === 'employees-salary') {
        loadEmployees();
        if (typeof loadSalaryTable === 'function') {
            loadSalaryTable();
        }
    }
}

// ===================================
// LOCAL STORAGE UTILITIES
// ===================================

function saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function loadFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

function getInwardInvoices() {
    return loadFromStorage('inwardInvoices') || [];
}

function getOutwardInvoices() {
    return loadFromStorage('outwardInvoices') || [];
}

function getEmployees() {
    return loadFromStorage('employees') || [];
}

function getAttendanceRecords() {
    return loadFromStorage('attendance') || [];
}

// ===================================
// DASHBOARD MODULE
// ===================================

function loadDashboard() {
    const inwardInvoices = getInwardInvoices();
    const outwardInvoices = getOutwardInvoices();
    const employees = getEmployees();

    // DEBUG: Log first invoice to see structure
    if (outwardInvoices.length > 0) {
        console.log('First Outward Invoice:', outwardInvoices[0]);
        console.log('Available keys:', Object.keys(outwardInvoices[0]));
    }
    if (inwardInvoices.length > 0) {
        console.log('First Inward Invoice:', inwardInvoices[0]);
        console.log('Available keys:', Object.keys(inwardInvoices[0]));
    }

    // Update statistics - Note: IDs are swapped in HTML to show amounts prominently
    document.getElementById('totalInward').textContent = `${inwardInvoices.length} invoices`;
    document.getElementById('totalOutward').textContent = `${outwardInvoices.length} invoices`;
    const totalEmployeesEl = document.getElementById('totalEmployees');
    if (totalEmployeesEl) {
        totalEmployeesEl.textContent = employees.length;
    }

    // Calculate total costs for outward invoices (check multiple field names)
    const totalOutwardCost = outwardInvoices.reduce((sum, inv) => {
        // Try different field names for the total amount
        const amount = parseFloat(inv.total) || parseFloat(inv.totalAmount) || parseFloat(inv.grandTotal) || parseFloat(inv.amount) || 0;
        return sum + amount;
    }, 0);
    const totalOutwardCostEl = document.getElementById('totalOutwardCost');
    if (totalOutwardCostEl) {
        totalOutwardCostEl.textContent = `₹${totalOutwardCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }

    // Calculate total costs for inward invoices (check multiple field names)
    const totalInwardCost = inwardInvoices.reduce((sum, inv) => {
        // Try different field names for the amount
        const amount = parseFloat(inv.amount) || parseFloat(inv.total) || parseFloat(inv.totalAmount) || parseFloat(inv.grandTotal) || 0;
        return sum + amount;
    }, 0);
    const totalInwardCostEl = document.getElementById('totalInwardCost');
    if (totalInwardCostEl) {
        totalInwardCostEl.textContent = `₹${totalInwardCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }

    // Calculate pending sales (outward invoices not paid)
    const outwardPending = outwardInvoices.filter(inv => inv.paymentStatus !== 'Paid');
    const pendingSalesAmount = outwardPending.reduce((sum, inv) => {
        const totalAmount = parseFloat(inv.total) || parseFloat(inv.totalAmount) || parseFloat(inv.grandTotal) || parseFloat(inv.amount) || 0;
        const amountPaid = parseFloat(inv.amountPaid) || 0;
        // For partial payments, only count the remaining balance
        const pendingAmount = totalAmount - amountPaid;
        return sum + Math.max(0, pendingAmount);
    }, 0);
    const pendingSalesAmountEl = document.getElementById('pendingSalesAmount');
    if (pendingSalesAmountEl) {
        pendingSalesAmountEl.textContent = `₹${pendingSalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    const pendingSalesCountEl = document.getElementById('pendingSalesCount');
    if (pendingSalesCountEl) {
        pendingSalesCountEl.textContent = `${outwardPending.length} invoices unpaid`;
    }

    // Calculate pending purchase (inward invoices not paid)
    const inwardPending = inwardInvoices.filter(inv => inv.paymentStatus !== 'Paid');
    const pendingPurchaseAmount = inwardPending.reduce((sum, inv) => {
        const totalAmount = parseFloat(inv.amount) || parseFloat(inv.total) || parseFloat(inv.totalAmount) || parseFloat(inv.grandTotal) || 0;
        const amountPaid = parseFloat(inv.amountPaid) || 0;
        // For partial payments, only count the remaining balance
        const pendingAmount = totalAmount - amountPaid;
        return sum + Math.max(0, pendingAmount);
    }, 0);
    const pendingPurchaseAmountEl = document.getElementById('pendingPurchaseAmount');
    if (pendingPurchaseAmountEl) {
        pendingPurchaseAmountEl.textContent = `₹${pendingPurchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    const pendingPurchaseCountEl = document.getElementById('pendingPurchaseCount');
    if (pendingPurchaseCountEl) {
        pendingPurchaseCountEl.textContent = `${inwardPending.length} invoices unpaid`;
    }

    // Calculate net pending (Pending Sales - Pending Purchase)
    const netPending = pendingSalesAmount - pendingPurchaseAmount;
    const netPendingEl = document.getElementById('netPendingAmount');
    if (netPendingEl) {
        const prefix = netPending >= 0 ? '₹' : '-₹';
        const absValue = Math.abs(netPending);
        netPendingEl.textContent = `${prefix}${absValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        // Green if positive (customers owe more), Red if negative (you owe more)
        netPendingEl.style.color = netPending >= 0 ? '#10b981' : '#ef4444';
    }

    // Calculate net balance (Outward - Inward)
    const netBalance = totalOutwardCost - totalInwardCost;
    const netBalanceEl = document.getElementById('netBalance');
    if (netBalanceEl) {
        const prefix = netBalance >= 0 ? '₹' : '-₹';
        const absValue = Math.abs(netBalance);
        netBalanceEl.textContent = `${prefix}${absValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        // Change color based on positive/negative
        netBalanceEl.style.color = netBalance >= 0 ? '#10b981' : '#ef4444';
    }

    // Calculate current month sales and purchase totals
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-indexed

    // Filter outward invoices for current month
    const currentMonthOutward = outwardInvoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate.getFullYear() === currentYear && invDate.getMonth() === currentMonth;
    });
    const currentMonthSalesTotal = currentMonthOutward.reduce((sum, inv) => {
        const amount = parseFloat(inv.total) || parseFloat(inv.totalAmount) || parseFloat(inv.grandTotal) || parseFloat(inv.amount) || 0;
        return sum + amount;
    }, 0);

    // Filter inward invoices for current month
    const currentMonthInward = inwardInvoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate.getFullYear() === currentYear && invDate.getMonth() === currentMonth;
    });
    const currentMonthPurchaseTotal = currentMonthInward.reduce((sum, inv) => {
        const amount = parseFloat(inv.amount) || parseFloat(inv.total) || parseFloat(inv.totalAmount) || parseFloat(inv.grandTotal) || 0;
        return sum + amount;
    }, 0);

    // Update current month sales card
    const currentMonthSalesAmountEl = document.getElementById('currentMonthSalesAmount');
    if (currentMonthSalesAmountEl) {
        currentMonthSalesAmountEl.textContent = `₹${currentMonthSalesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    const currentMonthSalesCountEl = document.getElementById('currentMonthSalesCount');
    if (currentMonthSalesCountEl) {
        currentMonthSalesCountEl.textContent = `${currentMonthOutward.length} invoice${currentMonthOutward.length !== 1 ? 's' : ''} this month`;
    }

    // Update current month purchase card
    const currentMonthPurchaseAmountEl = document.getElementById('currentMonthPurchaseAmount');
    if (currentMonthPurchaseAmountEl) {
        currentMonthPurchaseAmountEl.textContent = `₹${currentMonthPurchaseTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    const currentMonthPurchaseCountEl = document.getElementById('currentMonthPurchaseCount');
    if (currentMonthPurchaseCountEl) {
        currentMonthPurchaseCountEl.textContent = `${currentMonthInward.length} invoice${currentMonthInward.length !== 1 ? 's' : ''} this month`;
    }

    // Update today's summary cards (expenses, production, attendance)
    updateDashboardCards();
}

// Update dashboard cards for Today's Summary (Expenses, Production, Attendance)
function updateDashboardCards() {
    const today = new Date().toISOString().slice(0, 10);
    const todayDateString = new Date().toDateString();

    // 1. Calculate Today's Expenses
    if (typeof getExpenses === 'function') {
        const expenses = getExpenses();
        const todayExpenses = expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.toDateString() === todayDateString;
        });
        const todayTotal = todayExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);

        const expenseAmountEl = document.getElementById('todayExpensesAmount');
        const expenseCountEl = document.getElementById('todayExpensesCount');
        if (expenseAmountEl) {
            expenseAmountEl.textContent = `₹${todayTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        }
        if (expenseCountEl) {
            expenseCountEl.textContent = `${todayExpenses.length} expense${todayExpenses.length !== 1 ? 's' : ''}`;
        }
    }

    // 2. Calculate Today's Production
    if (typeof getProductionLogs === 'function') {
        const productionLogs = getProductionLogs();
        const todayLogs = productionLogs.filter(log => log.date === today);
        const todayProduction = todayLogs.reduce((sum, log) => sum + parseInt(log.quantity || 0), 0);

        const productionQtyEl = document.getElementById('todayProductionQty');
        const productionItemsEl = document.getElementById('todayProductionItems');
        if (productionQtyEl) {
            productionQtyEl.textContent = todayProduction.toLocaleString('en-IN');
        }
        if (productionItemsEl) {
            productionItemsEl.textContent = `${todayLogs.length} item${todayLogs.length !== 1 ? 's' : ''} produced`;
        }
    }

    // 3. Calculate Today's Attendance
    const attendanceRecords = getAttendanceRecords();
    const employees = getEmployees();
    const todayAttendance = attendanceRecords.filter(record => record.date === today);

    let presentCount = 0;
    if (todayAttendance.length > 0) {
        // Count present employees from today's attendance
        const todayRecord = todayAttendance[0]; // Should only be one record per date
        if (todayRecord.records && Array.isArray(todayRecord.records)) {
            presentCount = todayRecord.records.filter(r => r.status === 'Present').length;
        }
    }

    const attendancePresentEl = document.getElementById('todayAttendancePresent');
    const attendanceTotalEl = document.getElementById('todayAttendanceTotal');
    if (attendancePresentEl) {
        attendancePresentEl.textContent = presentCount;
    }
    if (attendanceTotalEl) {
        attendanceTotalEl.textContent = `of ${employees.length} employee${employees.length !== 1 ? 's' : ''}`;
    }
}


// Navigate to a module when clicking dashboard cards
function navigateToModule(moduleId) {
    // Find the navigation link for this module
    const navLink = document.querySelector(`.nav-link[data-module="${moduleId}"]`);
    if (navLink) {
        navLink.click();
    }
}

// Toggle Amount Paid field for Inward (Purchase) Invoice
function toggleInwardAmountPaid() {
    const status = document.getElementById('inwardPaymentStatus').value;
    const amountPaidGroup = document.getElementById('inwardAmountPaidGroup');

    if (status === 'Partial') {
        amountPaidGroup.style.display = 'block';
        // Update balance display when amount changes
        const amountPaidInput = document.getElementById('inwardAmountPaid');
        amountPaidInput.oninput = updateInwardBalanceDisplay;
        updateInwardBalanceDisplay();
    } else {
        amountPaidGroup.style.display = 'none';
        document.getElementById('inwardAmountPaid').value = '';
    }
}

function updateInwardBalanceDisplay() {
    const totalEl = document.getElementById('inwardTotalAmount');
    const total = parseFloat(totalEl?.textContent?.replace(/[₹,]/g, '')) || 0;
    const amountPaid = parseFloat(document.getElementById('inwardAmountPaid').value) || 0;
    const balance = total - amountPaid;

    const display = document.getElementById('inwardBalanceDisplay');
    if (display) {
        display.textContent = `Balance: ₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        display.style.color = balance > 0 ? 'var(--warning)' : 'var(--success)';
    }
}

// Toggle Amount Paid field for Outward (Sales) Invoice
function toggleOutwardAmountPaid() {
    const status = document.getElementById('outwardPaymentStatus').value;
    const amountPaidGroup = document.getElementById('outwardAmountPaidGroup');

    if (status === 'Partial') {
        amountPaidGroup.style.display = 'block';
        // Update balance display when amount changes
        const amountPaidInput = document.getElementById('outwardAmountPaid');
        amountPaidInput.oninput = updateOutwardBalanceDisplay;
        updateOutwardBalanceDisplay();
    } else {
        amountPaidGroup.style.display = 'none';
        document.getElementById('outwardAmountPaid').value = '';
    }
}

function updateOutwardBalanceDisplay() {
    const totalEl = document.getElementById('totalValue');
    const total = parseFloat(totalEl?.textContent?.replace(/[₹,]/g, '')) || 0;
    const amountPaid = parseFloat(document.getElementById('outwardAmountPaid').value) || 0;
    const balance = total - amountPaid;

    const display = document.getElementById('outwardBalanceDisplay');
    if (display) {
        display.textContent = `Balance: ₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        display.style.color = balance > 0 ? 'var(--warning)' : 'var(--success)';
    }
}

function displayPendingInward(invoices) {
    const container = document.getElementById('pendingInward');

    if (invoices.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No inward invoices yet</p>';
        return;
    }

    // Display recent inward invoices (last 5)
    const recentInvoices = invoices.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    let html = '';
    recentInvoices.forEach(inv => {
        const amount = parseFloat(inv.amount || 0);

        html += `
            <div class="pending-card" style="border-left-color: var(--primary);">
                <div class="pending-company">${inv.customer}</div>
                <div class="pending-amount">₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                <div class="pending-details">
                    <div>🏷️ Invoice No: ${inv.invoiceNo}</div>
                    <div>📅 Date: ${inv.date}</div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}


function displayPendingOutward(invoices) {
    const container = document.getElementById('pendingOutward');

    if (invoices.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No pending outward invoices</p>';
        return;
    }

    // Display each invoice separately (no grouping)
    let html = '';
    invoices.forEach(inv => {
        const amount = parseFloat(inv.total || 0);
        const statusClass = inv.paymentStatus === 'Partial' ? 'partial' : 'pending';

        // Get payment status with days tracking
        const paymentStatusHTML = typeof formatPaymentStatus === 'function'
            ? formatPaymentStatus(inv)
            : `<span class="badge badge-${statusClass === 'partial' ? 'warning' : 'danger'}">${inv.paymentStatus}</span>`;

        html += `
            <div class="pending-card ${statusClass}">
                <div class="pending-company">${inv.buyerName}</div>
                <div class="pending-amount">₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                <div class="pending-details">
                    <div>🏷️ Invoice No: ${inv.invoiceNo}</div>
                    <div>📅 Date: ${inv.date}</div>
                    <div>${paymentStatusHTML}</div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ===================================
// INWARD INVOICE MODULE
// ===================================

function openInwardModal(id = null) {
    const modal = document.getElementById('inwardModal');
    const form = document.getElementById('inwardForm');
    form.reset();

    // Clear product items container
    const productContainer = document.getElementById('inwardProductItems');
    if (productContainer) {
        productContainer.innerHTML = '';
    }

    // Load customer dropdown
    if (typeof loadInwardCustomerDropdown === 'function') {
        loadInwardCustomerDropdown();
    }

    // Reset customer dropdown selection
    const customerDropdown = document.getElementById('inwardCustomerDropdown');
    if (customerDropdown) {
        customerDropdown.value = '';
    }

    if (id) {
        // Edit mode
        const invoices = getInwardInvoices();
        const invoice = invoices.find(inv => inv.id === id);
        if (invoice) {
            document.getElementById('inwardModalTitle').textContent = 'Edit Inward Invoice';
            document.getElementById('inwardId').value = invoice.id;
            document.getElementById('inwardInvoiceNo').value = invoice.invoiceNo;
            document.getElementById('inwardDate').value = invoice.date;
            document.getElementById('inwardCustomer').value = invoice.customer;
            document.getElementById('inwardNotes').value = invoice.notes || '';
            document.getElementById('inwardGSTNo').value = invoice.gstNo || '';
            document.getElementById('inwardPaymentStatus').value = invoice.paymentStatus || 'Pending';

            // Load amount paid if partial payment
            if (invoice.paymentStatus === 'Partial' && invoice.amountPaid) {
                document.getElementById('inwardAmountPaid').value = invoice.amountPaid;
                toggleInwardAmountPaid();
            }

            // Load products - handle both old single-product and new multi-product format
            if (invoice.products && Array.isArray(invoice.products)) {
                // New multi-product format
                invoice.products.forEach(product => {
                    addInwardProductRow(product);
                });
            } else if (invoice.material) {
                // Old single-product format - convert to product row
                addInwardProductRow({
                    material: invoice.material,
                    quantity: invoice.quantity,
                    unit: invoice.unit,
                    rate: invoice.rate,
                    amount: invoice.amount
                });
            }

            // Try to pre-select customer in dropdown if it matches
            if (customerDropdown && invoice.customer) {
                const customers = getCustomers();
                const matchingCustomer = customers.find(c => c.companyName === invoice.customer);
                if (matchingCustomer) {
                    customerDropdown.value = matchingCustomer.id;
                }
            }

            // Invoice number should be editable even for saved invoices
            const invoiceNoField = document.getElementById('inwardInvoiceNo');
            invoiceNoField.readOnly = false;
            invoiceNoField.style.opacity = '1';
            invoiceNoField.title = 'Supplier invoice number';
        }
    } else {
        // New mode
        document.getElementById('inwardModalTitle').textContent = 'New Inward Invoice';
        document.getElementById('inwardId').value = ''; // Clear ID to ensure new invoice is created
        document.getElementById('inwardDate').valueAsDate = new Date();

        // Invoice number field is empty - user must fill it (no auto-generate)
        const invoiceNoField = document.getElementById('inwardInvoiceNo');
        invoiceNoField.value = '';
        invoiceNoField.readOnly = false;
        invoiceNoField.style.opacity = '1';
        invoiceNoField.title = 'Enter the supplier invoice number';

        // Clear GST field
        document.getElementById('inwardGSTNo').value = '';

        // Add one default product row
        addInwardProductRow();
    }

    // Calculate totals
    calculateInwardTotals();

    modal.classList.add('active');
}

function closeInwardModal() {
    document.getElementById('inwardModal').classList.remove('active');
    // Hide duplicate warning when modal closes
    const warning = document.getElementById('invoiceDuplicateWarning');
    if (warning) warning.style.display = 'none';
}

// Add a product row to the inward invoice modal
function addInwardProductRow(data = null) {
    const container = document.getElementById('inwardProductItems');
    if (!container) return;

    // UOM options
    const uomOptions = ['Nos', 'Kgs', 'Ltrs', 'Mtrs', 'Pcs', 'Sets', 'Boxes', 'Pairs', 'Grams', 'Tonnes'];
    const uomOptionsHtml = uomOptions.map(uom =>
        `<option value="${uom}" ${data?.unit === uom ? 'selected' : ''}>${uom}</option>`
    ).join('');

    const rowHtml = `
        <div class="inward-product-item" style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; position: relative;">
            <button type="button" class="icon-btn delete" onclick="removeInwardProductRow(this)" style="position: absolute; top: 0.5rem; right: 0.5rem;" title="Remove">×</button>
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 0.75rem;">
                <div class="form-group" style="margin: 0;">
                    <label class="form-label">Material Description</label>
                    <input type="text" class="form-control inward-product-material" placeholder="Enter material description" value="${data?.material || ''}" required>
                </div>
                <div class="form-group" style="margin: 0;">
                    <label class="form-label">Quantity</label>
                    <input type="number" class="form-control inward-product-qty" placeholder="100" value="${data?.quantity || ''}" oninput="calculateInwardProductValue(this)" required>
                </div>
                <div class="form-group" style="margin: 0;">
                    <label class="form-label">UOM</label>
                    <select class="form-control inward-product-unit" required>
                        <option value="">-- Select --</option>
                        ${uomOptionsHtml}
                    </select>
                </div>
                <div class="form-group" style="margin: 0;">
                    <label class="form-label">Rate (₹)</label>
                    <input type="number" class="form-control inward-product-rate" placeholder="0.00" step="0.01" value="${data?.rate || ''}" oninput="calculateInwardProductValue(this)" required>
                </div>
                <div class="form-group" style="margin: 0;">
                    <label class="form-label">Amount (₹)</label>
                    <input type="number" class="form-control inward-product-amount" placeholder="0.00" step="0.01" value="${data?.amount || ''}" readonly>
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', rowHtml);
}


// Remove an inward product row
function removeInwardProductRow(button) {
    const row = button.closest('.inward-product-item');
    if (row) {
        row.remove();
        calculateInwardTotals();
    }
}

// Handle product selection from dropdown for inward invoice
function onInwardProductSelected(selectElement) {
    const productId = selectElement.value;

    if (!productId) return;

    // Get the customer ID to fetch their products
    const customerDropdown = document.getElementById('inwardCustomerDropdown');
    const customerId = customerDropdown ? customerDropdown.value : null;

    if (!customerId) return;

    const customerProducts = getCustomerProducts(customerId);
    const selectedProduct = customerProducts.find(p => p.id === productId);

    if (selectedProduct) {
        // Get the product row
        const productRow = selectElement.closest('.inward-product-item');
        const materialText = productRow.querySelector('.inward-product-material-text');
        const unitSelect = productRow.querySelector('.inward-product-unit');
        const rateInput = productRow.querySelector('.inward-product-rate');

        // Set the material description text
        if (materialText) materialText.value = selectedProduct.description;

        // Auto-fill UOM if available
        if (unitSelect && selectedProduct.uom) {
            unitSelect.value = selectedProduct.uom;
        }

        // Auto-fill Rate/Price if available
        if (rateInput && selectedProduct.price) {
            rateInput.value = selectedProduct.price;
            // Trigger calculation
            rateInput.dispatchEvent(new Event('input'));
        }
    }
}

// Calculate value for a single inward product row
function calculateInwardProductValue(inputElement) {
    const row = inputElement.closest('.inward-product-item');
    if (!row) return;

    const qty = parseFloat(row.querySelector('.inward-product-qty')?.value) || 0;
    const rate = parseFloat(row.querySelector('.inward-product-rate')?.value) || 0;
    const amountField = row.querySelector('.inward-product-amount');

    if (amountField) {
        amountField.value = (qty * rate).toFixed(2);
    }

    calculateInwardTotals();
}

// Calculate total amount for all inward products including GST
function calculateInwardTotals() {
    const productRows = document.querySelectorAll('#inwardProductItems .inward-product-item');
    let taxableValue = 0;

    productRows.forEach(row => {
        const amount = parseFloat(row.querySelector('.inward-product-amount')?.value) || 0;
        taxableValue += amount;
    });

    // Calculate GST (9% CGST + 9% SGST = 18% total)
    const cgst = taxableValue * 0.09;
    const sgst = taxableValue * 0.09;
    const subtotal = taxableValue + cgst + sgst;

    // Calculate rounding off (round to nearest rupee)
    const roundedTotal = Math.round(subtotal);
    const roundOff = roundedTotal - subtotal;

    // Update display elements
    const taxableElement = document.getElementById('inwardTaxableValue');
    const cgstElement = document.getElementById('inwardCGST');
    const sgstElement = document.getElementById('inwardSGST');
    const roundOffElement = document.getElementById('inwardRoundOff');
    const totalElement = document.getElementById('inwardTotalAmount');

    if (taxableElement) {
        taxableElement.textContent = `₹${taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    if (cgstElement) {
        cgstElement.textContent = `₹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    if (sgstElement) {
        sgstElement.textContent = `₹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    if (roundOffElement) {
        const sign = roundOff >= 0 ? '+' : '';
        roundOffElement.textContent = `${sign}₹${roundOff.toFixed(2)}`;
    }
    if (totalElement) {
        totalElement.textContent = `₹${roundedTotal.toLocaleString('en-IN')}`;
    }

    return { taxableValue, cgst, sgst, roundOff, totalAmount: roundedTotal };
}


// Real-time duplicate check for invoice number
function checkInwardInvoiceDuplicate(invoiceNo) {
    const warning = document.getElementById('invoiceDuplicateWarning');
    if (!warning || !invoiceNo) {
        if (warning) warning.style.display = 'none';
        return false;
    }

    const currentId = document.getElementById('inwardId').value;
    const invoices = getInwardInvoices();

    const duplicate = invoices.find(inv =>
        inv.invoiceNo === invoiceNo && inv.id !== currentId
    );

    warning.style.display = duplicate ? 'block' : 'none';
    return !!duplicate;
}

function saveInwardInvoice() {
    const id = document.getElementById('inwardId').value;
    const invoiceNo = document.getElementById('inwardInvoiceNo').value;
    const gstNo = document.getElementById('inwardGSTNo').value.toUpperCase();
    const customer = document.getElementById('inwardCustomer').value;

    // Validate required fields
    if (!invoiceNo || !customer) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    // Collect products from rows
    const productRows = document.querySelectorAll('#inwardProductItems .inward-product-item');
    const products = [];
    let totalAmount = 0;

    productRows.forEach(row => {
        // Get material from text input
        const material = row.querySelector('.inward-product-material')?.value?.trim();
        const quantity = parseFloat(row.querySelector('.inward-product-qty')?.value) || 0;
        const unit = row.querySelector('.inward-product-unit')?.value?.trim();
        const rate = parseFloat(row.querySelector('.inward-product-rate')?.value) || 0;
        const amount = parseFloat(row.querySelector('.inward-product-amount')?.value) || 0;

        if (material && quantity > 0) {
            products.push({
                material,
                quantity,
                unit,
                rate,
                amount
            });
            totalAmount += amount;
        }
    });

    // Validate at least one product
    if (products.length === 0) {
        showToast('Please add at least one product', 'error');
        return;
    }

    // Check for duplicate invoice number
    const existingInvoices = getInwardInvoices();
    const duplicate = existingInvoices.find(inv =>
        inv.invoiceNo === invoiceNo && inv.id !== id
    );

    // Show alert if duplicate but still allow saving
    if (duplicate) {
        alert('⚠️ Warning: This invoice number already exists in the system!');
    }
    // Calculate GST and rounding
    const cgst = totalAmount * 0.09;
    const sgst = totalAmount * 0.09;
    const subtotal = totalAmount + cgst + sgst;
    const roundedTotal = Math.round(subtotal);
    const roundOff = roundedTotal - subtotal;

    const invoiceData = {
        id: id || Date.now().toString(),
        invoiceNo: invoiceNo,
        date: document.getElementById('inwardDate').value,
        customer: customer,
        gstNo: gstNo,
        products: products,
        taxableValue: totalAmount.toFixed(2),
        cgst: cgst.toFixed(2),
        sgst: sgst.toFixed(2),
        roundOff: roundOff.toFixed(2),
        amount: roundedTotal.toString(),
        // Keep backward compatibility fields using first product
        material: products.map(p => p.material).join(', '),
        quantity: products.reduce((sum, p) => sum + p.quantity, 0),
        unit: products[0]?.unit || '',
        rate: products.length === 1 ? products[0].rate : 0,
        notes: document.getElementById('inwardNotes').value,
        paymentStatus: document.getElementById('inwardPaymentStatus').value,
        amountPaid: parseFloat(document.getElementById('inwardAmountPaid').value) || 0,
        locked: true
    };

    let invoices = getInwardInvoices();

    if (id) {
        // Update existing
        invoices = invoices.map(inv => inv.id === id ? invoiceData : inv);
    } else {
        // Add new
        invoices.push(invoiceData);
    }

    saveToStorage('inwardInvoices', invoices);
    closeInwardModal();
    loadInwardInvoices();
    loadDashboard();
    showToast('Inward invoice saved successfully!', 'success');
}


function loadInwardInvoices() {
    const invoices = getInwardInvoices();
    const tbody = document.getElementById('inwardTableBody');

    if (invoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center" style="color: var(--text-secondary);">
                    No purchase invoices yet. Click "New Purchase Invoice" to create one.
                </td>
            </tr>
        `;
        return;
    }

    // Sort by Date Descending first, then by Invoice Number Descending
    invoices.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) {
            return dateB.localeCompare(dateA); // Newer dates first
        }
        // Tie-breaker: Invoice Number Descending
        return b.invoiceNo.localeCompare(a.invoiceNo, undefined, { numeric: true });
    });

    // Get current month for comparison
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    // Pre-calculate monthly totals for inward invoices
    const monthlyTotals = {};
    invoices.forEach(inv => {
        const invoiceDate = inv.date || new Date().toISOString().slice(0, 10);
        const invoiceMonth = invoiceDate.slice(0, 7);
        const amount = parseFloat(inv.amount) || parseFloat(inv.total) || parseFloat(inv.totalAmount) || 0;
        monthlyTotals[invoiceMonth] = (monthlyTotals[invoiceMonth] || 0) + amount;
    });

    let html = '';
    let lastMonth = null;

    invoices.forEach(inv => {
        // Defensive check for missing date
        const invoiceDate = inv.date || new Date().toISOString().slice(0, 10);
        const invoiceMonth = invoiceDate.slice(0, 7); // YYYY-MM
        const [year, month] = invoiceMonth.split('-');
        const monthName = monthNames[parseInt(month) - 1] || 'Unknown';
        const isCurrentMonth = invoiceMonth === currentMonth;

        // Add month separator if new month
        if (invoiceMonth !== lastMonth) {
            const monthLabel = `${monthName} ${year}`;
            const monthColor = isCurrentMonth ?
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)';
            const monthIcon = isCurrentMonth ? '📥' : '📦';
            const monthTotal = monthlyTotals[invoiceMonth] || 0;

            html += `
                <tr class="month-separator">
                    <td colspan="8" style="
                        background: ${monthColor};
                        color: white;
                        font-weight: 600;
                        font-size: 1rem;
                        padding: 0.75rem 1rem;
                        border: none;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    ">
                        ${monthIcon} ${monthLabel} ${isCurrentMonth ? '<span style="background: rgba(255,255,255,0.2); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-left: 0.5rem;">CURRENT MONTH</span>' : ''}
                        <span style="float: right; font-size: 0.9rem; text-transform: none;">Total: ₹${monthTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </td>
                </tr>
            `;
            lastMonth = invoiceMonth;
        }

        const gstNo = inv.gstNo || '-';
        const paymentStatus = inv.paymentStatus || 'Pending';
        const statusClass = paymentStatus === 'Paid' ? 'success' : paymentStatus === 'Partial' ? 'warning' : 'danger';
        html += `
            <tr>
                <td>${inv.invoiceNo}</td>
                <td>${formatDate(inv.date)}</td>
                <td>${inv.customer}</td>
                <td style="font-size: 0.85rem;">${gstNo}</td>
                <td>${inv.material || '-'}</td>
                <td>₹${parseFloat(inv.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td><span class="badge badge-${statusClass}">${paymentStatus}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn pdf" onclick="downloadInwardInvoicePDF('${inv.id}')" title="Download PDF">📄</button>
                        <button class="icon-btn edit" onclick="openInwardModal('${inv.id}')" title="Edit">✏️</button>
                        <button class="icon-btn delete" onclick="deleteInwardInvoice('${inv.id}')" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function deleteInwardInvoice(id) {
    if (confirm('Are you sure you want to delete this inward invoice?')) {
        let invoices = getInwardInvoices();
        invoices = invoices.filter(inv => inv.id !== id);
        saveToStorage('inwardInvoices', invoices);
        loadInwardInvoices();
        loadDashboard();
        showToast('Inward invoice deleted', 'info');
    }
}

// Generate inward invoice number
function generateInwardInvoiceNumber() {
    const invoices = getInwardInvoices();
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Find highest number for this year/month
    const prefix = `INV-IN/${year}/${month}`;
    const thisMonthInvoices = invoices.filter(inv =>
        inv.invoiceNo && inv.invoiceNo.startsWith(prefix)
    );

    let nextNum = 1;
    if (thisMonthInvoices.length > 0) {
        const numbers = thisMonthInvoices.map(inv => {
            const parts = inv.invoiceNo.split('/');
            return parseInt(parts[parts.length - 1]) || 0;
        });
        nextNum = Math.max(...numbers) + 1;
    }

    const invoiceNo = `${prefix}/${String(nextNum).padStart(4, '0')}`;

    const inputField = document.getElementById('inwardInvoiceNo');
    if (inputField) {
        inputField.value = invoiceNo;
    }

    return invoiceNo;
}

// ===================================
// OUTWARD INVOICE MODULE
// ===================================

function generateOutwardInvoiceNumber() {
    const invoices = getOutwardInvoices();

    // Calculate Financial Year
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 = January, 3 = April

    let fyStart, fyEnd;
    if (currentMonth >= 3) { // April onwards
        fyStart = currentYear % 100;
        fyEnd = (currentYear + 1) % 100;
    } else { // Jan - March
        fyStart = (currentYear - 1) % 100;
        fyEnd = currentYear % 100;
    }

    const fyString = `${fyStart}-${fyEnd}`;

    // Filter invoices by current financial year
    const fyInvoices = invoices.filter(inv => {
        if (!inv.invoiceNo) return false;
        // Extract FY from invoice number (format: SVR/XXXX/YY-YY)
        const parts = inv.invoiceNo.split('/');
        return parts.length === 3 && parts[2] === fyString;
    });

    // Calculate next invoice number
    // For FY 25-26: Use 269 as base (first invoice = 270, second = 271, etc.)
    // For other FYs: Start from 1 (first invoice = 1, second = 2, etc.)
    let nextNum;
    if (fyString === '25-26') {
        nextNum = 269 + fyInvoices.length + 1;
    } else {
        nextNum = fyInvoices.length + 1;
    }

    // Format: SVR/(inv num)/current finance year
    // Example: SVR/0270/25-26 (Jan-March 2026) or SVR/0001/26-27 (April 2026+)
    const invoiceNo = `SVR/${String(nextNum).padStart(4, '0')}/${fyString}`;

    const inputField = document.getElementById('outwardInvoiceNo');
    if (inputField) {
        inputField.value = invoiceNo;
    }

    return invoiceNo;
}

function openOutwardModal(id = null) {
    const modal = document.getElementById('outwardModal');
    const form = document.getElementById('outwardForm');
    form.reset();

    // Clear product items
    document.getElementById('productItems').innerHTML = '';

    if (id) {
        // Edit mode - load existing invoice
        const invoices = getOutwardInvoices();
        const invoice = invoices.find(inv => inv.id === id);
        if (invoice) {
            document.getElementById('outwardModalTitle').textContent = 'Edit Tax Invoice';
            populateOutwardForm(invoice);
        }
    } else {
        // New mode - add 5 default product rows
        document.getElementById('outwardModalTitle').textContent = 'New Tax Invoice';
        document.getElementById('outwardDate').valueAsDate = new Date();
        document.getElementById('outwardDCDate').valueAsDate = new Date();
        generateOutwardInvoiceNumber();

        // Add 5 default product rows
        for (let i = 0; i < 5; i++) {
            addProductRow();
        }

        // Ensure invoice number field is editable for new invoices
        const invoiceNoField = document.getElementById('outwardInvoiceNo');
        invoiceNoField.readOnly = false;
        invoiceNoField.style.opacity = '1';
        invoiceNoField.title = '';
    }

    // Load customer dropdown
    if (typeof loadCustomerDropdown === 'function') {
        loadCustomerDropdown();
    }

    // Setup product calculations
    setupProductCalculations();

    modal.classList.add('active');
}

function populateOutwardForm(invoice) {
    document.getElementById('outwardId').value = invoice.id;
    document.getElementById('outwardInvoiceNo').value = invoice.invoiceNo;
    document.getElementById('outwardDate').value = invoice.date;
    document.getElementById('outwardPONo').value = invoice.poNo || '';
    document.getElementById('outwardPODate').value = invoice.poDate || '';
    document.getElementById('outwardDCNo').value = invoice.dcNo;
    document.getElementById('outwardDCDate').value = invoice.dcDate;
    document.getElementById('outwardState').value = invoice.state;
    document.getElementById('outwardStateCode').value = invoice.stateCode;
    document.getElementById('outwardPaymentTerms').value = invoice.paymentTerms || '';
    document.getElementById('outwardVehicle').value = invoice.vehicle || '';
    document.getElementById('outwardBuyerName').value = invoice.buyerName;
    document.getElementById('outwardBuyerAddress').value = invoice.buyerAddress;
    document.getElementById('outwardShippingAddress').value = invoice.shippingAddress || invoice.buyerAddress;
    document.getElementById('sameAsBuyerAddress').checked = invoice.sameAsBuyerAddress !== false && invoice.shippingAddress === invoice.buyerAddress;
    toggleShippingAddress();
    document.getElementById('outwardGSTIN').value = invoice.gstin;
    document.getElementById('outwardContact').value = invoice.contact || '';
    document.getElementById('outwardPaymentStatus').value = invoice.paymentStatus;

    // Load amount paid if partial payment
    if (invoice.paymentStatus === 'Partial' && invoice.amountPaid) {
        document.getElementById('outwardAmountPaid').value = invoice.amountPaid;
        toggleOutwardAmountPaid();
    }

    // Populate products
    if (invoice.products && invoice.products.length > 0) {
        const container = document.getElementById('productItems');
        container.innerHTML = '';
        invoice.products.forEach(product => {
            addProductRow(product);
        });
    }

    // Recalculate totals
    setTimeout(() => calculateOutwardTotals(), 100);
}

function closeOutwardModal() {
    clearPOError();
    document.getElementById('outwardModal').classList.remove('active');
}

// Toggle shipping address based on checkbox
function toggleShippingAddress() {
    const checkbox = document.getElementById('sameAsBuyerAddress');
    const shippingAddress = document.getElementById('outwardShippingAddress');
    const buyerAddress = document.getElementById('outwardBuyerAddress');
    
    if (checkbox.checked) {
        shippingAddress.value = buyerAddress.value;
        shippingAddress.disabled = true;
        shippingAddress.style.backgroundColor = 'var(--bg-tertiary)';
        shippingAddress.style.cursor = 'not-allowed';
    } else {
        shippingAddress.disabled = false;
        shippingAddress.style.backgroundColor = '';
        shippingAddress.style.cursor = '';
    }
}

// Sync shipping address when buyer address changes (if checkbox is checked)
function syncShippingAddress() {
    const checkbox = document.getElementById('sameAsBuyerAddress');
    if (checkbox && checkbox.checked) {
        const buyerAddress = document.getElementById('outwardBuyerAddress');
        const shippingAddress = document.getElementById('outwardShippingAddress');
        shippingAddress.value = buyerAddress.value;
    }
}

function addProductRow(data = null) {
    const container = document.getElementById('productItems');

    // Get current selected customer products
    const customerDropdown = document.getElementById('customerDropdown');
    const customerId = customerDropdown ? customerDropdown.value : null;
    const customerProducts = customerId ? getCustomerProducts(customerId) : [];

    // Build product dropdown options
    let productOptions = '<option value="">-- Select Product --</option>';
    customerProducts.forEach(product => {
        const selected = (data && data.description === product.description) ? 'selected' : '';
        productOptions += `<option value="${product.id}" ${selected}>${product.description}</option>`;
    });
    // Add "+ Add New Product" option at the end
    productOptions += '<option value="__ADD_NEW__" style="color: var(--primary); font-weight: 600;">➕ Add New Product...</option>';

    // UOM options
    const uomOptions = ['Nos', 'Kgs', 'Ltrs', 'Mtrs', 'Pcs', 'Sets', 'Boxes', 'Pairs', 'Grams', 'Tonnes'];
    const uomOptionsHtml = uomOptions.map(uom =>
        `<option value="${uom}" ${data?.uom === uom ? 'selected' : ''}>${uom}</option>`
    ).join('');

    const rowHtml = `
        <div class="product-item" style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; position: relative;">
            <button type="button" class="icon-btn delete" onclick="this.parentElement.remove(); calculateOutwardTotals();" style="position: absolute; top: 0.5rem; right: 0.5rem;" title="Remove">×</button>
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr; gap: 0.5rem;">
                <div class="form-group" style="margin: 0;">
                    <label class="form-label">Description</label>
                    <select class="form-control product-description" onchange="onProductSelected(this)" required>
                        ${productOptions}
                    </select>
                    <input type="hidden" class="product-description-text" value="${data?.description || ''}">
                </div>
                <div class="form-group" style="margin: 0;">
                    <label class="form-label">HSN Code</label>
                    <input type="text" class="form-control product-hsn" placeholder="e.g., 87082900" value="${data?.hsn || ''}" required>
                </div>
                <div class="form-group" style="margin: 0;">
                    <label class="form-label">Qty</label>
                    <input type="number" class="form-control product-qty" placeholder="100" value="${data?.quantity || ''}" required>
                </div>
                <div class="form-group" style="margin: 0;">
                    <label class="form-label">UOM</label>
                    <select class="form-control product-uom" required>
                        <option value="">--</option>
                        ${uomOptionsHtml}
                    </select>
                </div>
                <div class="form-group" style="margin: 0;">
                    <label class="form-label">Rate (₹)</label>
                    <input type="number" class="form-control product-rate" placeholder="0.00" step="0.01" value="${data?.rate || ''}" required>
                </div>
                <div class="form-group" style="margin: 0;">
                    <label class="form-label">Value (₹)</label>
                    <input type="number" class="form-control product-value" placeholder="0.00" step="0.01" value="${data?.value || ''}" readonly>
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', rowHtml);
    setupProductCalculations();
}


function setupProductCalculations() {
    const productItems = document.querySelectorAll('.product-item');

    productItems.forEach(item => {
        const qtyInput = item.querySelector('.product-qty');
        const rateInput = item.querySelector('.product-rate');
        const valueInput = item.querySelector('.product-value');

        const calculateValue = () => {
            const qty = parseFloat(qtyInput.value) || 0;
            const rate = parseFloat(rateInput.value) || 0;
            valueInput.value = (qty * rate).toFixed(2);
            calculateOutwardTotals();
        };

        qtyInput.addEventListener('input', calculateValue);
        rateInput.addEventListener('input', calculateValue);
    });
}

function calculateOutwardTotals() {
    const productItems = document.querySelectorAll('.product-item');
    let taxableValue = 0;

    productItems.forEach(item => {
        const value = parseFloat(item.querySelector('.product-value').value) || 0;
        taxableValue += value;
    });

    const cgst = taxableValue * 0.09;
    const sgst = taxableValue * 0.09;
    const subtotal = taxableValue + cgst + sgst;

    // Calculate rounding off (round to nearest rupee)
    const roundedTotal = Math.round(subtotal);
    const roundOff = roundedTotal - subtotal;

    document.getElementById('taxableValue').textContent = `₹${taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('cgstValue').textContent = `₹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('sgstValue').textContent = `₹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    // Display rounding off
    const roundOffElement = document.getElementById('roundOffValue');
    if (roundOffElement) {
        const sign = roundOff >= 0 ? '+' : '';
        roundOffElement.textContent = `${sign}₹${roundOff.toFixed(2)}`;
    }

    document.getElementById('totalValue').textContent = `₹${roundedTotal.toLocaleString('en-IN')}`;

    // Convert to words
    const inWords = numberToWords(roundedTotal);
    document.getElementById('amountInWords').textContent = inWords + ' Only';
}


// Handle product selection from dropdown
function onProductSelected(selectElement) {
    const productId = selectElement.value;

    if (!productId) return;

    // Check if "Add New Product" was selected
    if (productId === '__ADD_NEW__') {
        // Reset to default option
        selectElement.value = '';
        // Open the quick product modal
        openQuickProductModal(selectElement);
        return;
    }

    // Get the customer ID to fetch their products
    const customerDropdown = document.getElementById('customerDropdown');
    const customerId = customerDropdown ? customerDropdown.value : null;

    if (!customerId) return;

    const customerProducts = getCustomerProducts(customerId);
    const selectedProduct = customerProducts.find(p => p.id === productId);

    if (selectedProduct) {
        // Get the product row
        const productRow = selectElement.closest('.product-item');
        const descriptionText = productRow.querySelector('.product-description-text');
        const hsnInput = productRow.querySelector('.product-hsn');
        const qtyInput = productRow.querySelector('.product-qty');
        const rateInput = productRow.querySelector('.product-rate');

        // Set the description text
        if (descriptionText) descriptionText.value = selectedProduct.description;

        // Auto-fill HSN code (HSN doesn't change monthly)
        if (hsnInput && selectedProduct.hsn) {
            hsnInput.value = selectedProduct.hsn;
        }

        // Check if product details are outdated (from previous month)
        const currentMonth = new Date().toISOString().slice(0, 7);
        const isOutdated = selectedProduct.lastUpdated && selectedProduct.lastUpdated < currentMonth;

        if (isOutdated) {
            // Show warning that product details need updating
            showToast(`⚠️ "${selectedProduct.description}" - Price & PO limit are from ${formatMonthYear(selectedProduct.lastUpdated)}. Please update in Customer module for this month.`, 'warning');

            // Don't auto-fill outdated price - leave blank for manual entry
            // But still fill HSN as it doesn't change
        } else {
            // Auto-fill Price/Rate if available and current
            if (rateInput && selectedProduct.price) {
                rateInput.value = selectedProduct.price;
                // Trigger calculation
                rateInput.dispatchEvent(new Event('input'));
            }
        }

        // Check PO limit when quantity changes (only if not outdated)
        if (qtyInput && selectedProduct.poQty && !isOutdated) {
            qtyInput.addEventListener('blur', function () {
                checkPOLimit(customerId, selectedProduct, parseFloat(this.value) || 0);
            });
        }
    }
}

// Helper function to format month-year for display
function formatMonthYear(monthStr) {
    if (!monthStr) return 'unknown';
    const [year, month] = monthStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}

// Open quick product modal for adding a new product from outward invoice
let quickProductTargetRow = null;

function openQuickProductModal(selectElement) {
    const customerDropdown = document.getElementById('customerDropdown');
    const customerId = customerDropdown ? customerDropdown.value : null;

    if (!customerId) {
        showToast('⚠️ Please select a customer first before adding a new product', 'warning');
        return;
    }

    // Store reference to the product row that triggered this modal
    quickProductTargetRow = selectElement.closest('.product-item');

    // Reset the form
    document.getElementById('quickProductDescription').value = '';
    document.getElementById('quickProductHSN').value = '';
    document.getElementById('quickProductPrice').value = '';
    document.getElementById('quickProductPO').value = '';

    // Show the modal
    document.getElementById('quickProductModal').classList.add('active');

    // Focus on description field
    setTimeout(() => {
        document.getElementById('quickProductDescription').focus();
    }, 100);
}

function closeQuickProductModal() {
    document.getElementById('quickProductModal').classList.remove('active');
    quickProductTargetRow = null;
}

function saveQuickProduct() {
    const description = document.getElementById('quickProductDescription').value.trim();
    const hsn = document.getElementById('quickProductHSN').value.trim();
    const price = document.getElementById('quickProductPrice').value;
    const poQty = document.getElementById('quickProductPO').value;

    if (!description) {
        showToast('❌ Product description is required', 'error');
        return;
    }

    // Get the selected customer
    const customerDropdown = document.getElementById('customerDropdown');
    const customerId = customerDropdown ? customerDropdown.value : null;

    if (!customerId) {
        showToast('❌ No customer selected', 'error');
        return;
    }

    // Create new product with lastUpdated field (YYYY-MM format)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const newProduct = {
        id: 'prod_' + Date.now(),
        description: description,
        hsn: hsn || '',
        price: price ? parseFloat(price) : 0,
        poQty: poQty ? parseFloat(poQty) : 0,
        lastUpdated: currentMonth  // Track when price/PO was set
    };

    // Add product to customer's product list
    let customers = getCustomers();
    const customerIndex = customers.findIndex(c => c.id === customerId);

    if (customerIndex === -1) {
        showToast('❌ Customer not found', 'error');
        return;
    }

    // Initialize products array if it doesn't exist
    if (!customers[customerIndex].products) {
        customers[customerIndex].products = [];
    }

    // Check for duplicate product description
    const existingProduct = customers[customerIndex].products.find(
        p => p.description.toLowerCase() === description.toLowerCase()
    );

    if (existingProduct) {
        showToast('⚠️ Product with this name already exists for this customer', 'warning');
        return;
    }

    // Add the new product
    customers[customerIndex].products.push(newProduct);

    // Save to storage
    saveToStorage('customers', customers);

    // Update all product dropdowns with new product
    updateProductDropdowns(customerId);

    // Auto-select the new product in the target row if we have one
    if (quickProductTargetRow) {
        const productSelect = quickProductTargetRow.querySelector('.product-description');
        const descriptionText = quickProductTargetRow.querySelector('.product-description-text');
        const hsnInput = quickProductTargetRow.querySelector('.product-hsn');
        const rateInput = quickProductTargetRow.querySelector('.product-rate');

        if (productSelect) {
            productSelect.value = newProduct.id;
        }
        if (descriptionText) {
            descriptionText.value = description;
        }
        if (hsnInput && hsn) {
            hsnInput.value = hsn;
        }
        if (rateInput && price) {
            rateInput.value = price;
            rateInput.dispatchEvent(new Event('input'));
        }
    }

    showToast('✅ Product added successfully to customer catalog!', 'success');
    closeQuickProductModal();
}

// Validate PO limit and return result
function validatePOLimit(customerId, product, invoiceQty, currentInvoiceId = null) {
    if (!product.poQty || product.poQty === 0) {
        return { valid: true };
    }

    // Get current month's total quantity for this product from this customer
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const outwardInvoices = getOutwardInvoices();

    // Filter invoices for this customer and month
    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return { valid: true };

    const monthlyTotal = outwardInvoices
        .filter(inv => {
            const invMonth = inv.date.slice(0, 7);
            // Exclude current invoice if editing
            return invMonth === currentMonth &&
                inv.buyerName === customer.companyName &&
                inv.id !== currentInvoiceId;
        })
        .reduce((total, inv) => {
            const productQty = inv.products
                .filter(p => p.description === product.description)
                .reduce((sum, p) => sum + parseFloat(p.quantity || 0), 0);
            return total + productQty;
        }, 0);

    const totalWithCurrent = monthlyTotal + invoiceQty;

    if (totalWithCurrent > product.poQty) {
        const excess = totalWithCurrent - product.poQty;
        return {
            valid: false,
            message: `PO Limit Exceeded! Product "${product.description}" - PO Limit: ${product.poQty}/month, Current Month Total: ${monthlyTotal}, This Invoice: ${invoiceQty}, Total Would Be: ${totalWithCurrent} (Exceeds by: +${excess})`,
            details: {
                productName: product.description,
                limit: product.poQty,
                used: monthlyTotal,
                attempted: invoiceQty,
                exceededBy: excess
            }
        };
    }

    return { valid: true };
}

// Check PO limit and show warning (for real-time feedback)
function checkPOLimit(customerId, product, invoiceQty) {
    const result = validatePOLimit(customerId, product, invoiceQty);
    if (!result.valid) {
        showToast(`⚠️ ${result.message}`, 'warning');
    }
}

// Show persistent PO error at top of form
function showPOError(message) {
    clearPOError();

    const modal = document.getElementById('outwardModal');
    const modalContent = modal.querySelector('.modal-content');

    const errorDiv = document.createElement('div');
    errorDiv.id = 'poErrorBanner';
    errorDiv.style.cssText = `
        background-color: #fee;
        border: 2px solid #f00;
        color: #c00;
        padding: 15px 20px;
        margin-bottom: 20px;
        border-radius: 8px;
        font-weight: bold;
        font-size: 14px;
    `;
    errorDiv.innerHTML = `
        <span style="font-size: 18px; margin-right: 10px;">⚠️</span>
        <span>${message}</span>
        <br><small style="font-weight: normal; margin-top: 8px; display: block;">Please reduce the quantity or contact customer for PO increase.</small>
    `;

    modalContent.insertBefore(errorDiv, modalContent.firstChild);
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Clear PO error banner
function clearPOError() {
    const existingError = document.getElementById('poErrorBanner');
    if (existingError) {
        existingError.remove();
    }
}

// Show PO Limit Exceeded Modal
function showPOLimitModal(details) {
    const modal = document.getElementById('poLimitModal');

    // Populate modal with details
    document.getElementById('poErrorProduct').textContent = details.productName;
    document.getElementById('poErrorLimit').textContent = details.limit.toLocaleString() + ' / month';
    document.getElementById('poErrorUsed').textContent = details.used.toLocaleString();
    document.getElementById('poErrorAttempt').textContent = details.attempted.toLocaleString();
    document.getElementById('poErrorExceed').textContent = '+' + details.exceededBy.toLocaleString();

    // Show modal
    modal.classList.add('active');
}

// Validate that inward invoices exist for the products being invoiced
function validateInwardInvoicesExist(products) {
    const inwardInvoices = getInwardInvoices();

    // Get all materials from inward invoices
    const inwardMaterials = inwardInvoices.map(inv => inv.material.toLowerCase().trim());

    const missingProducts = [];

    products.forEach(product => {
        // Skip empty products
        if (!product.description || product.description.trim() === '' || product.description === '-- Select Product --') {
            return;
        }

        const productDesc = product.description.toLowerCase().trim();

        // Check if this product exists in any inward invoice
        const hasInwardInvoice = inwardMaterials.some(material => {
            // Match if material contains product description or vice versa
            return material.includes(productDesc) || productDesc.includes(material) || material === productDesc;
        });

        if (!hasInwardInvoice) {
            missingProducts.push(product.description);
        }
    });

    return {
        valid: missingProducts.length === 0,
        missingProducts: missingProducts
    };
}

// Show modal for missing inward invoices
function showMissingInwardModal(missingProducts) {
    // Check if modal already exists
    let existingModal = document.getElementById('missingInwardModal');
    if (existingModal) {
        existingModal.remove();
    }

    const productList = missingProducts.map(p => `<li style="padding: 0.25rem 0;">${p}</li>`).join('');

    const modalHtml = `
        <div class="modal active" id="missingInwardModal" style="z-index: 10002;">
            <div class="modal-content" style="max-width: 500px; background: var(--bg-secondary); border: 2px solid var(--danger);">
                <div class="modal-header" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 1.25rem;">
                    <h3 style="color: white; display: flex; align-items: center; gap: 0.5rem;">
                        ⚠️ Cannot Create Outward Invoice
                    </h3>
                </div>
                <div class="modal-body" style="padding: 1.5rem;">
                    <p style="color: var(--text-secondary); margin-bottom: 1rem;">
                        The following products do not have corresponding <strong>Inward Invoices</strong>:
                    </p>
                    <ul style="background: var(--bg-tertiary); padding: 1rem 1rem 1rem 2rem; border-radius: var(--radius-md); color: var(--text-primary); margin-bottom: 1rem;">
                        ${productList}
                    </ul>
                    <div style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); padding: 1rem; border-radius: var(--radius-md);">
                        <p style="color: var(--warning); margin: 0; font-size: 0.9rem;">
                            <strong>📋 Action Required:</strong><br>
                            Please create Inward Invoices for these materials first, then try creating the Outward Invoice again.
                        </p>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-color);">
                    <button type="button" class="btn btn-primary" onclick="closeMissingInwardModal()">
                        OK, I Understand
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Close missing inward modal
function closeMissingInwardModal() {
    const modal = document.getElementById('missingInwardModal');
    if (modal) {
        modal.remove();
    }
}

function saveOutwardInvoice() {
    const id = document.getElementById('outwardId').value;

    // Clear any previous PO errors
    clearPOError();

    // Collect product data
    const productItems = document.querySelectorAll('.product-item');
    const products = [];

    productItems.forEach(item => {
        // Get description text from hidden input or dropdown text
        const descriptionSelect = item.querySelector('.product-description');
        const descriptionText = item.querySelector('.product-description-text');
        let description = '';

        if (descriptionText && descriptionText.value) {
            description = descriptionText.value;
        } else if (descriptionSelect) {
            // Get selected option text
            const selectedOption = descriptionSelect.options[descriptionSelect.selectedIndex];
            description = selectedOption ? selectedOption.text : '';
        }

        products.push({
            description: description,
            hsn: item.querySelector('.product-hsn').value,
            quantity: item.querySelector('.product-qty').value,
            uom: item.querySelector('.product-uom').value,
            rate: item.querySelector('.product-rate').value,
            value: item.querySelector('.product-value').value
        });
    });

    // Validate that inward invoices exist for these products (only for new invoices)
    /* 
    if (!id) {
        const inwardValidation = validateInwardInvoicesExist(products);
        if (!inwardValidation.valid) {
            showMissingInwardModal(inwardValidation.missingProducts);
            return; // Stop saving - no inward invoice for these products
        }
    }
    */

    // Validate PO limits before saving
    const customerDropdown = document.getElementById('customerDropdown');
    const customerId = customerDropdown ? customerDropdown.value : null;

    if (customerId) {
        const customerProducts = getCustomerProducts(customerId);

        for (const product of products) {
            // Skip empty products
            if (!product.description || product.description.trim() === '' || product.description === '-- Select Product --') {
                continue;
            }

            const customerProduct = customerProducts.find(p => p.description === product.description);

            if (customerProduct && customerProduct.poQty > 0) {
                const qty = parseFloat(product.quantity) || 0;

                // Track update date for validation
                const currentMonth = new Date().toISOString().slice(0, 7);
                const isOutdated = customerProduct.lastUpdated && customerProduct.lastUpdated < currentMonth;

                // Only validate if not outdated (if outdated, we already warned user via onProductSelected)
                // But strictly speaking, we should probably warn again or block if it's way over
                // For now, let's enforce the limit check regardless, but maybe the limit itself is the issue if outdated

                if (!isOutdated) {
                    const validationResult = validatePOLimit(customerId, customerProduct, qty, id);

                    if (!validationResult.valid) {
                        // SHOW MODAL INSTEAD OF TOAST
                        showPOLimitModal(validationResult.details);
                        return; // Stop saving immediately
                    }
                }
            }
        }
    }

    // Calculate totals
    const taxableValue = products.reduce((sum, p) => sum + parseFloat(p.value || 0), 0);
    const cgst = taxableValue * 0.09;
    const sgst = taxableValue * 0.09;
    const total = taxableValue + cgst + sgst;

    const invoiceData = {
        id: id || Date.now().toString(),
        invoiceNo: document.getElementById('outwardInvoiceNo').value,
        date: document.getElementById('outwardDate').value,
        poNo: document.getElementById('outwardPONo').value,
        poDate: document.getElementById('outwardPODate').value,
        dcNo: document.getElementById('outwardDCNo').value,
        dcDate: document.getElementById('outwardDCDate').value,
        state: document.getElementById('outwardState').value,
        stateCode: document.getElementById('outwardStateCode').value,
        paymentTerms: document.getElementById('outwardPaymentTerms').value,
        vehicle: document.getElementById('outwardVehicle').value,
        buyerName: document.getElementById('outwardBuyerName').value,
        buyerAddress: document.getElementById('outwardBuyerAddress').value,
        shippingAddress: document.getElementById('outwardShippingAddress').value || document.getElementById('outwardBuyerAddress').value,
        sameAsBuyerAddress: document.getElementById('sameAsBuyerAddress').checked,
        gstin: document.getElementById('outwardGSTIN').value,
        contact: document.getElementById('outwardContact').value,
        products: products,
        taxableValue: taxableValue.toFixed(2),
        cgst: cgst.toFixed(2),
        sgst: sgst.toFixed(2),
        total: total.toFixed(2),
        paymentStatus: document.getElementById('outwardPaymentStatus').value,
        amountPaid: parseFloat(document.getElementById('outwardAmountPaid').value) || 0,
        amountInWords: numberToWords(Math.round(total)) + ' Only',
        locked: true
    };

    let invoices = getOutwardInvoices();

    if (id) {
        // Update existing
        invoices = invoices.map(inv => inv.id === id ? invoiceData : inv);
    } else {
        // Add new
        invoices.push(invoiceData);
    }

    saveToStorage('outwardInvoices', invoices);
    closeOutwardModal();
    loadOutwardInvoices();
    loadDashboard();

    // Switch to Outward Invoices tab to show the new invoice
    const outwardLink = document.querySelector('.nav-link[data-module="outward-invoice"]');
    if (outwardLink) {
        outwardLink.click();
    }

    showToast('Tax invoice saved successfully!', 'success');
}

function loadOutwardInvoices() {
    const invoices = getOutwardInvoices();
    const tbody = document.getElementById('outwardTableBody');

    if (invoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center" style="color: var(--text-secondary);">
                    No outward invoices yet. Click "New Tax Invoice" to create one.
                </td>
            </tr>
        `;
        return;
    }

    // Sort by Date Descending first, then by Invoice Number Descending
    invoices.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) {
            return dateB.localeCompare(dateA); // Newer dates first
        }

        // Tie-breaker: Invoice Number Descending
        return b.invoiceNo.localeCompare(a.invoiceNo, undefined, { numeric: true });
    });

    // Get current month for comparison
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    // Pre-calculate monthly totals for outward invoices
    const monthlyTotals = {};
    invoices.forEach(inv => {
        const invoiceDate = inv.date || new Date().toISOString().slice(0, 10);
        const invoiceMonth = invoiceDate.slice(0, 7);
        const amount = parseFloat(inv.total) || parseFloat(inv.totalAmount) || parseFloat(inv.grandTotal) || parseFloat(inv.amount) || 0;
        monthlyTotals[invoiceMonth] = (monthlyTotals[invoiceMonth] || 0) + amount;
    });

    let html = '';
    let lastMonth = null;

    invoices.forEach(inv => {
        // Defensive check for missing date
        const invoiceDate = inv.date || new Date().toISOString().slice(0, 10);
        const invoiceMonth = invoiceDate.slice(0, 7); // YYYY-MM
        const [year, month] = invoiceMonth.split('-');
        const monthName = monthNames[parseInt(month) - 1] || 'Unknown';
        const isCurrentMonth = invoiceMonth === currentMonth;

        // Add month separator if new month
        if (invoiceMonth !== lastMonth) {
            const monthLabel = `${monthName} ${year}`;
            const monthColor = isCurrentMonth ?
                'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' :
                'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)';
            const monthIcon = isCurrentMonth ? '📤' : '📦';
            const monthTotal = monthlyTotals[invoiceMonth] || 0;

            html += `
                <tr class="month-separator">
                    <td colspan="8" style="
                        background: ${monthColor};
                        color: white;
                        font-weight: 600;
                        font-size: 1rem;
                        padding: 0.75rem 1rem;
                        border: none;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    ">
                        ${monthIcon} ${monthLabel} ${isCurrentMonth ? '<span style="background: rgba(255,255,255,0.2); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-left: 0.5rem;">CURRENT MONTH</span>' : ''}
                        <span style="float: right; font-size: 0.9rem; text-transform: none;">Total: ₹${monthTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </td>
                </tr>
            `;
            lastMonth = invoiceMonth;
        }

        const badgeClass = inv.paymentStatus === 'Paid' ? 'success' : (inv.paymentStatus === 'Partial' ? 'warning' : 'danger');
        html += `
            <tr>
                <td>${inv.invoiceNo}</td>
                <td>${formatDate(inv.date)}</td>
                <td>${inv.buyerName}</td>
                <td>${inv.gstin}</td>
                <td>₹${parseFloat(inv.taxableValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td>₹${parseFloat(inv.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td><span class="badge badge-${badgeClass}">${inv.paymentStatus}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn pdf" onclick="downloadOutwardInvoicePDF('${inv.id}')" title="Download PDF">📄</button>
                        <button class="icon-btn view" onclick="viewOutwardInvoice('${inv.id}')" title="View/Print">🖨️</button>
                        <button class="icon-btn edit" onclick="openOutwardModal('${inv.id}')" title="Edit">✏️</button>
                        <button class="icon-btn delete" onclick="deleteOutwardInvoice('${inv.id}')" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function deleteOutwardInvoice(id) {
    if (confirm('Are you sure you want to delete this tax invoice?')) {
        let invoices = getOutwardInvoices();
        invoices = invoices.filter(inv => inv.id !== id);
        saveToStorage('outwardInvoices', invoices);
        loadOutwardInvoices();
        loadDashboard();
        showToast('Tax invoice deleted', 'info');
    }
}

function viewOutwardInvoice(id) {
    const invoices = getOutwardInvoices();
    const invoice = invoices.find(inv => inv.id === id);
    if (!invoice) return;

    // Create printable invoice
    const printWindow = window.open('', '_blank');
    printWindow.document.write(generatePrintableInvoice(invoice));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
}

function printInvoice() {
    // Get current form data
    const id = document.getElementById('outwardId').value;

    if (!id) {
        showToast('Please save the invoice first before printing', 'warning');
        return;
    }

    viewOutwardInvoice(id);
}

function generatePrintableInvoice(invoice) {
    let productsHTML = '';
    invoice.products.forEach((product, index) => {
        // Display "NaN" for empty fields or placeholder text
        let desc = product.description && product.description.trim() ? product.description : '';
        // Filter out "-- Select Product --" placeholder
        if (desc === '-- Select Product --' || desc === '') {
            desc = '';
        }

        const hsn = product.hsn && product.hsn.trim() ? product.hsn : '';
        const qty = product.quantity && product.quantity !== '' ? product.quantity : '';
        const uom = product.uom && product.uom.trim() ? product.uom : '';
        const rate = product.rate && product.rate !== '' ? parseFloat(product.rate).toFixed(2) : '';
        const value = product.value && product.value !== '' ? parseFloat(product.value).toFixed(2) : '';

        productsHTML += `
            <tr>
                <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 10px;">${index + 1}</td>
                <td style="border: 1px solid #000; padding: 6px 8px; font-size: 10px;">${desc}</td>
                <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 10px;">${hsn}</td>
                <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 10px;">${qty}</td>
                <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 10px;">${uom}</td>
                <td style="border: 1px solid #000; padding: 6px 4px; text-align: right; font-size: 10px;">${rate}</td>
                <td style="border: 1px solid #000; padding: 6px 4px; text-align: right; font-size: 10px;">${value}</td>
            </tr>
        `;
    });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Tax Invoice - ${invoice.invoiceNo}</title>
            <style>
                @page { 
                    size: A4; 
                    margin: 8mm; 
                }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { 
                    width: 100%;
                    height: 100%;
                    margin: 0;
                    padding: 0;
                }
                body { 
                    font-family: Arial, sans-serif; 
                    font-size: 11px; 
                    color: #000; 
                    line-height: 1.4;
                }
                .invoice-container { 
                    width: 100%;
                    min-height: 100vh;
                    margin: 0; 
                    border: 2px solid #000;
                    display: flex;
                    flex-direction: column;
                }
                
                /* Header Section */
                .header-section { 
                    display: table;
                    width: 100%;
                    border-bottom: 2px solid #000;
                }
                .header-left {
                    display: table-cell;
                    width: 85px;
                    vertical-align: middle;
                    padding: 12px;
                    border-right: 1px solid #000;
                }
                .logo-box {
                    width: 65px;
                    height: 65px;
                    border: 1px solid #000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 20px;
                }
                .header-right {
                    display: table-cell;
                    vertical-align: middle;
                    padding: 10px 12px;
                    text-align: center;
                }
                .company-name { 
                    font-size: 18px; 
                    font-weight: bold; 
                    margin-bottom: 6px;
                    text-align: center;
                }
                .company-details { 
                    font-size: 11px; 
                    margin-bottom: 6px; 
                    line-height: 1.5;
                    text-align: center;
                }
                .gst-details { 
                    font-size: 11px; 
                    margin-top: 6px;
                    text-align: center;
                }
                
                /* Title */
                .invoice-title-section {
                    text-align: center;
                    padding: 8px;
                    border-bottom: 2px solid #000;
                }
                .invoice-title { 
                    font-size: 18px; 
                    font-weight: bold;
                }
                
                /* Info Tables */
                .info-section {
                    display: table;
                    width: 100%;
                    border-bottom: 2px solid #000;
                }
                .info-left, .info-right {
                    display: table-cell;
                    width: 50%;
                    padding: 10px 12px;
                    font-size: 10px;
                    vertical-align: top;
                }
                .info-left {
                    border-right: 1px solid #000;
                }
                .info-row {
                    margin-bottom: 5px;
                    display: flex;
                    align-items: baseline;
                }
                .info-label {
                    font-weight: normal;
                    width: 100px;
                    flex-shrink: 0;
                }
                .info-colon {
                    width: 15px;
                    text-align: center;
                    flex-shrink: 0;
                }
                .info-value {
                    flex-grow: 1;
                }
                
                /* Address Section */
                .address-section {
                    display: table;
                    width: 100%;
                    border-bottom: 2px solid #000;
                }
                .address-left, .address-right {
                    display: table-cell;
                    width: 50%;
                    padding: 10px 12px;
                    font-size: 10px;
                    vertical-align: top;
                }
                .address-left {
                    border-right: 1px solid #000;
                }
                .address-title {
                    font-weight: bold;
                    margin-bottom: 6px;
                }
                
                /* Products Table */
                .products-table { 
                    width: 100%; 
                    border-collapse: collapse;
                    flex-grow: 1;
                }
                .products-table thead {
                    background-color: #b4c7e7;
                }
                .products-table th { 
                    border: 1px solid #000; 
                    padding: 8px 6px; 
                    font-size: 10px;
                    font-weight: bold;
                    text-align: center;
                }
                .products-table td {
                    border: 1px solid #000;
                }
                .products-table .totals-row td {
                    padding: 8px 12px;
                    font-size: 11px;
                }
                .products-table .totals-label {
                    text-align: right;
                    font-weight: bold;
                }
                .products-table .totals-value {
                    text-align: right;
                    font-weight: bold;
                }
                
                /* Amount in Words */
                .amount-words-section {
                    padding: 10px 12px;
                    font-size: 11px;
                    border-bottom: 2px solid #000;
                }
                
                /* Declaration */
                .declaration-section {
                    padding: 12px 12px;
                    font-size: 10px;
                    line-height: 1.5;
                    border-bottom: 2px solid #000;
                    min-height: 100px;
                    flex-grow: 1;
                }
                
                /* Footer */
                .footer-section {
                    text-align: right;
                    padding: 40px 12px 12px 12px;
                    font-size: 11px;
                }
                .footer-company {
                    font-weight: bold;
                    margin-bottom: 50px;
                }
                .footer-signature {
                    display: inline-block;
                    padding-top: 20px;
                    min-width: 180px;
                }
                
                /* Jurisdiction */
                .jurisdiction-section {
                    text-align: center;
                    padding: 10px;
                    font-size: 10px;
                    margin-top: auto;
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <!-- Header with Logo and Company Details -->
                <div class="header-section">
                    <div class="header-left">
                        <img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4RgCRXhpZgAATU0AKgAAAAgAAgEOAAIAAAANAAAAJgEPAAIAABfGAAAANAAAAABXb3JrZmxvdzoge30AAFByb21wdDogeyIzNiI6IHsiaW5wdXRzIjogeyJ0aWxlX3dpZHRoIjogWyIxMTEiLCAwXSwgInRpbGVfaGVpZ2h0IjogWyIxMTEiLCAxXSwgImltYWdlIjogWyIyMDAiLCAwXX0sICJjbGFzc190eXBlIjogIlRUUF9JbWFnZV9UaWxlX0JhdGNoIiwgIl9tZXRhIjogeyJ0aXRsZSI6ICJcdWQ4M2VcdWRlOTBUVFBfSW1hZ2VfVGlsZV9CYXRjaCJ9fSwgIjExMSI6IHsiaW5wdXRzIjogeyJ3aWR0aF9mYWN0b3IiOiBbIjE4NyIsIDBdLCAiaGVpZ2h0X2ZhY3RvciI6IFsiMTg2IiwgMF0sICJvdmVybGFwX3JhdGUiOiAwLjEsICJpbWFnZSI6IFsiMjAwIiwgMF19LCAiY2xhc3NfdHlwZSI6ICJUVFBfVGlsZV9pbWFnZV9zaXplIiwgIl9tZXRhIjogeyJ0aXRsZSI6ICJcdWQ4M2VcdWRlOTBUVFBfVGlsZV9pbWFnZV9zaXplIn19LCAiMTIzIjogeyJpbnB1dHMiOiB7ImltYWdlIjogImFiYjQzMTU4LTI1MDAtNDczZS1hNjJmLTIzMDhiNjBkYTg1Zi5qcGcifSwgImNsYXNzX3R5cGUiOiAiTG9hZEltYWdlIiwgIl9tZXRhIjogeyJ0aXRsZSI6ICJcdTUyYTBcdThmN2RcdTU2ZmVcdTUwY2YifSwgImlzX2NoYW5nZWQiOiBbIjBjMmUzMjIyZjMzZGNkYTI1YjQzNTAxNDJlYjQ5ZGY5ZjUwNjJhOTQ4NzJhNzg3NTAyZDU3YjRmZTRhMWE4MmUiXX0sICIxMjUiOiB7ImlucHV0cyI6IHsicGFkZGluZyI6IFsiMTk1IiwgMF0sICJ0aWxlcyI6IFsiMjAxIiwgMF0sICJwb3NpdGlvbnMiOiBbIjM2IiwgMV0sICJvcmlnaW5hbF9zaXplIjogWyIzNiIsIDJdLCAiZ3JpZF9zaXplIjogWyIzNiIsIDNdfSwgImNsYXNzX3R5cGUiOiAiVFRQX0ltYWdlX0Fzc3kiLCAiX21ldGEiOiB7InRpdGxlIjogIlx1ZDgzZVx1ZGU5MFRUUF9JbWFnZV9Bc3N5In19LCAiMTI4IjogeyJpbnB1dHMiOiB7InNlZWQiOiBbIjE5MiIsIDBdLCAicmVzb2x1dGlvbiI6IFsiMTk0IiwgMF0sICJtYXhfcmVzb2x1dGlvbiI6IDAsICJiYXRjaF9zaXplIjogMSwgInVuaWZvcm1fYmF0Y2hfc2l6ZSI6IGZhbHNlLCAiY29sb3JfY29ycmVjdGlvbiI6ICJ3YXZlbGV0IiwgInRlbXBvcmFsX292ZXJsYXAiOiAwLCAicHJlcGVuZF9mcmFtZXMiOiAwLCAiaW5wdXRfbm9pc2Vfc2NhbGUiOiAwLjAsICJsYXRlbnRfbm9pc2Vfc2NhbGUiOiAwLjAsICJvZmZsb2FkX2RldmljZSI6ICJjcHUiLCAiZW5hYmxlX2RlYnVnIjogZmFsc2UsICJpbWFnZSI6IFsiMTQzIiwgMF0sICJkaXQiOiBbIjEyOSIsIDBdLCAidmFlIjogWyIxMzAiLCAwXX0sICJjbGFzc190eXBlIjogIlNlZWRWUjJWaWRlb1Vwc2NhbGVyIiwgIl9tZXRhIjogeyJ0aXRsZSI6ICJTZWVkVlIyIFZpZGVvIFVwc2NhbGVyICh2Mi41LjE0KSJ9fSwgIjEyOSI6IHsiaW5wdXRzIjogeyJtb2RlbCI6ICJzZWVkdnIyX2VtYV8zYl9mcDhfZTRtM2ZuLnNhZmV0ZW5zb3JzIiwgImRldmljZSI6ICJjdWRhOjAiLCAiYmxvY2tzX3RvX3N3YXAiOiAwLCAic3dhcF9pb19jb21wb25lbnRzIjogZmFsc2UsICJvZmZsb2FkX2RldmljZSI6ICJjcHUiLCAiY2FjaGVfbW9kZWwiOiB0cnVlLCAiYXR0ZW50aW9uX21vZGUiOiAic2RwYSJ9LCAiY2xhc3NfdHlwZSI6ICJTZWVkVlIyTG9hZERpVE1vZGVsIiwgIl9tZXRhIjogeyJ0aXRsZSI6ICJTZWVkVlIyIChEb3duKUxvYWQgRGlUIE1vZGVsIn19LCAiMTMwIjogeyJpbnB1dHMiOiB7Im1vZGVsIjogImVtYV92YWVfZnAxNi5zYWZldGVuc29ycyIsICJkZXZpY2UiOiAiY3VkYTowIiwgImVuY29kZV90aWxlZCI6IGZhbHNlLCAiZW5jb2RlX3RpbGVfc2l6ZSI6IDEwMjQsICJlbmNvZGVfdGlsZV9vdmVybGFwIjogMTI4LCAiZGVjb2RlX3RpbGVkIjogdHJ1ZSwgImRlY29kZV90aWxlX3NpemUiOiAxMDI0LCAiZGVjb2RlX3RpbGVfb3ZlcmxhcCI6IDEyOCwgInRpbGVfZGVidWciOiAiZmFsc2UiLCAib2ZmbG9hZF9kZXZpY2UiOiAiY3B1IiwgImNhY2hlX21vZGVsIjogdHJ1ZX0sICJjbGFzc190eXBlIjogIlNlZWRWUjJMb2FkVkFFTW9kZWwiLCAiX21ldGEiOiB7InRpdGxlIjogIlNlZWRWUjIgKERvd24pTG9hZCBWQUUgTW9kZWwifX0sICIxNDMiOiB7ImlucHV0cyI6IHsidXBzY2FsZV9tZXRob2QiOiAibGFuY3pvcyIsICJzY2FsZV9ieSI6IFsiMTkzIiwgMF0sICJpbWFnZSI6IFsiMzYiLCAwXX0sICJjbGFzc190eXBlIjogIkltYWdlU2NhbGVCeSIsICJfbWV0YSI6IHsidGl0bGUiOiAiXHU3ZjI5XHU2NTNlXHU1NmZlXHU1MGNmXHVmZjA4XHU2YmQ0XHU0ZjhiXHVmZjA5In19LCAiMTYwIjogeyJpbnB1dHMiOiB7ImZpbGVuYW1lX3ByZWZpeCI6ICJDb21meVVJIiwgImZpbGVuYW1lX2tleXMiOiAiIiwgImZvbGRlcm5hbWVfcHJlZml4IjogIiIsICJmb2xkZXJuYW1lX2tleXMiOiAiIiwgImRlbGltaXRlciI6ICItIiwgInNhdmVfam9iX2RhdGEiOiAiZGlzYWJsZWQiLCAiam9iX2RhdGFfcGVyX2ltYWdlIjogZmFsc2UsICJqb2JfY3VzdG9tX3RleHQiOiAiIiwgInNhdmVfbWV0YWRhdGEiOiB0cnVlLCAiY291bnRlcl9kaWdpdHMiOiA0LCAiY291bnRlcl9wb3NpdGlvbiI6ICJsYXN0IiwgIm9uZV9jb3VudGVyX3Blcl9mb2xkZXIiOiBmYWxzZSwgImltYWdlX3ByZXZpZXciOiBmYWxzZSwgIm91dHB1dF9leHQiOiAiLmpwZyIsICJxdWFsaXR5IjogOTAsICJuYW1lZF9rZXlzIjogZmFsc2UsICJpbWFnZXMiOiBbIjIwMiIsIDBdfSwgImNsYXNzX3R5cGUiOiAiU2F2ZUltYWdlRXh0ZW5kZWQiLCAiX21ldGEiOiB7InRpdGxlIjogIlx1ZDgzZFx1ZGNiZSBTYXZlIEltYWdlIEV4dGVuZGVkIDIuODgifX0sICIxNjgiOiB7ImlucHV0cyI6IHsidXBzY2FsZV9tZXRob2QiOiAibGFuY3pvcyIsICJtZWdhcGl4ZWxzIjogWyIxNjkiLCAwXSwgImltYWdlIjogWyIxMjMiLCAwXX0sICJjbGFzc190eXBlIjogIkltYWdlU2NhbGVUb1RvdGFsUGl4ZWxzIiwgIl9tZXRhIjogeyJ0aXRsZSI6ICJcdTdmMjlcdTY1M2VcdTU2ZmVcdTUwY2ZcdWZmMDhcdTUwY2ZcdTdkMjBcdWZmMDkifX0sICIxNjkiOiB7ImlucHV0cyI6IHsidmFsdWUiOiAyLjB9LCAiY2xhc3NfdHlwZSI6ICJGbG9hdENvbnN0YW50IiwgIl9tZXRhIjogeyJ0aXRsZSI6ICJcdTc2ZWVcdTY4MDdcdTUwY2ZcdTdkMjBcdWZmMDhcdTc2N2VcdTRlMDdcdTUwY2ZcdTdkMjBcdWZmMDkifX0sICIxNzAiOiB7ImlucHV0cyI6IHsiaW1hZ2UiOiBbIjM2IiwgMF19LCAiY2xhc3NfdHlwZSI6ICJHZXRJbWFnZVNpemUiLCAiX21ldGEiOiB7InRpdGxlIjogIkdldCBJbWFnZSBTaXplIn19LCAiMTc1IjogeyJpbnB1dHMiOiB7ImltYWdlIjogWyIxMjMiLCAwXX0sICJjbGFzc190eXBlIjogIkdldEltYWdlU2l6ZSIsICJfbWV0YSI6IHsidGl0bGUiOiAiR2V0IEltYWdlIFNpemUifX0sICIxODYiOiB7ImlucHV0cyI6IHsiZXhwcmVzc2lvbiI6ICJjIC0gKChhIC8gYikgPiAxLjIpIiwgImEiOiBbIjE3NSIsIDBdLCAiYiI6IFsiMTc1IiwgMV0sICJjIjogWyIxOTkiLCAwXX0sICJjbGFzc190eXBlIjogIk1hdGhFeHByZXNzaW9uX1VUSyIsICJfbWV0YSI6IHsidGl0bGUiOiAiTWF0aCBFeHByZXNzaW9uIChVVEspIn0sICJpc19jaGFuZ2VkIjogWyJjIC0gKChhIC8gYikgPiAxLjIpIl19LCAiMTg3IjogeyJpbnB1dHMiOiB7ImV4cHJlc3Npb24iOiAiYyAtICgoYSAvIGIpIDwgMC44MykiLCAiYSI6IFsiMTc1IiwgMF0sICJiIjogWyIxNzUiLCAxXSwgImMiOiBbIjE5OSIsIDBdfSwgImNsYXNzX3R5cGUiOiAiTWF0aEV4cHJlc3Npb25fVVRLIiwgIl9tZXRhIjogeyJ0aXRsZSI6ICJNYXRoIEV4cHJlc3Npb24gKFVUSykifSwgImlzX2NoYW5nZWQiOiBbImMgLSAoKGEgLyBiKSA8IDAuODMpIl19LCAiMTkyIjogeyJpbnB1dHMiOiB7InZhbHVlIjogNH0sICJjbGFzc190eXBlIjogIklOVENvbnN0YW50IiwgIl9tZXRhIjogeyJ0aXRsZSI6ICJcdTk2OGZcdTY3M2FcdTc5Y2RcdTViNTAifX0sICIxOTMiOiB7ImlucHV0cyI6IHsidmFsdWUiOiAwLjF9LCAiY2xhc3NfdHlwZSI6ICJGbG9hdENvbnN0YW50IiwgIl9tZXRhIjogeyJ0aXRsZSI6ICJcdTY1M2VcdTU5MjdcdTUyNGRcdTdmMjlcdTY1M2VcdTUwMGRcdTY1NzAifX0sICIxOTQiOiB7ImlucHV0cyI6IHsidmFsdWUiOiAxNTM2fSwgImNsYXNzX3R5cGUiOiAiSU5UQ29uc3RhbnQiLCAiX21ldGEiOiB7InRpdGxlIjogIlx1NTIwNlx1NzI0N1x1NTZmZVx1NzI0N1x1NzdlZFx1OGZiOVx1NjUzZVx1NTkyN1x1NTQwZSJ9fSwgIjE5NSI6IHsiaW5wdXRzIjogeyJ2YWx1ZSI6IDY0fSwgImNsYXNzX3R5cGUiOiAiSU5UQ29uc3RhbnQiLCAiX21ldGEiOiB7InRpdGxlIjogIlx1NTIwNlx1NzI0N1x1NTQwZVx1N2VjNFx1NTQwOFx1OTFjZFx1NTNlMFx1NTBjZlx1N2QyMCJ9fSwgIjE5NiI6IHsiaW5wdXRzIjogeyJpbWFnZSI6IFsiMTY4IiwgMF19LCAiY2xhc3NfdHlwZSI6ICJHZXRJbWFnZVNpemUiLCAiX21ldGEiOiB7InRpdGxlIjogIkdldCBJbWFnZSBTaXplIn19LCAiMTk5IjogeyJpbnB1dHMiOiB7InZhbHVlIjogM30sICJjbGFzc190eXBlIjogIklOVENvbnN0YW50IiwgIl9tZXRhIjogeyJ0aXRsZSI6ICJcdTZiY2ZcdTg4NGNcdTUyMDZcdTcyNDdcdTY1NzBcdTkxY2YifX0sICIyMDAiOiB7ImlucHV0cyI6IHsid2lkdGgiOiBbIjE5NiIsIDBdLCAiaGVpZ2h0IjogWyIxOTYiLCAxXSwgInVwc2NhbGVfbWV0aG9kIjogImxhbmN6b3MiLCAia2VlcF9wcm9wb3J0aW9uIjogImNyb3AiLCAicGFkX2NvbG9yIjogIjAsIDAsIDAiLCAiY3JvcF9wb3NpdGlvbiI6ICJjZW50ZXIiLCAiZGl2aXNpYmxlX2J5IjogNCwgImRldmljZSI6ICJjcHUiLCAiaW1hZ2UiOiBbIjE2OCIsIDBdfSwgImNsYXNzX3R5cGUiOiAiSW1hZ2VSZXNpemVLSnYyIiwgIl9tZXRhIjogeyJ0aXRsZSI6ICJSZXNpemUgSW1hZ2UgdjIifX0sICIyMDEiOiB7ImlucHV0cyI6IHsid2lkdGgiOiBbIjE3MCIsIDBdLCAiaGVpZ2h0IjogWyIxNzAiLCAxXSwgInVwc2NhbGVfbWV0aG9kIjogImxhbmN6b3MiLCAia2VlcF9wcm9wb3J0aW9uIjogImNyb3AiLCAicGFkX2NvbG9yIjogIjAsIDAsIDAiLCAiY3JvcF9wb3NpdGlvbiI6ICJjZW50ZXIiLCAiZGl2aXNpYmxlX2J5IjogNCwgImRldmljZSI6ICJjcHUiLCAiaW1hZ2UiOiBbIjEyOCIsIDBdfSwgImNsYXNzX3R5cGUiOiAiSW1hZ2VSZXNpemVLSnYyIiwgIl9tZXRhIjogeyJ0aXRsZSI6ICJSZXNpemUgSW1hZ2UgdjIifX0sICIyMDIiOiB7ImlucHV0cyI6IHsic3dpdGNoIjogWyIyMTEiLCAwXSwgIm9uX2ZhbHNlIjogWyIyMDUiLCAwXSwgIm9uX3RydWUiOiBbIjEyNSIsIDBdfSwgImNsYXNzX3R5cGUiOiAiTGF6eVN3aXRjaEtKIiwgIl9tZXRhIjogeyJ0aXRsZSI6ICJcdTY2MmZcdTU0MjZcdTY1M2VcdTU5Mjc0S1x1NGVlNVx1NGUwYSJ9fSwg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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAk+AEASCT4flBoABAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARBVAAABAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASQSd9gWJEUVJjcFAAQFBAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABJBJ8AWBAAVQARAUVAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABJAgRRUkDYSqKICgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACT4AogKzXO1EyCgoCAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkxvAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMXd4t17eO0g0CgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAICgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAoAJPUAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQFAAABAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQFABKvCQNhFFEBQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQFAAABAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASQUSAqT4AbCKKICgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgKAICgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACQFSfCQAUEQVQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABJBQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQFABJBQAEBQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAUAEkCAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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" alt="Company Logo" style="width: 60px; height: 60px; display: block; border: 1px solid #000; object-fit: contain;" />
                    </div>
                    <div class="header-right">
                        <div class="company-name">M/s.Sri Veera Raghava Sheet Metal Component</div>
                        <div class="company-details">
                            S-115 Kakkalur SIDCO Industrial Estate, Kakkalur, Thiruvallur, Tamilnadu – 602003<br>
                            Contact : 9841616576 / 7010048939, Mail : sriveeraraghavasmc@gmail.com
                        </div>
                        <div class="gst-details">GSTIN : 33AHFPV5633G1Z9&nbsp;&nbsp;&nbsp;PAN : AHFPV5633G</div>
                    </div>
                </div>
                
                <!-- Invoice Title -->
                <div class="invoice-title-section">
                    <div class="invoice-title">Tax Invoice</div>
                </div>
                
                <!-- Invoice Details Section -->
                <div class="info-section">
                    <div class="info-left">
                        <div class="info-row">
                            <span class="info-label">Invoice No</span>
                            <span class="info-colon">:</span>
                            <span class="info-value">${invoice.invoiceNo}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Invoice Date</span>
                            <span class="info-colon">:</span>
                            <span class="info-value">${formatDate(invoice.date)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">DC No.</span>
                            <span class="info-colon">:</span>
                            <span class="info-value">${invoice.dcNo || ''}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">DC Date</span>
                            <span class="info-colon">:</span>
                            <span class="info-value">${formatDate(invoice.dcDate)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Payment Terms</span>
                            <span class="info-colon">:</span>
                            <span class="info-value">${invoice.paymentTerms || ''}</span>
                        </div>
                    </div>
                    <div class="info-right">
                        <div class="info-row">
                            <span class="info-label">PO No</span>
                            <span class="info-colon">:</span>
                            <span class="info-value">${invoice.poNo || ''}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">PO Date</span>
                            <span class="info-colon">:</span>
                            <span class="info-value">${formatDate(invoice.poDate)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Transporter Name</span>
                            <span class="info-colon">:</span>
                            <span class="info-value"></span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Vehicle No</span>
                            <span class="info-colon">:</span>
                            <span class="info-value">${invoice.vehicle || ''}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Address Section -->
                <div class="address-section">
                    <div class="address-left">
                        <div class="address-title">Buyer Address &nbsp;&nbsp;&nbsp;:</div>
                        <div style="margin-top: 4px;">
                            ${invoice.buyerName}<br>
                            ${invoice.buyerAddress.replace(/\n/g, '<br>')}<br>
                            <strong>Contact :</strong> ${invoice.contact || ''}<br>
                            <strong>GSTIN :</strong> ${invoice.gstin}
                        </div>
                    </div>
                    <div class="address-right">
                        <div class="address-title">Shipment Address &nbsp;&nbsp;&nbsp;:</div>
                        <div style="margin-top: 4px;">
                            ${invoice.buyerName}<br>
                            ${(invoice.shippingAddress || invoice.buyerAddress).replace(/\n/g, '<br>')}<br>
                            <strong>Contact :</strong> ${invoice.contact || ''}<br>
                            <strong>GSTIN :</strong> ${invoice.gstin}
                        </div>
                    </div>
                </div>
                
                <!-- Products Table -->
                <table class="products-table">
                    <thead>
                        <tr>
                            <th style="width: 6%;">S.No</th>
                            <th style="width: 36%;">Description of Goods</th>
                            <th style="width: 12%;">HSN/SAC</th>
                            <th style="width: 10%;">Quantity</th>
                            <th style="width: 8%;">UOM</th>
                            <th style="width: 12%;">Rate</th>
                            <th style="width: 16%;">Taxable Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productsHTML}
                        <tr class="totals-row">
                            <td colspan="6" class="totals-label">Total Taxable Value</td>
                            <td class="totals-value">${parseFloat(invoice.taxableValue).toFixed(2)}</td>
                        </tr>
                        <tr class="totals-row">
                            <td colspan="6" style="text-align: right; padding: 5px 8px; font-size: 9px;">Out Put CGST @ 9%</td>
                            <td style="text-align: right; padding: 5px 8px; font-size: 9px;">${parseFloat(invoice.cgst).toFixed(2)}</td>
                        </tr>
                        <tr class="totals-row">
                            <td colspan="6" style="text-align: right; padding: 5px 8px; font-size: 9px;">Out Put SGST @ 9%</td>
                            <td style="text-align: right; padding: 5px 8px; font-size: 9px;">${parseFloat(invoice.sgst).toFixed(2)}</td>
                        </tr>
                        <tr class="totals-row">
                            <td colspan="6" class="totals-label">Total Amount ( Including Tax )</td>
                            <td class="totals-value">${parseFloat(invoice.total).toFixed(2)}</td>
                        </tr>
                        <tr class="totals-row">
                            <td colspan="6" class="totals-label">Rounding off</td>
                            <td class="totals-value">${Math.round(parseFloat(invoice.total))}.00</td>
                        </tr>
                    </tbody>
                </table>
                
                <!-- Amount in Words -->
                <div class="amount-words-section">
                    <strong>Amount Chargeable (In Words) :</strong> ${invoice.amountInWords}
                </div>
                
                <!-- Declaration -->
                <div class="declaration-section">
                    <strong>Declaration :</strong><br>
                    We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct
                    <div class="footer-section" style="border: none; padding: 20px 0 0 0; margin: 0;">
                        <div class="footer-company">For Sri Veera Raghava Sheet Metal Component</div>
                        <div class="footer-signature">Authorised Signatory</div>
                    </div>
                </div>
                
                <!-- Jurisdiction -->
                <div class="jurisdiction-section">
                    Subjected to Chennai Jurisdiction
                </div>
            </div>
        </body>
        </html>
    `;
}

// ===================================
// EMPLOYEE MODULE
// ===================================

function openEmployeeModal(id = null) {
    const modal = document.getElementById('employeeModal');
    const form = document.getElementById('employeeForm');
    form.reset();

    if (id) {
        // Edit mode
        const employees = getEmployees();
        const employee = employees.find(emp => emp.id === id);
        if (employee) {
            document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
            document.getElementById('employeeId').value = employee.id;
            document.getElementById('employeeEmpId').value = employee.empId;
            document.getElementById('employeeName').value = employee.name;
            document.getElementById('employeeDesignation').value = employee.designation;
            document.getElementById('employeeDepartment').value = employee.department;
            document.getElementById('employeeContact').value = employee.contact;
            document.getElementById('employeeEmail').value = employee.email || '';
            document.getElementById('employeeDOJ').value = employee.doj;
            document.getElementById('employeeAadhar').value = employee.aadhar || '';
            document.getElementById('employeePAN').value = employee.pan || '';
            document.getElementById('employeeEducation').value = employee.education || '';
        }
    } else {
        // New mode
        document.getElementById('employeeModalTitle').textContent = 'Add Employee';
        const employees = getEmployees();
        const nextEmpId = `EMP${String(employees.length + 1).padStart(4, '0')}`;
        document.getElementById('employeeEmpId').value = nextEmpId;
    }

    modal.classList.add('active');
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').classList.remove('active');
}

function saveEmployee() {
    const id = document.getElementById('employeeId').value;
    const employeeData = {
        id: id || Date.now().toString(),
        empId: document.getElementById('employeeEmpId').value,
        name: document.getElementById('employeeName').value,
        designation: document.getElementById('employeeDesignation').value,
        department: document.getElementById('employeeDepartment').value,
        contact: document.getElementById('employeeContact').value,
        email: document.getElementById('employeeEmail').value,
        doj: document.getElementById('employeeDOJ').value,
        aadhar: document.getElementById('employeeAadhar').value,
        pan: document.getElementById('employeePAN').value.toUpperCase(),
        education: document.getElementById('employeeEducation').value
    };

    let employees = getEmployees();

    if (id) {
        // Update existing
        employees = employees.map(emp => emp.id === id ? employeeData : emp);
    } else {
        // Add new
        employees.push(employeeData);
    }

    saveToStorage('employees', employees);
    closeEmployeeModal();
    loadEmployees();
    loadDashboard();
    showToast('Employee saved successfully!', 'success');
}

function loadEmployees() {
    const employees = getEmployees();
    const tbody = document.getElementById('employeeTableBody');

    // Get salary data for each employee
    const salaryRecords = loadFromStorage('salaryRecords') || [];

    if (employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="color: var(--text-secondary);">
                    No employees yet. Click "Add Employee" to register.
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    employees.forEach(emp => {
        // Find the latest salary record for this employee
        const empSalary = salaryRecords.find(s => s.employeeId === emp.id);
        const netSalary = empSalary ? empSalary.netSalary : 0;
        const salaryDisplay = netSalary > 0
            ? `₹${parseFloat(netSalary).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`
            : '<span style="color: var(--text-secondary);">Not Set</span>';

        html += `
            <tr>
                <td>${emp.empId}</td>
                <td>${emp.name}</td>
                <td>${emp.designation}</td>
                <td>${emp.department}</td>
                <td>${emp.contact}</td>
                <td>${salaryDisplay}</td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn edit" onclick="openEmployeeModal('${emp.id}')" title="Edit">✏️</button>
                        <button class="icon-btn delete" onclick="deleteEmployee('${emp.id}')" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    // Update HR summary
    if (typeof updateHRSummary === 'function') {
        updateHRSummary();
    }
}

function deleteEmployee(id) {
    if (confirm('Are you sure you want to delete this employee?')) {
        let employees = getEmployees();
        employees = employees.filter(emp => emp.id !== id);
        saveToStorage('employees', employees);
        loadEmployees();
        loadDashboard();
        showToast('Employee deleted', 'info');
    }
}

// ===================================
// ATTENDANCE MODULE
// ===================================

function loadAttendanceUI() {
    const employees = getEmployees();
    const container = document.getElementById('attendanceContainer');

    if (employees.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No employees registered. Please add employees first.</p>';
        return;
    }

    let html = '<table class="data-table"><thead><tr><th style="width: 15%;">Employee ID</th><th style="width: 25%;">Name</th><th style="width: 15%;">Status</th><th style="width: 15%;">Time In</th><th style="width: 15%;">Time Out</th><th style="width: 15%;">Remarks</th></tr></thead><tbody>';

    employees.forEach(emp => {
        const now = new Date();
        const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        html += `
            <tr data-emp-id="${emp.id}">
                <td>${emp.empId}</td>
                <td>${emp.name}</td>
                <td>
                    <select class="form-control attendance-status" onchange="handleAttendanceStatusChange(this)">
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Leave">Leave</option>
                        <option value="Half-day">Half-day</option>
                    </select>
                </td>
                <td><input type="time" class="form-control attendance-time-in" value="${timeString}"></td>
                <td><input type="time" class="form-control attendance-time-out" value=""></td>
                <td><input type="text" class="form-control attendance-remarks" placeholder="Optional"></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// Handle attendance status change - enable/disable fields based on status
function handleAttendanceStatusChange(selectElement) {
    const row = selectElement.closest('tr');
    const status = selectElement.value;
    const timeInField = row.querySelector('.attendance-time-in');
    const timeOutField = row.querySelector('.attendance-time-out');
    const remarksField = row.querySelector('.attendance-remarks');

    // Clear any previous validation styling
    remarksField.style.borderColor = '';
    remarksField.style.background = '';

    if (status === 'Absent' || status === 'Leave') {
        // Disable time fields for Absent/Leave
        timeInField.disabled = true;
        timeOutField.disabled = true;
        timeInField.value = '';
        timeOutField.value = '';
        timeInField.style.opacity = '0.5';
        timeOutField.style.opacity = '0.5';
        timeInField.style.cursor = 'not-allowed';
        timeOutField.style.cursor = 'not-allowed';

        // Make remarks mandatory
        remarksField.placeholder = 'Reason required';
        remarksField.style.borderColor = 'var(--warning)';
        remarksField.style.background = 'rgba(255, 193, 7, 0.05)';
        remarksField.required = true;

    } else if (status === 'Half-day') {
        // Enable time fields for Half-day (user needs to enter times)
        timeInField.disabled = false;
        timeOutField.disabled = false;
        timeInField.style.opacity = '1';
        timeOutField.style.opacity = '1';
        timeInField.style.cursor = '';
        timeOutField.style.cursor = '';

        // Make remarks mandatory for half-day
        remarksField.placeholder = 'Reason required';
        remarksField.style.borderColor = 'var(--warning)';
        remarksField.style.background = 'rgba(255, 193, 7, 0.05)';
        remarksField.required = true;

    } else {
        // Present - enable time fields, remarks optional
        timeInField.disabled = false;
        timeOutField.disabled = false;
        timeInField.style.opacity = '1';
        timeOutField.style.opacity = '1';
        timeInField.style.cursor = '';
        timeOutField.style.cursor = '';

        // Set default time for Present
        if (!timeInField.value) {
            const now = new Date();
            timeInField.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        }

        // Remarks optional
        remarksField.placeholder = 'Optional';
        remarksField.required = false;
    }
}

function markAllPresent() {
    const statusSelects = document.querySelectorAll('.attendance-status');
    statusSelects.forEach(select => {
        select.value = 'Present';
        // Trigger status change handler to reset field states
        handleAttendanceStatusChange(select);
    });
    showToast('All employees marked as Present', 'info');
}

function saveAttendance() {
    const date = document.getElementById('attendanceDate').value;
    if (!date) {
        showToast('Please select a date', 'error');
        return;
    }

    const rows = document.querySelectorAll('#attendanceContainer tbody tr');
    if (rows.length === 0) {
        showToast('No attendance data to save', 'warning');
        return;
    }

    // Validate remarks for Absent/Leave/Half-day
    let hasValidationError = false;
    const missingRemarks = [];

    rows.forEach(row => {
        const status = row.querySelector('.attendance-status').value;
        const remarks = row.querySelector('.attendance-remarks').value.trim();
        const empName = row.querySelector('td:nth-child(2)').textContent;

        if ((status === 'Absent' || status === 'Leave' || status === 'Half-day') && !remarks) {
            hasValidationError = true;
            missingRemarks.push(`${empName} (${status})`);

            // Highlight the remarks field
            const remarksField = row.querySelector('.attendance-remarks');
            remarksField.style.borderColor = 'var(--danger)';
            remarksField.style.background = 'rgba(220, 53, 69, 0.1)';
        }
    });

    if (hasValidationError) {
        showToast(`⚠️ Remarks required for: ${missingRemarks.join(', ')}`, 'error');
        return;
    }

    const attendanceData = [];
    const employees = getEmployees();

    rows.forEach(row => {
        const empId = row.getAttribute('data-emp-id');
        const employee = employees.find(e => e.id === empId);

        attendanceData.push({
            id: Date.now().toString() + Math.random(),
            date: date,
            employeeId: empId,
            employeeName: employee?.name || '',
            employeeEmpId: employee?.empId || '',
            status: row.querySelector('.attendance-status').value,
            timeIn: row.querySelector('.attendance-time-in').value,
            timeOut: row.querySelector('.attendance-time-out').value,
            remarks: row.querySelector('.attendance-remarks').value
        });
    });

    // Get existing records and filter out any for the same date
    let allRecords = getAttendanceRecords();
    allRecords = allRecords.filter(record => record.date !== date);

    // Add new records
    allRecords = allRecords.concat(attendanceData);

    saveToStorage('attendance', allRecords);
    showToast('Attendance saved successfully!', 'success');
    loadAttendanceHistory();
}

function loadAttendance() {
    const date = document.getElementById('attendanceDate').value;
    if (!date) {
        showToast('Please select a date', 'warning');
        return;
    }

    const allRecords = getAttendanceRecords();
    const dateRecords = allRecords.filter(record => record.date === date);

    if (dateRecords.length === 0) {
        showToast('No attendance records for this date', 'info');
        loadAttendanceUI();
        return;
    }

    // Populate the UI with existing data
    const rows = document.querySelectorAll('#attendanceContainer tbody tr');

    rows.forEach(row => {
        const empId = row.getAttribute('data-emp-id');
        const record = dateRecords.find(r => r.employeeId === empId);

        if (record) {
            const statusSelect = row.querySelector('.attendance-status');
            statusSelect.value = record.status;
            row.querySelector('.attendance-time-in').value = record.timeIn;
            row.querySelector('.attendance-time-out').value = record.timeOut;
            row.querySelector('.attendance-remarks').value = record.remarks;

            // Trigger status change handler to update field states
            handleAttendanceStatusChange(statusSelect);
        }
    });

    showToast('Attendance loaded for ' + formatDate(date), 'success');
}

function loadAttendanceHistory() {
    const records = getAttendanceRecords();
    const tbody = document.getElementById('attendanceHistoryBody');

    if (records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="color: var(--text-secondary);">
                    No attendance records yet.
                </td>
            </tr>
        `;
        return;
    }

    // Sort by date descending
    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Take latest 100 records for better history view
    const latestRecords = records.slice(0, 100);

    // Get today's date for comparison
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Group records by month and date
    let html = '';
    let lastMonth = null;
    let lastDate = null;

    // Month names for display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    latestRecords.forEach(record => {
        const recordDate = record.date;
        const recordMonth = recordDate.slice(0, 7); // YYYY-MM
        const [year, month] = recordMonth.split('-');
        const monthName = monthNames[parseInt(month) - 1];
        const isCurrentMonth = recordMonth === currentMonth;
        const isToday = recordDate === today;

        // Add month separator if new month
        if (recordMonth !== lastMonth) {
            const monthLabel = `${monthName} ${year}`;
            const monthColor = isCurrentMonth ?
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)';
            const monthIcon = isCurrentMonth ? '📅' : '📆';

            html += `
                <tr class="month-separator">
                    <td colspan="6" style="
                        background: ${monthColor};
                        color: white;
                        font-weight: 600;
                        font-size: 1rem;
                        padding: 0.75rem 1rem;
                        border: none;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    ">
                        ${monthIcon} ${monthLabel} ${isCurrentMonth ? '<span style="background: rgba(255,255,255,0.2); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-left: 0.5rem;">CURRENT MONTH</span>' : ''}
                    </td>
                </tr>
            `;
            lastMonth = recordMonth;
            lastDate = null; // Reset date when month changes
        }

        // Add date separator if new date
        if (recordDate !== lastDate) {
            const dateObj = new Date(recordDate);
            const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'long' });
            const formattedDate = formatDate(recordDate);

            const dateColor = isToday ?
                'rgba(72, 187, 120, 0.15)' :
                'rgba(99, 102, 241, 0.08)';
            const dateBorderColor = isToday ?
                'rgba(72, 187, 120, 0.4)' :
                'rgba(99, 102, 241, 0.2)';
            const dateTextColor = isToday ?
                'var(--success)' :
                'var(--primary)';
            const dateIcon = isToday ? '🌟' : '📋';

            html += `
                <tr class="date-separator">
                    <td colspan="6" style="
                        background: ${dateColor};
                        border-left: 4px solid ${dateBorderColor};
                        padding: 0.5rem 1rem;
                        font-weight: 500;
                    ">
                        <span style="color: ${dateTextColor};">
                            ${dateIcon} ${dayName}, ${formattedDate}
                            ${isToday ? '<span style="background: var(--success); color: white; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.7rem; margin-left: 0.5rem; font-weight: 600;">TODAY</span>' : ''}
                        </span>
                    </td>
                </tr>
            `;
            lastDate = recordDate;
        }

        // Add record row
        const badgeClass =
            record.status === 'Present' ? 'success' :
                record.status === 'Leave' ? 'info' :
                    record.status === 'Half-day' ? 'warning' : 'danger';

        html += `
            <tr style="background: ${isToday ? 'rgba(72, 187, 120, 0.05)' : 'transparent'};">
                <td style="padding-left: 2rem;">${record.employeeName}</td>
                <td>${record.employeeEmpId}</td>
                <td><span class="badge badge-${badgeClass}">${record.status}</span></td>
                <td>${record.timeIn || '-'}</td>
                <td>${record.timeOut || '-'}</td>
                <td>${record.remarks || '-'}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ===================================
// FORM CALCULATIONS
// ===================================

function setupFormCalculations() {
    // Inward invoice calculations are now handled by calculateInwardProductValue()
    // for each dynamic product row - no setup needed here
}


// ===================================
// UTILITY FUNCTIONS
// ===================================

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Format Aadhar number with spaces (1234 5678 9012)
function formatAadhar(input) {
    let value = input.value.replace(/\s/g, '').replace(/\D/g, '');
    if (value.length > 12) value = value.slice(0, 12);

    // Add spaces after every 4 digits
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
        if (i > 0 && i % 4 === 0) formatted += ' ';
        formatted += value[i];
    }
    input.value = formatted;
}

function numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';

    function convertLessThanThousand(n) {
        if (n === 0) return '';

        let result = '';

        if (n >= 100) {
            result += ones[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }

        if (n >= 20) {
            result += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        }

        if (n >= 10 && n < 20) {
            result += teens[n - 10] + ' ';
            n = 0;
        }

        if (n > 0 && n < 10) {
            result += ones[n] + ' ';
        }

        return result.trim();
    }

    if (num >= 10000000) { // Crore
        const crore = Math.floor(num / 10000000);
        const remainder = num % 10000000;
        return convertLessThanThousand(crore) + ' Crore ' + numberToWords(remainder);
    } else if (num >= 100000) { // Lakh
        const lakh = Math.floor(num / 100000);
        const remainder = num % 100000;
        return convertLessThanThousand(lakh) + ' Lakh ' + numberToWords(remainder);
    } else if (num >= 1000) { // Thousand
        const thousand = Math.floor(num / 1000);
        const remainder = num % 1000;
        return convertLessThanThousand(thousand) + ' Thousand ' + numberToWords(remainder);
    } else {
        return convertLessThanThousand(num);
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 5000); // Changed from 3000 to 5000ms (5 seconds)
}

// ===================================
// COLUMN FILTER FUNCTIONALITY
// ===================================

// Populate customer filter dropdowns with customer names
function populateCustomerFilterDropdowns() {
    const customers = typeof getCustomers === 'function' ? getCustomers() : [];

    // Populate Outward (Sales) invoice customer dropdown
    const outwardSelect = document.getElementById('filter-customer-select');
    if (outwardSelect) {
        // Keep the "All Customers" option and add customer options
        outwardSelect.innerHTML = '<option value="">All Customers</option>';
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.companyName;
            option.textContent = customer.companyName;
            outwardSelect.appendChild(option);
        });
    }

    // Populate Inward (Purchase) invoice customer dropdown
    const inwardSelect = document.getElementById('filter-inward-customer-select');
    if (inwardSelect) {
        // Keep the "All Customers" option and add customer options
        inwardSelect.innerHTML = '<option value="">All Customers</option>';
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.companyName;
            option.textContent = customer.companyName;
            inwardSelect.appendChild(option);
        });
    }
}

// Store current filter state
let outwardFilters = {
    invoiceNo: '',
    dateFrom: '',
    dateTo: '',
    customer: '',
    paymentStatus: 'All'
};

// Toggle column filter dropdown
function toggleColumnFilter(event, filterType) {
    event.stopPropagation();

    const dropdown = document.getElementById(`filter-${filterType}`);
    const btn = event.currentTarget;

    // Close all other dropdowns
    document.querySelectorAll('.column-filter-dropdown').forEach(d => {
        if (d.id !== `filter-${filterType}`) {
            d.style.display = 'none';
        }
    });
    document.querySelectorAll('.column-filter-btn').forEach(b => {
        if (b !== btn) {
            b.classList.remove('active');
        }
    });

    // Toggle current dropdown
    if (dropdown.style.display === 'none') {
        dropdown.style.display = 'block';
        btn.classList.add('active');
    } else {
        dropdown.style.display = 'none';
        btn.classList.remove('active');
    }
}

// Apply filters to outward invoice table
function applyOutwardFilter() {
    // Get filter values
    const invoiceNoInput = document.querySelector('#filter-invoiceNo .filter-input');
    const customerSelect = document.getElementById('filter-customer-select');
    const dateFromInput = document.getElementById('filter-date-from');
    const dateToInput = document.getElementById('filter-date-to');
    const paymentStatusCheckboxes = document.querySelectorAll('#filter-paymentStatus input[type="checkbox"]');

    outwardFilters.invoiceNo = invoiceNoInput ? invoiceNoInput.value.toLowerCase() : '';
    outwardFilters.customer = customerSelect ? customerSelect.value.toLowerCase() : '';
    outwardFilters.dateFrom = dateFromInput ? dateFromInput.value : '';
    outwardFilters.dateTo = dateToInput ? dateToInput.value : '';

    // Handle payment status filter
    let selectedStatuses = [];
    paymentStatusCheckboxes.forEach(cb => {
        if (cb.checked && cb.value !== 'All') {
            selectedStatuses.push(cb.value);
        }
    });

    // If "All" is checked or nothing specific selected, show all
    const allCheckbox = document.querySelector('#filter-paymentStatus input[value="All"]');
    if (allCheckbox && allCheckbox.checked || selectedStatuses.length === 0) {
        outwardFilters.paymentStatus = 'All';
    } else {
        outwardFilters.paymentStatus = selectedStatuses;
    }

    // Get all table rows
    const tbody = document.getElementById('outwardTableBody');
    const rows = tbody.querySelectorAll('tr:not(.month-separator)');

    rows.forEach(row => {
        // Skip empty state row
        if (row.querySelector('td[colspan]')) return;

        const cells = row.querySelectorAll('td');
        if (cells.length < 7) return;

        const invoiceNo = cells[0].textContent.toLowerCase();
        const date = cells[1].textContent;
        const customer = cells[2].textContent.toLowerCase();
        const paymentStatus = cells[6].textContent.trim();

        let show = true;

        // Apply invoice number filter
        if (outwardFilters.invoiceNo && !invoiceNo.includes(outwardFilters.invoiceNo)) {
            show = false;
        }

        // Apply customer filter (exact match for dropdown selection)
        if (outwardFilters.customer && customer !== outwardFilters.customer) {
            show = false;
        }

        // Apply date range filter
        if (outwardFilters.dateFrom || outwardFilters.dateTo) {
            // Parse the displayed date (format may vary, assuming DD-MM-YYYY or similar)
            const dateCell = cells[1].getAttribute('data-date') || parseDisplayDate(date);

            if (outwardFilters.dateFrom && dateCell < outwardFilters.dateFrom) {
                show = false;
            }
            if (outwardFilters.dateTo && dateCell > outwardFilters.dateTo) {
                show = false;
            }
        }

        // Apply payment status filter
        if (outwardFilters.paymentStatus !== 'All') {
            if (!outwardFilters.paymentStatus.some(status =>
                paymentStatus.toLowerCase().includes(status.toLowerCase())
            )) {
                show = false;
            }
        }

        row.style.display = show ? '' : 'none';
    });

    // Update filter button visual state
    updateFilterButtonStates();
}

// Helper function to parse displayed date to ISO format
function parseDisplayDate(dateStr) {
    // Try to parse common date formats
    // Format: DD-MM-YYYY or DD/MM/YYYY
    const parts = dateStr.split(/[-\/]/);
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    return dateStr;
}

// Update filter button visual state to show active filters
function updateFilterButtonStates() {
    // Invoice No filter
    const invoiceBtn = document.querySelector('th:has(#filter-invoiceNo) .column-filter-btn');
    if (invoiceBtn) {
        invoiceBtn.style.background = outwardFilters.invoiceNo ? 'var(--primary)' : '';
        invoiceBtn.style.color = outwardFilters.invoiceNo ? 'white' : '';
    }

    // Customer filter
    const customerBtn = document.querySelector('th:has(#filter-customer) .column-filter-btn');
    if (customerBtn) {
        customerBtn.style.background = outwardFilters.customer ? 'var(--primary)' : '';
        customerBtn.style.color = outwardFilters.customer ? 'white' : '';
    }

    // Date filter
    const dateBtn = document.querySelector('th:has(#filter-date) .column-filter-btn');
    if (dateBtn) {
        const hasDateFilter = outwardFilters.dateFrom || outwardFilters.dateTo;
        dateBtn.style.background = hasDateFilter ? 'var(--primary)' : '';
        dateBtn.style.color = hasDateFilter ? 'white' : '';
    }

    // Payment Status filter
    const paymentBtn = document.querySelector('th:has(#filter-paymentStatus) .column-filter-btn');
    if (paymentBtn) {
        const hasPaymentFilter = outwardFilters.paymentStatus !== 'All';
        paymentBtn.style.background = hasPaymentFilter ? 'var(--primary)' : '';
        paymentBtn.style.color = hasPaymentFilter ? 'white' : '';
    }
}

// Clear all filters
function clearOutwardFilters() {
    // Reset filter values
    outwardFilters = {
        invoiceNo: '',
        dateFrom: '',
        dateTo: '',
        customer: '',
        paymentStatus: 'All'
    };

    // Reset input fields
    const invoiceNoInput = document.querySelector('#filter-invoiceNo .filter-input');
    const customerSelect = document.getElementById('filter-customer-select');
    const dateFromInput = document.getElementById('filter-date-from');
    const dateToInput = document.getElementById('filter-date-to');

    if (invoiceNoInput) invoiceNoInput.value = '';
    if (customerSelect) customerSelect.value = '';
    if (dateFromInput) dateFromInput.value = '';
    if (dateToInput) dateToInput.value = '';

    // Reset payment status checkboxes
    const allCheckbox = document.querySelector('#filter-paymentStatus input[value="All"]');
    if (allCheckbox) allCheckbox.checked = true;
    document.querySelectorAll('#filter-paymentStatus input[type="checkbox"]:not([value="All"])').forEach(cb => {
        cb.checked = false;
    });

    // Show all rows
    const tbody = document.getElementById('outwardTableBody');
    tbody.querySelectorAll('tr').forEach(row => {
        row.style.display = '';
    });

    // Reset button states
    updateFilterButtonStates();

    showToast('Filters cleared', 'info');
}

// Close filter dropdowns when clicking outside
document.addEventListener('click', function (event) {
    if (!event.target.closest('.column-filter-dropdown') &&
        !event.target.closest('.column-filter-btn')) {
        document.querySelectorAll('.column-filter-dropdown').forEach(d => {
            d.style.display = 'none';
        });
        document.querySelectorAll('.column-filter-btn').forEach(b => {
            b.classList.remove('active');
        });
    }
});

// ===================================
// INWARD (PURCHASE) INVOICE FILTERS
// ===================================

// Store current inward filter state
let inwardFilters = {
    invoiceNo: '',
    dateFrom: '',
    dateTo: '',
    customer: '',
    paymentStatus: 'All'
};

// Apply filters to inward invoice table
function applyInwardFilter() {
    // Get filter values
    const invoiceNoInput = document.querySelector('#filter-inwardInvoiceNo .filter-input');
    const customerSelect = document.getElementById('filter-inward-customer-select');
    const dateFromInput = document.getElementById('filter-inward-date-from');
    const dateToInput = document.getElementById('filter-inward-date-to');
    const paymentStatusCheckboxes = document.querySelectorAll('#filter-inwardPaymentStatus input[type="checkbox"]');

    inwardFilters.invoiceNo = invoiceNoInput ? invoiceNoInput.value.toLowerCase() : '';
    inwardFilters.customer = customerSelect ? customerSelect.value.toLowerCase() : '';
    inwardFilters.dateFrom = dateFromInput ? dateFromInput.value : '';
    inwardFilters.dateTo = dateToInput ? dateToInput.value : '';

    // Handle payment status filter
    let selectedStatuses = [];
    paymentStatusCheckboxes.forEach(cb => {
        if (cb.checked && cb.value !== 'All') {
            selectedStatuses.push(cb.value);
        }
    });

    // If "All" is checked or nothing specific selected, show all
    const allCheckbox = document.querySelector('#filter-inwardPaymentStatus input[value="All"]');
    if (allCheckbox && allCheckbox.checked || selectedStatuses.length === 0) {
        inwardFilters.paymentStatus = 'All';
    } else {
        inwardFilters.paymentStatus = selectedStatuses;
    }

    // Get all table rows
    const tbody = document.getElementById('inwardTableBody');
    const rows = tbody.querySelectorAll('tr:not(.month-separator)');

    rows.forEach(row => {
        // Skip empty state row
        if (row.querySelector('td[colspan]')) return;

        const cells = row.querySelectorAll('td');
        if (cells.length < 7) return;

        const invoiceNo = cells[0].textContent.toLowerCase();
        const date = cells[1].textContent;
        const customer = cells[2].textContent.toLowerCase();
        const paymentStatus = cells[6].textContent.trim();

        let show = true;

        // Apply invoice number filter
        if (inwardFilters.invoiceNo && !invoiceNo.includes(inwardFilters.invoiceNo)) {
            show = false;
        }

        // Apply customer filter (exact match for dropdown selection)
        if (inwardFilters.customer && customer !== inwardFilters.customer) {
            show = false;
        }

        // Apply date range filter
        if (inwardFilters.dateFrom || inwardFilters.dateTo) {
            const dateCell = cells[1].getAttribute('data-date') || parseDisplayDate(date);

            if (inwardFilters.dateFrom && dateCell < inwardFilters.dateFrom) {
                show = false;
            }
            if (inwardFilters.dateTo && dateCell > inwardFilters.dateTo) {
                show = false;
            }
        }

        // Apply payment status filter
        if (inwardFilters.paymentStatus !== 'All') {
            if (!inwardFilters.paymentStatus.some(status =>
                paymentStatus.toLowerCase().includes(status.toLowerCase())
            )) {
                show = false;
            }
        }

        row.style.display = show ? '' : 'none';
    });
}

// Clear all inward filters
function clearInwardFilters() {
    inwardFilters = {
        invoiceNo: '',
        dateFrom: '',
        dateTo: '',
        customer: '',
        paymentStatus: 'All'
    };

    const invoiceNoInput = document.querySelector('#filter-inwardInvoiceNo .filter-input');
    const customerSelect = document.getElementById('filter-inward-customer-select');
    const dateFromInput = document.getElementById('filter-inward-date-from');
    const dateToInput = document.getElementById('filter-inward-date-to');

    if (invoiceNoInput) invoiceNoInput.value = '';
    if (customerSelect) customerSelect.value = '';
    if (dateFromInput) dateFromInput.value = '';
    if (dateToInput) dateToInput.value = '';

    const allCheckbox = document.querySelector('#filter-inwardPaymentStatus input[value="All"]');
    if (allCheckbox) allCheckbox.checked = true;
    document.querySelectorAll('#filter-inwardPaymentStatus input[type="checkbox"]:not([value="All"])').forEach(cb => {
        cb.checked = false;
    });

    const tbody = document.getElementById('inwardTableBody');
    tbody.querySelectorAll('tr').forEach(row => {
        row.style.display = '';
    });

    showToast('Filters cleared', 'info');
}
