/**
 * Check current invoice status
 */

function checkInvoiceStatus() {
    const invoices = JSON.parse(localStorage.getItem('outwardInvoices') || '[]');

    console.log('=== Invoice Status ===');
    console.log(`Total invoices: ${invoices.length}`);

    // Filter by FY 25-26
    const fy2526Invoices = invoices.filter(inv => {
        if (!inv.invoiceNo) return false;
        const parts = inv.invoiceNo.split('/');
        return parts.length === 3 && parts[2] === '25-26';
    });

    console.log(`FY 25-26 invoices: ${fy2526Invoices.length}`);

    // Group by date
    const beforeJan2026 = fy2526Invoices.filter(inv => {
        const date = new Date(inv.date);
        return date < new Date('2026-01-01');
    });

    const fromJan2026 = fy2526Invoices.filter(inv => {
        const date = new Date(inv.date);
        return date >= new Date('2026-01-01');
    });

    console.log(`Before Jan 1, 2026: ${beforeJan2026.length} invoices`);
    console.log(`From Jan 1, 2026: ${fromJan2026.length} invoices`);

    // Show first and last invoice numbers
    if (fy2526Invoices.length > 0) {
        const sorted = [...fy2526Invoices].sort((a, b) => {
            const numA = parseInt(a.invoiceNo.split('/')[1]);
            const numB = parseInt(b.invoiceNo.split('/')[1]);
            return numA - numB;
        });

        console.log(`First invoice: ${sorted[0].invoiceNo} (Date: ${sorted[0].date})`);
        console.log(`Last invoice: ${sorted[sorted.length - 1].invoiceNo} (Date: ${sorted[sorted.length - 1].date})`);
    }

    return {
        total: invoices.length,
        fy2526Total: fy2526Invoices.length,
        beforeJan2026: beforeJan2026.length,
        fromJan2026: fromJan2026.length,
        invoices: fy2526Invoices
    };
}

// Run the check
const status = checkInvoiceStatus();
console.log('\n=== Summary ===');
console.log(`Need to create ${Math.max(0, 300 - status.beforeJan2026)} dummy invoices before Jan 1, 2026`);
