// ================================
// INCOME TRACKING MODULE
// ================================

// Storage key
const INCOME_STORAGE_KEY = 'manufacturingIncome';

// Get all income entries from localStorage
function getIncomeEntries() {
    const data = localStorage.getItem(INCOME_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// Save income entries to localStorage
function saveToIncomeStorage(incomeEntries) {
    localStorage.setItem(INCOME_STORAGE_KEY, JSON.stringify(incomeEntries));
}

// Load and display all income entries
function loadIncomeEntries() {
    const incomeEntries = getIncomeEntries();
    const tbody = document.getElementById('incomeTableBody');

    if (!tbody) return;

    // Sort by date (newest first)
    incomeEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (incomeEntries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: #999;">
                    No income recorded yet. Click "Add Income" to get started.
                </td>
            </tr>
        `;
        updateIncomeSummaries();
        return;
    }

    tbody.innerHTML = incomeEntries.map(income => `
        <tr>
            <td>${formatDate(income.date)}</td>
            <td><span class="category-badge" style="background: #d4edda; color: #155724;">${income.category}</span></td>
            <td>${income.description}</td>
            <td style="font-weight: 600; color: #27ae60;">₹${parseFloat(income.amount).toFixed(2)}</td>
            <td>
                <span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem; font-weight: 600; background: ${income.status === 'Pending' ? '#fff3cd' : '#d4edda'}; color: ${income.status === 'Pending' ? '#856404' : '#155724'};">
                    ${income.status || 'Received'}
                </span>
            </td>
            <td>${income.receivedFrom || '-'}</td>
            <td>${income.paymentMethod}</td>
            <td>
                <button class="btn-icon" onclick="openIncomeModal('${income.id}')" title="Edit">
                    ✏️
                </button>
                <button class="btn-icon" onclick="deleteIncome('${income.id}')" title="Delete">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');

    // Update summary cards
    updateIncomeSummaries();
}

// Save income (add or edit)
function saveIncome() {
    const id = document.getElementById('incomeId').value;
    const date = document.getElementById('incomeDate').value;
    const category = document.getElementById('incomeCategory').value;
    const description = document.getElementById('incomeDescription').value;
    const amount = document.getElementById('incomeAmount').value;
    const paymentMethod = document.getElementById('incomePaymentMethod').value;
    const receivedFrom = document.getElementById('incomeReceivedFrom').value;
    const notes = document.getElementById('incomeNotes').value;
    const status = document.getElementById('incomeStatus').value;

    // Validation
    if (!date || !category || !description || !amount || !paymentMethod) {
        showToast('❌ Please fill all required fields!', 'error');
        return;
    }

    if (parseFloat(amount) <= 0) {
        showToast('❌ Amount must be greater than 0!', 'error');
        return;
    }

    const incomeData = {
        id: id || Date.now().toString(),
        date,
        category,
        description,
        amount: parseFloat(amount),
        paymentMethod,
        receivedFrom,
        notes,
        status,
        createdAt: id ? undefined : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const incomeEntries = getIncomeEntries();

    if (id) {
        // Edit existing
        const index = incomeEntries.findIndex(e => e.id === id);
        if (index !== -1) {
            incomeData.createdAt = incomeEntries[index].createdAt;
            incomeEntries[index] = incomeData;
        }
        showToast('✅ Income updated successfully!', 'success');
    } else {
        // Add new
        incomeEntries.push(incomeData);
        showToast('✅ Income added successfully!', 'success');
    }

    saveToIncomeStorage(incomeEntries);
    closeIncomeModal();
    loadIncomeEntries();
    updateNetBalance();
}

// Delete income entry
function deleteIncome(id) {
    if (!confirm('Are you sure you want to delete this income entry?')) {
        return;
    }

    const incomeEntries = getIncomeEntries();
    const filtered = incomeEntries.filter(e => e.id !== id);
    saveToIncomeStorage(filtered);

    showToast('🗑️ Income deleted successfully!', 'success');
    loadIncomeEntries();
    updateNetBalance();
}

// Open income modal
function openIncomeModal(id = null) {
    const modal = document.getElementById('incomeModal');
    const form = document.getElementById('incomeForm');
    const title = document.getElementById('incomeModalTitle');

    // Reset form
    form.reset();
    document.getElementById('incomeId').value = '';

    // Set default date to today
    document.getElementById('incomeDate').value = new Date().toISOString().split('T')[0];

    if (id) {
        // Edit mode
        title.textContent = 'Edit Income';
        const incomeEntries = getIncomeEntries();
        const income = incomeEntries.find(e => e.id === id);

        if (income) {
            document.getElementById('incomeId').value = income.id;
            document.getElementById('incomeDate').value = income.date;
            document.getElementById('incomeCategory').value = income.category;
            document.getElementById('incomeDescription').value = income.description;
            document.getElementById('incomeAmount').value = income.amount;
            document.getElementById('incomePaymentMethod').value = income.paymentMethod;
            document.getElementById('incomeReceivedFrom').value = income.receivedFrom || '';
            document.getElementById('incomeNotes').value = income.notes || '';
            document.getElementById('incomeStatus').value = income.status || 'Received';
        }
    } else {
        // Add mode
        title.textContent = 'Add Income';
    }

    modal.style.display = 'flex';
}

// Close income modal
function closeIncomeModal() {
    const modal = document.getElementById('incomeModal');
    modal.style.display = 'none';
}

// Update income summary cards
function updateIncomeSummaries() {
    const incomeEntries = getIncomeEntries();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    let todayIncome = 0;
    let weekIncome = 0;
    let monthIncome = 0;
    let totalIncome = 0;

    incomeEntries.forEach(income => {
        const incomeDate = new Date(income.date);
        incomeDate.setHours(0, 0, 0, 0);
        const amount = parseFloat(income.amount) || 0;

        totalIncome += amount;

        if (incomeDate.getTime() === today.getTime()) {
            todayIncome += amount;
        }

        if (incomeDate >= startOfWeek) {
            weekIncome += amount;
        }

        if (incomeDate >= startOfMonth) {
            monthIncome += amount;
        }
    });

    // Update DOM
    const todayEl = document.getElementById('todayIncome');
    const weekEl = document.getElementById('weekIncome');
    const monthEl = document.getElementById('monthIncome');
    const totalEl = document.getElementById('totalIncome');

    if (todayEl) todayEl.textContent = `₹${todayIncome.toFixed(2)}`;
    if (weekEl) weekEl.textContent = `₹${weekIncome.toFixed(2)}`;
    if (monthEl) monthEl.textContent = `₹${monthIncome.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `₹${totalIncome.toFixed(2)}`;

    updateNetBalance();
}

// Update net balance (Income - Expenses)
function updateNetBalance() {
    const incomeEntries = getIncomeEntries();
    const expenses = typeof getExpenses === 'function' ? getExpenses() : [];

    const totalIncome = incomeEntries.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const netBalance = totalIncome - totalExpenses;

    const netBalanceEl = document.getElementById('netBalance');
    if (netBalanceEl) {
        netBalanceEl.textContent = `₹${netBalance.toFixed(2)}`;
        netBalanceEl.style.color = netBalance >= 0 ? '#27ae60' : '#e74c3c';
    }
}

// Search income entries
function searchIncome(searchTerm) {
    const incomeEntries = getIncomeEntries();
    const tbody = document.getElementById('incomeTableBody');

    if (!tbody) return;

    const filtered = incomeEntries.filter(income =>
        income.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        income.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (income.receivedFrom && income.receivedFrom.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: #999;">
                    No income entries found matching "${searchTerm}"
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(income => `
        <tr>
            <td>${formatDate(income.date)}</td>
            <td><span class="category-badge" style="background: #d4edda; color: #155724;">${income.category}</span></td>
            <td>${income.description}</td>
            <td style="font-weight: 600; color: #27ae60;">₹${parseFloat(income.amount).toFixed(2)}</td>
            <td>
                <span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem; font-weight: 600; background: ${income.status === 'Pending' ? '#fff3cd' : '#d4edda'}; color: ${income.status === 'Pending' ? '#856404' : '#155724'};">
                    ${income.status || 'Received'}
                </span>
            </td>
            <td>${income.receivedFrom || '-'}</td>
            <td>${income.paymentMethod}</td>
            <td>
                <button class="btn-icon" onclick="openIncomeModal('${income.id}')" title="Edit">
                    ✏️
                </button>
                <button class="btn-icon" onclick="deleteIncome('${income.id}')" title="Delete">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

// Filter income by category
function filterIncomeByCategory(category) {
    const incomeEntries = getIncomeEntries();
    const tbody = document.getElementById('incomeTableBody');

    if (!tbody) return;

    const filtered = category ? incomeEntries.filter(i => i.category === category) : incomeEntries;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: #999;">
                    No income entries found for category "${category}"
                </td>
            </tr>
        `;
        return;
    }

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = filtered.map(income => `
        <tr>
            <td>${formatDate(income.date)}</td>
            <td><span class="category-badge" style="background: #d4edda; color: #155724;">${income.category}</span></td>
            <td>${income.description}</td>
            <td style="font-weight: 600; color: #27ae60;">₹${parseFloat(income.amount).toFixed(2)}</td>
            <td>
                <span style="padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem; font-weight: 600; background: ${income.status === 'Pending' ? '#fff3cd' : '#d4edda'}; color: ${income.status === 'Pending' ? '#856404' : '#155724'};">
                    ${income.status || 'Received'}
                </span>
            </td>
            <td>${income.receivedFrom || '-'}</td>
            <td>${income.paymentMethod}</td>
            <td>
                <button class="btn-icon" onclick="openIncomeModal('${income.id}')" title="Edit">
                    ✏️
                </button>
                <button class="btn-icon" onclick="deleteIncome('${income.id}')" title="Delete">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

// Export income to Excel
function exportIncomeToExcel() {
    const incomeEntries = getIncomeEntries();
    
    if (incomeEntries.length === 0) {
        showToast('❌ No income entries to export!', 'error');
        return;
    }

    // Prepare data for Excel
    let csvContent = "Date,Category,Description,Amount,Status,Received From,Payment Method,Notes\n";
    
    incomeEntries.forEach(income => {
        const row = [
            income.date,
            income.category,
            `"${income.description.replace(/"/g, '""')}"`,
            income.amount,
            income.status || 'Received',
            income.receivedFrom || '',
            income.paymentMethod,
            `"${(income.notes || '').replace(/"/g, '""')}"`
        ];
        csvContent += row.join(',') + '\n';
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `income_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('✅ Income exported to Excel successfully!', 'success');
}

// Initialize income module
function initIncomeModule() {
    loadIncomeEntries();
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize income entries if on the income section
    if (document.getElementById('incomeTableBody')) {
        loadIncomeEntries();
    }
});
