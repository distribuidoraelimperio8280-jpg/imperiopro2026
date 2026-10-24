const fs = require('fs');
let code = fs.readFileSync('src/services/syncService.ts', 'utf8');

code = code.replace(
  /        \} else if \(entity === 'tasks'\) \{\n          if \(item\.operation === 'delete'\) \{/,
  `        } else if (entity === 'tasks') {\n          if (operation === 'delete') {`
);

fs.writeFileSync('src/services/syncService.ts', code);
