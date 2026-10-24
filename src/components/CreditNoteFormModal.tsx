import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, FileCheck, Package, RotateCcw, AlertCircle } from 'lucide-react';
import type { CreditNote, CreditNoteItem, Contact, Product, TaxRate, Invoice } from '../types';
import { db } from '../db/indexedDB';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';

interface CreditNoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreditNoteFormModal: React.FC<CreditNoteFormModalProps> = ({
  isOpen,
  onClose,
}) => {
  const contacts = useLiveQuery(() => db.contacts.toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const invoices = useLiveQuery(() => db.invoices.toArray(), []) || [];

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [contactRuc, setContactRuc] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<string>('Devolución de mercancía');
  const [adjustInventory, setAdjustInventory] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>(
    'Nota de crédito emitida para devolución/ajuste de cuenta. Mercancía reingresada al sistema de inventario.'
  );

  const [items, setItems] = useState<CreditNoteItem[]>([
    {
      id: `cn-item-${Date.now()}-1`,
      productId: '',
      name: '',
      quantity: 1,
      price: 0,
      taxRate: 7,
      subtotal: 0,
      taxAmount: 0,
      total: 0,
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      setSelectedInvoiceId('');
      setSelectedContactId('');
      setContactName('');
      setContactRuc('');
      setContactPhone('');
      setDate(new Date().toISOString().split('T')[0]);
      setReason('Devolución de mercancía');
      setAdjustInventory(true);
      setNotes('Nota de crédito emitida para devolución/ajuste de cuenta. Mercancía reingresada al sistema de inventario.');
      setItems([
        {
          id: `cn-item-${Date.now()}-1`,
          productId: '',
          name: '',
          quantity: 1,
          price: 0,
          taxRate: 7,
          subtotal: 0,
          taxAmount: 0,
          total: 0,
        },
      ]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Auto populate from selected invoice
  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;

    setSelectedContactId(inv.contactId || '');
    setContactName(inv.contactName || '');
    setContactRuc(inv.contactRuc || '');
    
    const cnt = contacts.find((c) => c.id === inv.contactId);
    if (cnt) {
      setContactPhone(cnt.whatsapp || cnt.phone || cnt.mobile || '');
    }

    // Map invoice items to credit note items
    const newItems: CreditNoteItem[] = inv.items.map((ii, idx) => ({
      id: `cn-item-${Date.now()}-${idx + 1}`,
      productId: ii.productId || '',
      name: ii.name,
      quantity: ii.quantity,
      price: ii.price,
      taxRate: ii.taxRate as TaxRate,
      subtotal: ii.subtotal,
      taxAmount: ii.taxAmount,
      total: ii.total,
    }));

    if (newItems.length > 0) {
      setItems(newItems);
    }
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    const cnt = contacts.find((c) => c.id === contactId);
    if (cnt) {
      setContactName(cnt.name);
      setContactRuc(cnt.rucOrCedula);
      setContactPhone(cnt.whatsapp || cnt.phone || cnt.mobile || '');
    }
  };

  const handleSelectProduct = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const newItems = [...items];
    const item = newItems[index];

    item.productId = prod.id;
    item.name = prod.name;
    item.price = prod.price;
    item.taxRate = prod.taxRate as TaxRate;

    const subtotal = item.quantity * item.price;
    const taxAmount = subtotal * (item.taxRate / 100);

    item.subtotal = subtotal;
    item.taxAmount = taxAmount;
    item.total = subtotal + taxAmount;

    setItems(newItems);
  };

  const handleUpdateItemField = (index: number, field: keyof CreditNoteItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const taxRate = Number(item.taxRate) || 0;

    const subtotal = qty * price;
    const taxAmount = subtotal * (taxRate / 100);

    item.subtotal = subtotal;
    item.taxAmount = taxAmount;
    item.total = subtotal + taxAmount;

    newItems[index] = item;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `cn-item-${Date.now()}-${items.length + 1}`,
        productId: '',
        name: '',
        quantity: 1,
        price: 0,
        taxRate: 7,
        subtotal: 0,
        taxAmount: 0,
        total: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      setItems([
        {
          id: `cn-item-${Date.now()}`,
          productId: '',
          name: '',
          quantity: 1,
          price: 0,
          taxRate: 7,
          subtotal: 0,
          taxAmount: 0,
          total: 0,
        },
      ]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Totals
  const subtotalSum = items.reduce((acc, curr) => acc + curr.subtotal, 0);
  const taxTotal = items.reduce((acc, curr) => acc + curr.taxAmount, 0);
  const grandTotal = items.reduce((acc, curr) => acc + curr.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contactName.trim()) {
      alert('Por favor selecciona una factura o un cliente válido.');
      return;
    }

    if (items.length === 0 || !items[0].name) {
      alert('Debes agregar al menos un ítem a la Nota de Crédito.');
      return;
    }

    const count = await db.creditNotes.count();
    const code = `NC-${(count + 1).toString().padStart(4, '0')}`;

    let invoiceCode = '';
    if (selectedInvoiceId) {
      const inv = invoices.find((i) => i.id === selectedInvoiceId);
      if (inv) invoiceCode = inv.code;
    }

    const newCreditNote: CreditNote = {
      id: `nc-${Date.now()}`,
      code,
      invoiceId: selectedInvoiceId || undefined,
      invoiceCode: invoiceCode || undefined,
      contactId: selectedContactId,
      contactName,
      contactRuc: contactRuc || 'N/A',
      contactPhone,
      date,
      reason,
      adjustInventory,
      items,
      subtotal: subtotalSum,
      taxTotal,
      total: grandTotal,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Save Credit Note
    await db.creditNotes.put(newCreditNote);

    // 2. Adjust Inventory (Return stock if enabled)
    if (adjustInventory) {
      for (const item of items) {
        if (item.productId) {
          const prod = await db.products.get(item.productId);
          if (prod) {
            const updatedStock = prod.stock + Number(item.quantity);
            await db.products.update(prod.id, {
              stock: updatedStock,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
    });

    alert(`¡Nota de Crédito ${code} emitida con éxito! ${adjustInventory ? 'El stock de productos fue ajustado en el inventario.' : ''}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-rose-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>Nueva Nota de Crédito</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/30">
                  Devoluciones & Ajustes
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Acredita montos a clientes y devuelve mercancía de forma automática al stock del Inventario
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs sm:text-sm">
          
          {/* Factura Origen & Cliente */}
          <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                Origen de la Nota de Crédito
              </div>
              <span className="text-[11px] text-rose-700 font-medium">
                Vincular a Factura existente para auto-cargar datos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Seleccionar Factura Afectada */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Afectar a Factura de Venta Existente (Opcional)
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleSelectInvoice(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold text-xs sm:text-sm"
                >
                  <option value="">-- Emisión libre (Sin Vincular a Factura) --</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.code} - {inv.contactName} (${inv.total.toFixed(2)}) - Fecha: {inv.date}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha Emision */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Fecha Emisión NC
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm font-medium"
                />
              </div>
            </div>

            {/* Datos de Cliente & Motivo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-rose-200/60">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Cliente / Razón Social *
                </label>
                {selectedInvoiceId ? (
                  <input
                    type="text"
                    readOnly
                    value={contactName}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-slate-900 font-bold text-xs"
                  />
                ) : (
                  <select
                    value={selectedContactId}
                    onChange={(e) => handleSelectContact(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold text-xs"
                  >
                    <option value="">-- Seleccionar de contactos --</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.rucOrCedula})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  RUC / Cédula / DV
                </label>
                <input
                  type="text"
                  placeholder="Ej. 8-765-4321 DV 00"
                  value={contactRuc}
                  onChange={(e) => setContactRuc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Motivo de la Nota de Crédito
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
                >
                  <option value="Devolución de mercancía">Devolución de mercancía</option>
                  <option value="Descuento o Bonificación concedida">Descuento o Bonificación concedida</option>
                  <option value="Error en precio o facturación">Error en precio o facturación</option>
                  <option value="Anulación total o parcial">Anulación total o parcial</option>
                  <option value="Ajuste de saldo">Ajuste de saldo</option>
                </select>
              </div>
            </div>
          </div>

          {/* AJUSTE AUTOMÁTICO DE INVENTARIO - DESTACADO */}
          <div className="bg-emerald-50 border-2 border-emerald-500/40 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0 mt-0.5 sm:mt-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950 flex items-center gap-1.5">
                  <span>Ajuste Automático de Stock en Inventario</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                    REINGRESO REAL
                  </span>
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Si activas esta opción, las cantidades acreditadas de los productos se sumarán de nuevo al stock actual de tu inventario.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 self-end sm:self-center">
              <input
                type="checkbox"
                checked={adjustInventory}
                onChange={(e) => setAdjustInventory(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              <span className="ml-2 text-xs font-bold text-slate-800">
                {adjustInventory ? 'Reingresar a Stock' : 'Sin Afectar Stock'}
              </span>
            </label>
          </div>

          {/* Tabla de Items Acreditados */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span>Ítems / Productos Acreditados</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  (Define qué productos o servicios se devuelven o descuentan)
                </span>
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1 border border-rose-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Fila</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-2xs">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase border-b border-slate-200">
                    <th className="py-2.5 px-3">Producto / Ítem Acreditado</th>
                    <th className="py-2.5 px-2 w-24 text-center">Cant. Devuelta</th>
                    <th className="py-2.5 px-2 w-28 text-right">Precio ($)</th>
                    <th className="py-2.5 px-2 w-24 text-center">Imp %</th>
                    <th className="py-2.5 px-3 w-28 text-right">Total ($)</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-rose-50/40">
                      {/* Product Selector / Name */}
                      <td className="p-2 space-y-1">
                        <select
                          value={item.productId}
                          onChange={(e) => handleSelectProduct(index, e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                        >
                          <option value="">-- Buscar en catálogo de productos --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} - ${p.price.toFixed(2)} (Stock actual: {p.stock})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          required
                          placeholder="Descripción o motivo del ítem..."
                          value={item.name}
                          onChange={(e) => handleUpdateItemField(index, 'name', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="p-2 text-center align-top pt-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItemField(index, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-900"
                        />
                      </td>

                      {/* Price */}
                      <td className="p-2 text-right align-top pt-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.price}
                          onChange={(e) => handleUpdateItemField(index, 'price', Number(e.target.value))}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-bold text-slate-900"
                        />
                      </td>

                      {/* Tax */}
                      <td className="p-2 text-center align-top pt-3">
                        <select
                          value={item.taxRate}
                          onChange={(e) => handleUpdateItemField(index, 'taxRate', Number(e.target.value))}
                          className="w-full px-1.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-medium"
                        >
                          <option value={0}>0%</option>
                          <option value={7}>7%</option>
                          <option value={10}>10%</option>
                          <option value={16}>16%</option>
                        </select>
                      </td>

                      {/* Total */}
                      <td className="p-2 text-right font-bold text-rose-700 align-top pt-4 font-mono">
                        ${item.total.toFixed(2)}
                      </td>

                      {/* Delete */}
                      <td className="p-2 text-center align-top pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Observaciones y Totales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Observaciones / Justificación Legal
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explicación del motivo de emisión de la Nota de Crédito..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            <div className="bg-rose-950 text-white p-4 rounded-2xl space-y-2.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Subtotal Acreditado:</span>
                <span className="font-mono font-bold">${subtotalSum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>Impuesto Acreditado:</span>
                <span className="font-mono font-bold">${taxTotal.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-rose-800/80 flex justify-between items-center text-base sm:text-lg font-bold">
                <span className="text-rose-300">Total Nota de Crédito:</span>
                <span className="font-mono text-rose-400 text-xl font-extrabold">
                  ${grandTotal.toFixed(2)} USD
                </span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs sm:text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-2 text-xs sm:text-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Emitir Nota de Crédito</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
