import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Download, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle,
  Share2,
  Calendar,
  Filter,
  Pencil,
  Printer,
  Trash2,
  Zap
} from 'lucide-react';
import type { Invoice, CompanyProfile } from '../types';
import { db } from '../db/indexedDB';
import { syncService } from '../services/syncService';
import { useLiveQuery } from 'dexie-react-hooks';
import { generateInvoicePDF, printInvoicePDF } from '../services/pdfService';
import { PosFlashModal } from './PosFlashModal';

interface InvoicesViewProps {
  onOpenNewInvoice: () => void;
  onSelectInvoice: (invoice: Invoice) => void;
  onEditInvoice?: (invoice: Invoice) => void;
  searchTerm: string;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  onOpenNewInvoice,
  onSelectInvoice,
  onEditInvoice,
  searchTerm,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue' | 'cancelled'>('all');
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [isPosFlashOpen, setIsPosFlashOpen] = useState(false);
  const invoices = useLiveQuery(() => db.invoices.toArray(), []) || [];
  const companyProfile = useLiveQuery(() => db.companyProfile.get('default'), []);

  const handleHardDeleteInvoice = (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setInvoiceToDelete(inv);
  };
  
  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    await db.invoices.delete(invoiceToDelete.id);
    await syncService.queueChange('invoices', 'delete', { id: invoiceToDelete.id });
    setInvoiceToDelete(null);
  };

  // Filter Logic (Excludes any cancelled items if present, keeping DB hard-deleted)
  const filteredInvoices = invoices.filter((inv) => {
    if (inv.status === 'cancelled') return false; // Hard hide / auto purge rule

    const matchesSearch = 
      inv.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.contactRuc.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Facturación y Ventas</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gestiona comprobantes, facturas de venta, cobros y exportación oficial en PDF.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setIsPosFlashOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer border border-emerald-400/40"
            title="Abrir Terminal Punto de Venta Flash para ventas de mostrador ultra rápidas"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
            <span>TPV Flash Mostrador</span>
          </button>

          <button
            onClick={onOpenNewInvoice}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Crear Nueva Factura</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({invoices.length})
          </button>

          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Cobradas ({invoices.filter(i => i.status === 'paid').length})</span>
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Pendientes ({invoices.filter(i => i.status === 'pending').length})</span>
          </button>

          <button
            onClick={() => setStatusFilter('overdue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              statusFilter === 'overdue'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Vencidas ({invoices.filter(i => i.status === 'overdue').length})</span>
          </button>

        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-600 border-collapse">
            <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Emisión</th>
                <th className="py-3 px-4">Vencimiento</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                  <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap font-mono">
                    {inv.code}
                    {inv.offlineCreated && (
                      <span className="ml-1.5 text-[10px] text-amber-600 font-normal bg-amber-50 px-1 py-0.5 rounded border border-amber-100">
                        Offline
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    <div className="font-bold text-slate-900">{inv.contactName}</div>
                    <div className="text-[10px] text-slate-400">{inv.contactRuc}</div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-xs">{inv.date}</td>
                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-xs">{inv.dueDate}</td>

                  <td className="py-3.5 px-4 text-right text-slate-500 font-mono">
                    ${inv.subtotal.toFixed(2)}
                  </td>

                  <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 font-mono">
                    ${inv.total.toFixed(2)}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap text-center">
                    <span className={`inline-block px-2.5 py-1 rounded text-[11px] font-bold ${
                      inv.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-700'
                        : inv.status === 'overdue'
                        ? 'bg-rose-100 text-rose-700'
                        : inv.status === 'cancelled'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {inv.status === 'paid' ? 'Cobrada' : inv.status === 'overdue' ? 'Vencida' : inv.status === 'cancelled' ? 'Anulada' : 'Pendiente'}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onSelectInvoice(inv)}
                        className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                        title="Consultar y Vista Previa"
                      >
                        <Eye className="w-4 h-4 text-sky-600" />
                        <span className="hidden sm:inline">Ver</span>
                      </button>

                      {onEditInvoice && inv.status !== 'cancelled' && (
                        <button
                          onClick={() => onEditInvoice(inv)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                          title="Modificar Factura"
                        >
                          <Pencil className="w-4 h-4 text-amber-600" />
                          <span className="hidden sm:inline">Editar</span>
                        </button>
                      )}

                      <button
                        onClick={() => printInvoicePDF(inv, companyProfile)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Imprimir Factura A4 Oficial"
                      >
                        <Printer className="w-4 h-4 text-emerald-600" />
                      </button>

                      <button
                        onClick={() => generateInvoicePDF(inv, companyProfile)}
                        className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                        title="Descargar PDF A4"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => handleHardDeleteInvoice(inv, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar Definitivamente (Hard Delete)"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No se encontraron facturas con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
      {invoiceToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Eliminar Factura Permanentemente</h3>
            </div>
            <p className="text-slate-600 mb-6">
              ¿Estás seguro de <strong>ELIMINAR DEFINITIVAMENTE</strong> la factura <strong>{invoiceToDelete.code}</strong>? Esta acción la borrará por completo del sistema sin dejar rastros y no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); setInvoiceToDelete(null); }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); confirmDeleteInvoice(); }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal TPV Flash Mostrador (Ferretería / Agro / Electricidad) */}
      <PosFlashModal
        isOpen={isPosFlashOpen}
        onClose={() => setIsPosFlashOpen(false)}
      />
    </>
  );
};
