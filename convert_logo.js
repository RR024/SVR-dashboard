const fs = require('fs');

// Read the image file
const imageBuffer = fs.readFileSync('logo.jpg');

// Convert to base64
const base64Image = imageBuffer.toString('base64');

// Create the data URI
const dataURI = `data:image/jpeg;base64,${base64Image}`;

// Write to file
fs.writeFileSync('logo_base64.txt', dataURI);

console.log('Base64 conversion complete!');
console.log('First 100 characters:', dataURI.substring(0, 100));
