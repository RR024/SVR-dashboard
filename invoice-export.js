// =========================================
// SVR Manufacturing - Invoice JSON Export Module
// =========================================
// This module provides JSON export functionality for Sales and Purchase Invoices

// ===================================
// SALES INVOICES (OUTWARD) EXPORT
// ===================================

/**
 * Export all outward (sales) invoices to JSON file
 */
function exportOutwardInvoicesToJSON() {
    try {
        // Get all outward invoices
        const outwardInvoices = typeof getOutwardInvoices === 'function' 
            ? getOutwardInvoices() 
            : JSON.parse(localStorage.getItem('outwardInvoices') || '[]');

        if (outwardInvoices.length === 0) {
            showToast('No sales invoices to export', 'warning');
            return;
        }

        // Prepare export data with metadata
        const exportData = {
            exportType: 'Sales Invoices (Outward)',
            exportDate: new Date().toISOString(),
            exportedBy: typeof getCurrentUser === 'function' 
                ? getCurrentUser()?.fullName || 'System' 
                : 'System',
            totalInvoices: outwardInvoices.length,
            totalAmount: outwardInvoices.reduce((sum, inv) => {
                const amount = parseFloat(inv.total) || parseFloat(inv.grandTotal) || parseFloat(inv.totalAmount) || 0;
                return sum + amount;
            }, 0),
            invoices: outwardInvoices.map(invoice => ({
                ...invoice,
                exportedAt: new Date().toISOString()
            }))
        };

        // Download the JSON file
        downloadJSON(exportData, 'sales-invoices');
        showToast(`✅ Exported ${outwardInvoices.length} sales invoices successfully!`, 'success');

    } catch (error) {
        console.error('Error exporting outward invoices:', error);
        showToast('Error exporting sales invoices: ' + error.message, 'error');
    }
}

// ===================================
// PURCHASE INVOICES (INWARD) EXPORT
// ===================================

/**
 * Export all inward (purchase) invoices to JSON file
 */
function exportInwardInvoicesToJSON() {
    try {
        // Get all inward invoices
        const inwardInvoices = typeof getInwardInvoices === 'function' 
            ? getInwardInvoices() 
            : JSON.parse(localStorage.getItem('inwardInvoices') || '[]');

        if (inwardInvoices.length === 0) {
            showToast('No purchase invoices to export', 'warning');
            return;
        }

        // Prepare export data with metadata
        const exportData = {
            exportType: 'Purchase Invoices (Inward)',
            exportDate: new Date().toISOString(),
            exportedBy: typeof getCurrentUser === 'function' 
                ? getCurrentUser()?.fullName || 'System' 
                : 'System',
            totalInvoices: inwardInvoices.length,
            totalAmount: inwardInvoices.reduce((sum, inv) => {
                const amount = parseFloat(inv.amount) || parseFloat(inv.total) || parseFloat(inv.totalAmount) || 0;
                return sum + amount;
            }, 0),
            invoices: inwardInvoices.map(invoice => ({
                ...invoice,
                exportedAt: new Date().toISOString()
            }))
        };

        // Download the JSON file
        downloadJSON(exportData, 'purchase-invoices');
        showToast(`✅ Exported ${inwardInvoices.length} purchase invoices successfully!`, 'success');

    } catch (error) {
        console.error('Error exporting inward invoices:', error);
        showToast('Error exporting purchase invoices: ' + error.message, 'error');
    }
}

// ===================================
// FILTERED INVOICES EXPORT
// ===================================

/**
 * Export filtered outward invoices to JSON
 * @param {Array} filteredInvoices - Array of filtered invoices
 * @param {string} filterDescription - Description of the filter applied
 */
function exportFilteredOutwardInvoicesToJSON(filteredInvoices, filterDescription = '') {
    try {
        if (!filteredInvoices || filteredInvoices.length === 0) {
            showToast('No filtered invoices to export', 'warning');
            return;
        }

        const exportData = {
            exportType: 'Filtered Sales Invoices (Outward)',
            exportDate: new Date().toISOString(),
            exportedBy: typeof getCurrentUser === 'function' 
                ? getCurrentUser()?.fullName || 'System' 
                : 'System',
            filterDescription: filterDescription,
            totalInvoices: filteredInvoices.length,
            totalAmount: filteredInvoices.reduce((sum, inv) => {
                const amount = parseFloat(inv.total) || parseFloat(inv.grandTotal) || parseFloat(inv.totalAmount) || 0;
                return sum + amount;
            }, 0),
            invoices: filteredInvoices.map(invoice => ({
                ...invoice,
                exportedAt: new Date().toISOString()
            }))
        };

        downloadJSON(exportData, 'filtered-sales-invoices');
        showToast(`✅ Exported ${filteredInvoices.length} filtered sales invoices successfully!`, 'success');

    } catch (error) {
        console.error('Error exporting filtered outward invoices:', error);
        showToast('Error exporting filtered sales invoices: ' + error.message, 'error');
    }
}

/**
 * Export filtered inward invoices to JSON
 * @param {Array} filteredInvoices - Array of filtered invoices
 * @param {string} filterDescription - Description of the filter applied
 */
function exportFilteredInwardInvoicesToJSON(filteredInvoices, filterDescription = '') {
    try {
        if (!filteredInvoices || filteredInvoices.length === 0) {
            showToast('No filtered invoices to export', 'warning');
            return;
        }

        const exportData = {
            exportType: 'Filtered Purchase Invoices (Inward)',
            exportDate: new Date().toISOString(),
            exportedBy: typeof getCurrentUser === 'function' 
                ? getCurrentUser()?.fullName || 'System' 
                : 'System',
            filterDescription: filterDescription,
            totalInvoices: filteredInvoices.length,
            totalAmount: filteredInvoices.reduce((sum, inv) => {
                const amount = parseFloat(inv.amount) || parseFloat(inv.total) || parseFloat(inv.totalAmount) || 0;
                return sum + amount;
            }, 0),
            invoices: filteredInvoices.map(invoice => ({
                ...invoice,
                exportedAt: new Date().toISOString()
            }))
        };

        downloadJSON(exportData, 'filtered-purchase-invoices');
        showToast(`✅ Exported ${filteredInvoices.length} filtered purchase invoices successfully!`, 'success');

    } catch (error) {
        console.error('Error exporting filtered inward invoices:', error);
        showToast('Error exporting filtered purchase invoices: ' + error.message, 'error');
    }
}

// ===================================
// DATE RANGE EXPORT
// ===================================

/**
 * Export outward invoices for a specific date range as JSON
 * @param {string} startDate - Start date (YYYY-MM-DD format)
 * @param {string} endDate - End date (YYYY-MM-DD format)
 */
function exportOutwardInvoicesByDateRange(startDate, endDate) {
    try {
        const allInvoices = typeof getOutwardInvoices === 'function' 
            ? getOutwardInvoices() 
            : JSON.parse(localStorage.getItem('outwardInvoices') || '[]');

        const filteredInvoices = allInvoices.filter(invoice => {
            const invoiceDate = new Date(invoice.date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            return invoiceDate >= start && invoiceDate <= end;
        });

        const filterDescription = `Date range: ${startDate} to ${endDate}`;
        exportFilteredOutwardInvoicesToJSON(filteredInvoices, filterDescription);

    } catch (error) {
        console.error('Error exporting outward invoices by date range:', error);
        showToast('Error exporting invoices: ' + error.message, 'error');
    }
}

/**
 * Export inward invoices for a specific date range as JSON
 * @param {string} startDate - Start date (YYYY-MM-DD format)
 * @param {string} endDate - End date (YYYY-MM-DD format)
 */
function exportInwardInvoicesByDateRange(startDate, endDate) {
    try {
        const allInvoices = typeof getInwardInvoices === 'function' 
            ? getInwardInvoices() 
            : JSON.parse(localStorage.getItem('inwardInvoices') || '[]');

        const filteredInvoices = allInvoices.filter(invoice => {
            const invoiceDate = new Date(invoice.inwardDate || invoice.date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            return invoiceDate >= start && invoiceDate <= end;
        });

        const filterDescription = `Date range: ${startDate} to ${endDate}`;
        exportFilteredInwardInvoicesToJSON(filteredInvoices, filterDescription);

    } catch (error) {
        console.error('Error exporting inward invoices by date range:', error);
        showToast('Error exporting invoices: ' + error.message, 'error');
    }
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Download JSON data as a file
 * @param {Object} data - Data to export
 * @param {string} filename - Base filename (without extension)
 */
function downloadJSON(data, filename) {
    try {
        // Create a blob with the JSON data
        const jsonString = JSON.stringify(data, null, 2); // Pretty print with 2-space indentation
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Create a temporary URL for the blob
        const url = URL.createObjectURL(blob);

        // Create a temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = url;
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
        const time = new Date().toISOString().slice(11, 19).replace(/:/g, '-'); // HH-MM-SS format
        link.download = `${filename}_${timestamp}_${time}.json`;

        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the URL object
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error downloading JSON file:', error);
        throw new Error('Failed to download JSON file: ' + error.message);
    }
}

/**
 * Generate a formatted summary of invoices
 * @param {Array} invoices - Array of invoices
 * @param {string} type - Type of invoices ('outward' or 'inward')
 * @returns {string} - Summary string
 */
function generateInvoiceSummary(invoices, type = 'outward') {
    const totalAmount = invoices.reduce((sum, inv) => {
        const amount = type === 'outward' 
            ? (parseFloat(inv.total) || parseFloat(inv.grandTotal) || parseFloat(inv.totalAmount) || 0)
            : (parseFloat(inv.amount) || parseFloat(inv.total) || parseFloat(inv.totalAmount) || 0);
        return sum + amount;
    }, 0);

    const paidCount = invoices.filter(inv => inv.paymentStatus === 'Paid').length;
    const pendingCount = invoices.filter(inv => inv.paymentStatus !== 'Paid').length;

    return {
        totalInvoices: invoices.length,
        totalAmount: totalAmount,
        paidInvoices: paidCount,
        pendingInvoices: pendingCount,
        averageAmount: invoices.length > 0 ? (totalAmount / invoices.length).toFixed(2) : 0
    };
}

/**
 * Export invoice summary statistics to JSON
 * @param {string} type - Type: 'outward' or 'inward'
 */
function exportInvoiceSummaryStatistics(type = 'outward') {
    try {
        const invoices = type === 'outward' 
            ? (typeof getOutwardInvoices === 'function' ? getOutwardInvoices() : JSON.parse(localStorage.getItem('outwardInvoices') || '[]'))
            : (typeof getInwardInvoices === 'function' ? getInwardInvoices() : JSON.parse(localStorage.getItem('inwardInvoices') || '[]'));

        if (invoices.length === 0) {
            showToast('No invoices to generate summary for', 'warning');
            return;
        }

        const summary = generateInvoiceSummary(invoices, type);
        const invoiceType = type === 'outward' ? 'Sales' : 'Purchase';

        const exportData = {
            reportType: `${invoiceType} Invoices Summary Report`,
            generatedDate: new Date().toISOString(),
            generatedBy: typeof getCurrentUser === 'function' 
                ? getCurrentUser()?.fullName || 'System' 
                : 'System',
            summary: summary,
            invoiceType: invoiceType
        };

        downloadJSON(exportData, `${type}-invoices-summary`);
        showToast(`✅ Exported ${invoiceType.toLowerCase()} invoices summary successfully!`, 'success');

    } catch (error) {
        console.error('Error exporting invoice summary:', error);
        showToast('Error exporting summary: ' + error.message, 'error');
    }
}

// ===================================
// BULK OPERATIONS
// ===================================

/**
 * Export both sales and purchase invoices together
 */
function exportAllInvoicesToJSON() {
    try {
        const outwardInvoices = typeof getOutwardInvoices === 'function' 
            ? getOutwardInvoices() 
            : JSON.parse(localStorage.getItem('outwardInvoices') || '[]');

        const inwardInvoices = typeof getInwardInvoices === 'function' 
            ? getInwardInvoices() 
            : JSON.parse(localStorage.getItem('inwardInvoices') || '[]');

        const totalOutwardAmount = outwardInvoices.reduce((sum, inv) => {
            const amount = parseFloat(inv.total) || parseFloat(inv.grandTotal) || parseFloat(inv.totalAmount) || 0;
            return sum + amount;
        }, 0);

        const totalInwardAmount = inwardInvoices.reduce((sum, inv) => {
            const amount = parseFloat(inv.amount) || parseFloat(inv.total) || parseFloat(inv.totalAmount) || 0;
            return sum + amount;
        }, 0);

        if (outwardInvoices.length === 0 && inwardInvoices.length === 0) {
            showToast('No invoices to export', 'warning');
            return;
        }

        const exportData = {
            exportType: 'Complete Invoice Export',
            exportDate: new Date().toISOString(),
            exportedBy: typeof getCurrentUser === 'function' 
                ? getCurrentUser()?.fullName || 'System' 
                : 'System',
            summary: {
                totalSalesInvoices: outwardInvoices.length,
                totalSalesAmount: totalOutwardAmount,
                totalPurchaseInvoices: inwardInvoices.length,
                totalPurchaseAmount: totalInwardAmount,
                netAmount: totalOutwardAmount - totalInwardAmount
            },
            salesInvoices: outwardInvoices.map(invoice => ({
                ...invoice,
                exportedAt: new Date().toISOString()
            })),
            purchaseInvoices: inwardInvoices.map(invoice => ({
                ...invoice,
                exportedAt: new Date().toISOString()
            }))
        };

        downloadJSON(exportData, 'all-invoices');
        const totalCount = outwardInvoices.length + inwardInvoices.length;
        showToast(`✅ Exported all ${totalCount} invoices successfully!`, 'success');

    } catch (error) {
        console.error('Error exporting all invoices:', error);
        showToast('Error exporting invoices: ' + error.message, 'error');
    }
}

// Make functions available globally
window.exportOutwardInvoicesToJSON = exportOutwardInvoicesToJSON;
window.exportInwardInvoicesToJSON = exportInwardInvoicesToJSON;
window.exportFilteredOutwardInvoicesToJSON = exportFilteredOutwardInvoicesToJSON;
window.exportFilteredInwardInvoicesToJSON = exportFilteredInwardInvoicesToJSON;
window.exportOutwardInvoicesByDateRange = exportOutwardInvoicesByDateRange;
window.exportInwardInvoicesByDateRange = exportInwardInvoicesByDateRange;
window.exportInvoiceSummaryStatistics = exportInvoiceSummaryStatistics;
window.exportAllInvoicesToJSON = exportAllInvoicesToJSON;
window.generateInvoiceSummary = generateInvoiceSummary;
