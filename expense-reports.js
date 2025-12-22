// ================================
// EXPENSE DETAILED REPORTS
// ================================

// Generate comprehensive monthly expense report
function generateMonthlyExpenseReport() {
    const month = document.getElementById('reportMonth')?.value;
    const year = document.getElementById('reportYear')?.value;

    if (!month || !year) {
        showToast('❌ Please select month and year!', 'error');
        return;
    }

    const expenses = getExpenses().filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() + 1 === parseInt(month) &&
            expDate.getFullYear() === parseInt(year);
    });

    if (expenses.length === 0) {
        showToast('❌ No expenses found for selected period!', 'error');
        return;
    }

    previewMonthlyReport(expenses, month, year);
}

// Preview monthly report in modal
function previewMonthlyReport(expenses, month, year) {
    const modal = document.getElementById('reportPreviewModal');
    const container = document.getElementById('reportPreviewContent');

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    // Calculate category breakdown
    const categoryBreakdown = {};
    expenses.forEach(exp => {
        if (!categoryBreakdown[exp.category]) {
            categoryBreakdown[exp.category] = 0;
        }
        categoryBreakdown[exp.category] += parseFloat(exp.amount);
    });

    const categoryRows = Object.entries(categoryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => `
            <tr>
                <td>${cat}</td>
                <td style="text-align: right; font-weight: 600;">₹${amt.toFixed(2)}</td>
                <td style="text-align: right;">${((amt / totalAmount) * 100).toFixed(1)}%</td>
            </tr>
        `).join('');

    // Calculate payment method breakdown
    const paymentBreakdown = {};
    expenses.forEach(exp => {
        if (!paymentBreakdown[exp.paymentMethod]) {
            paymentBreakdown[exp.paymentMethod] = 0;
        }
        paymentBreakdown[exp.paymentMethod]++;
    });

    const paymentRows = Object.entries(paymentBreakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([method, count]) => `
            <tr>
                <td>${method}</td>
                <td style="text-align: center;">${count}</td>
                <td style="text-align: right;">${((count / expenses.length) * 100).toFixed(1)}%</td>
            </tr>
        `).join('');

    // Top 10 expenses
    const topExpenses = [...expenses]
        .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
        .slice(0, 10)
        .map(exp => `
            <tr>
                <td>${formatDate(exp.date)}</td>
                <td>${exp.description}</td>
                <td>${exp.category}</td>
                <td style="text-align: right; font-weight: 700; color: #e74c3c;">₹${parseFloat(exp.amount).toFixed(2)}</td>
            </tr>
        `).join('');

    container.innerHTML = `
        <div style="padding: 2rem;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <h2 style="color: var(--primary); margin-bottom: 0.5rem;">Monthly Expense Report</h2>
                <h3 style="color: var(--text-secondary); font-weight: 400;">${monthNames[month - 1]} ${year}</h3>
            </div>
            
            <!-- Summary Cards -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2rem;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.5rem; border-radius: 10px; color: white;">
                    <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">Total Expenses</div>
                    <div style="font-size: 2rem; font-weight: bold;">₹${totalAmount.toFixed(2)}</div>
                </div>
                <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 1.5rem; border-radius: 10px; color: white;">
                    <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">Total Transactions</div>
                    <div style="font-size: 2rem; font-weight: bold;">${expenses.length}</div>
                </div>
                <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 1.5rem; border-radius: 10px; color: white;">
                    <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">Average per Day</div>
                    <div style="font-size: 2rem; font-weight: bold;">₹${(totalAmount / 30).toFixed(2)}</div>
                </div>
            </div>
            
            <!-- Category Breakdown -->
            <div style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Category Breakdown</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--bg-tertiary); text-align: left;">
                            <th style="padding: 0.75rem; border: 1px solid #ddd;">Category</th>
                            <th style="padding: 0.75rem; border: 1px solid #ddd; text-align: right;">Amount</th>
                            <th style="padding: 0.75rem; border: 1px solid #ddd; text-align: right;">Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${categoryRows}
                    </tbody>
                </table>
            </div>
            
            <!-- Payment Method Distribution -->
            <div style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Payment Method Distribution</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--bg-tertiary); text-align: left;">
                            <th style="padding: 0.75rem; border: 1px solid #ddd;">Payment Method</th>
                            <th style="padding: 0.75rem; border: 1px solid #ddd; text-align: center;">Transactions</th>
                            <th style="padding: 0.75rem; border: 1px solid #ddd; text-align: right;">Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paymentRows}
                    </tbody>
                </table>
            </div>
            
            <!-- Top 10 Expenses -->
            <div>
                <h3 style="margin-bottom: 1rem; color: var(--text-primary);">Top 10 Expenses</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--bg-tertiary); text-align: left;">
                            <th style="padding: 0.75rem; border: 1px solid #ddd;">Date</th>
                            <th style="padding: 0.75rem; border: 1px solid #ddd;">Description</th>
                            <th style="padding: 0.75rem; border: 1px solid #ddd;">Category</th>
                            <th style="padding: 0.75rem; border: 1px solid #ddd; text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topExpenses}
                    </tbody>
                </table>
            </div>
            
            <!-- Export Buttons -->
            <div style="margin-top: 2rem; text-align: center; display: flex; gap: 1rem; justify-content: center;">
                <button class="btn btn-success" onclick="exportReportToPDF('monthly', ${month}, ${year})">
                    📄 Export to PDF
                </button>
                <button class="btn btn-primary" onclick="exportReportToExcel('monthly', ${month}, ${year})">
                    📊 Export to Excel
                </button>
            </div>
        </div>
    `;

    modal.classList.add('active');
}

// Export report to PDF
function exportReportToPDF(reportType, month, year) {
    if (reportType === 'monthly') {
        const expenses = getExpenses().filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() + 1 === parseInt(month) &&
                expDate.getFullYear() === parseInt(year);
        });

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Title
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text(`${monthNames[month - 1]} ${year} Expense Report`, 14, 20);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);

        // Summary
        const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Summary', 14, 38);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Total Expenses: ₹${totalAmount.toFixed(2)}`, 14, 45);
        doc.text(`Total Transactions: ${expenses.length}`, 14, 51);
        doc.text(`Average per Day: ₹${(totalAmount / 30).toFixed(2)}`, 14, 57);

        // Category breakdown table
        const categoryData = {};
        expenses.forEach(exp => {
            if (!categoryData[exp.category]) categoryData[exp.category] = 0;
            categoryData[exp.category] += parseFloat(exp.amount);
        });

        const categoryRows = Object.entries(categoryData)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, amt]) => [cat, `₹${amt.toFixed(2)}`, `${((amt / totalAmount) * 100).toFixed(1)}%`]);

        doc.autoTable({
            startY: 65,
            head: [['Category', 'Amount', 'Percentage']],
            body: categoryRows,
            theme: 'striped',
            headStyles: { fillColor: [102, 126, 234] }
        });

        // Save
        doc.save(`Expense-Report-${monthNames[month - 1]}-${year}.pdf`);
        showToast('✅ Report exported to PDF!', 'success');
    }
}

// Export report to Excel
function exportReportToExcel(reportType, month, year) {
    if (reportType === 'monthly') {
        const expenses = getExpenses().filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() + 1 === parseInt(month) &&
                expDate.getFullYear() === parseInt(year);
        });

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        // Prepare data
        const excelData = expenses.map(exp => ({
            'Date': formatDate(exp.date),
            'Category': exp.category,
            'Description': exp.description,
            'Amount': parseFloat(exp.amount).toFixed(2),
            'Payment Method': exp.paymentMethod,
            'Paid To': exp.paidTo || '-'
        }));

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Add category summary sheet
        const categoryData = {};
        expenses.forEach(exp => {
            if (!categoryData[exp.category]) categoryData[exp.category] = 0;
            categoryData[exp.category] += parseFloat(exp.amount);
        });

        const categorySummary = Object.entries(categoryData).map(([cat, amt]) => ({
            'Category': cat,
            'Amount': amt.toFixed(2),
            'Percentage': ((amt / expenses.reduce((s, e) => s + parseFloat(e.amount), 0)) * 100).toFixed(1) + '%'
        }));

        const ws2 = XLSX.utils.json_to_sheet(categorySummary);

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
        XLSX.utils.book_append_sheet(wb, ws2, 'Category Summary');

        // Save
        XLSX.writeFile(wb, `Expense-Report-${monthNames[month - 1]}-${year}.xlsx`);
        showToast('✅ Report exported to Excel!', 'success');
    }
}

// Close report preview modal
function closeReportPreview() {
    const modal = document.getElementById('reportPreviewModal');
    modal.classList.remove('active');
}

// Open report generator modal
function openReportGenerator() {
    const modal = document.getElementById('reportGeneratorModal');

    // Set default values
    const now = new Date();
    document.getElementById('reportMonth').value = now.getMonth() + 1;
    document.getElementById('reportYear').value = now.getFullYear();

    modal.classList.add('active');
}

// Close report generator modal
function closeReportGenerator() {
    const modal = document.getElementById('reportGeneratorModal');
    modal.classList.remove('active');
}
