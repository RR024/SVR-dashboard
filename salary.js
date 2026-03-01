// ===================================
// SALARY MODULE - SVR Manufacturing
// ===================================

// Get salary records from localStorage
function getSalaryRecords() {
    return JSON.parse(localStorage.getItem('salaryRecords')) || [];
}

// Save salary records to localStorage
function saveSalaryRecords(records) {
    localStorage.setItem('salaryRecords', JSON.stringify(records));
}

// Open Salary Modal
function openSalaryModal(id = null) {
    const modal = document.getElementById('salaryModal');
    const form = document.getElementById('salaryForm');
    form.reset();

    // Clear calculation displays
    document.getElementById('grossEarnings').textContent = '₹0.00';
    document.getElementById('totalDeductions').textContent = '₹0.00';
    document.getElementById('netSalaryDisplay').textContent = '₹0.00';

    // Load employee dropdown
    loadSalaryEmployeeDropdown();

    // Set default month to current month
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7);
    document.getElementById('salaryForMonth').value = currentMonth;

    if (id) {
        // Edit mode
        const records = getSalaryRecords();
        const record = records.find(r => r.id === id);
        if (record) {
            document.getElementById('salaryModalTitle').textContent = 'Edit Salary';
            document.getElementById('salaryId').value = record.id;
            document.getElementById('salaryEmployee').value = record.employeeId;
            document.getElementById('salaryForMonth').value = record.month;
            document.getElementById('salaryBasic').value = record.basic || 0;
            document.getElementById('salaryHRA').value = record.hra || 0;
            document.getElementById('salaryDA').value = record.da || 0;
            document.getElementById('salaryAllowances').value = record.allowances || 0;
            document.getElementById('salaryPF').value = record.pf || 0;
            document.getElementById('salaryESI').value = record.esi || 0;
            document.getElementById('salaryOtherDeductions').value = record.otherDeductions || 0;
            document.getElementById('salaryAdvance').value = record.advance || 0;
            document.getElementById('salaryPaymentStatus').value = record.paymentStatus || 'Pending';
            document.getElementById('salaryRemarks').value = record.remarks || '';

            // Recalculate net salary
            calculateNetSalary();
        }
    } else {
        document.getElementById('salaryModalTitle').textContent = 'Add/Update Salary';
    }

    modal.classList.add('active');
}

// Close Salary Modal
function closeSalaryModal() {
    document.getElementById('salaryModal').classList.remove('active');
}

// Load Employee Dropdown for Salary
function loadSalaryEmployeeDropdown() {
    const dropdown = document.getElementById('salaryEmployee');
    const employees = getEmployees();

    dropdown.innerHTML = '<option value="">-- Select Employee --</option>';
    employees.forEach(emp => {
        dropdown.innerHTML += `<option value="${emp.id}">${emp.empId} - ${emp.name}</option>`;
    });
}

// Load existing salary details when employee is selected
function loadEmployeeSalaryDetails() {
    const employeeId = document.getElementById('salaryEmployee').value;
    const month = document.getElementById('salaryForMonth').value;

    if (!employeeId || !month) return;

    // Check if salary already exists for this employee and month
    const records = getSalaryRecords();
    const existing = records.find(r => r.employeeId === employeeId && r.month === month);

    if (existing) {
        document.getElementById('salaryId').value = existing.id;
        document.getElementById('salaryBasic').value = existing.basic || 0;
        document.getElementById('salaryHRA').value = existing.hra || 0;
        document.getElementById('salaryDA').value = existing.da || 0;
        document.getElementById('salaryAllowances').value = existing.allowances || 0;
        document.getElementById('salaryPF').value = existing.pf || 0;
        document.getElementById('salaryESI').value = existing.esi || 0;
        document.getElementById('salaryOtherDeductions').value = existing.otherDeductions || 0;
        document.getElementById('salaryAdvance').value = existing.advance || 0;
        document.getElementById('salaryPaymentStatus').value = existing.paymentStatus || 'Pending';
        document.getElementById('salaryRemarks').value = existing.remarks || '';
        calculateNetSalary();
        showToast('📝 Existing salary record loaded for editing', 'info');
    } else {
        // Reset form but keep employee and month
        document.getElementById('salaryId').value = '';
        document.getElementById('salaryBasic').value = '';
        document.getElementById('salaryHRA').value = '0';
        document.getElementById('salaryDA').value = '0';
        document.getElementById('salaryAllowances').value = '0';
        document.getElementById('salaryPF').value = '0';
        document.getElementById('salaryESI').value = '0';
        document.getElementById('salaryOtherDeductions').value = '0';
        document.getElementById('salaryAdvance').value = '0';
        document.getElementById('salaryPaymentStatus').value = 'Pending';
        document.getElementById('salaryRemarks').value = '';
        calculateNetSalary();
    }
}

// Calculate Net Salary
function calculateNetSalary() {
    const basic = parseFloat(document.getElementById('salaryBasic').value) || 0;
    const hra = parseFloat(document.getElementById('salaryHRA').value) || 0;
    const da = parseFloat(document.getElementById('salaryDA').value) || 0;
    const allowances = parseFloat(document.getElementById('salaryAllowances').value) || 0;

    const pf = parseFloat(document.getElementById('salaryPF').value) || 0;
    const esi = parseFloat(document.getElementById('salaryESI').value) || 0;
    const otherDeductions = parseFloat(document.getElementById('salaryOtherDeductions').value) || 0;
    const advance = parseFloat(document.getElementById('salaryAdvance').value) || 0;

    const grossEarnings = basic + hra + da + allowances;
    const totalDeductions = pf + esi + otherDeductions + advance;
    const netSalary = grossEarnings - totalDeductions;

    document.getElementById('grossEarnings').textContent = `₹${grossEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('totalDeductions').textContent = `₹${totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById('netSalaryDisplay').textContent = `₹${netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    return { grossEarnings, totalDeductions, netSalary };
}

// Save Salary
function saveSalary() {
    const employeeId = document.getElementById('salaryEmployee').value;
    const month = document.getElementById('salaryForMonth').value;

    if (!employeeId) {
        showToast('❌ Please select an employee', 'error');
        return;
    }

    if (!month) {
        showToast('❌ Please select a month', 'error');
        return;
    }

    const basic = parseFloat(document.getElementById('salaryBasic').value) || 0;
    if (basic <= 0) {
        showToast('❌ Basic salary must be greater than 0', 'error');
        return;
    }

    const { grossEarnings, totalDeductions, netSalary } = calculateNetSalary();

    const id = document.getElementById('salaryId').value;

    const salaryData = {
        id: id || Date.now().toString(),
        employeeId: employeeId,
        month: month,
        basic: basic,
        hra: parseFloat(document.getElementById('salaryHRA').value) || 0,
        da: parseFloat(document.getElementById('salaryDA').value) || 0,
        allowances: parseFloat(document.getElementById('salaryAllowances').value) || 0,
        pf: parseFloat(document.getElementById('salaryPF').value) || 0,
        esi: parseFloat(document.getElementById('salaryESI').value) || 0,
        otherDeductions: parseFloat(document.getElementById('salaryOtherDeductions').value) || 0,
        advance: parseFloat(document.getElementById('salaryAdvance').value) || 0,
        grossEarnings: grossEarnings,
        totalDeductions: totalDeductions,
        netSalary: netSalary,
        paymentStatus: document.getElementById('salaryPaymentStatus').value,
        remarks: document.getElementById('salaryRemarks').value,
        createdAt: id ? undefined : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    let records = getSalaryRecords();

    if (id) {
        // Update existing
        records = records.map(r => r.id === id ? { ...r, ...salaryData } : r);
    } else {
        // Check if already exists for this employee and month
        const existingIndex = records.findIndex(r => r.employeeId === employeeId && r.month === month);
        if (existingIndex !== -1) {
            records[existingIndex] = { ...records[existingIndex], ...salaryData, id: records[existingIndex].id };
        } else {
            records.push(salaryData);
        }
    }

    saveSalaryRecords(records);
    closeSalaryModal();
    loadSalaryTable();
    showToast('✅ Salary saved successfully!', 'success');
}

// Load Salary Table
function loadSalaryTable() {
    const records = getSalaryRecords();
    const tbody = document.getElementById('salaryTableBody');
    const employees = getEmployees();

    // Get selected month filter
    const selectedMonth = document.getElementById('salaryMonth')?.value || new Date().toISOString().slice(0, 7);

    // Filter records by month
    const filteredRecords = selectedMonth
        ? records.filter(r => r.month === selectedMonth)
        : records;

    if (filteredRecords.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center" style="color: var(--text-secondary);">
                    No salary records for this month. Click "Add/Update Salary" to get started.
                </td>
            </tr>
        `;
        updateSalarySummary([]);
        return;
    }

    let html = '';
    filteredRecords.forEach(record => {
        const employee = employees.find(e => e.id === record.employeeId);
        const empName = employee ? `${employee.empId} - ${employee.name}` : 'Unknown';
        const badgeClass = record.paymentStatus === 'Paid' ? 'success' : (record.paymentStatus === 'Partial' ? 'warning' : 'danger');

        html += `
            <tr>
                <td>${empName}</td>
                <td>₹${parseFloat(record.basic).toLocaleString('en-IN')}</td>
                <td>₹${parseFloat(record.hra || 0).toLocaleString('en-IN')}</td>
                <td>₹${parseFloat(record.da || 0).toLocaleString('en-IN')}</td>
                <td>₹${parseFloat(record.allowances || 0).toLocaleString('en-IN')}</td>
                <td>₹${parseFloat(record.totalDeductions || 0).toLocaleString('en-IN')}</td>
                <td style="font-weight: 600; color: var(--primary);">₹${parseFloat(record.netSalary).toLocaleString('en-IN')}</td>
                <td><span class="badge badge-${badgeClass}">${record.paymentStatus}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="icon-btn edit" onclick="openSalaryModal('${record.id}')" title="Edit">✏️</button>
                        <button class="icon-btn" onclick="generateSalarySlipById('${record.id}')" title="Print Slip">🖨️</button>
                        <button class="icon-btn delete" onclick="deleteSalary('${record.id}')" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    updateSalarySummary(filteredRecords);
}

// Update salary summary cards
function updateSalarySummary(records) {
    const totalPayroll = records.reduce((sum, r) => sum + parseFloat(r.netSalary || 0), 0);
    const employeesCount = records.length;
    const avgSalary = employeesCount > 0 ? totalPayroll / employeesCount : 0;

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('totalMonthlyPayroll', `₹${totalPayroll.toLocaleString('en-IN')}`);
    setEl('employeesWithSalary', employeesCount);
    setEl('averageSalary', `₹${Math.round(avgSalary).toLocaleString('en-IN')}`);
}

// Delete Salary Record
function deleteSalary(id) {
    if (confirm('Are you sure you want to delete this salary record?')) {
        let records = getSalaryRecords();
        records = records.filter(r => r.id !== id);
        saveSalaryRecords(records);
        loadSalaryTable();
        showToast('Salary record deleted', 'info');
    }
}

// Generate Salary Slip
function generateSalarySlip() {
    const employeeId = document.getElementById('salaryEmployee').value;
    const month = document.getElementById('salaryForMonth').value;

    if (!employeeId || !month) {
        showToast('❌ Please select employee and month', 'error');
        return;
    }

    const employees = getEmployees();
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) {
        showToast('❌ Employee not found', 'error');
        return;
    }

    const { grossEarnings, totalDeductions, netSalary } = calculateNetSalary();

    const basic = parseFloat(document.getElementById('salaryBasic').value) || 0;
    const hra = parseFloat(document.getElementById('salaryHRA').value) || 0;
    const da = parseFloat(document.getElementById('salaryDA').value) || 0;
    const allowances = parseFloat(document.getElementById('salaryAllowances').value) || 0;
    const pf = parseFloat(document.getElementById('salaryPF').value) || 0;
    const esi = parseFloat(document.getElementById('salaryESI').value) || 0;
    const otherDeductions = parseFloat(document.getElementById('salaryOtherDeductions').value) || 0;
    const advance = parseFloat(document.getElementById('salaryAdvance').value) || 0;

    // Format month for display
    const [year, monthNum] = month.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthDisplay = `${monthNames[parseInt(monthNum) - 1]} ${year}`;

    const slipContent = `
        <html>
        <head>
            <title>Salary Slip - ${employee.name}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
                .header h1 { margin: 0; color: #2c3e50; }
                .header p { margin: 5px 0; color: #666; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .info-box { background: #f5f5f5; padding: 15px; border-radius: 8px; }
                .info-box h3 { margin: 0 0 10px 0; color: #333; font-size: 14px; }
                .info-box p { margin: 5px 0; font-size: 13px; }
                .salary-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .salary-table th, .salary-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                .salary-table th { background: #2c3e50; color: white; }
                .earnings { background: #e8f5e9; }
                .deductions { background: #ffebee; }
                .net-salary { background: #e3f2fd; font-weight: bold; font-size: 16px; }
                .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>SVR Manufacturing</h1>
                <p>Sheet Metal Component</p>
                <p style="font-size: 18px; margin-top: 15px; font-weight: bold;">SALARY SLIP</p>
                <p>For the month of ${monthDisplay}</p>
            </div>

            <div class="info-grid">
                <div class="info-box">
                    <h3>Employee Details</h3>
                    <p><strong>Employee ID:</strong> ${employee.empId}</p>
                    <p><strong>Name:</strong> ${employee.name}</p>
                    <p><strong>Designation:</strong> ${employee.designation}</p>
                    <p><strong>Department:</strong> ${employee.department}</p>
                </div>
                <div class="info-box">
                    <h3>Payment Details</h3>
                    <p><strong>PAN:</strong> ${employee.pan || 'N/A'}</p>
                    <p><strong>Bank:</strong> N/A</p>
                    <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
                </div>
            </div>

            <table class="salary-table">
                <tr>
                    <th colspan="2">Earnings</th>
                    <th colspan="2">Deductions</th>
                </tr>
                <tr>
                    <td class="earnings">Basic Salary</td>
                    <td class="earnings">₹${basic.toLocaleString('en-IN')}</td>
                    <td class="deductions">PF</td>
                    <td class="deductions">₹${pf.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                    <td class="earnings">HRA</td>
                    <td class="earnings">₹${hra.toLocaleString('en-IN')}</td>
                    <td class="deductions">ESI</td>
                    <td class="deductions">₹${esi.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                    <td class="earnings">DA</td>
                    <td class="earnings">₹${da.toLocaleString('en-IN')}</td>
                    <td class="deductions">Other Deductions</td>
                    <td class="deductions">₹${otherDeductions.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                    <td class="earnings">Other Allowances</td>
                    <td class="earnings">₹${allowances.toLocaleString('en-IN')}</td>
                    <td class="deductions">Advance</td>
                    <td class="deductions">₹${advance.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold;">Gross Earnings</td>
                    <td style="font-weight: bold;">₹${grossEarnings.toLocaleString('en-IN')}</td>
                    <td style="font-weight: bold;">Total Deductions</td>
                    <td style="font-weight: bold;">₹${totalDeductions.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                    <td colspan="2" class="net-salary">NET SALARY</td>
                    <td colspan="2" class="net-salary" style="text-align: right;">₹${netSalary.toLocaleString('en-IN')}</td>
                </tr>
            </table>

            <div class="footer">
                <p>This is a computer-generated salary slip.</p>
                <p style="margin-top: 30px;">
                    <span style="display: inline-block; width: 200px; border-top: 1px solid #333; padding-top: 5px;">Employee Signature</span>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <span style="display: inline-block; width: 200px; border-top: 1px solid #333; padding-top: 5px;">Authorized Signature</span>
                </p>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(slipContent);
    printWindow.document.close();
    printWindow.print();
}

// Generate Salary Slip by ID (for table action)
function generateSalarySlipById(id) {
    const records = getSalaryRecords();
    const record = records.find(r => r.id === id);

    if (!record) {
        showToast('❌ Salary record not found', 'error');
        return;
    }

    // Populate the form and generate slip
    document.getElementById('salaryEmployee').value = record.employeeId;
    document.getElementById('salaryForMonth').value = record.month;
    document.getElementById('salaryBasic').value = record.basic || 0;
    document.getElementById('salaryHRA').value = record.hra || 0;
    document.getElementById('salaryDA').value = record.da || 0;
    document.getElementById('salaryAllowances').value = record.allowances || 0;
    document.getElementById('salaryPF').value = record.pf || 0;
    document.getElementById('salaryESI').value = record.esi || 0;
    document.getElementById('salaryOtherDeductions').value = record.otherDeductions || 0;
    document.getElementById('salaryAdvance').value = record.advance || 0;

    generateSalarySlip();
}

// Initialize salary module when page loads
function initSalaryModule() {
    // Set default month
    const monthInput = document.getElementById('salaryMonth');
    if (monthInput) {
        const today = new Date();
        monthInput.value = today.toISOString().slice(0, 7);
        monthInput.addEventListener('change', loadSalaryTable);
    }
}

// Export salary functions for global access
window.openSalaryModal = openSalaryModal;
window.closeSalaryModal = closeSalaryModal;
window.saveSalary = saveSalary;
window.deleteSalary = deleteSalary;
window.calculateNetSalary = calculateNetSalary;
window.loadSalaryTable = loadSalaryTable;
window.generateSalarySlip = generateSalarySlip;
window.generateSalarySlipById = generateSalarySlipById;
window.loadEmployeeSalaryDetails = loadEmployeeSalaryDetails;
window.getSalaryRecords = getSalaryRecords;
