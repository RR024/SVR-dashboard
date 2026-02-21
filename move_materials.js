const fs = require('fs');

try {
    let html = fs.readFileSync('index.html', 'utf8');

    const searchStr = '<!-- Material Calculation Module -->';
    const start = html.indexOf(searchStr);

    if (start === -1) {
        console.log('Material Calculation Module not found!');
        process.exit(1);
    }

    // Find the end of its section
    const sectionStart = html.indexOf('<section id="material-calculation"', start);
    if (sectionStart === -1) {
        console.log('Section tag not found!');
        process.exit(1);
    }

    let end = html.indexOf('</section>', sectionStart);
    if (end === -1) {
        console.log('End section tag not found!');
        process.exit(1);
    }
    end += 10; // length of </section>

    let contentToMove = html.substring(start, end);

    // Remove it from the original place
    html = html.substring(0, start) + html.substring(end);

    // Convert the section tag inside contentToMove into a div for the tab
    contentToMove = contentToMove
        .replace(/<section id="material-calculation" class="module">/, '<div id="materialCostingContent" style="display: none;">')
        .replace(/<\/section>$/, '</div>');

    // Change the title from h2 to h3 similar to other tabs
    contentToMove = contentToMove.replace('<h2>Material Costing & Calculation</h2>', '<h3>💰 Material Costing & Calculation</h3>').replace(/<div class="page-header">/g, '<div class="card-header">');

    // Insert it into the Materials & BOM module, right before BOM Management Tab
    // Let's insert it as the last tab content or before BOM Management Tab.
    const targetStr = '<!-- BOM Management Tab -->';
    const insertIndex = html.indexOf(targetStr);

    if (insertIndex === -1) {
        console.log('BOM Management Tab not found!');
        process.exit(1);
    }

    html = html.substring(0, insertIndex) + '\n    <!-- Material Costing Tab -->\n    ' + contentToMove + '\n\n    ' + html.substring(insertIndex);

    fs.writeFileSync('index.html', html);
    console.log('Successfully moved Material Costing data');
} catch (e) {
    console.error(e);
}
