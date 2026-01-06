/**
 * Master Invoice Adjustment Script
 * This script ensures that invoices from Jan 1, 2026 onwards start at SVR/0301/25-26
 * 
 * HOW TO USE:
 * 1. Open your dashboard in the browser
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Type: adjustInvoiceNumbering()
 */

function adjustInvoiceNumbering() {
    console.log('===================================');
    console.log('Invoice Numbering Adjustment Tool');
    console.log('===================================\n');

    const invoices = JSON.parse(localStorage.getItem('outwardInvoices') || '[]');
    console.log(`Total invoices in system: ${invoices.length}`);

    // Filter FY 25-26 invoices
    const fy2526Invoices = invoices.filter(inv => {
        if (!inv.invoiceNo) return false;
        const parts = inv.invoiceNo.split('/');
        return parts.length === 3 && parts[2] === '25-26';
    });

    console.log(`FY 25-26 invoices: ${fy2526Invoices.length}`);

    if (fy2526Invoices.length === 0) {
        console.log('\n✅ No FY 25-26 invoices found.');
        console.log('Next invoice will be: SVR/0301/25-26');
        alert('✅ System is ready!\n\nNext invoice will be: SVR/0301/25-26');
        return;
    }

    // Separate invoices by date
    const beforeJan2026 = fy2526Invoices.filter(inv => {
        const date = new Date(inv.date);
        return date < new Date('2026-01-01');
    });

    const fromJan2026 = fy2526Invoices.filter(inv => {
        const date = new Date(inv.date);
        return date >= new Date('2026-01-01');
    });

    console.log(`\nInvoices before Jan 1, 2026: ${beforeJan2026.length}`);
    console.log(`Invoices from Jan 1, 2026 onwards: ${fromJan2026.length}`);

    // Show current range
    if (fy2526Invoices.length > 0) {
        const sorted = [...fy2526Invoices].sort((a, b) => {
            const numA = parseInt(a.invoiceNo.split('/')[1]);
            const numB = parseInt(b.invoiceNo.split('/')[1]);
            return numA - numB;
        });

        console.log(`\nCurrent invoice range:`);
        console.log(`  First: ${sorted[0].invoiceNo} (Date: ${sorted[0].date})`);
        console.log(`  Last: ${sorted[sorted.length - 1].invoiceNo} (Date: ${sorted[sorted.length - 1].date})`);
    }

    // Calculate what needs to happen
    const dummiesNeeded = Math.max(0, 300 - beforeJan2026.length);

    console.log(`\n--- Action Required ---`);

    if (dummiesNeeded > 0) {
        console.log(`Need to create ${dummiesNeeded} dummy invoices before Jan 1, 2026`);
        console.log(`This will ensure next invoice from Jan 2026 onwards is SVR/0301/25-26`);

        const proceed = confirm(
            `Current Status:\n` +
            `- FY 25-26 invoices: ${fy2526Invoices.length}\n` +
            `- Before Jan 1, 2026: ${beforeJan2026.length}\n` +
            `- From Jan 1, 2026: ${fromJan2026.length}\n\n` +
            `Action: Create ${dummiesNeeded} dummy invoices\n` +
            `Date range: April 2025 - Dec 2025\n\n` +
            `This will ensure invoices from Jan 1, 2026 start at SVR/0301/25-26.\n\n` +
            `Proceed?`
        );

        if (!proceed) {
            console.log('Cancelled by user');
            return;
        }

        // Create dummy invoices
        createDummyInvoicesBatch(beforeJan2026.length, dummiesNeeded, invoices);

    } else {
        console.log(`✅ Already have ${beforeJan2026.length} invoices before Jan 1, 2026`);

        if (fromJan2026.length > 0) {
            // Check if invoices from Jan 2026 are numbered correctly
            const janInvoices = [...fromJan2026].sort((a, b) => {
                const numA = parseInt(a.invoiceNo.split('/')[1]);
                const numB = parseInt(b.invoiceNo.split('/')[1]);
                return numA - numB;
            });

            const firstJanNum = parseInt(janInvoices[0].invoiceNo.split('/')[1]);

            if (firstJanNum < 301) {
                console.log(`\n⚠️ WARNING: Invoices from Jan 2026 are numbered below 301!`);
                console.log(`First Jan 2026 invoice: ${janInvoices[0].invoiceNo}`);
                console.log(`\nConsider renumbering these invoices.`);

                alert(
                    `⚠️ WARNING\n\n` +
                    `You have invoices from Jan 1, 2026 onwards that are numbered below SVR/0301/25-26.\n\n` +
                    `First Jan 2026 invoice: ${janInvoices[0].invoiceNo}\n\n` +
                    `You may need to manually renumber these invoices.`
                );
            } else {
                console.log(`✅ Jan 2026 invoices are correctly numbered starting from ${janInvoices[0].invoiceNo}`);
                alert(`✅ System is correctly configured!\n\nJan 2026 invoices start from ${janInvoices[0].invoiceNo}`);
            }
        } else {
            console.log(`✅ Next invoice from Jan 2026 will be: SVR/0301/25-26`);
            alert(`✅ System is ready!\n\nNext invoice will be: SVR/0301/25-26`);
        }
    }
}

function createDummyInvoicesBatch(currentCount, count, existingInvoices) {
    console.log(`\nCreating ${count} dummy invoices...`);

    const dummyInvoices = [];
    const startDate = new Date('2025-04-01');
    const endDate = new Date('2025-12-31');
    const dateRange = endDate - startDate;

    for (let i = 0; i < count; i++) {
        // Generate random date between April 2025 and Dec 2025
        const randomDate = new Date(startDate.getTime() + Math.random() * dateRange);
        const dateStr = randomDate.toISOString().split('T')[0];

        const invoiceNumber = currentCount + i + 1;
        const invoiceNo = `SVR/${String(invoiceNumber).padStart(4, '0')}/25-26`;

        const dummyInvoice = {
            id: `dummy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
            invoiceNo: invoiceNo,
            date: dateStr,
            customer: `Dummy Customer ${invoiceNumber}`,
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
            remarks: `[DUMMY] Invoice created for numbering adjustment - ${new Date().toLocaleString()}`
        };

        dummyInvoices.push(dummyInvoice);

        if ((i + 1) % 50 === 0) {
            console.log(`  Created ${i + 1}/${count}...`);
        }
    }

    // Add to existing invoices
    const updatedInvoices = [...existingInvoices, ...dummyInvoices];

    // Save to localStorage
    try {
        localStorage.setItem('outwardInvoices', JSON.stringify(updatedInvoices));

        console.log(`\n✅ Successfully created ${count} dummy invoices`);
        console.log(`Invoice range: SVR/${String(currentCount + 1).padStart(4, '0')}/25-26 to SVR/0300/25-26`);
        console.log(`\nNext invoice will be: SVR/0301/25-26`);

        alert(
            `✅ SUCCESS!\n\n` +
            `Created ${count} dummy invoices\n` +
            `Range: SVR/${String(currentCount + 1).padStart(4, '0')}/25-26 to SVR/0300/25-26\n\n` +
            `Next invoice will be: SVR/0301/25-26\n\n` +
            `Reloading page...`
        );

        setTimeout(() => location.reload(), 2000);

    } catch (error) {
        console.error('Error saving invoices:', error);
        alert('❌ Error: Could not save invoices. Try creating fewer at a time.');
    }
}

// Display instructions
console.log('\n📝 INSTRUCTIONS:');
console.log('Run: adjustInvoiceNumbering()');
console.log('\nThis will check your current status and create dummy invoices if needed.');
