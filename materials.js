// =====================================================
// MATERIALS & STOCK MANAGEMENT MODULE
// =====================================================
// Features:
// - Material Master Database
// - BOM (Bill of Materials) Management
// - Stock Tracking (Opening, Inward, Consumption, Closing)
// - Material Calculator
// - Excel Data Import/Export
// =====================================================

// Data Storage
let materials = JSON.parse(localStorage.getItem('materials')) || [];
let materialBOMs = JSON.parse(localStorage.getItem('materialBOMs')) || {};

// ==================== HELPER FUNCTIONS ====================
function calculateClosingStock(material) {
    if (!material) return 0;
    return (parseFloat(material.openingStock) || 0) +
        (parseFloat(material.inward) || 0) -
        (parseFloat(material.consumption) || 0);
}

function getMaterialStockValue(material, closingStock) {
    if (!material) return 0;
    const stock = closingStock !== undefined ? closingStock : calculateClosingStock(material);
    return stock * (parseFloat(material.rate) || 0);
}

// ==================== TAB SWITCHING ====================
function switchMaterialTab(tabName) {
    // Hide all content
    document.getElementById('stockOverviewContent').style.display = 'none';
    document.getElementById('bomManagementContent').style.display = 'none';
    document.getElementById('materialCalcContent').style.display = 'none';
    const costingContent = document.getElementById('costingContent');
    if (costingContent) costingContent.style.display = 'none';

    // Remove active class from all tabs
    document.querySelectorAll('.material-tab').forEach(tab => {
        tab.classList.remove('active');
        tab.style.borderBottom = '3px solid transparent';
        tab.style.color = 'var(--text-secondary)';
    });

    // Show selected content and activate tab
    if (tabName === 'stock') {
        document.getElementById('stockOverviewContent').style.display = 'block';
        document.getElementById('stockOverviewTab').classList.add('active');
        document.getElementById('stockOverviewTab').style.borderBottom = '3px solid var(--primary)';
        document.getElementById('stockOverviewTab').style.color = 'var(--primary)';
        renderMaterialStockTable();
    } else if (tabName === 'bom') {
        document.getElementById('bomManagementContent').style.display = 'block';
        document.getElementById('bomManagementTab').classList.add('active');
        document.getElementById('bomManagementTab').style.borderBottom = '3px solid var(--primary)';
        document.getElementById('bomManagementTab').style.color = 'var(--primary)';
        populateBOMProductDropdown();
        renderBOMList();
    } else if (tabName === 'calculator') {
        document.getElementById('materialCalcContent').style.display = 'block';
        document.getElementById('materialCalcTab').classList.add('active');
        document.getElementById('materialCalcTab').style.borderBottom = '3px solid var(--primary)';
        document.getElementById('materialCalcTab').style.color = 'var(--primary)';
        populateCalcProductDropdown();
    } else if (tabName === 'costing') {
        if (costingContent) {
            costingContent.style.display = 'block';
            const costingTab = document.getElementById('costingTab');
            if (costingTab) {
                costingTab.classList.add('active');
                costingTab.style.borderBottom = '3px solid var(--primary)';
                costingTab.style.color = 'var(--primary)';
            }
            // Initialize module if needed
            if (typeof initMaterialCalculationModule === 'function') {
                initMaterialCalculationModule();
            }
        }
    }
}

// ==================== MATERIAL STOCK TABLE ====================
function renderMaterialStockTable() {
    const tbody = document.getElementById('materialStockTableBody');

    if (materials.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="text-center" style="color: var(--text-secondary);">No materials yet. Click "Import Excel Data" or "Add Material" to get started.</td></tr>`;
        updateMaterialSummaryCards();
        return;
    }

    let html = '';
    materials.forEach((material, index) => {
        const closingStock = calculateClosingStock(material);
        const stockValue = getMaterialStockValue(material, closingStock);

        // Determine stock status
        let status = '✅ Normal';
        let statusClass = '';
        if (closingStock <= 0) {
            status = '🔴 Out of Stock';
            statusClass = 'danger';
        } else if (closingStock < (parseFloat(material.reorderLevel) || 10)) {
            status = '⚠️ Low Stock';
            statusClass = 'warning';
        }

        html += `
            <tr>
                <td>${material.code || '-'}</td>
                <td><strong>${material.name}</strong></td>
                <td>${material.category || '-'}</td>
                <td>${material.unit || 'Nos'}</td>
                <td>${(material.openingStock || 0).toFixed(2)}</td>
                <td>${(material.inward || 0).toFixed(2)}</td>
                <td>${(material.consumption || 0).toFixed(2)}</td>
                <td><strong>${closingStock.toFixed(2)}</strong></td>
                <td>₹${(material.rate || 0).toFixed(2)}</td>
                <td>₹${stockValue.toFixed(2)}</td>
                <td><span class="badge ${statusClass}">${status}</span></td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editMaterial(${index})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteMaterial(${index})">Delete</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    updateMaterialSummaryCards();
}

// ==================== UPDATE SUMMARY CARDS ====================
function updateMaterialSummaryCards() {
    document.getElementById('totalMaterialsCount').textContent = materials.length;

    let totalValue = 0;
    let lowStockCount = 0;

    materials.forEach(material => {
        const closingStock = calculateClosingStock(material);
        const stockValue = getMaterialStockValue(material, closingStock);
        totalValue += stockValue;

        if (closingStock < (parseFloat(material.reorderLevel) || 10)) {
            lowStockCount++;
        }
    });

    document.getElementById('totalStockValue').textContent = `₹${totalValue.toFixed(2)}`;
    document.getElementById('lowStockCount').textContent = lowStockCount;
    document.getElementById('productsWithBOM').textContent = Object.keys(materialBOMs).length;
}

// ==================== MATERIAL MODAL (ADD/EDIT) ====================
function openMaterialModal(materialIndex = null) {
    const isEdit = materialIndex !== null;
    const material = isEdit ? materials[materialIndex] : {};

    document.getElementById('materialStockModalTitle').textContent = isEdit ? 'Edit Material' : 'Add New Material';
    document.getElementById('materialCode').value = material.code || '';
    document.getElementById('materialName').value = material.name || '';
    document.getElementById('materialCategory').value = material.category || '';
    document.getElementById('materialUnit').value = material.unit || 'Nos';
    document.getElementById('materialOpening').value = material.openingStock || 0;
    document.getElementById('materialRate').value = material.rate || 0;
    document.getElementById('materialReorder').value = material.reorderLevel || 10;

    const saveBtn = document.getElementById('saveMaterialStockBtn');
    saveBtn.textContent = `${isEdit ? 'Update' : 'Save'} Material`;
    saveBtn.onclick = () => saveMaterial(materialIndex);

    document.getElementById('materialStockModal').style.display = 'block';
}

function closeMaterialModal() {
    document.getElementById('materialStockModal').style.display = 'none';
}

function closeModal() {
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(overlay => overlay.remove());
}

function saveMaterial(materialIndex) {
    const materialData = {
        code: document.getElementById('materialCode').value.trim(),
        name: document.getElementById('materialName').value.trim(),
        category: document.getElementById('materialCategory').value.trim(),
        unit: document.getElementById('materialUnit').value,
        openingStock: parseFloat(document.getElementById('materialOpening').value) || 0,
        inward: materialIndex !== null ? materials[materialIndex].inward || 0 : 0,
        consumption: materialIndex !== null ? materials[materialIndex].consumption || 0 : 0,
        rate: parseFloat(document.getElementById('materialRate').value) || 0,
        reorderLevel: parseFloat(document.getElementById('materialReorder').value) || 10
    };

    if (!materialData.name) {
        alert('Please enter material name');
        return;
    }

    if (materialIndex !== null) {
        materials[materialIndex] = materialData;
    } else {
        materials.push(materialData);
    }

    localStorage.setItem('materials', JSON.stringify(materials));
    closeMaterialModal();
    renderMaterialStockTable();
    showNotification(`Material ${materialIndex !== null ? 'updated' : 'added'} successfully!`, 'success');
}

function editMaterial(index) {
    openMaterialModal(index);
}

function deleteMaterial(index) {
    if (confirm(`Are you sure you want to delete "${materials[index].name}"?`)) {
        materials.splice(index, 1);
        localStorage.setItem('materials', JSON.stringify(materials));
        renderMaterialStockTable();
        showNotification('Material deleted successfully!', 'success');
    }
}

// ==================== BOM MANAGEMENT ====================
function populateBOMProductDropdown() {
    const outwardInvoices = JSON.parse(localStorage.getItem('outwardInvoices')) || [];
    const select = document.getElementById('bomProductSelect');

    const products = new Set();
    outwardInvoices.forEach(inv => {
        if (inv.products && Array.isArray(inv.products)) {
            inv.products.forEach(p => {
                if (p.description) products.add(p.description);
            });
        }
    });

    let html = '<option value="">-- Select Product --</option>';
    Array.from(products).sort().forEach(product => {
        html += `<option value="${product}">${product}</option>`;
    });
    select.innerHTML = html;
}

function loadBOMForProduct(productName) {
    const container = document.getElementById('bomItemsContainer');
    container.innerHTML = '';

    if (!productName) return;

    const bom = materialBOMs[productName] || [];
    if (bom.length === 0) {
        addBOMRow();
    } else {
        bom.forEach(item => addBOMRow(item));
    }
}

function addBOMRow(data = null) {
    const container = document.getElementById('bomItemsContainer');

    const materialOptions = materials.map(m =>
        `<option value="${m.name}" ${data && data.material === m.name ? 'selected' : ''}>${m.name} (${m.unit})</option>`
    ).join('');

    const rowHTML = `
        <div class="bom-row" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
            <select class="form-control bom-material" style="flex: 2;">
                <option value="">Select Material</option>
                ${materialOptions}
            </select>
            <input type="number" class="form-control bom-quantity" placeholder="Qty" step="0.01" value="${data ? data.quantity : ''}" style="flex: 1;">
            <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()">×</button>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', rowHTML);
}

function saveCurrentBOM() {
    const productName = document.getElementById('bomProductSelect').value;

    if (!productName) {
        alert('Please select a product');
        return;
    }

    const bomRows = document.querySelectorAll('.bom-row');
    const bomData = [];

    bomRows.forEach(row => {
        const material = row.querySelector('.bom-material').value;
        const quantity = parseFloat(row.querySelector('.bom-quantity').value) || 0;

        if (material && quantity > 0) {
            bomData.push({ material, quantity });
        }
    });

    if (bomData.length === 0) {
        alert('Please add at least one material with quantity');
        return;
    }

    materialBOMs[productName] = bomData;
    localStorage.setItem('materialBOMs', JSON.stringify(materialBOMs));

    showNotification(`BOM saved for ${productName}`, 'success');
    renderBOMList();
    updateMaterialSummaryCards();
}

function renderBOMList() {
    const container = document.getElementById('bomListContainer');

    if (Object.keys(materialBOMs).length === 0) {
        container.innerHTML = `<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No BOMs configured yet.</p>`;
        return;
    }

    let html = '';
    Object.keys(materialBOMs).forEach(product => {
        const bom = materialBOMs[product];
        html += `
            <div class="card" style="margin-bottom: 1rem;">
                <div class="card-header" style="background: var(--bg-secondary); padding: 0.75rem;">
                    <strong>${product}</strong>
                    <button class="btn btn-sm btn-danger" style="float: right;" onclick="deleteBOM('${product}')">Delete BOM</button>
                </div>
                <div class="card-body" style="padding: 0.75rem;">
                    <table style="width: 100%; font-size: 0.85rem;">
                        <thead>
                            <tr>
                                <th>Material</th>
                                <th>Quantity</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bom.map(item => `
                                <tr>
                                    <td>${item.material}</td>
                                    <td>${item.quantity}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function deleteBOM(productName) {
    if (confirm(`Delete BOM for "${productName}"?`)) {
        delete materialBOMs[productName];
        localStorage.setItem('materialBOMs', JSON.stringify(materialBOMs));
        renderBOMList();
        updateMaterialSummaryCards();
        showNotification('BOM deleted successfully', 'success');
    }
}

// ==================== MATERIAL CALCULATOR ====================
function populateCalcProductDropdown() {
    const select = document.getElementById('calcProductSelect');
    if (!select) return;

    let html = '<option value="">-- Select Product --</option>';
    Object.keys(materialBOMs).forEach(product => {
        html += `<option value="${product}">${product}</option>`;
    });
    select.innerHTML = html;
}

function updateCalcProductInfo() {
    // Could show BOM details here if needed
}

function calculateMaterialRequirement() {
    const productName = document.getElementById('calcProductSelect').value;
    const targetQty = parseFloat(document.getElementById('calcTargetQty').value) || 0;
    const container = document.getElementById('calcResultsContainer');

    if (!productName) {
        alert('Please select a product');
        return;
    }

    if (targetQty <= 0) {
        alert('Please enter a valid production quantity');
        return;
    }

    const bom = materialBOMs[productName];
    if (!bom || bom.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); text-align: center;">No BOM configured for this product.</p>`;
        return;
    }

    let html = `<h4 style="margin-bottom: 1rem;">Requirements for ${targetQty} units of ${productName}</h4>`;
    html += `<table class="data-table" style="font-size: 0.9rem;">
        <thead>
            <tr>
                <th>Material</th>
                <th>Per Unit</th>
                <th>Total Req.</th>
                <th>Available</th>
                <th>Shortage</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>`;

    // Create an indexed map for fast lookups
    const materialMap = new Map();
    materials.forEach(m => materialMap.set(m.name, m));

    bom.forEach(item => {
        const totalRequired = item.quantity * targetQty;
        const material = materialMap.get(item.material);
        const available = material ? calculateClosingStock(material) : 0;
        const shortage = Math.max(0, totalRequired - available);
        const status = shortage > 0 ? '🔴 Short' : '✅ OK';
        const statusClass = shortage > 0 ? 'danger' : 'success';

        html += `
            <tr>
                <td><strong>${item.material}</strong></td>
                <td>${item.quantity}</td>
                <td>${totalRequired.toFixed(2)}</td>
                <td>${available.toFixed(2)}</td>
                <td>${shortage.toFixed(2)}</td>
                <td><span class="badge ${statusClass}">${status}</span></td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ==================== EXCEL IMPORT/EXPORT ====================
function openExcelImportModal() {
    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>📁 Import Material Data from Excel</h3>
                    <button class="close-btn" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Select Excel File</label>
                        <input type="file" id="excelFileInput" class="form-control" accept=".xlsx,.xls" onchange="handleExcelFileUpload(event)">
                    </div>
                    <div id="importPreview" style="margin-top: 1rem;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function handleExcelFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            const previewDiv = document.getElementById('importPreview');
            previewDiv.innerHTML = '<h4>Excel Sheets Found:</h4>';

            workbook.SheetNames.forEach((sheetName, idx) => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                previewDiv.innerHTML += `
                    <div class="card" style="margin-bottom: 1rem;">
                        <div class="card-body">
                            <h5>${sheetName} (${jsonData.length} rows)</h5>
                            <button class="btn btn-primary btn-sm" onclick="importMaterialDataFromSheet('${sheetName}', ${idx})">
                                Import as Materials
                            </button>
                        </div>
                    </div>
                `;
            });

            // Store workbook data temporarily
            window.tempWorkbook = workbook;

        } catch (error) {
            alert('Error reading Excel file: ' + error.message);
        }
    };

    reader.readAsArrayBuffer(file);
}

function importMaterialDataFromSheet(sheetName, sheetIndex) {
    const worksheet = window.tempWorkbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    let importCount = 0;
    jsonData.forEach(row => {
        // Try to map Excel columns to material fields
        const material = {
            code: row['Material Code'] || row['Code'] || row['Mat Code'] || '',
            name: row['Material Name'] || row['Material'] || row['Name'] || row['Description'] || '',
            category: row['Category'] || row['Type'] || '',
            unit: row['Unit'] || row['UOM'] || 'Nos',
            openingStock: parseFloat(row['Opening Stock'] || row['Opening'] || row['Stock'] || 0),
            inward: parseFloat(row['Inward'] || row['Purchase'] || row['Receipts'] || 0),
            consumption: parseFloat(row['Consumption'] || row['Issued'] || row['Used'] || 0),
            rate: parseFloat(row['Rate'] || row['Price'] || row['Cost'] || 0),
            reorderLevel: parseFloat(row['Reorder Level'] || row['ROL'] || 10)
        };

        if (material.name) {
            materials.push(material);
            importCount++;
        }
    });

    localStorage.setItem('materials', JSON.stringify(materials));
    closeModal();
    renderMaterialStockTable();
    showNotification(`Imported ${importCount} materials from ${sheetName}`, 'success');
}

function exportMaterialsToExcel() {
    if (materials.length === 0) {
        alert('No materials to export');
        return;
    }

    const exportData = materials.map(m => {
        const closingStock = calculateClosingStock(m);
        const stockValue = getMaterialStockValue(m, closingStock);
        return {
            'Material Code': m.code,
            'Material Name': m.name,
            'Category': m.category,
            'Unit': m.unit,
            'Opening Stock': m.openingStock || 0,
            'Inward': m.inward || 0,
            'Consumption': m.consumption || 0,
            'Closing Stock': closingStock.toFixed(2),
            'Rate': m.rate || 0,
            'Stock Value': stockValue.toFixed(2),
            'Reorder Level': m.reorderLevel || 10
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Material Stock');

    XLSX.writeFile(wb, `Material_Stock_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Materials exported to Excel successfully!', 'success');
}

// ==================== INITIALIZE MODULE ====================
function loadMaterialsModule() {
    renderMaterialStockTable();
    updateMaterialSummaryCards();
}

// Initialize when materials tab is clicked
document.addEventListener('DOMContentLoaded', () => {
    const materialsLink = document.querySelector('[data-module="materials"]');
    if (materialsLink) {
        materialsLink.addEventListener('click', () => {
            setTimeout(loadMaterialsModule, 100);
        });
    }
});
