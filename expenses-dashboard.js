// Update expense summary on dashboard
function updateExpenseDashboard() {
    const container = document.getElementById('expenseDashboardSummary');

    if (!container || typeof getExpenses !== 'function') {
        return;
    }

    const expenses = getExpenses();

    if (expenses.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No expenses recorded yet.</p>';
        return;
    }

    // Calculate today's expenses
    const today = new Date().toDateString();
    const todayExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.toDateString() === today;
    });

    const todayTotal = todayExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);

    // Get top category for today
    const categoryTotals = {};
    todayExpenses.forEach(exp => {
        if (!categoryTotals[exp.category]) {
            categoryTotals[exp.category] = 0;
        }
        categoryTotals[exp.category] += parseFloat(exp.amount || 0);
    });

    const topCategory = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])[0];

    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.5rem; border-radius: 10px; color: white;">
                <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">Today's Total</div>
                <div style="font-size: 2rem; font-weight: bold;">₹${todayTotal.toFixed(2)}</div>
                <div style="font-size: 0.85rem; margin-top: 0.5rem;">${todayExpenses.length} expense(s)</div>
            </div>
    `;

    if (topCategory) {
        html += `
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 1.5rem; border-radius: 10px; color: white;">
                <div style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 0.5rem;">Top Category</div>
                <div style="font-size: 1.25rem; font-weight: bold; margin-bottom: 0.25rem;">${topCategory[0]}</div>
                <div style="font-size: 1.5rem; font-weight: bold;">₹${topCategory[1].toFixed(2)}</div>
            </div>
        `;
    } else {
        html += `
            <div style="background: #f0f0f0; padding: 1.5rem; border-radius: 10px; text-align: center; display: flex; align-items: center; justify-content: center;">
                <p style="margin: 0; color: #999;">No expenses today</p>
            </div>
        `;
    }

    html += '</div>';

    container.innerHTML = html;
}
