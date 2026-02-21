const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const startMarker = '<!-- Material Calculation Module -->';
const endMarker = '</section>';

const startIdx = html.indexOf(startMarker);
if (startIdx === -1) {
    console.log("Start marker not found");
    process.exit(1);
}

let endSectionIdx = html.indexOf(endMarker, startIdx);
if (endSectionIdx === -1) {
    console.log("End marker not found");
    process.exit(1);
}

endSectionIdx += endMarker.length;

let block = html.substring(startIdx, endSectionIdx);

// Remove block from end of file
html = html.substring(0, startIdx) + html.substring(endSectionIdx);

// Modify block for its new home
block = block.replace('<section id="material-calculation" class="module">', '<div id="materialCostingContent" style="display: none;">');
block = block.replace('</section>', '</div>');
block = block.replace('<h2>Material Costing & Calculation</h2>', '<h3 class="card-title">💰 Material Costing & Calculation</h3>');
block = block.replace('<div class="page-header">', '<div class="card-header">');

// Find where to insert it
const insertMarker = '<!-- BOM Management Tab -->';
const insertIdx = html.indexOf(insertMarker);

if (insertIdx === -1) {
    console.log("Insert marker not found");
    process.exit(1);
}

// Insert it
html = html.substring(0, insertIdx) + '<!-- Material Costing Tab -->\n' + block + '\n\n' + html.substring(insertIdx);

fs.writeFileSync('index.html', html);
console.log("Migration successful!");
