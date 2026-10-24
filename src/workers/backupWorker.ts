/**
 * Web Worker en Segundo Plano para Copias de Seguridad y Auditoría de Almacenamiento
 * Imperio Pro Facturación y Contabilidad
 */

export interface StorageEstimateResult {
  usage: number;
  quota: number;
  percentUsed: number;
  persisted: boolean;
  isThresholdExceeded: boolean;
  thresholdPercent: number;
  freeSpaceBytes: number;
  formattedUsage: string;
  formattedQuota: string;
  formattedFree: string;
  checkedAt: string;
}

export interface BackupWorkerConfig {
  intervalMinutes: number;
  thresholdPercent: number;
  enableCloudBackup: boolean;
  folderName: string;
}

let timerId: ReturnType<typeof setInterval> | null = null;
let currentConfig: BackupWorkerConfig = {
  intervalMinutes: 60,
  thresholdPercent: 85,
  enableCloudBackup: true,
  folderName: 'ImperioPro_Backups',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

async function checkStorageCondition(): Promise<StorageEstimateResult> {
  let usage = 0;
  let quota = 0;
  let percentUsed = 0;
  let persisted = false;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    if (navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      usage = estimate.usage || 0;
      quota = estimate.quota || 0;
      percentUsed = quota > 0 ? (usage / quota) * 100 : 0;
    }

    if (navigator.storage.persisted) {
      persisted = await navigator.storage.persisted();
    }
  }

  const freeSpace = Math.max(0, quota - usage);
  const isThresholdExceeded = percentUsed >= currentConfig.thresholdPercent;

  return {
    usage,
    quota,
    percentUsed: Math.round(percentUsed * 100) / 100,
    persisted,
    isThresholdExceeded,
    thresholdPercent: currentConfig.thresholdPercent,
    freeSpaceBytes: freeSpace,
    formattedUsage: formatBytes(usage),
    formattedQuota: formatBytes(quota),
    formattedFree: formatBytes(freeSpace),
    checkedAt: new Date().toISOString(),
  };
}

async function computeSHA256(text: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data || {};

  try {
    switch (type) {
      case 'INIT_CONFIG': {
        if (payload) {
          currentConfig = { ...currentConfig, ...payload };
        }
        const storageInfo = await checkStorageCondition();
        self.postMessage({
          type: 'STORAGE_STATUS',
          payload: storageInfo,
        });
        break;
      }

      case 'CHECK_STORAGE': {
        const storageInfo = await checkStorageCondition();
        self.postMessage({
          type: 'STORAGE_STATUS',
          payload: storageInfo,
        });
        break;
      }

      case 'START_SCHEDULE': {
        if (payload?.intervalMinutes) {
          currentConfig.intervalMinutes = payload.intervalMinutes;
        }

        if (timerId) {
          clearInterval(timerId);
        }

        const intervalMs = Math.max(1, currentConfig.intervalMinutes) * 60 * 1000;

        timerId = setInterval(async () => {
          const storageInfo = await checkStorageCondition();
          self.postMessage({
            type: 'BACKUP_TICK',
            payload: {
              timestamp: new Date().toISOString(),
              storageInfo,
            },
          });
        }, intervalMs);

        self.postMessage({
          type: 'SCHEDULE_STARTED',
          payload: {
            intervalMinutes: currentConfig.intervalMinutes,
            nextCheckInSeconds: currentConfig.intervalMinutes * 60,
          },
        });
        break;
      }

      case 'STOP_SCHEDULE': {
        if (timerId) {
          clearInterval(timerId);
          timerId = null;
        }
        self.postMessage({
          type: 'SCHEDULE_STOPPED',
          payload: { stoppedAt: new Date().toISOString() },
        });
        break;
      }

      case 'PROCESS_BACKUP_PAYLOAD': {
        const { collections, metadata } = payload;
        const now = new Date();
        const timestampStr = now.toISOString();

        const countProducts = collections.products?.length || 0;
        const countContacts = collections.contacts?.length || 0;
        const countInvoices = collections.invoices?.length || 0;
        const countExpenses = collections.expenses?.length || 0;
        const countQuotes = collections.quotes?.length || 0;
        const totalRecords = countProducts + countContacts + countInvoices + countExpenses + countQuotes;

        const packageObject = {
          app: 'Imperio Pro Facturación y Contabilidad',
          version: '2.5.0-panama-enterprise',
          exportedAt: timestampStr,
          jurisdiction: 'Panamá (DGI)',
          metadata: {
            ...metadata,
            generatedBy: 'WebWorkerBackgroundEngine',
            totalRecords,
          },
          summary: {
            products: countProducts,
            contacts: countContacts,
            invoices: countInvoices,
            expenses: countExpenses,
            quotes: countQuotes,
          },
          data: collections,
        };

        const jsonString = JSON.stringify(packageObject, null, 2);
        const checksum = await computeSHA256(jsonString);
        const byteSize = new Blob([jsonString]).size;

        self.postMessage({
          type: 'BACKUP_PROCESSED',
          payload: {
            jsonString,
            checksum,
            byteSize,
            formattedSize: formatBytes(byteSize),
            totalRecords,
            timestamp: timestampStr,
            filename: `ImperioPro_Backup_${timestampStr.replace(/[:.]/g, '-').slice(0, 19)}.json`,
          },
        });
        break;
      }

      case 'VALIDATE_BACKUP': {
        const { jsonString } = payload;
        let parsed: any = null;
        try {
          parsed = JSON.parse(jsonString);
        } catch (err: any) {
          self.postMessage({
            type: 'BACKUP_VALIDATION_RESULT',
            payload: {
              isValid: false,
              error: `El archivo no contiene un JSON válido: ${err.message}`,
            },
          });
          return;
        }

        if (!parsed.data || typeof parsed.data !== 'object') {
          self.postMessage({
            type: 'BACKUP_VALIDATION_RESULT',
            payload: {
              isValid: false,
              error: 'El formato del archivo no corresponde a un respaldo legítimo de Imperio Pro.',
            },
          });
          return;
        }

        const calculatedChecksum = await computeSHA256(jsonString);

        self.postMessage({
          type: 'BACKUP_VALIDATION_RESULT',
          payload: {
            isValid: true,
            checksum: calculatedChecksum,
            summary: parsed.summary || {
              products: parsed.data.products?.length || 0,
              contacts: parsed.data.contacts?.length || 0,
              invoices: parsed.data.invoices?.length || 0,
              expenses: parsed.data.expenses?.length || 0,
              quotes: parsed.data.quotes?.length || 0,
            },
            exportedAt: parsed.exportedAt || 'Desconocida',
            version: parsed.version || '1.0.0',
            data: parsed.data,
          },
        });
        break;
      }

      default:
        console.warn('Tipo de mensaje no reconocido en Web Worker:', type);
    }
  } catch (error: any) {
    self.postMessage({
      type: 'WORKER_ERROR',
      payload: {
        message: error.message || String(error),
        timestamp: new Date().toISOString(),
      },
    });
  }
};
