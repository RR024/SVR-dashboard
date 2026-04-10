// =========================================
// DC INVOICE (DELIVERY CHALLAN) MODULE
// =========================================

const DC_NO_SEQUENCE_KEY = 'dcInvoiceNextNumber';
const DC_INVOICES_STORAGE_KEY = 'dcInvoices';
let activeDCInvoiceId = '';

function formatDCNumber(number) {
		return `DC${String(Math.max(1, number)).padStart(3, '0')}`;
}

function parseDCNumber(value) {
		const match = String(value || '').trim().match(/^DC\/?(\d+)$/i);
		if (!match) return null;

		const parsed = parseInt(match[1], 10);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getNextDCNumber() {
		const stored = parseInt(localStorage.getItem(DC_NO_SEQUENCE_KEY) || '1', 10);
		const nextNumber = Number.isFinite(stored) && stored > 0 ? stored : 1;
		return formatDCNumber(nextNumber);
}

function reserveNextDCNumber(currentDCNo) {
		const parsedCurrent = parseDCNumber(currentDCNo) || 0;
		const stored = parseInt(localStorage.getItem(DC_NO_SEQUENCE_KEY) || '1', 10);
		const storedValue = Number.isFinite(stored) && stored > 0 ? stored : 1;
		const nextValue = Math.max(storedValue, parsedCurrent + 1);

		localStorage.setItem(DC_NO_SEQUENCE_KEY, String(nextValue));
		return formatDCNumber(nextValue);
}

function setDefaultDCNumber() {
		const dcNoInput = document.getElementById('dcNo');
		if (!dcNoInput || dcNoInput.value.trim()) return;

		dcNoInput.value = getNextDCNumber();
	}

function switchDCTab(tabName) {
		const inputTab = document.getElementById('dcInputTab');
		const allTab = document.getElementById('dcAllTab');
		const inputContent = document.getElementById('dcInputTabContent');
		const allContent = document.getElementById('dcAllTabContent');

		const showInput = tabName !== 'all';

		if (inputTab) inputTab.classList.toggle('active', showInput);
		if (allTab) allTab.classList.toggle('active', !showInput);
		if (inputContent) inputContent.style.display = showInput ? '' : 'none';
		if (allContent) allContent.style.display = showInput ? 'none' : '';
}

function loadDCInvoiceModule() {
		loadDCCustomerDropdown();
		updateDCVehicleDropdown('');
		ensureDCDefaultRows();
		setDefaultDCNumber();
		loadSavedDCInvoices();
		switchDCTab('input');

		const dcDate = document.getElementById('dcDate');
		if (dcDate && !dcDate.value) {
				dcDate.value = new Date().toISOString().slice(0, 10);
		}
}

function getStoredDCInvoices() {
		if (typeof loadFromStorage === 'function') {
				return loadFromStorage(DC_INVOICES_STORAGE_KEY) || [];
		}

		return JSON.parse(localStorage.getItem(DC_INVOICES_STORAGE_KEY) || '[]');
}

function saveDCInvoices(invoices) {
		if (typeof saveToStorage === 'function') {
				saveToStorage(DC_INVOICES_STORAGE_KEY, invoices);
				return;
		}

		localStorage.setItem(DC_INVOICES_STORAGE_KEY, JSON.stringify(invoices));
}

function collectCurrentDCInvoice() {
		const customerId = document.getElementById('dcCustomerDropdown')?.value || '';
		const customerName = document.getElementById('dcCustomerName')?.value?.trim() || '';
		const customerAddress = document.getElementById('dcCustomerAddress')?.value?.trim() || '';
		const customerGSTIN = document.getElementById('dcCustomerGSTIN')?.value?.trim() || '';
		const dcNo = document.getElementById('dcNo')?.value?.trim() || '';
		const yourDcNo = document.getElementById('dcYourNo')?.value?.trim() || '';
		const vehicleNo = document.getElementById('dcVehicleNo')?.value?.trim() || '';
		const vendorCode = document.getElementById('dcVendorCode')?.value?.trim() || '';
		const date = document.getElementById('dcDate')?.value || '';
		const refDate = document.getElementById('dcRefDate')?.value || '';
		const items = getDCItems();

		return {
				customerId,
				customerName,
				customerAddress,
				customerGSTIN,
				dcNo,
				yourDcNo,
				vehicleNo,
				vendorCode,
				date,
				refDate,
				items
		};
}

function saveCurrentDCInvoice() {
		setDefaultDCNumber();
		const payload = collectCurrentDCInvoice();

		if (!payload.dcNo) {
				if (typeof showToast === 'function') showToast('DC No is required', 'error');
				return;
		}

		if (!payload.customerName) {
				if (typeof showToast === 'function') showToast('Please select or enter customer details', 'error');
				return;
		}

		if (!payload.items.length) {
				if (typeof showToast === 'function') showToast('Please add at least one item before saving', 'error');
				return;
		}

		const invoices = getStoredDCInvoices();
		const now = Date.now();
		const activeInvoice = activeDCInvoiceId ? invoices.find(inv => inv.id === activeDCInvoiceId) : null;
		const isEditingCurrentInvoice = !!(activeInvoice && activeInvoice.dcNo === payload.dcNo);
		const idToSave = isEditingCurrentInvoice ? activeDCInvoiceId : `dc_${now}`;
		const invoice = {
				id: idToSave,
				...payload,
				updatedAt: now,
				createdAt: now
		};

		const existingIndex = invoices.findIndex(inv => inv.id === idToSave || inv.dcNo === payload.dcNo);
		if (existingIndex >= 0) {
				invoice.createdAt = invoices[existingIndex].createdAt || now;
				invoices[existingIndex] = invoice;
		} else {
				invoices.push(invoice);
		}

		invoices.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
		saveDCInvoices(invoices);
		activeDCInvoiceId = invoice.id;
		reserveNextDCNumber(payload.dcNo);
		loadSavedDCInvoices();

		if (typeof showToast === 'function') {
				showToast('DC challan saved successfully', 'success');
		}
}

function loadSavedDCInvoices() {
		const tbody = document.getElementById('dcSavedTableBody');
		if (!tbody) return;

		const invoices = getStoredDCInvoices();
		if (!invoices.length) {
				tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color: var(--text-secondary);">No saved DC challans yet.</td></tr>';
				return;
		}

		tbody.innerHTML = invoices.map(invoice => {
				const itemCount = Array.isArray(invoice.items) ? invoice.items.length : 0;
				return `
						<tr>
								<td>${escapeHTML(invoice.dcNo || '')}</td>
								<td>${escapeHTML(invoice.customerName || '')}</td>
								<td>${escapeHTML(formatDisplayDate(invoice.date || ''))}</td>
								<td>${itemCount}</td>
								<td>
										<button class="btn btn-secondary btn-sm" type="button" onclick="loadSavedDCInvoice('${escapeAttr(invoice.id || '')}')">View</button>
										<button class="btn btn-danger btn-sm" type="button" onclick="deleteSavedDCInvoice('${escapeAttr(invoice.id || '')}')">Delete</button>
								</td>
						</tr>
				`;
		}).join('');
}

function loadSavedDCInvoice(invoiceId) {
		const invoice = getStoredDCInvoices().find(inv => inv.id === invoiceId);
		if (!invoice) {
				if (typeof showToast === 'function') showToast('Saved DC challan not found', 'error');
				return;
		}

		const customerDropdown = document.getElementById('dcCustomerDropdown');
		if (customerDropdown) {
				customerDropdown.value = invoice.customerId || '';
				fillDCCustomerDetails();
		}

		const customerName = document.getElementById('dcCustomerName');
		const customerAddress = document.getElementById('dcCustomerAddress');
		const customerGSTIN = document.getElementById('dcCustomerGSTIN');
		const dcNo = document.getElementById('dcNo');
		const dcYourNo = document.getElementById('dcYourNo');
		const dcVehicleNo = document.getElementById('dcVehicleNo');
		const dcVendorCode = document.getElementById('dcVendorCode');
		const dcDate = document.getElementById('dcDate');
		const dcRefDate = document.getElementById('dcRefDate');

		if (customerName) customerName.value = invoice.customerName || '';
		if (customerAddress) customerAddress.value = invoice.customerAddress || '';
		if (customerGSTIN) customerGSTIN.value = invoice.customerGSTIN || '';
		if (dcNo) dcNo.value = invoice.dcNo || '';
		if (dcYourNo) dcYourNo.value = invoice.yourDcNo || '';
		if (dcVendorCode) dcVendorCode.value = invoice.vendorCode || '';
		if (dcDate) dcDate.value = invoice.date || '';
		if (dcRefDate) dcRefDate.value = invoice.refDate || '';

		if (dcVehicleNo) {
				const vehicleValue = invoice.vehicleNo || '';
				if (vehicleValue && !Array.from(dcVehicleNo.options).some(option => option.value === vehicleValue)) {
						const option = document.createElement('option');
						option.value = vehicleValue;
						option.textContent = vehicleValue;
						dcVehicleNo.appendChild(option);
				}
				dcVehicleNo.value = vehicleValue;
		}

		const tbody = document.getElementById('dcItemsBody');
		if (tbody) {
				tbody.innerHTML = '';
				(invoice.items || []).forEach(item => addDCItemRow(item));
				if (!(invoice.items || []).length) ensureDCDefaultRows();
		}

		activeDCInvoiceId = invoice.id;
		switchDCTab('input');
		if (typeof showToast === 'function') showToast(`Loaded ${invoice.dcNo || 'saved DC challan'}`, 'success');
}

function deleteSavedDCInvoice(invoiceId) {
		const invoices = getStoredDCInvoices();
		const invoice = invoices.find(inv => inv.id === invoiceId);
		if (!invoice) {
				if (typeof showToast === 'function') showToast('Saved DC challan not found', 'error');
				return;
		}

		const confirmed = typeof confirm === 'function' ? confirm(`Delete ${invoice.dcNo || 'this DC challan'}?`) : true;
		if (!confirmed) return;

		const updated = invoices.filter(inv => inv.id !== invoiceId);
		saveDCInvoices(updated);
		if (activeDCInvoiceId === invoiceId) {
				activeDCInvoiceId = '';
		}
		loadSavedDCInvoices();

		if (typeof showToast === 'function') showToast('Saved DC challan deleted', 'success');
}

function loadDCCustomerDropdown() {
		const dropdown = document.getElementById('dcCustomerDropdown');
		if (!dropdown || typeof getCustomers !== 'function') return;

		const customers = getCustomers().filter(c => (c.type || 'customer') === 'customer');
		let html = '<option value="">-- Select Customer --</option>';

		customers.forEach(customer => {
				html += `<option value="${customer.id}">${escapeHTML(customer.companyName || '')}</option>`;
		});

		dropdown.innerHTML = html;
}

function fillDCCustomerDetails() {
		const dropdown = document.getElementById('dcCustomerDropdown');
		if (!dropdown || typeof getCustomers !== 'function') return;

		const customerId = dropdown.value;
		const nameEl = document.getElementById('dcCustomerName');
		const addressEl = document.getElementById('dcCustomerAddress');
		const gstinEl = document.getElementById('dcCustomerGSTIN');

		if (!customerId) {
				if (nameEl) nameEl.value = '';
				if (addressEl) addressEl.value = '';
				if (gstinEl) gstinEl.value = '';
				updateDCVehicleDropdown('');
				updateDCDescriptionDropdowns('');
				return;
		}

		const customer = getCustomers().find(c => c.id === customerId);
		if (!customer) return;

		if (nameEl) nameEl.value = customer.companyName || '';
		if (addressEl) addressEl.value = customer.address || '';
		if (gstinEl) gstinEl.value = customer.gstin || '';

		updateDCVehicleDropdown(customerId);
		updateDCDescriptionDropdowns(customerId);
}

function getSelectedDCCustomerId() {
		const dropdown = document.getElementById('dcCustomerDropdown');
		return dropdown ? dropdown.value : '';
}

function updateDCVehicleDropdown(customerId) {
		const dropdown = document.getElementById('dcVehicleNo');
		if (!dropdown || typeof getCustomerVehicles !== 'function') return;

		if (!customerId) {
				dropdown.innerHTML = '<option value="">-- Select Vehicle --</option>';
				return;
		}

		const vehicles = getCustomerVehicles(customerId);
		let html = '<option value="">-- Select Vehicle --</option>';
		vehicles.forEach(vehicle => {
				html += `<option value="${escapeAttr(vehicle.number || '')}">${escapeHTML(vehicle.number || '')}</option>`;
		});
		html += '<option value="__ADD_NEW__">âž• Add New Vehicle</option>';

		dropdown.innerHTML = html;
}

function handleDCVehicleSelection(selectElement) {
		if (!selectElement || selectElement.value !== '__ADD_NEW__') return;

		const customerId = getSelectedDCCustomerId();
		if (!customerId) {
				if (typeof showToast === 'function') showToast('Please select customer first', 'warning');
				selectElement.value = '';
				return;
		}

		const vehicleInput = prompt('Enter new vehicle number (e.g., TN-01-AB-1234):');
		if (!vehicleInput || !vehicleInput.trim()) {
				selectElement.value = '';
				return;
		}

		const formattedVehicle = vehicleInput.trim().toUpperCase();
		const customers = typeof getCustomers === 'function' ? getCustomers() : [];
		const customerIndex = customers.findIndex(c => c.id === customerId);
		if (customerIndex === -1) {
				selectElement.value = '';
				return;
		}

		if (!customers[customerIndex].vehicles) customers[customerIndex].vehicles = [];
		const duplicate = customers[customerIndex].vehicles.some(v => (v.number || '').toUpperCase() === formattedVehicle);
		if (!duplicate) {
				customers[customerIndex].vehicles.push({ id: 'veh_' + Date.now(), number: formattedVehicle });
				if (typeof saveToStorage === 'function') {
						saveToStorage('customers', customers);
				} else {
						localStorage.setItem('customers', JSON.stringify(customers));
				}
		}

		updateDCVehicleDropdown(customerId);
		selectElement.value = formattedVehicle;
}

function ensureDCDefaultRows() {
		const tbody = document.getElementById('dcItemsBody');
		if (!tbody) return;

		if (tbody.children.length > 0) {
				renumberDCRows();
				return;
		}

		for (let i = 0; i < 6; i++) {
				addDCItemRow();
		}
}

function addDCItemRow(data = {}) {
		const tbody = document.getElementById('dcItemsBody');
		if (!tbody) return;
		const customerId = getSelectedDCCustomerId();
		const products = customerId && typeof getCustomerProducts === 'function' ? getCustomerProducts(customerId) : [];

		let options = '<option value="">-- Select Product --</option>';
		products.forEach(product => {
				const selected = data.description && (data.description === product.description || data.description === product.id) ? 'selected' : '';
				options += `<option value="${escapeAttr(product.id || '')}" ${selected}>${escapeHTML(product.description || '')}</option>`;
		});
		options += '<option value="__CUSTOM__">âœï¸ Custom Description</option>';

		const hasCustom = data.description && !products.some(p => data.description === p.description || data.description === p.id);

		const tr = document.createElement('tr');
		tr.className = 'dc-item-row';
		tr.innerHTML = `
				<td class="dc-sno" style="text-align:center;"></td>
				<td>
						<select class="form-control dc-desc-select" onchange="handleDCDescriptionSelection(this)">
								${options}
						</select>
						<input type="text" class="form-control dc-desc-custom" value="${escapeAttr(hasCustom ? (data.description || '') : '')}" placeholder="Enter description" style="margin-top: 0.35rem; display: ${hasCustom ? 'block' : 'none'};">
				</td>
				<td><input type="number" class="form-control dc-qty" value="${escapeAttr(data.qty || '')}" min="0" step="0.01" placeholder="Qty"></td>
				<td><input type="text" class="form-control dc-uom" value="${escapeAttr(data.uom || '')}" placeholder="UOM"></td>
				<td><input type="text" class="form-control dc-remarks" value="${escapeAttr(data.remarks || '')}" placeholder="Remarks"></td>
				<td style="text-align:center;"><button type="button" class="icon-btn delete" onclick="removeDCItemRow(this)">ðŸ—‘ï¸</button></td>
		`;

		tbody.appendChild(tr);
		if (hasCustom) {
				const select = tr.querySelector('.dc-desc-select');
				if (select) select.value = '__CUSTOM__';
		}
		renumberDCRows();
}

function handleDCDescriptionSelection(selectElement) {
		if (!selectElement) return;
		const row = selectElement.closest('.dc-item-row');
		if (!row) return;
		const customInput = row.querySelector('.dc-desc-custom');
		if (!customInput) return;

		if (selectElement.value === '__CUSTOM__') {
				customInput.style.display = 'block';
				customInput.focus();
		} else {
				customInput.style.display = 'none';
				customInput.value = '';
		}
}

function updateDCDescriptionDropdowns(customerId) {
		const rows = document.querySelectorAll('#dcItemsBody .dc-item-row');
		const products = customerId && typeof getCustomerProducts === 'function' ? getCustomerProducts(customerId) : [];

		rows.forEach(row => {
				const select = row.querySelector('.dc-desc-select');
				const customInput = row.querySelector('.dc-desc-custom');
				if (!select) return;

				const previousValue = select.value;
				const customValue = customInput ? customInput.value.trim() : '';

				let options = '<option value="">-- Select Product --</option>';
				products.forEach(product => {
						options += `<option value="${escapeAttr(product.id || '')}">${escapeHTML(product.description || '')}</option>`;
				});
				options += '<option value="__CUSTOM__">âœï¸ Custom Description</option>';
				select.innerHTML = options;

				if (previousValue === '__CUSTOM__') {
						select.value = '__CUSTOM__';
						if (customInput) customInput.style.display = 'block';
				} else if (products.some(p => p.id === previousValue)) {
						select.value = previousValue;
						if (customInput) customInput.style.display = 'none';
				} else if (customValue) {
						select.value = '__CUSTOM__';
						if (customInput) customInput.style.display = 'block';
				} else {
						select.value = '';
						if (customInput) {
								customInput.style.display = 'none';
								customInput.value = '';
						}
				}
		});
}

function removeDCItemRow(button) {
		const row = button && button.closest('tr');
		if (!row) return;

		const tbody = document.getElementById('dcItemsBody');
		row.remove();

		if (tbody && tbody.children.length === 0) {
				addDCItemRow();
		}

		renumberDCRows();
}

function renumberDCRows() {
		const rows = document.querySelectorAll('#dcItemsBody .dc-item-row');
		rows.forEach((row, index) => {
				const sno = row.querySelector('.dc-sno');
				if (sno) sno.textContent = String(index + 1);
		});
}

function getDCItems() {
		const rows = document.querySelectorAll('#dcItemsBody .dc-item-row');
		const items = [];

		rows.forEach((row, index) => {
				const descSelect = row.querySelector('.dc-desc-select');
				const descCustom = row.querySelector('.dc-desc-custom');
				let description = '';

				if (descSelect && descSelect.value) {
						if (descSelect.value === '__CUSTOM__') {
								description = descCustom?.value?.trim() || '';
						} else {
								description = descSelect.options[descSelect.selectedIndex]?.text?.trim() || '';
								if (description === '-- Select Product --' || description === 'âœï¸ Custom Description') {
										description = '';
								}

								if (!description) {
										const customerId = getSelectedDCCustomerId();
										const products = customerId && typeof getCustomerProducts === 'function' ? getCustomerProducts(customerId) : [];
										const selectedProduct = products.find(p => p.id === descSelect.value);
										description = selectedProduct ? (selectedProduct.description || '') : '';
								}
						}
				}
				const qty = row.querySelector('.dc-qty')?.value?.trim() || '';
				const uom = row.querySelector('.dc-uom')?.value?.trim() || '';
				const remarks = row.querySelector('.dc-remarks')?.value?.trim() || '';

				if (!description && !qty && !uom && !remarks) return;

				items.push({
						sno: String(index + 1),
						description,
						qty,
						uom,
						remarks
				});
		});

		return items;
}

function printDCInvoice() {
const customerName = document.getElementById('dcCustomerName')?.value?.trim() || '';
const customerAddress = document.getElementById('dcCustomerAddress')?.value?.trim() || '';
const customerGstin = document.getElementById('dcCustomerGSTIN')?.value?.trim() || '';
const dcNo = document.getElementById('dcNo')?.value?.trim() || '';
const yourDcNo = document.getElementById('dcYourNo')?.value?.trim() || '';
const vehicleNo = document.getElementById('dcVehicleNo')?.value?.trim() || '';
const vendorCode = document.getElementById('dcVendorCode')?.value?.trim() || '';
const date = document.getElementById('dcDate')?.value || '';
const refDate = document.getElementById('dcRefDate')?.value || '';

if (!customerName) {
if (typeof showToast === 'function') {
showToast('Please select or enter customer details', 'error');
}
return;
}

const items = getDCItems();
const rows = [];
const totalRows = Math.max(items.length, 1) + 4;

for (let i = 0; i < totalRows; i++) {
const item = items[i] || { sno: '', description: '', qty: '', uom: '', remarks: '' };
const emptyClass = item.sno ? '' : ' class="empty-row"';
rows.push(`
<tr${emptyClass}>
<td class="center">${escapeHTML(item.sno)}</td>
<td class="desc">${escapeHTML(item.description)}</td>
<td class="center">${escapeHTML(item.qty)}</td>
<td class="center">${escapeHTML(item.uom)}</td>
<td class="center">${escapeHTML(item.remarks)}</td>
</tr>
`);
}

const rowMarkup = rows.join('');
const addressParts = String(customerAddress || '')
.split(/\n|,/)
.map(part => part.trim())
.filter(Boolean)
.slice(0, 3);

const infoLeft = [
`<div><strong>M/s.${escapeHTML(customerName)}</strong></div>`,
...addressParts.map(line => `<div>${escapeHTML(line)}</div>`),
`<div>GSTIN : ${customerGstin ? escapeHTML(customerGstin) : '&nbsp;'}</div>`
].join('');

const infoRight = `
<div class="dc-row">
<span class="dc-label">DC No. :</span>
<span class="dc-value">${escapeHTML(dcNo)}</span>
<span class="dc-date">Date : ${escapeHTML(formatDisplayDate(date))}</span>
</div>
<div class="dc-row">
<span class="dc-label">Your DC No :</span>
<span class="dc-value">${escapeHTML(yourDcNo)}</span>
<span class="dc-date">Date : ${refDate ? escapeHTML(formatDisplayDate(refDate)) : ''}</span>
</div>
<div class="dc-row">
<span class="dc-label">Vechical No :</span>
<span class="dc-value">${escapeHTML(vehicleNo)}</span>
</div>
<div class="dc-row">
<span class="dc-label">Vendor Code :</span>
<span class="dc-value">${escapeHTML(vendorCode)}</span>
</div>
`;

let logoSrc = 'logo.png';
try {
logoSrc = new URL('logo.png', window.location.href).href;
} catch (_error) {
logoSrc = 'logo.png';
}

const challanTemplate = buildChallanTemplate(infoLeft, infoRight, rowMarkup, logoSrc);

const printWindow = window.open('', '_blank');
if (!printWindow) {
if (typeof showToast === 'function') {
showToast('Pop-up blocked. Please allow pop-ups to print challan.', 'error');
}
return;
}

const nextDcNo = reserveNextDCNumber(dcNo);
const dcNoInput = document.getElementById('dcNo');
if (dcNoInput) dcNoInput.value = nextDcNo;

printWindow.document.write(challanTemplate);
printWindow.document.close();
printWindow.focus();
setTimeout(() => {
printWindow.print();
}, 300);
}

function formatDisplayDate(value) {
if (!value) return '';
const date = new Date(value);
if (Number.isNaN(date.getTime())) return value;
return date.toLocaleDateString('en-GB');
}

function buildChallanTemplate(infoLeft, infoRight, rowMarkup, logoSrc) {
return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<base href="${escapeAttr(document.baseURI)}">
<title>Delivery Challan - Sri Veera Raghava Sheet Metal Component</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #f0f0f0; font-family: Arial, sans-serif; }
.no-print { text-align: center; padding: 10px; background: #fff; border-bottom: 1px solid #ccc; margin-bottom: 12px; }
.no-print button { padding: 8px 24px; font-size: 14px; cursor: pointer; border: 1px solid #333; background: #fff; border-radius: 4px; }
.page { width: 210mm; margin: 0 auto; padding: 6mm; background: #fff; }
.challan { border: 1px solid #000; padding: 4mm; margin-bottom: 6mm; font-size: 11px; }
.header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2mm; font-size: 10px; }
.company-block { text-align: center; margin-bottom: 2mm; }
.company-row { display: flex; align-items: center; justify-content: center; gap: 7mm; transform: translateX(-10mm); }
.company-name { font-size: 18px; font-weight: bold; margin: 1mm 0; }
.company-sub { font-size: 10px; }
.dc-title { font-size: 13px; font-weight: bold; text-decoration: underline; }
.address-dc-row { display: flex; gap: 0; margin-bottom: 2mm; border: 1px solid #000; }
.address-block { flex: 1; padding: 2mm; border-right: 1px solid #000; font-size: 10px; line-height: 1.6; }
.dc-fields { flex: 1.1; padding: 2mm; font-size: 10px; }
.dc-row { display: flex; margin-bottom: 2mm; align-items: center; }
.dc-label { width: 90px; font-weight: normal; color: #000; white-space: nowrap; }
.dc-value { flex: 1; font-weight: normal; border-bottom: 1px solid #000; padding-bottom: 1px; min-width: 80px; }
.dc-date { margin-left: 6mm; font-size: 10px; white-space: nowrap; }
table.goods { width: 100%; border-collapse: collapse; margin-top: 2mm; }
table.goods th, table.goods td { border: 1px solid #000; padding: 2mm 3mm; font-size: 10px; }
table.goods th { background: #f5f5f5; font-weight: bold; text-align: center; }
table.goods td.desc { text-align: left; }
table.goods td.center { text-align: center; }
.empty-row td { height: 8mm; }
.certify { font-size: 9px; margin-top: 2mm; margin-bottom: 1mm; }
.sign-row { display: flex; border: 1px solid #000; }
.sign-cell { flex: 1; border-right: 1px solid #000; padding: 2mm; min-height: 14mm; font-size: 9px; text-align: center; }
.sign-cell:last-child { border-right: none; }
.logo-wrap { width: 68px; height: 54px; display: flex; align-items: center; justify-content: flex-start; }
.logo-wrap img { width: 68px; height: 54px; object-fit: contain; object-position: left center; }
.cut-line { border-top: 1px dashed #888; margin: 3mm 0; text-align: center; font-size: 9px; color: #888; letter-spacing: 1px; }
@media print {
body { margin: 0; background: #fff; }
.page { padding: 4mm; width: 100%; }
.no-print { display: none !important; }
.cut-line { border-color: #bbb; }
@page { size: A4; margin: 4mm; }
}
</style>
</head>
<body>

<div class="no-print">
<button onclick="window.print()">Print / Save as PDF</button>
</div>

<div class="page">
${buildSingleCopy(infoLeft, infoRight, rowMarkup, logoSrc)}
<div class="cut-line">DUPLICATE COPY</div>
${buildSingleCopy(infoLeft, infoRight, rowMarkup, logoSrc)}
</div>

</body>
</html>`;
}

function buildSingleCopy(infoLeft, infoRight, rowMarkup, logoSrc) {
return `<div class="challan">
<div class="header-top">
<span>GSTIN : 33AHFPV5633G1Z9</span>
<div class="dc-title">Delivery Challan</div>
<span>Contact : 9841616576</span>
</div>

<div class="company-block">
<div class="company-row">
<div class="logo-wrap">
<img src="${escapeAttr(logoSrc)}" alt="SVR Logo">
</div>
<div>
<div class="company-name">Sri Veera Raghava Sheet Metal Component</div>
<div class="company-sub">S 115, Kakkalur SIDCO Industrial Estate, Kakkalur, Thiruvallur - 602003</div>
</div>
</div>
</div>

<div class="address-dc-row">
<div class="address-block">${infoLeft}</div>
<div class="dc-fields">${infoRight}</div>
</div>

<table class="goods">
<thead>
<tr>
<th style="width:8%;">S.No</th>
<th style="width:64%;">Description of Goods</th>
<th style="width:10%;">Qty</th>
<th style="width:10%;">UOM</th>
<th style="width:8%;">Remarks</th>
</tr>
</thead>
<tbody>
${rowMarkup}
</tbody>
</table>

<p class="certify">I / We Certify that to the best of my/our Knowledge the particulars given are true correct and complete</p>
<div class="sign-row">
<div class="sign-cell" style="text-align:left; font-size:9px;">Name &amp; Signature of the person to whom goods are<br>delivered for transportation</div>
<div class="sign-cell">Received the goods in good Condition<br><br><br>Receiver's Signature with Seal</div>
<div class="sign-cell">For Sri Veera Raghava Sheet Metal Component<br><br><br>Authorised Signatory</div>
</div>
</div>`;
}
function escapeHTML(value) {
		return String(value || '')
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;');
}

function escapeAttr(value) {
		return escapeHTML(value).replace(/`/g, '&#96;');
}

