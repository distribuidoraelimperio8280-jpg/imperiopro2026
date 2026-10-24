import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Plus, 
  Download, 
  Building2, 
  Search, 
  FileText, 
  Users, 
  Package, 
  Receipt,
  Sparkles,
  ChevronDown,
  CloudUpload,
  Monitor,
  UserCheck,
  LogOut,
  Mail
} from 'lucide-react';
import { syncService } from '../services/syncService';
import { cloudDataService } from '../services/cloudDataService';
import { auth } from '../firebase';
import type { CompanyProfile } from '../types';
import type { UserSession } from '../services/authService';
import { PWAInstallModal } from './PWAInstallModal';

interface HeaderProps {
  company: CompanyProfile;
  userSession: UserSession | null;
  onOpenCompanyModal: () => void;
  onOpenNewInvoice: () => void;
  onOpenNewContact: () => void;
  onOpenNewProduct: () => void;
  onOpenNewExpense: () => void;
  onOpenArchitectureModal: () => void;
  onNavigateToGlobalSave?: () => void;
  onOpenDesktopShortcut?: () => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  activeSearch: string;
  setActiveSearch: (s: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  company,
  userSession,
  onOpenCompanyModal,
  onOpenNewInvoice,
  onOpenNewContact,
  onOpenNewProduct,
  onOpenNewExpense,
  onOpenArchitectureModal,
  onNavigateToGlobalSave,
  onOpenDesktopShortcut,
  onOpenAuthModal,
  onLogout,
  activeSearch,
  setActiveSearch,
}) => {
  const [isOnline, setIsOnline] = useState(syncService.getOnlineStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isPWAModalOpen, setIsPWAModalOpen] = useState(false);

  useEffect(() => {
    const unsubOnline = syncService.subscribeOnlineStatus(setIsOnline);
    const unsubSync = syncService.subscribeSyncStatus((syncing, count) => {
      setIsSyncing(syncing);
      setPendingCount(count);
    });

    // PWA Install prompt handler
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      unsubOnline();
      unsubSync();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      // 1. Sincronización bidireccional inmediata con Servidor Central
      await syncService.pullInitialServerData();
      await syncService.uploadAllToServer();
      await syncService.processSyncQueue();

      // 2. Sincronización en la nube Firestore si existe autenticación
      const email = userSession?.email || auth.currentUser?.email || 'distribuidoraelimperio8280@gmail.com';
      const uid = userSession?.uid || auth.currentUser?.uid;
      if (uid) {
        await cloudDataService.pullAllCloudData(email, uid).catch(console.warn);
        await cloudDataService.uploadAllLocalToCloud(email, uid).catch(console.warn);
      }
    } catch (err) {
      console.warn('Manual sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
      } catch (err) {
        console.log('Install prompt error:', err);
      }
    }
    setIsPWAModalOpen(true);
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/75 backdrop-blur-md border-b border-slate-200/60 px-4 sm:px-8 flex items-center justify-between flex-shrink-0 shadow-xs transition-all">
      <div className="flex items-center justify-between gap-4 w-full">
        
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md hidden sm:flex items-center text-slate-400">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={activeSearch}
            onChange={(e) => setActiveSearch(e.target.value)}
            placeholder="Buscar facturas, clientes, productos RUC..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-100/60 backdrop-blur-sm border border-slate-200/70 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-300 transition-all placeholder:text-slate-400 text-slate-700"
          />
          {activeSearch && (
            <button 
              onClick={() => setActiveSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200/80 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Right Status Actions & Badges */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 ml-auto">
          
          {/* Online / Offline Status Badge */}
          <div 
            onClick={handleManualSync}
            className={`cursor-pointer px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 border transition-all ${
              isOnline 
                ? 'bg-emerald-500/10 text-emerald-800 border-emerald-300/30 hover:bg-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-800 border-amber-300/30 hover:bg-amber-500/20'
            }`}
            title={isOnline ? 'Conexión activa a Internet' : 'Modo Offline-First. Tus cambios se guardan localmente'}
          >
            {isOnline ? (
              <>
                <div className="w-2 h-2 bg-emerald-500/80 rounded-full animate-pulse" />
                <span className="hidden md:inline">Offline-First Activo</span>
                <span className="md:hidden">En Línea</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-amber-500/80 rounded-full" />
                <WifiOff className="w-3.5 h-3.5 text-amber-700" />
                <span>Sin Conexión</span>
              </>
            )}
          </div>

          {/* User Email Authentication Badge */}
          {userSession ? (
            <div className="flex items-center gap-1.5 bg-sky-500/10 border border-sky-300/30 rounded-xl px-2.5 py-1 text-xs">
              <UserCheck className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              <div className="hidden lg:block text-left">
                <span className="font-semibold text-slate-800 block truncate max-w-[130px] leading-tight text-[11px]">
                  {userSession.email}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-1 hover:bg-sky-500/20 rounded text-sky-800 transition-colors ml-1 cursor-pointer"
                title={`Sesión iniciada con: ${userSession.email}. Clic para salir o cambiar de cuenta.`}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-sky-600/85 hover:bg-sky-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs backdrop-blur-xs"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>
          )}

          {/* Global Save Tab Quick Link */}
          {onNavigateToGlobalSave && (
            <button
              onClick={onNavigateToGlobalSave}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-300/30 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Abrir Pestaña de Guardado Global y Respaldos"
            >
              <CloudUpload className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Guardar Global</span>
            </button>
          )}

          {/* Quick Create Dropdown "+ Nuevo" */}
          <div className="relative">
            <button
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-800/90 hover:bg-slate-800 active:bg-slate-950 rounded-xl shadow-xs transition-colors backdrop-blur-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showQuickMenu && (
              <div 
                className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-50 text-slate-700 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setShowQuickMenu(false)}
              >
                <button
                  onClick={onOpenNewInvoice}
                  className="w-full text-left px-3.5 py-2 text-xs sm:text-sm hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 font-medium"
                >
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Nueva Factura</span>
                </button>
                <button
                  onClick={onOpenNewContact}
                  className="w-full text-left px-3.5 py-2 text-xs sm:text-sm hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 font-medium"
                >
                  <Users className="w-4 h-4 text-sky-600" />
                  <span>Nuevo Contacto</span>
                </button>
                <button
                  onClick={onOpenNewProduct}
                  className="w-full text-left px-3.5 py-2 text-xs sm:text-sm hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 font-medium"
                >
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>Nuevo Producto</span>
                </button>
                <button
                  onClick={onOpenNewExpense}
                  className="w-full text-left px-3.5 py-2 text-xs sm:text-sm hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2 font-medium"
                >
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Registrar Compra / Gasto</span>
                </button>
              </div>
            )}
          </div>

          {/* Company Profile Launcher */}
          <button
            onClick={onOpenCompanyModal}
            className="flex items-center gap-2 p-1.5 pl-2 text-slate-700 hover:bg-slate-100/60 rounded-xl transition-colors border border-slate-200/60 bg-white/50 backdrop-blur-xs shadow-2xs group cursor-pointer"
            title="Configuración de la Empresa"
          >
            <div className="text-right hidden md:block leading-tight">
              <div className="text-xs font-bold text-slate-800 max-w-[150px] truncate">
                {company.name || 'Corp Soluciones'}
              </div>
              <div className="text-[10px] text-sky-700 font-medium group-hover:underline">⚙️ Empresa</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-100/80 border border-slate-200/60 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0 overflow-hidden">
              {company.logoUrl ? (
                <img 
                  src={company.logoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-contain p-0.5"
                />
              ) : (
                <Building2 className="w-4 h-4 text-slate-500" />
              )}
            </div>
          </button>

          {/* Tech Architecture Trigger */}
          <button
            onClick={onOpenArchitectureModal}
            className="p-2 text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-300/30 rounded-xl transition-colors cursor-pointer"
            title="Ver Guía de Arquitectura e Instalación PWA"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
          </button>

        </div>
      </div>

      {/* PWA Direct Installation Modal */}
      <PWAInstallModal
        isOpen={isPWAModalOpen}
        onClose={() => setIsPWAModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstalled={() => setIsInstalled(true)}
      />
    </header>
  );
};
