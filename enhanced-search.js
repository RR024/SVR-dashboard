// =========================================
// SVR Manufacturing - Enhanced Search Module
// =========================================

// Global search across all modules
function performGlobalSearch() {
    const query = document.getElementById('glob alSearchInput')?.value || '';

    if (query.length < 2) {
        showToast('Please enter at least 2 characters to search', 'warning');
        return;
    }

    const results = globalSearch(query);
    displaySearchResults(query, results);
}

// Display search results in modal
function displaySearchResults(query, results) {
    const modal = document.getElementById('searchResultsModal');
    if (!modal) {
        createSearchResultsModal();
    }

    const resultsContainer = document.getElementById('searchResultsContainer');
    const total = results.inwardInvoices.length + results.outwardInvoices.length +
        results.employees.length + results.attendance.length;

    let html = `
        <div style="margin-bottom: 1.5rem;">
            <h4>Search Results for "${query}"</h4>
            <p style="color: var(--text-secondary);">Found ${total} results</p>
        </div>
    `;

    // Sales Invoices
    if (results.outwardInvoices.length > 0) {
        html += `
            <div class="search-category" style="margin-bottom: 1.5rem;">
                <h5 style="color: var(--primary); margin-bottom: 0.75rem;">📤 Sales Invoices (${results.outwardInvoices.length})</h5>
                <div class="search-results-list">
        `;

        results.outwardInvoices.forEach(inv => {
            const statusBadge = inv.paymentStatus === 'Paid' ? 'success' :
                inv.paymentStatus === 'Pending' ? 'danger' : 'warning';
            html += `
                <div class="search-result-item" onclick="navigateToInvoice('outward', '${inv.id}')" style="padding: 0.75rem; background: var(--bg-tertiary); border-radius: var(--radius-md); margin-bottom: 0.5rem; cursor: pointer; transition: all 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${inv.invoiceNo}</strong> - ${inv.buyerName}
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">
                                ${formatDate(inv.date)} | ₹${parseFloat(inv.total || 0).toLocaleString('en-IN')}
                            </div>
                        </div>
                        <span class="badge badge-${statusBadge}">${inv.paymentStatus}</span>
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
    }

    // Purchase Invoices
    if (results.inwardInvoices.length > 0) {
        html += `
            <div class="search-category" style="margin-bottom: 1.5rem;">
                <h5 style="color: var(--primary); margin-bottom: 0.75rem;">📥 Purchase Invoices (${results.inwardInvoices.length})</h5>
                <div class="search-results-list">
        `;

        results.inwardInvoices.forEach(inv => {
            const statusBadge = inv.paymentStatus === 'Paid' ? 'success' :
                inv.paymentStatus === 'Pending' ? 'danger' : 'warning';
            html += `
                <div class="search-result-item" onclick="navigateToInvoice('inward', '${inv.id}')" style="padding: 0.75rem; background: var(--bg-tertiary); border-radius: var(--radius-md); margin-bottom: 0.5rem; cursor: pointer; transition: all 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${inv.invoiceNo}</strong> - ${inv.customer}
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">
                                ${formatDate(inv.date)} | ${inv.material} | ₹${parseFloat(inv.amount || 0).toLocaleString('en-IN')}
                            </div>
                        </div>
                        <span class="badge badge-${statusBadge}">${inv.paymentStatus}</span>
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
    }

    // Employees
    if (results.employees.length > 0) {
        html += `
            <div class="search-category" style="margin-bottom: 1.5rem;">
                <h5 style="color: var(--primary); margin-bottom: 0.75rem;">👥 Employees (${results.employees.length})</h5>
                <div class="search-results-list">
        `;

        results.employees.forEach(emp => {
            html += `
                <div class="search-result-item" onclick="navigateToEmployee('${emp.id}')" style="padding: 0.75rem; background: var(--bg-tertiary); border-radius: var(--radius-md); margin-bottom: 0.5rem; cursor: pointer; transition: all 0.2s;">
                    <div>
                        <strong>${emp.name}</strong> (${emp.empId})
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">
                            ${emp.designation} - ${emp.department}
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
    }

    // No results
    if (total === 0) {
        html = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                <h4>No results found for "${query}"</h4>
                <p>Try different keywords or check spelling</p>
            </div>
        `;
    }

    resultsContainer.innerHTML = html;
    document.getElementById('searchResultsModal').classList.add('active');
}

// Navigate to invoice from search results
function navigateToInvoice(type, invoiceId) {
    closeSearchModal();

    const moduleId = type === 'outward' ? 'outward-invoice' : 'inward-invoice';
    const navLink = document.querySelector(`.nav-link[data-module="${moduleId}"]`);

    if (navLink) {
        navLink.click();

        // Highlight the invoice row after a short delay
        setTimeout(() => {
            const row = document.querySelector(`button[onclick*="'${invoiceId}'"]`)?.closest('tr');
            if (row) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                row.style.background = 'rgba(102, 126, 234, 0.2)';
                setTimeout(() => {
                    row.style.background = '';
                }, 2000);
            }
        }, 300);
    }
}

// Navigate to employee from search results
function navigateToEmployee(empId) {
    closeSearchModal();

    const navLink = document.querySelector('.nav-link[data-module="hr-management"]');
    if (navLink) {
        navLink.click();
    }
}

// Close search modal
function closeSearchModal() {
    const modal = document.getElementById('searchResultsModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Create search results modal if it doesn't exist
function createSearchResultsModal() {
    const modalHtml = `
        <div id="searchResultsModal" class="modal" style="z-index: 9999;">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>Search Results</h3>
                    <button class="icon-btn" onclick="closeSearchModal()" style="margin-left: auto;">×</button>
                </div>
                <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
                    <div id="searchResultsContainer"></div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Initialize search on Enter key
function initializeGlobalSearch() {
    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                performGlobalSearch();
            }
        });
    }
}

// Add CSS for search result hover effects
const searchStyles = document.createElement('style');
searchStyles.textContent = `
    .search-result-item:hover {
        background: var(--bg-primary) !important;
        transform: translateX(4px);
    }
    
    .search-category h5 {
        border-bottom: 2px solid var(--primary);
        padding-bottom: 0.5rem;
        display: inline-block;
    }
`;
document.head.appendChild(searchStyles);

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGlobalSearch);
} else {
    initializeGlobalSearch();
}
