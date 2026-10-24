import { db } from '../db/indexedDB';
import type { SyncQueueItem } from '../types';
import { cloudDataService, cleanForFirestore } from './cloudDataService';
import { authService } from './authService';
import { auth } from '../firebase';

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  type: 'server_pull' | 'server_push' | 'cloud_firestore' | 'queue_process' | 'auto_sync' | 'upload_all';
  status: 'success' | 'warning' | 'error';
  itemCount: number;
  details: string;
}

const SYNC_LOGS_KEY = 'imperio_sync_service_logs';
const SYNC_INTERVAL_KEY = 'imperio_sync_auto_interval';

class SyncService {
  private isOnline: boolean = navigator.onLine;
  private listeners: ((online: boolean) => void)[] = [];
  private syncListeners: ((syncing: boolean, pendingCount: number) => void)[] = [];
  private logListeners: ((logs: SyncLogEntry[]) => void)[] = [];
  private isSyncing: boolean = false;
  private lastSyncTimestamp: string | null = null;
  private autoSyncTimer: any = null;
  private logs: SyncLogEntry[] = this.loadLogs();
  private autoIntervalSeconds: number = parseInt(localStorage.getItem(SYNC_INTERVAL_KEY) || '6', 10);

  constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.pullInitialServerData().catch(console.warn);
      const session = authService.getSession();
      if (session) {
        cloudDataService.startRealtimeSync(session.email, session.uid);
        this.processSyncQueue();
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });

    // Iniciar sondeo automático configurable
    this.startAutoSync(this.autoIntervalSeconds);
  }

  private loadLogs(): SyncLogEntry[] {
    try {
      const raw = localStorage.getItem(SYNC_LOGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public getLogs(): SyncLogEntry[] {
    return [...this.logs];
  }

  public addLog(entry: Omit<SyncLogEntry, 'id'>) {
    const newEntry: SyncLogEntry = {
      ...entry,
      id: `sync-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    this.logs.unshift(newEntry);
    if (this.logs.length > 80) {
      this.logs = this.logs.slice(0, 80);
    }
    try {
      localStorage.setItem(SYNC_LOGS_KEY, JSON.stringify(this.logs));
    } catch (e) {
      console.warn('Could not save sync logs to localStorage:', e);
    }
    this.logListeners.forEach(cb => cb(this.logs));
  }

  public clearLogs() {
    this.logs = [];
    localStorage.removeItem(SYNC_LOGS_KEY);
    this.logListeners.forEach(cb => cb([]));
  }

  public subscribeLogs(callback: (logs: SyncLogEntry[]) => void) {
    this.logListeners.push(callback);
    callback(this.logs);
    return () => {
      this.logListeners = this.logListeners.filter(cb => cb !== callback);
    };
  }

  public getAutoSyncInterval(): number {
    return this.autoIntervalSeconds;
  }

  public setAutoSyncInterval(seconds: number) {
    this.autoIntervalSeconds = seconds;
    localStorage.setItem(SYNC_INTERVAL_KEY, seconds.toString());
    this.startAutoSync(seconds);
    this.addLog({
      timestamp: new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'auto_sync',
      status: 'success',
      itemCount: 0,
      details: seconds > 0 
        ? `Intervalo automático reprogramado a cada ${seconds} segundos.` 
        : 'Sincronización automática periódica desactivada (modo manual).',
    });
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public getLastSyncTime(): string | null {
    return this.lastSyncTimestamp;
  }

  public subscribeOnlineStatus(callback: (online: boolean) => void) {
    this.listeners.push(callback);
    callback(this.isOnline);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  public subscribeSyncStatus(callback: (syncing: boolean, pendingCount: number) => void) {
    this.syncListeners.push(callback);
    this.getPendingCount().then(count => callback(this.isSyncing, count));
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.isOnline));
  }

  private async notifySyncListeners() {
    const count = await this.getPendingCount();
    this.syncListeners.forEach(cb => cb(this.isSyncing, count));
  }

  public async getPendingCount(): Promise<number> {
    try {
      return await db.syncQueue.where('synced').equals(0).count();
    } catch {
      return 0;
    }
  }

  /**
   * Pushes a single operation directly to the central server
   */
  public async pushToServer(
    entity: 'invoices' | 'contacts' | 'products' | 'expenses' | 'quotes' | 'creditNotes' | 'companyProfile' | 'tasks',
    operation: 'create' | 'update' | 'delete',
    payload: any
  ): Promise<boolean> {
    try {
      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, operation, payload }),
      });
      const data = await res.json();
      if (res.ok && data.lastUpdated) {
        this.lastSyncTimestamp = data.lastUpdated;
        this.addLog({
          timestamp: new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: 'server_push',
          status: 'success',
          itemCount: 1,
          details: `Enviado al Servidor Central: ${operation.toUpperCase()} en ${entity} (ID: ${payload.id || 'N/A'})`,
        });
      }
      return res.ok;
    } catch (e: any) {
      console.warn('[SyncService] Fallback: Servidor no disponible temporalmente:', e);
      this.addLog({
        timestamp: new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'server_push',
        status: 'warning',
        itemCount: 0,
        details: `Cambio en cola local (servidor desconectado): ${operation} ${entity}`,
      });
      return false;
    }
  }

  /**
   * Uploads all local IndexedDB records to the central server
   */
  public async uploadAllToServer(): Promise<{ success: boolean; count: number }> {
    try {
      const invoices = await db.invoices.toArray();
      const contacts = await db.contacts.toArray();
      const products = await db.products.toArray();
      const expenses = await db.expenses.toArray();
      const quotes = await db.quotes.toArray();
      const creditNotes = await db.creditNotes.toArray();
      const tasks = await db.tasks.toArray();
      const companyProfile = await db.companyProfile.get('default');

      const data = {
        invoices,
        contacts,
        products,
        expenses,
        quotes,
        creditNotes,
        tasks,
        companyProfile,
      };

      const res = await fetch('/api/sync/upload-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });

      const resData = await res.json();
      if (res.ok && resData.lastUpdated) {
        this.lastSyncTimestamp = resData.lastUpdated;
      }

      const totalCount = invoices.length + contacts.length + products.length + expenses.length + quotes.length;
      
      this.addLog({
        timestamp: new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'upload_all',
        status: res.ok ? 'success' : 'warning',
        itemCount: totalCount,
        details: res.ok 
          ? `Subida completa exitosa al Servidor Central: ${totalCount} registros respaldados.` 
          : 'Fallo al respaldar base completa en el servidor.',
      });

      return { success: res.ok, count: totalCount };
    } catch (e: any) {
      console.warn('[SyncService] Error en uploadAllToServer:', e);
      this.addLog({
        timestamp: new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'upload_all',
        status: 'error',
        itemCount: 0,
        details: `Error en subida completa: ${e.message || 'Sin conexión'}`,
      });
      return { success: false, count: 0 };
    }
  }

  /**
   * Pulls all records from the central server into IndexedDB (Initial boot or cross-device sync)
   */
  public async pullInitialServerData(): Promise<{ success: boolean; count: number }> {
    try {
      const res = await fetch('/api/sync/all');
      if (!res.ok) return { success: false, count: 0 };
      const body = await res.json();
      if (!body.success || !body.data) return { success: false, count: 0 };

      const { data, lastUpdated } = body;
      let totalLoaded = 0;

      // Merge server records into local IndexedDB
      if (Array.isArray(data.invoices) && data.invoices.length > 0) {
        await db.invoices.bulkPut(data.invoices);
        totalLoaded += data.invoices.length;
      }
      if (Array.isArray(data.contacts) && data.contacts.length > 0) {
        await db.contacts.bulkPut(data.contacts);
        totalLoaded += data.contacts.length;
      }
      if (Array.isArray(data.products) && data.products.length > 0) {
        await db.products.bulkPut(data.products);
        totalLoaded += data.products.length;
      }
      if (Array.isArray(data.expenses) && data.expenses.length > 0) {
        await db.expenses.bulkPut(data.expenses);
        totalLoaded += data.expenses.length;
      }
      if (Array.isArray(data.quotes) && data.quotes.length > 0) {
        await db.quotes.bulkPut(data.quotes);
        totalLoaded += data.quotes.length;
      }
      if (Array.isArray(data.creditNotes) && data.creditNotes.length > 0) {
        await db.creditNotes.bulkPut(data.creditNotes);
        totalLoaded += data.creditNotes.length;
      }
      if (Array.isArray(data.tasks) && data.tasks.length > 0) {
        await db.tasks.bulkPut(data.tasks);
        totalLoaded += data.tasks.length;
      }
      if (data.companyProfile) {
        await db.companyProfile.put({ id: 'default', ...data.companyProfile });
      }

      this.lastSyncTimestamp = lastUpdated || new Date().toISOString();

      if (totalLoaded > 0) {
        this.addLog({
          timestamp: new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: 'server_pull',
          status: 'success',
          itemCount: totalLoaded,
          details: `Descargados y sincronizados ${totalLoaded} registros desde el Servidor Central a esta PC.`,
        });
      }

      // If server was completely empty but local has data, backfill the server
      if (totalLoaded === 0) {
        const localInvoicesCount = await db.invoices.count();
        const localProductsCount = await db.products.count();
        if (localInvoicesCount > 0 || localProductsCount > 0) {
          console.log('[SyncService] Servidor vacío, enviando catálogo y facturas locales al servidor...');
          await this.uploadAllToServer();
        }
      }

      return { success: true, count: totalLoaded };
    } catch (err: any) {
      console.warn('[SyncService] pullInitialServerData error:', err);
      return { success: false, count: 0 };
    }
  }

  /**
   * Checks if server has newer updates than local timestamp and pulls if so
   */
  public async checkForUpdates(): Promise<boolean> {
    try {
      const res = await fetch('/api/sync/status');
      if (!res.ok) return false;
      const status = await res.json();
      if (!status.success || !status.lastUpdated) return false;

      if (!this.lastSyncTimestamp || status.lastUpdated > this.lastSyncTimestamp) {
        console.log('[SyncService] Nuevos datos detectados en el servidor, sincronizando...');
        const result = await this.pullInitialServerData();
        return result.success;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Starts periodic polling for multi-device cross-sync
   */
  public startAutoSync(intervalSeconds: number = 6) {
    if (this.autoSyncTimer) clearInterval(this.autoSyncTimer);
    if (intervalSeconds <= 0) return; // Mode manual

    this.autoSyncTimer = setInterval(() => {
      if (this.isOnline) {
        this.checkForUpdates().catch(() => {});
      }
    }, intervalSeconds * 1000);

    window.addEventListener('focus', () => {
      if (this.isOnline) {
        this.checkForUpdates().catch(() => {});
      }
    });
  }

  public async queueChange(
    entity: 'invoices' | 'contacts' | 'products' | 'expenses' | 'quotes' | 'creditNotes' | 'companyProfile' | 'tasks',
    operation: 'create' | 'update' | 'delete',
    payload: any
  ) {
    const queueItem: SyncQueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      entity: entity as any,
      operation,
      payload: cleanForFirestore(payload),
      timestamp: new Date().toISOString(),
      synced: false,
    };

    await db.syncQueue.add(queueItem);
    await this.notifySyncListeners();

    // 1. Send immediately to central server (Shared across all PCs and devices)
    this.pushToServer(entity, operation, payload).catch(err => {
      console.warn('[SyncService] Servidor central no accesible en este instante:', err);
    });

    // 2. Push to Firestore if authenticated & online
    const session = authService.getSession();
    const userEmail = session?.email || auth.currentUser?.email || 'distribuidoraelimperio8280@gmail.com';
    const userId = session?.uid || auth.currentUser?.uid;

    if (this.isOnline && (userId || auth.currentUser)) {
      try {
        if (entity === 'invoices') {
          if (operation === 'delete') {
            await cloudDataService.deleteInvoice(payload.id || payload);
          } else {
            await cloudDataService.saveInvoice(payload, userEmail, userId);
          }
        } else if (entity === 'contacts') {
          if (operation === 'delete') {
            await cloudDataService.deleteContact(payload.id || payload);
          } else {
            await cloudDataService.saveContact(payload, userEmail, userId);
          }
        } else if (entity === 'products') {
          if (operation === 'delete') {
            await cloudDataService.deleteProduct(payload.id || payload);
          } else {
            await cloudDataService.saveProduct(payload, userEmail, userId);
          }
        } else if (entity === 'expenses') {
          if (operation === 'delete') {
            await cloudDataService.deleteExpense(payload.id || payload);
          } else {
            await cloudDataService.saveExpense(payload, userEmail, userId);
          }
        } else if (entity === 'quotes') {
          if (operation === 'delete') {
            await cloudDataService.deleteQuote(payload.id || payload);
          } else {
            await cloudDataService.saveQuote(payload, userEmail, userId);
          }
        } else if (entity === 'creditNotes') {
          if (operation === 'delete') {
            await cloudDataService.deleteCreditNote(payload.id || payload);
          } else {
            await cloudDataService.saveCreditNote(payload, userEmail, userId);
          }
        } else if (entity === 'tasks') {
          if (operation === 'delete') {
            await cloudDataService.deleteTask(payload.id || payload);
          } else {
            await cloudDataService.saveTask(payload, userEmail, userId);
          }
        } else if (entity === 'companyProfile') {
          await cloudDataService.saveCompanyProfile(payload, userEmail, userId);
        }

        // Mark synced in queue
        await db.syncQueue.update(queueItem.id, { synced: true });
        await this.notifySyncListeners();
        return;
      } catch (e) {
        console.warn('Firestore direct write delayed, queued for background processing:', e);
      }
    }

    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  public async processSyncQueue(): Promise<{ success: boolean; syncedCount: number; message: string }> {
    if (this.isSyncing) {
      const count = await this.getPendingCount();
      return { success: true, syncedCount: 0, message: 'Sincronización en curso...' };
    }

    const pendingItems = await db.syncQueue.where('synced').equals(0).toArray();
    if (pendingItems.length === 0) {
      await this.notifySyncListeners();
      return { success: true, syncedCount: 0, message: 'Todos los datos están sincronizados en el servidor y la nube' };
    }

    this.isSyncing = true;
    await this.notifySyncListeners();

    const session = authService.getSession();
    const userEmail = session?.email || auth.currentUser?.email || 'distribuidoraelimperio8280@gmail.com';
    const userId = session?.uid || auth.currentUser?.uid;

    let syncedCount = 0;

    try {
      for (const item of pendingItems) {
        const entity = item.entity as any;
        const payload = item.payload;

        // 1. Sync to server
        await this.pushToServer(entity, item.operation, payload);

        // 2. Sync to Firestore if authenticated
        if (userId || auth.currentUser) {
          try {
            if (entity === 'invoices') {
              if (item.operation === 'delete') {
                await cloudDataService.deleteInvoice(payload.id || payload);
              } else {
                await cloudDataService.saveInvoice(payload, userEmail, userId);
                await db.invoices.update(payload.id, { isSynced: true, offlineCreated: false });
              }
            } else if (entity === 'contacts') {
              if (item.operation === 'delete') {
                await cloudDataService.deleteContact(payload.id || payload);
              } else {
                await cloudDataService.saveContact(payload, userEmail, userId);
              }
            } else if (entity === 'products') {
              if (item.operation === 'delete') {
                await cloudDataService.deleteProduct(payload.id || payload);
              } else {
                await cloudDataService.saveProduct(payload, userEmail, userId);
              }
            } else if (entity === 'expenses') {
              if (item.operation === 'delete') {
                await cloudDataService.deleteExpense(payload.id || payload);
              } else {
                await cloudDataService.saveExpense(payload, userEmail, userId);
                await db.expenses.update(payload.id, { isSynced: true });
              }
            } else if (entity === 'quotes') {
              if (item.operation === 'delete') {
                await cloudDataService.deleteQuote(payload.id || payload);
              } else {
                await cloudDataService.saveQuote(payload, userEmail, userId);
              }
            } else if (entity === 'creditNotes') {
              if (item.operation === 'delete') {
                await cloudDataService.deleteCreditNote(payload.id || payload);
              } else {
                await cloudDataService.saveCreditNote(payload, userEmail, userId);
              }
            }
          } catch (cloudErr) {
            console.warn('Error en sync a Firestore para elemento, pero guardado en servidor:', cloudErr);
          }
        }

        await db.syncQueue.update(item.id, { synced: true });
        syncedCount++;
      }

      this.isSyncing = false;
      await this.notifySyncListeners();

      this.addLog({
        timestamp: new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'queue_process',
        status: 'success',
        itemCount: syncedCount,
        details: `Cola de sincronización procesada: ${syncedCount} operaciones transmitidas.`,
      });

      return {
        success: true,
        syncedCount,
        message: `¡Se sincronizaron exitosamente ${syncedCount} operaciones con el servidor y la nube!`,
      };
    } catch (err: any) {
      console.warn('Sync warning:', err);
      this.isSyncing = false;
      await this.notifySyncListeners();

      this.addLog({
        timestamp: new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'queue_process',
        status: 'warning',
        itemCount: syncedCount,
        details: `Sincronización parcial: ${err.message || 'Sin conexión'}`,
      });

      return {
        success: false,
        syncedCount,
        message: `Error al sincronizar: ${err.message || 'Sin conexión'}`,
      };
    }
  }
}

export const syncService = new SyncService();
