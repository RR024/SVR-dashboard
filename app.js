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
    // Seed default dummy invoices if not already seeded
    seedDefaultInvoices();

    // Migrateold invoice number format to new format
    migrateInvoiceNumberFormat();

    // Remove banned customers (Cleanup) - DISABLED to prevent accidental data loss
    // removeBannedCustomers();

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
// SEED DEFAULT MONTHLY INVOICES
// ===================================

function seedDefaultInvoices() {
    const seedKey = 'monthlyInvoicesSeeded_v4';

    // Check if already seeded
    if (localStorage.getItem(seedKey)) {
        return;
    }

    console.log('Seeding monthly invoices...');

    // Monthly data for April to October 2025 - ACTUAL VALUES
    const monthlyData = [
        { month: 4, year: 2025, sales: 2233096.27, purchase: 1719549.43, monthName: 'April' },
        { month: 5, year: 2025, sales: 963958.87, purchase: 743137.96, monthName: 'May' },
        { month: 6, year: 2025, sales: 2052185.32, purchase: 1852652.08, monthName: 'June' },
        { month: 7, year: 2025, sales: 2141125.02, purchase: 1409439.86, monthName: 'July' },
        { month: 8, year: 2025, sales: 1453129.16, purchase: 924805.05, monthName: 'August' },
        { month: 9, year: 2025, sales: 1791872.02, purchase: 1511755.50, monthName: 'September' },
        { month: 10, year: 2025, sales: 668186.54, purchase: 840641.52, monthName: 'October' }
    ];

    // Get existing invoices
    let outwardInvoices = loadFromStorage('outwardInvoices') || [];
    let inwardInvoices = loadFromStorage('inwardInvoices') || [];

    // Remove any existing dummy/monthly invoices first (to prevent duplicates)
    outwardInvoices = outwardInvoices.filter(inv => !inv.id.startsWith('dummy_') && !inv.id.startsWith('monthly_'));
    inwardInvoices = inwardInvoices.filter(inv => !inv.id.startsWith('dummy_') && !inv.id.startsWith('monthly_'));

    // Customer/Supplier names for realistic invoices
    const salesCustomers = [
        'SVR Customer 001',
        'SVR Customer 002',
        'SVR Customer 003',
        'SVR Customer 004',
        'SVR Customer 005',
        'SVR Customer 006',
        'SVR Customer 007'
    ];

    const purchaseSuppliers = [
        'Steel Authority of India',
        'Tata Steel Ltd',
        'JSW Steel',
        'Hindalco Industries',
        'Vedanta Ltd',
        'NALCO',
        'Jindal Steel'
    ];

    // Generate outward (sales) invoices
    monthlyData.forEach((data, index) => {
        const dateStr = `${data.year}-${String(data.month).padStart(2, '0')}-15`;
        const baseTimestamp = new Date(dateStr).getTime();

        // Calculate amounts (reverse from total to get taxable value)
        // Total = Taxable + CGST(9%) + SGST(9%) = Taxable * 1.18
        const taxableValue = data.sales / 1.18;
        const cgst = taxableValue * 0.09;
        const sgst = taxableValue * 0.09;

        const outwardInvoice = {
            id: `monthly_outward_${data.month}_${data.year}`,
            invoiceNo: `SVR${String(100 + index).padStart(4, '0')}/${data.year.toString().slice(-2)}-${(data.year + 1).toString().slice(-2)}`,
            date: dateStr,
            poNo: `PO/${data.monthName.substring(0, 3).toUpperCase()}/${data.year}/001`,
            poDate: `${data.year}-${String(data.month).padStart(2, '0')}-01`,
            dcNo: `DC/${String(100 + index).padStart(4, '0')}`,
            dcDate: dateStr,
            state: 'Tamil Nadu',
            stateCode: '33',
            paymentTerms: '30 Days',
            vehicle: `TN-38-AB-${String(1000 + index).padStart(4, '0')}`,
            buyerName: salesCustomers[index],
            buyerAddress: 'Chennai, Tamil Nadu',
            shippingAddress: 'Chennai, Tamil Nadu',
            sameAsBuyerAddress: true,
            gstin: `33AAAC${String(index + 1).padStart(4, '0')}A1Z5`,
            contact: `98765${String(43210 + index).padStart(5, '0')}`,
            products: [{
                description: 'Manufacturing Components - Monthly Supply',
                hsn: '8477',
                quantity: '1',
                uom: 'LOT',
                rate: taxableValue.toFixed(2),
                value: taxableValue.toFixed(2)
            }],
            taxableValue: taxableValue.toFixed(2),
            cgst: cgst.toFixed(2),
            sgst: sgst.toFixed(2),
            total: data.sales.toFixed(2),
            paymentStatus: 'Unpaid',
            amountPaid: 0,
            amountInWords: numberToWordsSimple(Math.round(data.sales)) + ' Only',
            locked: true
        };

        outwardInvoices.push(outwardInvoice);
    });

    // Generate inward (purchase) invoices
    monthlyData.forEach((data, index) => {
        const dateStr = `${data.year}-${String(data.month).padStart(2, '0')}-10`;

        // Calculate amounts (reverse from total to get taxable value)
        const taxableValue = data.purchase / 1.18;
        const cgst = taxableValue * 0.09;
        const sgst = taxableValue * 0.09;
        const roundedTotal = Math.round(data.purchase);
        const roundOff = roundedTotal - data.purchase;

        const inwardInvoice = {
            id: `monthly_inward_${data.month}_${data.year}`,
            invoiceNo: `INV/${purchaseSuppliers[index].substring(0, 3).toUpperCase()}/${data.year}/${String(index + 1).padStart(3, '0')}`,
            date: dateStr,
            customer: purchaseSuppliers[index],
            gstNo: `33AABC${String(index + 1).padStart(4, '0')}B1Z9`,
            products: [{
                material: 'Raw Materials - Monthly Purchase',
                quantity: 1,
                unit: 'LOT',
                rate: taxableValue,
                amount: taxableValue
            }],
            taxableValue: taxableValue.toFixed(2),
            cgst: cgst.toFixed(2),
            sgst: sgst.toFixed(2),
            roundOff: roundOff.toFixed(2),
            amount: roundedTotal.toString(),
            material: 'Raw Materials - Monthly Purchase',
            quantity: 1,
            unit: 'LOT',
            rate: taxableValue,
            notes: `${data.monthName} ${data.year} purchase`,
            paymentStatus: 'Unpaid',
            amountPaid: 0,
            locked: true
        };

        inwardInvoices.push(inwardInvoice);
    });

    // Save to storage
    saveToStorage('outwardInvoices', outwardInvoices);
    saveToStorage('inwardInvoices', inwardInvoices);

    // Mark as seeded
    localStorage.setItem(seedKey, 'true');

    console.log('Monthly invoices seeded successfully!');
}

// Simple number to words function for seeding (backup if main function not loaded yet)
function numberToWordsSimple(num) {
    if (typeof numberToWords === 'function') {
        return numberToWords(num);
    }

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero';
    if (num < 0) return 'Minus ' + numberToWordsSimple(-num);

    let words = '';

    if (Math.floor(num / 10000000) > 0) {
        words += numberToWordsSimple(Math.floor(num / 10000000)) + ' Crore ';
        num %= 10000000;
    }

    if (Math.floor(num / 100000) > 0) {
        words += numberToWordsSimple(Math.floor(num / 100000)) + ' Lakh ';
        num %= 100000;
    }

    if (Math.floor(num / 1000) > 0) {
        words += numberToWordsSimple(Math.floor(num / 1000)) + ' Thousand ';
        num %= 1000;
    }

    if (Math.floor(num / 100) > 0) {
        words += numberToWordsSimple(Math.floor(num / 100)) + ' Hundred ';
        num %= 100;
    }

    if (num > 0) {
        if (num < 20) {
            words += ones[num];
        } else {
            words += tens[Math.floor(num / 10)];
            if (num % 10 > 0) {
                words += ' ' + ones[num % 10];
            }
        }
    }

    return words.trim();
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
        case 'dc-invoice':
            if (typeof loadDCInvoiceModule === 'function') {
                loadDCInvoiceModule();
            }
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'suppliers':
            if (typeof loadSuppliers === 'function') loadSuppliers();
            break;
        case 'hr-management':
            loadHRModule();
            break;
        case 'attendance':
            // Attendance is now a tab inside hr-management
            navigateToModule('hr-management');
            setTimeout(() => switchHRTab('attendance'), 150);
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
        case 'materials':
            if (typeof loadMaterialsModule === 'function') {
                loadMaterialsModule();
            }
            break;
        case 'material-calculation':
            if (typeof initMaterialCalculationModule === 'function') {
                initMaterialCalculationModule();
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
        // Set today's date if not already set
        const dateEl = document.getElementById('attendanceDate');
        if (dateEl && !dateEl.value) dateEl.valueAsDate = new Date();
        loadAttendanceUI();
        loadAttendanceHistory();
        loadAttendanceSummaryCards();
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

// Migrate old invoice format (SVR/XXXX/YY-YY) to new format (SVRXXXX/YY-YY)
function migrateInvoiceNumberFormat() {
    const migrationKey = 'invoiceFormatMigrated_v1';
    if (localStorage.getItem(migrationKey)) return; // Already migrated

    const invoices = loadFromStorage('outwardInvoices') || [];
    let updated = false;

    invoices.forEach(inv => {
        if (inv.invoiceNo && inv.invoiceNo.match(/^SVR\/\d{4}\/\d{2}-\d{2}$/)) {
            // Convert SVR/XXXX/YY-YY to SVRXXXX/YY-YY
            const parts = inv.invoiceNo.split('/');
            inv.invoiceNo = `SVR${parts[1]}/${parts[2]}`;
            updated = true;
        }
    });

    if (updated) {
        saveToStorage('outwardInvoices', invoices);
    }
    localStorage.setItem(migrationKey, 'true');
}

// Remove specific customers and their data (Cleanup)
function removeBannedCustomers() {
    const cleanupKey = 'bannedCustomersCleanup_v1';
    if (localStorage.getItem(cleanupKey)) return;

    // List of banned phrases to check against customer names
    const bannedPhrases = [
        'ashok leyland',
        'india pistons',
        'lucas tvs',
        'rane',
        'sundaram',
        'tvs',
        'wheels'
    ];

    let customersRemoved = 0;
    let invoicesRemoved = 0;

    // 1. Clean Customers
    let customers = loadFromStorage('customers') || [];
    const initialCustomerCount = customers.length;
    customers = customers.filter(c => {
        const nameLower = (c.companyName || '').toLowerCase();
        return !bannedPhrases.some(phrase => nameLower.includes(phrase));
    });

    if (customers.length !== initialCustomerCount) {
        saveToStorage('customers', customers);
        customersRemoved = initialCustomerCount - customers.length;
        console.log(`Removed ${customersRemoved} banned customers.`);
    }

    // 2. Clean Outward Invoices
    let outwardInvoices = loadFromStorage('outwardInvoices') || [];
    const initialInvoiceCount = outwardInvoices.length;
    outwardInvoices = outwardInvoices.filter(inv => {
        const buyerLower = (inv.buyerName || '').toLowerCase();
        return !bannedPhrases.some(phrase => buyerLower.includes(phrase));
    });

    if (outwardInvoices.length !== initialInvoiceCount) {
        saveToStorage('outwardInvoices', outwardInvoices);
        invoicesRemoved = initialInvoiceCount - outwardInvoices.length;
        console.log(`Removed ${invoicesRemoved} banned invoices.`);
    }

    localStorage.setItem(cleanupKey, 'true');
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
        totalOutwardCostEl.textContent = `â‚¹${totalOutwardCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }

    // Calculate total costs for inward invoices (check multiple field names)
    const totalInwardCost = inwardInvoices.reduce((sum, inv) => {
        // Try different field names for the amount
        const amount = parseFloat(inv.amount) || parseFloat(inv.total) || parseFloat(inv.totalAmount) || parseFloat(inv.grandTotal) || 0;
        return sum + amount;
    }, 0);
    const totalInwardCostEl = document.getElementById('totalInwardCost');
    if (totalInwardCostEl) {
        totalInwardCostEl.textContent = `â‚¹${totalInwardCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
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
        pendingSalesAmountEl.textContent = `â‚¹${pendingSalesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
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
        pendingPurchaseAmountEl.textContent = `â‚¹${pendingPurchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    const pendingPurchaseCountEl = document.getElementById('pendingPurchaseCount');
    if (pendingPurchaseCountEl) {
        pendingPurchaseCountEl.textContent = `${inwardPending.length} invoices unpaid`;
    }

    // Calculate net pending (Pending Sales - Pending Purchase)
    const netPending = pendingSalesAmount - pendingPurchaseAmount;
    const netPendingEl = document.getElementById('netPendingAmount');
    if (netPendingEl) {
        const prefix = netPending >= 0 ? 'â‚¹' : '-â‚¹';
        const absValue = Math.abs(netPending);
        netPendingEl.textContent = `${prefix}${absValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        // Green if positive (customers owe more), Red if negative (you owe more)
        netPendingEl.style.color = netPending >= 0 ? '#10b981' : '#ef4444';
    }

    // Calculate net balance (Outward - Inward)
    const netBalance = totalOutwardCost - totalInwardCost;
    const netBalanceEl = document.getElementById('netBalance');
    if (netBalanceEl) {
        const prefix = netBalance >= 0 ? 'â‚¹' : '-â‚¹';
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
    // Sales: with tax (grand total) and without tax (taxable value)
    const currentMonthSalesTotal = currentMonthOutward.reduce((sum, inv) => {
        const amount = parseFloat(inv.total) || parseFloat(inv.totalAmount) || parseFloat(inv.grandTotal) || parseFloat(inv.amount) || 0;
        return sum + amount;
    }, 0);
    const currentMonthSalesTaxable = currentMonthOutward.reduce((sum, inv) => {
        return sum + (parseFloat(inv.taxableValue) || 0);
    }, 0);

    // Filter inward invoices for current month
    const currentMonthInward = inwardInvoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate.getFullYear() === currentYear && invDate.getMonth() === currentMonth;
    });
    // Purchase: with tax (grand total) and without tax (taxable value)
    const currentMonthPurchaseTotal = currentMonthInward.reduce((sum, inv) => {
        const amount = parseFloat(inv.amount) || parseFloat(inv.total) || parseFloat(inv.totalAmount) || parseFloat(inv.grandTotal) || 0;
        return sum + amount;
    }, 0);
    const currentMonthPurchaseTaxable = currentMonthInward.reduce((sum, inv) => {
        return sum + (parseFloat(inv.taxableValue) || 0);
    }, 0);

    const _fmtINR = (n) => `â‚¹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    // Update current month sales card
    const currentMonthSalesAmountEl = document.getElementById('currentMonthSalesAmount');
    if (currentMonthSalesAmountEl) {
        currentMonthSalesAmountEl.textContent = _fmtINR(currentMonthSalesTotal);
    }
    const elSalesWithTax = document.getElementById('currentMonthSalesWithTax');
    if (elSalesWithTax) elSalesWithTax.textContent = _fmtINR(currentMonthSalesTotal);
    const elSalesWithoutTax = document.getElementById('currentMonthSalesWithoutTax');
    if (elSalesWithoutTax) elSalesWithoutTax.textContent = _fmtINR(currentMonthSalesTaxable);
    const currentMonthSalesCountEl = document.getElementById('currentMonthSalesCount');
    if (currentMonthSalesCountEl) {
        currentMonthSalesCountEl.textContent = `${currentMonthOutward.length} invoice${currentMonthOutward.length !== 1 ? 's' : ''} this month`;
    }

    // Update current month purchase card
    const currentMonthPurchaseAmountEl = document.getElementById('currentMonthPurchaseAmount');
    if (currentMonthPurchaseAmountEl) {
        currentMonthPurchaseAmountEl.textContent = _fmtINR(currentMonthPurchaseTotal);
    }
    const elPurchaseWithTax = document.getElementById('currentMonthPurchaseWithTax');
    if (elPurchaseWithTax) elPurchaseWithTax.textContent = _fmtINR(currentMonthPurchaseTotal);
    const elPurchaseWithoutTax = document.getElementById('currentMonthPurchaseWithoutTax');
    if (elPurchaseWithoutTax) elPurchaseWithoutTax.textContent = _fmtINR(currentMonthPurchaseTaxable);
    const currentMonthPurchaseCountEl = document.getElementById('currentMonthPurchaseCount');
    if (currentMonthPurchaseCountEl) {
        currentMonthPurchaseCountEl.textContent = `${currentMonthInward.length} invoice${currentMonthInward.length !== 1 ? 's' : ''} this month`;
    }

    // Update today's summary cards (expenses, production, attendance)
    // Update today's summary cards (expenses, production, attendance)
    updateDashboardCards();

    // Initialize Dashboard Widgets (Charts, Recent, System)
    if (typeof initializeDashboardCharts === 'function') initializeDashboardCharts();
    if (typeof populateRecentInvoices === 'function') populateRecentInvoices();
    if (typeof updateSystemStatus === 'function') updateSystemStatus();
    if (typeof updateExpenseDashboard === 'function') updateExpenseDashboard();
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
            expenseAmountEl.textContent = `â‚¹${todayTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
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
    // Attendance is embedded inside HR Management as a tab
    if (moduleId === 'attendance') {
        const hrLink = document.querySelector('.nav-link[data-module="hr-management"]');
        if (hrLink) hrLink.click();
        setTimeout(() => switchHRTab('attendance'), 150);
        return;
    }
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
    const total = parseFloat(totalEl?.textContent?.replace(/[â‚¹,]/g, '')) || 0;
    const amountPaid = parseFloat(document.getElementById('inwardAmountPaid').value) || 0;
    const balance = total - amountPaid;

    const display = document.getElementById('inwardBalanceDisplay');
    if (display) {
        display.textContent = `Balance: â‚¹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
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
    const total = parseFloat(totalEl?.textContent?.replace(/[â‚¹,]/g, '')) || 0;
    const amountPaid = parseFloat(document.getElementById('outwardAmountPaid').value) || 0;
    const balance = total - amountPaid;

    const display = document.getElementById('outwardBalanceDisplay');
    if (display) {
        display.textContent = `Balance: â‚¹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
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
                <div class="pending-amount">â‚¹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                <div class="pending-details">
                    <div>ðŸ·ï¸ Invoice No: ${inv.invoiceNo}</div>
                    <div>ðŸ“… Date: ${inv.date}</div>
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
                <div class="pending-amount">â‚¹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                <div class="pending-details">
                    <div>ðŸ·ï¸ Invoice No: ${inv.invoiceNo}</div>
                    <div>ðŸ“… Date: ${inv.date}</div>
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

    // Load customer dropdown FIRST (before populating products)
    if (typeof loadInwardCustomerDropdown === 'function') {
        loadInwardCustomerDropdown();
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

            // Try to pre-select customer in dropdown if it matches
            // IMPORTANT: Do this BEFORE loading products
            const customerDropdown = document.getElementById('inwardCustomerDropdown');
            if (customerDropdown && invoice.customer) {
                const customers = getCustomers();
                const matchingCustomer = customers.find(c => c.companyName === invoice.customer);
                if (matchingCustomer) {
                    customerDropdown.value = matchingCustomer.id;
                }
            }

            // Load products - handle both old single-product and new multi-product format
            // Products are loaded AFTER customer dropdown is set for proper matching
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

        // Reset customer dropdown selection
        const customerDropdown = document.getElementById('inwardCustomerDropdown');
        if (customerDropdown) {
            customerDropdown.value = '';
        }

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

    // Get current selected customer products
    const customerDropdown = document.getElementById('inwardCustomerDropdown');
    const customerId = customerDropdown ? customerDropdown.value : null;
    let customerProducts = [];

    if (customerId && typeof getCustomerProducts === 'function') {
        customerProducts = getCustomerProducts(customerId);
    }

    // Check if data.material is a custom entry (not matching any product id or description)
    let isCustomMaterial = false;
    let customMaterialValue = '';
    if (data && data.material) {
        const matchesProduct = customerProducts.some(p => p.id === data.material || p.description === data.material);
        if (!matchesProduct) {
            isCustomMaterial = true;
            customMaterialValue = data.material;
        }
    }

    // Build product dropdown options
    let productOptions = '<option value="">-- Select Product --</option>';
    customerProducts.forEach(product => {
        // Handle both product object or just material name string (legacy support)
        const isSelected = (data && !isCustomMaterial && (data.material === product.description || data.material === product.id)) ? 'selected' : '';
        productOptions += `<option value="${product.id}" ${isSelected}>${product.description}</option>`;
    });

    // UOM options
    const uomOptions = ['Nos', 'Kgs', 'Ltrs', 'Mtrs', 'Pcs', 'Sets', 'Boxes', 'Pairs', 'Grams', 'Tonnes'];
    const uomOptionsHtml = uomOptions.map(uom =>
        `<option value="${uom}" ${data?.unit === uom ? 'selected' : ''}>${uom}</option>`
    ).join('');

    // Determine initial visibility
    const selectDisplay = isCustomMaterial ? 'none' : 'block';
    const customDisplay = isCustomMaterial ? 'block' : 'none';
    const toggleBtnText = isCustomMaterial ? 'ðŸ“‹ Select Existing' : 'âœï¸ Custom';

    const rowHtml = `
        <div class="inward-product-item" style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; position: relative;">
            <button type="button" class="icon-btn delete" onclick="removeInwardProductRow(this)" style="position: absolute; top: 0.5rem; right: 0.5rem;" title="Remove">Ã—</button>
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 0.75rem;">
                <div class="form-group" style="margin: 0;">
                    <label class="form-label">Material Description</label>
                    <div class="material-input-container">
                        <select class="form-control inward-product-material-select" onchange="fillInwardProductDetails(this)" style="display: ${selectDisplay};">
                            ${productOptions}
                        </select>
                        <input type="text" class="form-control inward-product-material-custom" placeholder="Enter custom material" value="${customMaterialValue}" style="display: ${customDisplay};">
                        <button type="button" class="btn btn-sm btn-outline toggle-material-btn" onclick="toggleInwardMaterialInput(this)" style="margin-top: 0.5rem; font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                            ${toggleBtnText}
                        </button>
                    </div>
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
                    <label class="form-label">Rate (â‚¹)</label>
                    <input type="number" class="form-control inward-product-rate" placeholder="0.00" step="0.01" value="${data?.rate || ''}" oninput="calculateInwardProductValue(this)" required>
                </div>
                <div class="form-group" style="margin: 0;">
                    <label class="form-label">Amount (â‚¹)</label>
                    <input type="number" class="form-control inward-product-amount" placeholder="0.00" step="0.01" value="${data?.amount || ''}" readonly>
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', rowHtml);
}

// Toggle between select dropdown and custom text input for inward material
function toggleInwardMaterialInput(button) {
    const container = button.closest('.material-input-container');
    if (!container) return;

    const selectEl = container.querySelector('.inward-product-material-select');
    const customEl = container.querySelector('.inward-product-material-custom');

    if (selectEl.style.display !== 'none') {
        // Switch to custom input
        selectEl.style.display = 'none';
        customEl.style.display = 'block';
        button.textContent = 'ðŸ“‹ Select Existing';
        // Clear select value
        selectEl.value = '';
    } else {
        // Switch to select dropdown
        selectEl.style.display = 'block';
        customEl.style.display = 'none';
        button.textContent = 'âœï¸ Custom';
        // Clear custom input
        customEl.value = '';
    }
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
        taxableElement.textContent = `â‚¹${taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    if (cgstElement) {
        cgstElement.textContent = `â‚¹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    if (sgstElement) {
        sgstElement.textContent = `â‚¹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    if (roundOffElement) {
        const sign = roundOff >= 0 ? '+' : '';
        roundOffElement.textContent = `${sign}â‚¹${roundOff.toFixed(2)}`;
    }
    if (totalElement) {
        totalElement.textContent = `â‚¹${roundedTotal.toLocaleString('en-IN')}`;
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
        // Get material from either select dropdown or custom input (whichever is visible)
        const selectEl = row.querySelector('.inward-product-material-select');
        const customEl = row.querySelector('.inward-product-material-custom');
        let material = '';

        if (customEl && customEl.style.display !== 'none' && customEl.value.trim()) {
            // Custom material entered
            material = customEl.value.trim();
        } else if (selectEl && selectEl.value) {
            // Product selected from dropdown - get the display text (description)
            const selectedOption = selectEl.options[selectEl.selectedIndex];
            material = selectedOption ? selectedOption.textContent : selectEl.value;
        }

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
        alert('âš ï¸ Warning: This invoice number already exists in the system!');
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

    // Sync new products to the matching supplier record
    syncInwardProductsToSupplier(invoiceData);

    closeInwardModal();
    loadInwardInvoices();
    loadDashboard();
    showToast('Inward invoice saved successfully!', 'success');
}

/**
 * After saving a purchase (inward) invoice, add any new products
 * to the matching supplier's product list (avoids duplicates).
 */
function syncInwardProductsToSupplier(invoiceData) {
    if (!invoiceData || !invoiceData.customer || !invoiceData.products || invoiceData.products.length === 0) return;

    const allCustomers = loadFromStorage('customers') || [];
    const supplierIndex = allCustomers.findIndex(
        c => (c.type === 'supplier') && c.companyName === invoiceData.customer
    );

    if (supplierIndex === -1) return; // Supplier not found â€” skip

    const supplier = allCustomers[supplierIndex];
    if (!supplier.products) supplier.products = [];

    const currentMonth = new Date().toISOString().slice(0, 7);
    let changed = false;

    invoiceData.products.forEach(product => {
        if (!product.material) return;

        const exists = supplier.products.find(
            p => p.description && p.description.toLowerCase() === product.material.toLowerCase()
        );

        if (!exists) {
            // New product â€” add to supplier's product list
            supplier.products.push({
                id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
                description: product.material,
                height: 0,
                width: 0,
                breadth: 0,
                price: product.rate || 0,
                lastUpdated: currentMonth
            });
            changed = true;
        } else if (product.rate && exists.price !== product.rate) {
            // Update rate if it has changed
            exists.price = product.rate;
            exists.lastUpdated = currentMonth;
            changed = true;
        }
    });

    if (changed) {
        allCustomers[supplierIndex] = supplier;
        saveToStorage('customers', allCustomers);
    }
}


function loadInwardInvoices() {
    const invoices = getInwardInvoices();
    const tbody = document.getElementById('inwardTableBody');

    if (invoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center" style="color: var(--text-secondary);">
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

    // Helper: get financial year start year for a date (Apr-Mar, India)
    function getFYStartYear(dateStr) {
        const d = new Date(dateStr);
        const m = d.getMonth(); // 0=Jan, 3=Apr
        return m >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    }

    // Compute FY serial numbers (ascending order by date within each FY)
    const fySerialMap = {};
    const monthSerialMap = {};
    const allSorted = [...invoices].sort((a, b) => {
        const da = a.date || '';
        const db = b.date || '';
        if (da !== db) return da.localeCompare(db);
        return a.invoiceNo.localeCompare(b.invoiceNo, undefined, { numeric: true });
    });
    const fyCounters = {};
    const monthCounters = {};
    allSorted.forEach(inv => {
        const dateStr = inv.date || new Date().toISOString().slice(0, 10);
        const fyStart = getFYStartYear(dateStr);
        const fyKey = `${fyStart}-${fyStart + 1}`;
        fyCounters[fyKey] = (fyCounters[fyKey] || 0) + 1;
        fySerialMap[inv.id] = fyCounters[fyKey];

        const monthKey = dateStr.slice(0, 7);
        monthCounters[monthKey] = (monthCounters[monthKey] || 0) + 1;
        monthSerialMap[inv.id] = monthCounters[monthKey];
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
            const monthIcon = isCurrentMonth ? 'ðŸ“¥' : 'ðŸ“¦';
            const monthTotal = monthlyTotals[invoiceMonth] || 0;

            html += `
                <tr class="month-separator">
                    <td colspan="10" style="
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
                        <span style="float: right; font-size: 0.9rem; text-transform: none;">Total: â‚¹${monthTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </td>
                </tr>
            `;
            lastMonth = invoiceMonth;
        }

        const gstNo = inv.gstNo || '-';
        const paymentStatus = inv.paymentStatus || 'Pending';
        const statusClass = paymentStatus === 'Paid' ? 'success' : paymentStatus === 'Partial' ? 'warning' : 'danger';
        const fySerial = fySerialMap[inv.id] || '-';
        const monthSerial = monthSerialMap[inv.id] || '-';
        html += `
            <tr>
                <td style="text-align:center; font-weight:600; color:var(--primary);">${fySerial}</td>
                <td style="text-align:center; color:var(--text-secondary);">${monthSerial}</td>
                <td>${inv.invoiceNo}</td>
                <td>${formatDate(inv.date)}</td>
                <td>${inv.customer}</td>
                <td style="font-size: 0.85rem;">${gstNo}</td>
                <td>${inv.material || '-'}</td>
                <td>â‚¹${parseFloat(inv.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td><span class="badge badge-${statusClass}">${paymentStatus}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn pdf" onclick="downloadInwardInvoicePDF('${inv.id}')" title="Download PDF">ðŸ“„</button>
                        <button class="icon-btn edit" onclick="openInwardModal('${inv.id}')" title="Edit">âœï¸</button>
                        <button class="icon-btn delete" onclick="deleteInwardInvoice('${inv.id}')" title="Delete">ðŸ—‘ï¸</button>
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
        // Extract FY from invoice number (format: SVRXXXX/YY-YY)
        const parts = inv.invoiceNo.split('/');
        return parts.length === 2 && parts[1] === fyString && parts[0].startsWith('SVR');
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

    // Format: SVR(inv num)/current finance year
    // Example: SVR0270/25-26 (Jan-March 2026) or SVR0001/26-27 (April 2026+)
    const invoiceNo = `SVR${String(nextNum).padStart(4, '0')}/${fyString}`;

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

    // Scroll to top
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) modalContent.scrollTop = 0;

    // Clear hidden ID explicitly
    document.getElementById('outwardId').value = '';

    // Clear product items
    document.getElementById('productItems').innerHTML = '';

    // Load customer dropdown FIRST (before populating form or adding products)
    if (typeof loadCustomerDropdown === 'function') {
        loadCustomerDropdown();
    }

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
        // DC Date should be empty by default as per requirement
        document.getElementById('outwardDCDate').value = '';
        generateOutwardInvoiceNumber();

        // Reset vehicle dropdown
        if (typeof updateVehicleDropdown === 'function') {
            updateVehicleDropdown(null);
        }

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

    // IMPORTANT: Set customer dropdown FIRST (before loading products)
    // This ensures addProductRow() can match products against the customer's product list
    const customers = getCustomers();
    const customer = customers.find(c => c.companyName === invoice.buyerName);
    if (customer) {
        const customerDropdown = document.getElementById('customerDropdown');
        if (customerDropdown) {
            customerDropdown.value = customer.id;
        }
        if (typeof updateVehicleDropdown === 'function') {
            updateVehicleDropdown(customer.id);
        }
    } else {
        if (typeof updateVehicleDropdown === 'function') {
            updateVehicleDropdown(null);
        }
    }

    // Set vehicle value (handle legacy values that might not be in the list)
    const vehicleSelect = document.getElementById('outwardVehicle');
    if (invoice.vehicle) {
        // Check if option exists
        let optionExists = false;
        for (let i = 0; i < vehicleSelect.options.length; i++) {
            if (vehicleSelect.options[i].value === invoice.vehicle) {
                optionExists = true;
                break;
            }
        }

        if (!optionExists) {
            // Add it as an option
            const option = document.createElement('option');
            option.value = invoice.vehicle;
            option.text = invoice.vehicle;
            // Insert after default option
            if (vehicleSelect.options.length > 0) {
                vehicleSelect.add(option, vehicleSelect.options[1]);
            } else {
                vehicleSelect.add(option);
            }
        }
        vehicleSelect.value = invoice.vehicle;
    }

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

    // Populate products AFTER customer dropdown is set
    // This allows addProductRow() to properly match and select products from customer's catalog
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
    productOptions += '<option value="__ADD_NEW__" style="color: var(--primary); font-weight: 600;">âž• Add New Product...</option>';

    // UOM options
    const uomOptions = ['Nos', 'Kgs', 'Ltrs', 'Mtrs', 'Pcs', 'Sets', 'Boxes', 'Pairs', 'Grams', 'Tonnes'];
    const uomOptionsHtml = uomOptions.map(uom =>
        `<option value="${uom}" ${data?.uom === uom ? 'selected' : ''}>${uom}</option>`
    ).join('');

    const rowHtml = `
        <div class="product-item" style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; position: relative;">
            <button type="button" class="icon-btn delete" onclick="this.parentElement.remove(); calculateOutwardTotals();" style="position: absolute; top: 0.5rem; right: 0.5rem;" title="Remove">Ã—</button>
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
                    <label class="form-label">Rate (â‚¹)</label>
                    <input type="number" class="form-control product-rate" placeholder="0.00" step="0.01" value="${data?.rate || ''}" required>
                </div>
                <div class="form-group" style="margin: 0;">
                    <label class="form-label">Value (â‚¹)</label>
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

    document.getElementById('taxableValue').textContent = `â‚¹${taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('cgstValue').textContent = `â‚¹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('sgstValue').textContent = `â‚¹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    // Display rounding off
    const roundOffElement = document.getElementById('roundOffValue');
    if (roundOffElement) {
        const sign = roundOff >= 0 ? '+' : '';
        roundOffElement.textContent = `${sign}â‚¹${roundOff.toFixed(2)}`;
    }

    document.getElementById('totalValue').textContent = `â‚¹${roundedTotal.toLocaleString('en-IN')}`;

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
            showToast(`âš ï¸ "${selectedProduct.description}" - Price & PO limit are from ${formatMonthYear(selectedProduct.lastUpdated)}. Please update in Customer module for this month.`, 'warning');

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
        showToast('âš ï¸ Please select a customer first before adding a new product', 'warning');
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
        showToast('âŒ Product description is required', 'error');
        return;
    }

    // Get the selected customer
    const customerDropdown = document.getElementById('customerDropdown');
    const customerId = customerDropdown ? customerDropdown.value : null;

    if (!customerId) {
        showToast('âŒ No customer selected', 'error');
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
        lastUpdated: currentMonth
    };

    // Add product to customer's product list
    let customers = getCustomers();
    const customerIndex = customers.findIndex(c => c.id === customerId);

    if (customerIndex === -1) {
        showToast('âŒ Customer not found', 'error');
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
        showToast('âš ï¸ Product with this name already exists for this customer', 'warning');
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

    showToast('âœ… Product added successfully to customer catalog!', 'success');
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
        showToast(`âš ï¸ ${result.message}`, 'warning');
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
        <span style="font-size: 18px; margin-right: 10px;">âš ï¸</span>
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
                        âš ï¸ Cannot Create Outward Invoice
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
                            <strong>ðŸ“‹ Action Required:</strong><br>
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

    // Clear all filters to ensure the new/updated invoice is visible
    outwardFilters.invoiceNo = '';
    outwardFilters.customer = '';
    outwardFilters.dateFrom = '';
    outwardFilters.dateTo = '';
    outwardFilters.paymentStatus = 'All';

    // Reset filter inputs in DOM
    const filterIds = ['filter-invoiceNo', 'filter-date-from', 'filter-date-to', 'filter-customer-select', 'outwardSearch'];
    filterIds.forEach(id => {
        const el = document.getElementById(id) || document.querySelector(`#${id} .filter-input`);
        if (el) el.value = '';
    });
    // Reset payment status checkboxes
    document.querySelectorAll('#filter-paymentStatus input[type="checkbox"]').forEach(cb => {
        cb.checked = cb.value === 'All';
    });

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

    console.log('Loading Outward Invoices...', invoices);
    console.log('Total count:', invoices.length);
    if (invoices.length > 0) {
        console.log('IDs:', invoices.map(i => i.invoiceNo).join(', '));
    }

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
        const invA = a.invoiceNo || '';
        const invB = b.invoiceNo || '';
        return invB.localeCompare(invA, undefined, { numeric: true });
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
            const monthIcon = isCurrentMonth ? 'ðŸ“¤' : 'ðŸ“¦';
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
                        <span style="float: right; font-size: 0.9rem; text-transform: none;">Total: â‚¹${monthTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
                <td>â‚¹${parseFloat(inv.taxableValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td>â‚¹${parseFloat(inv.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td><span class="badge badge-${badgeClass}">${inv.paymentStatus}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn pdf" onclick="downloadOutwardInvoicePDF('${inv.id}')" title="Download PDF">ðŸ“„</button>
                        <button class="icon-btn view" onclick="viewOutwardInvoice('${inv.id}')" title="View/Print">ðŸ–¨ï¸</button>
                        <button class="icon-btn edit" onclick="openOutwardModal('${inv.id}')" title="Edit">âœï¸</button>
                        <button class="icon-btn view" onclick="openMarkPaidModal('${inv.id}')" title="Update Payment Status">ðŸ’³</button>
                        <button class="icon-btn delete" onclick="deleteOutwardInvoice('${inv.id}')" title="Delete">ðŸ—‘ï¸</button>
                    </div>
                </td>
            </tr>
        `;
    });

    console.log(`Rendered ${invoices.length} outward invoices to table.`);
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

// =============================================
// MARK AS PAID MODAL
// =============================================

let _markPaidInvoiceId = null;

function openMarkPaidModal(id) {
    const invoices = getOutwardInvoices();
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;

    _markPaidInvoiceId = id;

    const label = document.getElementById('markPaidInvoiceLabel');
    if (label) label.textContent = `Invoice: ${inv.invoiceNo}  |  Customer: ${inv.buyerName}`;

    const statusSelect = document.getElementById('markPaidStatus');
    if (statusSelect) statusSelect.value = inv.paymentStatus || 'Pending';

    const partialGroup = document.getElementById('partialAmountGroup');
    const partialInput = document.getElementById('markPaidPartialAmount');
    if (partialGroup) partialGroup.style.display = (inv.paymentStatus === 'Partial') ? '' : 'none';
    if (partialInput) partialInput.value = inv.amountPaid || '';

    // Show/hide partial amount on status change
    if (statusSelect) {
        statusSelect.onchange = function () {
            if (partialGroup) partialGroup.style.display = (this.value === 'Partial') ? '' : 'none';
        };
    }

    const modal = document.getElementById('markPaidModal');
    if (modal) modal.classList.add('active');
}

function closeMarkPaidModal() {
    const modal = document.getElementById('markPaidModal');
    if (modal) modal.classList.remove('active');
    _markPaidInvoiceId = null;
}

function confirmMarkPaid() {
    if (!_markPaidInvoiceId) return;

    const status = document.getElementById('markPaidStatus').value;
    const partialAmount = document.getElementById('markPaidPartialAmount').value;

    const invoices = getOutwardInvoices();
    const index = invoices.findIndex(i => i.id === _markPaidInvoiceId);
    if (index === -1) return;

    invoices[index].paymentStatus = status;
    if (status === 'Partial') {
        invoices[index].amountPaid = parseFloat(partialAmount) || 0;
    } else {
        delete invoices[index].amountPaid;
    }

    saveToStorage('outwardInvoices', invoices);
    closeMarkPaidModal();
    loadOutwardInvoices();
    loadDashboard();
    showToast(`Invoice marked as ${status}`, 'success');
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
    const minRows = 5; // Minimum number of rows to display

    // Filter only products with actual data
    const validProducts = invoice.products.filter(product => {
        const desc = product.description && product.description.trim();
        return desc && desc !== '-- Select Product --';
    });

    let rowCount = 0;
    validProducts.forEach((product, index) => {
        const desc = product.description;
        const hsn = product.hsn && product.hsn.trim() ? product.hsn : '';
        const qty = product.quantity && product.quantity !== '' ? product.quantity : '';
        const uom = product.uom && product.uom.trim() ? product.uom : '';
        const rate = product.rate && product.rate !== '' ? parseFloat(product.rate).toFixed(2) : '';
        const value = product.value && product.value !== '' ? parseFloat(product.value).toFixed(2) : '';

        productsHTML += `
            <tr>
                <td style="padding: 6px 4px; text-align: center; font-size: 13px; border-left: 1px solid #000; border-right: 1px solid #000;">${index + 1}</td>
                <td style="padding: 6px 8px; font-size: 13px; border-right: 1px solid #000;">${desc}</td>
                <td style="padding: 6px 4px; text-align: center; font-size: 13px; border-right: 1px solid #000;">${hsn}</td>
                <td style="padding: 6px 4px; text-align: center; font-size: 13px; border-right: 1px solid #000;">${qty}</td>
                <td style="padding: 6px 4px; text-align: center; font-size: 13px; border-right: 1px solid #000;">${uom}</td>
                <td style="padding: 6px 4px; text-align: right; font-size: 13px; border-right: 1px solid #000;">${rate}</td>
                <td style="padding: 6px 4px; text-align: right; font-size: 13px; border-right: 1px solid #000;">${value}</td>
            </tr>
        `;
        rowCount++;
    });

    // Add empty rows to maintain minimum 5 rows
    const emptyRowsNeeded = minRows - rowCount;
    for (let i = 0; i < emptyRowsNeeded; i++) {
        productsHTML += `
            <tr>
                <td style="padding: 6px 4px; text-align: center; font-size: 13px; border-left: 1px solid #000; border-right: 1px solid #000;">&nbsp;</td>
                <td style="padding: 6px 8px; font-size: 13px; border-right: 1px solid #000;">&nbsp;</td>
                <td style="padding: 6px 4px; text-align: center; font-size: 13px; border-right: 1px solid #000;">&nbsp;</td>
                <td style="padding: 6px 4px; text-align: center; font-size: 13px; border-right: 1px solid #000;">&nbsp;</td>
                <td style="padding: 6px 4px; text-align: center; font-size: 13px; border-right: 1px solid #000;">&nbsp;</td>
                <td style="padding: 6px 4px; text-align: right; font-size: 13px; border-right: 1px solid #000;">&nbsp;</td>
                <td style="padding: 6px 4px; text-align: right; font-size: 13px; border-right: 1px solid #000;">&nbsp;</td>
            </tr>
        `;
    }

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Tax Invoice - ${invoice.invoiceNo}</title>
            <style>
                @page { 
                    size: A4; 
                    margin: 11mm; 
                }
                @media print {
                    html, body {
                        width: 210mm;
                        height: 297mm;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { 
                    width: 100%;
                    height: 100%;
                    margin: 0;
                    padding: 0;
                }
                body { 
                    font-family: 'Arial Narrow', Arial, sans-serif; 
                    font-size: 13px; 
                    font-weight: bold;
                    color: #000; 
                    line-height: 1.4;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .invoice-container { 
                    width: 100%;
                    max-height: 100%;
                    border: 2px solid #000;
                    display: flex;
                    flex-direction: column;
                    page-break-inside: avoid;
                    overflow: hidden;
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
                }
                .logo-box {
                    width: 65px;
                    height: 65px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 20px;
                }
                .header-right {
                    display: table-cell;
                    vertical-align: middle;
                    padding: 10px 12px 10px 0;
                    text-align: center;
                }
                .company-name { 
                    font-size: 26px; 
                    font-weight: bold; 
                    margin-bottom: 6px;
                    text-align: center;
                    margin-left: -40px;
                }
                .company-details { 
                    font-size: 12px; 
                    font-weight: bold;
                    margin-bottom: 6px; 
                    line-height: 1.5;
                    text-align: center;
                    margin-left: -40px;
                }
                .gst-details { 
                    font-size: 13px; 
                    font-weight: bold;
                    margin-top: 6px;
                    text-align: center;
                    margin-left: -40px;
                }
                
                /* Title */
                .invoice-title-section {
                    text-align: center;
                    padding: 4px;
                    border-bottom: 2px solid #000;
                }
                .invoice-title { 
                    font-size: 20px; 
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
                    font-size: 12px;
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
                    font-weight: bold;
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
                    margin-left: 8px;
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
                    font-size: 11px;
                    vertical-align: top;
                    word-break: break-word;
                    overflow-wrap: break-word;
                }
                .address-left {
                    border-right: 1px solid #000;
                }
                .address-title {
                    font-weight: bold;
                    font-size: 14px;
                    margin-bottom: 6px;
                }
                
                /* Products Table */
                .products-table { 
                    width: 100%; 
                    border-collapse: collapse;
                    flex-grow: 1;
                    border: 1px solid #000;
                }
                .products-table thead {
                    background-color: #b4c7e7;
                }
                .products-table th { 
                    border: 1px solid #000; 
                    padding: 8px 6px; 
                    font-size: 14px;
                    font-weight: bold;
                    text-align: center;
                }
                .products-table td {
                    border-left: 1px solid #000;
                    border-right: 1px solid #000;
                    font-size: 14px;
                }
                .products-table tbody tr td {
                    border-left: 1px solid #000;
                    border-right: 1px solid #000;
                    border-bottom: none;
                    border-top: none;
                }
                .products-table .totals-row td {
                    border: 1px solid #000;
                    border-top: 1px solid #000;
                    padding: 6px 12px;
                    font-size: 14px;
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
                    font-size: 13px;
                    border-bottom: 2px solid #000;
                }
                
                /* Declaration */
                .declaration-section {
                    padding: 12px 12px;
                    font-size: 12px;
                    line-height: 1.5;
                    min-height: 100px;
                    flex-grow: 1;
                }
                
                /* Footer */
                .footer-section {
                    text-align: right;
                    padding: 40px 12px 12px 12px;
                    font-size: 13px;
                }
                .footer-company {
                    font-weight: bold;
                    margin-bottom: 50px;
                }
                .footer-signature {
                    display: inline-block;
                    padding-top: 35px;
                    min-width: 180px;
                }
                
                /* Jurisdiction */
                .jurisdiction-section {
                    text-align: center;
                    padding: 10px;
                    font-size: 12px;
                    margin-top: auto;
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <!-- Header with Logo and Company Details -->
                <div class="header-section">
                    <div class="header-left">
                        <img src="logo.png" alt="Company Logo" style="width: 120px; height: 120px; display: block; object-fit: contain;" />
                    </div>
                    <div class="header-right">
                        <div class="company-name">M/s.Sri Veera Raghava Sheet Metal Component</div>
                        <div class="company-details">
                            S-115 Kakkalur SIDCO Industrial Estate, Kakkalur, Thiruvallur, Tamilnadu â€“ 602003<br>
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
                            <span class="info-label">DC No. / Date</span>
                            <span class="info-colon">:</span>
                            <span class="info-value">${invoice.dcNo || ''}${invoice.dcNo && invoice.dcDate ? ' / ' : ''}${invoice.dcDate ? formatDate(invoice.dcDate) : ''}</span>
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
                        <div class="address-title"><span style="text-decoration: underline;">Buyer Address</span> &nbsp;&nbsp;&nbsp;:</div>
                        <div style="margin-top: 4px;">
                            <span style="font-size: 15px; font-weight: bold;">${invoice.buyerName}</span><br>
                            ${invoice.buyerAddress.replace(/\n/g, '<br>').replace(/,\s*Thiruvallur/gi, ',<br>Thiruvallur')}<br>
                            Contact : ${invoice.contact || ''}<br>
                            GSTIN : ${invoice.gstin}
                        </div>
                    </div>
                    <div class="address-right">
                        <div class="address-title"><span style="text-decoration: underline;">Shipment Address</span> &nbsp;&nbsp;&nbsp;:</div>
                        <div style="margin-top: 4px;">
                            <span style="font-size: 15px; font-weight: bold;">${invoice.buyerName}</span><br>
                            ${(invoice.shippingAddress || invoice.buyerAddress).replace(/\n/g, '<br>').replace(/,\s*Thiruvallur/gi, ',<br>Thiruvallur')}<br>
                            Contact : ${invoice.contact || ''}<br>
                            GSTIN : ${invoice.gstin}
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
                            <td class="totals-value" style="font-size: 19px;">${parseFloat(invoice.taxableValue).toFixed(2)}</td>
                        </tr>
                        <tr class="totals-row">
                            <td colspan="6" style="text-align: right; padding: 6px 14px; font-size: 13px; font-weight: normal; border-bottom: none;">Out Put CGST @ 9%</td>
                            <td style="text-align: right; padding: 6px 12px; font-size: 13px; font-weight: normal; border-bottom: none;">${parseFloat(invoice.cgst).toFixed(2)}</td>
                        </tr>
                        <tr class="totals-row">
                            <td colspan="6" style="text-align: right; padding: 6px 12px; font-size: 13px; font-weight: normal; border-bottom: none; border-top: none;">Out Put SGST @ 9%</td>
                            <td style="text-align: right; padding: 6px 12px; font-size: 13px; font-weight: normal; border-bottom: none; border-top: none;">${parseFloat(invoice.sgst).toFixed(2)}</td>
                        </tr>
                        <tr class="totals-row">
                            <td colspan="6" class="totals-label" style="border-top: none;">Total Amount ( Including Tax )</td>
                            <td class="totals-value" style="font-size: 19px; border-top: none;">${parseFloat(invoice.total).toFixed(2)}</td>
                        </tr>
                        <tr class="totals-row">
                            <td colspan="6" style="text-align: right; padding: 6px 12px; font-size: 16px; font-weight: bold;">Rounding off</td>
                            <td class="totals-value" style="font-size: 20px;">${Math.round(parseFloat(invoice.total))}.00</td>
                        </tr>
                    </tbody>
                </table>
                
                <!-- Amount in Words -->
                <div class="amount-words-section">
                    Amount Chargeable (In Words) : ${invoice.amountInWords}
                </div>
                
                <!-- Declaration -->
                <div class="declaration-section">
                    Declaration :<br>
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
            ? `â‚¹${parseFloat(netSalary).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`
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
                        <button class="icon-btn edit" onclick="openEmployeeModal('${emp.id}')" title="Edit">âœï¸</button>
                        <button class="icon-btn delete" onclick="deleteEmployee('${emp.id}')" title="Delete">ðŸ—‘ï¸</button>
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

    let html = '<table class="data-table"><thead><tr><th style="width: 15%;">Employee ID</th><th style="width: 20%;">Name</th><th style="width: 15%;">Status</th><th style="width: 13%;">Time In</th><th style="width: 13%;">Time Out</th><th style="width: 10%;">Overtime (hrs)</th><th style="width: 14%;">Remarks</th></tr></thead><tbody>';

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
                <td><input type="number" class="form-control attendance-overtime" min="0" step="0.5" placeholder="0"></td>
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
    const overtimeField = row.querySelector('.attendance-overtime');
    const remarksField = row.querySelector('.attendance-remarks');

    // Clear any previous validation styling
    remarksField.style.borderColor = '';
    remarksField.style.background = '';

    if (status === 'Absent' || status === 'Leave') {
        // Disable time fields for Absent/Leave
        timeInField.disabled = true;
        timeOutField.disabled = true;
        overtimeField.disabled = true;
        timeInField.value = '';
        timeOutField.value = '';
        overtimeField.value = '';
        timeInField.style.opacity = '0.5';
        timeOutField.style.opacity = '0.5';
        overtimeField.style.opacity = '0.5';
        timeInField.style.cursor = 'not-allowed';
        timeOutField.style.cursor = 'not-allowed';
        overtimeField.style.cursor = 'not-allowed';

        // Make remarks mandatory
        remarksField.placeholder = 'Reason required';
        remarksField.style.borderColor = 'var(--warning)';
        remarksField.style.background = 'rgba(255, 193, 7, 0.05)';
        remarksField.required = true;

    } else if (status === 'Half-day') {
        // Enable time fields for Half-day (user needs to enter times)
        timeInField.disabled = false;
        timeOutField.disabled = false;
        overtimeField.disabled = false;
        timeInField.style.opacity = '1';
        timeOutField.style.opacity = '1';
        overtimeField.style.opacity = '1';
        timeInField.style.cursor = '';
        timeOutField.style.cursor = '';
        overtimeField.style.cursor = '';

        // Make remarks mandatory for half-day
        remarksField.placeholder = 'Reason required';
        remarksField.style.borderColor = 'var(--warning)';
        remarksField.style.background = 'rgba(255, 193, 7, 0.05)';
        remarksField.required = true;

    } else {
        // Present - enable time fields, remarks optional
        timeInField.disabled = false;
        timeOutField.disabled = false;
        overtimeField.disabled = false;
        timeInField.style.opacity = '1';
        timeOutField.style.opacity = '1';
        overtimeField.style.opacity = '1';
        timeInField.style.cursor = '';
        timeOutField.style.cursor = '';
        overtimeField.style.cursor = '';

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
        showToast(`âš ï¸ Remarks required for: ${missingRemarks.join(', ')}`, 'error');
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
            overtime: row.querySelector('.attendance-overtime').value || 0,
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

    // Reset filters so ALL saved records are visible after saving
    const empFilter = document.getElementById('attendanceEmployeeFilter');
    if (empFilter) empFilter.value = '';
    const statusFilterEl = document.getElementById('attendanceStatusFilter');
    if (statusFilterEl) statusFilterEl.value = '';
    const monthInput = document.getElementById('attendanceHistoryMonth');
    if (monthInput) {
        const now = new Date();
        monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    loadAttendanceHistory();
    loadAttendanceSummaryCards();
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
            row.querySelector('.attendance-time-in').value = record.timeIn || '';
            row.querySelector('.attendance-time-out').value = record.timeOut || '';
            row.querySelector('.attendance-overtime').value = record.overtime || '';
            row.querySelector('.attendance-remarks').value = record.remarks || '';

            // Trigger status change handler to update field states
            handleAttendanceStatusChange(statusSelect);
        }
    });

    showToast('Attendance loaded for ' + formatDate(date), 'success');
}

function loadAttendanceHistory() {
    let records = getAttendanceRecords();
    const tbody = document.getElementById('attendanceHistoryBody');
    const filterSelect = document.getElementById('attendanceEmployeeFilter');
    const monthInput = document.getElementById('attendanceHistoryMonth');
    const statusFilter = document.getElementById('attendanceStatusFilter');
    const statsContainer = document.getElementById('attendanceStatsContainer');
    const countBadge = document.getElementById('attRecordCount');

    // Initialize employee filter dropdown
    if (filterSelect) {
        const currentSelection = filterSelect.value; // Store what user just selected
        
        // Keep the first option (typically "All Employees" or placeholder)
        const firstOption = filterSelect.options.length > 0 ? filterSelect.options[0].outerHTML : '<option value="">All Employees</option>';
        filterSelect.innerHTML = firstOption;
        
        const employees = getEmployees();
        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = `${emp.name} (${emp.empId})`;
            filterSelect.appendChild(option);
        });
        
        if (currentSelection) filterSelect.value = currentSelection; // Restore selection
    }

    // Initialize month if empty
    if (monthInput && !monthInput.value) {
        const now = new Date();
        monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    if (records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center" style="color: var(--text-secondary);">
                    No attendance records yet.
                </td>
            </tr>
        `;
        if (statsContainer) statsContainer.style.display = 'none';
        if (countBadge) countBadge.style.display = 'none';
        return;
    }

    // Read active filter values
    const selectedEmpId  = filterSelect   ? filterSelect.value   : '';
    const selectedMonth  = monthInput     ? monthInput.value     : '';
    const selectedStatus = statusFilter   ? statusFilter.value   : '';

    // Apply filters
    if (selectedEmpId)  {
        // Allow matching by the internal ID or the visible EmpID
        records = records.filter(r => r.employeeId == selectedEmpId || r.employeeEmpId == selectedEmpId);
    }
    if (selectedMonth)  records = records.filter(r => r.date.startsWith(selectedMonth));
    if (selectedStatus) records = records.filter(r => r.status === selectedStatus);

    // Update record count badge
    if (countBadge) {
        countBadge.textContent = records.length;
        countBadge.style.display = records.length > 0 ? 'inline-block' : 'none';
    }

    // Show summary stats when any filter is active
    const anyFilterActive = selectedEmpId || selectedStatus || selectedMonth;
    if (anyFilterActive && statsContainer && records.length > 0) {
        let presents = 0, absents = 0, leaves = 0, halfDays = 0, totalOvertime = 0;
        records.forEach(r => {
            if (r.status === 'Present')       presents++;
            else if (r.status === 'Absent')   absents++;
            else if (r.status === 'Leave')    leaves++;
            else if (r.status === 'Half-day') halfDays++;
            totalOvertime += parseFloat(r.overtime || 0);
        });

        statsContainer.innerHTML = `
            <div style="flex: 1; min-width: 110px;">
                <div style="font-size: 0.78rem; color: var(--text-secondary);">Present</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: var(--success);">${presents}</div>
            </div>
            <div style="flex: 1; min-width: 110px;">
                <div style="font-size: 0.78rem; color: var(--text-secondary);">Absent</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: var(--danger);">${absents}</div>
            </div>
            <div style="flex: 1; min-width: 110px;">
                <div style="font-size: 0.78rem; color: var(--text-secondary);">Leave</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: var(--info);">${leaves}</div>
            </div>
            <div style="flex: 1; min-width: 110px;">
                <div style="font-size: 0.78rem; color: var(--text-secondary);">Half-day</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: var(--warning);">${halfDays}</div>
            </div>
            <div style="flex: 1; min-width: 120px;">
                <div style="font-size: 0.78rem; color: var(--text-secondary);">Total Overtime</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${totalOvertime} hrs</div>
            </div>
            <div style="flex: 1; min-width: 110px;">
                <div style="font-size: 0.78rem; color: var(--text-secondary);">Attendance %</div>
                <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${records.length > 0 ? Math.round((presents / records.length) * 100) : 0}%</div>
            </div>
        `;
        statsContainer.style.display = 'flex';
    } else if (statsContainer) {
        statsContainer.style.display = 'none';
    }

    if (records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center" style="color: var(--text-secondary);">
                    No attendance records found for the selected filters.
                </td>
            </tr>
        `;
        return;
    }

    // Sort by date descending
    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Get today's date for comparison
    const today = new Date().toISOString().split('T')[0];

    // Group records by date (if viewed across month, otherwise it's just a single list)
    let html = '';
    let lastDate = null;
    let lastMonth = null;
    const currentMonthForDisplay = new Date().toISOString().slice(0, 7);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    records.forEach(record => {
        const recordDate = record.date;
        const isToday = recordDate === today;
        const recordMonth = recordDate.slice(0, 7); // YYYY-MM
        const [year, month] = recordMonth.split('-');
        const monthName = monthNames[parseInt(month) - 1];
        const isCurrentMonth = recordMonth === currentMonthForDisplay;

        // Add month separator if no month filter is applied and new month
        if (!selectedMonth && recordMonth !== lastMonth) {
            const monthLabel = `${monthName} ${year}`;
            const monthColor = isCurrentMonth ?
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' :
                'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)';
            const monthIcon = isCurrentMonth ? 'ðŸ“…' : 'ðŸ“†';

            html += `
                <tr class="month-separator">
                    <td colspan="9" style="
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

        // Add date separator if new date and no employee selected (to group nicely)
        if (!selectedEmpId && recordDate !== lastDate) {
            const dateObj = new Date(recordDate);
            const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'long' });
            const formattedDate = formatDate(recordDate);

            const dateColor = isToday ? 'rgba(72, 187, 120, 0.15)' : 'rgba(99, 102, 241, 0.08)';
            const dateBorderColor = isToday ? 'rgba(72, 187, 120, 0.4)' : 'rgba(99, 102, 241, 0.2)';
            const dateTextColor = isToday ? 'var(--success)' : 'var(--primary)';
            const dateIcon = isToday ? 'ðŸŒŸ' : 'ðŸ“‹';

            html += `
                <tr class="date-separator">
                    <td colspan="9" style="
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

        let overtimeDisplay = '-';
        if (record.overtime && parseFloat(record.overtime) > 0) {
            overtimeDisplay = `<span style="color: var(--primary); font-weight: bold;">${record.overtime}</span>`;
        }

        html += `
            <tr style="background: ${isToday ? 'rgba(72, 187, 120, 0.05)' : 'transparent'};">
                <td>${formatDate(record.date)}${isToday ? ' <span class="badge badge-success" style="font-size:0.65rem;">TODAY</span>' : ''}</td>
                <td>${record.employeeName}</td>
                <td>${record.employeeEmpId}</td>
                <td><span class="badge badge-${badgeClass}">${record.status}</span></td>
                <td>${record.timeIn || '-'}</td>
                <td>${record.timeOut || '-'}</td>
                <td>${overtimeDisplay}</td>
                <td>${record.remarks || '-'}</td>
                <td style="text-align:center; white-space:nowrap;">
                    <button class="btn btn-secondary btn-sm" onclick="openEditAttendanceModal('${record.id}')" title="Edit" style="padding:0.2rem 0.5rem; margin-right:0.25rem;">âœï¸</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteAttendanceRecord('${record.id}')" title="Delete" style="padding:0.2rem 0.5rem;">ðŸ—‘ï¸</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ===================================
// ATTENDANCE CRUD OPERATIONS
// ===================================

function loadAttendanceSummaryCards() {
    const today = new Date().toISOString().split('T')[0];
    const records = getAttendanceRecords().filter(r => r.date === today);
    const employees = getEmployees();
    const present = records.filter(r => r.status === 'Present').length;
    const absent  = records.filter(r => r.status === 'Absent').length;
    const leave   = records.filter(r => r.status === 'Leave').length;
    const halfday = records.filter(r => r.status === 'Half-day').length;
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('attCard_present', present);
    setEl('attCard_absent',  absent);
    setEl('attCard_leave',   leave);
    setEl('attCard_halfday', halfday);
    setEl('attCard_total',   employees.length);
}

function deleteAttendanceRecord(id) {
    if (!confirm('Delete this attendance record? This action cannot be undone.')) return;
    let records = getAttendanceRecords();
    records = records.filter(r => r.id !== id);
    saveToStorage('attendance', records);
    showToast('Attendance record deleted.', 'success');
    loadAttendanceHistory();
    loadAttendanceSummaryCards();
}

function openEditAttendanceModal(id) {
    const record = getAttendanceRecords().find(r => r.id === id);
    if (!record) { showToast('Record not found.', 'error'); return; }
    document.getElementById('editAttId').value       = record.id;
    document.getElementById('editAttEmployee').value = `${record.employeeName} (${record.employeeEmpId})`;
    document.getElementById('editAttDate').value     = record.date;
    document.getElementById('editAttStatus').value   = record.status;
    document.getElementById('editAttTimeIn').value   = record.timeIn   || '';
    document.getElementById('editAttTimeOut').value  = record.timeOut  || '';
    document.getElementById('editAttOvertime').value = record.overtime || '';
    document.getElementById('editAttRemarks').value  = record.remarks  || '';
    handleEditAttendanceStatusChange();
    document.getElementById('editAttendanceModal').style.display = 'flex';
}

function closeEditAttendanceModal(e) {
    if (e && e.target !== document.getElementById('editAttendanceModal')) return;
    document.getElementById('editAttendanceModal').style.display = 'none';
}

function handleEditAttendanceStatusChange() {
    const status   = document.getElementById('editAttStatus').value;
    const timeIn   = document.getElementById('editAttTimeIn');
    const timeOut  = document.getElementById('editAttTimeOut');
    const overtime = document.getElementById('editAttOvertime');
    const remarks  = document.getElementById('editAttRemarks');
    const tag      = document.getElementById('editAttRemarksTag');
    const disableTime = status === 'Absent' || status === 'Leave';
    timeIn.disabled   = disableTime;
    timeOut.disabled  = disableTime;
    overtime.disabled = disableTime;
    [timeIn, timeOut, overtime].forEach(el => {
        el.style.opacity = disableTime ? '0.5' : '1';
        if (disableTime) el.value = '';
    });
    const needsReason = disableTime || status === 'Half-day';
    remarks.placeholder = needsReason ? 'Reason required' : 'Optional';
    if (tag) tag.style.display = needsReason ? 'inline' : 'none';
}

function saveEditAttendance() {
    const id       = document.getElementById('editAttId').value;
    const date     = document.getElementById('editAttDate').value;
    const status   = document.getElementById('editAttStatus').value;
    const timeIn   = document.getElementById('editAttTimeIn').value;
    const timeOut  = document.getElementById('editAttTimeOut').value;
    const overtime = document.getElementById('editAttOvertime').value;
    const remarks  = document.getElementById('editAttRemarks').value.trim();
    const remarksEl = document.getElementById('editAttRemarks');

    if (!date) { showToast('Please select a date.', 'error'); return; }
    if ((status === 'Absent' || status === 'Leave' || status === 'Half-day') && !remarks) {
        showToast('Remarks are required for ' + status, 'error');
        remarksEl.style.borderColor = 'var(--danger)';
        remarksEl.style.background  = 'rgba(220,53,69,0.08)';
        return;
    }
    remarksEl.style.borderColor = '';
    remarksEl.style.background  = '';

    let records = getAttendanceRecords();
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) { showToast('Record not found.', 'error'); return; }
    const noTime = status === 'Absent' || status === 'Leave';
    records[idx] = {
        ...records[idx],
        date,
        status,
        timeIn:   noTime ? '' : timeIn,
        timeOut:  noTime ? '' : timeOut,
        overtime: noTime ? 0  : (parseFloat(overtime) || 0),
        remarks
    };
    saveToStorage('attendance', records);
    document.getElementById('editAttendanceModal').style.display = 'none';
    showToast('Attendance record updated successfully!', 'success');
    loadAttendanceHistory();
    loadAttendanceSummaryCards();
}

function exportAttendanceCSV() {
    let records = getAttendanceRecords();
    const filterEmpId    = document.getElementById('attendanceEmployeeFilter')?.value;
    const filterMonth    = document.getElementById('attendanceHistoryMonth')?.value;
    const filterStatus   = document.getElementById('attendanceStatusFilter')?.value;
    if (filterEmpId)   {
        records = records.filter(r => r.employeeId == filterEmpId || r.employeeEmpId == filterEmpId);
    }
    if (filterMonth)   records = records.filter(r => r.date.startsWith(filterMonth));
    if (filterStatus)  records = records.filter(r => r.status === filterStatus);
    if (records.length === 0) { showToast('No records to export for the current filters.', 'warning'); return; }
    records.sort((a, b) => new Date(a.date) - new Date(b.date));
    const headers = ['Date', 'Employee Name', 'Emp ID', 'Status', 'Time In', 'Time Out', 'Overtime (hrs)', 'Remarks'];
    const rows = records.map(r => [
        r.date,
        `"${(r.employeeName || '').replace(/"/g, '""')}"`,
        r.employeeEmpId,
        r.status,
        r.timeIn   || '',
        r.timeOut  || '',
        r.overtime || 0,
        `"${(r.remarks || '').replace(/"/g, '""')}"`
    ]);
    const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Attendance_${filterMonth || 'All'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Attendance exported successfully!', 'success');
}

function clearAttendanceFilters() {
    const now = new Date();
    const el = (id) => document.getElementById(id);
    if (el('attendanceEmployeeFilter')) el('attendanceEmployeeFilter').value = '';
    if (el('attendanceStatusFilter'))   el('attendanceStatusFilter').value   = '';
    if (el('attendanceHistoryMonth'))   el('attendanceHistoryMonth').value   =
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    loadAttendanceHistory();
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
        <span>${type === 'success' ? 'âœ…' : type === 'error' ? 'âŒ' : type === 'warning' ? 'âš ï¸' : 'â„¹ï¸'}</span>
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
        if (cells.length < 9) return;

        const invoiceNo = cells[2].textContent.toLowerCase();
        const date = cells[3].textContent;
        const customer = cells[4].textContent.toLowerCase();
        const paymentStatus = cells[8].textContent.trim();

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
            const dateCell = cells[3].getAttribute('data-date') || parseDisplayDate(date);

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

// Fill product details when a product is selected in inward invoice
function fillInwardProductDetails(selectElement) {
    const productId = selectElement.value;
    if (!productId) return;

    const customerDropdown = document.getElementById('inwardCustomerDropdown');
    const customerId = customerDropdown ? customerDropdown.value : null;

    if (!customerId) return;

    if (typeof getCustomerProducts === 'function') {
        const products = getCustomerProducts(customerId);
        const product = products.find(p => p.id === productId);

        if (product) {
            const row = selectElement.closest('.inward-product-item');

            // Auto-fill Rate
            const rateInput = row.querySelector('.inward-product-rate');
            if (rateInput && product.price) {
                rateInput.value = product.price;
            }

            // Auto-fill UOM
            const uomSelect = row.querySelector('.inward-product-unit');
            if (uomSelect && (product.unit || product.uom)) {
                // Try to match unit/uom
                const uomVal = product.unit || product.uom;
                // Check if the option exists, if not maybe just set value or warn? 
                // HTML select will just ignore invalid value setting usually or select empty.
                // We assume standard UOMs match.
                uomSelect.value = uomVal;
            }

            // Trigger calculation
            if (rateInput) {
                calculateInwardProductValue(rateInput);
            }
        }
    }
}

// ===================================
// GLOBAL DATA ACCESSORS
// ===================================

function getInwardInvoices() {
    if (typeof loadFromStorage === 'function') {
        return loadFromStorage('inwardInvoices') || [];
    }
    return JSON.parse(localStorage.getItem('inwardInvoices')) || [];
}

function getOutwardInvoices() {
    if (typeof loadFromStorage === 'function') {
        return loadFromStorage('outwardInvoices') || [];
    }
    return JSON.parse(localStorage.getItem('outwardInvoices')) || [];
}

window.getInwardInvoices = getInwardInvoices;
window.getOutwardInvoices = getOutwardInvoices;

// ===================================
// DASHBOARD WIDGETS LOGIC
// ===================================

let dashboardChartInstance = null;
let topProductsChartInstance = null;

function initializeDashboardCharts() {
    if (typeof Chart === 'undefined') return;

    // 1. Sales vs Purchase Chart
    const ctx = document.getElementById('salesPurchaseChart');
    if (ctx) {
        const inward = getInwardInvoices();
        const outward = getOutwardInvoices();

        // Last 6 months
        const months = [];
        const salesData = [];
        const purchaseData = [];

        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthKey = d.toISOString().slice(0, 7); // YYYY-MM
            const monthLabel = d.toLocaleString('default', { month: 'short' });
            months.push(monthLabel);

            // Sum sales
            const monthSales = outward
                .filter(inv => inv.date && inv.date.startsWith(monthKey))
                .reduce((sum, inv) => sum + (parseFloat(inv.total) || parseFloat(inv.grandTotal) || 0), 0);
            salesData.push(monthSales);

            // Sum purchase
            const monthPurchase = inward
                .filter(inv => inv.date && inv.date.startsWith(monthKey))
                .reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
            purchaseData.push(monthPurchase);
        }

        if (dashboardChartInstance) dashboardChartInstance.destroy();

        dashboardChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Sales (â‚¹)',
                        data: salesData,
                        backgroundColor: '#667eea',
                        borderRadius: 4
                    },
                    {
                        label: 'Purchase (â‚¹)',
                        data: purchaseData,
                        backgroundColor: '#ef4444',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                if (value >= 100000) return 'â‚¹' + (value / 100000).toFixed(1) + 'L';
                                if (value >= 1000) return 'â‚¹' + (value / 1000).toFixed(1) + 'k';
                                return 'â‚¹' + value;
                            }
                        }
                    }
                }
            }
        });
    }

    // 2. Top Products Chart
    const ctxProduct = document.getElementById('topProductsChart');
    if (ctxProduct) {
        const outward = getOutwardInvoices();
        const productMap = {};

        outward.forEach(inv => {
            if (inv.products && Array.isArray(inv.products)) {
                inv.products.forEach(p => {
                    const name = p.description || 'Unknown';
                    const value = parseFloat(p.value) || 0;
                    productMap[name] = (productMap[name] || 0) + value;
                });
            }
        });

        // Sort by value and take top 5
        const sortedProducts = Object.entries(productMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (topProductsChartInstance) topProductsChartInstance.destroy();

        topProductsChartInstance = new Chart(ctxProduct, {
            type: 'doughnut',
            data: {
                labels: sortedProducts.map(p => p[0]),
                datasets: [{
                    data: sortedProducts.map(p => p[1]),
                    backgroundColor: [
                        '#667eea', '#764ba2', '#f59e0b', '#10b981', '#ef4444'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } }
                }
            }
        });
    }
}

function populateRecentInvoices() {
    const tbody = document.getElementById('recentInvoicesTableBody');
    if (!tbody) return;

    const outward = getOutwardInvoices();
    // Sort by date desc
    const recent = outward
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary">No invoices found</td></tr>';
        return;
    }

    tbody.innerHTML = recent.map(inv => `
        <tr>
            <td>${formatDate(inv.date)}</td>
            <td>${inv.invoiceNo}</td>
            <td>${inv.buyerName}</td>
            <td>â‚¹${(parseFloat(inv.total) || 0).toLocaleString('en-IN')}</td>
            <td><span class="badge ${inv.paymentStatus === 'Paid' ? 'success' : 'warning'}">${inv.paymentStatus}</span></td>
        </tr>
    `).join('');
}

function updateSystemStatus() {
    const backupStatus = document.getElementById('dashboardBackupStatus');
    if (backupStatus) {
        const lastBackup = localStorage.getItem('lastBackupDate');
        if (lastBackup) {
            backupStatus.textContent = 'Last: ' + new Date(lastBackup).toLocaleDateString();
            backupStatus.className = 'badge success';
        } else {
            backupStatus.textContent = 'Never';
            backupStatus.className = 'badge warning';
        }
    }

    const storageUsage = document.getElementById('dashboardStorageUsage');
    if (storageUsage) {
        if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then(estimate => {
                const usedMB = (estimate.usage / (1024 * 1024)).toFixed(2);
                storageUsage.textContent = `${usedMB} MB Used`;
            });
        }
    }
}


