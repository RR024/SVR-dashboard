// ================================
// EXPENSE ANALYTICS & CHARTS
// ================================

let expenseCharts = {
    trend: null,
    category: null,
    paymentMethod: null
};

// Initialize expense analytics charts
function initializeExpenseCharts() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
    }

    // Destroy existing charts to prevent memory leaks
    Object.values(expenseCharts).forEach(chart => {
        if (chart) chart.destroy();
    });

    createExpenseTrendChart();
    createExpenseCategoryChart();
    createPaymentMethodChart();
}

// Create monthly expense trend chart
function createExpenseTrendChart() {
    const canvas = document.getElementById('expenseTrendChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const trendData = getMonthlyExpenseTrend(12);

    const labels = Object.keys(trendData).map(key => {
        const [year, month] = key.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    });

    const data = Object.values(trendData);

    expenseCharts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Monthly Expenses',
                data: data,
                borderColor: 'rgb(102, 126, 234)',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: 'rgb(102, 126, 234)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    callbacks: {
                        label: function (context) {
                            return `₹${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return '₹' + value.toLocaleString('en-IN');
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Create category distribution pie chart
function createExpenseCategoryChart() {
    const canvas = document.getElementById('expenseCategoryChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const categoryData = getCategoryBreakdown();

    const labels = categoryData.map(item => item.category);
    const data = categoryData.map(item => item.amount);

    // Generate colors
    const colors = [
        'rgba(102, 126, 234, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(245, 158, 11, 0.8)'
    ];

    expenseCharts.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 3,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        font: { size: 12 },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    callbacks: {
                        label: function (context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ₹${context.parsed.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Create payment method bar chart
function createPaymentMethodChart() {
    const canvas = document.getElementById('paymentMethodChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const paymentData = getPaymentMethodDistribution();

    const labels = Object.keys(paymentData);
    const data = Object.values(paymentData);

    expenseCharts.paymentMethod = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Amount by Payment Method',
                data: data,
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(249, 115, 22, 0.8)',
                    'rgba(168, 85, 247, 0.8)',
                    'rgba(236, 72, 153, 0.8)'
                ],
                borderColor: [
                    'rgb(16, 185, 129)',
                    'rgb(59, 130, 246)',
                    'rgb(249, 115, 22)',
                    'rgb(168, 85, 247)',
                    'rgb(236, 72, 153)'
                ],
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    callbacks: {
                        label: function (context) {
                            return `₹${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return '₹' + value.toLocaleString('en-IN');
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Update all charts with current data
function updateExpenseCharts() {
    initializeExpenseCharts();
}
