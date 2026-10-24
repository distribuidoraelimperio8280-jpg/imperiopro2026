const fs = require('fs');

// 1. Fix syncService
let syncService = fs.readFileSync('src/services/syncService.ts', 'utf8');
syncService = syncService.replace(
  /'invoices' \| 'contacts' \| 'products' \| 'expenses' \| 'quotes' \| 'companyProfile' \| 'creditNotes'/,
  `'invoices' | 'contacts' | 'products' | 'expenses' | 'quotes' | 'companyProfile' | 'creditNotes' | 'tasks'`
);
fs.writeFileSync('src/services/syncService.ts', syncService);

// 2. Fix TasksView imports
let tasksView = fs.readFileSync('src/components/TasksView.tsx', 'utf8');
tasksView = tasksView.replace(
  /Search, Filter, Sparkles, LayoutList, LayoutGrid, ChevronDown, ChevronRight/,
  `Search, Filter, Sparkles, LayoutList, LayoutGrid, ChevronDown, ChevronRight, CheckCircle2, Circle, Clock`
);
fs.writeFileSync('src/components/TasksView.tsx', tasksView);

