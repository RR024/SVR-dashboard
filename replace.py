import re

file_path = 'd:/My projects/svr/SVR-dashboard/index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract the Customer Dropdown block
# We know it starts right after '<h4 style="color: var(--text-primary); margin: 1.5rem 0 1rem;">Customer Details</h4>'
# and ends right before '<div class="form-group">\n                        <label class="form-label required">Buyer Name</label>'

pattern_extract = r'(<h4 style="color: var\(--text-primary\); margin: 1\.5rem 0 1rem;">Customer Details<\/h4>\s*)<div class="form-group">\s*<label class="form-label">Select Existing Customer<\/label>\s*<select id="customerDropdown" class="form-control" onchange="fillCustomerDetails\(\)">\s*<option value="">-- Select Customer --<\/option>\s*<\/select>\s*<small style="color: var\(--text-secondary\); display: block; margin-top: 0\.5rem;">\s*Or manually enter details below\s*<\/small>\s*<\/div>\s*(<div class="form-group">\s*<label class="form-label required">Buyer Name<\/label>)'

match = re.search(pattern_extract, content)
if match:
    # 2. Remove the Customer Dropdown block from its original location
    # Replace the whole matched string with just the h4 and the Buyer Name div
    replacement = match.group(1) + match.group(2)
    content = content[:match.start()] + replacement + content[match.end():]
    print("Successfully extracted the dropdown block.")

    # 3. Find the PO Date block to insert after
    # We will insert it after the closing </div> of the PO Date form-group
    pattern_insert = r'(<div class="form-group">\s*<label class="form-label">PO Date<\/label>\s*<input type="date" id="outwardPODate" class="form-control">\s*<\/div>\s*)'
    
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
    
    content = re.sub(pattern_insert, r'\1' + dropdown_html, content, count=1)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully inserted the dropdown block.")
else:
    print("Could not find the dropdown block to extract.")
