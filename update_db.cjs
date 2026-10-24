const fs = require('fs');
let code = fs.readFileSync('src/db/indexedDB.ts', 'utf8');

// Add Task to imports
code = code.replace(
  /import type \{ Contact, Product, Invoice, Expense, CompanyProfile, SyncQueueItem, Quote, CreditNote \} from '\.\.\/types';/,
  `import type { Contact, Product, Invoice, Expense, CompanyProfile, SyncQueueItem, Quote, CreditNote, Task } from '../types';`
);

// Add table definition
code = code.replace(
  /  companyProfile!: Table<CompanyProfile & \{ id: string \}, string>;/,
  `  companyProfile!: Table<CompanyProfile & { id: string }, string>;\n  tasks!: Table<Task, string>;`
);

// Update schema version
code = code.replace(
  /    this\.version\(1\)\.stores\(\{([\s\S]*?)    \}\);/,
  `    this.version(1).stores({$1    });\n\n    this.version(2).stores({\n      tasks: 'id, title, status, assignee, dueDate'\n    });`
);

fs.writeFileSync('src/db/indexedDB.ts', code);
