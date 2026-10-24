const fs = require('fs');
const file = 'src/components/ContactsView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /      <\/ContactFormModal>\s*<\/div>\s*\{\/\* Alert Modal \*\/\}/s,
  `      />\n\n      {/* Alert Modal */}`
);

fs.writeFileSync(file, code);
