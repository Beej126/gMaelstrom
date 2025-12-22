// Modern SCSS variable extraction using regex
// No external packages required

const fs = require('fs');
const path = require('path');

const scssPath = path.resolve(__dirname, '../app/MUI.DataGrid.scss');
const scssContent = fs.readFileSync(scssPath, 'utf8');

// Regex to match simple SCSS variables: $var: value;
const varRegex = /^\s*\$([\w-]+)\s*:\s*([^;]+);/gm;
const gridVars = {};
let match;
while ((match = varRegex.exec(scssContent)) !== null) {
  let value = match[2].trim();
  if (value.endsWith('px')) {
    const num = parseFloat(value);
    value = isNaN(num) ? value : num;
  }
  gridVars[match[1]] = value;
}

const tsContent = `// Auto-generated from SCSS by export-sass-vars.cjs\nexport const mui_DataGrid_Vars = ${JSON.stringify(gridVars, null, 2)} as const;\nexport type MUI_DataGrid_Vars = typeof mui_DataGrid_Vars;\n`;
fs.writeFileSync(path.resolve(__dirname, '../app/MUI.DataGrid.vars.ts'), tsContent);
console.log('TypeScript file written to src/app/MUI.DataGrid.vars.ts');

