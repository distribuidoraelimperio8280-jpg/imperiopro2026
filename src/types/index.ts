export type TaxRate = 0 | 7 | 10 | 16 | 19;

export type ContactType = 'client' | 'provider' | 'both';

export interface AssociatedPerson {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  notifyDueDate: boolean;
}

export interface ContactComment {
  id: string;
  author: string;
  isUser: boolean;
  text: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  rucOrCedula: string;
  dv?: string;
  taxpayerType?: 'Persona Jurídica' | 'Persona Natural';
  email: string;
  phone: string;
  phone2?: string;
  mobile?: string;
  whatsapp?: string;
  address: string;
  province?: string;
  district?: string;
  corregimiento?: string;
  type: ContactType;
  creditLimit: number;
  paymentTerms?: string;
  priceList?: string;
  assignedSalesperson?: string;
  receivableAccount?: string;
  payableAccount?: string;
  taxWithholding?: string;
  associatedPeople?: AssociatedPerson[];
  comments?: ContactComment[];
  sendAccountStatement?: boolean;
  balance: number;
  lat?: number;
  lng?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  material?: string;
  unit: string;
  price: number;
  cost: number;
  taxRate: TaxRate;
  type: 'product' | 'service';
  stock: number;
  minStockAlert: number;
  min_stock?: number;
  description: string;
  imageUrl?: string;
  image_url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  name: string;
  description?: string;
  quantity: number;
  price: number;
  taxRate: TaxRate;
  discount: number; // percentage 0-100
  subtotal: number;
  taxAmount: number;
  total: number;
}

export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'credit' | 'check' | 'corporate_card';

export interface ExpenseAttachment {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
}

export interface Invoice {
  id: string;
  code: string;
  type: 'sale' | 'purchase';
  contactId: string;
  contactName: string;
  contactRuc: string;
  contactDv?: string;
  contactAddress?: string;
  contactEmail?: string;
  contactPhone?: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  paidAmount: number;
  status: InvoiceStatus;
  paymentMethod: PaymentMethod;
  sellerName?: string;
  notes?: string;
  isSynced: boolean;
  offlineCreated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // 0, 7, 10, 15
  subtotal: number;
  taxAmount: number;
  total: number;
  productId?: string;
}

export interface Expense {
  id: string;
  code: string;
  // Provider info
  providerId?: string;
  providerName: string;
  providerRuc?: string;
  providerDv?: string;
  providerAddress?: string;
  providerPhone?: string;
  providerEmail?: string;

  // Invoice / Document info
  invoiceNumber?: string;
  date: string; // Fecha de Emisión
  dueDate?: string; // Fecha de Vencimiento
  receptionDate?: string; // Fecha de Recepción / Registro
  
  // Advanced Taxonomy
  expenseType?: string; // Tipo de Gasto (Nivel General: p. ej. "C. GASTOS DE FLOTA Y TRANSPORTE")
  category: string; // Categoría de Gasto (Nivel Específico: p. ej. "Combustible y Lubricantes")

  // Operation & Fleet
  costCenter?: string; // Centro de Costo / Sucursal (Administración, Ventas, Depósito Chiriquí, etc.)
  vehiclePlate?: string; // Placa / Vehículo Asociado
  vehicleName?: string; // Nombre descriptivo del vehículo (opcional)

  // Fiscal & Tax Deductibility
  isDeductible?: boolean; // ¿Es Deducible de Impuestos? (Sí / No)

  // Payment
  paymentMethod: PaymentMethod; // cash, transfer, check, corporate_card, card, credit

  // Digital Attachment (PDF / Image)
  attachment?: ExpenseAttachment;

  // Dynamic Items Breakdown
  items?: ExpenseItem[];

  // Document Totals
  subtotal?: number;
  taxAmount: number; // ITBMS
  amount: number; // Monto Total de la compra/gasto

  // Accounting & Internal Audit
  expenseAccount?: string;
  registeredBy?: string;
  approvedBy?: string;
  notes: string;

  isSynced: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type QuoteStatus = 'pending' | 'accepted' | 'rejected' | 'converted';

export interface QuoteItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  taxRate: TaxRate;
  discount: number; // percentage 0-100
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface Quote {
  id: string;
  code: string;
  contactId: string;
  contactName: string;
  contactRuc: string;
  contactDv?: string;
  contactPhone?: string;
  date: string;
  validUntil: string;
  items: QuoteItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  status: QuoteStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceTemplateConfig {
  templateId: string; // 1 to 25
  templateName: string;
  category: 'modern' | 'executive' | 'minimal' | 'tech' | 'creative' | 'fiscal';
  primaryColor: string;
  accentColor: string;
  headerBgColor: string;
  fontFamily: 'sans' | 'serif' | 'mono' | 'geometric';
  headerStyle: 'standard' | 'full-banner' | 'centered' | 'split-side';
  tableStyle: 'striped' | 'minimal' | 'bordered' | 'solid-header';
  borderRadius: 'none' | 'rounded' | 'large';
  showLogo: boolean;
  showQRCode: boolean;
  showTaxBreakdown: boolean;
  showWatermark: boolean;
  watermarkText?: string;
  customFooterNote?: string;
  bankDetailsNote?: string;
}

export interface CompanyProfile {
  name: string;
  ruc: string;
  dv?: string;
  ownerName?: string;
  whatsapp?: string;
  mobile?: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  taxName: string;
  logoUrl?: string;
  templateConfig?: InvoiceTemplateConfig;
}

export interface CreditNoteItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  taxRate: TaxRate;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface CreditNote {
  id: string;
  code: string;
  invoiceId?: string;
  invoiceCode?: string;
  contactId: string;
  contactName: string;
  contactRuc: string;
  contactDv?: string;
  contactPhone?: string;
  date: string;
  reason: string;
  adjustInventory: boolean;
  items: CreditNoteItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncQueueItem {
  id: string;
  entity: 'invoices' | 'contacts' | 'products' | 'expenses' | 'quotes' | 'companyProfile' | 'creditNotes' | 'tasks';
  operation: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: string;
  synced: boolean;
}

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'upcoming' | 'in-progress' | 'done' | 'archived';

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  assignee: string;
  priority: TaskPriority;
  status: TaskStatus;
  description?: string;
  contactId?: string; // Optional link to a contact
  invoiceId?: string; // Optional link to an invoice
  createdAt: string;
  updatedAt: string;
}

export interface LocalBackupRecord {
  id: string;
  timestamp: string;
  type: 'manual' | 'auto_worker' | 'cloud_drive';
  filename: string;
  size: number;
  recordCount: number;
  checksum: string;
  dataJson?: string;
  status: 'stored_local' | 'uploaded_drive' | 'synced';
  driveFileId?: string;
  driveFileName?: string;
  notes?: string;
}
