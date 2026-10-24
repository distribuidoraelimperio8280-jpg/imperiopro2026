import React from 'react';
import { ClipboardList,
  LayoutDashboard, 
  FileText, 
  FileSpreadsheet,
  RotateCcw,
  Palette,
  Users, 
  Package, 
  Receipt, 
  BarChart3,
  CloudUpload,
  Database,
  CreditCard
} from 'lucide-react';
import type { TabType } from './Sidebar';

interface MobileNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const items = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tareas', icon: ClipboardList },
    { id: 'invoices', label: 'Ventas', icon: FileText },
    { id: 'inventory', label: 'Stock', icon: Package },
    { id: 'reports', label: 'Reportes', icon: BarChart3 },
    { id: 'subscriptions', label: 'Planes', icon: CreditCard },
    { id: 'data-management', label: 'Excel', icon: Database },
    { id: 'global-save', label: 'Guardar', icon: CloudUpload },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 text-slate-400 py-1.5 px-2 flex justify-between items-center shadow-lg overflow-x-auto no-scrollbar">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as TabType)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors shrink-0 ${
              isActive ? 'text-emerald-400 font-bold' : 'hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
