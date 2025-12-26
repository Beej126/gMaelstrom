/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
// copy-readme.js
// Cross-platform script to copy readme_google_auth.md from root to public/

const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../readme_google_auth.md');
const destDir = path.join(__dirname, '../public');
const dest = path.join(destDir, 'readme_google_auth.md');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir);
}

fs.copyFileSync(src, dest);
console.log(`Copied ${src} to ${dest}`);
