// =========================================
// CUSTOMER MANAGEMENT MODULE
// =========================================

// Get customers from storage (with deduplication)
function getCustomers() {
    const customers = loadFromStorage('customers') || [];

    // Remove duplicates based on customer ID and company name, clean up storage if duplicates found
    const seenIds = new Set();
    const seenNames = new Set();
    const uniqueCustomers = customers.filter(customer => {
        // Check for duplicate IDs
        if (seenIds.has(customer.id)) return false;
        seenIds.add(customer.id);

        // Check for duplicate company names (case-insensitive)
        const normalizedName = (customer.companyName || '').toLowerCase().trim();
        if (seenNames.has(normalizedName)) return false;
        seenNames.add(normalizedName);

        return true;
    });

    // If duplicates were found, clean up the storage
    if (uniqueCustomers.length < customers.length) {
        saveToStorage('customers', uniqueCustomers);
    }

    return uniqueCustomers;
}

// Load customers into table
function loadCustomers() {
    const customers = getCustomers();
    const tbody = document.getElementById('customersTableBody');

    if (!tbody) return;

    if (customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="color: var(--text-secondary);">
                    No customers yet. Click "Add Customer" to create one.
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    customers.forEach(customer => {
        html += `
            <tr>
                <td><strong>${customer.companyName}</strong></td>
                <td>${customer.gstin}</td>
                <td>${customer.contactPerson || '-'}</td>
                <td>${customer.phone}</td>
                <td>${customer.city || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn edit" onclick="editCustomer('${customer.id}')" title="Edit">✏️</button>
                        <button class="icon-btn delete" onclick="deleteCustomer('${customer.id}')" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Open customer modal
function openCustomerModal(customerId = null) {
    const modal = document.getElementById('customerModal');
    const title = document.getElementById('customerModalTitle');
    const form = document.getElementById('customerForm');

    if (!modal) return;

    form.reset();
    document.getElementById('customerId').value = '';

    // Clear product list
    const productsList = document.getElementById('customerProductsList');
    if (productsList) {
        productsList.innerHTML = '';
    }

    // Clear monthly PO list
    const monthlyPOList = document.getElementById('customerMonthlyPOList');
    if (monthlyPOList) {
        monthlyPOList.innerHTML = '';
    }

    if (customerId) {
        const customers = getCustomers();
        const customer = customers.find(c => c.id === customerId);

        if (customer) {
            title.textContent = 'Edit Customer';
            document.getElementById('customerId').value = customer.id;
            document.getElementById('customerCompanyName').value = customer.companyName;
            document.getElementById('customerGSTIN').value = customer.gstin;
            document.getElementById('customerAddress').value = customer.address;
            document.getElementById('customerContactPerson').value = customer.contactPerson || '';
            document.getElementById('customerPhone').value = customer.phone;
            document.getElementById('customerEmail').value = customer.email || '';
            document.getElementById('customerCity').value = customer.city || '';
            document.getElementById('customerNotes').value = customer.notes || '';

            // Load customer products
            loadCustomerProducts(customerId);
            // Load monthly PO numbers
            loadMonthlyPONumbers(customerId);
        }
    } else {
        title.textContent = 'Add Customer';
    }

    modal.classList.add('active');
}

// Close customer modal
function closeCustomerModal() {
    const modal = document.getElementById('customerModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Save customer
function saveCustomer() {
    const id = document.getElementById('customerId').value;
    const companyName = document.getElementById('customerCompanyName').value.trim();
    const gstin = document.getElementById('customerGSTIN').value.trim();
    const address = document.getElementById('customerAddress').value.trim();
    const contactPerson = document.getElementById('customerContactPerson').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const email = document.getElementById('customerEmail').value.trim();
    const city = document.getElementById('customerCity').value.trim();
    const notes = document.getElementById('customerNotes').value.trim();

    if (!companyName || !gstin || !address || !phone) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    // Check for duplicate GSTIN (only for new customers or if GSTIN changed)
    let customers = getCustomers();
    const existingCustomer = customers.find(c =>
        c.gstin.toUpperCase() === gstin.toUpperCase() && c.id !== id
    );

    if (existingCustomer) {
        const confirmDuplicate = confirm(
            `⚠️ A customer with this GSTIN already exists!\n\n` +
            `Existing: ${existingCustomer.companyName}\n` +
            `GSTIN: ${existingCustomer.gstin}\n\n` +
            `Do you still want to save this customer?`
        );
        if (!confirmDuplicate) {
            return;
        }
    }

    // Get products from form
    const products = getCustomerProductsFromForm();

    const customer = {
        id: id || Date.now().toString(),
        companyName,
        gstin,
        address,
        contactPerson,
        phone,
        email,
        city,
        notes,
        products: products, // Add products array
        monthlyPONumbers: getMonthlyPONumbersFromForm(), // Add monthly PO numbers array
        createdAt: id ? undefined : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (id) {
        // Update existing
        customers = customers.map(c => c.id === id ? { ...c, ...customer } : c);
        showToast('Customer updated successfully', 'success');
    } else {
        // Add new
        customers.push(customer);
        showToast('Customer added successfully', 'success');
    }

    saveToStorage('customers', customers);
    loadCustomers();
    closeCustomerModal();

    // Reload customer dropdown if on outward invoice page
    loadCustomerDropdown();
}

// Edit customer
function editCustomer(customerId) {
    openCustomerModal(customerId);
}

// Delete customer
function deleteCustomer(customerId) {
    if (!confirm('Are you sure you want to delete this customer?')) {
        return;
    }

    let customers = getCustomers();
    customers = customers.filter(c => c.id !== customerId);

    saveToStorage('customers', customers);
    loadCustomers();
    showToast('Customer deleted successfully', 'success');

    // Reload customer dropdown if on outward invoice page
    loadCustomerDropdown();
}

// =========================================
// CUSTOMER PRODUCT CATALOG MANAGEMENT
// =========================================

// Add product row to customer modal
function addCustomerProduct(productData = null) {
    const container = document.getElementById('customerProductsList');
    if (!container) return;

    const productId = productData?.id || 'prod_' + Date.now();

    // Check if product is outdated (from previous month)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const lastUpdated = productData?.lastUpdated || '';
    const isOutdated = lastUpdated && lastUpdated < currentMonth;

    // Format last updated display
    let lastUpdatedBadge = '';
    if (lastUpdated) {
        const badgeColor = isOutdated ? 'var(--warning)' : 'var(--success)';
        const badgeText = isOutdated ? `⚠️ Last updated: ${formatProductMonth(lastUpdated)}` : `✓ Current (${formatProductMonth(lastUpdated)})`;
        lastUpdatedBadge = `<div style="font-size: 0.75rem; color: ${badgeColor}; margin-top: 0.25rem;">${badgeText}</div>`;
    }

    const productHtml = `
        <div class="customer-product-item" data-product-id="${productId}" style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; position: relative;${isOutdated ? ' border-left: 3px solid var(--warning);' : ''}">
            <button type="button" class="icon-btn delete" onclick="removeCustomerProduct('${productId}')" 
                    style="position: absolute; top: 0.5rem; right: 0.5rem;" title="Remove Product">×</button>
            
            
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 0.75rem;">
                <div class="form-group" style="margin: 0;">
                    <label class="form-label" style="font-size: 0.875rem;">Product Description</label>
                    <input type="text" class="form-control customer-product-description" 
                           placeholder="e.g., Washer Plain, 5036" value="${productData?.description || ''}" required>
                </div>
                
                <div class="form-group" style="margin: 0;">
                    <label class="form-label" style="font-size: 0.875rem;">HSN Code</label>
                    <input type="text" class="form-control customer-product-hsn" 
                           placeholder="e.g., 87082900" value="${productData?.hsn || ''}">
                </div>
                
                <div class="form-group" style="margin: 0;">
                    <label class="form-label" style="font-size: 0.875rem;">PO Qty/Month</label>
                    <input type="number" class="form-control customer-product-po" 
                           placeholder="e.g., 50000" value="${productData?.poQty || ''}" min="0" 
                           title="Purchase Order quantity per month">
                </div>
                
                <div class="form-group" style="margin: 0;">
                    <label class="form-label" style="font-size: 0.875rem;">Price (₹)</label>
                    <input type="number" class="form-control customer-product-price" 
                           placeholder="e.g., 15.00" value="${productData?.price || ''}" step="0.01" min="0" 
                           title="Fixed price per unit">
                </div>
            </div>
            ${lastUpdatedBadge}
        </div>
    `;

    container.insertAdjacentHTML('beforeend', productHtml);
}

// Helper function to format month for display in customer product form
function formatProductMonth(monthStr) {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}

// Remove product from customer modal
function removeCustomerProduct(productId) {
    const productItem = document.querySelector(`.customer-product-item[data-product-id="${productId}"]`);
    if (productItem) {
        productItem.remove();
    }
}

// Load customer products into the modal
function loadCustomerProducts(customerId) {
    const container = document.getElementById('customerProductsList');
    if (!container) return;

    // Clear existing products
    container.innerHTML = '';

    if (!customerId) return;

    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);

    if (customer && customer.products && customer.products.length > 0) {
        customer.products.forEach(product => {
            addCustomerProduct(product);
        });
    }
}

// Get products from customer product form
function getCustomerProductsFromForm() {
    const productItems = document.querySelectorAll('.customer-product-item');
    const products = [];
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Get existing products to compare for changes
    const customerId = document.getElementById('customerId').value;
    const existingProducts = customerId ? getCustomerProducts(customerId) : [];

    productItems.forEach(item => {
        const productId = item.getAttribute('data-product-id');
        const description = item.querySelector('.customer-product-description').value.trim();
        const hsn = item.querySelector('.customer-product-hsn').value.trim();
        const poQty = item.querySelector('.customer-product-po').value;
        const price = item.querySelector('.customer-product-price').value;

        // Only add if description is filled
        if (description) {
            // Check if this is an existing product
            const existingProduct = existingProducts.find(p => p.id === productId);

            // Determine lastUpdated: update if price or PO changed, otherwise keep old value
            let lastUpdated = currentMonth; // Default to current month for new products

            if (existingProduct) {
                const newPoQty = poQty ? parseFloat(poQty) : 0;
                const newPrice = price ? parseFloat(price) : 0;

                // If price or PO qty changed, update lastUpdated to current month
                if (existingProduct.price !== newPrice || existingProduct.poQty !== newPoQty) {
                    lastUpdated = currentMonth;
                } else {
                    // Keep existing lastUpdated if no changes
                    lastUpdated = existingProduct.lastUpdated || currentMonth;
                }
            }

            products.push({
                id: productId,
                description: description,
                hsn: hsn || '',
                poQty: poQty ? parseFloat(poQty) : 0,
                price: price ? parseFloat(price) : 0,
                lastUpdated: lastUpdated
            });
        }
    });

    return products;
}

// Get customer products by customer ID
function getCustomerProducts(customerId) {
    if (!customerId) return [];

    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);

    return customer && customer.products ? customer.products : [];
}

// Load customer dropdown (for outward invoice)
function loadCustomerDropdown() {
    const dropdown = document.getElementById('customerDropdown');
    if (!dropdown) return;

    const customers = getCustomers();

    // Remove duplicates based on customer ID and company name
    const seenNames = new Set();
    const uniqueCustomers = customers.filter((customer, index, self) => {
        // First check for duplicate IDs
        const isUniqueId = index === self.findIndex(c => c.id === customer.id);
        if (!isUniqueId) return false;

        // Then check for duplicate company names (case-insensitive)
        const normalizedName = (customer.companyName || '').toLowerCase().trim();
        if (seenNames.has(normalizedName)) return false;
        seenNames.add(normalizedName);
        return true;
    });

    let html = '<option value="">-- Select Customer --</option>';
    uniqueCustomers.forEach(customer => {
        html += `<option value="${customer.id}">${customer.companyName}</option>`;
    });

    dropdown.innerHTML = html;
}

// Fill customer details in outward invoice form
function fillCustomerDetails() {
    const dropdown = document.getElementById('customerDropdown');
    if (!dropdown) return;

    const customerId = dropdown.value;

    if (!customerId) {
        // Clear fields
        document.getElementById('outwardBuyerName').value = '';
        document.getElementById('outwardBuyerAddress').value = '';
        document.getElementById('outwardGSTIN').value = '';
        document.getElementById('outwardContact').value = '';
        document.getElementById('outwardPONo').value = '';

        // Clear existing product rows when customer is deselected
        document.getElementById('productItems').innerHTML = '';
        return;
    }

    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);

    if (customer) {
        document.getElementById('outwardBuyerName').value = customer.companyName;
        document.getElementById('outwardBuyerAddress').value = customer.address;
        document.getElementById('outwardGSTIN').value = customer.gstin;
        document.getElementById('outwardContact').value = customer.phone;

        // Auto-populate monthly PO number for current month
        const currentMonthPO = getCurrentMonthPONumber(customerId);
        document.getElementById('outwardPONo').value = currentMonthPO;

        // Reload existing product dropdowns with new customer's products
        updateProductDropdowns(customerId);
    }
}

// Update all product dropdowns with customer products
function updateProductDropdowns(customerId) {
    const customerProducts = getCustomerProducts(customerId);
    const productSelects = document.querySelectorAll('.product-description');

    productSelects.forEach(select => {
        const currentValue = select.value;

        // Rebuild options
        let options = '<option value="">-- Select Product --</option>';
        customerProducts.forEach(product => {
            const selected = (currentValue === product.id) ? 'selected' : '';
            options += `<option value="${product.id}" ${selected}>${product.description}</option>`;
        });
        // Add "+ Add New Product" option at the end
        options += '<option value="__ADD_NEW__" style="color: var(--primary); font-weight: 600;">➕ Add New Product...</option>';

        select.innerHTML = options;
    });
}

// =========================================
// PAYMENT TRACKING ENHANCEMENTS
// =========================================

// Calculate days from invoice date
function calculateDaysFromInvoice(invoiceDate, paymentTermsDays = 45) {
    const invoiceDateObj = new Date(invoiceDate);
    const today = new Date();
    const daysPassed = Math.floor((today - invoiceDateObj) / (1000 * 60 * 60 * 24));
    const daysLeft = paymentTermsDays - daysPassed;

    return {
        daysPassed,
        daysLeft,
        isOverdue: daysLeft < 0,
        overdueBy: daysLeft < 0 ? Math.abs(daysLeft) : 0
    };
}

// Format payment status with days info
function formatPaymentStatus(invoice) {
    const paymentTerms = invoice.paymentTerms ? parseInt(invoice.paymentTerms) : 45;
    const daysInfo = calculateDaysFromInvoice(invoice.date, paymentTerms);

    let statusText = '';
    let statusClass = '';

    if (invoice.paymentStatus === 'Paid') {
        return '<span class="badge badge-success">Paid</span>';
    }

    if (daysInfo.isOverdue) {
        statusText = `Overdue by ${daysInfo.overdueBy} days`;
        statusClass = 'badge-danger';
    } else {
        statusText = `${daysInfo.daysLeft} days left`;
        statusClass = daysInfo.daysLeft <= 7 ? 'badge-warning' : 'badge-info';
    }

    return `<span class="badge ${statusClass}">${statusText}</span>`;
}

// =========================================
// INWARD INVOICE CUSTOMER AUTO-FILL
// =========================================

// Load customer dropdown for inward invoice
function loadInwardCustomerDropdown() {
    const dropdown = document.getElementById('inwardCustomerDropdown');
    if (!dropdown) return;

    const customers = getCustomers();

    // Remove duplicates based on customer ID and company name
    const seenNames = new Set();
    const uniqueCustomers = customers.filter((customer, index, self) => {
        // First check for duplicate IDs
        const isUniqueId = index === self.findIndex(c => c.id === customer.id);
        if (!isUniqueId) return false;

        // Then check for duplicate company names (case-insensitive)
        const normalizedName = (customer.companyName || '').toLowerCase().trim();
        if (seenNames.has(normalizedName)) return false;
        seenNames.add(normalizedName);
        return true;
    });

    let html = '<option value="">-- Select Customer --</option>';
    uniqueCustomers.forEach(customer => {
        html += `<option value="${customer.id}">${customer.companyName}</option>`;
    });

    dropdown.innerHTML = html;
}

// Fill customer details in inward invoice form
function fillInwardCustomerDetails() {
    const dropdown = document.getElementById('inwardCustomerDropdown');
    if (!dropdown) return;

    const customerId = dropdown.value;

    if (!customerId) {
        // Clear fields when no customer selected
        document.getElementById('inwardCustomer').value = '';
        document.getElementById('inwardGSTNo').value = '';

        // Clear existing product rows when customer is deselected
        document.getElementById('inwardProductItems').innerHTML = '';
        return;
    }

    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);

    if (customer) {
        // Auto-fill the customer name
        document.getElementById('inwardCustomer').value = customer.companyName;
        // Auto-fill the GST number from customer record
        document.getElementById('inwardGSTNo').value = customer.gstin || '';

        // Reload existing product dropdowns with new customer's products
        updateInwardMaterialDropdowns(customerId);
    }
}

// Update all material dropdowns in inward invoice with customer products
function updateInwardMaterialDropdowns(customerId) {
    const customerProducts = getCustomerProducts(customerId);
    const materialSelects = document.querySelectorAll('.inward-product-material-select');

    materialSelects.forEach(select => {
        const currentValue = select.value;

        // Rebuild options
        let options = '<option value="">-- Select Product --</option>';
        customerProducts.forEach(product => {
            const selected = (currentValue === product.id) ? 'selected' : '';
            options += `<option value="${product.id}" ${selected}>${product.description}</option>`;
        });

        select.innerHTML = options;
    });
}

// =========================================
// MONTHLY PO NUMBER MANAGEMENT
// =========================================

// Add monthly PO number row to customer modal
function addMonthlyPONumber(poData = null) {
    const container = document.getElementById('customerMonthlyPOList');
    if (!container) return;

    const poId = poData?.id || 'po_' + Date.now();
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    const poHtml = `
        <div class="monthly-po-item" data-po-id="${poId}" style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; position: relative;">
            <button type="button" class="icon-btn delete" onclick="removeMonthlyPONumber('${poId}')" 
                    style="position: absolute; top: 0.5rem; right: 0.5rem;" title="Remove PO Number">×</button>
            
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 0.75rem;">
                <div class="form-group" style="margin: 0;">
                    <label class="form-label" style="font-size: 0.875rem;">Month</label>
                    <input type="month" class="form-control monthly-po-month" 
                           value="${poData?.month || currentMonth}" required>
                </div>
                
                <div class="form-group" style="margin: 0;">
                    <label class="form-label" style="font-size: 0.875rem;">PO Number</label>
                    <input type="text" class="form-control monthly-po-number" 
                           placeholder="e.g., PO/FEB/2026/001" value="${poData?.poNumber || ''}" required>
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', poHtml);
}

// Remove monthly PO number from customer modal
function removeMonthlyPONumber(poId) {
    const poItem = document.querySelector(`.monthly-po-item[data-po-id="${poId}"]`);
    if (poItem) {
        poItem.remove();
    }
}

// Load monthly PO numbers into the modal
function loadMonthlyPONumbers(customerId) {
    const container = document.getElementById('customerMonthlyPOList');
    if (!container) return;

    // Clear existing PO numbers
    container.innerHTML = '';

    if (!customerId) return;

    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);

    if (customer && customer.monthlyPONumbers && customer.monthlyPONumbers.length > 0) {
        customer.monthlyPONumbers.forEach(po => {
            addMonthlyPONumber(po);
        });
    }
}

// Get monthly PO numbers from customer form
function getMonthlyPONumbersFromForm() {
    const poItems = document.querySelectorAll('.monthly-po-item');
    const poNumbers = [];

    poItems.forEach(item => {
        const poId = item.getAttribute('data-po-id');
        const month = item.querySelector('.monthly-po-month').value;
        const poNumber = item.querySelector('.monthly-po-number').value.trim();

        // Only add if both month and PO number are filled
        if (month && poNumber) {
            poNumbers.push({
                id: poId,
                month: month,
                poNumber: poNumber
            });
        }
    });

    return poNumbers;
}

// Get PO number for current month for a specific customer
function getCurrentMonthPONumber(customerId) {
    if (!customerId) return '';

    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);

    if (!customer || !customer.monthlyPONumbers || customer.monthlyPONumbers.length === 0) {
        return '';
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const currentPO = customer.monthlyPONumbers.find(po => po.month === currentMonth);

    return currentPO ? currentPO.poNumber : '';
}

// Export customer functions to global scope
window.getCustomers = getCustomers;
window.loadCustomers = loadCustomers;
window.openCustomerModal = openCustomerModal;
window.closeCustomerModal = closeCustomerModal;
window.saveCustomer = saveCustomer;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;
window.loadCustomerDropdown = loadCustomerDropdown;
window.fillCustomerDetails = fillCustomerDetails;
window.loadInwardCustomerDropdown = loadInwardCustomerDropdown;
window.fillInwardCustomerDetails = fillInwardCustomerDetails;
window.calculateDaysFromInvoice = calculateDaysFromInvoice;
window.formatPaymentStatus = formatPaymentStatus;

// Export customer product functions
window.addCustomerProduct = addCustomerProduct;
window.removeCustomerProduct = removeCustomerProduct;
window.loadCustomerProducts = loadCustomerProducts;
window.getCustomerProducts = getCustomerProducts;
window.getCustomerProductsFromForm = getCustomerProductsFromForm;
window.updateProductDropdowns = updateProductDropdowns;
window.updateInwardMaterialDropdowns = updateInwardMaterialDropdowns;

// Export monthly PO number functions
window.addMonthlyPONumber = addMonthlyPONumber;
window.removeMonthlyPONumber = removeMonthlyPONumber;
window.loadMonthlyPONumbers = loadMonthlyPONumbers;
window.getMonthlyPONumbersFromForm = getMonthlyPONumbersFromForm;
window.getCurrentMonthPONumber = getCurrentMonthPONumber;
