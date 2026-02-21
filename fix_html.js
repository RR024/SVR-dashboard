const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const startCss = html.indexOf('<!-- Toggle First Row Script & Styles -->');
let endCss = html.lastIndexOf('</style>', html.indexOf('<!-- Material Calculation Module -->'));
endCss = endCss + 8; // length of </style>

const cssBlock = html.substring(startCss, endCss);
fs.writeFileSync('diary.css', cssBlock.replace(/<style>|<\/style>/g, ''));

const startJs = html.indexOf('<script>', endCss);
const endJs = html.indexOf('</script>', startJs) + 9; // length of </script>

const jsBlock = html.substring(startJs, endJs);
fs.writeFileSync('diary-inline.js', jsBlock.replace(/<script>|<\/script>/g, ''));

html = html.substring(0, startCss) + '\n' + html.substring(endJs);
fs.writeFileSync('index.html', html);

console.log('Fixed index.html! Extracted CSS length:', cssBlock.length, 'JS length:', jsBlock.length);
