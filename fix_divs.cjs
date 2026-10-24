const fs = require('fs');
const file = 'src/components/InvoicesView.tsx';
let code = fs.readFileSync(file, 'utf8');

// I will just put the original return structure back by removing the fragment
code = code.replace(
  /return \(\n    <>\n    <div className="space-y-6 pb-12">/,
  'return (\n    <div className="space-y-6 pb-12">'
);

code = code.replace(
  /      \)}\n    <\/>\n  \);\n};/,
  '      )}\n    </div>\n  );\n};'
);

fs.writeFileSync(file, code);
