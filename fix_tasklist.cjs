const fs = require('fs');
let code = fs.readFileSync('src/components/TasksView.tsx', 'utf8');

// Filter tasks
const addFilters = `
  const upcomingTasks = tasks.filter(t => t.status === 'upcoming');
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
  const doneTasks = tasks.filter(t => t.status === 'done');
  const archivedTasks = tasks.filter(t => t.status === 'archived');
  
  const renderTaskRow = (task: Task) => (
    <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => { setTaskToEdit(task); setIsTaskFormOpen(true); }}>
      <td className="py-3 px-6 text-sm text-slate-800 font-medium font-sans">
        <div className="flex items-center gap-2">
          {task.status === 'done' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-300" />}
          {task.title}
        </div>
      </td>
      <td className="py-3 px-6 text-sm text-slate-600 font-sans">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-slate-400" />
          {task.dueDate}
        </div>
      </td>
      <td className="py-3 px-6 text-sm text-slate-600 font-sans">{task.assignee || 'Sin asignar'}</td>
      <td className="py-3 px-6 text-sm font-sans">
        <span className={\`px-2 py-1 rounded-full text-xs font-medium \${
          task.priority === 'high' ? 'bg-rose-100 text-rose-700' :
          task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
          'bg-slate-100 text-slate-700'
        }\`}>
          {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
        </span>
      </td>
      <td className="py-3 px-6 text-sm text-slate-600 font-sans">
        {task.status === 'upcoming' ? '📌 Próxima' : 
         task.status === 'in-progress' ? '⏳ En progreso' : 
         task.status === 'done' ? '✅ Hecho' : '📦 Archivada'}
      </td>
    </tr>
  );
`;

code = code.replace(
  /  const toggleSection = \(section: string\) => \{/,
  addFilters + '\n  const toggleSection = (section: string) => {'
);


// Replace counters
code = code.replace(
  /📌 Próximas tareas <span className="text-slate-400 font-normal">\(0\)<\/span>/,
  `📌 Próximas tareas <span className="text-slate-400 font-normal">({upcomingTasks.length})</span>`
);
code = code.replace(
  /⏳ En progreso <span className="text-slate-400 font-normal">\(0\)<\/span>/,
  `⏳ En progreso <span className="text-slate-400 font-normal">({inProgressTasks.length})</span>`
);
code = code.replace(
  /✅ Hecho <span className="text-slate-400 font-normal">\(0\)<\/span>/,
  `✅ Hecho <span className="text-slate-400 font-normal">({doneTasks.length})</span>`
);
code = code.replace(
  /📦 Archivados <span className="text-slate-400 font-normal">\(0\)<\/span>/,
  `📦 Archivados <span className="text-slate-400 font-normal">({archivedTasks.length})</span>`
);


// Render lists
code = code.replace(
  /<\!-\- Upcoming Section \-\->[\s\S]*?No hay tareas próximas\n\s*<\/td>\n\s*<\/tr>\n\s*\)\}/,
  `{/* Upcoming Section */}
                <tr 
                  className="border-b border-slate-200 bg-slate-50/80 group cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleSection('upcoming')}
                >
                  <td colSpan={5} className="py-2 px-4">
                    <div className="flex items-center justify-between font-medium text-slate-800 font-sans text-sm">
                      <div className="flex items-center gap-2">
                        {collapsedSections.upcoming ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        <span className="flex items-center gap-2">
                          📌 Próximas tareas <span className="text-slate-400 font-normal">({upcomingTasks.length})</span>
                        </span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setTaskToEdit(null); setInitialStatusForNewTask('upcoming'); setIsTaskFormOpen(true); }}
                        className="text-slate-400 hover:text-teal-600 transition-colors flex items-center gap-1 text-xs opacity-0 group-hover:opacity-100"
                      >
                        <Plus className="w-3 h-3" /> Nueva tarea
                      </button>
                    </div>
                  </td>
                </tr>
                {!collapsedSections.upcoming && upcomingTasks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-slate-400 font-sans bg-white border-b border-slate-100">
                      No hay tareas próximas
                    </td>
                  </tr>
                )}
                {!collapsedSections.upcoming && upcomingTasks.map(renderTaskRow)}`
);

code = code.replace(
  /<\!-\- In Progress Section \-\->[\s\S]*?No hay tareas en progreso\n\s*<\/td>\n\s*<\/tr>\n\s*\)\}/,
  `{/* In Progress Section */}
                <tr 
                  className="border-b border-slate-200 bg-slate-50/80 group cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleSection('inProgress')}
                >
                  <td colSpan={5} className="py-2 px-4">
                    <div className="flex items-center justify-between font-medium text-slate-800 font-sans text-sm">
                      <div className="flex items-center gap-2">
                        {collapsedSections.inProgress ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        <span className="flex items-center gap-2">
                          ⏳ En progreso <span className="text-slate-400 font-normal">({inProgressTasks.length})</span>
                        </span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setTaskToEdit(null); setInitialStatusForNewTask('in-progress'); setIsTaskFormOpen(true); }}
                        className="text-slate-400 hover:text-teal-600 transition-colors flex items-center gap-1 text-xs opacity-0 group-hover:opacity-100"
                      >
                        <Plus className="w-3 h-3" /> Nueva tarea
                      </button>
                    </div>
                  </td>
                </tr>
                {!collapsedSections.inProgress && inProgressTasks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-slate-400 font-sans bg-white border-b border-slate-100">
                      No hay tareas en progreso
                    </td>
                  </tr>
                )}
                {!collapsedSections.inProgress && inProgressTasks.map(renderTaskRow)}`
);


code = code.replace(
  /<\!-\- Done Section \-\->[\s\S]*?No hay tareas completadas\n\s*<\/td>\n\s*<\/tr>\n\s*\)\}/,
  `{/* Done Section */}
                <tr 
                  className="border-b border-slate-200 bg-slate-50/80 group cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleSection('done')}
                >
                  <td colSpan={5} className="py-2 px-4">
                    <div className="flex items-center justify-between font-medium text-slate-800 font-sans text-sm">
                      <div className="flex items-center gap-2">
                        {collapsedSections.done ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        <span className="flex items-center gap-2">
                          ✅ Hecho <span className="text-slate-400 font-normal">({doneTasks.length})</span>
                        </span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setTaskToEdit(null); setInitialStatusForNewTask('done'); setIsTaskFormOpen(true); }}
                        className="text-slate-400 hover:text-teal-600 transition-colors flex items-center gap-1 text-xs opacity-0 group-hover:opacity-100"
                      >
                        <Plus className="w-3 h-3" /> Nueva tarea
                      </button>
                    </div>
                  </td>
                </tr>
                {!collapsedSections.done && doneTasks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-slate-400 font-sans bg-white border-b border-slate-100">
                      No hay tareas completadas
                    </td>
                  </tr>
                )}
                {!collapsedSections.done && doneTasks.map(renderTaskRow)}`
);


code = code.replace(
  /<\!-\- Archived Section \-\->[\s\S]*?No hay tareas archivadas\n\s*<\/td>\n\s*<\/tr>\n\s*\)\}/,
  `{/* Archived Section */}
                <tr 
                  className="border-b border-slate-200 bg-slate-50/80 group cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleSection('archived')}
                >
                  <td colSpan={5} className="py-2 px-4">
                    <div className="flex items-center justify-between font-medium text-slate-800 font-sans text-sm">
                      <div className="flex items-center gap-2">
                        {collapsedSections.archived ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        <span className="flex items-center gap-2">
                          📦 Archivados <span className="text-slate-400 font-normal">({archivedTasks.length})</span>
                        </span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setTaskToEdit(null); setInitialStatusForNewTask('archived'); setIsTaskFormOpen(true); }}
                        className="text-slate-400 hover:text-teal-600 transition-colors flex items-center gap-1 text-xs opacity-0 group-hover:opacity-100"
                      >
                        <Plus className="w-3 h-3" /> Nueva tarea
                      </button>
                    </div>
                  </td>
                </tr>
                {!collapsedSections.archived && archivedTasks.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-slate-400 font-sans bg-white border-b border-slate-100">
                      No hay tareas archivadas
                    </td>
                  </tr>
                )}
                {!collapsedSections.archived && archivedTasks.map(renderTaskRow)}`
);

fs.writeFileSync('src/components/TasksView.tsx', code);
