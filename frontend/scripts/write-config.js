const fs = require('fs');
const path = require('path');

const apiBaseUrl = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || '';
const outputPath = path.resolve(__dirname, '../public/js/config.js');

fs.writeFileSync(
  outputPath,
  `window.PROMPTWALL_API_BASE = ${JSON.stringify(apiBaseUrl.replace(/\/$/, ''))};\n`
);

console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
