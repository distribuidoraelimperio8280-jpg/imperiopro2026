const fs = require('fs');
let code = fs.readFileSync('src/components/MobileNav.tsx', 'utf8');

code = code.replace(
  /import \{\s*LayoutDashboard,/,
  `import { ClipboardList,\n  LayoutDashboard,`
);

fs.writeFileSync('src/components/MobileNav.tsx', code);
