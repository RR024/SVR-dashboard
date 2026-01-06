/**
 * Create Dummy Invoices Before Jan 1, 2026
 * This will fill invoice numbers up to 300 with dummy invoices dated before Jan 1, 2026
 */

function createDummyInvoices() {
    const invoices = JSON.parse(localStorage.getItem('outwardInvoices') || '[]');

    // Filter FY 25-26 invoices
    const fy2526Invoices = invoices.filter(inv => {
        if (!inv.invoiceNo) return false;
        const parts = inv.invoiceNo.split('/');
        return parts.length === 3 && parts[2] === '25-26';
    });

    // Find invoices before Jan 1, 2026
    const beforeJan2026 = fy2526Invoices.filter(inv => {
        const date = new Date(inv.date);
        return date < new Date('2026-01-01');
    });

    const currentCount = beforeJan2026.length;
    const targetCount = 300; // We want 300 invoices before Jan 1, 2026
    const dummiesNeeded = Math.max(0, targetCount - currentCount);

    console.log(`Current invoices before Jan 1, 2026: ${currentCount}`);
    console.log(`Target: ${targetCount}`);
    console.log(`Dummy invoices to create: ${dummiesNeeded}`);

    if (dummiesNeeded === 0) {
        alert('✅ No dummy invoices needed! You already have 300+ invoices before Jan 1, 2026.');
        return;
    }

    const confirmed = confirm(
        `This will create ${dummiesNeeded} dummy invoices dated between April 2025 and December 2025.\n\n` +
        `These invoices will have invoice numbers from SVR/${String(currentCount + 1).padStart(4, '0')}/25-26 to SVR/0300/25-26.\n\n` +
        `Do you want to proceed?`
    );

    if (!confirmed) {
        console.log('Operation cancelled by user');
        return;
    }

    const dummyInvoices = [];
    const startDate = new Date('2025-04-01');
    const endDate = new Date('2025-12-31');
    const dateRange = endDate - startDate;

    for (let i = 0; i < dummiesNeeded; i++) {
        // Generate random date between April 2025 and Dec 2025
        const randomDate = new Date(startDate.getTime() + Math.random() * dateRange);
        const dateStr = randomDate.toISOString().split('T')[0];

        const invoiceNumber = currentCount + i + 1;
        const invoiceNo = `SVR/${String(invoiceNumber).padStart(4, '0')}/25-26`;

        const dummyInvoice = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 9) + '-' + i,
            invoiceNo: invoiceNo,
            date: dateStr,
            customer: 'Dummy Customer',
            customerGST: '',
            poNumber: '',
            poDate: '',
            dcNumber: '',
            dcDate: '',
            products: [
                {
                    name: 'Dummy Product',
                    qty: 1,
                    unit: 'Nos',
                    rate: 100,
                    value: 100
                }
            ],
            subtotal: 100,
            gstRate: 18,
            gstAmount: 18,
            totalAmount: 118,
            paymentStatus: 'Paid',
            amountPaid: 118,
            balance: 0,
            remarks: `Dummy invoice created to adjust numbering sequence - Created on ${new Date().toISOString()}`
        };

        dummyInvoices.push(dummyInvoice);
    }

    // Add dummy invoices to existing invoices
    const updatedInvoices = [...invoices, ...dummyInvoices];

    // Save to localStorage
    localStorage.setItem('outwardInvoices', JSON.stringify(updatedInvoices));

    console.log(`✅ Created ${dummiesNeeded} dummy invoices`);
    console.log(`Invoice range: SVR/${String(currentCount + 1).padStart(4, '0')}/25-26 to SVR/0300/25-26`);
    console.log('Next real invoice will be: SVR/0301/25-26');

    alert(
        `✅ Successfully created ${dummiesNeeded} dummy invoices!\n\n` +
        `Dummy invoices: SVR/${String(currentCount + 1).padStart(4, '0')}/25-26 to SVR/0300/25-26\n` +
        `Next invoice will be: SVR/0301/25-26\n\n` +
        `Please refresh the page to see the updated invoices.`
    );

    // Trigger a page reload
    setTimeout(() => {
        location.reload();
    }, 2000);
}

// Auto-run when script is loaded in console
console.log('=== Dummy Invoice Creator ===');
console.log('Run: createDummyInvoices()');
