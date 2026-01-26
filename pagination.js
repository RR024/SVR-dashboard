// ===================================
// PAGINATION UTILITY
// ===================================

/**
 * Pagination system for SVR Dashboard tables
 * Provides configurable page size and navigation
 */

// Store pagination state for each table
const paginationState = {};

/**
 * Create pagination for a table
 * @param {string} tableId - ID of the table
 * @param {Array} data - Full dataset
 * @param {Function} renderFunction - Function to render table rows
 * @param {number} pageSize - Items per page (default: 25)
 */
function createPagination(tableId, data, renderFunction, pageSize = 25) {
    // Initialize state
    paginationState[tableId] = {
        data: data,
        renderFunction: renderFunction,
        currentPage: 1,
        pageSize: pageSize,
        totalPages: Math.ceil(data.length / pageSize) || 1
    };

    // Render first page
    renderPage(tableId);

    // Create pagination controls
    createPaginationControls(tableId);
}

/**
 * Render current page
 */
function renderPage(tableId) {
    const state = paginationState[tableId];
    if (!state) return;

    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = startIndex + state.pageSize;
    const pageData = state.data.slice(startIndex, endIndex);

    // Render the page data
    state.renderFunction(pageData);

    // Update pagination controls
    updatePaginationControls(tableId);
}

/**
 * Create pagination controls HTML
 */
function createPaginationControls(tableId) {
    const state = paginationState[tableId];
    if (!state) return;

    // Find table container
    const table = document.getElementById(tableId);
    if (!table) return;

    const container = table.closest('.table-container') || table.parentElement;

    // Remove existing pagination
    const existing = container.querySelector('.pagination-container');
    if (existing) existing.remove();

    // Create pagination container
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination-container';
    paginationDiv.id = `pagination-${tableId}`;

    paginationDiv.innerHTML = `
        <div class="pagination-info">
            Showing <span class="page-start">1</span>-<span class="page-end">${state.pageSize}</span> 
            of <span class="page-total">${state.data.length}</span> entries
        </div>
        <div class="pagination-controls">
            <select class="page-size-select" onchange="changePageSize('${tableId}', this.value)">
                <option value="10" ${state.pageSize === 10 ? 'selected' : ''}>10</option>
                <option value="25" ${state.pageSize === 25 ? 'selected' : ''}>25</option>
                <option value="50" ${state.pageSize === 50 ? 'selected' : ''}>50</option>
                <option value="100" ${state.pageSize === 100 ? 'selected' : ''}>100</option>
            </select>
            <button class="page-btn" onclick="goToPage('${tableId}', 1)" title="First Page">
                ⏮️ First
            </button>
            <button class="page-btn" onclick="goToPage('${tableId}', ${state.currentPage - 1})" title="Previous Page">
                ◀️ Prev
            </button>
            <span class="page-numbers" id="pageNumbers-${tableId}">
                <!-- Page numbers will be inserted here -->
            </span>
            <button class="page-btn" onclick="goToPage('${tableId}', ${state.currentPage + 1})" title="Next Page">
                Next ▶️
            </button>
            <button class="page-btn" onclick="goToPage('${tableId}', ${state.totalPages})" title="Last Page">
                Last ⏭️
            </button>
        </div>
    `;

    // Insert after table
    container.appendChild(paginationDiv);

    // Update controls
    updatePaginationControls(tableId);
}

/**
 * Update pagination controls state
 */
function updatePaginationControls(tableId) {
    const state = paginationState[tableId];
    if (!state) return;

    const container = document.getElementById(`pagination-${tableId}`);
    if (!container) return;

    // Calculate display values
    const startIndex = (state.currentPage - 1) * state.pageSize + 1;
    const endIndex = Math.min(state.currentPage * state.pageSize, state.data.length);

    // Update info
    container.querySelector('.page-start').textContent = state.data.length > 0 ? startIndex : 0;
    container.querySelector('.page-end').textContent = endIndex;
    container.querySelector('.page-total').textContent = state.data.length;

    // Update buttons state
    const buttons = container.querySelectorAll('.page-btn');
    buttons[0].disabled = state.currentPage === 1; // First
    buttons[1].disabled = state.currentPage === 1; // Previous
    buttons[2].disabled = state.currentPage === state.totalPages; // Next
    buttons[3].disabled = state.currentPage === state.totalPages; // Last

    // Update page numbers
    updatePageNumbers(tableId);
}

/**
 * Update page number buttons
 */
function updatePageNumbers(tableId) {
    const state = paginationState[tableId];
    if (!state) return;

    const pageNumbersContainer = document.getElementById(`pageNumbers-${tableId}`);
    if (!pageNumbersContainer) return;

    let html = '';

    // Show max 7 page numbers
    const maxVisible = 7;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(state.totalPages, startPage + maxVisible - 1);

    // Adjust if at the end
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // Add first page if not visible
    if (startPage > 1) {
        html += `<button class="page-num" onclick="goToPage('${tableId}', 1)">1</button>`;
        if (startPage > 2) {
            html += `<span class="page-ellipsis">...</span>`;
        }
    }

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === state.currentPage ? 'active' : '';
        html += `<button class="page-num ${activeClass}" onclick="goToPage('${tableId}', ${i})">${i}</button>`;
    }

    // Add last page if not visible
    if (endPage < state.totalPages) {
        if (endPage < state.totalPages - 1) {
            html += `<span class="page-ellipsis">...</span>`;
        }
        html += `<button class="page-num" onclick="goToPage('${tableId}', ${state.totalPages})">${state.totalPages}</button>`;
    }

    pageNumbersContainer.innerHTML = html;
}

/**
 * Go to specific page
 */
function goToPage(tableId, pageNumber) {
    const state = paginationState[tableId];
    if (!state) return;

    // Validate page number
    pageNumber = parseInt(pageNumber);
    if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > state.totalPages) {
        return;
    }

    state.currentPage = pageNumber;
    renderPage(tableId);
}

/**
 * Change page size
 */
function changePageSize(tableId, newSize) {
    const state = paginationState[tableId];
    if (!state) return;

    state.pageSize = parseInt(newSize);
    state.totalPages = Math.ceil(state.data.length / state.pageSize) || 1;

    // Adjust current page if necessary
    if (state.currentPage > state.totalPages) {
        state.currentPage = state.totalPages;
    }

    renderPage(tableId);
    createPaginationControls(tableId);
}

/**
 * Update pagination data (when data changes)
 */
function updatePaginationData(tableId, newData) {
    const state = paginationState[tableId];
    if (!state) return;

    state.data = newData;
    state.totalPages = Math.ceil(newData.length / state.pageSize) || 1;

    // Reset to first page
    state.currentPage = 1;

    renderPage(tableId);
}

/**
 * Get current page data
 */
function getCurrentPageData(tableId) {
    const state = paginationState[tableId];
    if (!state) return [];

    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = startIndex + state.pageSize;
    return state.data.slice(startIndex, endIndex);
}

/**
 * Get pagination state
 */
function getPaginationState(tableId) {
    return paginationState[tableId];
}

/**
 * Destroy pagination (cleanup)
 */
function destroyPagination(tableId) {
    const container = document.getElementById(`pagination-${tableId}`);
    if (container) {
        container.remove();
    }
    delete paginationState[tableId];
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createPagination,
        goToPage,
        changePageSize,
        updatePaginationData,
        getCurrentPageData,
        getPaginationState,
        destroyPagination
    };
}
