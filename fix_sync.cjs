const fs = require('fs');
let code = fs.readFileSync('src/services/syncService.ts', 'utf8');

code = code.replace(
  /entity: 'invoices' \| 'contacts' \| 'products' \| 'expenses' \| 'quotes' \| 'creditNotes' \| 'companyProfile',/,
  `entity: 'invoices' | 'contacts' | 'products' | 'expenses' | 'quotes' | 'creditNotes' | 'companyProfile' | 'tasks',`
);

fs.writeFileSync('src/services/syncService.ts', code);
