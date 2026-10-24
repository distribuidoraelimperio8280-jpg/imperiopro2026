const fs = require('fs');
const file = 'src/components/InvoicesView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /return \(\n    <div className="space-y-6 pb-12">/,
  'return (\n    <>\n    <div className="space-y-6 pb-12">'
);

code = code.replace(
  /      \)}\n    <\/div>\n  \);\n};/,
  '      )}\n    </>\n  );\n};'
);

fs.writeFileSync(file, code);
