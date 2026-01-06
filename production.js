// ===================================
// PRODUCTION MODULE
// ===================================

// Storage functions
function getMachines() {
    return JSON.parse(localStorage.getItem('machines')) || [];
}

function saveMachines(machines) {
    localStorage.setItem('machines', JSON.stringify(machines));
}

function getProductionLogs() {
    return JSON.parse(localStorage.getItem('productionLogs')) || [];
}

function saveProductionLogs(logs) {
    localStorage.setItem('productionLogs', JSON.stringify(logs));
}

function getMaintenanceLogs() {
    return JSON.parse(localStorage.getItem('maintenanceLogs')) || [];
}

function saveMaintenanceLogs(logs) {
    localStorage.setItem('maintenanceLogs', JSON.stringify(logs));
}

// ===================================
// TAB SWITCHING
// ===================================

function switchProductionTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.production-tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    // Remove active class from all tab buttons
    document.querySelectorAll('.production-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const selectedTab = document.getElementById(`production-${tabName}`);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }

    // Add active class to clicked button
    const activeBtn = document.querySelector(`.production-tab-btn[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Load appropriate data
    if (tabName === 'machines') {
        loadMachines();
    } else if (tabName === 'logs') {
        loadProductionLogs();
    } else if (tabName === 'maintenance') {
        loadMaintenanceLogs();
    } else if (tabName === 'live') {
        loadMachineDropdown('liveMachine');
        // If machine is selected, load products
        const machineId = document.getElementById('liveMachine').value;
        if (machineId) {
            loadProductsForMachine(machineId, 'liveProduct');
        } else {
            document.getElementById('liveProduct').innerHTML = '<option value="">-- Select Product --</option>';
        }
    }
}

// ===================================
// LIVE PRODUCTION COUNTER
// ===================================

let liveProductionState = {
    isActive: false,
    count: 0,
    startTime: null,
    timerInterval: null,
    machineId: null,
    productId: null
};

function startLiveProduction() {
    const machineId = document.getElementById('liveMachine').value;
    const productId = document.getElementById('liveProduct').value;

    if (!machineId || !productId) {
        showToast('Please select a machine and product first', 'error');
        return;
    }

    // Set state
    liveProductionState.isActive = true;
    liveProductionState.count = 0;
    liveProductionState.startTime = new Date();
    liveProductionState.machineId = machineId;
    liveProductionState.productId = productId;

    // Update UI
    document.getElementById('liveSetupSection').style.display = 'none';
    document.getElementById('liveCounterSection').style.display = 'block';

    // Set display labels
    const machineName = document.querySelector(`#liveMachine option[value="${machineId}"]`).text;
    document.getElementById('liveMachineDisplay').textContent = machineName;
    document.getElementById('liveProductDisplay').textContent = productId;

    document.getElementById('strokeCounter').textContent = '0000';

    // Start Timer
    startLiveTimer();

    // Add Key Listener
    document.addEventListener('keydown', handleGlobalKeypress);

    showToast('🚀 Live session started! Press SPACE to count.', 'success');
}

function stopLiveProduction() {
    if (!confirm('Stop session and save log?')) return;

    // Save Logic
    const logData = {
        id: Date.now().toString(),
        date: liveProductionState.startTime.toISOString().slice(0, 10),
        machineId: liveProductionState.machineId,
        product: liveProductionState.productId,
        quantity: liveProductionState.count,
        operatorId: '', // Could add operator selection to setup if needed
        shift: getShiftFromTime(liveProductionState.startTime),
        notes: `Live Session: ${formatTime(liveProductionState.startTime)} - ${formatTime(new Date())}`
    };

    let logs = getProductionLogs();
    logs.push(logData);
    saveProductionLogs(logs);

    cleanupLiveProduction();

    // cleanup switches to 'live' tab which would reset view, so we redirect to logs
    switchProductionTab('logs');
    showToast('✅ Production log saved successfully!', 'success');
}

function cancelLiveProduction() {
    if (liveProductionState.count > 0) {
        if (!confirm('Discard current session data?')) return;
    }
    cleanupLiveProduction();
    showToast('Session cancelled', 'info');
}

function cleanupLiveProduction() {
    // Stop Timer
    clearInterval(liveProductionState.timerInterval);

    // Remove Key Listener
    document.removeEventListener('keydown', handleGlobalKeypress);

    // Reset State
    liveProductionState = {
        isActive: false,
        count: 0,
        startTime: null,
        timerInterval: null,
        machineId: null,
        productId: null
    };

    // Reset UI
    document.getElementById('liveSetupSection').style.display = 'block';
    document.getElementById('liveCounterSection').style.display = 'none';
}

function handleStroke() {
    if (!liveProductionState.isActive) return;

    liveProductionState.count++;

    // Update Counter UI
    const counterEl = document.getElementById('strokeCounter');
    counterEl.textContent = liveProductionState.count.toString().padStart(4, '0');

    // Animation effect
    counterEl.style.transform = 'scale(1.1)';
    setTimeout(() => {
        counterEl.style.transform = 'scale(1)';
    }, 100);
}

function handleGlobalKeypress(e) {
    if (!liveProductionState.isActive) return;

    // Spacebar triggers count
    if (e.code === 'Space') {
        e.preventDefault(); // Prevent scrolling
        handleStroke();
    }
}

function startLiveTimer() {
    const timerEl = document.getElementById('liveTimer');

    liveProductionState.timerInterval = setInterval(() => {
        const now = new Date();
        const diff = now - liveProductionState.startTime;

        // Format duration
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        timerEl.textContent =
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function getShiftFromTime(date) {
    const hour = date.getHours();
    if (hour >= 6 && hour < 14) return 'Morning';
    if (hour >= 14 && hour < 22) return 'Afternoon';
    return 'Night';
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ===================================
// MACHINE MANAGEMENT
// ===================================

function openMachineModal(id = null) {
    const modal = document.getElementById('machineModal');
    const form = document.getElementById('machineForm');
    form.reset();

    // Load employees for operator dropdown
    loadOperatorDropdown('machineOperator');

    // Load products for multi-select
    loadProductCheckboxes();

    if (id) {
        document.getElementById('machineModalTitle').textContent = 'Edit Machine';
        const machines = getMachines();
        const machine = machines.find(m => m.id === id);
        if (machine) {
            document.getElementById('machineId').value = machine.id;
            document.getElementById('machineName').value = machine.name;
            document.getElementById('machineCode').value = machine.machineId || '';
            document.getElementById('machineType').value = machine.type;
            document.getElementById('machineStatus').value = machine.status;
            document.getElementById('machineOperator').value = machine.operatorId || '';
            document.getElementById('machineCapacity').value = machine.capacity || '';
            document.getElementById('machineLocation').value = machine.location || '';

            // Check linked products
            if (machine.products && Array.isArray(machine.products)) {
                machine.products.forEach(productId => {
                    const checkbox = document.querySelector(`#productCheckboxes input[value="${productId}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        }
    } else {
        document.getElementById('machineModalTitle').textContent = 'Add Machine';
        document.getElementById('machineId').value = '';
        // Auto-generate machine code
        const machines = getMachines();
        const nextNum = machines.length + 1;
        document.getElementById('machineCode').value = `MC-${String(nextNum).padStart(3, '0')}`;
    }

    modal.classList.add('active');
}

function closeMachineModal() {
    document.getElementById('machineModal').classList.remove('active');
}

function saveMachine() {
    const id = document.getElementById('machineId').value;
    const name = document.getElementById('machineName').value.trim();
    const machineCode = document.getElementById('machineCode').value.trim();
    const type = document.getElementById('machineType').value;

    if (!name || !type) {
        showToast('Please fill in required fields', 'error');
        return;
    }

    // Get selected products
    const selectedProducts = [];
    document.querySelectorAll('#productCheckboxes input:checked').forEach(cb => {
        selectedProducts.push(cb.value);
    });

    const machineData = {
        id: id || Date.now().toString(),
        machineId: machineCode,
        name: name,
        type: type,
        status: document.getElementById('machineStatus').value,
        operatorId: document.getElementById('machineOperator').value,
        capacity: parseInt(document.getElementById('machineCapacity').value) || 0,
        location: document.getElementById('machineLocation').value.trim(),
        products: selectedProducts
    };

    let machines = getMachines();

    if (id) {
        machines = machines.map(m => m.id === id ? machineData : m);
    } else {
        machines.push(machineData);
    }

    saveMachines(machines);
    closeMachineModal();
    loadMachines();
    showToast('Machine saved successfully!', 'success');
}

function deleteMachine(id) {
    if (!confirm('Are you sure you want to delete this machine?')) return;

    let machines = getMachines();
    machines = machines.filter(m => m.id !== id);
    saveMachines(machines);
    loadMachines();
    showToast('Machine deleted', 'info');
}

function loadMachines() {
    const machines = getMachines();
    const tbody = document.getElementById('machinesTableBody');

    if (!tbody) return;

    if (machines.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center" style="color: var(--text-secondary);">
                    No machines added yet. Click "Add Machine" to create one.
                </td>
            </tr>
        `;
        return;
    }

    const employees = typeof getEmployees === 'function' ? getEmployees() : [];

    let html = '';
    machines.forEach(machine => {
        const operator = employees.find(e => e.id === machine.operatorId);
        const operatorName = operator ? operator.name : '-';

        const statusClass = machine.status === 'Running' ? 'success' :
            machine.status === 'Idle' ? 'warning' :
                machine.status === 'Maintenance' ? 'info' : 'danger';

        const productCount = machine.products ? machine.products.length : 0;

        html += `
            <tr>
                <td>${machine.machineId || '-'}</td>
                <td><strong>${machine.name}</strong></td>
                <td>${machine.type}</td>
                <td><span class="badge badge-${statusClass}">${machine.status}</span></td>
                <td>${operatorName}</td>
                <td>${machine.capacity || '-'}</td>
                <td>${machine.location || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn edit" onclick="openMachineModal('${machine.id}')" title="Edit">✏️</button>
                        <button class="icon-btn delete" onclick="deleteMachine('${machine.id}')" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function loadOperatorDropdown(elementId) {
    const select = document.getElementById(elementId);
    if (!select) return;

    const employees = typeof getEmployees === 'function' ? getEmployees() : [];

    select.innerHTML = '<option value="">-- No Operator --</option>';
    employees.forEach(emp => {
        select.innerHTML += `<option value="${emp.id}">${emp.name}</option>`;
    });
}

function loadProductCheckboxes() {
    const container = document.getElementById('productCheckboxes');
    if (!container) return;

    // Get products from customers (each customer has products)
    const customers = typeof getCustomers === 'function' ? getCustomers() : [];
    const allProducts = [];

    customers.forEach(customer => {
        if (customer.products && Array.isArray(customer.products)) {
            customer.products.forEach(product => {
                if (!allProducts.find(p => p.description === product.description)) {
                    allProducts.push({
                        id: product.description, // Use description as ID
                        name: product.description,
                        customer: customer.companyName
                    });
                }
            });
        }
    });

    if (allProducts.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No products found. Add products in Customer module first.</p>';
        return;
    }

    let html = '';
    allProducts.forEach(product => {
        html += `
            <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0;">
                <input type="checkbox" value="${product.id}">
                <span>${product.name}</span>
            </label>
        `;
    });

    container.innerHTML = html;
}

// ===================================
// PRODUCTION LOGS
// ===================================

function openProductionLogModal(id = null) {
    const modal = document.getElementById('productionLogModal');
    const form = document.getElementById('productionLogForm');
    form.reset();

    // Set today's date
    document.getElementById('logDate').valueAsDate = new Date();

    // Load machine dropdown
    loadMachineDropdown('logMachine');

    // Load operator dropdown
    loadOperatorDropdown('logOperator');

    // Add change listener to machine dropdown to filter products
    const machineSelect = document.getElementById('logMachine');
    machineSelect.onchange = function () {
        loadProductsForMachine(this.value);
    };

    // Initial load - show all products if no machine selected
    loadProductsForMachine('');

    if (id) {
        // Edit mode
        document.getElementById('productionLogModalTitle').textContent = 'Edit Production Log';
        document.getElementById('productionLogId').value = id;
        const logs = getProductionLogs();
        const log = logs.find(l => l.id === id);
        if (log) {
            document.getElementById('logDate').value = log.date;
            document.getElementById('logMachine').value = log.machineId;
            // Load products for this machine then set value
            loadProductsForMachine(log.machineId);
            document.getElementById('logProduct').value = log.product;
            document.getElementById('logQuantity').value = log.quantity;
            document.getElementById('logOperator').value = log.operatorId || '';
            document.getElementById('logShift').value = log.shift || 'Morning';
            document.getElementById('logNotes').value = log.notes || '';
        }
    } else {
        document.getElementById('productionLogModalTitle').textContent = 'Add Production Log';
        document.getElementById('productionLogId').value = '';
    }

    modal.classList.add('active');
}

// Load products filtered by machine or generic lists
function loadProductsForMachine(machineId, elementId = 'logProduct') {
    const select = document.getElementById(elementId);
    if (!select) return;

    const machines = getMachines();
    const machine = machines.find(m => m.id === machineId);

    select.innerHTML = '<option value="">-- Select Product --</option>';

    if (machine && machine.products && machine.products.length > 0) {
        // Show only products linked to this machine
        machine.products.forEach(product => {
            select.innerHTML += `<option value="${product}">${product}</option>`;
        });
    } else if (!machineId) {
        // No machine selected - show all products
        loadProductDropdown(elementId);
    } else {
        // Machine has no products linked
        select.innerHTML = '<option value="">-- No products linked to this machine --</option>';
    }
}

function closeProductionLogModal() {
    document.getElementById('productionLogModal').classList.remove('active');
}

function loadMachineDropdown(elementId) {
    const select = document.getElementById(elementId);
    if (!select) return;

    const machines = getMachines();

    select.innerHTML = '<option value="">-- Select Machine --</option>';
    machines.forEach(machine => {
        select.innerHTML += `<option value="${machine.id}">${machine.name} (${machine.machineId})</option>`;
    });
}

function loadProductDropdown(elementId) {
    const select = document.getElementById(elementId);
    if (!select) return;

    const customers = typeof getCustomers === 'function' ? getCustomers() : [];
    const allProducts = [];

    customers.forEach(customer => {
        if (customer.products && Array.isArray(customer.products)) {
            customer.products.forEach(product => {
                if (!allProducts.find(p => p.description === product.description)) {
                    allProducts.push(product.description);
                }
            });
        }
    });

    select.innerHTML = '<option value="">-- Select Product --</option>';
    allProducts.forEach(product => {
        select.innerHTML += `<option value="${product}">${product}</option>`;
    });
}

function saveProductionLog() {
    const id = document.getElementById('productionLogId').value;
    const date = document.getElementById('logDate').value;
    const machineId = document.getElementById('logMachine').value;
    const product = document.getElementById('logProduct').value;
    const quantity = parseInt(document.getElementById('logQuantity').value) || 0;

    if (!date || !machineId || !product || quantity <= 0) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const logData = {
        id: id || Date.now().toString(),
        date: date,
        machineId: machineId,
        product: product,
        quantity: quantity,
        operatorId: document.getElementById('logOperator').value,
        shift: document.getElementById('logShift').value,
        notes: document.getElementById('logNotes').value.trim()
    };

    let logs = getProductionLogs();

    if (id) {
        // Update existing
        logs = logs.map(l => l.id === id ? logData : l);
    } else {
        // Add new
        logs.push(logData);
    }

    saveProductionLogs(logs);

    closeProductionLogModal();
    loadProductionLogs();
    showToast('Production log saved!', 'success');
}

function deleteProductionLog(id) {
    if (!confirm('Delete this production log?')) return;

    let logs = getProductionLogs();
    logs = logs.filter(l => l.id !== id);
    saveProductionLogs(logs);
    loadProductionLogs();
    showToast('Log deleted', 'info');
}

function loadProductionLogs() {
    const logs = getProductionLogs();
    const tbody = document.getElementById('productionLogsTableBody');

    if (!tbody) return;

    if (logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="color: var(--text-secondary);">
                    No production logs yet. Click "Add Log" to record production.
                </td>
            </tr>
        `;
        return;
    }

    const machines = getMachines();
    const employees = typeof getEmployees === 'function' ? getEmployees() : [];

    // Sort by date descending
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Get current month for comparison
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    let html = '';
    let lastMonth = null;

    logs.forEach(log => {
        // Month separator logic
        const logDate = log.date || new Date().toISOString().slice(0, 10);
        const logMonth = logDate.slice(0, 7); // YYYY-MM
        const [year, month] = logMonth.split('-');
        const monthName = monthNames[parseInt(month) - 1] || 'Unknown';
        const isCurrentMonth = logMonth === currentMonth;

        // Add month separator if new month
        if (logMonth !== lastMonth) {
            const monthLabel = `${monthName} ${year}`;
            const monthColor = isCurrentMonth ?
                'linear-gradient(135deg, #10b981 0%, #059669 100%)' :
                'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)';
            const monthIcon = '📊';

            html += `
                <tr class="month-separator">
                    <td colspan="7" style="
                        background: ${monthColor};
                        color: white;
                        font-weight: 600;
                        font-size: 1rem;
                        padding: 0.75rem 1rem;
                        border: none;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    ">
                        ${monthIcon} ${monthLabel} ${isCurrentMonth ? '<span style="background: rgba(255,255,255,0.2); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-left: 0.5rem;">CURRENT MONTH</span>' : ''}
                    </td>
                </tr>
            `;
            lastMonth = logMonth;
        }

        const machine = machines.find(m => m.id === log.machineId);
        const machineName = machine ? machine.name : '-';
        const operator = employees.find(e => e.id === log.operatorId);
        const operatorName = operator ? operator.name : '-';

        html += `
            <tr>
                <td>${formatDate(log.date)}</td>
                <td>${machineName}</td>
                <td>${log.product}</td>
                <td><strong>${log.quantity.toLocaleString()}</strong></td>
                <td>${operatorName}</td>
                <td>${log.shift || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn edit" onclick="openProductionLogModal('${log.id}')" title="Edit">✏️</button>
                        <button class="icon-btn delete" onclick="deleteProductionLog('${log.id}')" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ===================================
// MAINTENANCE LOGS
// ===================================

function openMaintenanceModal() {
    const modal = document.getElementById('maintenanceModal');
    const form = document.getElementById('maintenanceForm');
    form.reset();

    document.getElementById('maintenanceDate').valueAsDate = new Date();
    loadMachineDropdown('maintenanceMachine');

    modal.classList.add('active');
}

function closeMaintenanceModal() {
    document.getElementById('maintenanceModal').classList.remove('active');
}

function saveMaintenanceLog() {
    const date = document.getElementById('maintenanceDate').value;
    const machineId = document.getElementById('maintenanceMachine').value;
    const type = document.getElementById('maintenanceType').value;
    const description = document.getElementById('maintenanceDescription').value.trim();

    if (!date || !machineId || !type) {
        showToast('Please fill in required fields', 'error');
        return;
    }

    const logData = {
        id: Date.now().toString(),
        date: date,
        machineId: machineId,
        type: type,
        description: description,
        cost: parseFloat(document.getElementById('maintenanceCost').value) || 0,
        downtime: parseFloat(document.getElementById('maintenanceDowntime').value) || 0
    };

    let logs = getMaintenanceLogs();
    logs.push(logData);
    saveMaintenanceLogs(logs);

    closeMaintenanceModal();
    loadMaintenanceLogs();
    showToast('Maintenance log saved!', 'success');
}

function deleteMaintenanceLog(id) {
    if (!confirm('Delete this maintenance record?')) return;

    let logs = getMaintenanceLogs();
    logs = logs.filter(l => l.id !== id);
    saveMaintenanceLogs(logs);
    loadMaintenanceLogs();
    showToast('Record deleted', 'info');
}

function loadMaintenanceLogs() {
    const logs = getMaintenanceLogs();
    const tbody = document.getElementById('maintenanceTableBody');

    if (!tbody) return;

    if (logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="color: var(--text-secondary);">
                    No maintenance records yet. Click "Add Maintenance" to log maintenance.
                </td>
            </tr>
        `;
        return;
    }

    const machines = getMachines();

    // Sort by date descending
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = '';
    logs.forEach(log => {
        const machine = machines.find(m => m.id === log.machineId);
        const machineName = machine ? machine.name : '-';

        const typeClass = log.type === 'Scheduled' ? 'success' :
            log.type === 'Breakdown' ? 'danger' : 'warning';

        html += `
            <tr>
                <td>${formatDate(log.date)}</td>
                <td>${machineName}</td>
                <td><span class="badge badge-${typeClass}">${log.type}</span></td>
                <td>${log.description || '-'}</td>
                <td>₹${log.cost.toLocaleString('en-IN')}</td>
                <td>${log.downtime} hrs</td>
                <td>
                    <button class="icon-btn delete" onclick="deleteMaintenanceLog('${log.id}')" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ===================================
// DASHBOARD INTEGRATION
// ===================================

function getProductionStats() {
    const machines = getMachines();
    const runningMachines = machines.filter(m => m.status === 'Running').length;
    const totalMachines = machines.length;

    const logs = getProductionLogs();
    const today = new Date().toISOString().slice(0, 10);
    const todayLogs = logs.filter(l => l.date === today);
    const todayProduction = todayLogs.reduce((sum, l) => sum + l.quantity, 0);

    return {
        runningMachines,
        totalMachines,
        todayProduction
    };
}
