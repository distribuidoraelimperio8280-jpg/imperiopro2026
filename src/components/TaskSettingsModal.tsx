import React from 'react';
import { X, Settings, Bell, Users, Tags } from 'lucide-react';

interface TaskSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TaskSettingsModal: React.FC<TaskSettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 font-sans flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-500" />
            Configuración de Tareas
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-0">
          <div className="flex flex-col">
            <button className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 font-sans text-sm">Notificaciones</h4>
                <p className="text-xs text-slate-500 font-sans">Configura alertas de vencimiento y asignaciones.</p>
              </div>
            </button>
            <button className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 font-sans text-sm">Responsables predeterminados</h4>
                <p className="text-xs text-slate-500 font-sans">Administra tu equipo y reglas de auto-asignación.</p>
              </div>
            </button>
            <button className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                <Tags className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 font-sans text-sm">Etiquetas y categorías</h4>
                <p className="text-xs text-slate-500 font-sans">Crea etiquetas personalizadas para organizar el trabajo.</p>
              </div>
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm font-medium transition-colors font-sans w-full"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
