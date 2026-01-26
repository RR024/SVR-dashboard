// ===================================
// PRODUCT SALES DETAILS TAB FUNCTIONS
// ===================================

// Switch between All Invoices and Product Details tabs
function switchSalesTab(tab) {
    const allInvoicesTab = document.getElementById('allInvoicesTab');
    const productDetailsTab = document.getElementById('productDetailsTab');
    const allInvoicesContent = document.getElementById('allInvoicesContent');
    const productDetailsContent = document.getElementById('productDetailsContent');

    // Remove active from all tabs
    allInvoicesTab.classList.remove('active');
    productDetailsTab.classList.remove('active');

    // Hide all content
    allInvoicesContent.style.display = 'none';
    productDetailsContent.style.display = 'none';

    if (tab === 'all') {
        allInvoicesTab.classList.add('active');
        allInvoicesContent.style.display = 'block';
    } else if (tab === 'products') {
        productDetailsTab.classList.add('active');
        productDetailsContent.style.display = 'block';
        // Load product details when switching to this tab
        loadProductSalesDetails();
        displayProductSalesSummary();
    }
}

// Calculate comprehensive product sales summary (all time, sorted by amount)
function displayProductSalesSummary() {
    const invoices = getOutwardInvoices();
    const productSummary = {};

    // Get registered customers from Customer module
    const registeredCustomers = getCustomers();
    const registeredCustomerNames = new Set(registeredCustomers.map(c => c.companyName));

    // Aggregate all product sales across all invoices
    invoices.forEach(inv => {
        if (inv.products && Array.isArray(inv.products)) {
            inv.products.forEach(product => {
                const desc = product.description;
                // Skip empty or placeholder products
                if (!desc || desc.trim() === '' || desc === '-- Select Product --') {
                    return;
                }

                const qty = parseFloat(product.quantity) || 0;
                const value = parseFloat(product.value) || 0;
                const customer = inv.buyerName || '';

                if (!productSummary[desc]) {
                    productSummary[desc] = {
                        quantity: 0,
                        total: 0,
                        customers: new Set()
                    };
                }

                productSummary[desc].quantity += qty;
                productSummary[desc].total += value;

                // Add customer if name exists on invoice
                if (customer) {
                    productSummary[desc].customers.add(customer);
                }
            });
        }
    });

    // Convert to array and sort by total amount (high to low)
    const sortedProducts = Object.keys(productSummary).map(productName => ({
        name: productName,
        quantity: productSummary[productName].quantity,
        total: productSummary[productName].total,
        customers: Array.from(productSummary[productName].customers).join(', ') || 'No registered customers'
    })).sort((a, b) => b.total - a.total);

    // Display in table
    const tbody = document.getElementById('productSummaryTableBody');

    if (sortedProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center" style="color: var(--text-secondary);">
                    No product sales data yet.
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    sortedProducts.forEach((product, index) => {
        // Add highlighting for top 3 products
        let rowStyle = '';
        if (index === 0) {
            rowStyle = 'background: rgba(255, 215, 0, 0.1); font-weight: 600;'; // Gold tint for #1
        } else if (index === 1) {
            rowStyle = 'background: rgba(192, 192, 192, 0.1); font-weight: 500;'; // Silver tint for #2
        } else if (index === 2) {
            rowStyle = 'background: rgba(205, 127, 50, 0.1);'; // Bronze tint for #3
        }

        html += `
            <tr style="${rowStyle}">
                <td style="text-align: center; font-weight: 600; color: ${index < 3 ? 'var(--primary)' : 'var(--text-secondary)'};">
                    ${index + 1}
                </td>
                <td style="font-weight: 500;">${product.name}</td>
                <td style="font-size: 0.9rem; color: var(--text-secondary);">${product.customers}</td>
                <td>${product.quantity.toLocaleString('en-IN')}</td>
                <td style="font-weight: 600; color: var(--success);">
                    ₹${product.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Load and display product sales details
function loadProductSalesDetails() {
    const invoices = getOutwardInvoices();
    const tbody = document.getElementById('productSalesTableBody');

    // Flatten invoices to product rows
    const productRows = [];

    invoices.forEach(inv => {
        if (inv.products && Array.isArray(inv.products)) {
            inv.products.forEach(product => {
                const desc = product.description;
                // Skip empty or placeholder products
                if (!desc || desc.trim() === '' || desc === '-- Select Product --') {
                    return;
                }

                productRows.push({
                    invoiceNo: inv.invoiceNo || '',
                    date: inv.date || '',
                    customerName: inv.buyerName || '',
                    productName: desc,
                    quantity: parseFloat(product.quantity) || 0,
                    unitPrice: parseFloat(product.rate) || 0,
                    totalValue: parseFloat(product.value) || 0
                });
            });
        }
    });

    if (productRows.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="color: var(--text-secondary);">
                    No product sales data yet.
                </td>
            </tr>
        `;

        // Clear filter dropdowns
        const customerSelect = document.getElementById('product-filter-customer-select');
        const productSelect = document.getElementById('product-filter-product-select');
        if (customerSelect) customerSelect.innerHTML = '<option value="">All Customers</option>';
        if (productSelect) productSelect.innerHTML = '<option value="">All Products</option>';
        return;
    }

    // Sort by date descending
    productRows.sort((a, b) => b.date.localeCompare(a.date));

    // Populate filter dropdowns
    populateProductSalesFilters(productRows);

    // Display all rows initially
    displayProductRows(productRows);
}

// Populate filter dropdowns with unique values
function populateProductSalesFilters(productRows) {
    // Get unique customers
    const customers = [...new Set(productRows.map(row => row.customerName))].sort();
    const customerSelect = document.getElementById('product-filter-customer-select');
    if (customerSelect) {
        customerSelect.innerHTML = '<option value="">All Customers</option>';
        customers.forEach(customer => {
            customerSelect.innerHTML += `<option value="${customer}">${customer}</option>`;
        });
    }

    // Get unique products
    const products = [...new Set(productRows.map(row => row.productName))].sort();
    const productSelect = document.getElementById('product-filter-product-select');
    if (productSelect) {
        productSelect.innerHTML = '<option value="">All Products</option>';
        products.forEach(product => {
            productSelect.innerHTML += `<option value="${product}">${product}</option>`;
        });
    }
}

// Display product rows in table
function displayProductRows(rows) {
    const tbody = document.getElementById('productSalesTableBody');

    if (rows.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="color: var(--text-secondary);">
                    No matching products found.
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    rows.forEach(row => {
        html += `
            <tr>
                <td>${row.invoiceNo}</td>
                <td>${formatDate(row.date)}</td>
                <td>${row.customerName}</td>
                <td>${row.productName}</td>
                <td>${row.quantity.toLocaleString('en-IN')}</td>
                <td>₹${row.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td>₹${row.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Toggle column filter dropdown
function toggleProductColumnFilter(event, columnName) {
    event.stopPropagation();

    const dropdown = document.getElementById(`product-filter-${columnName}`);

    // Close all other dropdowns
    document.querySelectorAll('.column-filter-dropdown').forEach(d => {
        if (d !== dropdown) {
            d.style.display = 'none';
        }
    });

    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

// Close dropdowns when clicking outside
document.addEventListener('click', function (event) {
    if (!event.target.closest('.column-filter-btn') && !event.target.closest('.column-filter-dropdown')) {
        document.querySelectorAll('.column-filter-dropdown').forEach(d => {
            d.style.display = 'none';
        });
    }
});

// Apply product sales filters
function applyProductSalesFilter() {
    const invoices = getOutwardInvoices();

    // Get all filter values
    const invoiceNoSearch = document.querySelector('#product-filter-invoiceNo .filter-input')?.value.toLowerCase() || '';
    const dateFrom = document.getElementById('product-filter-date-from')?.value || '';
    const dateTo = document.getElementById('product-filter-date-to')?.value || '';
    const customerFilter = document.getElementById('product-filter-customer-select')?.value || '';
    const productFilter = document.getElementById('product-filter-product-select')?.value || '';
    const qtyMin = parseFloat(document.getElementById('product-filter-quantity-min')?.value) || null;
    const qtyMax = parseFloat(document.getElementById('product-filter-quantity-max')?.value) || null;
    const priceMin = parseFloat(document.getElementById('product-filter-price-min')?.value) || null;
    const priceMax = parseFloat(document.getElementById('product-filter-price-max')?.value) || null;
    const totalMin = parseFloat(document.getElementById('product-filter-total-min')?.value) || null;
    const totalMax = parseFloat(document.getElementById('product-filter-total-max')?.value) || null;

    // Flatten invoices to product rows
    const productRows = [];

    invoices.forEach(inv => {
        if (inv.products && Array.isArray(inv.products)) {
            inv.products.forEach(product => {
                const desc = product.description;
                // Skip empty or placeholder products
                if (!desc || desc.trim() === '' || desc === '-- Select Product --') {
                    return;
                }

                productRows.push({
                    invoiceNo: inv.invoiceNo || '',
                    date: inv.date || '',
                    customerName: inv.buyerName || '',
                    productName: desc,
                    quantity: parseFloat(product.quantity) || 0,
                    unitPrice: parseFloat(product.rate) || 0,
                    totalValue: parseFloat(product.value) || 0
                });
            });
        }
    });

    // Apply filters
    let filteredRows = productRows.filter(row => {
        // Invoice number filter
        const matchesInvoice = invoiceNoSearch === '' || row.invoiceNo.toLowerCase().includes(invoiceNoSearch);

        // Date range filter
        let matchesDate = true;
        if (dateFrom && row.date < dateFrom) matchesDate = false;
        if (dateTo && row.date > dateTo) matchesDate = false;

        // Customer filter
        const matchesCustomer = customerFilter === '' || row.customerName === customerFilter;

        // Product filter
        const matchesProduct = productFilter === '' || row.productName === productFilter;

        // Quantity range filter
        let matchesQuantity = true;
        if (qtyMin !== null && row.quantity < qtyMin) matchesQuantity = false;
        if (qtyMax !== null && row.quantity > qtyMax) matchesQuantity = false;

        // Price range filter
        let matchesPrice = true;
        if (priceMin !== null && row.unitPrice < priceMin) matchesPrice = false;
        if (priceMax !== null && row.unitPrice > priceMax) matchesPrice = false;

        // Total range filter
        let matchesTotal = true;
        if (totalMin !== null && row.totalValue < totalMin) matchesTotal = false;
        if (totalMax !== null && row.totalValue > totalMax) matchesTotal = false;

        return matchesInvoice && matchesDate && matchesCustomer && matchesProduct &&
            matchesQuantity && matchesPrice && matchesTotal;
    });

    // Sort by date descending
    filteredRows.sort((a, b) => b.date.localeCompare(a.date));

    displayProductRows(filteredRows);
}
