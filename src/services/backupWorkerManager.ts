import { db } from '../db/indexedDB';
import type { LocalBackupRecord } from '../types';
import { 
  getDriveAccessToken, 
  uploadBackupToGoogleDrive, 
  getCurrentDriveUser 
} from './googleDriveService';
import type { StorageEstimateResult } from '../workers/backupWorker';

/**
 * Gestor Central del Web Worker de Respaldo y Almacenamiento
 * Imperio Pro Facturación y Contabilidad
 */

export interface BackupManagerStatus {
  isWorkerActive: boolean;
  isAutoBackupEnabled: boolean;
  isAutoDriveSyncEnabled: boolean;
  intervalMinutes: number;
  thresholdPercent: number;
  lastStorageInfo: StorageEstimateResult | null;
  lastBackupTime: string | null;
  lastBackupFileName: string | null;
  isProcessingBackup: boolean;
  driveConnectedEmail: string | null;
}

type StatusListener = (status: BackupManagerStatus) => void;

class BackupWorkerManager {
  private worker: Worker | null = null;
  private listeners: Set<StatusListener> = new Set();
  private isProcessing = false;
  private lastStorageInfo: StorageEstimateResult | null = null;
  private lastBackupTime: string | null = null;
  private lastBackupFileName: string | null = null;

  // Parámetros leídos de las variables de entorno de Vite (.env)
  private intervalMinutes: number = Number((import.meta as any).env?.VITE_AUTO_BACKUP_INTERVAL_MINUTES) || 60;
  private thresholdPercent: number = Number((import.meta as any).env?.VITE_BACKUP_STORAGE_THRESHOLD_PERCENT) || 85;
  private folderName: string = (import.meta as any).env?.VITE_GOOGLE_DRIVE_FOLDER_NAME || 'ImperioPro_Backups';
  private isAutoBackupEnabled = true;
  private isAutoDriveSyncEnabled = localStorage.getItem('imperio_auto_drive_sync') === 'true';

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
        this.worker = new Worker(
          new URL('../workers/backupWorker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = this.handleWorkerMessage.bind(this);
        this.worker.onerror = (err) => {
          console.error('Error en Web Worker de respaldo:', err);
        };

        // Enviar configuración inicial al Web Worker
        this.worker.postMessage({
          type: 'INIT_CONFIG',
          payload: {
            intervalMinutes: this.intervalMinutes,
            thresholdPercent: this.thresholdPercent,
            folderName: this.folderName,
          },
        });

        // Iniciar el cronómetro de auditoría en segundo plano
        if (this.isAutoBackupEnabled) {
          this.worker.postMessage({
            type: 'START_SCHEDULE',
            payload: { intervalMinutes: this.intervalMinutes },
          });
        }
      }
    } catch (err) {
      console.warn('No se pudo inicializar el Web Worker de respaldos:', err);
    }
  }

  private async handleWorkerMessage(e: MessageEvent) {
    const { type, payload } = e.data || {};

    switch (type) {
      case 'STORAGE_STATUS':
        this.lastStorageInfo = payload;
        this.notify();
        break;

      case 'BACKUP_TICK':
        this.lastStorageInfo = payload.storageInfo;
        // Si el almacenamiento supera el umbral o ha pasado el intervalo, ejecutar respaldo automático
        if (this.isAutoBackupEnabled) {
          await this.executeBackup('auto_worker', this.isAutoDriveSyncEnabled);
        }
        this.notify();
        break;

      case 'SCHEDULE_STARTED':
      case 'SCHEDULE_STOPPED':
        this.notify();
        break;

      case 'WORKER_ERROR':
        console.error('Fallo reportado por Web Worker:', payload);
        break;

      default:
        break;
    }
  }

  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.error('Error en listener de BackupManager:', err);
      }
    });
  }

  public getStatus(): BackupManagerStatus {
    const user = getCurrentDriveUser();
    return {
      isWorkerActive: !!this.worker,
      isAutoBackupEnabled: this.isAutoBackupEnabled,
      isAutoDriveSyncEnabled: this.isAutoDriveSyncEnabled,
      intervalMinutes: this.intervalMinutes,
      thresholdPercent: this.thresholdPercent,
      lastStorageInfo: this.lastStorageInfo,
      lastBackupTime: this.lastBackupTime,
      lastBackupFileName: this.lastBackupFileName,
      isProcessingBackup: this.isProcessing,
      driveConnectedEmail: user?.email || null,
    };
  }

  /**
   * Solicita al navegador persistencia en el almacenamiento para evitar purgas del SO
   */
  public async requestStoragePersistence(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      const isPersisted = await navigator.storage.persist();
      await this.checkStorageCondition();
      return isPersisted;
    }
    return false;
  }

  /**
   * Solicita una medición fresca de almacenamiento al Web Worker
   */
  public async checkStorageCondition() {
    if (this.worker) {
      this.worker.postMessage({ type: 'CHECK_STORAGE' });
    }
  }

  /**
   * Configura la sincronización automática a Google Drive
   */
  public setAutoDriveSync(enabled: boolean) {
    this.isAutoDriveSyncEnabled = enabled;
    localStorage.setItem('imperio_auto_drive_sync', enabled ? 'true' : 'false');
    this.notify();
  }

  /**
   * Modifica el intervalo de respaldo en minutos
   */
  public setIntervalMinutes(minutes: number) {
    this.intervalMinutes = Math.max(5, minutes);
    if (this.worker && this.isAutoBackupEnabled) {
      this.worker.postMessage({
        type: 'START_SCHEDULE',
        payload: { intervalMinutes: this.intervalMinutes },
      });
    }
    this.notify();
  }

  /**
   * Ejecuta el proceso integral de respaldo en IndexedDB y opcionalmente a Google Drive
   */
  public async executeBackup(
    type: 'manual' | 'auto_worker' | 'cloud_drive' = 'manual',
    uploadToDrive: boolean = false
  ): Promise<{ backupRecord: LocalBackupRecord; driveResult?: any }> {
    if (this.isProcessing) {
      throw new Error('Ya hay una operación de respaldo en ejecución.');
    }

    this.isProcessing = true;
    this.notify();

    try {
      // 1. Extraer todas las colecciones desde Dexie IndexedDB
      const [products, contacts, invoices, expenses, quotes, company] = await Promise.all([
        db.products.toArray(),
        db.contacts.toArray(),
        db.invoices.toArray(),
        db.expenses.toArray(),
        db.quotes.toArray(),
        db.companyProfile.get('default'),
      ]);

      const collections = {
        products,
        contacts,
        invoices,
        expenses,
        quotes,
        companyProfile: company || null,
      };

      // 2. Procesar con Web Worker para empaquetado, metadata y SHA-256
      const workerResult = await new Promise<{
        jsonString: string;
        checksum: string;
        byteSize: number;
        totalRecords: number;
        timestamp: string;
        filename: string;
      }>((resolve, reject) => {
        if (!this.worker) {
          reject(new Error('Web Worker no disponible.'));
          return;
        }

        const handler = (e: MessageEvent) => {
          if (e.data?.type === 'BACKUP_PROCESSED') {
            this.worker?.removeEventListener('message', handler);
            resolve(e.data.payload);
          } else if (e.data?.type === 'WORKER_ERROR') {
            this.worker?.removeEventListener('message', handler);
            reject(new Error(e.data.payload?.message || 'Error en Web Worker.'));
          }
        };

        this.worker.addEventListener('message', handler);
        this.worker.postMessage({
          type: 'PROCESS_BACKUP_PAYLOAD',
          payload: {
            collections,
            metadata: {
              source: 'ImperioProERP_WebWorker',
              backupType: type,
            },
          },
        });
      });

      // 3. Almacenar el registro de respaldo en IndexedDB (Tabla backups)
      const backupId = `bkp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const backupRecord: LocalBackupRecord = {
        id: backupId,
        timestamp: workerResult.timestamp,
        type,
        filename: workerResult.filename,
        size: workerResult.byteSize,
        recordCount: workerResult.totalRecords,
        checksum: workerResult.checksum,
        dataJson: workerResult.jsonString,
        status: 'stored_local',
      };

      await db.backups.put(backupRecord);

      let driveResult: any = null;

      // 4. Si se solicita subir a Google Drive y hay token activo
      const token = await getDriveAccessToken();
      if ((uploadToDrive || this.isAutoDriveSyncEnabled) && token) {
        try {
          driveResult = await uploadBackupToGoogleDrive(
            workerResult.jsonString,
            workerResult.filename,
            this.folderName
          );

          // Actualizar estado en IndexedDB a subido
          backupRecord.status = 'uploaded_drive';
          backupRecord.driveFileId = driveResult.fileId;
          backupRecord.driveFileName = driveResult.fileName;
          await db.backups.put(backupRecord);
        } catch (driveErr) {
          console.warn('Advertencia: Respaldo guardado en IndexedDB pero falló la subida a Drive:', driveErr);
        }
      }

      this.lastBackupTime = workerResult.timestamp;
      this.lastBackupFileName = workerResult.filename;

      // Actualizar estado del almacenamiento
      await this.checkStorageCondition();

      return { backupRecord, driveResult };
    } finally {
      this.isProcessing = false;
      this.notify();
    }
  }

  /**
   * Descarga directamente un archivo JSON de respaldo en el navegador
   */
  public downloadBackupFile(jsonString: string, filename: string) {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Valida un archivo JSON de respaldo usando el Web Worker y lo restaura en IndexedDB
   */
  public async validateAndRestore(
    jsonString: string,
    mode: 'update' | 'replace' = 'update'
  ): Promise<{ restoredCount: number; summary: any }> {
    if (!this.worker) {
      throw new Error('Web Worker no disponible.');
    }

    // 1. Validar integridad y formato en el Web Worker
    const validation = await new Promise<{
      isValid: boolean;
      error?: string;
      checksum?: string;
      summary?: any;
      data?: any;
    }>((resolve) => {
      const handler = (e: MessageEvent) => {
        if (e.data?.type === 'BACKUP_VALIDATION_RESULT') {
          this.worker?.removeEventListener('message', handler);
          resolve(e.data.payload);
        }
      };

      this.worker?.addEventListener('message', handler);
      this.worker?.postMessage({
        type: 'VALIDATE_BACKUP',
        payload: { jsonString },
      });
    });

    if (!validation.isValid) {
      throw new Error(validation.error || 'Archivo de respaldo corrupto o inválido.');
    }

    const { data, summary } = validation;

    // 2. Transacción atómica en Dexie IndexedDB
    await db.transaction('rw', [db.products, db.contacts, db.invoices, db.expenses, db.quotes, db.companyProfile], async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.products.clear(),
          db.contacts.clear(),
          db.invoices.clear(),
          db.expenses.clear(),
          db.quotes.clear(),
        ]);
      }

      if (Array.isArray(data.products) && data.products.length > 0) {
        await db.products.bulkPut(data.products);
      }
      if (Array.isArray(data.contacts) && data.contacts.length > 0) {
        await db.contacts.bulkPut(data.contacts);
      }
      if (Array.isArray(data.invoices) && data.invoices.length > 0) {
        await db.invoices.bulkPut(data.invoices);
      }
      if (Array.isArray(data.expenses) && data.expenses.length > 0) {
        await db.expenses.bulkPut(data.expenses);
      }
      if (Array.isArray(data.quotes) && data.quotes.length > 0) {
        await db.quotes.bulkPut(data.quotes);
      }
      if (data.companyProfile) {
        await db.companyProfile.put(data.companyProfile);
      }
    });

    await this.checkStorageCondition();

    const totalRestored =
      (data.products?.length || 0) +
      (data.contacts?.length || 0) +
      (data.invoices?.length || 0) +
      (data.expenses?.length || 0) +
      (data.quotes?.length || 0);

    return {
      restoredCount: totalRestored,
      summary,
    };
  }
}

export const backupWorkerManager = new BackupWorkerManager();
