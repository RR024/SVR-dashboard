// =====================================================================
// MATERIAL CALCULATION MODULE
// Integrated with Purchase Invoice (Inward) System
// Features:
//  - Foreign-key linkage to inward invoice (invoiceId)
//  - Auto-populate & lock invoice fields from selected invoice
//  - Real-time formula preview while entering data
//  - CRUD with localStorage
//  - Dashboard analytics summary
//  - Role-based access control (Admin/Manager can add/edit/delete)
// =====================================================================

// ==================== DATA CLASS ====================
class MaterialCalculation {
    constructor() {
        this.materials = this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem('materialCalculations');
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    }

    saveToStorage() {
        localStorage.setItem('materialCalculations', JSON.stringify(this.materials));
    }

    calculateFields(material) {
        const c = { ...material };
        const iw  = parseFloat(material.incomingWeight)        || 0;
        const rpk = parseFloat(material.ratePerKg)             || 0;
        const aws = parseFloat(material.actualWeightSVR)       || 0;
        const sps = parseFloat(material.strokesPerStrip)       || 0;
        const cps = parseFloat(material.cavityPerStroke)       || 0;
        const qai = parseFloat(material.quantityAsPerInvoice)  || 0;
        const an  = parseFloat(material.actualNorms)           || 0;
        const pc  = parseFloat(material.processCost)           || 0;
        const poc = parseFloat(material.customerPOCost)        || 0;
        const ssw = parseFloat(material.stripScrapWeight)      || 0;
        const sc  = parseFloat(material.scrapCost)             || 0;

        c.customerInvestedCost = iw * rpk;
        c.weightPerStrip       = (2 * 160 * 1250 * 7.85) / 1000000;
        c.asPerWeight          = iw / (c.weightPerStrip || 1);
        c.productQuantity      = aws * sps * cps;
        c.actualNeed           = qai - an;
        c.difference           = c.productQuantity - qai;
        c.ttlStrokeCost        = qai * pc;
        c.svrInvoiceCost       = qai * poc;
        c.svrInvestedCost      = aws * rpk;
        c.invoiceDifference    = c.svrInvestedCost - c.customerInvestedCost;
        c.ttlScrapWeight       = ssw * aws;
        c.scrapSaleCost        = c.ttlScrapWeight * sc;
        c.actuallyReceived     = c.scrapSaleCost + c.invoiceDifference;
        c.profitOrLoss         = c.actuallyReceived - c.ttlStrokeCost;
        c.plStatus             = c.profitOrLoss >= 0 ? 'Profit' : 'Loss';
        return c;
    }

    addMaterial(material) {
        const c = this.calculateFields(material);
        c.id = Date.now().toString();
        c.createdAt = new Date().toISOString();
        this.materials.push(c);
        this.saveToStorage();
        return c;
    }

    updateMaterial(id, material) {
        const idx = this.materials.findIndex(m => m.id === id);
        if (idx !== -1) {
            const c = this.calculateFields(material);
            c.id = id;
            c.createdAt = this.materials[idx].createdAt;
            c.updatedAt = new Date().toISOString();
            this.materials[idx] = c;
            this.saveToStorage();
            return c;
        }
        return null;
    }

    deleteMaterial(id) {
        const idx = this.materials.findIndex(m => m.id === id);
        if (idx !== -1) { this.materials.splice(idx, 1); this.saveToStorage(); return true; }
        return false;
    }

    getMaterial(id)     { return this.materials.find(m => m.id === id); }
    getAllMaterials()    { return this.materials; }

    getSummary() {
        const s = { totalRecords: this.materials.length, totalProfit: 0, totalLoss: 0,
            netProfitLoss: 0, totalMaterialProcessed: 0, totalScrapWeight: 0, linkedInvoiceCount: 0 };
        this.materials.forEach(m => {
            if (m.profitOrLoss >= 0) s.totalProfit += m.profitOrLoss;
            else s.totalLoss += Math.abs(m.profitOrLoss);
            s.netProfitLoss            += m.profitOrLoss;
            s.totalMaterialProcessed   += (m.incomingWeight  || 0);
            s.totalScrapWeight         += (m.ttlScrapWeight  || 0);
            if (m.invoiceId) s.linkedInvoiceCount++;
        });
        return s;
    }
}

// ==================== SINGLETON ====================
const materialCalcManager = new MaterialCalculation();

// ==================== ROLE-BASED ACCESS ====================
function canEditMaterialCalc() {
    try {
        const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
        if (!user) return true;
        const role = (user.role || '').toLowerCase();
        return role === 'admin' || role === 'manager';
    } catch { return true; }
}

function requireEditPermission() {
    if (!canEditMaterialCalc()) {
        showNotification('Access denied: Only Admin or Manager can modify material calculations.', 'error');
        return false;
    }
    return true;
}

// ==================== INIT ====================
let isMaterialCalcInitialized = false;

function initMaterialCalculationModule() {
    loadMaterialTable();
    displayMaterialSummary();
    if (!isMaterialCalcInitialized) {
        setupMaterialEventListeners();
        isMaterialCalcInitialized = true;
    }
    const addBtn = document.getElementById('addMaterialBtn');
    if (addBtn) addBtn.style.display = canEditMaterialCalc() ? '' : 'none';
}

function setupMaterialEventListeners() {
    const addBtn = document.getElementById('addMaterialBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            if (!requireEditPermission()) return;
            clearMaterialForm();
            populateInvoiceDropdown();
            document.getElementById('materialFormTitle').textContent = 'New Material Calculation';
            document.getElementById('materialModal').style.display = 'block';
        });
    }
    const saveBtn = document.getElementById('saveMaterialBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveMaterial);

    const excelBtn = document.getElementById('exportMaterialExcel');
    if (excelBtn) excelBtn.addEventListener('click', exportMaterialToExcel);

    const pdfBtn = document.getElementById('exportMaterialPdf');
    if (pdfBtn) pdfBtn.addEventListener('click', exportMaterialToPdf);

    const closeBtn = document.querySelector('#materialModal .close');
    if (closeBtn) closeBtn.addEventListener('click', () => {
        document.getElementById('materialModal').style.display = 'none';
    });
}

// ==================== INVOICE DROPDOWN ====================
function populateInvoiceDropdown(selectedId) {
    const sel = document.getElementById('linkedInvoiceSelect');
    if (!sel) return;
    let invoices = [];
    try { invoices = typeof getInwardInvoices === 'function' ? getInwardInvoices() : []; } catch {}
    invoices = [...invoices].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    const currentMid = document.getElementById('materialId')?.value;
    const usedIds = new Set(
        materialCalcManager.getAllMaterials()
            .filter(m => m.id !== currentMid && m.invoiceId)
            .map(m => m.invoiceId)
    );

    sel.innerHTML = '<option value="">-- Select Purchase Invoice (optional) --</option>';
    invoices.forEach(inv => {
        const label = `${inv.invoiceNo || inv.id} | ${inv.customer || ''} | ${inv.date || ''} | Rs.${Number(inv.amount || 0).toLocaleString('en-IN')}`;
        const opt = document.createElement('option');
        opt.value = inv.id;
        opt.textContent = usedIds.has(inv.id) ? '[Linked] ' + label : label;
        if (inv.id === selectedId) opt.selected = true;
        sel.appendChild(opt);
    });
}

function onLinkedInvoiceChange(invoiceId) {
    const badge      = document.getElementById('linkedInvoiceBadge');
    const unlinkBtn  = document.getElementById('unlinkInvoiceBtn');
    const detailsDiv = document.getElementById('linkedInvoiceDetails');
    const hiddenId   = document.getElementById('materialLinkedInvoiceId');

    if (!invoiceId) {
        if (badge)      badge.style.display = 'none';
        if (unlinkBtn)  unlinkBtn.style.display = 'none';
        if (detailsDiv) detailsDiv.style.display = 'none';
        if (hiddenId)   hiddenId.value = '';
        setInvoiceFieldsLocked(false);
        return;
    }

    let invoices = [];
    try { invoices = typeof getInwardInvoices === 'function' ? getInwardInvoices() : []; } catch {}
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    if (hiddenId) hiddenId.value = invoiceId;

    _setVal('invoiceDate', inv.date || '');
    _setVal('customerName', inv.customer || '');
    const fp = (inv.products && inv.products[0]) ? inv.products[0] : null;
    _setVal('partName', fp ? fp.material : (inv.material || ''));
    const totalQty = inv.products
        ? inv.products.reduce((s, p) => s + (parseFloat(p.quantity) || 0), 0)
        : (parseFloat(inv.quantity) || 0);
    _setVal('incomingWeight',       totalQty > 0 ? totalQty : '');
    _setVal('ratePerKg',            fp && fp.rate ? fp.rate : '');
    _setVal('quantityAsPerInvoice', totalQty > 0 ? totalQty : '');

    setInvoiceFieldsLocked(true);

    if (badge)     badge.style.display = '';
    if (unlinkBtn) unlinkBtn.style.display = '';
    if (detailsDiv) {
        detailsDiv.style.display = '';
        detailsDiv.innerHTML = '<strong>Invoice:</strong> ' + (inv.invoiceNo || inv.id)
            + (inv.gstNo ? ' | <strong>GST:</strong> ' + inv.gstNo : '')
            + (inv.amount ? ' | <strong>Amount:</strong> Rs.' + Number(inv.amount).toLocaleString('en-IN') : '')
            + ' | <strong>Customer:</strong> ' + (inv.customer || '—');
    }
    triggerMaterialCalcPreview();
}

function unlinkInvoice() {
    const sel = document.getElementById('linkedInvoiceSelect');
    if (sel) sel.value = '';
    onLinkedInvoiceChange('');
}

function setInvoiceFieldsLocked(locked) {
    ['invoiceDate','customerName','partName','incomingWeight','ratePerKg','quantityAsPerInvoice'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.readOnly = locked;
            el.style.background = locked ? 'var(--bg-secondary)' : '';
            el.style.cursor = locked ? 'not-allowed' : '';
        }
    });
    const note = document.getElementById('lockedFieldsNote');
    if (note) note.style.display = locked ? '' : 'none';
}

function _setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

// ==================== REAL-TIME PREVIEW ====================
let _previewTimer = null;
function triggerMaterialCalcPreview() {
    clearTimeout(_previewTimer);
    _previewTimer = setTimeout(updateMaterialCalcPreview, 150);
}

function updateMaterialCalcPreview() {
    const data = _readFormData();
    const calc = materialCalcManager.calculateFields(data);
    const preview = document.getElementById('materialCalcPreview');
    const hasData = Object.values(data).some(v => parseFloat(v) > 0);
    if (!hasData) { if (preview) preview.style.display = 'none'; return; }
    if (preview) preview.style.display = '';

    const fm = n => 'Rs.' + (parseFloat(n) || 0).toFixed(2);
    const fn = (n, d=2) => (parseFloat(n) || 0).toFixed(d);

    _setPrev('prev_customerInvestedCost',  fm(calc.customerInvestedCost));
    _setPrev('prev_weightPerStrip',        fn(calc.weightPerStrip,3) + ' kg');
    _setPrev('prev_asPerWeight',           fn(calc.asPerWeight));
    _setPrev('prev_productQuantity',       fn(calc.productQuantity,0) + ' pcs');
    _setPrev('prev_actualNeed',            fn(calc.actualNeed,0) + ' pcs');
    _setPrev('prev_difference',            fn(calc.difference,0) + ' pcs');
    _setPrev('prev_ttlStrokeCost',         fm(calc.ttlStrokeCost));
    _setPrev('prev_svrInvoiceCost',        fm(calc.svrInvoiceCost));
    _setPrev('prev_svrInvestedCost',       fm(calc.svrInvestedCost));
    _setPrev('prev_invoiceDifference',     fm(calc.invoiceDifference));
    _setPrev('prev_ttlScrapWeight',        fn(calc.ttlScrapWeight) + ' kg');
    _setPrev('prev_scrapSaleCost',         fm(calc.scrapSaleCost));
    _setPrev('prev_actuallyReceived',      fm(calc.actuallyReceived));

    const plEl = document.getElementById('prev_profitOrLoss');
    const plCont = document.getElementById('prev_plContainer');
    if (plEl) {
        plEl.textContent = fm(calc.profitOrLoss) + ' (' + calc.plStatus + ')';
        plEl.style.color = calc.plStatus === 'Profit' ? '#10b981' : '#ef4444';
    }
    if (plCont) {
        plCont.style.background = calc.plStatus === 'Profit' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
        plCont.style.borderRadius = '6px';
    }
}

function _setPrev(id, val) { const e = document.getElementById(id); if (e) e.textContent = val; }

// ==================== FORM DATA ====================
function _readFormData() {
    const g = id => document.getElementById(id)?.value || 0;
    return {
        invoiceId:           document.getElementById('materialLinkedInvoiceId')?.value || '',
        invoiceDate:         document.getElementById('invoiceDate')?.value || '',
        customerName:        document.getElementById('customerName')?.value || '',
        partName:            document.getElementById('partName')?.value || '',
        partNum:             document.getElementById('partNum')?.value || '',
        incomingWeight:      g('incomingWeight'),
        ratePerKg:           g('ratePerKg'),
        actualWeightSVR:     g('actualWeightSVR'),
        givenWeightCustomer: g('givenWeightCustomer'),
        strokesPerStrip:     g('strokesPerStrip'),
        cavityPerStroke:     g('cavityPerStroke'),
        quantityAsPerInvoice:g('quantityAsPerInvoice'),
        actualNorms:         g('actualNorms'),
        processCost:         g('processCost'),
        customerPOCost:      g('customerPOCost'),
        stripScrapWeight:    g('stripScrapWeight'),
        scrapCost:           g('scrapCost')
    };
}

function clearMaterialForm() {
    _setVal('materialId','');
    _setVal('materialLinkedInvoiceId','');
    const form = document.getElementById('materialForm');
    if (form) form.reset();
    setInvoiceFieldsLocked(false);
    ['linkedInvoiceBadge','unlinkInvoiceBtn','linkedInvoiceDetails','materialCalcPreview'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function _fillForm(m) {
    _setVal('materialId',             m.id || '');
    _setVal('materialLinkedInvoiceId',m.invoiceId || '');
    _setVal('invoiceDate',            m.invoiceDate || '');
    _setVal('customerName',           m.customerName || '');
    _setVal('partName',               m.partName || '');
    _setVal('partNum',                m.partNum || '');
    _setVal('incomingWeight',         m.incomingWeight || '');
    _setVal('ratePerKg',              m.ratePerKg || '');
    _setVal('actualWeightSVR',        m.actualWeightSVR || '');
    _setVal('givenWeightCustomer',    m.givenWeightCustomer || '');
    _setVal('strokesPerStrip',        m.strokesPerStrip || '');
    _setVal('cavityPerStroke',        m.cavityPerStroke || '');
    _setVal('quantityAsPerInvoice',   m.quantityAsPerInvoice || '');
    _setVal('actualNorms',            m.actualNorms || '');
    _setVal('processCost',            m.processCost || '');
    _setVal('customerPOCost',         m.customerPOCost || '');
    _setVal('stripScrapWeight',       m.stripScrapWeight || '');
    _setVal('scrapCost',              m.scrapCost || '');
}

// ==================== SAVE ====================
function saveMaterial() {
    if (!requireEditPermission()) return;
    const materialId = document.getElementById('materialId').value;
    const material = _readFormData();

    if (!material.customerName && !material.invoiceId) {
        showNotification('Please select an invoice or enter a customer name.', 'warning');
        return;
    }

    if (materialId) {
        materialCalcManager.updateMaterial(materialId, material);
        showNotification('Material calculation updated!', 'success');
    } else {
        materialCalcManager.addMaterial(material);
        showNotification('Material calculation saved!', 'success');
    }

    document.getElementById('materialModal').style.display = 'none';
    loadMaterialTable();
    displayMaterialSummary();
}

// ==================== TABLE ====================
function loadMaterialTable() {
    const tbody = document.getElementById('materialCostingTableBody') || document.getElementById('materialTableBody');
    if (!tbody) return;
    const materials = materialCalcManager.getAllMaterials();
    if (materials.length === 0) {
        tbody.innerHTML = '<tr><td colspan="32" class="text-center" style="color:var(--text-secondary);padding:2rem;">No material calculations yet. Click "New Calculation" to get started.</td></tr>';
        return;
    }
    tbody.innerHTML = '';
    materials.forEach(m => tbody.appendChild(createMaterialRow(m)));
}

function createMaterialRow(m) {
    const tr = document.createElement('tr');
    tr.className = m.plStatus === 'Profit' ? 'profit-row' : 'loss-row';
    const canEdit = canEditMaterialCalc();
    const linkBadge = m.invoiceId
        ? '<span style="font-size:0.7rem;background:#dbeafe;color:#1e40af;padding:1px 5px;border-radius:4px;margin-left:4px;">Linked</span>' : '';

    tr.innerHTML = `
        <td>${_fd(m.invoiceDate)}${linkBadge}</td>
        <td>${_esc(m.customerName)}</td>
        <td>${_esc(m.partName)}</td>
        <td>${_esc(m.partNum)}</td>
        <td>${_n(m.incomingWeight)}</td>
        <td>Rs.${_n(m.ratePerKg)}</td>
        <td>Rs.${_n(m.customerInvestedCost)}</td>
        <td>${_n(m.weightPerStrip,3)}</td>
        <td>${_n(m.asPerWeight)}</td>
        <td>${_n(m.actualWeightSVR)}</td>
        <td>${_n(m.givenWeightCustomer)}</td>
        <td>${m.strokesPerStrip||0}</td>
        <td>${m.cavityPerStroke||0}</td>
        <td>${_n(m.productQuantity,0)}</td>
        <td>${_n(m.quantityAsPerInvoice,0)}</td>
        <td>${_n(m.actualNorms,0)}</td>
        <td>${_n(m.actualNeed,0)}</td>
        <td>${_n(m.difference,0)}</td>
        <td>Rs.${_n(m.processCost)}</td>
        <td>Rs.${_n(m.ttlStrokeCost)}</td>
        <td>Rs.${_n(m.customerPOCost)}</td>
        <td>Rs.${_n(m.svrInvoiceCost)}</td>
        <td>Rs.${_n(m.svrInvestedCost)}</td>
        <td>Rs.${_n(m.invoiceDifference)}</td>
        <td>${_n(m.stripScrapWeight)}</td>
        <td>${_n(m.ttlScrapWeight)}</td>
        <td>Rs.${_n(m.scrapCost)}</td>
        <td>Rs.${_n(m.scrapSaleCost)}</td>
        <td>Rs.${_n(m.actuallyReceived)}</td>
        <td class="${m.plStatus==='Profit'?'profit-text':'loss-text'}">Rs.${_n(m.profitOrLoss)}</td>
        <td><span class="pl-badge ${m.plStatus==='Profit'?'profit-badge':'loss-badge'}">${m.plStatus}</span></td>
        <td>${canEdit
            ? `<button class="btn-icon" onclick="editMaterial('${m.id}')" title="Edit"><i class="fas fa-edit"></i></button>
               <button class="btn-icon btn-danger" onclick="deleteMaterial('${m.id}')" title="Delete"><i class="fas fa-trash"></i></button>`
            : '<span style="color:var(--text-secondary);font-size:0.75rem;">View Only</span>'
        }</td>`;
    return tr;
}

// ==================== EDIT / DELETE ====================
function editMaterial(id) {
    if (!requireEditPermission()) return;
    const m = materialCalcManager.getMaterial(id);
    if (!m) return;

    clearMaterialForm();
    _fillForm(m);
    populateInvoiceDropdown(m.invoiceId);

    if (m.invoiceId) {
        const sel = document.getElementById('linkedInvoiceSelect');
        if (sel) sel.value = m.invoiceId;
        setInvoiceFieldsLocked(true);
        const badge     = document.getElementById('linkedInvoiceBadge');
        const unlinkBtn = document.getElementById('unlinkInvoiceBtn');
        const detailsDiv= document.getElementById('linkedInvoiceDetails');
        if (badge)     badge.style.display = '';
        if (unlinkBtn) unlinkBtn.style.display = '';
        if (detailsDiv){ detailsDiv.style.display=''; detailsDiv.textContent = 'Linked Invoice: ' + m.invoiceId; }
    }

    triggerMaterialCalcPreview();
    document.getElementById('materialFormTitle').textContent = 'Edit Material Calculation';
    document.getElementById('materialModal').style.display = 'block';
}

function deleteMaterial(id) {
    if (!requireEditPermission()) return;
    if (!confirm('Delete this material calculation record?')) return;
    materialCalcManager.deleteMaterial(id);
    loadMaterialTable();
    displayMaterialSummary();
    showNotification('Record deleted.', 'success');
}

// ==================== SUMMARY / ANALYTICS ====================
function displayMaterialSummary() {
    const container = document.getElementById('materialSummary');
    if (!container) return;
    const s = materialCalcManager.getSummary();
    const nc = s.netProfitLoss >= 0 ? '#10b981' : '#ef4444';
    const nbg = s.netProfitLoss >= 0
        ? 'background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(6,95,70,0.15));'
        : 'background:linear-gradient(135deg,rgba(239,68,68,0.15),rgba(153,27,27,0.15));';

    container.innerHTML = `
        <div class="stat-card" style="border-top:4px solid #3b82f6;">
            <div class="stat-label">Total Records</div>
            <div class="stat-value">${s.totalRecords}</div>
            <div class="stat-change">${s.linkedInvoiceCount} linked to invoices</div>
        </div>
        <div class="stat-card" style="border-top:4px solid #10b981;">
            <div class="stat-label">Total Profit</div>
            <div class="stat-value" style="color:#10b981;">Rs.${s.totalProfit.toFixed(2)}</div>
            <div class="stat-change">Profitable batches</div>
        </div>
        <div class="stat-card" style="border-top:4px solid #ef4444;">
            <div class="stat-label">Total Loss</div>
            <div class="stat-value" style="color:#ef4444;">Rs.${s.totalLoss.toFixed(2)}</div>
            <div class="stat-change">Loss batches</div>
        </div>
        <div class="stat-card" style="${nbg}border-top:4px solid ${nc};">
            <div class="stat-label">Net P / L</div>
            <div class="stat-value" style="color:${nc};">Rs.${s.netProfitLoss.toFixed(2)}</div>
            <div class="stat-change">${s.netProfitLoss>=0?'Overall Profitable':'Overall Loss'}</div>
        </div>
        <div class="stat-card" style="border-top:4px solid #8b5cf6;">
            <div class="stat-label">Material Processed</div>
            <div class="stat-value">${s.totalMaterialProcessed.toFixed(2)} kg</div>
            <div class="stat-change">Total incoming weight</div>
        </div>
        <div class="stat-card" style="border-top:4px solid #f59e0b;">
            <div class="stat-label">Total Scrap</div>
            <div class="stat-value">${s.totalScrapWeight.toFixed(2)} kg</div>
            <div class="stat-change">Generated scrap weight</div>
        </div>`;
}

// ==================== SEARCH ====================
function searchMaterials(query) {
    const tbody = document.getElementById('materialCostingTableBody') || document.getElementById('materialTableBody');
    if (!tbody) return;
    const q = (query || '').toLowerCase().trim();
    const all = materialCalcManager.getAllMaterials();
    const list = q ? all.filter(m =>
        (m.customerName||'').toLowerCase().includes(q) ||
        (m.partName||'').toLowerCase().includes(q) ||
        (m.partNum||'').toLowerCase().includes(q) ||
        (m.plStatus||'').toLowerCase().includes(q)
    ) : all;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="32" class="text-center" style="color:var(--text-secondary);padding:1rem;">No records match your search.</td></tr>`;
        return;
    }
    tbody.innerHTML = '';
    list.forEach(m => tbody.appendChild(createMaterialRow(m)));
}

// ==================== EXPORT ====================
function exportMaterialToExcel() {
    const all = materialCalcManager.getAllMaterials();
    if (!all.length) { showNotification('No data to export!','warning'); return; }
    const hdr = ['Inv Date','Customer','Part Name','Part No','In.Wt(kg)','Rate/Kg','Cust Inv Cost',
        'Wt/Strip','As Per Wt','Act Wt SVR','Given Wt','Strokes','Cavity','Prod Qty','Inv Qty',
        'Norms','Actual Need','Diff','Proc Cost','Stroke Cost','Cust PO Cost','SVR Inv Cost',
        'SVR Invested','Cust/SVR Diff','Scrap Wt','TTL Scrap(kg)','Scrap Rate','Scrap Sale',
        'Act Received','Profit/Loss','Status'];
    const rows = [hdr.join(',')];
    all.forEach(m => {
        rows.push([
            m.invoiceDate,`"${m.customerName}"`,`"${m.partName}"`,`"${m.partNum}"`,
            m.incomingWeight,m.ratePerKg,(m.customerInvestedCost||0).toFixed(2),
            (m.weightPerStrip||0).toFixed(3),(m.asPerWeight||0).toFixed(2),
            m.actualWeightSVR,m.givenWeightCustomer,m.strokesPerStrip,m.cavityPerStroke,
            (m.productQuantity||0).toFixed(0),(m.quantityAsPerInvoice||0).toFixed(0),
            m.actualNorms,(m.actualNeed||0).toFixed(0),(m.difference||0).toFixed(0),
            m.processCost,(m.ttlStrokeCost||0).toFixed(2),m.customerPOCost,
            (m.svrInvoiceCost||0).toFixed(2),(m.svrInvestedCost||0).toFixed(2),
            (m.invoiceDifference||0).toFixed(2),m.stripScrapWeight,
            (m.ttlScrapWeight||0).toFixed(2),m.scrapCost,
            (m.scrapSaleCost||0).toFixed(2),(m.actuallyReceived||0).toFixed(2),
            (m.profitOrLoss||0).toFixed(2),m.plStatus
        ].join(','));
    });
    const blob = new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Material_Costing_' + new Date().toISOString().split('T')[0] + '.csv';
    a.style.display = 'none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showNotification('Exported to CSV successfully!','success');
}

function exportMaterialToPdf() { showNotification('PDF export coming soon!','info'); }

// ==================== HELPERS ====================
function _fd(ds) {
    if (!ds) return '';
    const d = new Date(ds);
    return isNaN(d) ? ds : d.toLocaleDateString('en-IN');
}
function _esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function _n(v, d=2) { return (parseFloat(v)||0).toFixed(d); }

function showNotification(msg, type='info') {
    if (typeof showToast === 'function') showToast(msg, type);
    else console.log('[' + type.toUpperCase() + '] ' + msg);
}
