// ================================
// RECURRING EXPENSE MANAGEMENT
// ================================

// Load recurring expenses list
function loadRecurringExpensesList() {
    const recurring = getRecurringExpenses();
    const container = document.getElementById('recurringExpensesList');

    if (!container) return;

    if (recurring.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📅</div>
                <p>No recurring expenses set up yet.</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">Create recurring expenses for automatic expense tracking.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = recurring.map(template => {
        const nextDate = calculateNextOccurrence(new Date(), template.frequency);
        const isActive = template.isActive !== false;

        return `
            <div class="recurring-expense-card" style="
                background: ${isActive ? 'var(--bg-secondary)' : '#f5f5f5'};
                border: 2px solid ${isActive ? 'var(--primary)' : '#ddd'};
                border-radius: 10px;
                padding: 1.5rem;
                margin-bottom: 1rem;
                position: relative;
                ${!isActive ? 'opacity: 0.6;' : ''}
            ">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <h4 style="margin: 0; color: var(--text-primary);">${template.description}</h4>
                            ${!isActive ? '<span style="background: #dc3545; color: white; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem;">INACTIVE</span>' : ''}
                        </div>
                        <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">
                            <span style="font-weight: 600;">${template.category}</span> • 
                            <span style="color: var(--primary); font-weight: 700; font-size: 1.1rem;">₹${parseFloat(template.amount).toFixed(2)}</span>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.8rem; font-size: 0.85rem;">
                            <div>
                                <strong>Frequency:</strong> ${template.frequency}
                            </div>
                            <div>
                                <strong>Payment:</strong> ${template.paymentMethod}
                            </div>
                            <div>
                                <strong>Start Date:</strong> ${formatDate(template.startDate)}
                            </div>
                            ${template.endDate ? `<div><strong>End Date:</strong> ${formatDate(template.endDate)}</div>` : ''}
                            ${isActive ? `<div><strong>Next:</strong> <span style="color: var(--primary);">${formatDate(nextDate.toISOString().split('T')[0])}</span></div>` : ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; margin-left: 1rem;">
                        <button class="btn-icon" onclick="toggleRecurringExpense('${template.id}')" title="${isActive ? 'Deactivate' : 'Activate'}">
                            ${isActive ? '⏸️' : '▶️'}
                        </button>
                        <button class="btn-icon" onclick="editRecurringExpense('${template.id}')" title="Edit">
                            ✏️
                        </button>
                        <button class="btn-icon" onclick="deleteRecurringExpense('${template.id}')" title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Open recurring expense modal
function openRecurringExpenseModal(id = null) {
    const modal = document.getElementById('recurringExpenseModal');
    const form = modal.querySelector('form');

    // Reset form
    form.reset();
    document.getElementById('recurringExpenseId').value = '';
    document.getElementById('recurringIsActive').checked = true;

    if (id) {
        // Edit mode
        const template = getRecurringExpenses().find(t => t.id === id);
        if (template) {
            document.getElementById('recurringExpenseModalTitle').textContent = 'Edit Recurring Expense';
            document.getElementById('recurringExpenseId').value = template.id;
            document.getElementById('recurringDescription').value = template.description;
            document.getElementById('recurringCategory').value = template.category;
            document.getElementById('recurringAmount').value = template.amount;
            document.getElementById('recurringPaymentMethod').value = template.paymentMethod;
            document.getElementById('recurringPaidTo').value = template.paidTo || '';
            document.getElementById('recurringFrequency').value = template.frequency;
            document.getElementById('recurringStartDate').value = template.startDate;
            document.getElementById('recurringEndDate').value = template.endDate || '';
            document.getElementById('recurringIsActive').checked = template.isActive !== false;
        }
    } else {
        // New mode
        document.getElementById('recurringExpenseModalTitle').textContent = 'Add Recurring Expense';
        // Set default start date to today
        document.getElementById('recurringStartDate').valueAsDate = new Date();
    }

    modal.classList.add('active');
}

// Close recurring expense modal
function closeRecurringExpenseModal() {
    const modal = document.getElementById('recurringExpenseModal');
    modal.classList.remove('active');
}

// Save recurring expense template
function saveRecurringExpenseTemplate() {
    const id = document.getElementById('recurringExpenseId').value;
    const description = document.getElementById('recurringDescription').value;
    const category = document.getElementById('recurringCategory').value;
    const amount = document.getElementById('recurringAmount').value;
    const paymentMethod = document.getElementById('recurringPaymentMethod').value;
    const paidTo = document.getElementById('recurringPaidTo').value;
    const frequency = document.getElementById('recurringFrequency').value;
    const startDate = document.getElementById('recurringStartDate').value;
    const endDate = document.getElementById('recurringEndDate').value;
    const isActive = document.getElementById('recurringIsActive').checked;

    // Validation
    if (!description || !category || !amount || !paymentMethod || !frequency || !startDate) {
        showToast('❌ Please fill all required fields!', 'error');
        return;
    }

    if (parseFloat(amount) <= 0) {
        showToast('❌ Amount must be greater than 0!', 'error');
        return;
    }

    const templateData = {
        id: id || Date.now().toString(),
        description: description,
        category: category,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod,
        paidTo: paidTo,
        frequency: frequency,
        startDate: startDate,
        endDate: endDate,
        isActive: isActive,
        createdAt: id ? getRecurringExpenses().find(t => t.id === id)?.createdAt || new Date().toISOString() : new Date().toISOString(),
        lastModified: new Date().toISOString()
    };

    let recurring = getRecurringExpenses();

    if (id) {
        // Update existing
        recurring = recurring.map(t => t.id === id ? templateData : t);
        showToast('✅ Recurring expense updated successfully!', 'success');
    } else {
        // Add new
        recurring.push(templateData);
        showToast('✅ Recurring expense created successfully!', 'success');
    }

    saveRecurringExpenses(recurring);
    closeRecurringExpenseModal();
    loadRecurringExpensesList();

    // Generate expenses if needed
    checkAndGenerateRecurringExpenses();
}

// Edit recurring expense
function editRecurringExpense(id) {
    openRecurringExpenseModal(id);
}

// Delete recurring expense
function deleteRecurringExpense(id) {
    if (!confirm('Are you sure you want to delete this recurring expense? This will NOT delete already generated expenses.')) {
        return;
    }

    let recurring = getRecurringExpenses();
    recurring = recurring.filter(t => t.id !== id);

    saveRecurringExpenses(recurring);
    loadRecurringExpensesList();
    showToast('✅ Recurring expense deleted successfully!', 'success');
}

// Toggle recurring expense active state
function toggleRecurringExpense(id) {
    let recurring = getRecurringExpenses();
    recurring = recurring.map(t => {
        if (t.id === id) {
            t.isActive = !t.isActive;
            t.lastModified = new Date().toISOString();
        }
        return t;
    });

    saveRecurringExpenses(recurring);
    loadRecurringExpensesList();

    const template = recurring.find(t => t.id === id);
    const status = template.isActive ? 'activated' : 'deactivated';
    showToast(`✅ Recurring expense ${status}!`, 'success');
}

// Switch between tabs
function switchExpenseTab(tab) {
    const allExpensesTab = document.getElementById('allExpensesTab');
    const recurringTab = document.getElementById('recurringExpensesTab');
    const allExpensesContent = document.getElementById('allExpensesContent');
    const recurringContent = document.getElementById('recurringExpensesContent');

    if (tab === 'all') {
        allExpensesTab.classList.add('active');
        recurringTab.classList.remove('active');
        allExpensesContent.style.display = 'block';
        recurringContent.style.display = 'none';
    } else {
        allExpensesTab.classList.remove('active');
        recurringTab.classList.add('active');
        allExpensesContent.style.display = 'none';
        recurringContent.style.display = 'block';
        loadRecurringExpensesList();
    }
}
