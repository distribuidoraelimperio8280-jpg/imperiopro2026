import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import type { Task, TaskPriority, TaskStatus } from '../types';
import { db } from '../db/indexedDB';
import { syncService } from '../services/syncService';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  initialStatus?: TaskStatus;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({ isOpen, onClose, taskToEdit, initialStatus }) => {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('upcoming');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDueDate(taskToEdit.dueDate);
      setAssignee(taskToEdit.assignee);
      setPriority(taskToEdit.priority);
      setStatus(taskToEdit.status);
      setDescription(taskToEdit.description || '');
    } else {
      setTitle('');
      setDueDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
      setAssignee('');
      setPriority('medium');
      setStatus(initialStatus || 'upcoming');
      setDescription('');
    }
  }, [taskToEdit, isOpen, initialStatus]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const task: Task = {
      id: taskToEdit ? taskToEdit.id : crypto.randomUUID(),
      title,
      dueDate,
      assignee,
      priority,
      status,
      description,
      createdAt: taskToEdit ? taskToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.tasks.put(task);
    await syncService.queueChange('tasks', taskToEdit ? 'update' : 'create', task);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 font-sans">
            {taskToEdit ? 'Editar Tarea' : 'Nueva Tarea'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="task-form" onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 font-sans">Título de la tarea</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 font-sans"
                placeholder="Ej. Revisar cotización de cliente"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 font-sans">Fecha de Entrega</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 font-sans"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 font-sans">Responsable</label>
                <input
                  type="text"
                  required
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 font-sans">Estado</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 font-sans"
                >
                  <option value="upcoming">📌 Próxima</option>
                  <option value="in-progress">⏳ En progreso</option>
                  <option value="done">✅ Hecho</option>
                  <option value="archived">📦 Archivada</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 font-sans">Prioridad</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 font-sans"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 font-sans">Descripción (Opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 font-sans"
                placeholder="Detalles adicionales..."
              ></textarea>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors font-sans"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="task-form"
            className="flex items-center gap-2 px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm font-medium transition-colors font-sans"
          >
            <Check className="w-4 h-4" />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};
