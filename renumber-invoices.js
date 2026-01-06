// ===================================
// Invoice Renumbering Script
// Renumbers all FY 25-26 sales invoices to start from 301
// ===================================

function renumberFY2526Invoices() {
    console.log('Starting invoice renumbering for FY 25-26...');

    // Get all outward invoices
    const invoices = JSON.parse(localStorage.getItem('outwardInvoices') || '[]');

    // Filter invoices for FY 25-26
    const fy2526Invoices = invoices.filter(inv => {
        if (!inv.invoiceNo) return false;
        const parts = inv.invoiceNo.split('/');
        return parts.length === 3 && parts[2] === '25-26';
    });

    console.log(`Found ${fy2526Invoices.length} invoices in FY 25-26`);

    // Sort by date to maintain chronological order
    fy2526Invoices.sort((a, b) => {
        const dateA = new Date(a.date || a.invoiceDate);
        const dateB = new Date(b.date || b.invoiceDate);
        return dateA - dateB;
    });

    // Create a mapping of old invoice numbers to new ones
    const renumberMap = {};
    fy2526Invoices.forEach((invoice, index) => {
        const oldNumber = invoice.invoiceNo;
        const newNumber = `SVR/${String(301 + index).padStart(4, '0')}/25-26`;
        renumberMap[oldNumber] = newNumber;
        console.log(`${oldNumber} → ${newNumber}`);
    });

    // Update all invoices with new numbers
    const updatedInvoices = invoices.map(inv => {
        if (renumberMap[inv.invoiceNo]) {
            return {
                ...inv,
                invoiceNo: renumberMap[inv.invoiceNo]
            };
        }
        return inv;
    });

    // Save back to localStorage
    localStorage.setItem('outwardInvoices', JSON.stringify(updatedInvoices));

    console.log('✅ Renumbering complete!');
    console.log(`Total invoices updated: ${Object.keys(renumberMap).length}`);
    console.log('New invoice range: SVR/0301/25-26 to SVR/' + String(300 + fy2526Invoices.length).padStart(4, '0') + '/25-26');

    return {
        success: true,
        totalUpdated: Object.keys(renumberMap).length,
        mapping: renumberMap
    };
}

// Run the renumbering
console.log('='.repeat(50));
console.log('INVOICE RENUMBERING SCRIPT');
console.log('='.repeat(50));
const result = renumberFY2526Invoices();
console.log('\nRenumbering Result:', result);
alert(`✅ Successfully renumbered ${result.totalUpdated} invoices!\n\nInvoices now start from SVR/0301/25-26`);
