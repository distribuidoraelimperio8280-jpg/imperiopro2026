const fs = require('fs');
const file = 'src/components/ContactsView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Just remove all `    </div>\n      {/* Alert Modal */}` matches
code = code.replace(/    <\/div>\n      \{\/\* Alert Modal \*\/\}/, '      {/* Alert Modal */}');

fs.writeFileSync(file, code);
