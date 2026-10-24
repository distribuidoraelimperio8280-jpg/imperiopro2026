const fs = require('fs');
let code = fs.readFileSync('src/components/TasksView.tsx', 'utf8');

const importsToAdd = `
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/indexedDB';
import { TaskFormModal } from './TaskFormModal';
import { WhatsAppLinkModal } from './WhatsAppLinkModal';
import { TaskSettingsModal } from './TaskSettingsModal';
import { SuggestedTasksModal } from './SuggestedTasksModal';
`;

code = code.replace(/import \{/, importsToAdd + '\nimport {');

// Remove the local Task interface
code = code.replace(/interface Task \{[\s\S]*?\}\n/, "import type { Task, TaskStatus } from '../types';\n");

// Add modal states inside TasksView
code = code.replace(
  /  const \[activeTab, setActiveTab\] = useState<'lista' \| 'tablero'>\('lista'\);/,
  `  const [activeTab, setActiveTab] = useState<'lista' | 'tablero'>('lista');
  
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [initialStatusForNewTask, setInitialStatusForNewTask] = useState<TaskStatus>('upcoming');
  
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSuggestedTasksModalOpen, setIsSuggestedTasksModalOpen] = useState(false);
  const [showWhatsAppBanner, setShowWhatsAppBanner] = useState(true);
`
);

// Delete old state
code = code.replace(
  /\/\/ const \[tasks, setTasks\] = useState<Task\[\]>\(\[\]\);\n/,
  ``
);

// Replace handleAction uses
code = code.replace(
  /onClick=\{\(\) => handleAction\('Vincular WhatsApp'\)\}/g,
  `onClick={() => setIsWhatsAppModalOpen(true)}`
);

code = code.replace(
  /onClick=\{\(\) => handleAction\('Vincular Número WhatsApp'\)\}/g,
  `onClick={() => setIsWhatsAppModalOpen(true)}`
);

code = code.replace(
  /onClick=\{\(\) => handleAction\('Configuración de tareas'\)\}/g,
  `onClick={() => setIsSettingsModalOpen(true)}`
);

code = code.replace(
  /onClick=\{\(\) => handleAction\('Nueva Tarea'\)\}/g,
  `onClick={() => {
              setTaskToEdit(null);
              setInitialStatusForNewTask('upcoming');
              setIsTaskFormOpen(true);
            }}`
);

code = code.replace(
  /onClick=\{\(\) => handleAction\('Cerrar Banner WhatsApp'\)\}/g,
  `onClick={() => setShowWhatsAppBanner(false)}`
);

code = code.replace(
  /onClick=\{\(\) => handleAction\('Tareas sugeridas'\)\}/g,
  `onClick={() => setIsSuggestedTasksModalOpen(true)}`
);

// We need to render the tasks and handle new task per section
code = code.replace(
  /onClick=\{\(e\) => \{ e\.stopPropagation\(\); handleAction\('Nueva Tarea \(Próximas\)'\); \}\}/,
  `onClick={(e) => { e.stopPropagation(); setTaskToEdit(null); setInitialStatusForNewTask('upcoming'); setIsTaskFormOpen(true); }}`
);

code = code.replace(
  /onClick=\{\(e\) => \{ e\.stopPropagation\(\); handleAction\('Nueva Tarea \(En progreso\)'\); \}\}/,
  `onClick={(e) => { e.stopPropagation(); setTaskToEdit(null); setInitialStatusForNewTask('in-progress'); setIsTaskFormOpen(true); }}`
);

code = code.replace(
  /onClick=\{\(e\) => \{ e\.stopPropagation\(\); handleAction\('Nueva Tarea \(Hecho\)'\); \}\}/,
  `onClick={(e) => { e.stopPropagation(); setTaskToEdit(null); setInitialStatusForNewTask('done'); setIsTaskFormOpen(true); }}`
);

code = code.replace(
  /onClick=\{\(e\) => \{ e\.stopPropagation\(\); handleAction\('Nueva Tarea \(Archivados\)'\); \}\}/,
  `onClick={(e) => { e.stopPropagation(); setTaskToEdit(null); setInitialStatusForNewTask('archived'); setIsTaskFormOpen(true); }}`
);


// Conditionally render WhatsApp Banner
code = code.replace(
  /\{\/\* WhatsApp Banner \*\/\}\n\s*<div className="bg-emerald-50/,
  `{/* WhatsApp Banner */}
        {showWhatsAppBanner && (
        <div className="bg-emerald-50`
);

code = code.replace(
  /Vincular número\n\s*<\/button>\n\s*<\/div>\n\s*<\/div>/,
  `Vincular número
            </button>
          </div>
        </div>
        )}`
);


// Append Modals to the end before the last </div>
code = code.replace(
  /  \);\n\};\n$/,
  `      <TaskFormModal 
        isOpen={isTaskFormOpen} 
        onClose={() => setIsTaskFormOpen(false)} 
        taskToEdit={taskToEdit} 
        initialStatus={initialStatusForNewTask}
      />
      <WhatsAppLinkModal 
        isOpen={isWhatsAppModalOpen} 
        onClose={() => setIsWhatsAppModalOpen(false)} 
      />
      <TaskSettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />
      <SuggestedTasksModal 
        isOpen={isSuggestedTasksModalOpen} 
        onClose={() => setIsSuggestedTasksModalOpen(false)} 
        onAcceptTask={(partialTask) => {
          // Open new task modal prefilled
          setTaskToEdit({
            id: '',
            title: partialTask.title || '',
            dueDate: new Date().toISOString().split('T')[0],
            assignee: '',
            priority: partialTask.priority || 'medium',
            status: 'upcoming',
            description: partialTask.description || '',
            createdAt: '',
            updatedAt: '',
          });
          setIsTaskFormOpen(true);
        }}
      />
    </div>
  );
};
`
);

fs.writeFileSync('src/components/TasksView.tsx', code);
