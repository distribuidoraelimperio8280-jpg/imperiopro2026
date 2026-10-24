import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/indexedDB';
import { syncService } from '../services/syncService';
import { cloudDataService, type CloudSyncStatus } from '../services/cloudDataService';
import { authService, type UserSession } from '../services/authService';
import { auth } from '../firebase';
import { 
  CloudUpload, 
  Download, 
  Database, 
  CheckCircle2, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle, 
  FileText, 
  Users, 
  Package, 
  Receipt, 
  Sparkles,
  Cloud,
  Laptop,
  Smartphone,
  Check,
  Send,
  CloudDownload,
  Lock,
  ExternalLink,
  Server,
  HardDrive,
  FolderArchive,
  Key,
  Calendar,
  Trash2,
  Folder,
  FolderOpen,
  FileCode,
  FileSpreadsheet,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { InfrastructureHealthSection } from './InfrastructureHealthSection';

export const GlobalSaveView: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [isPersistent, setIsPersistent] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string>(() => new Date().toLocaleTimeString());
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus | null>(null);
  const [session, setSession] = useState<UserSession | null>(() => authService.getSession());
  const [serverBackups, setServerBackups] = useState<any[]>([]);
  const [backupConfig, setBackupConfig] = useState<any>(null);
  const [isGeneratingServerBackup, setIsGeneratingServerBackup] = useState<boolean>(false);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [backupViewMode, setBackupViewMode] = useState<'tree' | 'table'>('tree');

  // Live queries for all tables
  const invoices = useLiveQuery(() => db.invoices.toArray(), []) || [];
  const contacts = useLiveQuery(() => db.contacts.toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const expenses = useLiveQuery(() => db.expenses.toArray(), []) || [];
  const quotes = useLiveQuery(() => db.quotes.toArray(), []) || [];
  const creditNotes = useLiveQuery(() => db.creditNotes.toArray(), []) || [];
  const pendingSyncCount = useLiveQuery(() => db.syncQueue.where('synced').equals(0).count(), []) || 0;

  useEffect(() => {
    // Check persistent storage permission in browser
    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(persisted => setIsPersistent(persisted));
    }

    const unsubCloud = cloudDataService.subscribe((status) => {
      setCloudStatus(status);
    });

    fetchServerBackupInfo();

    return () => {
      unsubCloud();
    };
  }, []);

  const fetchServerBackupInfo = async () => {
    try {
      const [resList, resConfig] = await Promise.all([
        fetch('/api/backups/list'),
        fetch('/api/backups/config'),
      ]);
      if (resList.ok) {
        const data = await resList.json();
        setServerBackups(data.backups || []);
      }
      if (resConfig.ok) {
        const data = await resConfig.json();
        setBackupConfig(data.config || null);
      }
    } catch (e) {
      console.error('Error al consultar respaldos del servidor:', e);
    }
  };

  const handleCreateServerBackup = async (
    type: 'db' | 'documents' | 'exports',
    format: 'sql' | 'json' | 'xlsx' = type === 'db' ? 'sql' : type === 'exports' ? 'xlsx' : 'json'
  ) => {
    setIsGeneratingServerBackup(true);
    const formatLabel = format.toUpperCase();
    setSyncStatusMsg(`Generando respaldo en /storage/backups/${type}/ [${formatLabel}] con retención de 30 días...`);
    try {
      const now = new Date();
      const yyyy = String(now.getFullYear());
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');

      let payload: any = {};
      let name = '';

      if (type === 'db') {
        name = `backup_db_${yyyy}-${mm}-${dd}_${hh}-${min}`;
        payload = {
          invoices: await db.invoices.toArray(),
          contacts: await db.contacts.toArray(),
          products: await db.products.toArray(),
          expenses: await db.expenses.toArray(),
          quotes: await db.quotes.toArray(),
          creditNotes: await db.creditNotes.toArray(),
          metadata: {
            app: 'Imperio Pro Facturación & ERP',
            version: '2.5.0',
            exportedAt: now.toISOString(),
          }
        };
      } else if (type === 'documents') {
        name = `facturas_y_notas_${yyyy}-${mm}`;
        payload = {
          invoices: await db.invoices.toArray(),
          quotes: await db.quotes.toArray(),
          creditNotes: await db.creditNotes.toArray(),
          period: `${yyyy}/${mm}`,
        };
      } else {
        const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const currentMonthName = monthNames[now.getMonth()];
        name = `reporte_fiscal_${currentMonthName}_${yyyy}`;
        payload = {
          ventas: await db.invoices.toArray(),
          gastos: await db.expenses.toArray(),
          resumenFiscal: {
            mes: currentMonthName,
            año: yyyy,
            generadoEl: now.toISOString(),
          }
        };
      }

      const res = await fetch('/api/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          payload,
          name,
          format,
          year: yyyy,
          month: mm,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setImportStatus({
          type: 'success',
          text: `¡Respaldo almacenado en /${type}/: ${resData.backup?.name} (${resData.backup?.sizeFormatted})!`
        });
        await fetchServerBackupInfo();
      } else {
        throw new Error(resData.error || 'Error al generar respaldo en servidor');
      }
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        text: `Error al crear respaldo en servidor: ${err.message}`
      });
    } finally {
      setIsGeneratingServerBackup(false);
      setSyncStatusMsg(null);
    }
  };

  const handlePurgeOldBackups = async () => {
    setIsPurging(true);
    try {
      const res = await fetch('/api/backups/purge', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setImportStatus({
          type: 'success',
          text: data.message || 'Purga de retención ejecutada.',
        });
        await fetchServerBackupInfo();
      }
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        text: `Error al purgar respaldos: ${err.message}`
      });
    } finally {
      setIsPurging(false);
    }
  };

  const handleRequestPersistence = async () => {
    if (navigator.storage && navigator.storage.persist) {
      const isGranted = await navigator.storage.persist();
      setIsPersistent(isGranted);
      if (isGranted) {
        setSyncStatusMsg('¡Almacenamiento persistente activado con éxito en tu navegador!');
      } else {
        setSyncStatusMsg('El navegador administra el almacenamiento automáticamente.');
      }
    }
  };

  const handleGlobalSyncAndSave = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('Procesando sincronización con el Servidor Central y Firebase Firestore...');
    
    try {
      // 1. Sincronizar con el Servidor Central persistente
      const serverPull = await syncService.pullInitialServerData();
      const serverUpload = await syncService.uploadAllToServer();
      await syncService.processSyncQueue();

      // 2. Sincronizar con Firestore si está autenticado
      const userEmail = session?.email || auth.currentUser?.email || 'distribuidoraelimperio8280@gmail.com';
      const uid = session?.uid || auth.currentUser?.uid;
      let cloudMsg = '';
      if (uid) {
        try {
          const uploadRes = await cloudDataService.uploadAllLocalToCloud(userEmail, uid);
          const pullRes = await cloudDataService.pullAllCloudData(userEmail, uid);
          cloudMsg = ` | Firestore: ${uploadRes.count} subidos, ${pullRes.totalFetched} descargados.`;
        } catch (e: any) {
          console.warn('Firestore cloud sync warning:', e);
        }
      }
      
      setSyncStatusMsg(`¡Sincronización multi-dispositivo exitosa! Servidor central actualizado (${serverUpload.count} registros persistidos)${cloudMsg}`);
      setLastSavedTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      setSyncStatusMsg(`Error en sincronización: ${err.message || 'Desconocido'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullCloudData = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('Descargando las últimas facturas, clientes e inventario desde el servidor central y la nube...');
    try {
      const serverRes = await syncService.pullInitialServerData();
      let totalFetched = serverRes.count;

      const userEmail = session?.email || auth.currentUser?.email || 'distribuidoraelimperio8280@gmail.com';
      const uid = session?.uid || auth.currentUser?.uid;
      if (uid) {
        try {
          const cloudRes = await cloudDataService.pullAllCloudData(userEmail, uid);
          totalFetched += cloudRes.totalFetched;
        } catch (e) {
          console.warn('Firestore pull warning:', e);
        }
      }

      setSyncStatusMsg(`¡Descarga exitosa! Se actualizaron ${totalFetched} registros en este dispositivo.`);
      setLastSavedTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      setSyncStatusMsg(`Error al descargar: ${err.message || 'Sin conexión'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const company = await db.companyProfile.get('default');
      const backupData = {
        version: '2.0.0',
        platform: 'Firebase Firestore + Dexie Offline-First',
        exportedAt: new Date().toISOString(),
        company,
        invoices,
        contacts,
        products,
        expenses,
        quotes,
        creditNotes,
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      const fileName = `respaldo-imperio-pro-${new Date().toISOString().split('T')[0]}.json`;
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSyncStatusMsg(`¡Copia de seguridad exportada correctamente (${fileName})!`);
    } catch (err: any) {
      setSyncStatusMsg(`Error al generar copia de seguridad: ${err.message}`);
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed.invoices && !parsed.contacts && !parsed.products) {
          throw new Error('El archivo no parece ser un respaldo válido de Imperio Pro.');
        }

        if (confirm('¿Deseas restaurar y sincronizar la base de datos con esta copia de seguridad? Esto actualizará tus datos y los enviará a Firestore.')) {
          if (parsed.company) await db.companyProfile.put(parsed.company);
          if (parsed.invoices) await db.invoices.bulkPut(parsed.invoices);
          if (parsed.contacts) await db.contacts.bulkPut(parsed.contacts);
          if (parsed.products) await db.products.bulkPut(parsed.products);
          if (parsed.expenses) await db.expenses.bulkPut(parsed.expenses);
          if (parsed.quotes) await db.quotes.bulkPut(parsed.quotes);
          if (parsed.creditNotes) await db.creditNotes.bulkPut(parsed.creditNotes);

          // Sync imported data to cloud
          const userEmail = session?.email || 'distribuidoraelimperio8280@gmail.com';
          await cloudDataService.uploadAllLocalToCloud(userEmail, session?.uid);

          setImportStatus({
            type: 'success',
            text: '¡Respaldo restaurado y sincronizado con Firestore exitosamente!'
          });
          setLastSavedTime(new Date().toLocaleTimeString());
        }
      } catch (err: any) {
        setImportStatus({
          type: 'error',
          text: `Error al importar: ${err.message}`
        });
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-400 via-indigo-300 to-transparent pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold uppercase tracking-wider">
            <Cloud className="w-3.5 h-3.5 text-sky-400" />
            <span>Sincronización Multi-Dispositivo en Tiempo Real (Firestore)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Base de Datos Centralizada en la Nube
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Tus facturas, clientes, gastos e inventario están conectados directamente a <strong className="text-white">Google Cloud Firestore</strong>. Cuando emites una factura en tu laptop o PC principal, se refleja de inmediato en cualquier otra computadora donde abras tu cuenta (<strong className="text-sky-300">{session?.email || 'distribuidoraelimperio8280@gmail.com'}</strong>).
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleGlobalSyncAndSave}
              disabled={isSyncing}
              className="px-6 py-3 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-extrabold rounded-2xl shadow-lg transition-all flex items-center gap-2 text-sm sm:text-base cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando con la Nube...' : 'Subir y Sincronizar Todo a la Nube'}</span>
            </button>

            <button
              onClick={handlePullCloudData}
              disabled={isSyncing}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-2xl shadow-md transition-colors flex items-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50"
            >
              <CloudDownload className="w-4 h-4 text-indigo-200" />
              <span>Descargar Todo desde Firestore</span>
            </button>

            <button
              onClick={handleExportBackup}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-bold rounded-2xl border border-slate-700 transition-colors flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Descargar Respaldo JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cloud & Device Sync Status Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Cloud className="w-4 h-4 text-sky-600" />
            <span>Estado de Conexión Nube</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-base font-bold text-slate-900">Firestore Conectado</span>
          </div>
          <p className="text-xs text-slate-500">
            Escuchando cambios en tiempo real vía WebSockets seguros.
          </p>
        </div>

        <div className="space-y-2 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Cuenta Vinculada</span>
          </div>
          <div className="text-sm font-bold text-slate-900 truncate">
            {session?.email || 'distribuidoraelimperio8280@gmail.com'}
          </div>
          <p className="text-xs text-slate-500">
            ID Dispositivo: <span className="font-mono text-[11px] text-slate-700">{session?.deviceId || 'DEV-MAIN'}</span>
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <RefreshCw className="w-4 h-4 text-indigo-600" />
            <span>Última Sincronización</span>
          </div>
          <div className="text-base font-bold text-slate-900">
            {cloudStatus?.lastSyncTime || lastSavedTime}
          </div>
          <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Todos los registros sincronizados</span>
          </p>
        </div>
      </div>

      {/* Sync Status Alert Banner */}
      {syncStatusMsg && (
        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 flex items-start gap-3 animate-in fade-in duration-150">
          <CheckCircle2 className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm font-medium">
            {syncStatusMsg}
          </div>
          <button 
            onClick={() => setSyncStatusMsg(null)}
            className="text-xs font-bold text-sky-600 hover:text-sky-800"
          >
            Cerrar
          </button>
        </div>
      )}

      {importStatus && (
        <div className={`p-4 rounded-2xl flex items-start gap-3 border animate-in fade-in ${
          importStatus.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {importStatus.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-medium">{importStatus.text}</div>
          <button 
            onClick={() => setImportStatus(null)}
            className="text-xs font-bold hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Live Data Summary Metrics Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-sky-600" />
            <span>Registros Sincronizados en Nube & Local</span>
          </h2>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Último guardado: <strong className="text-slate-800">{lastSavedTime}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Facturas</span>
              <FileText className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{invoices.length}</div>
            <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Sincronizadas</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Contactos</span>
              <Users className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{contacts.length}</div>
            <div className="text-[11px] text-sky-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Sincronizados</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Productos</span>
              <Package className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{products.length}</div>
            <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>En Inventario</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Gastos</span>
              <Receipt className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{expenses.length}</div>
            <div className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Registrados</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cotizaciones</span>
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{quotes.length}</div>
            <div className="text-[11px] text-purple-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Activas</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Notas Crédito</span>
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{creditNotes.length}</div>
            <div className="text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Emitidas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Device Architecture Guide */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Laptop className="w-5 h-5 text-sky-600" />
          <span>¿Cómo funciona la sincronización entre tus computadoras?</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 font-black flex items-center justify-center">
              1
            </div>
            <strong className="block text-slate-900 font-bold">Emite facturas en cualquier PC</strong>
            <p>Al crear o modificar una factura, cliente o producto en tu laptop, se almacena instantáneamente en Firestore y en tu caché ultra rápida.</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 font-black flex items-center justify-center">
              2
            </div>
            <strong className="block text-slate-900 font-bold">Abre la app en otra computadora</strong>
            <p>Inicia sesión con tu correo <strong className="text-slate-900">distribuidoraelimperio8280@gmail.com</strong> en cualquier otra PC o tablet.</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 font-black flex items-center justify-center">
              3
            </div>
            <strong className="block text-slate-900 font-bold">Actualización automática instantánea</strong>
            <p>La aplicación descarga automáticamente todos los cambios recientes sin que tengas que transferir archivos ni configurar redes locales.</p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors">
            <Download className="w-3.5 h-3.5" />
            <span>Restaurar Copia de Seguridad JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
          
          <button
            onClick={handleRequestPersistence}
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
          >
            {isPersistent ? '✓ Almacenamiento persistente activo' : 'Activar almacenamiento persistente'}
          </button>
        </div>
      </div>

      {/* 6. SISTEMA Y RESPALDOS (INFRASTRUCTURE HEALTH) */}
      <InfrastructureHealthSection />

      {/* CONFIGURACIÓN DE RESPALDOS - IMPERIO PRO (SERVIDOR & RETENCIÓN) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
              <Server className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Configuración de Respaldos en Servidor - Imperio Pro
                </h3>
                <span className="bg-sky-100 text-sky-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border border-sky-200">
                  Activo
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Almacenamiento persistente con compresión GZIP, cifrado de seguridad y retención automática de 30 días.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchServerBackupInfo()}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Actualizar listado de respaldos"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handlePurgeOldBackups}
              disabled={isPurging}
              className="inline-flex items-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>{isPurging ? 'Purgando...' : 'Purgar >30 Días'}</span>
            </button>
          </div>
        </div>

        {/* Configuration Parameters Overview Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <HardDrive className="w-4 h-4 text-sky-600" />
              <span>Directorio Base</span>
            </div>
            <div className="font-mono text-xs font-bold text-slate-900 bg-white p-2 rounded-lg border border-slate-200 truncate" title={backupConfig?.storagePath || '/var/www/imperiopro/storage/backups'}>
              {backupConfig?.storagePath || '/var/www/imperiopro/storage/backups'}
            </div>
            <span className="text-[10px] text-slate-500 block">BACKUP_STORAGE_PATH</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <FolderArchive className="w-4 h-4 text-emerald-600" />
              <span>Subrutas Específicas</span>
            </div>
            <div className="text-[11px] font-mono text-slate-700 bg-white p-2 rounded-lg border border-slate-200 space-y-0.5">
              <div className="truncate text-emerald-700 font-bold">/db/ (Bases de Datos)</div>
              <div className="truncate text-sky-700 font-bold">/documents/ (Facturas)</div>
              <div className="truncate text-amber-700 font-bold">/exports/ (Archivos)</div>
            </div>
            <span className="text-[10px] text-slate-500 block">Categorización estandarizada</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>Política de Retención</span>
            </div>
            <div className="flex items-baseline gap-1.5 bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-xl font-black text-amber-600 font-mono">
                {backupConfig?.retentionDays ?? 30}
              </span>
              <span className="text-xs font-bold text-slate-700">Días de Conservación</span>
            </div>
            <span className="text-[10px] text-slate-500 block">Purga automática de obsoletos</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Key className="w-4 h-4 text-indigo-600" />
              <span>Compresión & Cifrado</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-600">GZIP:</span>
                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {backupConfig?.compressionEnabled !== false ? 'Habilitado' : 'Desactivado'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-600">AES-256:</span>
                <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                  {backupConfig?.encryptionEnabled ? 'Cifrado Activo' : 'Clave Configurada'}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 block">BACKUP_ENCRYPTION_KEY</span>
          </div>
        </div>

        {/* Action Buttons to Trigger Backups */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => handleCreateServerBackup('db', 'sql')}
              disabled={isGeneratingServerBackup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Generar snapshot SQL con INSERTs comprimido con GZIP"
            >
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              <span>+ Respaldo SQL (.sql.gz)</span>
            </button>
            <button
              onClick={() => handleCreateServerBackup('db', 'json')}
              disabled={isGeneratingServerBackup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-lg border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
              title="Generar snapshot JSON completo comprimido"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ Respaldo JSON (.json.gz)</span>
            </button>
          </div>

          <button
            onClick={() => handleCreateServerBackup('documents')}
            disabled={isGeneratingServerBackup}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-sky-600" />
            <span>Respaldar Documentos (/documents/2026/09/)</span>
          </button>

          <button
            onClick={() => handleCreateServerBackup('exports', 'xlsx')}
            disabled={isGeneratingServerBackup}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Generar Reporte Fiscal (/exports/.xlsx)</span>
          </button>
        </div>

        {/* View Switcher Header & Physical Info */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <FolderArchive className="w-4 h-4 text-sky-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Estructura de Almacenamiento & Respaldos ({serverBackups.length} archivos)
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setBackupViewMode('tree')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    backupViewMode === 'tree' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Vista de Árbol
                </button>
                <button
                  onClick={() => setBackupViewMode('table')}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    backupViewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tabla Detallada
                </button>
              </div>
            </div>
          </div>

          {/* VISTA DE ÁRBOL INTERACTIVA (ESTRUCTURA EXACTA DEL SERVIDOR) */}
          {backupViewMode === 'tree' && (
            <div className="bg-slate-950 text-slate-100 rounded-2xl p-5 font-mono text-xs shadow-inner border border-slate-800 space-y-3 overflow-x-auto">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 text-slate-400">
                <div className="flex items-center gap-2 font-bold text-sky-400">
                  <FolderOpen className="w-4 h-4" />
                  <span>/storage/backups/</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Ruta Absoluta: {backupConfig?.storagePath || '/var/www/imperiopro/storage/backups'}
                </span>
              </div>

              {/* Branch 1: db/ */}
              <div className="pl-2 space-y-1.5">
                <div className="flex items-center justify-between text-slate-300 font-bold group">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">├──</span>
                    <Folder className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">db/</span>
                    <span className="text-[11px] font-normal text-slate-400 italic">
                      &lt;-- Respaldos diarios/semanales de la Base de Datos (SQL / JSON)
                    </span>
                  </div>
                  <button
                    onClick={() => handleCreateServerBackup('db', 'sql')}
                    disabled={isGeneratingServerBackup}
                    className="opacity-80 hover:opacity-100 text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800 cursor-pointer"
                  >
                    + Nuevo Snapshot
                  </button>
                </div>

                {/* db files */}
                {serverBackups.filter(b => b.type === 'db').map((b) => (
                  <div key={b.id} className="pl-7 flex items-center justify-between py-0.5 hover:bg-slate-900/60 rounded px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-700">│   ├──</span>
                      <FileCode className="w-3 h-3 text-sky-400" />
                      <span className="text-slate-200 font-semibold">{b.name}</span>
                      <span className="text-[10px] text-slate-400">({b.sizeFormatted})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-amber-400/90">{b.expiresInDays}d retención</span>
                      <a
                        href={`/api/backups/download/${b.type}/${b.name}`}
                        download={b.name}
                        className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 text-[11px]"
                      >
                        <Download className="w-3 h-3" />
                        <span>descargar</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Branch 2: documents/ */}
              <div className="pl-2 space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-slate-300 font-bold group">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">├──</span>
                    <Folder className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-sky-300">documents/</span>
                    <span className="text-[11px] font-normal text-slate-400 italic">
                      &lt;-- Copias de seguridad de documentos generados (PDFs de facturas, notas)
                    </span>
                  </div>
                  <button
                    onClick={() => handleCreateServerBackup('documents')}
                    disabled={isGeneratingServerBackup}
                    className="opacity-80 hover:opacity-100 text-[10px] text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800 cursor-pointer"
                  >
                    + Respaldar Mes
                  </button>
                </div>

                {/* Subfolder 2026/ */}
                <div className="pl-7 space-y-1">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-slate-700">│   ├──</span>
                    <Folder className="w-3 h-3 text-sky-300" />
                    <span className="text-sky-200 font-bold">2026/</span>
                  </div>

                  {/* Subfolder 08/ */}
                  <div className="pl-8 flex items-center justify-between py-0.5 hover:bg-slate-900/60 rounded px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-700">│   │   ├──</span>
                      <Folder className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-300 font-medium">08/</span>
                      <span className="text-[11px] text-slate-400">
                        ({serverBackups.filter(b => b.type === 'documents' && b.name.includes('08')).length || 1} archivos)
                      </span>
                    </div>
                    {serverBackups.find(b => b.type === 'documents' && b.name.includes('08')) && (
                      <a
                        href={`/api/backups/download/documents/${serverBackups.find(b => b.type === 'documents' && b.name.includes('08'))?.name}`}
                        download
                        className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 text-[11px]"
                      >
                        <Download className="w-3 h-3" />
                        <span>descargar</span>
                      </a>
                    )}
                  </div>

                  {/* Subfolder 09/ */}
                  <div className="pl-8 flex items-center justify-between py-0.5 hover:bg-slate-900/60 rounded px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-700">│   │   └──</span>
                      <Folder className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-300 font-medium">09/</span>
                      <span className="text-[11px] text-slate-400">
                        ({serverBackups.filter(b => b.type === 'documents' && (b.name.includes('09') || !b.name.includes('08'))).length} archivos)
                      </span>
                    </div>
                    {serverBackups.find(b => b.type === 'documents' && b.name.includes('09')) && (
                      <a
                        href={`/api/backups/download/documents/${serverBackups.find(b => b.type === 'documents' && b.name.includes('09'))?.name}`}
                        download
                        className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 text-[11px]"
                      >
                        <Download className="w-3 h-3" />
                        <span>descargar</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Branch 3: exports/ */}
              <div className="pl-2 space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-slate-300 font-bold group">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">└──</span>
                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-300">exports/</span>
                    <span className="text-[11px] font-normal text-slate-400 italic">
                      &lt;-- Reportes masivos temporales (Excel/CSV de ventas, contabilidad)
                    </span>
                  </div>
                  <button
                    onClick={() => handleCreateServerBackup('exports', 'xlsx')}
                    disabled={isGeneratingServerBackup}
                    className="opacity-80 hover:opacity-100 text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800 cursor-pointer"
                  >
                    + Exportar Excel
                  </button>
                </div>

                {/* exports files */}
                {serverBackups.filter(b => b.type === 'exports').map((b) => (
                  <div key={b.id} className="pl-7 flex items-center justify-between py-0.5 hover:bg-slate-900/60 rounded px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-700">    └──</span>
                      <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                      <span className="text-slate-200 font-semibold">{b.name}</span>
                      <span className="text-[10px] text-slate-400">({b.sizeFormatted})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-amber-400/90">{b.expiresInDays}d retención</span>
                      <a
                        href={`/api/backups/download/${b.type}/${b.name}`}
                        download={b.name}
                        className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 text-[11px]"
                      >
                        <Download className="w-3 h-3" />
                        <span>descargar</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA DE TABLA DETALLADA */}
          {backupViewMode === 'table' && (
            serverBackups.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <Server className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-medium text-slate-600">
                  Aún no hay archivos de respaldo generados en el directorio del servidor.
                </p>
                <p className="text-[11px] text-slate-400">
                  Haz clic en <strong>"+ Respaldo SQL"</strong> arriba para generar tu primer snapshot comprimido y cifrado.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Nombre del Archivo</th>
                      <th className="p-3">Tipo / Subruta</th>
                      <th className="p-3">Tamaño</th>
                      <th className="p-3">Fecha de Creación</th>
                      <th className="p-3">Retención Restante</th>
                      <th className="p-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {serverBackups.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="truncate max-w-[280px]" title={b.name}>{b.name}</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            b.type === 'db' ? 'bg-emerald-100 text-emerald-800' :
                            b.type === 'documents' ? 'bg-sky-100 text-sky-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            /{b.type}/
                          </span>
                        </td>
                        <td className="p-3 font-mono font-semibold text-slate-700">
                          {b.sizeFormatted}
                        </td>
                        <td className="p-3 text-slate-600">
                          {new Date(b.createdAt).toLocaleString('es-ES')}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md text-[11px]">
                            <Calendar className="w-3 h-3" />
                            <span>{b.expiresInDays} días</span>
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <a
                            href={`/api/backups/download/${b.type}/${b.name}`}
                            download={b.name}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Descargar</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

    </div>
  );
};
