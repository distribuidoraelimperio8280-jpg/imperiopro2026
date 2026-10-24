const fs = require('fs');
let code = fs.readFileSync('src/services/syncService.ts', 'utf8');

const tasksBlock = `
        } else if (entity === 'tasks') {
          if (item.operation === 'delete') {
            await cloudDataService.deleteTask(payload.id || payload);
          } else {
            await cloudDataService.saveTask(payload, userEmail, userId);
          }
`;

code = code.replace(
  /        \} else if \(entity === 'companyProfile'\) \{/,
  tasksBlock + '\n        } else if (entity === \'companyProfile\') {'
);

fs.writeFileSync('src/services/syncService.ts', code);
