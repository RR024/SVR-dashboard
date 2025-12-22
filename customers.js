// =========================================
// CUSTOMER MANAGEMENT MODULE
// =========================================

// Get customers from storage
function getCustomers() {
    return loadFromStorage('customers') || [];
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

    const productHtml = `
        <div class="customer-product-item" data-product-id="${productId}" style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; position: relative;">
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
        </div>
    `;

    container.insertAdjacentHTML('beforeend', productHtml);
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

    productItems.forEach(item => {
        const productId = item.getAttribute('data-product-id');
        const description = item.querySelector('.customer-product-description').value.trim();
        const hsn = item.querySelector('.customer-product-hsn').value.trim();
        const poQty = item.querySelector('.customer-product-po').value;
        const price = item.querySelector('.customer-product-price').value;

        // Only add if description is filled
        if (description) {
            products.push({
                id: productId,
                description: description,
                hsn: hsn || '',
                poQty: poQty ? parseFloat(poQty) : 0,
                price: price ? parseFloat(price) : 0
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

    let html = '<option value="">-- Select Customer --</option>';
    customers.forEach(customer => {
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

    let html = '<option value="">-- Select Customer --</option>';
    customers.forEach(customer => {
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
        // Clear the customer name field when no customer selected
        document.getElementById('inwardCustomer').value = '';
        return;
    }

    const customers = getCustomers();
    const customer = customers.find(c => c.id === customerId);

    if (customer) {
        // Auto-fill the customer name
        document.getElementById('inwardCustomer').value = customer.companyName;
    }
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
