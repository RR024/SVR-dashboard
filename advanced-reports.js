// ===================================
// ADVANCED REPORTING SYSTEM
// ===================================

/**
 * Advanced business reports for SVR Dashboard
 * - Profit/Loss  
 * - GST Reports
 * - Year-over-Year comparisons
 * - Custom date range reports
 */

/**
 * Generate Profit & Loss Report
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Object} - P&L report data
 */
function generateProfitLossReport(startDate, endDate) {
    try {
        // Get data for period
        const sales = getOutwardInvoicesBetween(startDate, endDate);
        const purchases = getInwardInvoicesBetween(startDate, endDate);
        const expenses = getExpensesBetween(startDate, endDate);

        // Calculate totals
        const totalSales = sales.reduce((sum, inv) =>
            sum + (parseFloat(inv.amount) || 0), 0);

        const totalPurchases = purchases.reduce((sum, inv) =>
            sum + (parseFloat(inv.amount) || 0), 0);

        const totalExpenses = expenses.reduce((sum, exp) =>
            sum + (parseFloat(exp.amount) || 0), 0);

        // Calculate profits
        const grossProfit = totalSales - totalPurchases;
        const netProfit = grossProfit - totalExpenses;
        const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

        return {
            period: { start: startDate, end: endDate },
            revenue: {
                sales: totalSales,
                count: sales.length
            },
            costs: {
                purchases: totalPurchases,
                expenses: totalExpenses,
                total: totalPurchases + totalExpenses
            },
            profit: {
                gross: grossProfit,
                net: netProfit,
                margin: profitMargin
            },
            summary: {
                status: netProfit >= 0 ? 'profit' : 'loss',
                amount: Math.abs(netProfit)
            }
        };
    } catch (error) {
        handleError(error, 'generateProfitLossReport');
        return null;
    }
}

/**
 * Generate GST Report for filing
 * @param {string} month - Month (YYYY-MM)
 * @returns {Object} - GST report data
 */
function generateGSTReport(month) {
    try {
        const startDate = `${month}-01`;
        const endDate = `${month}-31`;

        const outwardInvoices = getOutwardInvoicesBetween(startDate, endDate);
        const inwardInvoices = getInwardInvoicesBetween(startDate, endDate);

        // Outward (Sales) GST
        const outwardGST = outwardInvoices.reduce((acc, inv) => ({
            taxableValue: acc.taxableValue + (parseFloat(inv.taxableValue) || 0),
            cgst: acc.cgst + (parseFloat(inv.cgst) || 0),
            sgst: acc.sgst + (parseFloat(inv.sgst) || 0),
            count: acc.count + 1
        }), { taxableValue: 0, cgst: 0, sgst: 0, count: 0 });

        outwardGST.total = outwardGST.cgst + outwardGST.sgst;

        // Inward (Purchase) GST
        const inwardGST = inwardInvoices.reduce((acc, inv) => ({
            taxableValue: acc.taxableValue + (parseFloat(inv.taxableValue) || 0),
            cgst: acc.cgst + (parseFloat(inv.cgst) || 0),
            sgst: acc.sgst + (parseFloat(inv.sgst) || 0),
            count: acc.count + 1
        }), { taxableValue: 0, cgst: 0, sgst: 0, count: 0 });

        inwardGST.total = inwardGST.cgst + inwardGST.sgst;

        // Net GST Liability
        const netGST = outwardGST.total - inwardGST.total;

        return {
            month,
            outward: outwardGST,
            inward: inwardGST,
            netLiability: netGST,
            status: netGST >= 0 ? 'payable' : 'refundable'
        };
    } catch (error) {
        handleError(error, 'generateGSTReport');
        return null;
    }
}

/**
 * Generate Year-over-Year Comparison
 * @param {number} year - Year to compare
 * @returns {Array} - Monthly YoY data
 */
function generateYoYReport(year) {
    try {
        const currentYear = year;
        const previousYear = year - 1;

        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

        const report = months.map((monthName, index) => {
            const monthNum = String(index + 1).padStart(2, '0');

            // Current year data
            const currentMonth = `${currentYear}-${monthNum}`;
            const currentSales = getMonthlySales(currentMonth);

            // Previous year data
            const previousMonth = `${previousYear}-${monthNum}`;
            const previousSales = getMonthlySales(previousMonth);

            // Calculate growth
            const growth = previousSales > 0
                ? ((currentSales - previousSales) / previousSales) * 100
                : 0;

            return {
                month: monthName,
                current: currentSales,
                previous: previousSales,
                growth: growth,
                trend: growth >= 0 ? 'up' : 'down'
            };
        });

        return report;
    } catch (error) {
        handleError(error, 'generateYoYReport');
        return [];
    }
}

/**
 * Get monthly sales total
 */
function getMonthlySales(month) {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;
    const invoices = getOutwardInvoicesBetween(startDate, endDate);
    return invoices.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
}

/**
 * Get invoices between dates
 */
function getOutwardInvoicesBetween(startDate, endDate) {
    const invoices = JSON.parse(localStorage.getItem('outwardInvoices') || '[]');
    return invoices.filter(inv => {
        const invDate = inv.date;
        return invDate >= startDate && invDate <= endDate;
    });
}

function getInwardInvoicesBetween(startDate, endDate) {
    const invoices = JSON.parse(localStorage.getItem('inwardInvoices') || '[]');
    return invoices.filter(inv => {
        const invDate = inv.date;
        return invDate >= startDate && invDate <= endDate;
    });
}

function getExpensesBetween(startDate, endDate) {
    const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
    return expenses.filter(exp => {
        const expDate = exp.date;
        return expDate >= startDate && expDate <= endDate;
    });
}

/**
 * Generate custom date range report
 */
function generateCustomReport(startDate, endDate, includeDetails = false) {
    try {
        const sales = getOutwardInvoicesBetween(startDate, endDate);
        const purchases = getInwardInvoicesBetween(startDate, endDate);
        const expenses = getExpensesBetween(startDate, endDate);

        const report = {
            period: { start: startDate, end: endDate },
            sales: {
                total: sales.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0),
                count: sales.length,
                details: includeDetails ? sales : undefined
            },
            purchases: {
                total: purchases.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0),
                count: purchases.length,
                details: includeDetails ? purchases : undefined
            },
            expenses: {
                total: expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0),
                count: expenses.length,
                details: includeDetails ? expenses : undefined
            }
        };

        report.profit = report.sales.total - report.purchases.total - report.expenses.total;

        return report;
    } catch (error) {
        handleError(error, 'generateCustomReport');
        return null;
    }
}

/**
 * Export report to CSV
 */
function exportReportToCSV(reportData, reportType, filename) {
    try {
        let csv = '';

        if (reportType === 'profit-loss') {
            csv = `Profit & Loss Report - ${reportData.period.start} to ${reportData.period.end}\n\n`;
            csv += `Category,Amount\n`;
            csv += `Sales,${reportData.revenue.sales}\n`;
            csv += `Purchases,${reportData.costs.purchases}\n`;
            csv += `Expenses,${reportData.costs.expenses}\n`;
            csv += `Gross Profit,${reportData.profit.gross}\n`;
            csv += `Net Profit,${reportData.profit.net}\n`;
            csv += `Profit Margin,${reportData.profit.margin.toFixed(2)}%\n`;
        } else if (reportType === 'gst') {
            csv = `GST Report - ${reportData.month}\n\n`;
            csv += `Type,Taxable Value,CGST,SGST,Total GST,Count\n`;
            csv += `Outward,${reportData.outward.taxableValue},${reportData.outward.cgst},${reportData.outward.sgst},${reportData.outward.total},${reportData.outward.count}\n`;
            csv += `Inward,${reportData.inward.taxableValue},${reportData.inward.cgst},${reportData.inward.sgst},${reportData.inward.total},${reportData.inward.count}\n`;
            csv += `Net Liability,,,${reportData.netLiability}\n`;
        }

        // Create download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `${reportType}_report.csv`;
        a.click();

        showSuccessNotification('Report exported successfully!');
    } catch (error) {
        handleError(error, 'exportReportToCSV');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateProfitLossReport,
        generateGSTReport,
        generateYoYReport,
        generateCustomReport,
        exportReportToCSV
    };
}
