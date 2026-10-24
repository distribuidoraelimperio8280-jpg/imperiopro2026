import React from 'react';
import { X, Sparkles, Plus } from 'lucide-react';
import type { Task } from '../types';

interface SuggestedTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAcceptTask: (task: Partial<Task>) => void;
}

export const SuggestedTasksModal: React.FC<SuggestedTasksModalProps> = ({ isOpen, onClose, onAcceptTask }) => {
  if (!isOpen) return null;

  const suggestions = [
    {
      title: 'Hacer seguimiento a cotización #0012',
      priority: 'high' as const,
      reason: 'El cliente lleva 3 días sin responder.',
    },
    {
      title: 'Revisar cuentas por cobrar vencidas',
      priority: 'medium' as const,
      reason: 'Hay 2 facturas que vencieron esta semana.',
    },
    {
      title: 'Actualizar inventario de productos agotados',
      priority: 'low' as const,
      reason: '3 productos llegaron a su nivel mínimo de stock.',
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50">
          <h2 className="text-xl font-bold text-amber-800 font-sans flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Tareas Sugeridas por IA
          </h2>
          <button onClick={onClose} className="p-2 text-amber-700 hover:text-amber-900 rounded-full hover:bg-amber-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-600 font-sans mb-4">
            Basado en la actividad reciente de tu empresa, hemos identificado las siguientes tareas recomendadas:
          </p>
          
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="border border-slate-200 rounded-lg p-4 hover:border-amber-200 hover:bg-amber-50/30 transition-colors">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-bold text-slate-800 font-sans text-sm">{suggestion.title}</h4>
                    <p className="text-xs text-slate-500 font-sans mt-1">💡 {suggestion.reason}</p>
                  </div>
                  <button 
                    onClick={() => {
                      onAcceptTask({
                        title: suggestion.title,
                        priority: suggestion.priority,
                        description: suggestion.reason
                      });
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:border-teal-500 hover:text-teal-600 text-slate-600 rounded shadow-xs text-xs font-medium transition-colors font-sans shrink-0"
                  >
                    <Plus className="w-3 h-3" /> Añadir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm font-medium transition-colors font-sans"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
