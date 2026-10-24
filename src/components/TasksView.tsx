import React, { useState } from 'react';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/indexedDB';
import { TaskFormModal } from './TaskFormModal';
import { WhatsAppLinkModal } from './WhatsAppLinkModal';
import { TaskSettingsModal } from './TaskSettingsModal';
import { SuggestedTasksModal } from './SuggestedTasksModal';

import { 
  ClipboardList, Link, Settings, Plus, MessageCircle, 
  Search, Filter, Sparkles, LayoutList, LayoutGrid, ChevronDown, ChevronRight, CheckCircle2, Circle, Clock
} from 'lucide-react';

import type { Task, TaskStatus } from '../types';

export const TasksView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'lista' | 'tablero'>('lista');
  
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [initialStatusForNewTask, setInitialStatusForNewTask] = useState<TaskStatus>('upcoming');
  
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSuggestedTasksModalOpen, setIsSuggestedTasksModalOpen] = useState(false);
  const [showWhatsAppBanner, setShowWhatsAppBanner] = useState(true);

    
  // Collapse states
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    upcoming: false,
    inProgress: false,
    done: false,
    archived: false,
  });


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
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          task.priority === 'high' ? 'bg-rose-100 text-rose-700' :
          task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
          'bg-slate-100 text-slate-700'
        }`}>
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

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleAction = (actionName: string) => {
    alert(`Evento disparado: ${actionName} (Listo para conectar con lógica)`);
  };
  
  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-[calc(100vh-64px)] pb-12">
      
      {/* Header Area */}
      <div className="px-6 py-6 bg-white border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 text-teal-700 rounded-lg">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight font-sans">Mis tareas</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-slate-600 bg-white border border-slate-200 shadow-xs rounded hover:text-teal-600 hover:bg-slate-50 transition-colors font-sans text-sm font-medium"
            >
              <Link className="w-4 h-4" />
              Vincular WhatsApp
            </button>
            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-700 transition-colors bg-white border border-slate-200 rounded shadow-xs hover:bg-slate-50" 
              title="Configuración"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
              setTaskToEdit(null);
              setInitialStatusForNewTask('upcoming');
              setIsTaskFormOpen(true);
            }}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded shadow-xs transition-colors font-sans text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Nueva tarea
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 space-y-6">
        
        {/* WhatsApp Banner */}
        {showWhatsAppBanner && (
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 fill-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 font-sans">Crea tus tareas con WhatsApp (Beta)</h3>
              <p className="text-sm text-slate-600 font-sans mt-0.5">
                Convierte las solicitudes de tus clientes en tareas fáciles de gestionar.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowWhatsAppBanner(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors font-sans"
            >
              Probar luego
            </button>
            <button 
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-emerald-700 bg-white border border-emerald-200 rounded-lg shadow-xs hover:bg-emerald-50 transition-colors font-sans"
            >
              Vincular número
            </button>
          </div>
        </div>
        )}

        {/* Filters and Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTab('lista')}
              className={`flex items-center gap-2 pb-4 -mb-4 text-sm font-medium font-sans border-b-2 transition-colors ${activeTab === 'lista' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutList className="w-4 h-4" />
              Lista
            </button>
            <button 
              onClick={() => setActiveTab('tablero')}
              className={`flex items-center gap-2 pb-4 -mb-4 text-sm font-medium font-sans border-b-2 transition-colors ${activeTab === 'tablero' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid className="w-4 h-4" />
              Tablero
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar" 
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 placeholder:text-slate-400 font-sans"
              />
            </div>
            <button 
              onClick={() => handleAction('Filtros')}
              className="flex items-center gap-2 px-3 py-2 text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors font-sans text-sm font-medium shadow-xs"
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>
            <button 
              onClick={() => setIsSuggestedTasksModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded transition-colors font-sans text-sm font-medium ml-2 shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              Tareas sugeridas
            </button>
          </div>
        </div>

        {/* Task List/Table */}
        {activeTab === 'lista' && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-3 px-6 font-semibold text-xs text-slate-500 uppercase tracking-wider font-sans w-2/5">Título</th>
                  <th className="py-3 px-6 font-semibold text-xs text-slate-500 uppercase tracking-wider font-sans">Fecha De Entrega</th>
                  <th className="py-3 px-6 font-semibold text-xs text-slate-500 uppercase tracking-wider font-sans">Responsable</th>
                  <th className="py-3 px-6 font-semibold text-xs text-slate-500 uppercase tracking-wider font-sans">Prioridad</th>
                  <th className="py-3 px-6 font-semibold text-xs text-slate-500 uppercase tracking-wider font-sans">Estado</th>
                </tr>
              </thead>
              <tbody>
                {/* Upcoming Section */}
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
                {!collapsedSections.upcoming && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-slate-400 font-sans bg-white border-b border-slate-100">
                      No hay tareas próximas
                    </td>
                  </tr>
                )}

                {/* In Progress Section */}
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
                {!collapsedSections.inProgress && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-slate-400 font-sans bg-white border-b border-slate-100">
                      No hay tareas en progreso
                    </td>
                  </tr>
                )}

                {/* Done Section */}
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
                {!collapsedSections.done && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-slate-400 font-sans bg-white border-b border-slate-100">
                      No hay tareas completadas
                    </td>
                  </tr>
                )}

                {/* Archived Section */}
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
                {!collapsedSections.archived && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-slate-400 font-sans bg-white">
                      No hay tareas archivadas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tablero View placeholder */}
        {activeTab === 'tablero' && (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-white border border-slate-200 rounded-lg shadow-xs h-64">
            <LayoutGrid className="w-12 h-12 mb-3 text-slate-200" />
            <p className="font-sans text-sm">Vista de tablero próximamente...</p>
          </div>
        )}

      </div>
      <TaskFormModal 
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
