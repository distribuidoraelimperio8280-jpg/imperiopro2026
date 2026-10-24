const fs = require('fs');
let code = fs.readFileSync('src/types/index.ts', 'utf8');

code = code.replace(
  /entity: 'invoices' \| 'contacts' \| 'products' \| 'expenses';/,
  `entity: 'invoices' | 'contacts' | 'products' | 'expenses' | 'quotes' | 'companyProfile' | 'creditNotes' | 'tasks';`
);

fs.writeFileSync('src/types/index.ts', code);
