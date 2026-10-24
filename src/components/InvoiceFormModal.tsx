import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator, Check, AlertCircle, Printer } from 'lucide-react';
import type { Invoice, InvoiceItem, Contact, Product, TaxRate, PaymentMethod } from '../types';
import { db } from '../db/indexedDB';
import { useLiveQuery } from 'dexie-react-hooks';
import { syncService } from '../services/syncService';
import { printInvoicePDF, formatTaxLabel } from '../services/pdfService';
import confetti from 'canvas-confetti';

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceToEdit?: Invoice | null;
  initialContactId?: string | null;
}

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({ 
  isOpen, 
  onClose,
  invoiceToEdit,
  initialContactId
}) => {
  const contacts = useLiveQuery(() => db.contacts.toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const companyProfile = useLiveQuery(() => db.companyProfile.get('default'), []);

  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [sellerName, setSellerName] = useState<string>('Oficina / General');
  const [isImmediatePaid, setIsImmediatePaid] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('Factura electrónica generada vía IMPERIO PRO CONTABILIDAD. Gracias por su compra.');

  // Form Items State
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: `item-${Date.now()}-1`,
      productId: '',
      name: '',
      quantity: 1,
      price: 0,
      taxRate: 7,
      discount: 0,
      subtotal: 0,
      taxAmount: 0,
      total: 0,
    }
  ]);

  useEffect(() => {
    if (isOpen) {
      if (invoiceToEdit) {
        setSelectedContactId(invoiceToEdit.contactId);
        setDate(invoiceToEdit.date);
        setDueDate(invoiceToEdit.dueDate);
        setPaymentMethod(invoiceToEdit.paymentMethod || 'transfer');
        setSellerName(invoiceToEdit.sellerName || 'Oficina / General');
        setIsImmediatePaid(invoiceToEdit.status === 'paid');
        setNotes(invoiceToEdit.notes || 'Factura electrónica generada vía IMPERIO PRO CONTABILIDAD.');
        setItems(invoiceToEdit.items && invoiceToEdit.items.length > 0 ? invoiceToEdit.items : [
          {
            id: `item-${Date.now()}-1`,
            productId: '',
            name: '',
            quantity: 1,
            price: 0,
            taxRate: 7,
            discount: 0,
            subtotal: 0,
            taxAmount: 0,
            total: 0,
          }
        ]);
      } else {
        setSelectedContactId(initialContactId || '');
        setDate(new Date().toISOString().split('T')[0]);
        setDueDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
        setPaymentMethod('transfer');
        setSellerName('Oficina / General');
        setIsImmediatePaid(true);
        setNotes('Factura electrónica generada vía IMPERIO PRO CONTABILIDAD. Gracias por su compra.');
        setItems([
          {
            id: `item-${Date.now()}-1`,
            productId: '',
            name: '',
            quantity: 1,
            price: 0,
            taxRate: 7,
            discount: 0,
            subtotal: 0,
            taxAmount: 0,
            total: 0,
          }
        ]);
      }
    }
  }, [isOpen, invoiceToEdit, initialContactId]);

  if (!isOpen) return null;

  const handleSelectProduct = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const newItems = [...items];
    const item = newItems[index];

    item.productId = prod.id;
    item.name = prod.name;
    item.price = prod.price;
    item.taxRate = prod.taxRate as TaxRate;
    
    // Recalculate
    const rawSubtotal = item.quantity * item.price;
    const discountVal = rawSubtotal * (item.discount / 100);
    const subtotalAfterDiscount = rawSubtotal - discountVal;
    const taxVal = subtotalAfterDiscount * (item.taxRate / 100);

    item.subtotal = subtotalAfterDiscount;
    item.taxAmount = taxVal;
    item.total = subtotalAfterDiscount + taxVal;

    setItems(newItems);
  };

  const handleUpdateItemField = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    // Recalculate item line
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const discount = Number(item.discount) || 0;
    const taxRate = Number(item.taxRate) || 0;

    const rawSubtotal = qty * price;
    const discountVal = rawSubtotal * (discount / 100);
    const subtotalAfterDiscount = rawSubtotal - discountVal;
    const taxVal = subtotalAfterDiscount * (taxRate / 100);

    item.subtotal = subtotalAfterDiscount;
    item.taxAmount = taxVal as TaxRate;
    item.total = subtotalAfterDiscount + taxVal;

    newItems[index] = item;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}-${items.length + 1}`,
        productId: '',
        name: '',
        quantity: 1,
        price: 0,
        taxRate: 7,
        discount: 0,
        subtotal: 0,
        taxAmount: 0,
        total: 0,
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      setItems([
        {
          id: `item-${Date.now()}`,
          productId: '',
          name: '',
          quantity: 1,
          price: 0,
          taxRate: 7,
          taxAmount: 0,
          discount: 0,
          subtotal: 0,
          total: 0,
        },
      ]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Subtotals
  const subtotalSum = items.reduce((sum, item) => sum + item.subtotal, 0);
  const taxSum = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalSum = items.reduce((sum, item) => sum + item.total, 0);

  const handleSaveInvoice = async (e: React.FormEvent, andPrint = false) => {
    e.preventDefault();

    const selectedContact = contacts.find((c) => c.id === selectedContactId);
    if (!selectedContact) {
      alert('Por favor selecciona un cliente válido.');
      return;
    }

    if (items.some((i) => !i.name || i.quantity <= 0)) {
      alert('Por favor completa todos los productos de la factura con cantidades mayores a cero.');
      return;
    }

    let savedInvoice: Invoice;

    if (invoiceToEdit) {
      // Modify Existing Invoice
      savedInvoice = {
        ...invoiceToEdit,
        contactId: selectedContact.id,
        contactName: selectedContact.name,
        contactRuc: selectedContact.rucOrCedula,
        contactDv: selectedContact.dv || '',
        contactAddress: selectedContact.address || '',
        contactEmail: selectedContact.email || '',
        contactPhone: selectedContact.phone || selectedContact.mobile || selectedContact.whatsapp || '',
        date,
        dueDate,
        items,
        subtotal: subtotalSum,
        taxTotal: taxSum,
        discountTotal: items.reduce((sum, item) => sum + (item.quantity * item.price * (item.discount / 100)), 0),
        total: totalSum,
        paidAmount: isImmediatePaid ? totalSum : invoiceToEdit.paidAmount,
        status: isImmediatePaid ? 'paid' : (invoiceToEdit.status === 'paid' ? 'paid' : 'pending'),
        paymentMethod,
        sellerName,
        notes,
        isSynced: false,
        updatedAt: new Date().toISOString(),
      };

      await db.invoices.put(savedInvoice);
      await syncService.queueChange('invoices', 'update', savedInvoice);
    } else {
      // Create New Invoice
      const countInvoices = await db.invoices.count();
      const nextNum = 1000 + countInvoices + 1;
      const invoiceCode = `FACT-00${nextNum}`;

      savedInvoice = {
        id: `inv-${Date.now()}`,
        code: invoiceCode,
        type: 'sale',
        contactId: selectedContact.id,
        contactName: selectedContact.name,
        contactRuc: selectedContact.rucOrCedula,
        contactDv: selectedContact.dv || '',
        contactAddress: selectedContact.address || '',
        contactEmail: selectedContact.email || '',
        contactPhone: selectedContact.phone || selectedContact.mobile || selectedContact.whatsapp || '',
        date,
        dueDate,
        items,
        subtotal: subtotalSum,
        taxTotal: taxSum,
        discountTotal: items.reduce((sum, item) => sum + (item.quantity * item.price * (item.discount / 100)), 0),
        total: totalSum,
        paidAmount: isImmediatePaid ? totalSum : 0,
        status: isImmediatePaid ? 'paid' : 'pending',
        paymentMethod,
        sellerName,
        notes,
        isSynced: false,
        offlineCreated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to local IndexedDB
      await db.invoices.add(savedInvoice);

      // Update Product Stock for physical items
      for (const item of items) {
        if (item.productId) {
          const prod = await db.products.get(item.productId);
          if (prod && prod.type === 'product') {
            await db.products.update(prod.id, {
              stock: Math.max(0, prod.stock - item.quantity),
            });
          }
        }
      }

      // Queue for Offline/Online Sync
      await syncService.queueChange('invoices', 'create', savedInvoice);
    }

    // Celebration
    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}

    if (andPrint) {
      printInvoicePDF(savedInvoice, companyProfile);
    }

    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => handleSaveInvoice(e, false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {invoiceToEdit ? `Modificar Factura ${invoiceToEdit.code}` : 'Nueva Factura de Venta'}
            </h2>
            <p className="text-xs text-slate-500">
              {invoiceToEdit 
                ? 'Edita los datos, productos o valores de la factura y guarda los cambios.'
                : 'Registra una venta, calcula impuestos automáticamente e impacta inventario local/nube.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Header Controls: Client, Dates, Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
            
            {/* Client Selector */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Cliente *
              </label>
              <select
                required
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              >
                <option value="">-- Selecciona un Cliente --</option>
                {contacts
                  .filter((c) => c.type === 'client' || c.type === 'both')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.rucOrCedula})
                    </option>
                  ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Fecha Emisión
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Fecha Vencimiento
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Forma de Pago
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm"
              >
                <option value="transfer">Transferencia / ACH</option>
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta de Crédito / Débito</option>
                <option value="credit">Crédito a Plazo</option>
              </select>
            </div>

            {/* Vendedor / Salesperson */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Vendedor / Ejecutivo
              </label>
              <input
                type="text"
                placeholder="Ej. Carlos Pérez, Oficina, Ana R."
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium"
              />
            </div>

            {/* Immediate Paid Toggle */}
            <div className="flex items-center gap-2 mt-2 sm:mt-6">
              <input
                type="checkbox"
                id="isImmediatePaid"
                checked={isImmediatePaid}
                onChange={(e) => setIsImmediatePaid(e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded-md focus:ring-sky-500"
              />
              <label htmlFor="isImmediatePaid" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Marcar Factura como Cobrada / Pagada de inmediato
              </label>
            </div>

          </div>

          {/* Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Ítems / Productos y Servicios
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 border border-sky-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Ítem</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-12 gap-2 items-center text-xs">
                  
                  {/* Select Product / Custom Name */}
                  <div className="col-span-12 sm:col-span-4 space-y-1">
                    <select
                      value={item.productId}
                      onChange={(e) => handleSelectProduct(index, e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs"
                    >
                      <option value="">-- Buscar en Inventario --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (${p.price.toFixed(2)})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Nombre del ítem / servicio"
                      value={item.name}
                      onChange={(e) => handleUpdateItemField(index, 'name', e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md text-xs"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-3 sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 font-medium">Cant.</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItemField(index, 'quantity', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold"
                    />
                  </div>

                  {/* Price */}
                  <div className="col-span-3 sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 font-medium">Precio U. ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => handleUpdateItemField(index, 'price', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold"
                    />
                  </div>

                  {/* Tax Rate % */}
                  <div className="col-span-3 sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 font-medium">Impuesto</label>
                    <select
                      value={item.taxRate}
                      onChange={(e) => handleUpdateItemField(index, 'taxRate', Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs"
                    >
                      <option value={7}>ITBMS / IVA 7%</option>
                      <option value={10}>Impuesto 10%</option>
                      <option value={16}>IVA 16%</option>
                      <option value={19}>IVA 19%</option>
                      <option value={0}>Exento (0%)</option>
                    </select>
                  </div>

                  {/* Total & Remove */}
                  <div className="col-span-3 sm:col-span-2 flex items-center justify-between pl-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-medium">Total</label>
                      <span className="font-extrabold text-slate-900">${item.total.toFixed(2)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t border-slate-200">
            <div className="w-full sm:w-1/2 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Observaciones de la Factura
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <div className="w-full sm:w-80 bg-slate-900 text-white p-4 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal:</span>
                <span>${subtotalSum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>{formatTaxLabel(companyProfile?.taxName)}:</span>
                <span>${taxSum.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between font-extrabold text-base text-sky-400">
                <span>Total Factura:</span>
                <span>${totalSum.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={(e) => handleSaveInvoice(e, true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Guarda la factura y abre inmediatamente el visor de impresión A4"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span>Guardar e Imprimir</span>
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Factura</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
