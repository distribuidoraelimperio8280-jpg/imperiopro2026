const fs = require('fs');
const file = 'src/components/InvoiceDetailModal.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /return \(\n    <div className="fixed inset-0/,
  'return (\n    <>\n    <div className="fixed inset-0'
);

code = code.replace(
  /      \)}\n    <\/div>\n  \);\n};/,
  '      )}\n    </>\n  );\n};'
);

fs.writeFileSync(file, code);
