// =========================================
// DC INVOICE (DELIVERY CHALLAN) MODULE
// =========================================

function loadDCInvoiceModule() {
		loadDCCustomerDropdown();
		updateDCVehicleDropdown('');
		ensureDCDefaultRows();

		const dcDate = document.getElementById('dcDate');
		if (dcDate && !dcDate.value) {
				dcDate.value = new Date().toISOString().slice(0, 10);
		}
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
		html += '<option value="__ADD_NEW__">➕ Add New Vehicle</option>';

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
		options += '<option value="__CUSTOM__">✏️ Custom Description</option>';

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
				<td style="text-align:center;"><button type="button" class="icon-btn delete" onclick="removeDCItemRow(this)">🗑️</button></td>
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
				options += '<option value="__CUSTOM__">✏️ Custom Description</option>';
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
								if (description === '-- Select Product --' || description === '✏️ Custom Description') {
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
		const totalRows = Math.max(5, items.length);

		for (let i = 0; i < totalRows; i++) {
				const item = items[i] || { sno: '', description: '', qty: '', uom: '', remarks: '' };
				rows.push(`
						<tr>
							<td>${escapeHTML(item.sno)}</td>
							<td>${escapeHTML(item.description)}</td>
							<td>${escapeHTML(item.qty)}</td>
							<td>${escapeHTML(item.uom)}</td>
							<td>${escapeHTML(item.remarks)}</td>
						</tr>
				`);
		}

		const rowMarkup = rows.join('');

		const addressLines = formatAddressLines(customerAddress);
		const infoLeft = `M/s.${escapeHTML(customerName)}<br>${addressLines}<br>GSTIN:` + (customerGstin ? ` ${escapeHTML(customerGstin)}` : '');
		const infoRight = `DC No.: ${escapeHTML(dcNo)}<br>Your DC No.: ${escapeHTML(yourDcNo)}<br>Vechical No.: ${escapeHTML(vehicleNo)}<br>Vendor Code: ${escapeHTML(vendorCode)}<br>Date: ${escapeHTML(formatDisplayDate(date))}<br>Date:` + (refDate ? ` ${escapeHTML(formatDisplayDate(refDate))}` : '');

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

		printWindow.document.write(challanTemplate);
		printWindow.document.close();
		printWindow.focus();
		setTimeout(() => {
				printWindow.print();
		}, 300);
}

function formatAddressLines(value) {
		const address = String(value || '').trim();
		if (!address) return '';

		const lines = address
				.split(/\n|,/)
				.map(part => part.trim())
				.filter(Boolean);

		return lines.slice(0, 3).map(line => escapeHTML(line)).join('<br>');
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
	<base href="${escapeAttr(document.baseURI)}">
	<title>Delivery Challan</title>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }

		body {
			font-family: Arial, sans-serif;
			font-size: 9px;
			background: #fff;
			padding: 2mm;
		}

		.page {
			width: 206mm;
			height: 293mm;
			margin: 0 auto;
			background: #fff;
			display: flex;
			flex-direction: column;
			padding: 0;
			gap: 1.5mm;
		}

		.challan {
			width: 100%;
			flex: 1;
			height: 145.75mm;
			border: 0.7px solid #111;
			display: flex;
			flex-direction: column;
			overflow: hidden;
			min-height: 0;
		}

		.top-bar {
			display: grid;
			grid-template-columns: 1fr auto 1fr;
			align-items: center;
			padding: 1px 4px;
		}
		.top-bar .gstin { font-size: 8.5px; font-weight: 700; }
		.top-bar .title { font-weight: 700; font-size: 11px; text-align: center; text-decoration: underline; }
		.top-bar .contact { text-align: right; font-size: 8.5px; font-weight: 700; }

		.company-name {
			display: grid;
			grid-template-columns: 112px 1fr 112px;
			align-items: center;
			font-weight: bold;
			font-size: 15px;
			line-height: 1;
			padding: 2px 8px;
		}
		.company-logo-wrap {
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.company-logo {
			height: 60px;
			width: auto;
			display: block;
			filter: grayscale(100%);
		}
		.company-title {
			text-align: center;
			font-size: 22px;
			font-weight: 700;
			line-height: 1;
		}

		.company-address {
			border-bottom: 0.7px solid #111;
			text-align: center;
			font-size: 12px;
			font-weight: 700;
			padding: 2px 6px 3px;
		}

		.info-section {
			display: grid;
			grid-template-columns: 1fr 1fr;
			border-bottom: 0.7px solid #111;
		}
		.info-left {
			padding: 2px 4px;
			border-right: 0.7px solid #111;
			font-size: 9px;
			line-height: 1.35;
			min-height: 68px;
			white-space: normal;
		}
		.info-right {
			padding: 2px 4px;
			font-size: 9px;
			line-height: 1.35;
			min-height: 68px;
		}

		.items-table {
			width: 100%;
			border-collapse: collapse;
			flex: 1;
		}
		.items-table th {
			border: 0.7px solid #111;
			padding: 2px 4px;
			background: #fff;
			font-weight: 700;
			font-size: 10px;
			text-align: center;
		}
		.items-table th:nth-child(2) {
			font-size: 11px;
		}
		.items-table td {
			border: 0.7px solid #111;
			height: 17px;
			padding: 1px 3px;
			font-size: 9px;
			vertical-align: top;
		}
		.items-table col.sno  { width: 32px; }
		.items-table col.qty  { width: 50px; }
		.items-table col.uom  { width: 46px; }
		.items-table col.rem  { width: 130px; }
		.items-table th:nth-child(1),
		.items-table td:nth-child(1) { text-align: center; }
		.items-table th:nth-child(3),
		.items-table td:nth-child(3) { text-align: center; }
		.items-table th:nth-child(4),
		.items-table td:nth-child(4) { text-align: center; }

		.certification {
			border-top: 0.7px solid #111;
			border-bottom: 0.7px solid #111;
			padding: 2px 4px;
			font-size: 9px;
			font-style: normal;
			font-weight: 600;
		}

		.signature-section {
			display: grid;
			grid-template-columns: 1fr 1fr 1fr;
			height: 50px;
		}
		.sig-box {
			padding: 2px 4px;
			font-size: 8px;
			display: flex;
			flex-direction: column;
			justify-content: space-between;
			align-items: center;
			text-align: center;
		}
		.sig-box:not(:last-child) { border-right: 0.7px solid #111; }
		.sig-box .sig-title { font-weight: 600; line-height: 1.25; }
		.sig-box .sig-line {
			width: 100%;
			border-top: 0.7px solid #111;
			padding-top: 1px;
			font-size: 8px;
			color: #000;
		}
		.sig-box:last-child { text-align: center; }

		@media print {
			html, body { width: 100%; height: 100%; }
			body { background: white; padding: 0; margin: 0; }
			.page {
				width: 206mm;
				height: 293mm;
				padding: 0;
				margin: 0;
				gap: 1.5mm;
			}
			.challan {
				height: 145.75mm;
				flex: 0 0 145.75mm;
			}
			.no-print { display: none !important; }
			@page { size: A4; margin: 2mm; }
		}
	</style>
</head>
<body>

<div class="page">
	${buildSingleCopy(infoLeft, infoRight, rowMarkup, logoSrc)}
	${buildSingleCopy(infoLeft, infoRight, rowMarkup, logoSrc)}
</div>

</body>
</html>`;
}

function buildSingleCopy(infoLeft, infoRight, rowMarkup, logoSrc) {
		return `<div class="challan">
		<div class="top-bar">
			<span class="gstin">GSTIN : 33AHFPV5633G1Z9</span>
			<span class="title">Delivery Challan</span>
			<span class="contact">Contact : 9841616576</span>
		</div>
		<div class="company-name">
			<div class="company-logo-wrap">
				<img class="company-logo" src="${escapeAttr(logoSrc)}" alt="SVR Logo">
			</div>
			<div class="company-title">Sri Veera Raghava Sheet Metal Component</div>
			<div></div>
		</div>
		<div class="company-address">
			S 115, Kakkalur SIDCO Industrial Estate, Kakkalur, Thiruvallur - 602003
		</div>
		<div class="info-section">
			<div class="info-left">${infoLeft}</div>
			<div class="info-right">${infoRight}</div>
		</div>
		<table class="items-table">
			<colgroup>
				<col class="sno"><col><col class="qty"><col class="uom"><col class="rem">
			</colgroup>
			<thead>
				<tr>
					<th>S.No</th>
					<th>Description of Goods</th>
					<th>Qty</th>
					<th>UOM</th>
					<th>Remarks</th>
				</tr>
			</thead>
			<tbody>
				${rowMarkup}
			</tbody>
		</table>
		<div class="certification">
			I / We Certify that to the best of my/our Knowledge the particulars given are true correct and complete
		</div>
		<div class="signature-section">
			<div class="sig-box">
				<div class="sig-title">Name &amp; Signature of the person to whom goods<br>are delivered for transportation</div>
				<div class="sig-line">&nbsp;</div>
			</div>
			<div class="sig-box">
				<div class="sig-title">Received the goods in good Condition</div>
				<div class="sig-line">Receiver's Signature with Seal</div>
			</div>
			<div class="sig-box">
				<div class="sig-title">For Sri Veera Raghava Sheet Metal Component</div>
				<div class="sig-line">Authorised Signatory</div>
			</div>
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

