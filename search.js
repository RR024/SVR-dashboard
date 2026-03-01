// =========================================
// SEARCH FUNCTIONALITY FOR ALL MODULES
// =========================================

// Debounce helper to prevent too many searches
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Search Inward Invoices
const searchInward = debounce(function (query) {
    const searchTerm = query.toLowerCase().trim();
    const tbody = document.getElementById('inwardTableBody');

    if (!searchTerm) {
        // If search is empty, reload all invoices
        loadInwardInvoices();
        return;
    }

    const invoices = getInwardInvoices();
    const filtered = invoices.filter(inv =>
        inv.invoiceNo.toLowerCase().includes(searchTerm) ||
        inv.customer.toLowerCase().includes(searchTerm) ||
        inv.material.toLowerCase().includes(searchTerm) ||
        inv.date.includes(searchTerm) ||
        inv.amount.toString().includes(searchTerm) ||
        (inv.notes && inv.notes.toLowerCase().includes(searchTerm))
    );

    displayFilteredInward(filtered);
}, 300);

// Display filtered inward invoices
function displayFilteredInward(invoices) {
    const tbody = document.getElementById('inwardTableBody');

    if (invoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center" style="color: var(--text-secondary);">
                    No invoices found matching your search.
                </td>
            </tr>
        `;
        return;
    }

    // Compute FY and monthly serial numbers from ALL invoices (so numbers are consistent)
    function getFYStartYear(dateStr) {
        const d = new Date(dateStr);
        const m = d.getMonth();
        return m >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    }
    const allInvoices = getInwardInvoices();
    const allSorted = [...allInvoices].sort((a, b) => {
        const da = a.date || '';
        const db = b.date || '';
        if (da !== db) return da.localeCompare(db);
        return a.invoiceNo.localeCompare(b.invoiceNo, undefined, { numeric: true });
    });
    const fySerialMap = {};
    const monthSerialMap = {};
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

    let html = '';
    invoices.forEach(inv => {
        const gstNo = inv.gstNo || '-';
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
                <td>${inv.material}</td>
                <td>₹${parseFloat(inv.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td><span class="badge badge-${inv.paymentStatus === 'Paid' ? 'success' : inv.paymentStatus === 'Partial' ? 'warning' : 'danger'}">${inv.paymentStatus || 'Pending'}</span></td>
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


// Search Outward Invoices
const searchOutward = debounce(function (query) {
    const searchTerm = query.toLowerCase().trim();

    if (!searchTerm) {
        loadOutwardInvoices();
        return;
    }

    const invoices = getOutwardInvoices();
    const filtered = invoices.filter(inv =>
        inv.invoiceNo.toLowerCase().includes(searchTerm) ||
        inv.buyerName.toLowerCase().includes(searchTerm) ||
        inv.gstin.toLowerCase().includes(searchTerm) ||
        inv.date.includes(searchTerm) ||
        inv.total.toString().includes(searchTerm) ||
        (inv.contact && inv.contact.includes(searchTerm))
    );

    displayFilteredOutward(filtered);
}, 300);

// Display filtered outward invoices
function displayFilteredOutward(invoices) {
    const tbody = document.getElementById('outwardTableBody');

    if (invoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center" style="color: var(--text-secondary);">
                    No invoices found matching your search.
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

// Search Customers
const searchCustomers = debounce(function (query) {
    const searchTerm = query.toLowerCase().trim();

    if (!searchTerm) {
        loadCustomers();
        return;
    }

    const customers = getCustomers();
    const filtered = customers.filter(cust => {
        const typeMatch = (cust.type || 'customer') === 'customer';
        const searchMatch = cust.companyName.toLowerCase().includes(searchTerm) ||
            cust.gstin.toLowerCase().includes(searchTerm) ||
            (cust.contactPerson && cust.contactPerson.toLowerCase().includes(searchTerm)) ||
            (cust.phone && cust.phone.includes(searchTerm)) ||
            (cust.city && cust.city.toLowerCase().includes(searchTerm)) ||
            (cust.email && cust.email.toLowerCase().includes(searchTerm));
        return typeMatch && searchMatch;
    });

    displayFilteredCustomers(filtered);
}, 300);

// Display filtered customers
function displayFilteredCustomers(customers) {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;

    if (customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="color: var(--text-secondary);">
                    No customers found matching your search.
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    customers.forEach(cust => {
        html += `
            <tr>
                <td>${cust.companyName}</td>
                <td>${cust.gstin}</td>
                <td>${cust.contactPerson || '-'}</td>
                <td>${cust.phone}</td>
                <td>${cust.city || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn edit" onclick="editCustomer('${cust.id}')" title="Edit">✏️</button>
                        <button class="icon-btn delete" onclick="deleteCustomer('${cust.id}')" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// Search Suppliers
const searchSuppliers = debounce(function (query) {
    const searchTerm = query.toLowerCase().trim();

    if (!searchTerm) {
        loadSuppliers();
        return;
    }

    const customers = getCustomers();
    const filtered = customers.filter(cust => {
        const typeMatch = (cust.type || 'customer') === 'supplier';
        const searchMatch = cust.companyName.toLowerCase().includes(searchTerm) ||
            cust.gstin.toLowerCase().includes(searchTerm) ||
            (cust.contactPerson && cust.contactPerson.toLowerCase().includes(searchTerm)) ||
            (cust.phone && cust.phone.includes(searchTerm)) ||
            (cust.city && cust.city.toLowerCase().includes(searchTerm)) ||
            (cust.email && cust.email.toLowerCase().includes(searchTerm));
        return typeMatch && searchMatch;
    });

    displayFilteredSuppliers(filtered);
}, 300);

// Display filtered suppliers
function displayFilteredSuppliers(suppliers) {
    const tbody = document.getElementById('suppliersTableBody');
    if (!tbody) return;

    if (suppliers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="color: var(--text-secondary);">
                    No suppliers found matching your search.
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    suppliers.forEach(cust => {
        html += `
            <tr>
                <td>${cust.companyName}</td>
                <td>${cust.gstin}</td>
                <td>${cust.contactPerson || '-'}</td>
                <td>${cust.phone}</td>
                <td>${cust.city || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn edit" onclick="editCustomer('${cust.id}')" title="Edit">✏️</button>
                        <button class="icon-btn delete" onclick="deleteCustomer('${cust.id}')" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// Search Employees
const searchEmployees = debounce(function (query) {
    const searchTerm = query.toLowerCase().trim();

    if (!searchTerm) {
        loadEmployees();
        return;
    }

    const employees = getEmployees();
    const filtered = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm) ||
        emp.empId.toLowerCase().includes(searchTerm) ||
        emp.department.toLowerCase().includes(searchTerm) ||
        emp.designation.toLowerCase().includes(searchTerm) ||
        (emp.contact && emp.contact.includes(searchTerm)) ||
        (emp.email && emp.email.toLowerCase().includes(searchTerm))
    );

    displayFilteredEmployees(filtered);
}, 300);

// Display filtered employees
function displayFilteredEmployees(employees) {
    const tbody = document.getElementById('employeesTableBody');

    if (employees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="color: var(--text-secondary);">
                    No employees found matching your search.
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
                <td>${emp.department}</td>
                <td>${emp.designation}</td>
                <td>${emp.contact}</td>
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

// Export functions
window.searchInward = searchInward;
window.searchOutward = searchOutward;
window.searchCustomers = searchCustomers;
window.searchSuppliers = searchSuppliers;
window.searchEmployees = searchEmployees;
