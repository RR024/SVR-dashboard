// ===================================
// MATERIAL CALCULATION & STOCK MODULE
// ===================================

// State management for materials
let materialBOMs = JSON.parse(localStorage.getItem('materialBOMs')) || {};

// ===================================
// CORE FUNCTIONS
// ===================================

// Get all unique raw materials from Inward Invoices
function getRawMaterials() {
    const inwardInvoices = getInwardInvoices();
    const materials = new Set();
    const materialDetails = {};

    inwardInvoices.forEach(inv => {
        if (inv.products && Array.isArray(inv.products)) {
            inv.products.forEach(prod => {
                const name = prod.material || prod.description || '';
                if (name && name.trim() !== '') {
                    materials.add(name);
                    // Store latest details like unit and price for reference
                    if (!materialDetails[name]) {
                        materialDetails[name] = {
                            name: name,
                            unit: prod.unit || 'Nos',
                            latestRate: parseFloat(prod.rate) || 0
                        };
                    }
                }
            });
        }
    });

    return Array.from(materials).map(m => materialDetails[m]);
}

// Get all Finished Products from Outward Invoices (or Customers) for BOM mapping
function getFinishedProducts() {
    // We can get products from 'outwardInvoices' history or 'customers' product lists
    // Using customer product lists is more reliable for "defined" products
    const customers = getCustomers();
    const products = new Map();

    customers.forEach(cust => {
        if (cust.products && Array.isArray(cust.products)) {
            cust.products.forEach(prod => {
                if (prod.description && prod.description.trim() !== '') {
                    products.set(prod.description, {
                        id: prod.id,
                        name: prod.description,
                        customer: cust.companyName
                    });
                }
            });
        }
    });

    // Also scan outward invoices for any products not in customer lists
    const outwardInvoices = getOutwardInvoices();
    outwardInvoices.forEach(inv => {
        if (inv.products && Array.isArray(inv.products)) {
            inv.products.forEach(prod => {
                if (prod.description && prod.description.trim() !== '' && !products.has(prod.description)) {
                    products.set(prod.description, {
                        id: 'hist_' + Date.now(),
                        name: prod.description,
                        customer: inv.buyerName
                    });
                }
            });
        }
    });

    return Array.from(products.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// Get BOM for a specific product
function getBOM(productName) {
    return materialBOMs[productName] || [];
}

// Save BOM for a product
function saveBOM(productName, bomData) {
    materialBOMs[productName] = bomData;
    localStorage.setItem('materialBOMs', JSON.stringify(materialBOMs));
    showToast(`BOM saved for ${productName}`, 'success');
}

// Calculate Current Stock for all materials
function calculateMaterialStock() {
    const stock = {};

    // 1. Add Inward Quantities (Purchases)
    const inwardInvoices = getInwardInvoices();
    inwardInvoices.forEach(inv => {
        if (inv.products && Array.isArray(inv.products)) {
            inv.products.forEach(prod => {
                const name = prod.material || prod.description || '';
                if (name) {
                    if (!stock[name]) stock[name] = { inward: 0, consumed: 0, balance: 0, unit: prod.unit || 'Nos' };
                    stock[name].inward += parseFloat(prod.quantity) || 0;
                }
            });
        }
    });

    // 2. Deduct Consumed Quantities (Production * BOM)
    // We need to look at Production Logs
    const productionLogs = getProductionLogs(); // Assumes function exists in production.js

    productionLogs.forEach(log => {
        const productName = log.product;
        const producedQty = parseFloat(log.quantity) || 0;

        // Find BOM for this product
        const bom = getBOM(productName);

        if (bom && bom.length > 0) {
            bom.forEach(item => {
                const materialName = item.material;
                const requiredPerUnit = parseFloat(item.quantity) || 0;
                const totalRequired = producedQty * requiredPerUnit;

                if (stock[materialName]) {
                    stock[materialName].consumed += totalRequired;
                } else {
                    // Material in BOM but never purchased? Initialize it.
                    stock[materialName] = { inward: 0, consumed: totalRequired, balance: 0, unit: 'Nos' };
                }
            });
        }
    });

    // 3. Calculate Balance
    Object.keys(stock).forEach(key => {
        stock[key].balance = stock[key].inward - stock[key].consumed;
    });

    return stock;
}

// ===================================
// UI FUNCTIONS
// ===================================

// Load Materials Module
function loadMaterialsModule() {
    renderStockTable();
    populateBOMProductDropdown();
    populateBOMMaterialDropdown();
    populateCalculatorProductDropdown(); // Ensure calculator dropdown is populated
}

// Render Stock Overview Table
function renderStockTable() {
    const stockData = calculateMaterialStock();
    const tbody = document.getElementById('materialStockTableBody');

    if (!tbody) return;

    if (Object.keys(stockData).length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">No material data found. Add Purchase Invoices first.</td></tr>`;
        return;
    }

    let html = '';
    Object.keys(stockData).sort().forEach(material => {
        const data = stockData[material];
        const statusClass = data.balance < 0 ? 'text-danger' : (data.balance === 0 ? 'text-warning' : 'text-success');

        html += `
            <tr>
                <td><strong>${material}</strong></td>
                <td>${data.inward.toLocaleString()} ${data.unit}</td>
                <td>${data.consumed.toLocaleString()} ${data.unit}</td>
                <td class="${statusClass}"><strong>${data.balance.toLocaleString()} ${data.unit}</strong></td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="openMaterialDetails('${material}')">History</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Populate Product Dropdown for BOM Management
function populateBOMProductDropdown() {
    const products = getFinishedProducts();
    const select = document.getElementById('bomProductSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Select Product to Configure BOM --</option>';
    products.forEach(prod => {
        select.innerHTML += `<option value="${prod.name}">${prod.name}</option>`;
    });

    // Check if we need to load a specific product
    select.addEventListener('change', function () {
        loadBOMForProduct(this.value);
    });
}

// Populate Material Dropdown for BOM Row
function populateBOMMaterialDropdown() {
    const materials = getRawMaterials();
    // We'll use a global variable or helper to generate options string when adding rows
    window.materialOptions = materials.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
}

// Load BOM UI for selected product
function loadBOMForProduct(productName) {
    const container = document.getElementById('bomItemsContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!productName) return;

    const bom = getBOM(productName);

    if (bom.length === 0) {
        // Add one empty row by default
        addBOMRow();
    } else {
        bom.forEach(item => addBOMRow(item));
    }
}

// Add a row to BOM editor
function addBOMRow(data = null) {
    const container = document.getElementById('bomItemsContainer');
    if (!container) return;

    const rowId = 'bom_row_' + Date.now();
    const materials = getRawMaterials();

    let options = '<option value="">Select Material</option>';
    materials.forEach(m => {
        const selected = (data && data.material === m.name) ? 'selected' : '';
        options += `<option value="${m.name}" ${selected}>${m.name}</option>`;
    });

    const qty = data ? data.quantity : 1;

    const html = `
        <div class="bom-row" id="${rowId}" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
            <select class="form-control bom-material" style="flex: 2;">
                ${options}
            </select>
            <input type="number" class="form-control bom-quantity" value="${qty}" step="0.001" min="0" placeholder="Qty per unit" style="flex: 1;">
            <button class="btn btn-danger btn-sm" onclick="removeBOMRow('${rowId}')">×</button>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', html);
}

function removeBOMRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
}

// Save BOM Configuration
function saveCurrentBOM() {
    const productSelect = document.getElementById('bomProductSelect');
    const productName = productSelect.value;

    if (!productName) {
        showToast('Please select a product first', 'error');
        return;
    }

    const rows = document.querySelectorAll('.bom-row');
    const bomData = [];

    rows.forEach(row => {
        const material = row.querySelector('.bom-material').value;
        const quantity = parseFloat(row.querySelector('.bom-quantity').value);

        if (material && quantity > 0) {
            bomData.push({ material, quantity });
        }
    });

    saveBOM(productName, bomData);

    // Refresh stock table because consumption logic might change (if we want real-time recalc based on BOM changes, typically we only recalc when viewing)
    renderStockTable();
}

// Populate Product Dropdown for Material Calculator
function populateCalculatorProductDropdown() {
    const productSelect = document.getElementById('calcProductSelect');
    if (productSelect) {
        const products = getFinishedProducts();
        productSelect.innerHTML = '<option value="">-- Select Product --</option>';
        products.forEach(prod => {
            productSelect.innerHTML += `<option value="${prod.name}">${prod.name}</option>`;
        });
    }
}

function calculateRequirement() {
    const productName = document.getElementById('calcProductSelect').value;
    const targetQty = parseFloat(document.getElementById('calcTargetQty').value) || 0;
    const resultDiv = document.getElementById('calcResults');

    if (!productName || targetQty <= 0) {
        resultDiv.innerHTML = '<p class="text-danger">Please select a product and enter a valid quantity.</p>';
        return;
    }

    const bom = getBOM(productName);
    if (bom.length === 0) {
        resultDiv.innerHTML = '<p class="text-warning">No BOM defined for this product. Go to BOM Management to configure it.</p>';
        return;
    }

    const stock = calculateMaterialStock();
    let html = '<table class="table table-sm"><thead><tr><th>Material</th><th>Required</th><th>Available</th><th>Status</th></tr></thead><tbody>';

    bom.forEach(item => {
        const required = item.quantity * targetQty;
        const available = stock[item.material] ? stock[item.material].balance : 0;
        const diff = available - required;
        const status = diff >= 0 ? '<span class="text-success">OK</span>' : `<span class="text-danger">Shortage (${Math.abs(diff).toFixed(2)})</span>`;

        html += `
            <tr>
                <td>${item.material}</td>
                <td>${required.toFixed(2)}</td>
                <td>${available.toFixed(2)}</td>
                <td>${status}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    resultDiv.innerHTML = html;
}

// Initialization
document.addEventListener('DOMContentLoaded', function () {
    // If we are on the material module (this check might be needed if loading script globally)
    // But we are using on-click loading in index.html usually
});

// Export globally
window.loadMaterialsModule = loadMaterialsModule;
window.addBOMRow = addBOMRow;
window.removeBOMRow = removeBOMRow;
window.saveCurrentBOM = saveCurrentBOM;
window.calculateRequirement = calculateRequirement;
