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
    // Set default date for attendance
    document.getElementById('attendanceDate').valueAsDate = new Date();

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
            break;
        case 'outward-invoice':
            loadOutwardInvoices();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'employees':
            loadEmployees();
            break;
        case 'attendance':
            loadAttendanceUI();
            loadAttendanceHistory();
            break;
        case 'expenses':
            if (typeof loadExpenses === 'function') {
                loadExpenses();
            }
            break;
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

    // Update statistics
    document.getElementById('totalInward').textContent = inwardInvoices.length;
    document.getElementById('totalOutward').textContent = outwardInvoices.length;
    document.getElementById('totalEmployees').textContent = employees.length;

    // Calculate outstanding  
    const inwardPending = inwardInvoices.filter(inv => inv.paymentStatus !== 'Paid');
    const outwardPending = outwardInvoices.filter(inv => inv.paymentStatus !== 'Paid');

    const totalOutstanding =
        inwardPending.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0) +
        outwardPending.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);

    document.getElementById('totalOutstanding').textContent = `₹${totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    // Display pending invoices by company
    displayPendingInward(inwardPending);
    displayPendingOutward(outwardPending);

    // Update expense dashboard summary
    updateExpenseDashboard();
}

function displayPendingInward(invoices) {
    const container = document.getElementById('pendingInward');

    if (invoices.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No pending inward invoices</p>';
        return;
    }

    // Display each invoice separately (no grouping)
    let html = '';
    invoices.forEach(inv => {
        const amount = parseFloat(inv.amount || 0);
        const statusClass = inv.paymentStatus === 'Partial' ? 'partial' : 'pending';

        // Get payment status with days tracking
        const paymentStatusHTML = typeof formatPaymentStatus === 'function'
            ? formatPaymentStatus(inv)
            : `<span class="badge badge-${statusClass === 'partial' ? 'warning' : 'danger'}">${inv.paymentStatus}</span>`;

        html += `
            <div class="pending-card ${statusClass}">
                <div class="pending-company">${inv.customer}</div>
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
            document.getElementById('inwardMaterial').value = invoice.material;
            document.getElementById('inwardQuantity').value = invoice.quantity;
            document.getElementById('inwardUnit').value = invoice.unit;
            document.getElementById('inwardRate').value = invoice.rate;
            document.getElementById('inwardAmount').value = invoice.amount;
            document.getElementById('inwardPaymentStatus').value = invoice.paymentStatus;
            document.getElementById('inwardNotes').value = invoice.notes || '';

            // Try to pre-select customer in dropdown if it matches
            if (customerDropdown && invoice.customer) {
                const customers = getCustomers();
                const matchingCustomer = customers.find(c => c.companyName === invoice.customer);
                if (matchingCustomer) {
                    customerDropdown.value = matchingCustomer.id;
                }
            }

            // Lock invoice number if already saved
            if (invoice.locked) {
                const invoiceNoField = document.getElementById('inwardInvoiceNo');
                invoiceNoField.readOnly = true;
                invoiceNoField.style.opacity = '0.6';
                invoiceNoField.title = 'Invoice number is locked and cannot be changed';
            }
        }
    } else {
        // New mode
        document.getElementById('inwardModalTitle').textContent = 'New Inward Invoice';
        document.getElementById('inwardDate').valueAsDate = new Date();

        // Auto-generate invoice number
        generateInwardInvoiceNumber();

        // Invoice number field is editable in case user wants to customize
        const invoiceNoField = document.getElementById('inwardInvoiceNo');
        invoiceNoField.readOnly = false;
        invoiceNoField.style.opacity = '1';
        invoiceNoField.title = 'Auto-generated, but you can edit if needed';
    }

    modal.classList.add('active');
}

function closeInwardModal() {
    document.getElementById('inwardModal').classList.remove('active');
}

function saveInwardInvoice() {
    const id = document.getElementById('inwardId').value;
    const invoiceNo = document.getElementById('inwardInvoiceNo').value;

    // Validate invoice number (check for duplicates)
    const existingInvoices = getInwardInvoices();
    const duplicate = existingInvoices.find(inv =>
        inv.invoiceNo === invoiceNo && inv.id !== id
    );

    if (duplicate) {
        showToast('❌ Invoice number already exists!', 'error');
        return;
    }

    const invoiceData = {
        id: id || Date.now().toString(),
        invoiceNo: invoiceNo,
        date: document.getElementById('inwardDate').value,
        customer: document.getElementById('inwardCustomer').value,
        material: document.getElementById('inwardMaterial').value,
        quantity: document.getElementById('inwardQuantity').value,
        unit: document.getElementById('inwardUnit').value,
        rate: document.getElementById('inwardRate').value,
        amount: document.getElementById('inwardAmount').value,
        paymentStatus: document.getElementById('inwardPaymentStatus').value,
        notes: document.getElementById('inwardNotes').value,
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
                <td colspan="7" class="text-center" style="color: var(--text-secondary);">
                    No inward invoices yet. Click "New Inward Invoice" to create one.
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    invoices.forEach(inv => {
        const badgeClass = inv.paymentStatus === 'Paid' ? 'success' : (inv.paymentStatus === 'Partial' ? 'warning' : 'danger');
        html += `
            <tr>
                <td>${inv.invoiceNo}</td>
                <td>${formatDate(inv.date)}</td>
                <td>${inv.customer}</td>
                <td>${inv.material}</td>
                <td>₹${parseFloat(inv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td><span class="badge badge-${badgeClass}">${inv.paymentStatus}</span></td>
                <td>
                    <div class="action-buttons">
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
    const nextNum = invoices.length + 1;
    const invoiceNo = `SVR/TI/${new Date().getFullYear()}/${String(nextNum).padStart(4, '0')}`;

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
    document.getElementById('outwardDCNo').value = invoice.dcNo;
    document.getElementById('outwardDCDate').value = invoice.dcDate;
    document.getElementById('outwardState').value = invoice.state;
    document.getElementById('outwardStateCode').value = invoice.stateCode;
    document.getElementById('outwardPaymentTerms').value = invoice.paymentTerms || '';
    document.getElementById('outwardVehicle').value = invoice.vehicle || '';
    document.getElementById('outwardBuyerName').value = invoice.buyerName;
    document.getElementById('outwardBuyerAddress').value = invoice.buyerAddress;
    document.getElementById('outwardGSTIN').value = invoice.gstin;
    document.getElementById('outwardContact').value = invoice.contact || '';
    document.getElementById('outwardPaymentStatus').value = invoice.paymentStatus;

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
                    <input type="text" class="form-control product-uom" placeholder="Nos" value="${data?.uom || ''}" required>
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
    const total = taxableValue + cgst + sgst;

    document.getElementById('taxableValue').textContent = `₹${taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('cgstValue').textContent = `₹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('sgstValue').textContent = `₹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('totalValue').textContent = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    // Convert to words
    const rounded = Math.round(total);
    const inWords = numberToWords(rounded);
    document.getElementById('amountInWords').textContent = inWords + ' Only';
}

// Handle product selection from dropdown
function onProductSelected(selectElement) {
    const productId = selectElement.value;

    if (!productId) return;

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

        // Auto-fill HSN code if available
        if (hsnInput && selectedProduct.hsn) {
            hsnInput.value = selectedProduct.hsn;
        }

        // Auto-fill Price/Rate if available
        if (rateInput && selectedProduct.price) {
            rateInput.value = selectedProduct.price;
            // Trigger calculation
            rateInput.dispatchEvent(new Event('input'));
        }

        // Check PO limit when quantity changes
        if (qtyInput && selectedProduct.poQty) {
            qtyInput.addEventListener('blur', function () {
                checkPOLimit(customerId, selectedProduct, parseFloat(this.value) || 0);
            });
        }
    }
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
            message: `PO Limit Exceeded! Product "${product.description}" - PO Limit: ${product.poQty}/month, Current Month Total: ${monthlyTotal}, This Invoice: ${invoiceQty}, Total Would Be: ${totalWithCurrent} (Exceeds by: +${excess})`
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

    // Validate PO limits before saving
    const customerDropdown = document.getElementById('customerDropdown');
    const customerId = customerDropdown ? customerDropdown.value : null;

    console.log('=== PO Validation Debug ===');
    console.log('Customer ID:', customerId);

    if (customerId) {
        const customerProducts = getCustomerProducts(customerId);
        console.log('Customer Products:', customerProducts);
        console.log('Invoice Products:', products);

        for (const product of products) {
            // Skip empty products
            if (!product.description || product.description.trim() === '' || product.description === '-- Select Product --') {
                continue;
            }

            console.log('Checking product:', product.description);
            const customerProduct = customerProducts.find(p => p.description === product.description);
            console.log('Found customer product:', customerProduct);

            if (customerProduct && customerProduct.poQty > 0) {
                const qty = parseFloat(product.quantity) || 0;
                console.log('Validating PO - Qty:', qty, 'PO Limit:', customerProduct.poQty);

                const validationResult = validatePOLimit(customerId, customerProduct, qty, id);
                console.log('Validation Result:', validationResult);

                if (!validationResult.valid) {
                    showPOError(validationResult.message);
                    showToast('❌ Invoice NOT saved - PO Limit Exceeded!', 'error');
                    console.error('PO LIMIT EXCEEDED - Save blocked!');
                    return; // Stop saving
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
        dcNo: document.getElementById('outwardDCNo').value,
        dcDate: document.getElementById('outwardDCDate').value,
        state: document.getElementById('outwardState').value,
        stateCode: document.getElementById('outwardStateCode').value,
        paymentTerms: document.getElementById('outwardPaymentTerms').value,
        vehicle: document.getElementById('outwardVehicle').value,
        buyerName: document.getElementById('outwardBuyerName').value,
        buyerAddress: document.getElementById('outwardBuyerAddress').value,
        gstin: document.getElementById('outwardGSTIN').value,
        contact: document.getElementById('outwardContact').value,
        products: products,
        taxableValue: taxableValue.toFixed(2),
        cgst: cgst.toFixed(2),
        sgst: sgst.toFixed(2),
        total: total.toFixed(2),
        paymentStatus: document.getElementById('outwardPaymentStatus').value,
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

    let html = '';
    invoices.forEach(inv => {
        const badgeClass = inv.paymentStatus === 'Paid' ? 'success' : (inv.paymentStatus === 'Partial' ? 'warning' : 'danger');
        html += `
            <tr>
                <td>${inv.invoiceNo}</td>
                <td>${formatDate(inv.date)}</td>
                <td>${inv.buyerName}</td>
                <td>${inv.gstin}</td>
                <td>₹${parseFloat(inv.taxableValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td>₹${parseFloat(inv.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td><span class="badge badge-${badgeClass}">${inv.paymentStatus}</span></td>
                <td>
                    <div class="action-buttons">
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
                @page { margin: 10mm 8mm; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: Arial, sans-serif; 
                    font-size: 10px; 
                    color: #000; 
                    line-height: 1.3;
                }
                .invoice-container { 
                    max-width: 100%; 
                    margin: 0 auto; 
                    border: 2px solid #000;
                }
                
                /* Header Section */
                .header-section { 
                    display: table;
                    width: 100%;
                    border-bottom: 2px solid #000;
                }
                .header-left {
                    display: table-cell;
                    width: 80px;
                    vertical-align: middle;
                    padding: 10px;
                    border-right: 1px solid #000;
                }
                .logo-box {
                    width: 60px;
                    height: 60px;
                    border: 1px solid #000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 18px;
                }
                .header-right {
                    display: table-cell;
                    vertical-align: top;
                    padding: 8px 10px;
                }
                .company-name { 
                    font-size: 13px; 
                    font-weight: bold; 
                    margin-bottom: 4px; 
                }
                .company-details { 
                    font-size: 9px; 
                    margin-bottom: 4px; 
                    line-height: 1.4; 
                }
                .gst-details { 
                    font-size: 9px; 
                    margin-top: 4px;
                }
                
                /* Title */
                .invoice-title-section {
                    text-align: center;
                    padding: 6px;
                    border-bottom: 2px solid #000;
                }
                .invoice-title { 
                    font-size: 16px; 
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
                    padding: 8px 10px;
                    font-size: 9px;
                    vertical-align: top;
                }
                .info-left {
                    border-right: 1px solid #000;
                }
                .info-row {
                    margin-bottom: 3px;
                    display: flex;
                }
                .info-label {
                    font-weight: normal;
                    min-width: 110px;
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
                    padding: 8px 10px;
                    font-size: 9px;
                    vertical-align: top;
                }
                .address-left {
                    border-right: 1px solid #000;
                }
                .address-title {
                    font-weight: bold;
                    margin-bottom: 4px;
                }
                
                /* Products Table */
                .products-table { 
                    width: 100%; 
                    border-collapse: collapse;
                }
                .products-table thead {
                    background-color: #b4c7e7;
                }
                .products-table th { 
                    border: 1px solid #000; 
                    padding: 6px 4px; 
                    font-size: 9px;
                    font-weight: bold;
                    text-align: center;
                }
                .products-table td {
                    border: 1px solid #000;
                }
                .products-table .totals-row td {
                    padding: 5px 8px;
                    font-size: 9px;
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
                    padding: 6px 10px;
                    font-size: 9px;
                    border-bottom: 2px solid #000;
                }
                
                /* Declaration */
                .declaration-section {
                    padding: 8px 10px;
                    font-size: 9px;
                    line-height: 1.4;
                    border-bottom: 2px solid #000;
                    min-height: 80px;
                }
                
                /* Footer */
                .footer-section {
                    text-align: right;
                    padding: 30px 10px 8px 10px;
                    font-size: 9px;
                }
                .footer-company {
                    font-weight: bold;
                    margin-bottom: 40px;
                }
                .footer-signature {
                    display: inline-block;
                    padding-top: 4px;
                    min-width: 150px;
                }
                
                /* Jurisdiction */
                .jurisdiction-section {
                    text-align: center;
                    padding: 6px;
                    font-size: 8px;
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <!-- Header with Logo and Company Details -->
                <div class="header-section">
                    <div class="header-left">
                        <div class="logo-box">SVR</div>
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
                            <span class="info-label">Invoice No &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>
                            <span class="info-value">${invoice.invoiceNo}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Invoice Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>
                            <span class="info-value">${formatDate(invoice.date)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">DC No. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>
                            <span class="info-value"></span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Payment Terms &nbsp;:</span>
                            <span class="info-value">${invoice.paymentTerms || ''}</span>
                        </div>
                    </div>
                    <div class="info-right">
                        <div class="info-row">
                            <span class="info-label">PO No &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>
                            <span class="info-value">${invoice.dcNo || ''}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">PO Date &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>
                            <span class="info-value">${formatDate(invoice.dcDate)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Transporter Name &nbsp;:</span>
                            <span class="info-value"></span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Vechical No &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</span>
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
                            ${invoice.buyerAddress.replace(/\n/g, '<br>')}<br>
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
                            <td colspan="6" style="text-align: right; padding: 5px 8px; font-size: 9px;">Rounding off</td>
                            <td style="text-align: right; padding: 5px 8px; font-size: 9px;">${Math.round(parseFloat(invoice.total))}.00</td>
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
        doj: document.getElementById('employeeDOJ').value
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
        html += `
            <tr>
                <td>${emp.empId}</td>
                <td>${emp.name}</td>
                <td>${emp.designation}</td>
                <td>${emp.department}</td>
                <td>${emp.contact}</td>
                <td>${formatDate(emp.doj)}</td>
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
                    <select class="form-control attendance-status">
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

function markAllPresent() {
    const statusSelects = document.querySelectorAll('.attendance-status');
    statusSelects.forEach(select => {
        select.value = 'Present';
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
            row.querySelector('.attendance-status').value = record.status;
            row.querySelector('.attendance-time-in').value = record.timeIn;
            row.querySelector('.attendance-time-out').value = record.timeOut;
            row.querySelector('.attendance-remarks').value = record.remarks;
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

    // Take latest 50 records
    const latestRecords = records.slice(0, 50);

    let html = '';
    latestRecords.forEach(record => {
        const badgeClass =
            record.status === 'Present' ? 'success' :
                record.status === 'Leave' ? 'info' :
                    record.status === 'Half-day' ? 'warning' : 'danger';

        html += `
            <tr>
                <td>${formatDate(record.date)}</td>
                <td>${record.employeeName} (${record.employeeEmpId})</td>
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
    // Inward invoice amount calculation
    const inwardQty = document.getElementById('inwardQuantity');
    const inwardRate = document.getElementById('inwardRate');
    const inwardAmount = document.getElementById('inwardAmount');

    if (inwardQty && inwardRate && inwardAmount) {
        const calculateInward = () => {
            const qty = parseFloat(inwardQty.value) || 0;
            const rate = parseFloat(inwardRate.value) || 0;
            inwardAmount.value = (qty * rate).toFixed(2);
        };

        inwardQty.addEventListener('input', calculateInward);
        inwardRate.addEventListener('input', calculateInward);
    }
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
