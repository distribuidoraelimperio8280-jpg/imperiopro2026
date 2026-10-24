import React, { useState } from 'react';
import { 
  X, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Printer, 
  MessageCircle, 
  Clock, 
  AlertCircle,
  Building2,
  FileText,
  Pencil,
  Eye,
  Receipt,
  Trash2
} from 'lucide-react';
import type { Invoice, CompanyProfile } from '../types';
import { generateInvoicePDF, printInvoicePDF, formatRucDv, formatTaxLabel } from '../services/pdfService';
import { db } from '../db/indexedDB';
import { syncService } from '../services/syncService';
import { useLiveQuery } from 'dexie-react-hooks';

function toNum(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? 0 : parsed;
}

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onEditInvoice?: (invoice: Invoice) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ 
  invoice, 
  onClose,
  onEditInvoice
}) => {
  const companyProfile = useLiveQuery(() => db.companyProfile.get('default'), []);
  const [activeView, setActiveView] = useState<'details' | 'preview-sheet'>('preview-sheet');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!invoice) return null;

  const handleMarkAsPaid = async () => {
    await db.invoices.update(invoice.id, {
      status: 'paid',
      paidAmount: invoice.total,
      updatedAt: new Date().toISOString(),
    });
    const updated = await db.invoices.get(invoice.id);
    if (updated) {
      await syncService.queueChange('invoices', 'update', updated);
    }
  };

  const handleHardDeleteInvoice = async () => {
    await db.invoices.delete(invoice.id);
    await syncService.queueChange('invoices', 'delete', { id: invoice.id });
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleShareWhatsApp = () => {
    const text = `Hola *${invoice.contactName}*, te adjuntamos el resumen de tu Factura N° *${invoice.code}* por un total de *B/. ${toNum(invoice.total).toFixed(2)}*. Fecha de vencimiento: ${invoice.dueDate}. ¡Gracias por preferirnos!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900">{invoice.code}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                  invoice.status === 'paid'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : invoice.status === 'overdue'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : invoice.status === 'cancelled'
                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {invoice.status === 'paid' ? 'Pagada' : invoice.status === 'overdue' ? 'Vencida' : invoice.status === 'cancelled' ? 'Anulada' : 'Pendiente'}
                </span>
              </div>
              <p className="text-xs text-slate-500">Cliente: {invoice.contactName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEditInvoice && invoice.status !== 'cancelled' && (
              <button
                onClick={() => {
                  onClose();
                  onEditInvoice(invoice);
                }}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Modificar esta factura"
              >
                <Pencil className="w-3.5 h-3.5 text-amber-600" />
                <span>Modificar Factura</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('preview-sheet')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'preview-sheet'
                  ? 'bg-white text-sky-700 shadow-xs font-bold border border-sky-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-sky-600" />
              <span>Vista Factura Oficial Serif Moderna (A4)</span>
            </button>

            <button
              onClick={() => setActiveView('details')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'details'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Resumen de Datos</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-500 hidden sm:inline">
            📄 Documento Oficial de Venta Empresarial
          </span>
        </div>

        {/* Content Details */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-slate-700 bg-slate-100/50">
          
          {activeView === 'preview-sheet' ? (
            /* High-Density Standard Letter (8.5x11 in) Printable Sheet Template (Cabe 10 a 15 productos por hoja) */
            <div className="flex justify-center p-1 sm:p-2">
              <div className="w-full max-w-2xl bg-white p-5 sm:p-6 rounded-2xl shadow-md border border-slate-200/80 text-[10px] space-y-3.5 text-slate-800 tracking-tight leading-tight relative printable-area">
                
                {/* Header Compacto Horizontal */}
                <div className="flex justify-between items-center border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-3">
                    {companyProfile?.logoUrl && (
                      <img src={companyProfile.logoUrl} alt="Logo" className="max-h-12 max-w-[120px] object-contain rounded" />
                    )}
                    <div>
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                        {companyProfile?.name || 'DISTRIBUIDORA EL IMPERIO'}
                      </h2>
                      <p className="text-[9.5px] text-slate-500 mt-0.5 leading-snug">
                        <strong>RUC:</strong> {formatRucDv(companyProfile?.ruc || '155689021-2-2026', companyProfile?.dv)} · <strong>Tel:</strong> {companyProfile?.whatsapp || companyProfile?.phone || '64429775'} · <strong>Email:</strong> {companyProfile?.email || 'N/A'}<br/>
                        <strong>Dirección:</strong> {companyProfile?.address || 'Panamá, Rep. de Panamá'}
                      </p>
                    </div>
                  </div>

                  {/* Caja de Factura Suave y Traslúcida */}
                  <div className="text-right bg-sky-500/10 border border-sky-300/30 p-2 rounded-xl min-w-[150px]">
                    <div className="text-sky-800 font-extrabold text-[9.5px] uppercase tracking-wider">FACTURA DE VENTA</div>
                    <div className="font-mono font-black text-sm text-slate-900">{invoice.code}</div>
                    <span className={`inline-block px-2 py-0.2 rounded-full text-[9px] font-bold uppercase mt-0.5 ${
                      invoice.status === 'paid' ? 'bg-emerald-500/15 text-emerald-800' : 'bg-amber-500/15 text-amber-800'
                    }`}>
                      {invoice.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Datos del Cliente y Emisión en Franja Horizontal Continua */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50/70 border border-slate-200/60 p-2 rounded-xl text-[9.5px]">
                  <div>
                    <span className="text-slate-400 uppercase font-bold text-[8.5px] block">Cliente / Comprador</span>
                    <strong className="text-slate-900 font-bold block truncate">{invoice.contactName}</strong>
                    <span className="text-slate-500">RUC / Cédula: </span>
                    <strong className="text-slate-800">{formatRucDv(invoice.contactRuc, invoice.contactDv)}</strong>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 uppercase font-bold text-[8.5px] block">Términos de Emisión</span>
                    <div><span className="text-slate-500">Emisión:</span> <strong className="text-slate-800">{invoice.date}</strong> · <span className="text-slate-500">Vence:</span> <strong className="text-slate-800">{invoice.dueDate}</strong></div>
                    <div><span className="text-slate-500">Pago:</span> <strong className="uppercase text-slate-800">{invoice.paymentMethod}</strong></div>
                  </div>
                </div>

                {/* Tabla de Artículos de Alta Densidad (Letras más menudas y corridas horizontales, cabe de 10 a 15 productos) */}
                <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[9.5px] border-collapse">
                    <thead className="bg-slate-800/85 text-white text-[8.5px] uppercase font-bold tracking-tight">
                      <tr>
                        <th className="py-1 px-1.5 text-center w-6">#</th>
                        <th className="py-1 px-1.5 text-center w-8">Cant</th>
                        <th className="py-1 px-2">Descripción del Producto / Servicio (Horizontal Corrido)</th>
                        <th className="py-1 px-2 text-right w-16">P. Unit</th>
                        <th className="py-1 px-1.5 text-center w-10">Imp</th>
                        <th className="py-1 px-2 text-right w-16">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoice.items.map((item, idx) => (
                        <tr key={item.id} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                          <td className="py-1 px-1.5 text-center text-slate-400 font-mono text-[9px]">{idx + 1}</td>
                          <td className="py-1 px-1.5 text-center font-bold text-slate-900 font-mono">{item.quantity}</td>
                          <td className="py-1 px-2 font-medium text-slate-800 truncate max-w-xs sm:max-w-md">
                            <span>{item.name}</span>
                          </td>
                          <td className="py-1 px-2 text-right font-mono text-slate-700">B/. {toNum(item.price).toFixed(2)}</td>
                          <td className="py-1 px-1.5 text-center text-slate-500 text-[9px] font-mono">{item.taxRate}%</td>
                          <td className="py-1 px-2 text-right font-mono font-bold text-slate-900">B/. {toNum(item.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totales y Observaciones Compactas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-start">
                  <div className="sm:col-span-2 bg-slate-50/70 border border-slate-200/60 p-2 rounded-xl text-[9px] text-slate-600">
                    <strong className="block text-slate-800 mb-0.5">Observaciones:</strong>
                    <p className="line-clamp-2">{invoice.notes || 'Factura generada electrónicamente para DISTRIBUIDORA EL IMPERIO. Documento oficial de venta comercial.'}</p>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/80 p-2 rounded-xl text-[9.5px] space-y-0.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono">B/. {toNum(invoice.subtotal).toFixed(2)}</span>
                    </div>
                    {toNum(invoice.discountTotal) > 0 && (
                      <div className="flex justify-between text-rose-700">
                        <span>Descuento:</span>
                        <span className="font-mono">-B/. {toNum(invoice.discountTotal).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>{formatTaxLabel(companyProfile?.taxName)}:</span>
                      <span className="font-mono">B/. {toNum(invoice.taxTotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-black text-[11px] text-slate-950 border-t border-slate-200/80 pt-1 mt-1 bg-sky-500/15 p-1 rounded-lg">
                      <span>TOTAL:</span>
                      <span className="font-mono text-sky-900">B/. {toNum(invoice.total).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Firmas de Entrega Compactas */}
                <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-200/60 text-center text-[9px] text-slate-400">
                  <div className="border-t border-slate-300 pt-0.5 uppercase">ENTREGADO POR / FIRMA AUTORIZADA</div>
                  <div className="border-t border-slate-300 pt-0.5 uppercase">RECIBIDO CONFORME (CLIENTE)</div>
                </div>

              </div>
            </div>
          ) : activeView === 'details' ? (
            <>
              {/* Metadata Block */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Fecha Emisión</span>
                  <span className="font-semibold text-slate-800">{invoice.date}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Fecha Vencimiento</span>
                  <span className="font-semibold text-slate-800">{invoice.dueDate}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Forma de Pago</span>
                  <span className="font-semibold text-slate-800 uppercase">{invoice.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">RUC / Cédula</span>
                  <span className="font-semibold text-slate-800">{formatRucDv(invoice.contactRuc, invoice.contactDv)}</span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Detalle de Productos y Servicios
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-500 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Cant</th>
                        <th className="p-2.5">Descripción</th>
                        <th className="p-2.5 text-right">Precio Unit</th>
                        <th className="p-2.5 text-right">Impuesto</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoice.items.map((item) => (
                        <tr key={item.id}>
                          <td className="p-2.5 font-bold text-slate-900">{item.quantity}</td>
                          <td className="p-2.5 font-medium">{item.name}</td>
                          <td className="p-2.5 text-right font-mono">${toNum(item.price).toFixed(2)}</td>
                          <td className="p-2.5 text-right text-slate-500">{item.taxRate}%</td>
                          <td className="p-2.5 text-right font-bold text-slate-900 font-mono">${toNum(item.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-xs bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>${toNum(invoice.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Impuestos:</span>
                    <span>${toNum(invoice.taxTotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm text-slate-900 border-t border-slate-200 pt-1.5">
                    <span>Total:</span>
                    <span>${toNum(invoice.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {invoice.notes && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs">
                  <span className="font-bold text-slate-600 block mb-1">Notas / Observaciones:</span>
                  <p className="text-slate-500 italic">{invoice.notes}</p>
                </div>
              )}
            </>
          ) : (
            /* Live Ticket / Receipt Visual Preview */
            <div className="flex justify-center p-2">
              <div className="w-full max-w-sm bg-white p-5 rounded-xl shadow-md border border-slate-300 font-sans text-xs space-y-3 text-slate-800">
                
                {/* Ticket Header */}
                <div className="text-center space-y-1 pb-3 border-b border-slate-900">
                  {companyProfile?.logoUrl && (
                    <img src={companyProfile.logoUrl} alt="Logo" className="h-10 mx-auto object-contain mb-1" />
                  )}
                  <h3 className="font-black text-sm uppercase text-slate-900">{companyProfile?.name || 'DISTRIBUIDORA EL IMPERIO'}</h3>
                  <p className="text-[11px] text-slate-600">RUC: {formatRucDv(companyProfile?.ruc || '155689021-2-2026', companyProfile?.dv)}</p>
                  <p className="text-[10px] text-slate-500">{companyProfile?.phone || companyProfile?.whatsapp} | {companyProfile?.email}</p>
                  <p className="text-[10px] text-slate-500">{companyProfile?.address}</p>
                </div>

                {/* Ticket Info */}
                <div className="text-[11px] space-y-0.5 pt-1">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-900">FACTURA DE VENTA:</span>
                    <span className="font-mono font-bold text-sky-700">{invoice.code}</span>
                  </div>
                  <div><strong>Fecha:</strong> {invoice.date} {invoice.dueDate ? ` | Venc: ${invoice.dueDate}` : ''}</div>
                  <div><strong>Cliente:</strong> {invoice.contactName}</div>
                  <div><strong>RUC / Cédula:</strong> {formatRucDv(invoice.contactRuc, invoice.contactDv)}</div>
                  <div><strong>Forma de Pago:</strong> {invoice.paymentMethod.toUpperCase()}</div>
                </div>

                {/* Ticket Table */}
                <div className="pt-2 border-t border-dashed border-slate-300">
                  <table className="w-full text-left text-[11px]">
                    <thead className="border-b border-slate-900 uppercase font-bold text-[10px]">
                      <tr>
                        <th className="py-1">Ítem</th>
                        <th className="py-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dashed divide-slate-200">
                      {invoice.items.map((i) => (
                        <tr key={i.id}>
                          <td className="py-1.5">
                            <div className="font-bold text-slate-900">{i.name}</div>
                            <div className="text-[10px] text-slate-500">{i.quantity} x ${toNum(i.price).toFixed(2)}</div>
                          </td>
                          <td className="py-1.5 text-right font-mono font-bold text-slate-900">${toNum(i.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Ticket Totals */}
                <div className="pt-2 border-t border-slate-900 text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">${toNum(invoice.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{formatTaxLabel(companyProfile?.taxName)}:</span>
                    <span className="font-mono">${toNum(invoice.taxTotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1 border-t border-dashed border-slate-400">
                    <span>TOTAL A PAGAR:</span>
                    <span className="font-mono text-emerald-700">${toNum(invoice.total).toFixed(2)} USD</span>
                  </div>
                </div>

                {/* Ticket Footer */}
                <div className="text-center pt-3 border-t border-slate-900 text-[10px] text-slate-500">
                  <p className="font-bold text-slate-800">¡Gracias por su preferencia!</p>
                  <p>Factura electrónica generada vía IMPERIO PRO CONTABILIDAD</p>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <button
                onClick={handleMarkAsPaid}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Marcar como Pagada</span>
              </button>
            )}

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
              title="Eliminar de forma permanente esta factura del sistema"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Eliminar Definitivamente</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp</span>
            </button>

            {/* Primary Print Button: A4 Format */}
            <button
              onClick={() => printInvoicePDF(invoice, companyProfile)}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Abre el visor oficial de impresión para factura A4 Serif Moderna"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Factura A4</span>
            </button>

            {/* Download A4/Letter PDF */}
            <button
              onClick={() => generateInvoicePDF(invoice, companyProfile)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar PDF</span>
            </button>
          </div>

        </div>

      </div>
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold">Eliminar Factura Permanentemente</h3>
            </div>
            <p className="text-slate-600 mb-6">
              ¿Estás seguro de <strong>ELIMINAR DEFINITIVAMENTE</strong> la factura <strong>{invoice.code}</strong>? Esta acción la borrará por completo del sistema sin dejar rastros y no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleHardDeleteInvoice}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
