with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

start = html.find('<!-- Material Calculation Module -->')
end = html.find('</section>', start) + 10
block = html[start:end]
html = html[:start] + html[end:]

div_block = block.replace('<section id="material-calculation" class="module">', '<div id="materialCostingContent" style="display: none;">')
div_block = div_block.replace('</section>', '</div>')
div_block = div_block.replace('<h2>Material Costing & Calculation</h2>', '<h3>💰 Material Costing & Calculation</h3>')

ins_idx = html.find('<!-- BOM Management Tab -->')
html = html[:ins_idx] + '<!-- Material Costing Tab -->\n' + div_block + '\n\n' + html[ins_idx:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('Successfully relocated Material Costing using Python!')
