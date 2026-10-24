const fs = require('fs');
const file = 'src/components/InvoiceDetailModal.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /return \(\n    <>\n    <div className="fixed inset-0/,
  'return (\n    <div className="fixed inset-0'
);

code = code.replace(
  /      \)}\n    <\/>\n  \);\n};/,
  '      )}\n    </div>\n  );\n};'
);

fs.writeFileSync(file, code);
