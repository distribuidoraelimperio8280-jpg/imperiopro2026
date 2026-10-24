import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  ClipboardList,
  LayoutDashboard, 
  FileText, 
  FileSpreadsheet,
  RotateCcw,
  Palette,
  Users, 
  Package, 
  Receipt, 
  BarChart3, 
  Sparkles, 
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  CloudUpload,
  Database,
  MapPin,
  CreditCard,
  Lock
} from 'lucide-react';

export type TabType = 'dashboard' | 'invoices' | 'quotes' | 'credit-notes' | 'templates' | 'contacts' | 'inventory' | 'expenses' | 'reports' | 'subscriptions' | 'checkout' | 'data-management' | 'maps' | 'global-save' | 'architecture' | 'tasks';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  companyName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  companyName
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Panel General', icon: LayoutDashboard, badge: null },
    { id: 'tasks', label: 'Mis Tareas', icon: ClipboardList, badge: 'Beta' },
    { id: 'invoices', label: 'Facturación y Ventas', icon: FileText, badge: null },
    { id: 'quotes', label: 'Cotizaciones (PDF & WAP)', icon: FileSpreadsheet, badge: null },
    { id: 'credit-notes', label: 'Notas de Crédito & Stock', icon: RotateCcw, badge: 'Stock' },
    { id: 'templates', label: 'Plantillas de Factura', icon: Palette, badge: '25' },
    { id: 'contacts', label: 'Contactos', icon: Users, badge: null },
    { id: 'maps', label: 'Mapa y Rutas (GPS)', icon: MapPin, badge: 'Maps' },
    { id: 'inventory', label: 'Inventario y Stock', icon: Package, badge: null },
    { id: 'expenses', label: 'Compras y Gastos', icon: Receipt, badge: 'Insumos' },
    { id: 'reports', label: 'Reportes por Ventas', icon: BarChart3, badge: 'PRO' },
    { id: 'subscriptions', label: 'Planes de Suscripción', icon: CreditCard, badge: 'Planes' },
    { id: 'checkout', label: 'Pago y Facturación', icon: Lock, badge: 'SSL' },
    { id: 'data-management', label: 'Importar / Exportar Excel', icon: Database, badge: 'Excel' },
    { id: 'global-save', label: 'Guardar Cambios Global', icon: CloudUpload, badge: 'Global' },
    { id: 'architecture', label: 'Arquitectura & PWA', icon: Sparkles, badge: 'Tech' },
  ];

  const navRef = useRef<HTMLElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  // Monitor scroll position to show/hide slide helpers and maintain state
  const checkScroll = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    const hasOverflow = el.scrollHeight > el.clientHeight;
    setCanScrollUp(hasOverflow && el.scrollTop > 8);
    setCanScrollDown(hasOverflow && el.scrollTop + el.clientHeight < el.scrollHeight - 8);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    checkScroll();

    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, collapsed]);

  // Smooth scroll helper functions
  const handleScrollUp = () => {
    navRef.current?.scrollBy({ top: -140, behavior: 'smooth' });
  };

  const handleScrollDown = () => {
    navRef.current?.scrollBy({ top: 140, behavior: 'smooth' });
  };

  return (
    <aside 
      className={`hidden md:flex flex-col h-full max-h-screen bg-slate-900/85 backdrop-blur-xl text-slate-300 border-r border-slate-800/60 transition-all duration-300 select-none shrink-0 overflow-hidden relative shadow-lg ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-slate-800/60 shrink-0 bg-slate-900/70 backdrop-blur-md z-10">
        {!collapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/80 backdrop-blur-xs flex items-center justify-center text-white font-bold text-lg shadow-xs shrink-0">
              I
            </div>
            <div className="flex flex-col truncate">
              <span className="font-bold text-white text-base tracking-tight leading-none">
                Imperio <span className="text-emerald-400/90 font-medium text-xs">PRO</span>
              </span>
              <span className="text-[10px] text-slate-400 truncate mt-1">
                {companyName || 'Contabilidad & ERP'}
              </span>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="w-8 h-8 rounded-xl bg-emerald-500/80 flex items-center justify-center text-white font-bold text-lg shadow-xs mx-auto">
            I
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors hidden sm:flex cursor-pointer"
          title={collapsed ? 'Expandir Menú' : 'Colapsar Menú'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Indicador superior para deslizar hacia arriba cuando hay opciones ocultas */}
      {canScrollUp && (
        <button
          onClick={handleScrollUp}
          className="w-full py-1 bg-slate-800/80 hover:bg-emerald-600/70 text-slate-300 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1 border-b border-slate-700/60 shadow-md transition-all z-10 cursor-pointer animate-in fade-in duration-150 backdrop-blur-xs"
          title="Deslizar menú hacia arriba"
        >
          <ChevronUp className="w-3.5 h-3.5" />
          {!collapsed && <span>Deslizar hacia arriba</span>}
        </button>
      )}

      {/* Navigation Items con Barra de Despliegue / Scrollbar habilitada */}
      <nav 
        ref={navRef}
        className="sidebar-scrollbar flex-1 min-h-0 py-3 px-3 space-y-1 overflow-y-auto overflow-x-hidden scroll-smooth"
        aria-label="Menú principal de navegación"
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-800/80 text-white font-bold shadow-xs border-l-2 border-emerald-400/90 backdrop-blur-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400/90' : 'text-slate-400'}`} />
              
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between text-left truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-400/20 rounded-md shrink-0 ml-1.5">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Indicador inferior para deslizar hacia abajo cuando hay más opciones */}
      {canScrollDown && (
        <button
          onClick={handleScrollDown}
          className="w-full py-1 bg-slate-800/90 hover:bg-emerald-600/90 text-slate-300 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1 border-t border-slate-700/80 shadow-md transition-all z-10 cursor-pointer animate-in fade-in duration-150"
          title="Deslizar menú hacia abajo"
        >
          <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
          {!collapsed && <span>Más opciones abajo</span>}
        </button>
      )}

      {/* Bottom Footer Status Badge */}
      <div className="p-3 border-t border-slate-800 text-slate-400 text-xs shrink-0 bg-slate-900 z-10">
        {!collapsed ? (
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800/80 space-y-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              ESTADO DEL SISTEMA
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">Sincronización PWA</span>
              <span className="text-xs font-mono text-emerald-400 font-bold">100% OK</span>
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[100%] rounded-full transition-all duration-500" />
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="PWA Offline Ready">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
        )}
      </div>
    </aside>
  );
};
