const fs = require('fs');
const file = 'd:/My projects/svr/SVR-dashboard/index.html';
let content = fs.readFileSync(file, 'utf8');

const dropdownHtml = `
                        <div class="form-group" style="grid-column: 1 / -1;">
                            <label class="form-label">Select Customer</label>
                            <select id="customerDropdown" class="form-control" onchange="fillCustomerDetails()">
                                <option value="">-- Select Customer --</option>
                            </select>
                            <small style="color: var(--text-secondary); display: block; margin-top: 0.5rem;">
                                Or manually enter details below
                            </small>
                        </div>
`;

// Insert after PO Date
const insertTarget = `<div class="form-group">\r\n                            <label class="form-label required">DC No. / Date</label>`;
const insertTarget2 = `<div class="form-group">\n                            <label class="form-label required">DC No. / Date</label>`;

if (content.includes(insertTarget)) {
    content = content.replace(insertTarget, dropdownHtml + '\r\n' + insertTarget);
} else if (content.includes(insertTarget2)) {
    content = content.replace(insertTarget2, dropdownHtml + '\n' + insertTarget2);
}

// Remove old dropdown
const removeRegex = /<h4 style="color: var\(--text-primary\); margin: 1\.5rem 0 1rem;">Customer Details<\/h4>[\s\S]*?<div class="form-group">\s*<label class="form-label">Select Existing Customer<\/label>\s*<select id="customerDropdown" class="form-control" onchange="fillCustomerDetails\(\)">\s*<option value="">-- Select Customer --<\/option>\s*<\/select>\s*<small style="color: var\(--text-secondary\); display: block; margin-top: 0\.5rem;">\s*Or manually enter details below\s*<\/small>\s*<\/div>\s*<div class="form-group">\s*<label class="form-label required">Buyer Name<\/label>/;

const replacement = `<h4 style="color: var(--text-primary); margin: 1.5rem 0 1rem;">Customer Details</h4>\n\n                    <div class="form-group">\n                        <label class="form-label required">Buyer Name</label>`;

content = content.replace(removeRegex, replacement);

fs.writeFileSync(file, content, 'utf8');
console.log('Replaced successfully');
