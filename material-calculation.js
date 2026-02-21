// Material Calculation Module
class MaterialCalculation {
    constructor() {
        this.materials = [];
        this.loadFromStorage();
    }

    loadFromStorage() {
        const stored = localStorage.getItem('materialCalculations');
        if (stored) {
            const parsed = JSON.parse(stored);
            this.materials = Array.isArray(parsed)
                ? parsed.map((record, index) => ({
                    ...this.calculateFields(record),
                    id: record.id || `${Date.now()}-${index}`
                }))
                : [];
            this.saveToStorage();
        }
    }

    saveToStorage() {
        localStorage.setItem('materialCalculations', JSON.stringify(this.materials));
    }

    // Calculate all derived fields for a material record
    calculateFields(material) {
        const calculated = { ...material };

        // Customer Invested Cost = Incoming Weight * Rate Per Kg
        calculated.customerInvestedCost = (material.incomingWeight || 0) * (material.ratePerKg || 0);

        // Weight Per Strip = 2 * 160 * 1250 * 7.85 / 1000000 (constant)
        calculated.weightPerStrip = 2 * 160 * 1250 * 7.85 / 1000000; // 3.925 kg

        // As Per Weight = Incoming Weight / Weight Per Strip
        calculated.asPerWeight = calculated.weightPerStrip !== 0
            ? (material.incomingWeight || 0) / calculated.weightPerStrip
            : 0;

        // Product Quantity = Actual Weight in SVR * Strokes Per Strip * Cavity Per Stroke
        calculated.productQuantity = (material.actualWeightSVR || 0) *
            (material.strokesPerStrip || 0) *
            (material.cavityPerStroke || 0);

        // Actual Need = Quantity As Per Invoice - Actual Norms
        calculated.actualNeed = (material.quantityAsPerInvoice || 0) - (material.actualNorms || 0);

        // Difference = Product Quantity - Quantity As Per Invoice
        calculated.difference = calculated.productQuantity - (material.quantityAsPerInvoice || 0);

        // TTL Stroke Cost = Quantity As Per Invoice * Process Cost
        calculated.ttlStrokeCost = (material.quantityAsPerInvoice || 0) * (material.processCost || 0);

        // SVR Invoice Cost = Quantity As Per Invoice * Customer PO Cost
        calculated.svrInvoiceCost = (material.quantityAsPerInvoice || 0) * (material.customerPOCost || 0);

        // SVR Invested Cost = Actual Weight in SVR * Rate Per Kg
        calculated.svrInvestedCost = (material.actualWeightSVR || 0) * (material.ratePerKg || 0);

        // Customer/SVR Invoice Difference = SVR Invested Cost - Customer Invested Cost
        calculated.invoiceDifference = calculated.svrInvestedCost - calculated.customerInvestedCost;
        calculated.customerSVRInvoiceDifference = calculated.invoiceDifference;

        // TTL Scrap Weight = Strip Scrap Weight * Actual Weight in SVR
        calculated.ttlScrapWeight = (material.stripScrapWeight || 0) * (material.actualWeightSVR || 0);

        // Scrap Sale Cost = TTL Scrap Weight * Scrap Cost
        calculated.scrapSaleCost = calculated.ttlScrapWeight * (material.scrapCost || 0);

        // Actually Received = Scrap Sale Cost + Invoice Difference
        calculated.actuallyReceived = calculated.scrapSaleCost + calculated.invoiceDifference;

        // Profit or Loss = Actually Received - TTL Stroke Cost
        calculated.profitOrLoss = calculated.actuallyReceived - calculated.ttlStrokeCost;

        // P/L Status
        calculated.plStatus = calculated.profitOrLoss >= 0 ? 'Profit' : 'Loss';

        return calculated;
    }

    addMaterial(material) {
        const calculated = this.calculateFields(material);
        calculated.id = Date.now().toString();
        this.materials.push(calculated);
        this.saveToStorage();
        return calculated;
    }

    updateMaterial(id, material) {
        const index = this.materials.findIndex(m => m.id === id);
        if (index !== -1) {
            const calculated = this.calculateFields(material);
            calculated.id = id;
            this.materials[index] = calculated;
            this.saveToStorage();
            return calculated;
        }
        return null;
    }

    deleteMaterial(id) {
        const index = this.materials.findIndex(m => m.id === id);
        if (index !== -1) {
            this.materials.splice(index, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    getMaterial(id) {
        return this.materials.find(m => m.id === id);
    }

    getAllMaterials() {
        return this.materials;
    }

    getSummary() {
        const summary = {
            totalRecords: this.materials.length,
            totalProfit: 0,
            totalLoss: 0,
            netProfitLoss: 0,
            totalMaterialProcessed: 0,
            totalScrapWeight: 0
        };

        this.materials.forEach(m => {
            if (m.profitOrLoss >= 0) {
                summary.totalProfit += m.profitOrLoss;
            } else {
                summary.totalLoss += Math.abs(m.profitOrLoss);
            }
            summary.netProfitLoss += m.profitOrLoss;
            summary.totalMaterialProcessed += (m.incomingWeight || 0);
            summary.totalScrapWeight += (m.ttlScrapWeight || 0);
        });

        return summary;
    }
}

// Initialize Material Calculation Manager
const materialCalcManager = new MaterialCalculation();

// UI Functions
let isMaterialCalcInitialized = false;

function initMaterialCalculationModule() {
    loadMaterialTable();
    displayMaterialSummary();

    if (!isMaterialCalcInitialized) {
        setupMaterialEventListeners();
        isMaterialCalcInitialized = true;
    }
}

function setupMaterialEventListeners() {
    // Add Material Button
    const addBtn = document.getElementById('addMaterialBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            clearMaterialForm();
            document.getElementById('materialFormTitle').textContent = 'Add Material Calculation';
            document.getElementById('materialModal').style.display = 'block';
        });
    }

    // Save Material Button
    const saveBtn = document.getElementById('saveMaterialBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveMaterial);
    }

    // Export Buttons
    const exportExcelBtn = document.getElementById('exportMaterialExcel');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', exportMaterialToExcel);
    }

    const exportPdfBtn = document.getElementById('exportMaterialPdf');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', exportMaterialToPdf);
    }

    // Modal Close
    const closeBtn = document.querySelector('#materialModal .close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('materialModal').style.display = 'none';
        });
    }
}

function saveMaterial() {
    const materialId = document.getElementById('materialId').value;

    const material = {
        invoiceDate: document.getElementById('invoiceDate').value,
        customerName: document.getElementById('customerName').value,
        partName: document.getElementById('partName').value,
        partNum: document.getElementById('partNum').value,
        incomingWeight: parseFloat(document.getElementById('incomingWeight').value) || 0,
        ratePerKg: parseFloat(document.getElementById('ratePerKg').value) || 0,
        actualWeightSVR: parseFloat(document.getElementById('actualWeightSVR').value) || 0,
        givenWeightCustomer: parseFloat(document.getElementById('givenWeightCustomer').value) || 0,
        strokesPerStrip: parseFloat(document.getElementById('strokesPerStrip').value) || 0,
        cavityPerStroke: parseFloat(document.getElementById('cavityPerStroke').value) || 0,
        quantityAsPerInvoice: parseFloat(document.getElementById('quantityAsPerInvoice').value) || 0,
        actualNorms: parseFloat(document.getElementById('actualNorms').value) || 0,
        processCost: parseFloat(document.getElementById('processCost').value) || 0,
        customerPOCost: parseFloat(document.getElementById('customerPOCost').value) || 0,
        stripScrapWeight: parseFloat(document.getElementById('stripScrapWeight').value) || 0,
        scrapCost: parseFloat(document.getElementById('scrapCost').value) || 0
    };

    if (materialId) {
        materialCalcManager.updateMaterial(materialId, material);
    } else {
        materialCalcManager.addMaterial(material);
    }

    document.getElementById('materialModal').style.display = 'none';
    loadMaterialTable();
    displayMaterialSummary();
    showNotification('Material calculation saved successfully!', 'success');
}

function loadMaterialTable() {
    const tbody = document.getElementById('materialTableBody');
    if (!tbody) return;

    const materials = materialCalcManager.getAllMaterials();
    tbody.innerHTML = '';

    materials.forEach(material => {
        const row = createMaterialRow(material);
        tbody.appendChild(row);
    });
}

function createMaterialRow(material) {
    const tr = document.createElement('tr');
    tr.className = material.plStatus === 'Profit' ? 'profit-row' : 'loss-row';

    tr.innerHTML = `
        <td>${formatDate(material.invoiceDate)}</td>
        <td>${material.customerName}</td>
        <td>${material.partName}</td>
        <td>${material.partNum}</td>
        <td>${material.incomingWeight.toFixed(2)}</td>
        <td>₹${material.ratePerKg.toFixed(2)}</td>
        <td>₹${material.customerInvestedCost.toFixed(2)}</td>
        <td>${material.weightPerStrip.toFixed(3)}</td>
        <td>${material.asPerWeight.toFixed(2)}</td>
        <td>${material.actualWeightSVR.toFixed(2)}</td>
        <td>${material.givenWeightCustomer.toFixed(2)}</td>
        <td>${material.strokesPerStrip}</td>
        <td>${material.cavityPerStroke}</td>
        <td>${material.productQuantity.toFixed(0)}</td>
        <td>${material.quantityAsPerInvoice.toFixed(0)}</td>
        <td>${material.actualNorms.toFixed(0)}</td>
        <td>${material.actualNeed.toFixed(0)}</td>
        <td>${material.difference.toFixed(0)}</td>
        <td>₹${material.processCost.toFixed(2)}</td>
        <td>₹${material.ttlStrokeCost.toFixed(2)}</td>
        <td>₹${material.customerPOCost.toFixed(2)}</td>
        <td>₹${material.svrInvoiceCost.toFixed(2)}</td>
        <td>₹${(material.svrInvestedCost || 0).toFixed(2)}</td>
        <td>₹${material.invoiceDifference.toFixed(2)}</td>
        <td>${material.stripScrapWeight.toFixed(2)}</td>
        <td>${material.ttlScrapWeight.toFixed(2)}</td>
        <td>₹${material.scrapCost.toFixed(2)}</td>
        <td>₹${material.scrapSaleCost.toFixed(2)}</td>
        <td>₹${material.actuallyReceived.toFixed(2)}</td>
        <td class="${material.plStatus === 'Profit' ? 'profit-text' : 'loss-text'}">
            ₹${material.profitOrLoss.toFixed(2)}
        </td>
        <td><span class="pl-badge ${material.plStatus === 'Profit' ? 'profit-badge' : 'loss-badge'}">${material.plStatus}</span></td>
        <td>
            <button class="btn-icon" onclick="editMaterial('${material.id}')" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon btn-danger" onclick="deleteMaterial('${material.id}')" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;

    return tr;
}

function editMaterial(id) {
    const material = materialCalcManager.getMaterial(id);
    if (!material) return;

    document.getElementById('materialId').value = material.id;
    document.getElementById('invoiceDate').value = material.invoiceDate;
    document.getElementById('customerName').value = material.customerName;
    document.getElementById('partName').value = material.partName;
    document.getElementById('partNum').value = material.partNum;
    document.getElementById('incomingWeight').value = material.incomingWeight;
    document.getElementById('ratePerKg').value = material.ratePerKg;
    document.getElementById('actualWeightSVR').value = material.actualWeightSVR;
    document.getElementById('givenWeightCustomer').value = material.givenWeightCustomer;
    document.getElementById('strokesPerStrip').value = material.strokesPerStrip;
    document.getElementById('cavityPerStroke').value = material.cavityPerStroke;
    document.getElementById('quantityAsPerInvoice').value = material.quantityAsPerInvoice;
    document.getElementById('actualNorms').value = material.actualNorms;
    document.getElementById('processCost').value = material.processCost;
    document.getElementById('customerPOCost').value = material.customerPOCost;
    document.getElementById('stripScrapWeight').value = material.stripScrapWeight;
    document.getElementById('scrapCost').value = material.scrapCost;

    document.getElementById('materialFormTitle').textContent = 'Edit Material Calculation';
    document.getElementById('materialModal').style.display = 'block';
}

function deleteMaterial(id) {
    if (confirm('Are you sure you want to delete this material calculation?')) {
        materialCalcManager.deleteMaterial(id);
        loadMaterialTable();
        displayMaterialSummary();
        showNotification('Material calculation deleted successfully!', 'success');
    }
}

function clearMaterialForm() {
    document.getElementById('materialId').value = '';
    document.getElementById('materialForm').reset();
}

function displayMaterialSummary() {
    const summary = materialCalcManager.getSummary();

    const summaryHtml = `
        <div class="summary-cards">
            <div class="summary-card">
                <div class="summary-label">Total Records</div>
                <div class="summary-value">${summary.totalRecords}</div>
            </div>
            <div class="summary-card profit-card">
                <div class="summary-label">Total Profit</div>
                <div class="summary-value">₹${summary.totalProfit.toFixed(2)}</div>
            </div>
            <div class="summary-card loss-card">
                <div class="summary-label">Total Loss</div>
                <div class="summary-value">₹${summary.totalLoss.toFixed(2)}</div>
            </div>
            <div class="summary-card ${summary.netProfitLoss >= 0 ? 'profit-card' : 'loss-card'}">
                <div class="summary-label">Net P/L</div>
                <div class="summary-value">₹${summary.netProfitLoss.toFixed(2)}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Material Processed</div>
                <div class="summary-value">${summary.totalMaterialProcessed.toFixed(2)} kg</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Scrap</div>
                <div class="summary-value">${summary.totalScrapWeight.toFixed(2)} kg</div>
            </div>
        </div>
    `;

    const summaryContainer = document.getElementById('materialSummary');
    if (summaryContainer) {
        summaryContainer.innerHTML = summaryHtml;
    }
}

function exportMaterialToExcel() {
    const materials = materialCalcManager.getAllMaterials();
    if (materials.length === 0) {
        showNotification('No data to export!', 'warning');
        return;
    }

    // Define headers
    const headers = [
        'Date', 'Customer', 'Part Name', 'Part No',
        'Incoming Wt', 'Rate/Kg', 'Cust Inv Cost',
        'Wt/Strip', 'As Per Wt', 'Act Wt SVR', 'Given Wt',
        'Strokes', 'Cavity', 'Prod Qty', 'Inv Qty', 'Norms', 'Need', 'Diff',
        'Proc Cost', 'Stroke Cost', 'Cust PO Cost', 'SVR Inv Cost', 'SVR Invested Cost',
        'Cust/SVR Diff', 'Scrap Wt', 'TTL Scrap', 'Scrap Rate', 'Scrap Sale',
        'Act Recv', 'Profit/Loss', 'Status'
    ];

    // Convert data to CSV format
    const csvRows = [];
    csvRows.push(headers.join(','));

    materials.forEach(m => {
        const row = [
            formatDate(m.invoiceDate),
            `"${m.customerName}"`,
            `"${m.partName}"`,
            `"${m.partNum}"`,
            m.incomingWeight,
            m.ratePerKg,
            m.customerInvestedCost,
            m.weightPerStrip,
            m.asPerWeight,
            m.actualWeightSVR,
            m.givenWeightCustomer,
            m.strokesPerStrip,
            m.cavityPerStroke,
            m.productQuantity,
            m.quantityAsPerInvoice,
            m.actualNorms,
            m.actualNeed,
            m.difference,
            m.processCost,
            m.ttlStrokeCost,
            m.customerPOCost,
            m.svrInvoiceCost,
            m.svrInvestedCost,
            m.invoiceDifference,
            m.stripScrapWeight,
            m.ttlScrapWeight,
            m.scrapCost,
            m.scrapSaleCost,
            m.actuallyReceived,
            m.profitOrLoss,
            m.plStatus
        ];
        csvRows.push(row.join(','));
    });

    // Create and download CSV file
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `Material_Costing_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification('Exported to CSV successfully!', 'success');
}

function exportMaterialToPdf() {
    // This will be implemented with jsPDF
    showNotification('PDF export feature coming soon!', 'info');
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN');
}
