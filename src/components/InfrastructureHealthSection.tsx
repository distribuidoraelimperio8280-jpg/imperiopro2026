import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  HardDrive,
  Database,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Wifi,
  WifiOff,
  FolderArchive,
  FileText,
  Activity,
  ArrowRight,
  Lock,
  Play,
  FileCode,
  FileSpreadsheet,
  Calendar
} from 'lucide-react';
import { db } from '../db/indexedDB';
import { useLiveQuery } from 'dexie-react-hooks';
import { syncService } from '../services/syncService';

interface InfrastructureHealthData {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  backups: {
    totalCount: number;
    totalBytes: number;
    totalFormatted: string;
    db: {
      lastExecution: string | null;
      lastFileName: string | null;
      sizeFormatted: string | null;
      status: 'healthy' | 'warning' | 'critical';
      totalFiles: number;
      hoursSinceLastBackup: number | null;
    };
    documents: {
      lastExecution: string | null;
      lastFileName: string | null;
      sizeFormatted: string | null;
      status: 'healthy' | 'warning' | 'critical';
      totalFiles: number;
      hoursSinceLastBackup: number | null;
    };
    exports: {
      lastExecution: string | null;
      lastFileName: string | null;
      sizeFormatted: string | null;
      status: 'healthy' | 'warning' | 'critical';
      totalFiles: number;
    };
  };
  disk: {
    storagePath: string;
    dbPath: string;
    documentsPath: string;
    exportsPath: string;
    totalBackupsBytes: number;
    totalBackupsFormatted: string;
    breakdown: {
      db: { bytes: number; formatted: string; count: number };
      documents: { bytes: number; formatted: string; count: number };
      exports: { bytes: number; formatted: string; count: number };
    };
    systemTotalBytes: number;
    systemTotalFormatted: string;
    systemFreeBytes: number;
    systemFreeFormatted: string;
    systemUsedBytes: number;
    systemUsedFormatted: string;
    systemUsedPercent: number;
    healthStatus: 'optimal' | 'warning' | 'critical';
    retentionDays: number;
  };
  alerts: Array<{
    id: string;
    level: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    recommendation: string;
  }>;
}

interface Props {
  onNavigateTab?: (tab: string) => void;
  compact?: boolean;
}

export const InfrastructureHealthSection: React.FC<Props> = ({ onNavigateTab, compact = false }) => {
  const [healthData, setHealthData] = useState<InfrastructureHealthData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [isSyncingOffline, setIsSyncingOffline] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isStoragePersisted, setIsStoragePersisted] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Live queries from IndexedDB
  const invoicesCount = useLiveQuery(() => db.invoices.count(), []) || 0;
  const contactsCount = useLiveQuery(() => db.contacts.count(), []) || 0;
  const productsCount = useLiveQuery(() => db.products.count(), []) || 0;
  const offlineCreatedInvoices = useLiveQuery(
    () => db.invoices.filter(i => i.offlineCreated === true).count(),
    []
  ) || 0;
  const pendingSyncQueueItems = useLiveQuery(
    () => db.syncQueue.where('synced').equals(0).count(),
    []
  ) || 0;

  // Listen to network status & offline queue
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check storage persistence for PWA offline durability
    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then((persisted) => {
        setIsStoragePersisted(persisted);
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/infrastructure/health');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.health) {
          setHealthData(json.health);
        }
      }
    } catch (err) {
      console.warn('[InfrastructureHealth] Error fetching health data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    // Poll every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchHealth();
  };

  const handleRequestStoragePersistence = async () => {
    if (navigator.storage && navigator.storage.persist) {
      try {
        const isGranted = await navigator.storage.persist();
        setIsStoragePersisted(isGranted);
      } catch (err) {
        console.warn('Storage persist request error:', err);
      }
    }
  };

  const handleTriggerQuickBackup = async () => {
    setIsBackingUp(true);
    try {
      const [invs, prods, conts] = await Promise.all([
        db.invoices.toArray(),
        db.products.toArray(),
        db.contacts.toArray()
      ]);

      const res = await fetch('/api/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'db',
          format: 'sql',
          payload: {
            invoices: invs,
            products: prods,
            contacts: conts,
            generatedAt: new Date().toISOString(),
          }
        })
      });

      if (res.ok) {
        await fetchHealth();
      }
    } catch (err) {
      console.error('Error generating quick backup:', err);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleSyncOfflineQueue = async () => {
    if (!isOnline) {
      setSyncFeedback('Dispositivo offline. La sincronización se activará automáticamente al reconectarse a Internet.');
      setTimeout(() => setSyncFeedback(null), 4000);
      return;
    }

    setIsSyncingOffline(true);
    setSyncFeedback(null);
    try {
      const result = await syncService.processSyncQueue();
      setSyncFeedback(result.message);
      await fetchHealth();
    } catch (err: any) {
      setSyncFeedback(`Fallo al sincronizar: ${err.message || 'Error de red'}`);
    } finally {
      setIsSyncingOffline(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  // Compile combined client + server integrity alerts
  const clientAlerts: Array<{
    id: string;
    level: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    recommendation: string;
  }> = [];

  if (!isOnline) {
    clientAlerts.push({
      id: 'alert-offline-pwa',
      level: 'warning',
      title: 'PWA en Modo Offline (Sin Conexión)',
      message: 'La aplicación está operando en modo local seguro. Todas las facturas y operaciones se registran en Dexie IndexedDB.',
      recommendation: 'Al restablecer la señal, las transacciones se sincronizarán automáticamente con Firestore y el servidor.'
    });
  }

  if (pendingSyncQueueItems > 0) {
    clientAlerts.push({
      id: 'alert-pending-sync',
      level: isOnline ? 'warning' : 'info',
      title: `${pendingSyncQueueItems} Operaciones Pendientes en Cola Offline`,
      message: `Existen ${pendingSyncQueueItems} cambios en espera de ser propagados a la nube de Firebase.`,
      recommendation: isOnline ? 'Haga clic en "Sincronizar Cola Ahora" para consolidar los cambios.' : 'Se sincronizarán al reconectar.'
    });
  }

  if (offlineCreatedInvoices > 0) {
    clientAlerts.push({
      id: 'alert-offline-invoices',
      level: 'info',
      title: `${offlineCreatedInvoices} Comprobantes Emitidos Fuera de Línea`,
      message: `Hay facturas con numeración protegida guardadas localmente listas para conciliación.`,
      recommendation: 'Conserve la pestaña abierta hasta completar la sincronización.'
    });
  }

  if (isStoragePersisted === false) {
    clientAlerts.push({
      id: 'alert-storage-persistence',
      level: 'warning',
      title: 'Persistencia de Almacenamiento Local No Blindada',
      message: 'El navegador podría purgar la caché local si el dispositivo sufre falta de espacio en disco.',
      recommendation: 'Active la persistencia permanente con un clic para garantizar que IndexedDB nunca sea depurado.'
    });
  }

  const allAlerts = [...clientAlerts, ...(healthData?.alerts || [])];

  const formatTimeAgo = (isoString: string | null) => {
    if (!isoString) return 'Nunca ejecutado';
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 2) return 'Hace un momento';
      if (diffMins < 60) return `Hace ${diffMins} minutos`;
      if (diffHours < 24) return `Hace ${diffHours} horas`;
      return `Hace ${diffDays} días (${date.toLocaleDateString('es-ES')})`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden space-y-6 p-5 sm:p-6">
      
      {/* 1. Header with Overall Status & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${
            healthData?.status === 'critical'
              ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/20'
              : healthData?.status === 'warning'
              ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20'
              : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20'
          }`}>
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                6. Sistema y Respaldos (Infrastructure Health)
              </h3>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                healthData?.status === 'critical'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : healthData?.status === 'warning'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {healthData?.status === 'critical' ? 'Atención Crítica' : healthData?.status === 'warning' ? 'Advertencias Activas' : 'Sistema Saludable'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Monitoreo en tiempo real del motor de respaldos, almacenamiento en disco y sincronización offline PWA.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            title="Refrescar estado"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
            <span>Actualizar</span>
          </button>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('global-save')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <span>Gestión de Respaldos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Three Pillar KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* PILLAR 1: ESTADO DE BACKUPS */}
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Estado de Backups
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Base de Datos & Archivos
                  </span>
                </div>
              </div>

              <span className={`w-2.5 h-2.5 rounded-full ${
                healthData?.backups?.db?.status === 'healthy' ? 'bg-emerald-500 animate-pulse' :
                healthData?.backups?.db?.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
              }`} />
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              {/* Database item */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-sky-600" />
                    <span>Base de Datos (/db/)</span>
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                    healthData?.backups?.db?.status === 'healthy' ? 'bg-emerald-50 text-emerald-700' :
                    healthData?.backups?.db?.status === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {healthData?.backups?.db?.status === 'healthy' ? 'Al día' : 'Pendiente'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Última ejecución:</span>
                  <strong className="text-slate-800">{formatTimeAgo(healthData?.backups?.db?.lastExecution || null)}</strong>
                </div>
                {healthData?.backups?.db?.lastFileName && (
                  <div className="text-[10px] font-mono text-slate-400 truncate" title={healthData.backups.db.lastFileName}>
                    {healthData.backups.db.lastFileName} ({healthData.backups.db.sizeFormatted})
                  </div>
                )}
              </div>

              {/* Documents item */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Documentos (/documents/)</span>
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-sky-50 text-sky-700">
                    {healthData?.backups?.documents?.totalFiles || 0} archivos
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Último snapshot:</span>
                  <strong className="text-slate-800">{formatTimeAgo(healthData?.backups?.documents?.lastExecution || null)}</strong>
                </div>
              </div>

              {/* Exports item */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                    <span>Reportes Fiscales (/exports/)</span>
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
                    {healthData?.backups?.exports?.totalFiles || 0} reportes
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Última exportación:</span>
                  <strong className="text-slate-800">{formatTimeAgo(healthData?.backups?.exports?.lastExecution || null)}</strong>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleTriggerQuickBackup}
            disabled={isBackingUp}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-spin' : 'text-sky-400'}`} />
            <span>{isBackingUp ? 'Generando Snapshot...' : 'Ejecutar Respaldo Inmediato (.sql.gz)'}</span>
          </button>
        </div>

        {/* PILLAR 2: ESPACIO EN DISCO */}
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Espacio en Disco
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Almacenamiento en Servidor
                  </span>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                healthData?.disk?.healthStatus === 'optimal' ? 'bg-emerald-100 text-emerald-800' :
                healthData?.disk?.healthStatus === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {healthData?.disk?.systemUsedPercent || 16}% Ocupado
              </span>
            </div>

            {/* Storage Progress Bar */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Capacidad del Servidor</span>
                <span className="font-mono">{healthData?.disk?.systemUsedFormatted} / {healthData?.disk?.systemTotalFormatted}</span>
              </div>
              <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                <div 
                  className={`h-full transition-all duration-500 ${
                    (healthData?.disk?.systemUsedPercent || 16) >= 90 ? 'bg-rose-500' :
                    (healthData?.disk?.systemUsedPercent || 16) >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, healthData?.disk?.systemUsedPercent || 16)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Disponible: <strong className="text-slate-800 font-mono">{healthData?.disk?.systemFreeFormatted}</strong></span>
                <span>Retención: <strong className="text-slate-800 font-mono">{healthData?.disk?.retentionDays || 30} días</strong></span>
              </div>
            </div>

            {/* Subfolder Breakdown */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <span className="font-medium text-slate-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span>/db/ (SQL & JSON)</span>
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {healthData?.disk?.breakdown?.db?.formatted || '0 B'}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <span className="font-medium text-slate-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>/documents/ (PDFs)</span>
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {healthData?.disk?.breakdown?.documents?.formatted || '0 B'}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <span className="font-medium text-slate-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>/exports/ (Reportes)</span>
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {healthData?.disk?.breakdown?.exports?.formatted || '0 B'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white/90 p-2 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-500 truncate" title={healthData?.disk?.storagePath}>
            BACKUP_STORAGE_PATH: <span className="text-slate-800 font-bold">{healthData?.disk?.storagePath || '/var/www/imperiopro/storage/backups'}</span>
          </div>
        </div>

        {/* PILLAR 3: ALERTAS DE INTEGRIDAD & SINCRONIZACIÓN OFFLINE (PWA) */}
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Alertas de Integridad
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Sincronización Offline PWA
                  </span>
                </div>
              </div>

              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 animate-pulse'
              }`}>
                {isOnline ? 'Online' : 'Modo Offline'}
              </span>
            </div>

            {/* Offline PWA Telemetry */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Cola de Sincronización Local:</span>
                  <span className={`font-mono font-black px-2 py-0.5 rounded-md ${
                    pendingSyncQueueItems > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {pendingSyncQueueItems} pendientes
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Facturas Offline:</span>
                  <strong className="text-slate-800">{offlineCreatedInvoices} documentos</strong>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Base Local (IndexedDB):</span>
                  <strong className="text-slate-800">{invoicesCount} facturas / {productsCount} prods</strong>
                </div>
              </div>

              {/* Persistence Guarantee */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${isStoragePersisted ? 'text-emerald-600' : 'text-amber-500'}`} />
                  <div>
                    <div className="font-bold text-slate-800 text-[11px]">Persistencia PWA:</div>
                    <div className="text-[10px] text-slate-500">
                      {isStoragePersisted ? 'Blindada contra purga' : 'Estándar de navegador'}
                    </div>
                  </div>
                </div>

                {!isStoragePersisted && (
                  <button
                    onClick={handleRequestStoragePersistence}
                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    Blindar
                  </button>
                )}
                {isStoragePersisted && (
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Protegido
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {syncFeedback && (
              <div className="p-2 bg-sky-50 text-sky-800 rounded-xl text-[11px] font-semibold border border-sky-200">
                {syncFeedback}
              </div>
            )}

            <button
              onClick={handleSyncOfflineQueue}
              disabled={isSyncingOffline || pendingSyncQueueItems === 0}
              className="w-full inline-flex items-center justify-center gap-2 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingOffline ? 'animate-spin' : ''}`} />
              <span>{isSyncingOffline ? 'Sincronizando con la nube...' : 'Sincronizar Cola Offline Ahora'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* 3. Detailed Integrity Alerts Stream (Critical / Warning / Recommendations) */}
      <div className="pt-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Alertas de Integridad y Diagnóstico del Sistema ({allAlerts.length})</span>
        </h4>

        {allAlerts.length === 0 ? (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-emerald-800 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <strong className="font-bold">Todos los sistemas de infraestructura operan con integridad óptima.</strong>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Respaldos de base de datos vigentes, volumen de almacenamiento con capacidad suficiente y sincronización PWA en tiempo real.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {allAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                  alert.level === 'error'
                    ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                    : alert.level === 'warning'
                    ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                    : 'bg-sky-50/90 border-sky-200 text-sky-900'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {alert.level === 'error' ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : alert.level === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h5 className="font-bold">{alert.title}</h5>
                    <p className="text-[11px] mt-0.5 opacity-90">{alert.message}</p>
                    <p className="text-[10px] font-semibold mt-1 flex items-center gap-1 opacity-80">
                      <span>Acción sugerida:</span>
                      <strong>{alert.recommendation}</strong>
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                  {alert.id.includes('db') && (
                    <button
                      onClick={handleTriggerQuickBackup}
                      disabled={isBackingUp}
                      className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold rounded-lg text-[11px] shadow-2xs transition-colors cursor-pointer"
                    >
                      Respaldar DB
                    </button>
                  )}
                  {alert.id.includes('sync') && (
                    <button
                      onClick={handleSyncOfflineQueue}
                      disabled={isSyncingOffline}
                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-[11px] shadow-2xs transition-colors cursor-pointer"
                    >
                      Sincronizar
                    </button>
                  )}
                  {alert.id.includes('persistence') && (
                    <button
                      onClick={handleRequestStoragePersistence}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shadow-2xs transition-colors cursor-pointer"
                    >
                      Blindar Caché
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
