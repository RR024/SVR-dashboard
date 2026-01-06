/**
 * Invoice Renumbering Utility
 * This script renumbers all FY 25-26 invoices to start from SVR/0301/25-26
 * while preserving all invoice data and relationships.
 */

function renumberInvoices() {
    console.log('🔄 Starting invoice renumbering process...');

    // Get all outward invoices
    const invoices = JSON.parse(localStorage.getItem('outwardInvoices') || '[]');

    if (invoices.length === 0) {
        alert('No invoices found to renumber.');
        console.log('❌ No invoices found');
        return;
    }

    // Filter invoices for FY 25-26
    const fy2526Invoices = invoices.filter(inv => {
        if (!inv.invoiceNo) return false;
        const parts = inv.invoiceNo.split('/');
        return parts.length === 3 && parts[2] === '25-26';
    });

    // Filter invoices for other FYs
    const otherInvoices = invoices.filter(inv => {
        if (!inv.invoiceNo) return false;
        const parts = inv.invoiceNo.split('/');
        return parts.length !== 3 || parts[2] !== '25-26';
    });

    if (fy2526Invoices.length === 0) {
        alert('No FY 25-26 invoices found to renumber.');
        console.log('❌ No FY 25-26 invoices found');
        return;
    }

    console.log(`📊 Found ${fy2526Invoices.length} invoices for FY 25-26`);

    // Sort by date and then by original invoice number to maintain chronological order
    fy2526Invoices.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) {
            return dateA.localeCompare(dateB);
        }
        // If same date, sort by invoice number
        return a.invoiceNo.localeCompare(b.invoiceNo, undefined, { numeric: true });
    });

    // Renumber invoices starting from 301
    const renumberedInvoices = fy2526Invoices.map((invoice, index) => {
        const newNumber = `SVR/${String(301 + index).padStart(4, '0')}/25-26`;
        const oldNumber = invoice.invoiceNo;

        console.log(`  ✏️  ${oldNumber} → ${newNumber}`);

        return {
            ...invoice,
            invoiceNo: newNumber
        };
    });

    // Combine renumbered invoices with other FY invoices
    const allInvoices = [...renumberedInvoices, ...otherInvoices];

    // Confirmation before saving
    const confirmed = confirm(
        `🔄 Renumber ${fy2526Invoices.length} invoices for FY 25-26?\n\n` +
        `Old range: ${fy2526Invoices[0].invoiceNo} to ${fy2526Invoices[fy2526Invoices.length - 1].invoiceNo}\n` +
        `New range: SVR/0301/25-26 to SVR/${String(300 + fy2526Invoices.length).padStart(4, '0')}/25-26\n\n` +
        `⚠️ This will update all invoice numbers. Continue?`
    );

    if (!confirmed) {
        console.log('❌ Renumbering cancelled by user');
        return;
    }

    // Save to localStorage
    try {
        localStorage.setItem('outwardInvoices', JSON.stringify(allInvoices));
        console.log('✅ Successfully renumbered invoices');
        console.log(`New invoice range: SVR/0301/25-26 to SVR/${String(300 + fy2526Invoices.length).padStart(4, '0')}/25-26`);

        // Reload the page to reflect changes
        alert(`✅ Successfully renumbered ${fy2526Invoices.length} invoices!\n\nInvoices now start from SVR/0301/25-26`);
        window.location.reload();
    } catch (error) {
        console.error('❌ Error saving renumbered invoices:', error);
        alert('❌ Error occurred while renumbering. Please check console for details.');
    }
}

// Auto-execute when script is loaded
console.log('📝 Invoice renumbering utility loaded. Run renumberInvoices() to start.');
