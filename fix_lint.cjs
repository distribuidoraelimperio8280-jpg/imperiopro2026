const fs = require('fs');
let code = fs.readFileSync('src/components/TasksView.tsx', 'utf8');

code = code.replace(
  /const \[tasks, setTasks\] = useState<Task\[\]>\(\[\]\);/,
  `// const [tasks, setTasks] = useState<Task[]>([]);`
);

code = code.replace(
  /Search, Filter, Sparkles, LayoutList, LayoutGrid, ChevronDown, ChevronRight, CheckCircle2, Circle, Clock, Archive/,
  `Search, Filter, Sparkles, LayoutList, LayoutGrid, ChevronDown, ChevronRight`
);

fs.writeFileSync('src/components/TasksView.tsx', code);
