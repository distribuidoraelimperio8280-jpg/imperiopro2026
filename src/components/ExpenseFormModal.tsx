import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Receipt,
  User,
  Calculator,
  Plus,
  Trash2,
  Building2,
  ShoppingBag,
  FileText,
  Calendar,
  DollarSign,
  Printer,
  Package,
  AlertCircle,
  Truck,
  ShieldCheck,
  ShieldAlert,
  Paperclip,
  Upload,
  Eye,
  FileSpreadsheet,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import type { Expense, ExpenseItem, PaymentMethod, ExpenseAttachment } from '../types';
import { db } from '../db/indexedDB';
import { syncService } from '../services/syncService';
import { useLiveQuery } from 'dexie-react-hooks';
import { ContactFormModal } from './ContactFormModal';
import { printExpenseVoucherPDF } from '../services/pdfService';
import { cleanForFirestore } from '../services/cloudDataService';
import { 
  EXPENSE_TAXONOMY, 
  COST_CENTERS, 
  VEHICLE_FLEET_PRESETS,
  findGroupForCategory 
} from '../data/expenseTaxonomy';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit?: Expense | null;
  onSaved?: (savedExpense: Expense, andPrint?: boolean) => void;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({ 
  isOpen, 
  onClose,
  expenseToEdit,
  onSaved
}) => {
  const contacts = useLiveQuery(() => db.contacts.toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const companyProfile = useLiveQuery(() => db.companyProfile.get('default'), []);

  const isEditing = Boolean(expenseToEdit);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const safeNum = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const fmtNum = (val: any): string => {
    return safeNum(val).toFixed(2);
  };

  // Section fold state
  const [openSections, setOpenSections] = useState<string[]>([
    'provider',
    'document',
    'items',
    'attachment',
    'totals'
  ]);

  // A. Provider Info
  const [providerId, setProviderId] = useState('');
  const [providerName, setProviderName] = useState('');
  const [providerRuc, setProviderRuc] = useState('');
  const [providerDv, setProviderDv] = useState('');
  const [providerAddress, setProviderAddress] = useState('');
  const [providerPhone, setProviderPhone] = useState('');
  const [providerEmail, setProviderEmail] = useState('');

  // B. Document Info & Classification
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [receptionDate, setReceptionDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Advanced Taxonomy: Tipo de Gasto & Categoría
  const [expenseType, setExpenseType] = useState(EXPENSE_TAXONOMY[0].name);
  const [category, setCategory] = useState(EXPENSE_TAXONOMY[0].categories[0]);
  
  // Centros de Costo & Flota
  const [costCenter, setCostCenter] = useState<string>(COST_CENTERS[0]);
  const [customCostCenter, setCustomCostCenter] = useState<string>('');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [customVehiclePlate, setCustomVehiclePlate] = useState<string>('');

  // Fiscal Deductibility & Payment Method
  const [isDeductible, setIsDeductible] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [expenseAccount, setExpenseAccount] = useState('5101 - Costo de Ventas e Insumos Operativos');

  // Digital Attachment
  const [attachment, setAttachment] = useState<ExpenseAttachment | null>(null);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);

  // C. Dynamic Items
  const [items, setItems] = useState<ExpenseItem[]>([
    {
      id: 'item-1',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 7,
      subtotal: 0,
      taxAmount: 0,
      total: 0
    }
  ]);

  // D. Audit & Notes
  const [notes, setNotes] = useState('');
  const [registeredBy, setRegisteredBy] = useState('JOSE');
  const [approvedBy, setApprovedBy] = useState('ADMINISTRACIÓN');

  // Submitting state & Modal for new Contact
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);

  // Available categories for currently selected expenseType
  const currentCategoryList = useMemo(() => {
    const group = EXPENSE_TAXONOMY.find(g => g.name === expenseType);
    return group ? group.categories : [];
  }, [expenseType]);

  // Whether current category requires/suggests vehicle plate (flota / combustible)
  const isVehicleRelated = useMemo(() => {
    return (
      expenseType.includes('FLOTA') ||
      expenseType.includes('TRANSPORTE') ||
      category.toLowerCase().includes('combustible') ||
      category.toLowerCase().includes('vehículo') ||
      category.toLowerCase().includes('camión') ||
      category.toLowerCase().includes('llantas') ||
      category.toLowerCase().includes('peaje')
    );
  }, [expenseType, category]);

  // Initialize or Reset form on open
  useEffect(() => {
    if (!isOpen) return;

    if (expenseToEdit) {
      // Pre-fill Provider
      setProviderId(expenseToEdit.providerId || '');
      setProviderName(expenseToEdit.providerName || '');
      setProviderRuc(expenseToEdit.providerRuc || '');
      setProviderDv(expenseToEdit.providerDv || '');
      setProviderAddress(expenseToEdit.providerAddress || '');
      setProviderPhone(expenseToEdit.providerPhone || '');
      setProviderEmail(expenseToEdit.providerEmail || '');

      // Pre-fill Document
      setInvoiceNumber(expenseToEdit.invoiceNumber || '');
      setDate(expenseToEdit.date || new Date().toISOString().split('T')[0]);
      setDueDate(expenseToEdit.dueDate || '');
      setReceptionDate(expenseToEdit.receptionDate || expenseToEdit.date || new Date().toISOString().split('T')[0]);
      
      // Pre-fill Taxonomy
      const matchedGroup = expenseToEdit.expenseType
        ? EXPENSE_TAXONOMY.find(g => g.name === expenseToEdit.expenseType)
        : findGroupForCategory(expenseToEdit.category || '');

      if (matchedGroup) {
        setExpenseType(matchedGroup.name);
        setCategory(expenseToEdit.category || matchedGroup.categories[0]);
      } else {
        setExpenseType(EXPENSE_TAXONOMY[0].name);
        setCategory(expenseToEdit.category || EXPENSE_TAXONOMY[0].categories[0]);
      }

      // Pre-fill Operation & Fleet
      if (expenseToEdit.costCenter) {
        if (COST_CENTERS.includes(expenseToEdit.costCenter)) {
          setCostCenter(expenseToEdit.costCenter);
          setCustomCostCenter('');
        } else {
          setCostCenter('__custom__');
          setCustomCostCenter(expenseToEdit.costCenter);
        }
      } else {
        setCostCenter(COST_CENTERS[0]);
        setCustomCostCenter('');
      }

      if (expenseToEdit.vehiclePlate) {
        const foundVehicle = VEHICLE_FLEET_PRESETS.find(v => v.plate === expenseToEdit.vehiclePlate);
        if (foundVehicle) {
          setVehiclePlate(foundVehicle.plate);
          setCustomVehiclePlate('');
        } else {
          setVehiclePlate('__custom__');
          setCustomVehiclePlate(expenseToEdit.vehiclePlate);
        }
      } else {
        setVehiclePlate('');
        setCustomVehiclePlate('');
      }

      setIsDeductible(expenseToEdit.isDeductible !== false);
      setPaymentMethod(expenseToEdit.paymentMethod || 'transfer');
      setExpenseAccount(expenseToEdit.expenseAccount || '5101 - Costo de Ventas e Insumos Operativos');
      setAttachment(expenseToEdit.attachment || null);

      // Pre-fill Dynamic Items
      if (expenseToEdit.items && expenseToEdit.items.length > 0) {
        setItems(expenseToEdit.items.map(it => ({
          ...it,
          quantity: safeNum(it.quantity) || 1,
          unitPrice: safeNum(it.unitPrice),
          taxRate: safeNum(it.taxRate),
          subtotal: safeNum(it.subtotal),
          taxAmount: safeNum(it.taxAmount),
          total: safeNum(it.total)
        })));
      } else {
        const itemSubtotal = safeNum(expenseToEdit.subtotal) || (safeNum(expenseToEdit.amount) - safeNum(expenseToEdit.taxAmount));
        setItems([
          {
            id: `item-${Date.now()}`,
            description: expenseToEdit.notes || expenseToEdit.category || 'Compra / Insumos según factura',
            quantity: 1,
            unitPrice: itemSubtotal,
            taxRate: safeNum(expenseToEdit.taxAmount) > 0 ? 7 : 0,
            subtotal: itemSubtotal,
            taxAmount: safeNum(expenseToEdit.taxAmount),
            total: safeNum(expenseToEdit.amount)
          }
        ]);
      }

      // Pre-fill Audit & Notes
      setNotes(expenseToEdit.notes || '');
      setRegisteredBy(expenseToEdit.registeredBy || 'JOSE');
      setApprovedBy(expenseToEdit.approvedBy || 'ADMINISTRACIÓN');
      setOpenSections(['provider', 'document', 'items', 'attachment', 'totals']);
    } else {
      // Default clean state
      setProviderId('');
      setProviderName('');
      setProviderRuc('');
      setProviderDv('');
      setProviderAddress('');
      setProviderPhone('');
      setProviderEmail('');

      setInvoiceNumber('');
      setDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setReceptionDate(new Date().toISOString().split('T')[0]);
      setExpenseType(EXPENSE_TAXONOMY[0].name);
      setCategory(EXPENSE_TAXONOMY[0].categories[0]);
      setCostCenter(COST_CENTERS[0]);
      setCustomCostCenter('');
      setVehiclePlate('');
      setCustomVehiclePlate('');
      setIsDeductible(true);
      setPaymentMethod('transfer');
      setExpenseAccount(EXPENSE_TAXONOMY[0].suggestedAccount);
      setAttachment(null);

      setItems([
        {
          id: `item-${Date.now()}`,
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 7,
          subtotal: 0,
          taxAmount: 0,
          total: 0
        }
      ]);

      setNotes('');
      setRegisteredBy('JOSE');
      setApprovedBy('ADMINISTRACIÓN');
      setOpenSections(['provider', 'document', 'items', 'attachment', 'totals']);
    }
  }, [isOpen, expenseToEdit]);

  // Adjust suggested account when type changes
  const handleExpenseTypeChange = (newType: string) => {
    setExpenseType(newType);
    const group = EXPENSE_TAXONOMY.find(g => g.name === newType);
    if (group) {
      setCategory(group.categories[0]);
      setExpenseAccount(group.suggestedAccount);
      if (group.id === 'flota_transporte' && !vehiclePlate) {
        setVehiclePlate(VEHICLE_FLEET_PRESETS[0].plate);
      }
    }
  };

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    if (newCat.toLowerCase().includes('combustible') && !vehiclePlate) {
      setVehiclePlate(VEHICLE_FLEET_PRESETS[0].plate);
    }
  };

  const toggleSection = (sec: string) => {
    if (openSections.includes(sec)) {
      setOpenSections(openSections.filter(s => s !== sec));
    } else {
      setOpenSections([...openSections, sec]);
    }
  };

  // Provider Selection Handler
  const handleSelectProvider = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId === '__new__') {
      setIsNewContactModalOpen(true);
      return;
    }
    setProviderId(selectedId);
    const found = contacts.find(c => c.id === selectedId);
    if (found) {
      setProviderName(found.name || '');
      setProviderRuc(found.rucOrCedula || '');
      setProviderDv(found.dv || '');
      setProviderAddress(found.address || '');
      setProviderPhone(found.phone || found.mobile || found.whatsapp || '');
      setProviderEmail(found.email || '');
    }
  };

  // Dynamic Items Calculations & Handlers
  const handleItemChange = (index: number, field: keyof ExpenseItem, value: any) => {
    setItems(prevItems => {
      const next = [...prevItems];
      const item = { ...next[index], [field]: value };

      // Recalculate item subtotal, tax and total
      const qty = Math.max(0, parseFloat(String(item.quantity)) || 0);
      const price = Math.max(0, parseFloat(String(item.unitPrice)) || 0);
      const rate = parseFloat(String(item.taxRate)) || 0;

      const subtotal = Math.round(qty * price * 100) / 100;
      const taxAmount = Math.round(subtotal * (rate / 100) * 100) / 100;
      const total = Math.round((subtotal + taxAmount) * 100) / 100;

      item.subtotal = subtotal;
      item.taxAmount = taxAmount;
      item.total = total;

      next[index] = item;
      return next;
    });
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 7,
        subtotal: 0,
        taxAmount: 0,
        total: 0
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setItems([
        {
          id: `item-${Date.now()}`,
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 7,
          subtotal: 0,
          taxAmount: 0,
          total: 0
        }
      ]);
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Quick fill item from product catalog
  const handleSelectProductForItem = (index: number, productId: string) => {
    if (!productId) return;
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setItems(prev => {
      const next = [...prev];
      const item = { ...next[index] };
      item.productId = prod.id;
      item.description = prod.name + (prod.sku ? ` (${prod.sku})` : '');
      item.unitPrice = prod.cost || prod.price || 0;
      item.taxRate = prod.taxRate ?? 7;

      const qty = item.quantity || 1;
      const subtotal = Math.round(qty * item.unitPrice * 100) / 100;
      const taxAmount = Math.round(subtotal * (item.taxRate / 100) * 100) / 100;
      const total = Math.round((subtotal + taxAmount) * 100) / 100;

      item.subtotal = subtotal;
      item.taxAmount = taxAmount;
      item.total = total;

      next[index] = item;
      return next;
    });
  };

  // Document Totals Calculation
  const totals = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;

    items.forEach(it => {
      subtotal += it.subtotal || 0;
      taxTotal += it.taxAmount || 0;
      grandTotal += it.total || 0;
    });

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxTotal * 100) / 100,
      total: Math.round(grandTotal * 100) / 100
    };
  }, [items]);

  // Digital Attachment Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 5MB to preserve local and cloud storage performance
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo seleccionado supera el límite permitido de 5 MB. Por favor seleccione un archivo más ligero.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAttachment({
        name: file.name,
        type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        size: file.size,
        dataUrl,
        uploadedAt: new Date().toISOString()
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save or Update Expense
  const handleSave = async (andPrint: boolean = false) => {
    if (!providerName.trim()) {
      alert('Por favor ingrese el Nombre o Razón Social del Proveedor / Acreedor.');
      return;
    }

    if (items.every(it => !it.description.trim() && it.subtotal === 0)) {
      alert('Por favor agregue al menos un producto, insumo o servicio con su detalle.');
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      const resolvedCostCenter = (costCenter === '__custom__' ? customCostCenter.trim() : costCenter) || undefined;
      const resolvedPlate = (vehiclePlate === '__custom__' ? customVehiclePlate.trim() : vehiclePlate) || undefined;
      const foundVehicle = resolvedPlate ? VEHICLE_FLEET_PRESETS.find(v => v.plate === resolvedPlate) : undefined;
      const resolvedVehicleName = foundVehicle ? foundVehicle.name : (resolvedPlate ? `Vehículo Placa: ${resolvedPlate}` : undefined);

      if (isEditing && expenseToEdit) {
        const updatedExpense: Expense = cleanForFirestore({
          ...expenseToEdit,
          providerId: providerId || undefined,
          providerName: providerName.trim(),
          providerRuc: providerRuc.trim() || undefined,
          providerDv: providerDv.trim() || undefined,
          providerAddress: providerAddress.trim() || undefined,
          providerPhone: providerPhone.trim() || undefined,
          providerEmail: providerEmail.trim() || undefined,

          invoiceNumber: invoiceNumber.trim() || undefined,
          date: date || new Date().toISOString().split('T')[0],
          dueDate: dueDate || undefined,
          receptionDate: receptionDate || date,
          
          expenseType: expenseType,
          category: category,
          
          costCenter: resolvedCostCenter,
          vehiclePlate: resolvedPlate,
          vehicleName: resolvedVehicleName,
          isDeductible: isDeductible,

          paymentMethod: paymentMethod,
          expenseAccount: expenseAccount.trim() || undefined,
          attachment: attachment || undefined,

          items: items.map(it => ({
            ...it,
            description: it.description.trim() || 'Ítem de compra'
          })),

          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          amount: totals.total,

          notes: notes.trim(),
          registeredBy: registeredBy.trim() || 'JOSE',
          approvedBy: approvedBy.trim() || 'ADMINISTRACIÓN',

          isSynced: false,
          updatedAt: now
        });

        await db.expenses.put(updatedExpense);
        await syncService.queueChange('expenses', 'update', updatedExpense);

        if (andPrint) {
          printExpenseVoucherPDF(updatedExpense, companyProfile);
        }

        if (onSaved) {
          onSaved(updatedExpense, andPrint);
        }
      } else {
        // Generating sequential purchase/expense code: COM-XXXX or GAS-XXXX
        const count = await db.expenses.count();
        const isInventoryOrDirectCost = expenseType.includes('COSTO DE VENTAS') || category.includes('Mercancía') || category.includes('Insumos');
        const prefix = isInventoryOrDirectCost ? 'COM' : 'GAS';
        const code = `${prefix}-${String(count + 1).padStart(4, '0')}`;
        const newId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const newExpense: Expense = cleanForFirestore({
          id: newId,
          code: code,
          providerId: providerId || undefined,
          providerName: providerName.trim(),
          providerRuc: providerRuc.trim() || undefined,
          providerDv: providerDv.trim() || undefined,
          providerAddress: providerAddress.trim() || undefined,
          providerPhone: providerPhone.trim() || undefined,
          providerEmail: providerEmail.trim() || undefined,

          invoiceNumber: invoiceNumber.trim() || undefined,
          date: date || new Date().toISOString().split('T')[0],
          dueDate: dueDate || undefined,
          receptionDate: receptionDate || date,
          
          expenseType: expenseType,
          category: category,
          
          costCenter: resolvedCostCenter,
          vehiclePlate: resolvedPlate,
          vehicleName: resolvedVehicleName,
          isDeductible: isDeductible,

          paymentMethod: paymentMethod,
          expenseAccount: expenseAccount.trim() || undefined,
          attachment: attachment || undefined,

          items: items.map(it => ({
            ...it,
            description: it.description.trim() || 'Ítem de compra'
          })),

          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          amount: totals.total,

          notes: notes.trim(),
          registeredBy: registeredBy.trim() || 'JOSE',
          approvedBy: approvedBy.trim() || 'ADMINISTRACIÓN',

          isSynced: false,
          createdAt: now,
          updatedAt: now
        });

        await db.expenses.add(newExpense);
        await syncService.queueChange('expenses', 'create', newExpense);

        if (andPrint) {
          printExpenseVoucherPDF(newExpense, companyProfile);
        }

        if (onSaved) {
          onSaved(newExpense, andPrint);
        }
      }

      onClose();
    } catch (error) {
      console.error('Error al guardar compra/gasto:', error);
      alert('Ocurrió un error al guardar la compra o gasto. Por favor intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {isEditing ? 'Edición Contable' : 'Nuevo Registro'}
                </span>
                <span className="text-xs text-slate-300 font-medium">Imperio Pro ERP</span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>{isEditing ? `Modificar Gasto / Compra [${expenseToEdit?.code}]` : 'Ingreso de Compra y Gasto Operativo'}</span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 bg-slate-50/50 flex-1">
          
          {/* ========================================================
              SECCIÓN A: DATOS DEL PROVEEDOR / ACREEDOR
             ======================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('provider')}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-colors border-b border-slate-200/80 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-900 block uppercase tracking-wide">
                    Sección A: Datos del Proveedor / Acreedor
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Razón Social, RUC, DV, Dirección física, Teléfono y Correo Electrónico
                  </span>
                </div>
              </div>
              {openSections.includes('provider') ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {openSections.includes('provider') && (
              <div className="p-4 sm:p-5 space-y-4">
                
                {/* Provider Selector from Directory */}
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Seleccionar Proveedor Registrado en Agenda:
                    </span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={providerId}
                      onChange={handleSelectProvider}
                      className="w-full sm:w-64 px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                    >
                      <option value="">-- Ingresar Manualmente o Buscar --</option>
                      {contacts
                        .filter(c => c.type === 'provider' || c.type === 'both')
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.rucOrCedula ? `(${c.rucOrCedula})` : ''}
                          </option>
                        ))}
                      <option value="__new__" className="font-bold text-emerald-700">
                        + Registrar Nuevo Proveedor en Contactos...
                      </option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setIsNewContactModalOpen(true)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nuevo</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  {/* Nombre Comercial / Razón Social */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre Comercial o Razón Social del Proveedor <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Distribuidora Central S.A. o Inversiones Panamá"
                      value={providerName}
                      onChange={(e) => setProviderName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  {/* RUC y DV */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        RUC / Cédula
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: 155689021-2-2026"
                        value={providerRuc}
                        onChange={(e) => setProviderRuc(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        DV
                      </label>
                      <input
                        type="text"
                        maxLength={3}
                        placeholder="01"
                        value={providerDv}
                        onChange={(e) => setProviderDv(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-center focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Teléfono */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Teléfono de Contacto
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 64429775 o 260-1122"
                      value={providerPhone}
                      onChange={(e) => setProviderPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Correo Electrónico */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      placeholder="ventas@proveedor.com"
                      value={providerEmail}
                      onChange={(e) => setProviderEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Dirección Física */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Dirección Física / Ubicación
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Calle 50, Plaza Central, Ciudad de Panamá"
                      value={providerAddress}
                      onChange={(e) => setProviderAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================
              SECCIÓN B: DATOS DEL DOCUMENTO, TAXONOMÍA Y OPERACIÓN
             ======================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('document')}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-colors border-b border-slate-200/80 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-900 block uppercase tracking-wide">
                    Sección B: Factura, Clasificación Contable, Flota y Centro de Costo
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Tipo de Gasto (General), Categoría (Específica), Centro de Costo, Placa Vehicular y Deducibilidad Fiscal
                  </span>
                </div>
              </div>
              {openSections.includes('document') ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {openSections.includes('document') && (
              <div className="p-4 sm:p-5 space-y-4">
                
                {/* 1. Factura y Fechas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  {/* Número de Factura */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      N° Factura o Comprobante Fiscal <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: FAC-009842 o 001-002-831"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Fecha de Emisión */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Fecha de Emisión <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                    />
                  </div>

                  {/* Fecha de Vencimiento */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Fecha de Vencimiento</span>
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                    />
                  </div>

                  {/* Fecha de Recepción / Registro */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Fecha de Recepción</span>
                    </label>
                    <input
                      type="date"
                      value={receptionDate}
                      onChange={(e) => setReceptionDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                    />
                  </div>
                </div>

                {/* 2. Doble Selector Jerárquico: Tipo de Gasto & Categoría de Gasto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  {/* Tipo de Gasto Principal */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-sky-600" />
                      <span>1. Tipo de Gasto (Nivel General) <span className="text-rose-500">*</span></span>
                    </label>
                    <select
                      value={expenseType}
                      onChange={(e) => handleExpenseTypeChange(e.target.value)}
                      className="w-full px-3 py-2.5 border border-sky-300 rounded-xl text-xs font-extrabold text-slate-900 bg-white shadow-2xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                    >
                      {EXPENSE_TAXONOMY.map(group => (
                        <option key={group.id} value={group.name}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Define la agrupación contable y el rubro presupuestario mayor.
                    </span>
                  </div>

                  {/* Categoría Específica dependiente del Tipo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                      <span>2. Categoría de Gasto (Nivel Específico) <span className="text-rose-500">*</span></span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-3 py-2.5 border border-indigo-300 rounded-xl text-xs font-bold text-indigo-950 bg-white shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                    >
                      {currentCategoryList.map((cat, idx) => (
                        <option key={idx} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-indigo-600 font-medium mt-1 block">
                      Subclasificación para reportes detallados y centros de costos.
                    </span>
                  </div>
                </div>

                {/* 3. Centro de Costo / Sucursal & Flota Vehicular */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  
                  {/* Centro de Costo / Sucursal */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Centro de Costo / Sucursal</span>
                    </label>
                    <select
                      value={costCenter}
                      onChange={(e) => setCostCenter(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                    >
                      {COST_CENTERS.map((cc, idx) => (
                        <option key={idx} value={cc}>
                          {cc}
                        </option>
                      ))}
                      <option value="__custom__">+ Ingresar Centro de Costo personalizado...</option>
                    </select>

                    {costCenter === '__custom__' && (
                      <input
                        type="text"
                        placeholder="Escriba el nombre de la sucursal o proyecto..."
                        value={customCostCenter}
                        onChange={(e) => setCustomCostCenter(e.target.value)}
                        className="mt-2 w-full px-3 py-1.5 border border-amber-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-amber-50/40"
                      />
                    )}
                  </div>

                  {/* Placa / Vehículo Asociado */}
                  <div className={`p-2.5 rounded-xl border transition-all ${
                    isVehicleRelated 
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30' 
                      : 'bg-slate-50/60 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Truck className={`w-3.5 h-3.5 ${isVehicleRelated ? 'text-amber-600' : 'text-slate-500'}`} />
                        <span>Placa / Vehículo Asociado</span>
                      </label>
                      {isVehicleRelated && (
                        <span className="text-[10px] font-extrabold uppercase bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-md">
                          Requerido para Flota
                        </span>
                      )}
                    </div>

                    <select
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
                    >
                      <option value="">-- Sin vehículo asociado (Gasto General) --</option>
                      {VEHICLE_FLEET_PRESETS.map(v => (
                        <option key={v.id} value={v.plate}>
                          {v.name}
                        </option>
                      ))}
                      <option value="__custom__">+ Ingresar otra Placa o Camión...</option>
                    </select>

                    {vehiclePlate === '__custom__' && (
                      <input
                        type="text"
                        placeholder="Ej: Placa AA-1234 (Camión 3)"
                        value={customVehiclePlate}
                        onChange={(e) => setCustomVehiclePlate(e.target.value)}
                        className="mt-2 w-full px-3 py-1.5 border border-amber-400 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-white"
                      />
                    )}
                  </div>
                </div>

                {/* 4. Deducibilidad Fiscal & Forma de Pago */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 items-end">
                  
                  {/* Indicador de Deducibilidad Fiscal */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>¿Es Deducible de Impuestos?</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsDeductible(true)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                          isDeductible
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Sí, Deducible</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsDeductible(false)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                          !isDeductible
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>No Deducible</span>
                      </button>
                    </div>
                  </div>

                  {/* Forma de Pago */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Método de Pago <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                    >
                      <option value="transfer">Transferencia / ACH</option>
                      <option value="cash">Efectivo</option>
                      <option value="corporate_card">Tarjeta Corporativa</option>
                      <option value="check">Cheque Comercial</option>
                      <option value="card">Tarjeta Débito / Crédito</option>
                      <option value="credit">Crédito Comercial (Cuentas por Pagar)</option>
                    </select>
                  </div>

                  {/* Cuenta Contable Sugerida */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cuenta Contable Asignada
                    </label>
                    <input
                      type="text"
                      value={expenseAccount}
                      onChange={(e) => setExpenseAccount(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-hidden bg-slate-50/70"
                    />
                  </div>

                </div>

              </div>
            )}
          </div>

          {/* ========================================================
              SECCIÓN C: DETALLE DE PRODUCTOS E INSUMOS (TABLA DINÁMICA)
             ======================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('items')}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-colors border-b border-slate-200/80 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-900 block uppercase tracking-wide">
                    Sección C: Detalle de Productos e Insumos (Tabla Dinámica)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Múltiples filas por factura: Descripción, Cantidad, Precio Unitario, Tasa ITBMS (0%, 7%, 10%, 15%) y Subtotales
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
                </span>
                {openSections.includes('items') ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </button>

            {openSections.includes('items') && (
              <div className="p-4 sm:p-5 space-y-4">
                
                {/* Dynamic Table Header & Rows */}
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[620px]">
                    <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">Descripción Detallada del Producto / Insumo</th>
                        <th className="py-2.5 px-3 w-24 text-center">Cantidad</th>
                        <th className="py-2.5 px-3 w-32 text-right">Costo Unit. ($)</th>
                        <th className="py-2.5 px-3 w-28 text-center">ITBMS</th>
                        <th className="py-2.5 px-3 w-28 text-right">Subtotal</th>
                        <th className="py-2.5 px-2 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, index) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-bold text-[11px]">
                            {index + 1}
                          </td>

                          {/* Descripción / Opción de selección de catálogo */}
                          <td className="py-2.5 px-3 space-y-1.5">
                            <input
                              type="text"
                              required
                              placeholder="Ej: Empaques de cartón, combustible diesel, lubricante 15W40, etc."
                              value={item.description}
                              onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                            />

                            {/* Dropdown to pick from existing catalog if desired */}
                            {products.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <Package className="w-3 h-3 text-slate-400 shrink-0" />
                                <select
                                  value={item.productId || ''}
                                  onChange={(e) => handleSelectProductForItem(index, e.target.value)}
                                  className="w-full text-[10px] text-slate-500 bg-transparent border-0 underline hover:text-indigo-600 cursor-pointer focus:outline-hidden"
                                >
                                  <option value="">(Opcional) Cargar desde Catálogo de Inventario...</option>
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} — Costo Ref: ${p.cost?.toFixed(2) || '0.00'}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </td>

                          {/* Cantidad */}
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                            />
                          </td>

                          {/* Costo Unitario */}
                          <td className="py-2.5 px-3">
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-slate-400 font-mono text-xs">$</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.unitPrice}
                                onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                                className="w-full pl-5 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-right focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                              />
                            </div>
                          </td>

                          {/* Tasa ITBMS */}
                          <td className="py-2.5 px-3">
                            <select
                              value={item.taxRate}
                              onChange={(e) => handleItemChange(index, 'taxRate', parseFloat(e.target.value))}
                              className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-center bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                            >
                              <option value={0}>0% (Exento)</option>
                              <option value={7}>7% (Estándar)</option>
                              <option value={10}>10% (Licores/Esp.)</option>
                              <option value={15}>15% (Tabaco/Esp.)</option>
                            </select>
                          </td>

                          {/* Subtotal */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                            ${fmtNum(item.subtotal)}
                            {safeNum(item.taxAmount) > 0 && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                + ITBMS: ${fmtNum(item.taxAmount)}
                              </span>
                            )}
                          </td>

                          {/* Acciones: Eliminar fila */}
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              title="Eliminar fila"
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add Row Button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-indigo-200/60"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar Otra Fila de Producto / Insumo</span>
                  </button>

                  <p className="text-[11px] text-slate-400 italic">
                    * El subtotal e ITBMS se recalculan automáticamente con cada cambio.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================
              SECCIÓN D: ADJUNTAR ARCHIVO / COMPROBANTE DIGITAL
             ======================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('attachment')}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-colors border-b border-slate-200/80 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-900 block uppercase tracking-wide">
                    Sección D: Adjuntar Archivo / Comprobante Digital (PDF o Imagen)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Soporte digital de factura escaneada, recibo de compra o comprobante bancario
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {attachment && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>1 Soporte Adjunto</span>
                  </span>
                )}
                {openSections.includes('attachment') ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </button>

            {openSections.includes('attachment') && (
              <div className="p-4 sm:p-5">
                {attachment ? (
                  <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                        {attachment.type.includes('pdf') ? (
                          <FileText className="w-6 h-6" />
                        ) : (
                          <Eye className="w-6 h-6" />
                        )}
                      </div>
                      <div className="text-left overflow-hidden">
                        <span className="text-xs font-bold text-slate-900 block truncate max-w-xs">
                          {attachment.name}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {(attachment.size / 1024).toFixed(1)} KB • {attachment.type.includes('pdf') ? 'Documento PDF' : 'Imagen Digital'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setShowAttachmentPreview(true)}
                        className="px-3 py-1.5 bg-white text-teal-700 border border-teal-300 hover:bg-teal-50 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Soporte</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveAttachment}
                        className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="expense-file-upload"
                    />
                    <label
                      htmlFor="expense-file-upload"
                      className="cursor-pointer flex flex-col items-center justify-center gap-2"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-700 hover:underline block">
                          Haga clic aquí para adjuntar comprobante digital o arrastre el archivo
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Soporta facturas en formato PDF, PNG, JPG o WEBP (Máx. 5 MB)
                        </span>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================
              SECCIÓN E: TOTALES DEL DOCUMENTO Y AUDITORÍA CONTABLE
             ======================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('totals')}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-colors border-b border-slate-200/80 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-900 block uppercase tracking-wide">
                    Sección E: Totales del Documento y Auditoría Contable
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Subtotal General, Cálculo Automático de ITBMS y Total Consolidado
                  </span>
                </div>
              </div>
              {openSections.includes('totals') ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {openSections.includes('totals') && (
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Left: Notes & Signatures */}
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Notas y Observaciones Contables
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Escriba aquí notas de verificación, número de cheque o ACH, condiciones de entrega o auditoría interna..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Registrado Por:
                        </label>
                        <input
                          type="text"
                          value={registeredBy}
                          onChange={(e) => setRegisteredBy(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Aprobado Por:
                        </label>
                        <input
                          type="text"
                          value={approvedBy}
                          onChange={(e) => setApprovedBy(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Consolidated Financial Totals Card */}
                  <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-slate-800 pb-2">
                      Liquidación de la Compra / Gasto
                    </h4>

                    <div className="flex justify-between items-center text-xs text-slate-300">
                      <span>Subtotal General:</span>
                      <span className="font-mono text-sm font-semibold">${fmtNum(totals.subtotal)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-300">
                      <span>Impuestos (ITBMS Calculado):</span>
                      <span className="font-mono text-sm font-semibold">${fmtNum(totals.taxAmount)}</span>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="text-sm font-extrabold text-white block">MONTO TOTAL:</span>
                        <span className="text-[10px] text-slate-400">Total a pagar / egreso contable</span>
                      </div>
                      <span className="text-2xl font-black font-mono text-emerald-400">
                        ${fmtNum(totals.total)}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2.5">
            {/* Save and Print Voucher Option */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Guardar e Imprimir Comprobante</span>
            </button>

            {/* Standard Save Button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(false)}
              className={`w-full sm:w-auto px-5 py-2.5 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50 ${
                isEditing ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Guardando...'
                  : isEditing
                  ? 'Actualizar Compra / Gasto'
                  : 'Guardar Compra / Gasto'}
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* MODAL PARA AGREGAR NUEVO CONTACTO / PROVEEDOR EN VIVO */}
      {isNewContactModalOpen && (
        <ContactFormModal
          isOpen={isNewContactModalOpen}
          onClose={() => setIsNewContactModalOpen(false)}
          defaultType="provider"
          onContactSaved={(newContact) => {
            setProviderId(newContact.id);
            setProviderName(newContact.name);
            setProviderRuc(newContact.rucOrCedula || '');
            setProviderDv(newContact.dv || '');
            setProviderAddress(newContact.address || '');
            setProviderPhone(newContact.phone || newContact.mobile || '');
            setProviderEmail(newContact.email || '');
            setIsNewContactModalOpen(false);
          }}
        />
      )}

      {/* MODAL DE VISTA PREVIA DEL COMPROBANTE DIGITAL ADJUNTO */}
      {showAttachmentPreview && attachment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold truncate max-w-md">{attachment.name}</span>
              </div>
              <button
                onClick={() => setShowAttachmentPreview(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-100">
              {attachment.type.includes('pdf') ? (
                <iframe
                  src={attachment.dataUrl}
                  title="Vista Previa de Soporte PDF"
                  className="w-full h-[70vh] rounded-lg border border-slate-300"
                />
              ) : (
                <img
                  src={attachment.dataUrl}
                  alt="Soporte digital adjunto"
                  className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
