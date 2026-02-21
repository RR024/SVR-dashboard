file_path = 'd:/My projects/svr/SVR-dashboard/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Find PO Date to insert after
po_date_idx = -1
for i, line in enumerate(lines):
    if 'id="outwardPODate"' in line:
        po_date_idx = i + 1 # this is the line with </div>
        break

dropdown_html = """
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label class="form-label">Select Existing Customer</label>
                            <select id="customerDropdown" class="form-control" onchange="fillCustomerDetails()">
                                <option value="">-- Select Customer --</option>
                            </select>
                            <small style="color: var(--text-secondary); display: block; margin-top: 0.5rem;">
                                Or manually enter details below
                            </small>
                        </div>
"""

lines.insert(po_date_idx + 1, dropdown_html)

# 2. Find old dropdown to remove
old_dropdown_start = -1
for i, line in enumerate(lines):
    if 'Select Existing Customer' in line and i > po_date_idx + 5:
        old_dropdown_start = i - 1 # <div class="form-group">
        break

if old_dropdown_start != -1:
    del lines[old_dropdown_start:old_dropdown_start+9]
    print("Old dropdown removed.")
else:
    print("Could not find old dropdown.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Finished replacement.")
