const fs = require('fs');
const file = 'src/components/ContactsView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /      \/>\n    <\/div>\n      \{\/\* Alert Modal \*\/\}/g,
  `      />\n\n      {/* Alert Modal */}`
);

fs.writeFileSync(file, code);
