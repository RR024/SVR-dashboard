
// Show Outstanding Sales Detail Modal
function showOutstandingSalesModal() {
    console.log('Opening Outstanding Sales Modal');
    if (typeof getOutwardInvoices !== 'function') {
        console.error('getOutwardInvoices is not defined');
        alert('Error: Could not load invoice data.');
        return;
    }
    const outwardInvoices = getOutwardInvoices();

    // Filter unpaid/partial invoices
    // Check for 'Paid' status (case-insensitive just to be safe, though usually proper case)
    const outstandingInvoices = outwardInvoices.filter(inv => inv.paymentStatus !== 'Paid');

    // Group by customer
    const customerTotals = {};

    outstandingInvoices.forEach(inv => {
        const totalAmount = parseFloat(inv.total) || parseFloat(inv.totalAmount) || parseFloat(inv.grandTotal) || parseFloat(inv.amount) || 0;
        const amountPaid = parseFloat(inv.amountPaid) || 0;
        const pending = Math.max(0, totalAmount - amountPaid);

        if (pending > 0) {
            if (!customerTotals[inv.buyerName]) {
                customerTotals[inv.buyerName] = { amount: 0, count: 0 };
            }
            customerTotals[inv.buyerName].amount += pending;
            customerTotals[inv.buyerName].count++;
        }
    });

    populateSalesDetailsModal('Outstanding Sales', customerTotals);
}

// Show Current Month Sales Detail Modal
function showCurrentMonthSalesModal() {
    console.log('Opening Current Month Sales Modal');
    if (typeof getOutwardInvoices !== 'function') {
        console.error('getOutwardInvoices is not defined');
        alert('Error: Could not load invoice data.');
        return;
    }
    const outwardInvoices = getOutwardInvoices();
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Filter current month invoices
    const currentMonthInvoices = outwardInvoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate.getFullYear() === currentYear && invDate.getMonth() === currentMonth;
    });

    // Group by customer
    const customerTotals = {};

    currentMonthInvoices.forEach(inv => {
        const amount = parseFloat(inv.total) || parseFloat(inv.totalAmount) || parseFloat(inv.grandTotal) || parseFloat(inv.amount) || 0;

        if (!customerTotals[inv.buyerName]) {
            customerTotals[inv.buyerName] = { amount: 0, count: 0 };
        }
        customerTotals[inv.buyerName].amount += amount;
        customerTotals[inv.buyerName].count++;
    });

    populateSalesDetailsModal('Current Month Sales', customerTotals);
}

// Helper to populate and show the modal
function populateSalesDetailsModal(title, customerTotals) {
    const modal = document.getElementById('salesDetailsModal');
    if (!modal) {
        console.error('salesDetailsModal not found in DOM');
        return;
    }
    const titleEl = document.getElementById('salesDetailsModalTitle');
    const tbody = document.getElementById('salesDetailsTableBody');
    const tfoot = document.getElementById('salesDetailsTableFoot');

    titleEl.textContent = title;
    tbody.innerHTML = '';

    // Convert object to array and sort by amount descending
    const sortedCustomers = Object.entries(customerTotals)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.amount - a.amount);

    let totalAmount = 0;

    if (sortedCustomers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center" style="padding: 1rem;">No data available</td></tr>';
    } else {
        sortedCustomers.forEach(customer => {
            totalAmount += customer.amount;
            tbody.innerHTML += `
                <tr>
                    <td>${customer.name}</td>
                    <td style="text-align: right;">₹${customer.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style="text-align: center;">${customer.count}</td>
                </tr>
            `;
        });
    }

    tfoot.innerHTML = `
        <tr>
            <td style="text-align: right;">Total</td>
            <td style="text-align: right;">₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td></td>
        </tr>
    `;

    modal.classList.add('active');
}

// Close Sales Details Modal
function closeSalesDetailsModal() {
    const modal = document.getElementById('salesDetailsModal');
    if (modal) {
        modal.classList.remove('active');
    }
}
