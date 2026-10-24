import Dexie, { type Table } from 'dexie';
import type { Contact, Product, Invoice, Expense, CompanyProfile, SyncQueueItem, Quote, CreditNote, Task, LocalBackupRecord } from '../types';

export class AlegraDatabase extends Dexie {
  contacts!: Table<Contact, string>;
  products!: Table<Product, string>;
  invoices!: Table<Invoice, string>;
  expenses!: Table<Expense, string>;
  quotes!: Table<Quote, string>;
  creditNotes!: Table<CreditNote, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  companyProfile!: Table<CompanyProfile & { id: string }, string>;
  tasks!: Table<Task, string>;
  backups!: Table<LocalBackupRecord, string>;

  constructor() {
    super('AlegraERPDatabase');
    
    // Schema definitions
    this.version(1).stores({
      contacts: 'id, name, rucOrCedula, type, email',
      products: 'id, name, sku, category, type, stock',
      invoices: 'id, code, contactId, status, date, isSynced',
      expenses: 'id, code, providerId, date, isSynced',
      quotes: 'id, code, contactId, status, date',
      creditNotes: 'id, code, invoiceId, contactId, date',
      syncQueue: 'id, entity, operation, synced, timestamp',
      companyProfile: 'id'
    });

    this.version(2).stores({
      tasks: 'id, title, status, assignee, dueDate'
    });

    this.version(3).stores({
      backups: 'id, timestamp, type, filename, status'
    });
  }
}

export const db = new AlegraDatabase();

// Seed Initial Company Profile if clean, but keep database ready for real data without sample records
export async function seedInitialDataIfNeeded() {
  const existingCompany = await db.companyProfile.get('default');
  if (!existingCompany) {
    await db.companyProfile.put({
      id: 'default',
      name: 'DISTRIBUIDORA EL IMPERIO',
      ruc: '155689021-2-2026',
      email: 'distribuidoraelimperio8280@gmail.com',
      phone: '64429775',
      whatsapp: '64429775',
      mobile: '64429775',
      address: 'Panamá, República de Panamá',
      currency: 'USD',
      taxName: 'ITBMS (7%)',
    });
  }

  // Automatic clean run: if system has legacy sample data, purge it once to start clean
  if (!localStorage.getItem('system_cleaned_v2')) {
    await clearAllSampleData();
    localStorage.setItem('system_cleaned_v2', 'true');
  }
}

// Function to clear all sample or existing records to start completely clean
export async function clearAllSampleData() {
  await Promise.all([
    db.contacts.clear(),
    db.products.clear(),
    db.invoices.clear(),
    db.expenses.clear(),
    db.quotes.clear(),
    db.creditNotes.clear(),
    db.syncQueue.clear(),
  ]);

  // Ensure default company profile remains intact
  const existingCompany = await db.companyProfile.get('default');
  if (!existingCompany) {
    await db.companyProfile.put({
      id: 'default',
      name: 'DISTRIBUIDORA EL IMPERIO',
      ruc: '155689021-2-2026',
      email: 'distribuidoraelimperio8280@gmail.com',
      phone: '64429775',
      whatsapp: '64429775',
      mobile: '64429775',
      address: 'Panamá, República de Panamá',
      currency: 'USD',
      taxName: 'ITBMS (7%)',
    });
  }
}

// Carga de productos modelo para ferreterías, contratistas y proyectos en Panamá
export async function seedSampleHardwareProducts(): Promise<number> {
  const sampleProducts: Product[] = [
    {
      id: 'prod-ferr-01',
      name: 'Tubo Conduit PVC Eléctrico 1/2" x 3m',
      sku: 'PVC-CND-050',
      category: 'Materiales Eléctricos',
      material: 'PVC Rígido',
      unit: 'Tubo (3m)',
      price: 3.25,
      cost: 1.85,
      taxRate: 7,
      type: 'product',
      stock: 120,
      minStockAlert: 25,
      description: 'Tubo para canalización eléctrica de alta resistencia en paredes y losas.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prod-ferr-02',
      name: 'Cable THHN #12 AWG Cobre 100m Negro',
      sku: 'CBL-THHN-12BK',
      category: 'Materiales Eléctricos',
      material: 'Cobre / PVC',
      unit: 'Rollo (100m)',
      price: 58.50,
      cost: 41.20,
      taxRate: 7,
      type: 'product',
      stock: 35,
      minStockAlert: 10,
      description: 'Conductor eléctrico de cobre suave 600V certificado para canalizaciones.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prod-ferr-03',
      name: 'Cemento Gris de Uso General 42.5 kg',
      sku: 'CEM-GRIS-42KG',
      category: 'Ferretería y Construcción',
      material: 'Cemento Pórtland',
      unit: 'Saco',
      price: 10.75,
      cost: 8.40,
      taxRate: 0,
      type: 'product',
      stock: 250,
      minStockAlert: 50,
      description: 'Cemento de fraguado controlado para morteros y estructuras de concreto.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prod-ferr-04',
      name: 'Varilla Corrugada de Acero 3/8" Grado 60 x 9m',
      sku: 'ACR-VAR-038',
      category: 'Ferretería y Construcción',
      material: 'Acero Estructural',
      unit: 'Unidad (9m)',
      price: 5.90,
      cost: 4.15,
      taxRate: 7,
      type: 'product',
      stock: 320,
      minStockAlert: 60,
      description: 'Refuerzo de acero corrugado de alta adherencia para vigas y columnas.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prod-ferr-05',
      name: 'Disco de Corte Metal / Inox 4-1/2" DeWalt',
      sku: 'DSC-MET-450',
      category: 'Herramientas y Accesorios',
      material: 'Abrasivo Reforzado',
      unit: 'Unidad',
      price: 1.65,
      cost: 0.95,
      taxRate: 7,
      type: 'product',
      stock: 180,
      minStockAlert: 30,
      description: 'Disco abrasivo ultrafino para cortes precisos en metales y tuberías.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prod-ferr-06',
      name: 'Pintura Látex Blanco Construcción Galón',
      sku: 'PNT-LTX-BL1G',
      category: 'Pinturas y Acabados',
      material: 'Acrílica / Agua',
      unit: 'Galón',
      price: 16.50,
      cost: 11.80,
      taxRate: 7,
      type: 'product',
      stock: 45,
      minStockAlert: 12,
      description: 'Pintura arquitectónica de excelente cubrimiento para interiores y muros.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prod-ferr-07',
      name: 'Adaptador Terminal Macho PVC Eléctrico 1/2"',
      sku: 'PVC-MCH-050',
      category: 'Materiales Eléctricos',
      material: 'PVC',
      unit: 'Unidad',
      price: 0.45,
      cost: 0.18,
      taxRate: 7,
      type: 'product',
      stock: 350,
      minStockAlert: 50,
      description: 'Conector roscado de acople para ductos en cajas de conexión octogonales.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prod-ferr-08',
      name: 'Cerradura Cilindro Seguridad para Proyectos',
      sku: 'CRD-SEG-01',
      category: 'Ferretería y Construcción',
      material: 'Acero Inox / Bronce',
      unit: 'Juego',
      price: 22.50,
      cost: 15.00,
      taxRate: 7,
      type: 'product',
      stock: 30,
      minStockAlert: 8,
      description: 'Mecanismo embutido de alta seguridad para puertas principales de obra.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  await db.products.bulkPut(sampleProducts);
  return sampleProducts.length;
}
