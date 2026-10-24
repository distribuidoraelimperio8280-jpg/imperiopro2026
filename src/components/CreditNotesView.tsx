import React, { useState } from 'react';
import { 
  RotateCcw, 
  Plus, 
  Search, 
  MessageSquare, 
  Download, 
  Trash2, 
  Package, 
  DollarSign, 
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { CreditNote } from '../types';
import { db } from '../db/indexedDB';
import { useLiveQuery } from 'dexie-react-hooks';
import { generateCreditNotePDF, sendCreditNoteWhatsApp } from '../services/pdfService';

interface CreditNotesViewProps {
  onOpenNewCreditNote: () => void;
}

export const CreditNotesView: React.FC<CreditNotesViewProps> = ({
  onOpenNewCreditNote,
}) => {
  const creditNotes = useLiveQuery(() => db.creditNotes.toArray(), []) || [];
  const companyProfile = useLiveQuery(() => db.companyProfile.get('default'), []);

  const [searchQuery, setSearchQuery] = useState('');

  // Filtered
  const filteredNotes = creditNotes.filter((cn) => {
    const matchesSearch = 
      cn.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cn.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cn.contactRuc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cn.invoiceCode && cn.invoiceCode.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  // KPIs
  const totalCredited = creditNotes.reduce((acc, cn) => acc + cn.total, 0);
  const stockAdjustedNotes = creditNotes.filter((cn) => cn.adjustInventory);

  const handleDeleteCreditNote = async (id: string, code: string) => {
    if (confirm(`¿Estás seguro de eliminar la Nota de Crédito ${code}? Nota: Esto no revertirá automáticamente el stock de inventario.`)) {
      await db.creditNotes.delete(id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-rose-600" />
            Notas de Crédito & Ajustes de Stock
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Emite notas de crédito por devoluciones, descuentos o errores de facturación con reingreso automático al inventario.
          </p>
        </div>

        <button
          onClick={onOpenNewCreditNote}
          className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Nota de Crédito</span>
        </button>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Total Acreditado</span>
            <DollarSign className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
            ${totalCredited.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400">
            {creditNotes.length} notas de crédito registradas
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
            <span>Stock Reingresado</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-900 font-mono">
            {stockAdjustedNotes.length} NC
          </div>
          <div className="text-[11px] text-emerald-600 font-medium">
            Con ajuste de inventario activo
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>Facturas Afectadas</span>
            <FileText className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
            {creditNotes.filter((cn) => cn.invoiceId).length}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Vinculadas directamente a ventas
          </div>
        </div>
      </section>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Buscar por código, cliente, RUC o factura..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Table of Credit Notes */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 text-slate-700 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">Código / Factura</th>
                <th className="py-3.5 px-4">Cliente / RUC</th>
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Motivo / Stock</th>
                <th className="py-3.5 px-4 text-right">Monto Acreditado</th>
                <th className="py-3.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RotateCcw className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-bold text-slate-600">No hay notas de crédito registradas</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Haz clic en "Nueva Nota de Crédito" para realizar un ajuste o devolución de mercancía.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredNotes.map((cn) => (
                  <tr key={cn.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Code & Linked Invoice */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-rose-700">{cn.code}</div>
                      {cn.invoiceCode ? (
                        <div className="text-[11px] text-slate-500 font-medium">
                          Afecta: <span className="font-mono font-bold text-slate-800">{cn.invoiceCode}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic">Emisión libre</div>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{cn.contactName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        RUC: {cn.contactRuc}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                      {cn.date}
                    </td>

                    {/* Reason & Stock Badge */}
                    <td className="py-3.5 px-4 space-y-1">
                      <div className="text-xs font-medium text-slate-800">{cn.reason}</div>
                      {cn.adjustInventory ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-lg text-[10px] inline-flex items-center gap-1">
                          <Package className="w-3 h-3 text-emerald-600" />
                          <span>Stock Reingresado</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 font-semibold rounded-lg text-[10px] inline-flex items-center gap-1">
                          <span>Sin ajuste de stock</span>
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right font-extrabold text-rose-700 font-mono text-base">
                      ${cn.total.toFixed(2)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* WhatsApp Direct Send */}
                        <button
                          onClick={() => sendCreditNoteWhatsApp(cn, companyProfile || { name: '', ruc: '', email: '', phone: '', address: '', currency: 'USD', taxName: '' })}
                          className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors"
                          title="Mandar PDF directo por WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>

                        {/* PDF Download */}
                        <button
                          onClick={() => generateCreditNotePDF(cn, companyProfile || { name: '', ruc: '', email: '', phone: '', address: '', currency: 'USD', taxName: '' })}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                          title="Descargar Hoja PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteCreditNote(cn.id, cn.code)}
                          className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Eliminar Nota de Crédito"
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
