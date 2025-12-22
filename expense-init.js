// ================================
// INITIALIZATION FOR EXPENSE MODULE
// ================================

// Initialize expense charts and recurring expense check when expenses module is shown
document.addEventListener('DOMContentLoaded', function () {
    // Add event listeners for nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const module = this.getAttribute('data-module');

            // If switching to expenses module, initialize charts and check recurring
            if (module === 'expenses') {
                // Small delay to ensure module is visible
                setTimeout(() => {
                    if (typeof initializeExpenseCharts === 'function') {
                        initializeExpenseCharts();
                    }
                    if (typeof checkAndGenerateRecurringExpenses === 'function') {
                        checkAndGenerateRecurringExpenses();
                    }
                }, 100);
            }
        });
    });

    // Check if expenses module is active on load
    const expensesModule = document.getElementById('expenses');
    if (expensesModule && expensesModule.classList.contains('active')) {
        setTimeout(() => {
            if (typeof initializeExpenseCharts === 'function') {
                initializeExpenseCharts();
            }
            if (typeof checkAndGenerateRecurringExpenses === 'function') {
                checkAndGenerateRecurringExpenses();
            }
        }, 200);
    }
});
