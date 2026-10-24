import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator, Check, FileText, Calendar, MessageSquare } from 'lucide-react';
import type { Quote, QuoteItem, Contact, Product, TaxRate, QuoteStatus } from '../types';
import { db } from '../db/indexedDB';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';

interface QuoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteToEdit?: Quote | null;
  initialContactId?: string | null;
}

export const QuoteFormModal: React.FC<QuoteFormModalProps> = ({
  isOpen,
  onClose,
  quoteToEdit,
  initialContactId,
}) => {
  const contacts = useLiveQuery(() => db.contacts.toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];

  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [customContactName, setCustomContactName] = useState<string>('');
  const [customContactRuc, setCustomContactRuc] = useState<string>('');
  const [customContactPhone, setCustomContactPhone] = useState<string>('');

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState<string>(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<QuoteStatus>('pending');
  const [notes, setNotes] = useState<string>(
    'Esta cotización tiene una validez de 15 días calendario. Precios sujetos a cambio sin previo aviso.'
  );

  // Items State
  const [items, setItems] = useState<QuoteItem[]>([
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
    },
  ]);

  useEffect(() => {
    if (quoteToEdit) {
      setSelectedContactId(quoteToEdit.contactId || '');
      setCustomContactName(quoteToEdit.contactName || '');
      setCustomContactRuc(quoteToEdit.contactRuc || '');
      setCustomContactPhone(quoteToEdit.contactPhone || '');
      setDate(quoteToEdit.date);
      setValidUntil(quoteToEdit.validUntil);
      setStatus(quoteToEdit.status);
      setNotes(quoteToEdit.notes || '');
      setItems(quoteToEdit.items || []);
    } else {
      // Reset form
      setSelectedContactId(initialContactId || '');
      setCustomContactName('');
      setCustomContactRuc('');
      setCustomContactPhone('');
      setDate(new Date().toISOString().split('T')[0]);
      setValidUntil(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
      setStatus('pending');
      setNotes('Esta cotización tiene una validez de 15 días calendario. Precios sujetos a cambio sin previo aviso.');
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
        },
      ]);
    }
  }, [quoteToEdit, isOpen, initialContactId]);

  if (!isOpen) return null;

  const handleSelectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    const cnt = contacts.find((c) => c.id === contactId);
    if (cnt) {
      setCustomContactName(cnt.name);
      setCustomContactRuc(cnt.rucOrCedula);
      setCustomContactPhone(cnt.whatsapp || cnt.phone || cnt.mobile || '');
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

    const rawSubtotal = item.quantity * item.price;
    const discountVal = rawSubtotal * (item.discount / 100);
    const subtotalAfterDiscount = rawSubtotal - discountVal;
    const taxVal = subtotalAfterDiscount * (item.taxRate / 100);

    item.subtotal = subtotalAfterDiscount;
    item.taxAmount = taxVal;
    item.total = subtotalAfterDiscount + taxVal;

    setItems(newItems);
  };

  const handleUpdateItemField = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };

    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const discount = Number(item.discount) || 0;
    const taxRate = Number(item.taxRate) || 0;

    const rawSubtotal = qty * price;
    const discountVal = rawSubtotal * (discount / 100);
    const subtotalAfterDiscount = rawSubtotal - discountVal;
    const taxVal = subtotalAfterDiscount * (taxRate / 100);

    item.subtotal = subtotalAfterDiscount;
    item.taxAmount = taxVal;
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
      },
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
          discount: 0,
          subtotal: 0,
          taxAmount: 0,
          total: 0,
        },
      ]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Totals calculations
  const subtotalSum = items.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
  const discountTotal = items.reduce((acc, curr) => {
    const raw = curr.quantity * curr.price;
    return acc + (raw * (curr.discount / 100));
  }, 0);
  const taxTotal = items.reduce((acc, curr) => acc + curr.taxAmount, 0);
  const grandTotal = items.reduce((acc, curr) => acc + curr.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let clientName = customContactName.trim();
    let clientRuc = customContactRuc.trim();
    let clientPhone = customContactPhone.trim();

    if (selectedContactId) {
      const cnt = contacts.find((c) => c.id === selectedContactId);
      if (cnt) {
        clientName = cnt.name;
        clientRuc = cnt.rucOrCedula;
        clientPhone = clientPhone || cnt.whatsapp || cnt.phone || cnt.mobile || '';
      }
    }

    if (!clientName) {
      alert('Por favor selecciona o escribe el nombre del cliente');
      return;
    }

    const count = await db.quotes.count();
    const quoteCode = quoteToEdit?.code || `COT-${(count + 1).toString().padStart(4, '0')}`;

    const newQuote: Quote = {
      id: quoteToEdit?.id || `cot-${Date.now()}`,
      code: quoteCode,
      contactId: selectedContactId,
      contactName: clientName,
      contactRuc: clientRuc || 'N/A',
      contactPhone: clientPhone,
      date,
      validUntil,
      items,
      subtotal: subtotalSum - discountTotal,
      taxTotal,
      discountTotal,
      total: grandTotal,
      status,
      notes,
      createdAt: quoteToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.quotes.put(newQuote);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                {quoteToEdit ? `Editar Cotización ${quoteToEdit.code}` : 'Nueva Cotización de Venta'}
              </h2>
              <p className="text-xs text-slate-400">
                Selecciona tu cliente, agrega productos o servicios y envía la cotización por WhatsApp en PDF
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs sm:text-sm">
          
          {/* Cliente y Fechas */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Información del Cliente y Validez
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Cliente Selector */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Cliente de la Base de Datos *
                </label>
                <select
                  value={selectedContactId}
                  onChange={(e) => handleSelectContact(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold text-xs sm:text-sm"
                >
                  <option value="">-- Seleccionar cliente guardado --</option>
                  {contacts.map((cnt) => (
                    <option key={cnt.id} value={cnt.id}>
                      {cnt.name} ({cnt.rucOrCedula})
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha Emision */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Fecha Emisión
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm font-medium"
                />
              </div>

              {/* Valida Hasta */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Válida Hasta
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm font-medium"
                />
              </div>
            </div>

            {/* Inputs de cliente directo o manual */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nombre Completo / Razón Social
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Comercializadora San José"
                  value={customContactName}
                  onChange={(e) => setCustomContactName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  RUC / Cédula / NIF
                </label>
                <input
                  type="text"
                  placeholder="Ej. 8-765-4321 DV 45"
                  value={customContactRuc}
                  onChange={(e) => setCustomContactRuc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  WhatsApp / Teléfono
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="+507 6543-2100"
                    value={customContactPhone}
                    onChange={(e) => setCustomContactPhone(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-medium"
                  />
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Productos / Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Productos o Servicios a Cotizar
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs flex items-center gap-1 border border-emerald-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Fila</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-2xs">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 text-[11px] font-bold uppercase border-b border-slate-200">
                    <th className="py-2.5 px-3">Seleccionar / Ítem</th>
                    <th className="py-2.5 px-2 w-20 text-center">Cant.</th>
                    <th className="py-2.5 px-2 w-28 text-right">Precio ($)</th>
                    <th className="py-2.5 px-2 w-20 text-center">Desc (%)</th>
                    <th className="py-2.5 px-2 w-24 text-center">Imp %</th>
                    <th className="py-2.5 px-3 w-28 text-right">Total ($)</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      {/* Product selector / Name */}
                      <td className="p-2 space-y-1">
                        <select
                          value={item.productId}
                          onChange={(e) => handleSelectProduct(index, e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                        >
                          <option value="">-- Buscar en inventario --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} - ${p.price.toFixed(2)} (Stock: {p.stock})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          required
                          placeholder="Descripción o nombre del ítem..."
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

                      {/* Discount */}
                      <td className="p-2 text-center align-top pt-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discount}
                          onChange={(e) => handleUpdateItemField(index, 'discount', Number(e.target.value))}
                          className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-medium"
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
                      <td className="p-2 text-right font-bold text-emerald-700 align-top pt-4 font-mono">
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

          {/* Observaciones y Resumen Totales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Condiciones de la Cotización
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones, tiempo de entrega, condiciones de pago..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Subtotal Bruto:</span>
                <span className="font-mono font-bold">${subtotalSum.toFixed(2)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-xs text-amber-400">
                  <span>Descuentos Aplicados:</span>
                  <span className="font-mono font-bold">-${discountTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-300">
                <span>Impuestos Estimados:</span>
                <span className="font-mono font-bold">${taxTotal.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-base sm:text-lg font-bold">
                <span className="text-emerald-400">Total Cotizado:</span>
                <span className="font-mono text-emerald-400 text-xl font-extrabold">
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
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-2 text-xs sm:text-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Cotización</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
