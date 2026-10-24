import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/indexedDB';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Package, 
  FileText, 
  Receipt, 
  FileCheck, 
  FileDown,
  Sparkles,
  Eye,
  Cloud,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  LogOut,
  FolderOpen,
  Cpu,
  Database,
  Lock,
  Clock,
  Activity,
  ArrowUpDown,
  Trash2,
  Radio
} from 'lucide-react';
import type { Product, Contact, Invoice, Expense, Quote, TaxRate, LocalBackupRecord } from '../types';
import { syncService, type SyncLogEntry } from '../services/syncService';
import { backupWorkerManager, type BackupManagerStatus } from '../services/backupWorkerManager';
import { 
  signInWithGoogleDrive, 
  signOutGoogleDrive, 
  getCurrentDriveUser, 
  initDriveAuth,
  listDriveBackups,
  type DriveFileInfo 
} from '../services/googleDriveService';
import { SupabaseSyncManager } from './SupabaseSyncManager';

export const DataManagementView: React.FC = () => {
  const [importType, setImportType] = useState<'products' | 'contacts'>('products');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [parsedFileName, setParsedFileName] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duplicateOption, setDuplicateOption] = useState<'update' | 'skip'>('update');

  // Estado del Web Worker y Google Drive
  const [workerStatus, setWorkerStatus] = useState<BackupManagerStatus>(backupWorkerManager.getStatus());
  const [driveUser, setDriveUser] = useState<any>(getCurrentDriveUser());
  const [driveFiles, setDriveFiles] = useState<DriveFileInfo[]>([]);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [isRestoringJson, setIsRestoringJson] = useState(false);
  const [jsonRestoreFileName, setJsonRestoreFileName] = useState<string | null>(null);
  const [jsonRestoreContent, setJsonRestoreContent] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'update' | 'replace'>('update');

  // Estado de syncService (Sincronización multi-dispositivo y logs)
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>(() => syncService.getLogs());
  const [syncInterval, setSyncInterval] = useState<number>(() => syncService.getAutoSyncInterval());
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
  const [lastSyncServerTime, setLastSyncServerTime] = useState<string | null>(() => syncService.getLastSyncTime());

  // Live queries from Dexie IndexedDB
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const contacts = useLiveQuery(() => db.contacts.toArray(), []) || [];
  const invoices = useLiveQuery(() => db.invoices.toArray(), []) || [];
  const expenses = useLiveQuery(() => db.expenses.toArray(), []) || [];
  const quotes = useLiveQuery(() => db.quotes.toArray(), []) || [];
  const localBackups = useLiveQuery(() => db.backups.toArray(), []) || [];

  // Suscripción a Web Worker, Google Drive Auth y syncService
  React.useEffect(() => {
    const unsubscribeWorker = backupWorkerManager.subscribe((status) => {
      setWorkerStatus(status);
    });

    const unsubscribeAuth = initDriveAuth(
      (user) => {
        setDriveUser(user);
        refreshDriveFiles();
      },
      () => {
        setDriveUser(null);
        setDriveFiles([]);
      }
    );

    const unsubscribeSyncLogs = syncService.subscribeLogs((logs) => {
      setSyncLogs(logs);
      setLastSyncServerTime(syncService.getLastSyncTime());
    });

    // Verificación inicial de almacenamiento
    backupWorkerManager.checkStorageCondition();

    return () => {
      unsubscribeWorker();
      unsubscribeAuth();
      unsubscribeSyncLogs();
    };
  }, []);

  const handleChangeSyncInterval = (newSecs: number) => {
    setSyncInterval(newSecs);
    syncService.setAutoSyncInterval(newSecs);
    setImportStatus({
      type: 'success',
      text: newSecs > 0
        ? `Intervalo automático de sincronización configurado a cada ${newSecs} segundos.`
        : 'Sincronización automática periódica desactivada (modo manual).'
    });
  };

  const handleForceFullSync = async () => {
    setIsManualSyncing(true);
    try {
      const pullRes = await syncService.pullInitialServerData();
      const uploadRes = await syncService.uploadAllToServer();
      await syncService.processSyncQueue();
      setLastSyncServerTime(syncService.getLastSyncTime());
      setImportStatus({
        type: 'success',
        text: `¡Sincronización completada! Descargados ${pullRes.count} registros del servidor central. Respaldados ${uploadRes.count} registros locales.`
      });
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        text: `Error al sincronizar con el servidor: ${err.message || 'Error de red'}`
      });
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleClearSyncLogs = () => {
    syncService.clearLogs();
  };

  const refreshDriveFiles = async () => {
    try {
      const files = await listDriveBackups();
      setDriveFiles(files);
    } catch (err) {
      console.warn('Error al listar archivos de Drive:', err);
    }
  };

  const handleConnectGoogleDrive = async () => {
    try {
      setIsSyncingDrive(true);
      const res = await signInWithGoogleDrive();
      setDriveUser(res.user);
      setImportStatus({
        type: 'success',
        text: `¡Conexión exitosa con Google Drive! Vinculado a ${res.user.email}. Se respaldará automáticamente en la carpeta "ImperioPro_Backups".`
      });
      await refreshDriveFiles();
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        text: `No se pudo conectar a Google Drive: ${err.message}`
      });
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleDisconnectGoogleDrive = async () => {
    try {
      await signOutGoogleDrive();
      setDriveUser(null);
      setDriveFiles([]);
      backupWorkerManager.setAutoDriveSync(false);
      setImportStatus({
        type: 'success',
        text: 'Desconectado de Google Drive. Los respaldos futuros se guardarán localmente en IndexedDB.'
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleManualBackupNow = async (uploadToCloud: boolean = false) => {
    try {
      setIsProcessing(true);
      setImportStatus(null);
      const result = await backupWorkerManager.executeBackup(
        uploadToCloud ? 'cloud_drive' : 'manual',
        uploadToCloud
      );

      let msg = `¡Copia de seguridad completada con éxito! Archivo: "${result.backupRecord.filename}" (${(result.backupRecord.size / 1024).toFixed(1)} KB, ${result.backupRecord.recordCount} registros) guardado en IndexedDB.`;
      if (result.driveResult) {
        msg += ` Subido exitosamente a Google Drive en la carpeta "${result.driveResult.folderName}".`;
        refreshDriveFiles();
      }

      setImportStatus({
        type: 'success',
        text: msg
      });
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        text: `Error al generar copia de seguridad: ${err.message}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadFullJsonBackup = async () => {
    try {
      setIsProcessing(true);
      const result = await backupWorkerManager.executeBackup('manual', false);
      if (result.backupRecord.dataJson) {
        backupWorkerManager.downloadBackupFile(result.backupRecord.dataJson, result.backupRecord.filename);
        setImportStatus({
          type: 'success',
          text: `¡Archivo JSON descargado correctamente: "${result.backupRecord.filename}"!`
        });
      }
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        text: `Error al descargar respaldo JSON: ${err.message}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectJsonRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setJsonRestoreFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonRestoreContent(content);
    };
    reader.readAsText(file);
  };

  const handleConfirmJsonRestore = async () => {
    if (!jsonRestoreContent) return;
    try {
      setIsRestoringJson(true);
      const result = await backupWorkerManager.validateAndRestore(jsonRestoreContent, restoreMode);
      setImportStatus({
        type: 'success',
        text: `¡Restauración completada exitosamente! ${result.restoredCount} registros recuperados en IndexedDB (${restoreMode === 'replace' ? 'reemplazo total' : 'actualización de datos'}).`
      });
      setJsonRestoreFileName(null);
      setJsonRestoreContent(null);
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        text: `Error al restaurar respaldo: ${err.message}`
      });
    } finally {
      setIsRestoringJson(false);
    }
  };

  const handleRequestPersistence = async () => {
    const persisted = await backupWorkerManager.requestStoragePersistence();
    setImportStatus({
      type: persisted ? 'success' : 'error',
      text: persisted 
        ? '¡Almacenamiento persistente garantizado por el navegador! IndexedDB no será purgado automáticamente por falta de espacio en disco.' 
        : 'El navegador no otorgó persistencia estricta en este momento. Las copias de seguridad en Google Drive mantendrán tus datos a salvo.'
    });
  };

  // ==========================================
  // EXPORT FUNCTIONS
  // ==========================================

  const exportToExcel = (data: any[], fileName: string, sheetName: string) => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      setImportStatus({
        type: 'success',
        text: `¡Archivo "${fileName}.xlsx" generado y descargado correctamente con ${data.length} registros!`
      });
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        text: `Error al exportar: ${err.message}`
      });
    }
  };

  const handleExportProducts = () => {
    const formatted = products.map((p) => ({
      'SKU / Código': p.sku,
      'Nombre del Producto': p.name,
      'Descripción': p.description || '',
      'Precio de Venta ($)': p.price,
      'Costo ($)': p.cost || 0,
      'Stock Actual': p.stock,
      'Alerta Stock Mínimo': p.minStockAlert || 3,
      'Categoría': p.category || 'General',
      'Unidad': p.unit || 'unidad',
      'Impuesto (%)': p.taxRate || 0,
    }));
    exportToExcel(formatted, 'Lista_Productos_Alegra', 'Productos');
  };

  const handleExportContacts = () => {
    const formatted = contacts.map((c) => ({
      'Nombre / Razón Social': c.name,
      'Identificación (DNI/RUC/NIT)': c.rucOrCedula || '',
      'DV': c.dv || '',
      'Tipo': c.type === 'client' ? 'Cliente' : c.type === 'provider' ? 'Proveedor' : 'Ambos',
      'Correo Electrónico': c.email || '',
      'Teléfono / Celular': c.phone || '',
      'Dirección': c.address || '',
      'Saldo Pendiente ($)': c.balance || 0,
    }));
    exportToExcel(formatted, 'Lista_Clientes_Contactos_Alegra', 'Contactos');
  };

  const handleExportInvoices = () => {
    const formatted = invoices.map((i) => ({
      'Código / N° Factura': i.code,
      'Cliente': i.contactName,
      'DNI/RUC Cliente': i.contactRuc || '',
      'Fecha Emisión': i.date,
      'Fecha Vencimiento': i.dueDate,
      'Subtotal ($)': i.subtotal,
      'Impuestos ($)': i.taxTotal,
      'Monto Total ($)': i.total,
      'Monto Pagado ($)': i.paidAmount || 0,
      'Estado': i.status === 'paid' ? 'Pagada' : i.status === 'pending' ? 'Pendiente' : 'Anulada',
      'Método de Pago': i.paymentMethod || 'cash',
    }));
    exportToExcel(formatted, 'Lista_Ventas_Facturas_Alegra', 'Ventas_Facturas');
  };

  const handleExportExpenses = () => {
    const formatted = expenses.map((e) => ({
      'Código / N° Comprobante': e.code,
      'Factura de Origen N°': e.invoiceNumber || 'S/N',
      'Proveedor / Razón Social': e.providerName,
      'RUC Proveedor': e.providerRuc || '',
      'DV Proveedor': e.providerDv || '',
      'Teléfono Proveedor': e.providerPhone || '',
      'Correo Proveedor': e.providerEmail || '',
      'Dirección Proveedor': e.providerAddress || '',
      'Fecha Emisión': e.date,
      'Fecha Recepción': e.receptionDate || e.date,
      'Tipo de Gasto': e.category,
      'Forma de Pago': e.paymentMethod,
      'Subtotal ($)': e.subtotal || (e.amount - (e.taxAmount || 0)),
      'ITBMS ($)': e.taxAmount || 0,
      'Monto Total ($)': e.amount,
      'Cuenta Contable': e.expenseAccount || '',
      'Notas / Observaciones': e.notes || '',
    }));
    exportToExcel(formatted, 'Lista_Compras_Gastos_ImperioPro', 'Compras_Gastos');
  };

  const handleExportQuotes = () => {
    const formatted = quotes.map((q) => ({
      'Código Cotización': q.code,
      'Cliente': q.contactName,
      'RUC / DNI': q.contactRuc,
      'Fecha': q.date,
      'Válido Hasta': q.validUntil,
      'Monto Total ($)': q.total,
      'Estado': q.status === 'accepted' ? 'Aceptada' : q.status === 'rejected' ? 'Rechazada' : 'Pendiente',
    }));
    exportToExcel(formatted, 'Lista_Cotizaciones_Alegra', 'Cotizaciones');
  };

  const handleExportFullMasterDatabase = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // Products sheet
      const wsProducts = XLSX.utils.json_to_sheet(products.map(p => ({
        'SKU': p.sku, 'Nombre': p.name, 'Precio': p.price, 'Costo': p.cost || 0, 'Stock': p.stock, 'Categoría': p.category || 'General'
      })));
      XLSX.utils.book_append_sheet(workbook, wsProducts, 'Productos');

      // Contacts sheet
      const wsContacts = XLSX.utils.json_to_sheet(contacts.map(c => ({
        'Nombre': c.name, 'Identificación': c.rucOrCedula || '', 'Tipo': c.type, 'Email': c.email || '', 'Teléfono': c.phone || '', 'Dirección': c.address || ''
      })));
      XLSX.utils.book_append_sheet(workbook, wsContacts, 'Clientes_Contactos');

      // Invoices sheet
      const wsInvoices = XLSX.utils.json_to_sheet(invoices.map(i => ({
        'Código': i.code, 'Cliente': i.contactName, 'Fecha': i.date, 'Total': i.total, 'Estado': i.status
      })));
      XLSX.utils.book_append_sheet(workbook, wsInvoices, 'Ventas_Facturas');

      // Expenses sheet
      const wsExpenses = XLSX.utils.json_to_sheet(expenses.map(e => ({
        'Código': e.code, 'Proveedor': e.providerName, 'Categoría': e.category, 'Monto': e.amount, 'Fecha': e.date
      })));
      XLSX.utils.book_append_sheet(workbook, wsExpenses, 'Gastos');

      XLSX.writeFile(workbook, `Base_de_Datos_Alegra_Completa_${new Date().toISOString().split('T')[0]}.xlsx`);

      setImportStatus({
        type: 'success',
        text: '¡Base de datos Maestra exportada exitosamente en un único archivo Excel con pestañas!'
      });
    } catch (err: any) {
      setImportStatus({ type: 'error', text: `Error al exportar base completa: ${err.message}` });
    }
  };

  // ==========================================
  // TEMPLATES DOWNLOAD
  // ==========================================

  const handleDownloadTemplate = () => {
    if (importType === 'products') {
      const templateData = [
        {
          'SKU': 'PROD-001',
          'Nombre': 'Laptop HP ProBook 15"',
          'Descripcion': 'Core i5 16GB RAM 512GB SSD',
          'Precio': 850.00,
          'Costo': 650.00,
          'Stock': 10,
          'StockMinimo': 3,
          'Categoria': 'Equipos Cómputo',
          'Unidad': 'unidad',
          'Impuesto': 7
        },
        {
          'SKU': 'PROD-002',
          'Nombre': 'Mouse Inalámbrico Logitech',
          'Descripcion': 'Conexión USB 2.4GHz',
          'Precio': 25.00,
          'Costo': 15.00,
          'Stock': 50,
          'StockMinimo': 5,
          'Categoria': 'Hardware',
          'Unidad': 'unidad',
          'Impuesto': 7
        }
      ];
      exportToExcel(templateData, 'Plantilla_Importacion_Productos', 'Productos');
    } else {
      const templateData = [
        {
          'Nombre': 'Comercializadora San José S.A.C.',
          'Identificación': '20601234567',
          'Tipo': 'client',
          'Email': 'ventas@sanjose.com',
          'Telefono': '+507 6890-1234',
          'Dirección': 'Av. Principal 123, Vía España',
          'TipoContribuyente': 'Persona Jurídica'
        },
        {
          'Nombre': 'Juan Pérez González',
          'Identificación': '8-890-1234',
          'Tipo': 'client',
          'Email': 'juan.perez@gmail.com',
          'Telefono': '+507 6123-4567',
          'Dirección': 'Calle Los Olivos 456, El Carmen',
          'TipoContribuyente': 'Persona Natural'
        }
      ];
      exportToExcel(templateData, 'Plantilla_Importacion_Clientes', 'Clientes');
    }
  };

  // ==========================================
  // EXCEL FILE PARSING & PREVIEW
  // ==========================================

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsedFileName(file.name);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!json || json.length === 0) {
          throw new Error('El archivo Excel está vacío o no se pudieron leer filas válidas.');
        }

        setParsedData(json);
        setImportStatus({
          type: 'success',
          text: `Se leyeron correctamente ${json.length} filas del archivo "${file.name}". Revisa la vista previa antes de guardar.`
        });
      } catch (err: any) {
        setImportStatus({
          type: 'error',
          text: `Error al procesar el archivo Excel: ${err.message}`
        });
      }
    };

    reader.readAsBinaryString(file);
  };

  // ==========================================
  // PROCESS BULK INSERTION TO INDEXEDDB
  // ==========================================

  const handleConfirmImport = async () => {
    if (!parsedData || parsedData.length === 0) return;

    setIsProcessing(true);
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    try {
      if (importType === 'products') {
        for (const row of parsedData) {
          const keys = Object.keys(row);
          const getValue = (possibleNames: string[]) => {
            const foundKey = keys.find(k => possibleNames.some(p => k.toLowerCase().trim().includes(p.toLowerCase())));
            return foundKey ? row[foundKey] : undefined;
          };

          const sku = String(getValue(['sku', 'código', 'codigo', 'id']) || `PROD-${Date.now()}-${Math.floor(Math.random()*100)}`).trim();
          const name = String(getValue(['nombre', 'producto', 'item', 'descripcion']) || 'Producto Importado').trim();
          const description = String(getValue(['descripcion', 'detalle', 'notas']) || '').trim();
          const price = parseFloat(getValue(['precio', 'price', 'pvp', 'venta']) || 0);
          const cost = parseFloat(getValue(['costo', 'cost', 'compra']) || 0);
          const stock = parseInt(getValue(['stock', 'cantidad', 'inventario']) || 0, 10);
          const minStockAlert = parseInt(getValue(['stockminimo', 'alerta', 'minimo']) || 3, 10);
          const category = String(getValue(['categoria', 'categoría', 'tipo']) || 'General').trim();
          const unit = String(getValue(['unidad', 'unit', 'medida']) || 'unidad').trim();
          const rawTax = parseFloat(getValue(['impuesto', 'tax', 'iva', 'igv', 'itbms']) || 0);

          // Allowed tax rates in type TaxRate
          const taxRate: TaxRate = [0, 7, 10, 16, 19].includes(rawTax) ? (rawTax as TaxRate) : 0;

          if (!name) continue;

          // Check if product with same SKU already exists
          const existing = await db.products.where('sku').equals(sku).first();

          const productData: Product = {
            id: existing ? existing.id : `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            sku,
            name,
            description,
            price: isNaN(price) ? 0 : price,
            cost: isNaN(cost) ? 0 : cost,
            stock: isNaN(stock) ? 0 : stock,
            minStockAlert: isNaN(minStockAlert) ? 3 : minStockAlert,
            category: category || 'General',
            unit: unit || 'unidad',
            taxRate,
            type: 'product',
            createdAt: existing ? existing.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          if (existing) {
            if (duplicateOption === 'update') {
              await db.products.put(productData);
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            await db.products.add(productData);
            insertedCount++;
          }
        }

        setImportStatus({
          type: 'success',
          text: `¡Importación de productos completada! ${insertedCount} agregados, ${updatedCount} actualizados, ${skippedCount} omitidos.`
        });

      } else {
        // CONTACTS IMPORT
        for (const row of parsedData) {
          const keys = Object.keys(row);
          const getValue = (possibleNames: string[]) => {
            const foundKey = keys.find(k => possibleNames.some(p => k.toLowerCase().trim().includes(p.toLowerCase())));
            return foundKey ? row[foundKey] : undefined;
          };

          const name = String(getValue(['nombre', 'razon', 'cliente', 'contacto']) || 'Contacto Importado').trim();
          const rucOrCedula = String(getValue(['identificacion', 'identificación', 'dni', 'ruc', 'cedula', 'taxid']) || '').trim();
          const email = String(getValue(['email', 'correo']) || '').trim();
          const phone = String(getValue(['telefono', 'teléfono', 'celular', 'phone']) || '').trim();
          const address = String(getValue(['direccion', 'dirección', 'address']) || '').trim();
          const typeRaw = String(getValue(['tipo', 'type']) || 'client').toLowerCase();
          const type = typeRaw.includes('prov') ? 'provider' : typeRaw.includes('amb') ? 'both' : 'client';

          if (!name) continue;

          // Check existing contact by rucOrCedula
          let existing = null;
          if (rucOrCedula) {
            existing = await db.contacts.where('rucOrCedula').equals(rucOrCedula).first();
          }

          const contactData: Contact = {
            id: existing ? existing.id : `cnt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name,
            rucOrCedula,
            email,
            phone,
            address,
            type,
            creditLimit: 0,
            balance: existing ? existing.balance : 0,
            createdAt: existing ? existing.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          if (existing) {
            if (duplicateOption === 'update') {
              await db.contacts.put(contactData);
              updatedCount++;
            } else {
              skippedCount++;
            }
          } else {
            await db.contacts.add(contactData);
            insertedCount++;
          }
        }

        setImportStatus({
          type: 'success',
          text: `¡Importación de clientes completada! ${insertedCount} contactos agregados, ${updatedCount} actualizados, ${skippedCount} omitidos.`
        });
      }

      setParsedData([]);
      setParsedFileName(null);

    } catch (err: any) {
      setImportStatus({
        type: 'error',
        text: `Error durante la inserción en la base de datos: ${err.message}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Top Banner Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-400 via-emerald-300 to-transparent pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold uppercase tracking-wider">
            <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
            <span>Centro de Carga y Descarga Masiva (Excel / CSV)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Gestión de Datos: Exportación e Importación
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Descarga rápidamente tus listas de productos, clientes, facturas de venta y compras en hojas de cálculo <strong className="text-white">Excel (.xlsx)</strong> para no perder información, o sube archivos Excel para agregar cientos de productos y clientes en segundos.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportFullMasterDatabase}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-extrabold rounded-2xl shadow-lg transition-all flex items-center gap-2 text-sm sm:text-base cursor-pointer"
            >
              <Download className="w-5 h-5" />
              <span>Descargar Base de Datos Completa (Excel)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Status Banner */}
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
            className="text-xs font-bold hover:underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* SECCIÓN SUPABASE: SINCRONIZACIÓN EN TIEMPO REAL & ESTADO */}
      <SupabaseSyncManager />

      {/* SECCIÓN CLOUD & WEB WORKER: RESPALDO AUTOMATIZADO EN GOOGLE DRIVE E INDEXEDDB */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: GOOGLE DRIVE (GOOGLE WORKSPACE) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>Google Drive Cloud Backup</span>
                    {driveUser ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Conectado
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                        No Conectado
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Google Workspace API v3 oficial (Almacenamiento remoto de seguridad)
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Permite que el sistema guarde y sincronice copias de seguridad JSON completas directamente en tu cuenta de Google Drive en la carpeta <strong className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">ImperioPro_Backups</strong>.
            </p>

            {driveUser ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-xs">
                      {driveUser.email?.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{driveUser.displayName || 'Usuario Google'}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{driveUser.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnectGoogleDrive}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Desconectar</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                    Carpeta: <strong className="font-mono text-slate-700">ImperioPro_Backups</strong>
                  </span>
                  <span className="text-emerald-700 font-bold">
                    {driveFiles.length} archivos en la nube
                  </span>
                </div>

                {/* Toggle Sincronización Automática en Segundo Plano */}
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={workerStatus.isAutoDriveSyncEnabled}
                      onChange={(e) => backupWorkerManager.setAutoDriveSync(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Subir automáticamente respaldos a Drive en segundo plano</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Web Worker</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Inicia sesión con Google para autorizar a Imperio Pro a crear y actualizar archivos en la carpeta de respaldos.
                  </span>
                </div>

                {/* Botón Oficial Google Sign-In con estilo oficial */}
                <button
                  onClick={handleConnectGoogleDrive}
                  disabled={isSyncingDrive}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm rounded-xl border border-slate-300 shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer hover:shadow-md disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  <span>{isSyncingDrive ? 'Conectando con Google...' : 'Autorizar y Conectar con Google Drive'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => handleManualBackupNow(true)}
              disabled={isProcessing || !driveUser}
              className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Cloud className="w-4 h-4" />
              <span>{isProcessing ? 'Subiendo...' : 'Subir Respaldo Ahora a Google Drive'}</span>
            </button>
            {driveUser && (
              <button
                onClick={refreshDriveFiles}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                title="Actualizar lista de archivos de Drive"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* CARD 2: WEB WORKER & STORAGE QUOTA SENTINEL */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>Supervisor de Almacenamiento (Web Worker)</span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Activo
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Auditoría de cuota en segundo plano y persistencia de IndexedDB
                  </p>
                </div>
              </div>
            </div>

            {/* Storage Quota Progress */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-500" />
                  Uso de Almacenamiento Local (IndexedDB):
                </span>
                <span className="font-mono font-extrabold text-slate-900">
                  {workerStatus.lastStorageInfo?.formattedUsage || '0 B'} de {workerStatus.lastStorageInfo?.formattedQuota || 'Calculando...'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    (workerStatus.lastStorageInfo?.percentUsed || 0) > 85
                      ? 'bg-rose-500'
                      : (workerStatus.lastStorageInfo?.percentUsed || 0) > 65
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(2, workerStatus.lastStorageInfo?.percentUsed || 0))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Espacio Libre: <strong className="text-slate-700 font-mono">{workerStatus.lastStorageInfo?.formattedFree || 'N/A'}</strong></span>
                <span className="font-bold">
                  {(workerStatus.lastStorageInfo?.percentUsed || 0).toFixed(1)}% utilizado (Umbral: {workerStatus.thresholdPercent}%)
                </span>
              </div>
            </div>

            {/* Storage Persistence Status */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-600" />
                <span className="font-medium text-slate-700">Persistencia de Datos:</span>
                <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                  workerStatus.lastStorageInfo?.persisted
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {workerStatus.lastStorageInfo?.persisted ? 'Garantizada por SO' : 'Estándar'}
                </span>
              </div>

              {!workerStatus.lastStorageInfo?.persisted && (
                <button
                  onClick={handleRequestPersistence}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                >
                  Garantizar Persistencia
                </button>
              )}
            </div>

            {/* Interval Selector */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Intervalo de Respaldo Automático:</span>
              <select
                value={workerStatus.intervalMinutes}
                onChange={(e) => backupWorkerManager.setIntervalMinutes(Number(e.target.value))}
                className="bg-slate-100 border border-slate-300 font-bold text-slate-800 rounded-xl px-2.5 py-1 text-xs cursor-pointer focus:outline-none"
              >
                <option value={15}>Cada 15 minutos</option>
                <option value={30}>Cada 30 minutos</option>
                <option value={60}>Cada 1 hora (Recomendado)</option>
                <option value={120}>Cada 2 horas</option>
                <option value={1440}>Una vez al día (24h)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => handleManualBackupNow(false)}
              disabled={isProcessing}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Database className="w-4 h-4" />
              <span>{isProcessing ? 'Procesando...' : 'Guardar Respaldo Local en IndexedDB'}</span>
            </button>
            <button
              onClick={handleDownloadFullJsonBackup}
              disabled={isProcessing}
              className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Descargar archivo JSON estructurado con checksum SHA-256"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportar JSON</span>
            </button>
          </div>
        </div>

      </div>

      {/* SECCIÓN RESTAURACIÓN DE RESPALDO JSON & HISTORIAL */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              <span>Restauración y Validación de Respaldos JSON</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Recupera tu catálogo, clientes y facturas a partir de cualquier archivo JSON de respaldo oficial con verificación de integridad criptográfica SHA-256.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="jsonRestoreMode"
                checked={restoreMode === 'update'}
                onChange={() => setRestoreMode('update')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span>Actualizar registros</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-rose-700 font-bold ml-2">
              <input
                type="radio"
                name="jsonRestoreMode"
                checked={restoreMode === 'replace'}
                onChange={() => setRestoreMode('replace')}
                className="text-rose-600 focus:ring-rose-500"
              />
              <span>Reemplazar todo</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2">
            <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-4 flex items-center justify-center gap-3 bg-slate-50/70 hover:bg-emerald-50/30 transition-all cursor-pointer">
              <Upload className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-bold text-slate-700 truncate">
                {jsonRestoreFileName ? `Archivo seleccionado: ${jsonRestoreFileName}` : 'Seleccionar archivo .json de respaldo para restaurar'}
              </span>
              <input
                type="file"
                accept=".json"
                onChange={handleSelectJsonRestoreFile}
                className="hidden"
              />
            </label>
          </div>

          <button
            onClick={handleConfirmJsonRestore}
            disabled={!jsonRestoreContent || isRestoringJson}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isRestoringJson ? 'Validando y Restaurando...' : 'Validar y Restaurar Datos'}</span>
          </button>
        </div>

        {/* Historial de Respaldos Guardados en IndexedDB */}
        {localBackups.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <span>Historial de Respaldos en IndexedDB ({localBackups.length})</span>
              </h4>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-56">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <th className="p-2.5">Fecha / Hora</th>
                    <th className="p-2.5">Archivo</th>
                    <th className="p-2.5">Origen</th>
                    <th className="p-2.5 text-right">Registros</th>
                    <th className="p-2.5 text-right">Tamaño</th>
                    <th className="p-2.5 text-center">Estado</th>
                    <th className="p-2.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {localBackups.slice(0, 8).map((bkp) => (
                    <tr key={bkp.id} className="hover:bg-slate-50 font-medium">
                      <td className="p-2.5 text-slate-500 whitespace-nowrap">
                        {new Date(bkp.timestamp).toLocaleString('es-PA')}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-800">{bkp.filename}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          bkp.type === 'auto_worker' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {bkp.type === 'auto_worker' ? 'Web Worker' : 'Manual'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">{bkp.recordCount}</td>
                      <td className="p-2.5 text-right font-mono">{(bkp.size / 1024).toFixed(1)} KB</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          bkp.status === 'uploaded_drive'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {bkp.status === 'uploaded_drive' ? 'Drive + Local' : 'Local'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right">
                        {bkp.dataJson && (
                          <button
                            onClick={() => backupWorkerManager.downloadBackupFile(bkp.dataJson!, bkp.filename)}
                            className="p-1 hover:bg-slate-200 text-slate-700 rounded transition-colors cursor-pointer"
                            title="Descargar archivo JSON"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN PROGRAMACIÓN DE COPIAS DE SEGURIDAD & HISTORIAL DE SYNCSERVICE */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Programación de Sincronización Multi-PC y Registro de syncService
                </h3>
                <p className="text-xs text-slate-500">
                  Configura la frecuencia con la que las computadoras conectadas transmiten y descargan cambios entre sí.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleForceFullSync}
              disabled={isManualSyncing}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Descargar datos nuevos del servidor y enviar cambios locales"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
              <span>{isManualSyncing ? 'Sincronizando...' : 'Forzar Sincronización Ahora'}</span>
            </button>
          </div>
        </div>

        {/* CONTROLES DE INTERVALO AUTOMÁTICO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 items-center">
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Intervalo de Verificación y Respaldo Automático</span>
            </label>
            <p className="text-xs text-slate-500">
              Frecuencia con la que esta PC consulta al servidor central si otra computadora creó facturas, clientes o rebajó stock.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {[
                { sec: 5, label: '5s (Mostrador Flash)' },
                { sec: 10, label: '10s (Rápido)' },
                { sec: 30, label: '30s (Balanceado)' },
                { sec: 60, label: '1 min' },
                { sec: 300, label: '5 min' },
                { sec: 0, label: 'Manual' },
              ].map((opt) => (
                <button
                  key={opt.sec}
                  type="button"
                  onClick={() => handleChangeSyncInterval(opt.sec)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    syncInterval === opt.sec
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Estado Conexión</span>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                Servidor Activo
              </span>
            </div>
            <div className="text-xs text-slate-600">
              <span className="text-slate-400">Última sinc: </span>
              <strong className="text-slate-800 font-mono text-[11px]">
                {lastSyncServerTime ? new Date(lastSyncServerTime).toLocaleTimeString('es-PA') : 'En arranque inicial'}
              </strong>
            </div>
            <div className="text-[11px] text-slate-500">
              Frecuencia actual: <strong className="text-indigo-600">{syncInterval > 0 ? `Cada ${syncInterval} seg` : 'Solo manual'}</strong>
            </div>
          </div>
        </div>

        {/* TABLA DE HISTORIAL DE SYNC SERVICE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Registro de Operaciones de Sincronización ({syncLogs.length})</span>
            </h4>
            {syncLogs.length > 0 && (
              <button
                onClick={handleClearSyncLogs}
                className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                title="Limpiar registro de eventos"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpiar Historial</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-64">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                  <th className="p-2.5">Hora</th>
                  <th className="p-2.5">Tipo</th>
                  <th className="p-2.5 text-center">Registros</th>
                  <th className="p-2.5">Detalle de la Operación</th>
                  <th className="p-2.5 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {syncLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400 text-xs">
                      No hay registros de sincronización aún. Las operaciones periódicas aparecerán aquí automáticamente.
                    </td>
                  </tr>
                ) : (
                  syncLogs.slice(0, 20).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80">
                      <td className="p-2.5 text-slate-500 font-mono whitespace-nowrap text-[11px]">
                        {log.timestamp}
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.type === 'server_pull'
                            ? 'bg-sky-100 text-sky-800'
                            : log.type === 'server_push'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.type === 'upload_all'
                            ? 'bg-indigo-100 text-indigo-800'
                            : log.type === 'auto_sync'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {log.type === 'server_pull' ? '📥 Descarga Servidor'
                            : log.type === 'server_push' ? '📤 Envío Servidor'
                            : log.type === 'upload_all' ? '☁️ Subida Completa'
                            : log.type === 'auto_sync' ? '⏱️ Programación'
                            : '⚡ Cola'}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-700">
                        {log.itemCount}
                      </td>
                      <td className="p-2.5 text-slate-700 text-xs">
                        {log.details}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          log.status === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {log.status === 'success' ? 'Éxito' : log.status === 'warning' ? 'Aviso' : 'Error'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 1: DOWNLOAD / EXPORT INDIVIDUAL MODULES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <FileDown className="w-5 h-5 text-emerald-600" />
            <span>1. Descargar Listas de Datos en Excel (.xlsx / CSV)</span>
          </h2>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Respaldo de seguridad en hojas de cálculo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Card Products */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between hover:border-amber-300 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">Productos e Inventario</h3>
              <p className="text-xs text-slate-500">
                {products.length} productos registrados con precios, costos y stock.
              </p>
            </div>
            <button
              onClick={handleExportProducts}
              className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span>Descargar Excel</span>
            </button>
          </div>

          {/* Card Contacts */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between hover:border-sky-300 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">Clientes y Contactos</h3>
              <p className="text-xs text-slate-500">
                {contacts.length} clientes y proveedores con DNI/RUC y teléfonos.
              </p>
            </div>
            <button
              onClick={handleExportContacts}
              className="w-full py-2 px-3 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-600" />
              <span>Descargar Excel</span>
            </button>
          </div>

          {/* Card Sales / Invoices */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between hover:border-emerald-300 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">Facturas y Ventas</h3>
              <p className="text-xs text-slate-500">
                {invoices.length} comprobantes con subtotal, cliente y montos.
              </p>
            </div>
            <button
              onClick={handleExportInvoices}
              className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Descargar Excel</span>
            </button>
          </div>

          {/* Card Expenses */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between hover:border-rose-300 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">Gastos y Compras</h3>
              <p className="text-xs text-slate-500">
                {expenses.length} compras a proveedores y gastos registrados.
              </p>
            </div>
            <button
              onClick={handleExportExpenses}
              className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-rose-600" />
              <span>Descargar Excel</span>
            </button>
          </div>

          {/* Card Quotes */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between hover:border-purple-300 transition-all">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">Cotizaciones</h3>
              <p className="text-xs text-slate-500">
                {quotes.length} presupuestos enviados a clientes.
              </p>
            </div>
            <button
              onClick={handleExportQuotes}
              className="w-full py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-purple-600" />
              <span>Descargar Excel</span>
            </button>
          </div>

        </div>
      </div>

      {/* SECTION 2: IMPORT / CARGA MASIVA DE EXCEL */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Upload className="w-6 h-6 text-sky-600" />
              <span>2. Carga Masiva desde Archivo Excel (.xlsx / .csv)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Agrega decenas o cientos de productos o clientes a la vez subiendo una hoja de cálculo.
            </p>
          </div>

          {/* Type Selector Buttons */}
          <div className="flex p-1 bg-slate-100 rounded-2xl text-xs font-bold text-slate-600 self-start sm:self-auto">
            <button
              onClick={() => {
                setImportType('products');
                setParsedData([]);
                setParsedFileName(null);
              }}
              className={`py-2 px-4 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                importType === 'products' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4 text-amber-600" />
              <span>Cargar Productos</span>
            </button>

            <button
              onClick={() => {
                setImportType('contacts');
                setParsedData([]);
                setParsedFileName(null);
              }}
              className={`py-2 px-4 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                importType === 'contacts' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-sky-600" />
              <span>Cargar Clientes</span>
            </button>
          </div>
        </div>

        {/* Step 1: Download Sample Template */}
        <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-sky-950 text-sm">
                Plantilla de Ejemplo para {importType === 'products' ? 'Productos' : 'Clientes'}
              </h4>
              <p className="text-xs text-sky-800 leading-relaxed">
                Descarga una plantilla de prueba con los nombres de columna adecuados para evitar errores de formato.
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Plantilla ({importType === 'products' ? 'Productos.xlsx' : 'Clientes.xlsx'})</span>
          </button>
        </div>

        {/* Step 2: Upload Area */}
        <div className="space-y-4">
          <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            Seleccionar o soltar archivo Excel (.xlsx / .csv):
          </label>

          <label className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-50/50 hover:bg-sky-50/30 transition-all cursor-pointer group text-center">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-sky-600 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <Upload className="w-7 h-7" />
            </div>

            <div>
              <span className="font-extrabold text-slate-900 text-sm block">
                {parsedFileName ? `Archivo cargado: ${parsedFileName}` : 'Haz clic aquí para seleccionar tu archivo Excel'}
              </span>
              <span className="text-xs text-slate-500 block mt-1">
                Formatos soportados: Microsoft Excel (.xlsx, .xls) o archivo de valores por coma (.csv)
              </span>
            </div>

            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Duplicate Resolution Options */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <span className="text-xs font-bold text-slate-700">
            Si se encuentran registros existentes ({importType === 'products' ? 'mismo SKU' : 'mismo DNI/RUC'}):
          </span>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="duplicateOption"
                checked={duplicateOption === 'update'}
                onChange={() => setDuplicateOption('update')}
                className="text-sky-600 focus:ring-sky-500"
              />
              <span>Actualizar datos existentes</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="duplicateOption"
                checked={duplicateOption === 'skip'}
                onChange={() => setDuplicateOption('skip')}
                className="text-sky-600 focus:ring-sky-500"
              />
              <span>Omitir duplicados</span>
            </label>
          </div>
        </div>

        {/* Preview Table of Parsed Excel Rows */}
        {parsedData.length > 0 && (
          <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-sky-600" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  Vista Previa de Datos Detectados ({parsedData.length} registros)
                </h3>
              </div>

              <button
                onClick={handleConfirmImport}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50"
              >
                <FileCheck className="w-4 h-4" />
                <span>{isProcessing ? 'Guardando en Sistema...' : `Confirmar e Importar ${parsedData.length} Registros`}</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-80">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold uppercase">
                    <th className="p-3">#</th>
                    {Object.keys(parsedData[0]).slice(0, 7).map((colKey) => (
                      <th key={colKey} className="p-3 whitespace-nowrap">{colKey}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {parsedData.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 font-medium text-slate-800">
                      <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                      {Object.keys(row).slice(0, 7).map((colKey, cIdx) => (
                        <td key={cIdx} className="p-3 max-w-xs truncate">
                          {String(row[colKey])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parsedData.length > 10 && (
              <p className="text-[11px] text-slate-500 text-center font-medium italic">
                Mostrando las primeras 10 filas de {parsedData.length} registros detectados en el archivo.
              </p>
            )}
          </div>
        )}

      </div>

    </div>
  );
};
