import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  MessageSquare, 
  Download, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowRightLeft, 
  Pencil, 
  Trash2,
  Building2,
  DollarSign
} from 'lucide-react';
import type { Quote, Invoice, InvoiceItem, QuoteStatus } from '../types';
import { db } from '../db/indexedDB';
import { useLiveQuery } from 'dexie-react-hooks';
import { generateQuotePDF, sendQuoteWhatsApp } from '../services/pdfService';
import { syncService } from '../services/syncService';
import confetti from 'canvas-confetti';

interface QuotesViewProps {
  onOpenNewQuote: () => void;
  onEditQuote: (quote: Quote) => void;
  onNavigateTab: (tab: any) => void;
}

export const QuotesView: React.FC<QuotesViewProps> = ({
  onOpenNewQuote,
  onEditQuote,
  onNavigateTab,
}) => {
  const quotes = useLiveQuery(() => db.quotes.toArray(), []) || [];
  const companyProfile = useLiveQuery(() => db.companyProfile.get('default'), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Filtered quotes
  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch = 
      q.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.contactRuc.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || q.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  // KPI calculations
  const totalAmount = quotes.reduce((acc, q) => acc + q.total, 0);
  const pendingQuotes = quotes.filter((q) => q.status === 'pending');
  const acceptedQuotes = quotes.filter((q) => q.status === 'accepted');
  const convertedQuotes = quotes.filter((q) => q.status === 'converted');

  const handleDeleteQuote = async (id: string, code: string) => {
    if (confirm(`¿Estás seguro de eliminar la cotización ${code}?`)) {
      await db.quotes.delete(id);
      await syncService.queueChange('quotes', 'delete', { id });
    }
  };

  // Convert Quote to Sales Invoice in 1 Click!
  const handleConvertToInvoice = async (quote: Quote) => {
    if (confirm(`¿Deseas convertir la cotización ${quote.code} en una Factura de Venta oficial?`)) {
      const invoiceCount = await db.invoices.count();
      const invoiceCode = `FAC-${(invoiceCount + 1).toString().padStart(4, '0')}`;

      // Convert quote items to invoice items (ensure clean alphanumeric IDs without decimals)
      const invoiceItems: InvoiceItem[] = quote.items.map((i, idx) => ({
        id: `inv-item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        price: i.price,
        taxRate: i.taxRate,
        discount: i.discount,
        subtotal: i.subtotal,
        taxAmount: i.taxAmount,
        total: i.total,
      }));

      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        code: invoiceCode,
        type: 'sale',
        contactId: quote.contactId || '',
        contactName: quote.contactName,
        contactRuc: quote.contactRuc,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        items: invoiceItems,
        subtotal: quote.subtotal,
        taxTotal: quote.taxTotal,
        discountTotal: quote.discountTotal,
        total: quote.total,
        paidAmount: 0,
        status: 'pending',
        paymentMethod: 'transfer',
        notes: `Factura generada desde Cotización ${quote.code}. ${quote.notes || ''}`,
        isSynced: false,
        offlineCreated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.invoices.put(newInvoice);
      await syncService.queueChange('invoices', 'create', newInvoice);

      // Descuento automático de inventario para cada ítem de la cotización convertida
      for (const item of invoiceItems) {
        if (item.productId) {
          const prod = await db.products.get(item.productId);
          if (prod) {
            const currentStock = Number(prod.stock) || 0;
            const deduction = Number(item.quantity) || 0;
            const updatedStock = Math.max(0, currentStock - deduction);
            const updatedProd = {
              ...prod,
              stock: updatedStock,
              updatedAt: new Date().toISOString(),
            };
            await db.products.update(item.productId, {
              stock: updatedStock,
              updatedAt: new Date().toISOString(),
            });
            await syncService.queueChange('products', 'update', updatedProd);
          }
        }
      }

      // Mark quote as converted
      const updatedQuoteData = {
        ...quote,
        status: 'converted' as const,
        updatedAt: new Date().toISOString(),
      };
      await db.quotes.update(quote.id, {
        status: 'converted',
        updatedAt: new Date().toISOString(),
      });
      await syncService.queueChange('quotes', 'update', updatedQuoteData);

      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
      });

      alert(`¡Factura ${invoiceCode} creada exitosamente desde la cotización ${quote.code}! El inventario ha sido rebajado automáticamente.`);
      onNavigateTab('invoices');
    }
  };

  const getStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-lg text-[11px] inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Aceptada</span>
          </span>
        );
      case 'converted':
        return (
          <span className="px-2.5 py-1 bg-sky-100 text-sky-800 border border-sky-200 font-bold rounded-lg text-[11px] inline-flex items-center gap-1">
            <ArrowRightLeft className="w-3.5 h-3.5 text-sky-600" />
            <span>Facturada</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-200 font-bold rounded-lg text-[11px] inline-flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Rechazada</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-lg text-[11px] inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Pendiente</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            Cotizaciones & Presupuestos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Crea ofertas comerciales, genera hojas PDF y envíalas directamente al WhatsApp del cliente.
          </p>
        </div>

        <button
          onClick={onOpenNewQuote}
          className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Cotización</span>
        </button>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Total Cotizado</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
            ${totalAmount.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400">
            {quotes.length} cotizaciones registradas
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center justify-between">
            <span>Pendientes</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-900 font-mono">
            {pendingQuotes.length}
          </div>
          <div className="text-[11px] text-amber-600 font-medium">
            Monto: ${pendingQuotes.reduce((a, b) => a + b.total, 0).toFixed(2)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
            <span>Aceptadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-900 font-mono">
            {acceptedQuotes.length}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">
            Listas para facturar
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-sky-700 uppercase tracking-wider flex items-center justify-between">
            <span>Convertidas a Factura</span>
            <ArrowRightLeft className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-sky-900 font-mono">
            {convertedQuotes.length}
          </div>
          <div className="text-[11px] text-sky-600 font-medium">
            Facturación concretada
          </div>
        </div>
      </section>

      {/* Filter and Search controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Buscar por código, cliente o RUC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-500 uppercase shrink-0">Estado:</span>
          {['all', 'pending', 'accepted', 'converted', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 capitalize ${
                selectedStatus === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? 'Todas' : st === 'pending' ? 'Pendientes' : st === 'accepted' ? 'Aceptadas' : st === 'converted' ? 'Facturadas' : 'Rechazadas'}
            </button>
          ))}
        </div>
      </div>

      {/* Table of Quotes */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">Código</th>
                <th className="py-3.5 px-4">Cliente / RUC</th>
                <th className="py-3.5 px-4">Fecha / Validez</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Monto Total</th>
                <th className="py-3.5 px-4 text-center">Acciones Especiales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-bold text-slate-600">No hay cotizaciones registradas</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Haz clic en "Nueva Cotización" para emitir la primera oferta a tu cliente.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Code */}
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                      {q.code}
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{q.contactName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        RUC: {q.contactRuc} {q.contactPhone ? `| WAP: ${q.contactPhone}` : ''}
                      </div>
                    </td>

                    {/* Dates */}
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-medium text-slate-700">Emisión: {q.date}</div>
                      <div className="text-[11px] text-slate-500">Hasta: {q.validUntil}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(q.status)}
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 font-mono text-base">
                      ${q.total.toFixed(2)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* WhatsApp Direct Send */}
                        <button
                          onClick={() => sendQuoteWhatsApp(q, companyProfile || { name: '', ruc: '', email: '', phone: '', address: '', currency: 'USD', taxName: '' })}
                          className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors"
                          title="Mandar PDF directo por WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>

                        {/* PDF Download */}
                        <button
                          onClick={() => generateQuotePDF(q, companyProfile || { name: '', ruc: '', email: '', phone: '', address: '', currency: 'USD', taxName: '' })}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                          title="Descargar Hoja PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Convert to Sales Invoice */}
                        {q.status !== 'converted' && (
                          <button
                            onClick={() => handleConvertToInvoice(q)}
                            className="p-1.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors"
                            title="Convertir a Factura de Venta"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                            <span className="hidden lg:inline">Facturar</span>
                          </button>
                        )}

                        {/* Edit */}
                        <button
                          onClick={() => onEditQuote(q)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                          title="Editar Cotización"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteQuote(q.id, q.code)}
                          className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Eliminar Cotización"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
