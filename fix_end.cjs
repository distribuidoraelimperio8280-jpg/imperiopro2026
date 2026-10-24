const fs = require('fs');
let code = fs.readFileSync('src/components/TasksView.tsx', 'utf8');

// The issue is that the modals are outside the main </div>
code = code.replace(
  /      <\/div>\n    <\/div>\n      <TaskFormModal/,
  `      </div>\n      <TaskFormModal`
);

fs.writeFileSync('src/components/TasksView.tsx', code);
