const fs = require('fs');

// 1. Sidebar.tsx
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
sidebar = sidebar.replace(
  /'dashboard' \| 'invoices' \| 'quotes' \| 'credit-notes' \| 'templates' \| 'contacts' \| 'inventory' \| 'expenses' \| 'reports' \| 'data-management' \| 'global-save' \| 'architecture'/,
  `'dashboard' | 'invoices' | 'quotes' | 'credit-notes' | 'templates' | 'contacts' | 'inventory' | 'expenses' | 'reports' | 'data-management' | 'global-save' | 'architecture' | 'tasks'`
);
sidebar = sidebar.replace(/import \{([\s\S]*?)LayoutDashboard,/, "import { ClipboardList,\n  LayoutDashboard,");
sidebar = sidebar.replace(
  /\{ id: 'dashboard', label: 'Panel General', icon: LayoutDashboard, badge: null \},/,
  `{ id: 'dashboard', label: 'Panel General', icon: LayoutDashboard, badge: null },\n    { id: 'tasks', label: 'Mis Tareas', icon: ClipboardList, badge: 'Beta' },`
);
fs.writeFileSync('src/components/Sidebar.tsx', sidebar);

// 2. MobileNav.tsx
let mobileNav = fs.readFileSync('src/components/MobileNav.tsx', 'utf8');
mobileNav = mobileNav.replace(
  /import \{\s*LayoutDashboard,\s*FileText,\s*Users,\s*Package,\s*Menu,\s*X\s*\} from 'lucide-react';/,
  `import { LayoutDashboard, FileText, Users, Package, Menu, X, ClipboardList } from 'lucide-react';`
);
mobileNav = mobileNav.replace(
  /\{ id: 'dashboard', label: 'Inicio', icon: LayoutDashboard \},/,
  `{ id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },\n    { id: 'tasks', label: 'Tareas', icon: ClipboardList },`
);
fs.writeFileSync('src/components/MobileNav.tsx', mobileNav);

// 3. App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(
  /import \{ DataManagementView \} from '.\/components\/DataManagementView';/,
  `import { DataManagementView } from './components/DataManagementView';\nimport { TasksView } from './components/TasksView';`
);

app = app.replace(
  /\{activeTab === 'architecture' && \(/,
  `{activeTab === 'tasks' && (
              <TasksView />
            )}

            {activeTab === 'architecture' && (`
);
fs.writeFileSync('src/App.tsx', app);
