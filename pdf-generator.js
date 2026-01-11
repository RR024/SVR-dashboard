// =========================================
// SVR Manufacturing - PDF Generator Module
// =========================================
// Comprehensive PDF generation for invoices and reports

// ===========================================
// SALES INVOICE PDF GENERATION
// ===========================================

function downloadOutwardInvoicePDF(invoiceId) {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showToast('PDF library not loaded', 'error');
        return;
    }

    const invoices = getOutwardInvoices();
    const invoice = invoices.find(inv => inv.id === invoiceId);

    if (!invoice) {
        showToast('Invoice not found', 'error');
        return;
    }

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    let yPos = 15;

    // Header Section
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(102, 126, 234); // Primary color
    doc.text('M/s.Sri Veera Raghava Sheet Metal Component', doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });

    yPos += 6;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('S-115 Kakkak SIDCO Industrial Estate, Kakkalur, Thiruvallur, Tamilnadu - 602003', doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });

    yPos += 4;
    doc.setFontSize(8);
    doc.text('Contact : 9841816976 / 7010458839 | Mail : sriveeraraaghavan@gmail.com', doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });

    yPos += 4;
    doc.text('GSTIN : 33AHFPR3832J1ZH  PAN: AHFPR3832J', doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });

    // Horizontal line
    yPos += 6;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, yPos, doc.internal.pageSize.getWidth() - 15, yPos);

    // Invoice Title
    yPos += 12;
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('TAX INVOICE', doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });

    // Invoice Details
    yPos += 12;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    const invoiceDate = new Date(invoice.date).toLocaleDateString('en-IN');
    doc.text(`Invoice No: ${invoice.invoiceNo}`, 15, yPos);
    doc.text(`Date: ${invoiceDate}`, doc.internal.pageSize.getWidth() - 60, yPos);

    yPos += 6;
    if (invoice.dcNo) {
        doc.text(`DC No: ${invoice.dcNo}`, 15, yPos);
        if (invoice.dcDate) {
            doc.text(`DC Date: ${new Date(invoice.dcDate).toLocaleDateString('en-IN')}`, 70, yPos);
        }
    }
    if (invoice.poNo) {
        doc.text(`PO No: ${invoice.poNo}`, doc.internal.pageSize.getWidth() - 60, yPos);
    }

    // Buyer Details Box
    yPos += 12;
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 245, 245);
    const boxWidth = doc.internal.pageSize.getWidth() - 30;
    doc.rect(15, yPos, boxWidth, 30, 'F');
    doc.rect(15, yPos, boxWidth, 30);

    yPos += 6;
    doc.setFont(undefined, 'bold');
    doc.text('Bill To:', 17, yPos);
    doc.setFont(undefined, 'normal');

    yPos += 5;
    doc.text(invoice.buyerName || 'N/A', 17, yPos);

    yPos += 5;
    doc.setFontSize(9);
    doc.text(`GSTIN: ${invoice.gstin || 'N/A'}`, 17, yPos);

    yPos += 5;
    if (invoice.buyerAddress) {
        const address = doc.splitTextToSize(invoice.buyerAddress, boxWidth - 10);
        doc.text(address, 17, yPos);
        yPos += (address.length * 4);
    }

    // Products Table
    yPos += 15;
    doc.setFontSize(10);

    const tableColumn = ["S.No", "Description", "HSN", "Qty", "Unit Price", "Amount"];
    const tableRows = [];

    invoice.products.forEach((product, index) => {
        const productRow = [
            (index + 1).toString(),
            product.description,
            product.hsnCode || 'N/A',
            product.quantity.toString(),
            `₹${parseFloat(product.unitPrice).toFixed(2)}`,
            `₹${parseFloat(product.total).toFixed(2)}`
        ];
        tableRows.push(productRow);
    });

    // Use autoTable plugin for table
    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: yPos,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [102, 126, 234], textColor: 255, fontStyle: 'bold' },
        margin: { left: 15, right: 15 },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 25, halign: 'center' },
            3: { cellWidth: 20, halign: 'right' },
            4: { cellWidth: 30, halign: 'right' },
            5: { cellWidth: 30, halign: 'right' }
        }
    });

    // Get position after table
    yPos = doc.lastAutoTable.finalY + 12;

    // Tax Summary
    const taxableValue = parseFloat(invoice.taxableValue || 0);
    const cgst = parseFloat(invoice.cgst || 0);
    const sgst = parseFloat(invoice.sgst || 0);
    const igst = parseFloat(invoice.igst || 0);
    const total = parseFloat(invoice.total || 0);

    const summaryX = doc.internal.pageSize.getWidth() - 75;
    const summaryValueX = doc.internal.pageSize.getWidth() - 15;
    doc.setFont(undefined, 'normal');
    doc.text('Taxable Value:', summaryX, yPos);
    doc.text(`₹${taxableValue.toFixed(2)}`, summaryValueX, yPos, { align: 'right' });

    yPos += 7;
    if (cgst > 0) {
        doc.text(`CGST (${invoice.gstRate / 2}%):`, summaryX, yPos);
        doc.text(`₹${cgst.toFixed(2)}`, summaryValueX, yPos, { align: 'right' });
        yPos += 7;
        doc.text(`SGST (${invoice.gstRate / 2}%):`, summaryX, yPos);
        doc.text(`₹${sgst.toFixed(2)}`, summaryValueX, yPos, { align: 'right' });
        yPos += 7;
    }
    if (igst > 0) {
        doc.text(`IGST (${invoice.gstRate}%):`, summaryX, yPos);
        doc.text(`₹${igst.toFixed(2)}`, summaryValueX, yPos, { align: 'right' });
        yPos += 7;
    }

    // Total
    doc.setDrawColor(0, 0, 0);
    doc.line(summaryX, yPos - 2, summaryValueX, yPos - 2);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Total Amount:', summaryX, yPos + 5);
    doc.text(`₹${total.toFixed(2)}`, summaryValueX, yPos + 5, { align: 'right' });

    // Payment Status Badge
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    const statusColor = invoice.paymentStatus === 'Paid' ? [16, 185, 129] :
        invoice.paymentStatus === 'Pending' ? [239, 68, 68] : [245, 158, 11];
    doc.setTextColor(...statusColor);
    doc.text(`Payment Status: ${invoice.paymentStatus}`, 15, yPos);

    // Terms & Conditions Section
    yPos += 12;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('Terms & Conditions:', 15, yPos);

    yPos += 5;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    const terms = [
        '1. Payment should be made within the agreed credit period.',
        '2. Goods once sold will not be taken back.',
        '3. Subject to jurisdiction matters only.'
    ];
    terms.forEach(term => {
        doc.text(term, 15, yPos);
        yPos += 4;
    });

    // Bank Details (Optional - adds more content)
    yPos += 5;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('Bank Details:', 15, yPos);

    yPos += 5;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.text('Bank: [Bank Name] | A/C No: XXXXXXXXXX | IFSC: XXXXXXXXX', 15, yPos);

    // Footer
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);

    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.text('For SVR Manufacturing', doc.internal.pageSize.getWidth() - 60, footerY);
    doc.text('Authorized Signatory', doc.internal.pageSize.getWidth() - 60, footerY + 10);

    doc.line(15, footerY + 5, doc.internal.pageSize.getWidth() - 15, footerY + 5);
    doc.text('This is a computer-generated invoice', doc.internal.pageSize.getWidth() / 2, footerY + 12, { align: 'center' });

    // Save PDF
    doc.save(`Invoice_${invoice.invoiceNo.replace(/\//g, '_')}.pdf`);
    showToast('Invoice PDF downloaded successfully!', 'success');
    logActivity('pdf_download', `Downloaded sales invoice PDF: ${invoice.invoiceNo}`);
}

// ===========================================
// PURCHASE INVOICE PDF GENERATION
// ===========================================

function downloadInwardInvoicePDF(invoiceId) {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showToast('PDF library not loaded', 'error');
        return;
    }

    const invoices = getInwardInvoices();
    const invoice = invoices.find(inv => inv.id === invoiceId);

    if (!invoice) {
        showToast('Invoice not found', 'error');
        return;
    }

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    let yPos = 15;

    // Header
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(102, 126, 234);
    doc.text('SVR MANUFACTURING', doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });

    yPos += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Sheet Metal Component', doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });

    yPos += 10;
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('PURCHASE INVOICE', doc.internal.pageSize.getWidth() / 2, yPos, { align: 'center' });

    // Invoice Details
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    doc.text(`Supplier Invoice No: ${invoice.invoiceNo}`, 15, yPos);
    doc.text(`Date: ${new Date(invoice.date).toLocaleDateString('en-IN')}`, doc.internal.pageSize.getWidth() - 60, yPos);

    yPos += 10;
    doc.setFont(undefined, 'bold');
    doc.text('Supplier Details:', 15, yPos);
    doc.setFont(undefined, 'normal');

    yPos += 6;
    doc.text(`Customer: ${invoice.customer}`, 15, yPos);
    yPos += 5;
    doc.text(`GST No: ${invoice.gstNo || 'N/A'}`, 15, yPos);

    // Material Details
    yPos += 15;
    const tableData = [
        ['Material', invoice.material],
        ['Quantity', `${invoice.quantity} ${invoice.unit || 'pcs'}`],
        ['Rate', `₹${parseFloat(invoice.rate).toFixed(2)}`],
        ['Amount', `₹${parseFloat(invoice.amount).toFixed(2)}`]
    ];

    doc.autoTable({
        body: tableData,
        startY: yPos,
        theme: 'striped',
        styles: { fontSize: 10, cellPadding: 5 },
        margin: { left: 15, right: 15 },
        columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 'auto' }
        }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // Payment Status
    doc.setFont(undefined, 'bold');
    const statusColor = invoice.paymentStatus === 'Paid' ? [16, 185, 129] :
        invoice.paymentStatus === 'Pending' ? [239, 68, 68] : [245, 158, 11];
    doc.setTextColor(...statusColor);
    doc.text(`Payment Status: ${invoice.paymentStatus}`, 15, yPos);

    // Save PDF
    doc.save(`Purchase_Invoice_${invoice.invoiceNo.replace(/\//g, '_')}.pdf`);
    showToast('Purchase invoice PDF downloaded successfully!', 'success');
    logActivity('pdf_download', `Downloaded purchase invoice PDF: ${invoice.invoiceNo}`);
}

// ===========================================
// REPORT PDF GENERATION FUNCTIONS
// ===========================================

// Monthly Revenue Report
function generateMonthlyReport() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showToast('PDF library not loaded', 'error');
        return;
    }

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Monthly Revenue Report', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(currentMonth, 105, 30, { align: 'center' });

    // Get current month invoices
    const outwardInvoices = getOutwardInvoices();
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const monthlyInvoices = outwardInvoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate >= monthStart && invDate <= monthEnd;
    });

    // Summary Stats
    let yPos = 45;
    const totalRevenue = monthlyInvoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
    const paidAmount = monthlyInvoices
        .filter(inv => inv.paymentStatus === 'Paid')
        .reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
    const pendingAmount = totalRevenue - paidAmount;

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Invoices: ${monthlyInvoices.length}`, 20, yPos);
    yPos += 8;
    doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`, 20, yPos);
    yPos += 8;
    doc.text(`Paid: ₹${paidAmount.toFixed(2)}`, 20, yPos);
    yPos += 8;
    doc.text(`Outstanding: ₹${pendingAmount.toFixed(2)}`, 20, yPos);

    // Invoice Table
    yPos += 15;
    const tableColumn = ["Invoice No", "Date", "Customer", "Amount", "Status"];
    const tableRows = monthlyInvoices.map(inv => [
        inv.invoiceNo,
        new Date(inv.date).toLocaleDateString('en-IN'),
        inv.buyerName,
        `₹${parseFloat(inv.total).toFixed(2)}`,
        inv.paymentStatus
    ]);

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: yPos,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [102, 126, 234] }
    });

    // Footer
    const footerY = 280;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 105, footerY, { align: 'center' });

    doc.save(`Monthly_Revenue_Report_${currentMonth.replace(' ', '_')}.pdf`);
    showToast('Monthly revenue report generated!', 'success');
}

// Outstanding Payments Report
function generateOutstandingReport() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showToast('PDF library not loaded', 'error');
        return;
    }

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Outstanding Payments Report', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 105, 28, { align: 'center' });

    // Get all outstanding invoices (both sales and purchase)
    const outwardInvoices = getOutwardInvoices().filter(inv =>
        inv.paymentStatus === 'Pending' || inv.paymentStatus === 'Partial'
    );
    const inwardInvoices = getInwardInvoices().filter(inv =>
        inv.paymentStatus === 'Pending' || inv.paymentStatus === 'Partial'
    );

    const salesOutstanding = outwardInvoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);
    const purchaseOutstanding = inwardInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);
    const netOutstanding = salesOutstanding - purchaseOutstanding;

    // Summary
    let yPos = 40;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text(`Sales Outstanding: ₹${salesOutstanding.toFixed(2)}`, 20, yPos);
    yPos += 8;
    doc.setTextColor(245, 158, 11);
    doc.text(`Purchase Outstanding: ₹${purchaseOutstanding.toFixed(2)}`, 20, yPos);
    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.text(`Net Outstanding: ₹${netOutstanding.toFixed(2)}`, 20, yPos);

    // Outward Outstanding Table
    if (outwardInvoices.length > 0) {
        yPos += 15;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Sales Invoices (Outstanding)', 20, yPos);

        yPos += 5;
        const outwardTableRows = outwardInvoices.map(inv => [
            inv.invoiceNo,
            new Date(inv.date).toLocaleDateString('en-IN'),
            inv.buyerName,
            `₹${parseFloat(inv.total).toFixed(2)}`,
            inv.paymentStatus
        ]);

        doc.autoTable({
            head: [["Invoice No", "Date", "Customer", "Amount", "Status"]],
            body: outwardTableRows,
            startY: yPos,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [239, 68, 68] }
        });

        yPos = doc.lastAutoTable.finalY + 10;
    }

    // Inward Outstanding Table
    if (inwardInvoices.length > 0 && yPos < 240) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Purchase Invoices (Outstanding)', 20, yPos);

        yPos += 5;
        const inwardTableRows = inwardInvoices.map(inv => [
            inv.invoiceNo,
            new Date(inv.date).toLocaleDateString('en-IN'),
            inv.customer,
            `₹${parseFloat(inv.amount).toFixed(2)}`,
            inv.paymentStatus
        ]);

        doc.autoTable({
            head: [["Invoice No", "Date", "Supplier", "Amount", "Status"]],
            body: inwardTableRows,
            startY: yPos,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [245, 158, 11] }
        });
    }

    doc.save('Outstanding_Payments_Report.pdf');
    showToast('Outstanding payments report generated!', 'success');
}

// Attendance Summary Report
function generateAttendanceReport() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showToast('PDF library not loaded', 'error');
        return;
    }

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    const currentMonth = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Attendance Summary Report', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(currentMonth, 105, 28, { align: 'center' });

    // Get attendance data
    const employees = getEmployees();
    const attendanceRecords = getAttendanceRecords();

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const monthlyRecords = attendanceRecords.filter(rec => {
        const recDate = new Date(rec.date);
        return recDate >= monthStart && recDate <= monthEnd;
    });

    // Calculate attendance summary per employee
    const employeeSummary = employees.map(emp => {
        const empRecords = monthlyRecords.filter(rec => rec.empId === emp.empId);
        const present = empRecords.filter(rec => rec.status === 'Present').length;
        const absent = empRecords.filter(rec => rec.status === 'Absent').length;
        const halfDay = empRecords.filter(rec => rec.status === 'Half-Day').length;
        const leave = empRecords.filter(rec => rec.status === 'Leave').length;

        return [
            emp.empId,
            emp.name,
            present.toString(),
            absent.toString(),
            halfDay.toString(),
            leave.toString(),
            `${((present / (present + absent + halfDay + leave)) * 100).toFixed(1)}%`
        ];
    });

    // Table
    doc.autoTable({
        head: [["Emp ID", "Name", "Present", "Absent", "Half-Day", "Leave", "Attendance %"]],
        body: employeeSummary,
        startY: 40,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [102, 126, 234] }
    });

    // Footer
    const footerY = 280;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 105, footerY, { align: 'center' });

    doc.save(`Attendance_Report_${currentMonth.replace(' ', '_')}.pdf`);
    showToast('Attendance report generated!', 'success');
}

// GST Tax Summary Report
function generateGSTReport() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showToast('PDF library not loaded', 'error');
        return;
    }

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    const currentMonth = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('GST Tax Summary Report', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(currentMonth, 105, 28, { align: 'center' });

    // Get current month invoices
    const outwardInvoices = getOutwardInvoices();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const monthlyInvoices = outwardInvoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate >= monthStart && invDate <= monthEnd;
    });

    // Calculate totals
    const totalTaxableValue = monthlyInvoices.reduce((sum, inv) => sum + parseFloat(inv.taxableValue || 0), 0);
    const totalCGST = monthlyInvoices.reduce((sum, inv) => sum + parseFloat(inv.cgst || 0), 0);
    const totalSGST = monthlyInvoices.reduce((sum, inv) => sum + parseFloat(inv.sgst || 0), 0);
    const totalIGST = monthlyInvoices.reduce((sum, inv) => sum + parseFloat(inv.igst || 0), 0);
    const totalTax = totalCGST + totalSGST + totalIGST;
    const totalInvoiceValue = monthlyInvoices.reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);

    // Summary Section
    let yPos = 45;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Invoices: ${monthlyInvoices.length}`, 20, yPos);
    yPos += 8;
    doc.text(`Total Taxable Value: ₹${totalTaxableValue.toFixed(2)}`, 20, yPos);
    yPos += 8;
    doc.text(`Total CGST: ₹${totalCGST.toFixed(2)}`, 20, yPos);
    yPos += 8;
    doc.text(`Total SGST: ₹${totalSGST.toFixed(2)}`, 20, yPos);
    yPos += 8;
    doc.text(`Total IGST: ₹${totalIGST.toFixed(2)}`, 20, yPos);
    yPos += 8;
    doc.setTextColor(102, 126, 234);
    doc.text(`Total Tax Collected: ₹${totalTax.toFixed(2)}`, 20, yPos);
    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Invoice Value: ₹${totalInvoiceValue.toFixed(2)}`, 20, yPos);

    // Detailed Table
    yPos += 15;
    const tableRows = monthlyInvoices.map(inv => [
        inv.invoiceNo,
        new Date(inv.date).toLocaleDateString('en-IN'),
        inv.buyerName,
        inv.gstin,
        `₹${parseFloat(inv.taxableValue || 0).toFixed(2)}`,
        `₹${(parseFloat(inv.cgst || 0) + parseFloat(inv.sgst || 0) + parseFloat(inv.igst || 0)).toFixed(2)}`,
        `₹${parseFloat(inv.total || 0).toFixed(2)}`
    ]);

    doc.autoTable({
        head: [["Invoice No", "Date", "Customer", "GSTIN", "Taxable", "Tax", "Total"]],
        body: tableRows,
        startY: yPos,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [102, 126, 234] },
        columnStyles: {
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right' }
        }
    });

    // Footer
    const footerY = 280;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 105, footerY, { align: 'center' });

    doc.save(`GST_Tax_Summary_${currentMonth.replace(' ', '_')}.pdf`);
    showToast('GST tax summary report generated!', 'success');
}

// Export All Reports
function exportAllReports() {
    if (!confirm('This will generate and download all 4 reports. Continue?')) {
        return;
    }

    generateMonthlyReport();
    setTimeout(() => generateOutstandingReport(), 500);
    setTimeout(() => generateAttendanceReport(), 1000);
    setTimeout(() => generateGSTReport(), 1500);

    showToast('All reports generated successfully!', 'success');
}
