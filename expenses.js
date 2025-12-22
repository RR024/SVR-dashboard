// ================================
// EXPENSE TRACKING MODULE
// ================================

// Storage key
const EXPENSES_STORAGE_KEY = 'manufacturingExpenses';

// Get all expenses from localStorage
function getExpenses() {
    const data = localStorage.getItem(EXPENSES_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// Save expenses to localStorage
function saveToExpenseStorage(expenses) {
    localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
}

// Load and display all expenses
function loadExpenses() {
    const expenses = getExpenses();
    const tbody = document.getElementById('expenseTableBody');

    if (!tbody) return;

    // Sort by date (newest first)
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: #999;">
                    No expenses recorded yet. Click "Add Expense" to get started.
                </td>
            </tr>
        `;
        updateExpenseSummaries();
        return;
    }

    tbody.innerHTML = expenses.map(expense => `
        <tr>
            <td>${formatDate(expense.date)}</td>
            <td><span class="category-badge">${expense.category}</span></td>
            <td>${expense.description}</td>
            <td style="font-weight: 600; color: #e74c3c;">₹${parseFloat(expense.amount).toFixed(2)}</td>
            <td>${expense.paymentMethod}</td>
            <td>${expense.paidTo || '-'}</td>
            <td>
                <button class="btn-icon" onclick="openExpenseModal('${expense.id}')" title="Edit">
                    ✏️
                </button>
                <button class="btn-icon" onclick="deleteExpense('${expense.id}')" title="Delete">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');

    // Update summary cards
    updateExpenseSummaries();
}

// Save expense (add or edit)
function saveExpense() {
    const id = document.getElementById('expenseId').value;
    const date = document.getElementById('expenseDate').value;
    const category = document.getElementById('expenseCategory').value;
    const description = document.getElementById('expenseDescription').value;
    const amount = document.getElementById('expenseAmount').value;
    const paymentMethod = document.getElementById('expensePaymentMethod').value;
    const paidTo = document.getElementById('expensePaidTo').value;
    const notes = document.getElementById('expenseNotes').value;

    // Validation
    if (!date || !category || !description || !amount || !paymentMethod) {
        showToast('❌ Please fill all required fields!', 'error');
        return;
    }

    if (parseFloat(amount) <= 0) {
        showToast('❌ Amount must be greater than 0!', 'error');
        return;
    }

    const expenseData = {
        id: id || Date.now().toString(),
        date: date,
        category: category,
        description: description,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod,
        paidTo: paidTo,
        notes: notes,
        createdAt: id ? getExpenses().find(exp => exp.id === id)?.createdAt || new Date().toISOString() : new Date().toISOString(),
        lastModified: new Date().toISOString()
    };

    let expenses = getExpenses();

    if (id) {
        // Update existing
        expenses = expenses.map(exp => exp.id === id ? expenseData : exp);
        showToast('✅ Expense updated successfully!', 'success');
    } else {
        // Add new
        expenses.push(expenseData);
        showToast('✅ Expense added successfully!', 'success');
    }

    saveToExpenseStorage(expenses);
    closeExpenseModal();
    loadExpenses();

    // Update dashboard if function exists
    if (typeof loadDashboard === 'function') {
        loadDashboard();
    }
}

// Delete expense
function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }

    let expenses = getExpenses();
    expenses = expenses.filter(exp => exp.id !== id);

    saveToExpenseStorage(expenses);
    loadExpenses();
    showToast('✅ Expense deleted successfully!', 'success');

    // Update dashboard if function exists
    if (typeof loadDashboard === 'function') {
        loadDashboard();
    }
}

// Open expense modal for add/edit
function openExpenseModal(id = null) {
    const modal = document.getElementById('expenseModal');
    const form = modal.querySelector('form');

    // Reset form
    form.reset();
    document.getElementById('expenseId').value = '';

    if (id) {
        // Edit mode
        const expense = getExpenses().find(exp => exp.id === id);
        if (expense) {
            document.getElementById('expenseModalTitle').textContent = 'Edit Expense';
            document.getElementById('expenseId').value = expense.id;
            document.getElementById('expenseDate').value = expense.date;
            document.getElementById('expenseCategory').value = expense.category;
            document.getElementById('expenseDescription').value = expense.description;
            document.getElementById('expenseAmount').value = expense.amount;
            document.getElementById('expensePaymentMethod').value = expense.paymentMethod;
            document.getElementById('expensePaidTo').value = expense.paidTo || '';
            document.getElementById('expenseNotes').value = expense.notes || '';
        }
    } else {
        // New mode
        document.getElementById('expenseModalTitle').textContent = 'Add Expense';
        document.getElementById('expenseDate').valueAsDate = new Date();
    }

    modal.classList.add('active');
}

// Close expense modal
function closeExpenseModal() {
    const modal = document.getElementById('expenseModal');
    modal.classList.remove('active');
}

// Calculate expense summary for a period
function calculateExpenseSummary(period) {
    const expenses = getExpenses();
    const now = new Date();
    let total = 0;

    expenses.forEach(expense => {
        const expenseDate = new Date(expense.date);
        let include = false;

        switch (period) {
            case 'today':
                include = expenseDate.toDateString() === now.toDateString();
                break;
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                include = expenseDate >= weekAgo;
                break;
            case 'month':
                include = expenseDate.getMonth() === now.getMonth() &&
                    expenseDate.getFullYear() === now.getFullYear();
                break;
            case 'all':
                include = true;
                break;
        }

        if (include) {
            total += parseFloat(expense.amount);
        }
    });

    return total;
}

// Get category-wise breakdown
function getCategoryBreakdown() {
    const expenses = getExpenses();
    const breakdown = {};

    expenses.forEach(expense => {
        if (!breakdown[expense.category]) {
            breakdown[expense.category] = 0;
        }
        breakdown[expense.category] += parseFloat(expense.amount);
    });

    // Convert to array and sort by amount (descending)
    return Object.entries(breakdown)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
}

// Update expense summary cards
function updateExpenseSummaries() {
    const todayElement = document.getElementById('todayExpense');
    const weekElement = document.getElementById('weekExpense');
    const monthElement = document.getElementById('monthExpense');
    const totalElement = document.getElementById('totalExpense');

    if (todayElement) {
        todayElement.textContent = `₹${calculateExpenseSummary('today').toFixed(2)}`;
    }
    if (weekElement) {
        weekElement.textContent = `₹${calculateExpenseSummary('week').toFixed(2)}`;
    }
    if (monthElement) {
        monthElement.textContent = `₹${calculateExpenseSummary('month').toFixed(2)}`;
    }
    if (totalElement) {
        totalElement.textContent = `₹${calculateExpenseSummary('all').toFixed(2)}`;
    }
}

// Search expenses
function searchExpenses(query) {
    const expenses = getExpenses();
    const tbody = document.getElementById('expenseTableBody');

    if (!tbody) return;

    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) {
        loadExpenses();
        return;
    }

    const filtered = expenses.filter(expense => {
        return (
            expense.description.toLowerCase().includes(lowerQuery) ||
            expense.category.toLowerCase().includes(lowerQuery) ||
            (expense.paidTo && expense.paidTo.toLowerCase().includes(lowerQuery)) ||
            expense.paymentMethod.toLowerCase().includes(lowerQuery) ||
            expense.amount.toString().includes(lowerQuery) ||
            expense.date.includes(lowerQuery)
        );
    });

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: #999;">
                    No expenses found matching "${query}"
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(expense => `
        <tr>
            <td>${formatDate(expense.date)}</td>
            <td><span class="category-badge">${expense.category}</span></td>
            <td>${expense.description}</td>
            <td style="font-weight: 600; color: #e74c3c;">₹${parseFloat(expense.amount).toFixed(2)}</td>
            <td>${expense.paymentMethod}</td>
            <td>${expense.paidTo || '-'}</td>
            <td>
                <button class="btn-icon" onclick="openExpenseModal('${expense.id}')" title="Edit">
                    ✏️
                </button>
                <button class="btn-icon" onclick="deleteExpense('${expense.id}')" title="Delete">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

// Filter by category
function filterByCategory(category) {
    const expenses = getExpenses();
    const tbody = document.getElementById('expenseTableBody');

    if (!tbody) return;

    if (!category) {
        loadExpenses();
        return;
    }

    const filtered = expenses.filter(expense => expense.category === category);

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: #999;">
                    No expenses found in category "${category}"
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(expense => `
        <tr>
            <td>${formatDate(expense.date)}</td>
            <td><span class="category-badge">${expense.category}</span></td>
            <td>${expense.description}</td>
            <td style="font-weight: 600; color: #e74c3c;">₹${parseFloat(expense.amount).toFixed(2)}</td>
            <td>${expense.paymentMethod}</td>
            <td>${expense.paidTo || '-'}</td>
            <td>
                <button class="btn-icon" onclick="openExpenseModal('${expense.id}')" title="Edit">
                    ✏️
                </button>
                <button class="btn-icon" onclick="deleteExpense('${expense.id}')" title="Delete">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-IN', options);
}

// ================================
// EXPORT FUNCTIONALITY
// ================================

// Export expenses to Excel
function exportExpensesToExcel() {
    const expenses = getExpenses();

    if (expenses.length === 0) {
        showToast('❌ No expenses to export!', 'error');
        return;
    }

    // Prepare data for Excel
    const excelData = expenses.map(expense => ({
        'Date': formatDate(expense.date),
        'Category': expense.category,
        'Description': expense.description,
        'Amount (₹)': parseFloat(expense.amount).toFixed(2),
        'Payment Method': expense.paymentMethod,
        'Paid To': expense.paidTo || '-',
        'Notes': expense.notes || '-'
    }));

    // Add summary row
    const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    excelData.push({
        'Date': '',
        'Category': '',
        'Description': 'TOTAL',
        'Amount (₹)': totalAmount.toFixed(2),
        'Payment Method': '',
        'Paid To': '',
        'Notes': ''
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
        { wch: 12 }, // Date
        { wch: 15 }, // Category
        { wch: 30 }, // Description
        { wch: 12 }, // Amount
        { wch: 15 }, // Payment Method
        { wch: 20 }, // Paid To
        { wch: 25 }  // Notes
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

    // Generate filename with current date
    const filename = `Expenses-Report-${new Date().toISOString().split('T')[0]}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);
    showToast('✅ Expenses exported to Excel successfully!', 'success');
}

// Export expenses to PDF
function exportExpensesToPDF() {
    const expenses = getExpenses();

    if (expenses.length === 0) {
        showToast('❌ No expenses to export!', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Expense Report', 14, 20);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);

    // Calculate summary
    const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const todayTotal = calculateExpenseSummary('today');
    const monthTotal = calculateExpenseSummary('month');

    // Add summary section
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Summary', 14, 38);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Expenses: ₹${totalAmount.toFixed(2)}`, 14, 45);
    doc.text(`Today's Expenses: ₹${todayTotal.toFixed(2)}`, 14, 51);
    doc.text(`This Month: ₹${monthTotal.toFixed(2)}`, 14, 57);
    doc.text(`Total Records: ${expenses.length}`, 14, 63);

    // Prepare table data
    const tableData = expenses.map(expense => [
        formatDate(expense.date),
        expense.category,
        expense.description.substring(0, 30), // Truncate long descriptions
        `₹${parseFloat(expense.amount).toFixed(2)}`,
        expense.paymentMethod,
        expense.paidTo || '-'
    ]);

    // Add table
    doc.autoTable({
        startY: 70,
        head: [['Date', 'Category', 'Description', 'Amount', 'Payment', 'Paid To']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [102, 126, 234], fontStyle: 'bold' },
        columnStyles: {
            3: { halign: 'right', fontStyle: 'bold' }
        }
    });

    // Add category breakdown
    const categoryBreakdown = getCategoryBreakdown();
    if (categoryBreakdown.length > 0) {
        const finalY = doc.lastAutoTable.finalY + 10;

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Category Breakdown', 14, finalY);

        const categoryData = categoryBreakdown.map(item => [
            item.category,
            `₹${item.amount.toFixed(2)}`,
            `${((item.amount / totalAmount) * 100).toFixed(1)}%`
        ]);

        doc.autoTable({
            startY: finalY + 5,
            head: [['Category', 'Amount', 'Percentage']],
            body: categoryData,
            theme: 'striped',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [249, 115, 22] }
        });
    }

    // Save PDF
    const filename = `Expenses-Report-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    showToast('✅ Expenses exported to PDF successfully!', 'success');
}

// ================================
// RECURRING EXPENSE FUNCTIONALITY
// ================================

const RECURRING_EXPENSES_KEY = 'recurringExpenses';

// Get recurring expenses
function getRecurringExpenses() {
    const data = localStorage.getItem(RECURRING_EXPENSES_KEY);
    return data ? JSON.parse(data) : [];
}

// Save recurring expenses
function saveRecurringExpenses(recurring) {
    localStorage.setItem(RECURRING_EXPENSES_KEY, JSON.stringify(recurring));
}

// Check and generate recurring expenses on load
function checkAndGenerateRecurringExpenses() {
    const recurring = getRecurringExpenses();
    const expenses = getExpenses();
    const today = new Date();
    let generated = 0;

    recurring.forEach(template => {
        if (!template.isActive) return;

        const startDate = new Date(template.startDate);
        const endDate = template.endDate ? new Date(template.endDate) : null;

        // Check if we're within the active period
        if (today < startDate || (endDate && today > endDate)) return;

        // Find the last generated expense for this template
        const lastGenerated = expenses
            .filter(exp => exp.recurringId === template.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        const lastDate = lastGenerated ? new Date(lastGenerated.date) : new Date(startDate.getTime() - 1);

        // Calculate next occurrence
        const nextDate = calculateNextOccurrence(lastDate, template.frequency);

        // Generate missing expenses up to today
        const expensesToGenerate = [];
        let currentDate = new Date(nextDate);

        while (currentDate <= today && (!endDate || currentDate <= endDate)) {
            expensesToGenerate.push({
                id: `${template.id}-${currentDate.getTime()}`,
                date: currentDate.toISOString().split('T')[0],
                category: template.category,
                description: template.description,
                amount: template.amount,
                paymentMethod: template.paymentMethod,
                paidTo: template.paidTo,
                notes: `Auto-generated from recurring expense: ${template.description}`,
                isRecurring: true,
                recurringId: template.id,
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString()
            });

            currentDate = calculateNextOccurrence(currentDate, template.frequency);
            generated++;
        }

        if (expensesToGenerate.length > 0) {
            const allExpenses = [...expenses, ...expensesToGenerate];
            saveToExpenseStorage(allExpenses);
        }
    });

    if (generated > 0) {
        console.log(`Generated ${generated} recurring expense(s)`);
        loadExpenses();
        if (typeof updateExpenseDashboard === 'function') {
            updateExpenseDashboard();
        }
    }
}

// Calculate next occurrence based on frequency
function calculateNextOccurrence(fromDate, frequency) {
    const nextDate = new Date(fromDate);

    switch (frequency) {
        case 'Daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case 'Weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'Monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case 'Yearly':
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
    }

    return nextDate;
}

// Get analytics data for charts
function getMonthlyExpenseTrend(months = 12) {
    const expenses = getExpenses();
    const trend = {};
    const now = new Date();

    // Initialize last N months
    for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        trend[key] = 0;
    }

    // Aggregate expenses by month
    expenses.forEach(expense => {
        const date = new Date(expense.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (trend.hasOwnProperty(key)) {
            trend[key] += parseFloat(expense.amount);
        }
    });

    return trend;
}

// Get payment method distribution
function getPaymentMethodDistribution() {
    const expenses = getExpenses();
    const distribution = {};

    expenses.forEach(expense => {
        const method = expense.paymentMethod;
        if (!distribution[method]) {
            distribution[method] = 0;
        }
        distribution[method] += parseFloat(expense.amount);
    });

    return distribution;
}
