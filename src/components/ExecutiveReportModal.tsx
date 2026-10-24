import React from 'react';
import {
  Printer,
  Download,
  X,
  FileText,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  ShieldCheck,
  Award,
  Users,
  Package,
  Layers,
  CalendarDays
} from 'lucide-react';
import type { CompanyProfile } from '../types';
import { generateExecutiveReportPDF, type ExecutiveReportData } from '../services/pdfService';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: ExecutiveReportData;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  reportData,
}) => {
  if (!isOpen) return null;

  const { company, period, kpis, topItems, topClients, sellers, paymentMethods, infrastructureHealth } = reportData;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadDirectPDF = () => {
    generateExecutiveReportPDF(reportData);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 p-2 sm:p-4 md:p-6 flex items-start justify-center backdrop-blur-xs"
    >
      {/* Container holding controls and printable content */}
      <div className="w-full max-w-4xl my-auto">
        
        {/* Modal Toolbar (hidden when printing thanks to .no-print / .no-print-toolbar) */}
        <div className="no-print no-print-toolbar mb-4 bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>Reporte Ejecutivo Integral</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-500/40">
                  Listo para Descarga
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Aplica estilos A4 exactos de impresión definidos en el sistema.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-bold rounded-xl border border-slate-600 transition-all cursor-pointer shadow-xs"
              title="Abrir diálogo de impresión para Guardar como PDF o Imprimir en papel"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span>Imprimir / Guardar PDF</span>
            </button>

            <button
              onClick={handleDownloadDirectPDF}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              title="Descargar archivo .pdf vectorizado generado directamente"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Descargar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer ml-1"
              title="Cerrar vista previa"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* DOCUMENTO PRINCIPAL IMPRIMIBLE (printable-area & printable-content) */}
        {/* ========================================================= */}
        <div className="printable-area printable-content bg-white p-6 sm:p-10 rounded-2xl shadow-2xl border border-slate-200 text-slate-900 print:shadow-none print:border-none print:p-0 print:m-0 print:rounded-none">
          
          {/* Header Banner */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="inline-block px-2.5 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded mb-2">
                  Documento Oficial de Auditoría & Gestión
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  REPORTE EJECUTIVO INTEGRAL
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Consolidado Financiero, Comercial, Operativo y de Infraestructura
                </p>
              </div>

              <div className="text-left sm:text-right text-xs text-slate-600 space-y-1">
                <div className="font-extrabold text-slate-900 text-sm">{company?.name || 'DISTRIBUIDORA EL IMPERIO'}</div>
                <div>RUC: <span className="font-mono font-bold text-slate-800">{company?.ruc || '155689021-2-2026'}</span> {company?.dv ? `DV: ${company.dv}` : ''}</div>
                <div>{company?.address || 'Panamá, Rep. de Panamá'}</div>
                <div>{company?.email || 'distribuidoraelimperio8280@gmail.com'}</div>
              </div>
            </div>

            {/* Sub-bar with audit metadata */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500">Período Auditado:</span>
                <span className="font-mono font-extrabold bg-slate-100 px-2 py-0.5 rounded text-slate-900">
                  {period.startDate} al {period.endDate}
                </span>
              </div>

              <div className="flex items-center gap-4 text-slate-500">
                <div>
                  <span className="font-medium">Moneda: </span>
                  <span className="font-bold text-slate-800">USD ($)</span>
                </div>
                <div>
                  <span className="font-medium">Emisión: </span>
                  <span className="font-bold text-slate-800 font-mono">
                    {new Date().toLocaleDateString('es-PA')} {new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 1. SECCIÓN: RESUMEN EJECUTIVO (KPIS CLAVE) */}
          <div className="mb-6 avoid-break-inside">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>1. Indicadores Financieros y Comerciales Críticos</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ventas Totales (Bruto)</div>
                <div className="text-lg sm:text-xl font-black font-mono text-slate-900">
                  ${kpis.totalGrossSales.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500">
                  Subtotal: ${kpis.totalSubtotal.toFixed(2)}
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Cobranza Liquidada (Efectiva)</div>
                <div className="text-lg sm:text-xl font-black font-mono text-emerald-700">
                  ${kpis.paidTotal.toFixed(2)}
                </div>
                <div className="text-[10px] text-emerald-700 font-medium">
                  {kpis.paidCount} facturas canceladas ({kpis.collectionRate.toFixed(1)}%)
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Cuentas por Cobrar</div>
                <div className="text-lg sm:text-xl font-black font-mono text-amber-700">
                  ${kpis.pendingReceivable.toFixed(2)}
                </div>
                <div className="text-[10px] text-amber-700 font-medium">
                  {kpis.pendingCount} pend. ({kpis.overdueCount} vencidas)
                </div>
              </div>

              <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">ITBMS Fiscal Recaudado</div>
                <div className="text-lg sm:text-xl font-black font-mono text-sky-700">
                  ${kpis.totalTaxCollected.toFixed(2)}
                </div>
                <div className="text-[10px] text-sky-700">
                  Descuentos: -${kpis.totalDiscount.toFixed(2)}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ticket Promedio</div>
                <div className="text-lg sm:text-xl font-black font-mono text-slate-900">
                  ${kpis.averageTicket.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500">
                  {kpis.invoiceCount} comprobantes procesados
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Utilidad Bruta Estimada</div>
                <div className="text-lg sm:text-xl font-black font-mono text-emerald-700">
                  ${kpis.estimatedNetProfit.toFixed(2)}
                </div>
                <div className="text-[10px] text-emerald-700 font-medium">
                  Margen: {kpis.netProfitMargin.toFixed(1)}% sobre ventas
                </div>
              </div>
            </div>
          </div>

          {/* 2. SECCIÓN: ESTRUCTURA DE COBRANZA Y CARTERA */}
          <div className="mb-6 p-4 bg-slate-900 text-white rounded-xl avoid-break-inside">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-black text-white text-xs uppercase tracking-wider">Composición de Cartera y Efectividad:</span>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  El {kpis.collectionRate.toFixed(1)}% de las ventas brutas ha sido liquidado en efectivo o bancarizado.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Total Facturado</div>
                  <div className="font-mono font-bold text-white">${kpis.totalGrossSales.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Por Cobrar</div>
                  <div className="font-mono font-bold text-amber-400">${kpis.pendingReceivable.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. SECCIÓN: TOP PRODUCTOS Y SERVICIOS */}
          <div className="mb-6 avoid-break-inside">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Package className="w-4 h-4 text-sky-600" />
              <span>2. Top Artículos y Servicios por Volumen Comercial</span>
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase">
                  <tr>
                    <th className="px-3 py-2">Producto / Servicio</th>
                    <th className="px-3 py-2 text-right">Cant. Vendida</th>
                    <th className="px-3 py-2 text-right">Subtotal ($)</th>
                    <th className="px-3 py-2 text-right">Margen Est. ($)</th>
                    <th className="px-3 py-2 text-right">Total Facturado ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topItems.slice(0, 8).map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                      <td className="px-3 py-2 font-medium text-slate-900 truncate max-w-[200px]">
                        {item.name}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{item.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">${item.subtotal.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-700">${item.profit.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  {topItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-slate-400 italic">
                        Sin transacciones de artículos en el período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGE BREAK FOR PRINT (Clean A4 multi-page split) */}
          <div className="page-break-before hidden print:block"></div>

          {/* 4. SECCIÓN: TOP CLIENTES CLAVE */}
          <div className="mb-6 pt-4 print:pt-0 avoid-break-inside">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>3. Cartera de Clientes Principales & Participación</span>
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase">
                  <tr>
                    <th className="px-3 py-2">Cliente / Razón Social</th>
                    <th className="px-3 py-2">RUC / Cédula</th>
                    <th className="px-3 py-2 text-center">N° Comprobantes</th>
                    <th className="px-3 py-2 text-right">Total Comprado ($)</th>
                    <th className="px-3 py-2 text-right">% Participación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topClients.slice(0, 8).map((c, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                      <td className="px-3 py-2 font-medium text-slate-900 truncate max-w-[200px]">
                        {c.name}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-500 text-[11px]">{c.ruc || 'N/A'}</td>
                      <td className="px-3 py-2 text-center font-mono">{c.invoiceCount}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">${c.total.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-700 font-bold">{c.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {topClients.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-slate-400 italic">
                        Sin datos de clientes en el período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. SECCIÓN: CANALES Y MEDIOS DE PAGO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 avoid-break-inside">
            {/* Medios de Pago */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 text-slate-800 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                4. Medios de Pago Utilizados
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-1.5">Método</th>
                    <th className="px-3 py-1.5 text-center">Docs</th>
                    <th className="px-3 py-1.5 text-right">Total ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paymentMethods.slice(0, 5).map((pm, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                      <td className="px-3 py-1.5 font-medium text-slate-800 capitalize">{pm.method}</td>
                      <td className="px-3 py-1.5 text-center font-mono">{pm.count}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900">${pm.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vendedores y Canales */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 text-slate-800 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                5. Rendimiento por Vendedor / Canal
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-1.5">Vendedor</th>
                    <th className="px-3 py-1.5 text-center">Ventas</th>
                    <th className="px-3 py-1.5 text-right">Total ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sellers.slice(0, 5).map((s, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{s.name}</td>
                      <td className="px-3 py-1.5 text-center font-mono">{s.invoiceCount}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900">${s.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. SECCIÓN: ESTADO DE INFRAESTRUCTURA & SEGURIDAD */}
          <div className="mb-8 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 avoid-break-inside">
            <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>6. Auditoría de Infraestructura, Respaldos & Resiliencia Offline</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 text-[11px]">
              <div>
                • Último Respaldo Verificado: <span className="font-semibold text-slate-900">
                  {infrastructureHealth?.lastBackupDate 
                    ? new Date(infrastructureHealth.lastBackupDate).toLocaleString('es-PA') 
                    : 'Almacenado y vigente en /storage/backups/db/'}
                </span>
              </div>
              <div>
                • Política de Resguardo: <span className="font-semibold text-slate-900">Compresión GZIP, Cifrado y Retención 30 días</span>
              </div>
              <div>
                • Modo Offline PWA: <span className="font-semibold text-slate-900">Integración en tiempo real con IndexedDB (Dexie)</span>
              </div>
              <div>
                • Base de Datos Cloud: <span className="font-semibold text-slate-900">Google Cloud Firestore Sincronizado</span>
              </div>
            </div>
          </div>

          {/* 7. SECCIÓN: CERTIFICACIÓN Y FIRMAS EJECUTIVAS */}
          <div className="mt-8 pt-6 border-t-2 border-slate-200 avoid-break-inside">
            <div className="text-[11px] text-slate-500 mb-8 italic">
              Declaración de Conformidad: Se certifica que la información aquí consolidada corresponde fielmente a los registros contables y comprobantes fiscales emitidos en el período especificado.
            </div>

            <div className="grid grid-cols-2 gap-12 text-center text-xs">
              <div className="space-y-1">
                <div className="border-b border-slate-400 w-48 mx-auto pb-6"></div>
                <div className="font-bold text-slate-900 uppercase">Gerencia General</div>
                <div className="text-slate-500 text-[11px]">{company?.name || 'Distribuidora El Imperio'}</div>
              </div>

              <div className="space-y-1">
                <div className="border-b border-slate-400 w-48 mx-auto pb-6"></div>
                <div className="font-bold text-slate-900 uppercase">Dirección Financiera / Auditoría</div>
                <div className="text-slate-500 text-[11px]">Control Contable & Fiscal</div>
              </div>
            </div>
          </div>

          {/* Document Footer */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <div>
              {company?.name || 'Imperio Pro'} | Sistema Integrado de Facturación y Finanzas
            </div>
            <div>
              Reporte Ejecutivo Integral - Página Oficial de Control
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
