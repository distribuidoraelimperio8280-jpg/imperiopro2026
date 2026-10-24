import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Layers,
  Sparkles,
  PieChart as PieIcon,
  HelpCircle,
  Printer,
  FileText,
  Download
} from 'lucide-react';
import type { Invoice, Expense } from '../types';

interface FinancialChartsSectionProps {
  invoices: Invoice[];
  expenses: Expense[];
  startDate?: string;
  endDate?: string;
  currencySymbol?: string;
  onExportPDF?: () => void;
  onExportMonthlyFinancialPDF?: (print?: boolean) => void;
}

type TimeframeOption = '6m' | '12m' | 'year' | 'range';
type ChartStyleOption = 'area' | 'bar';

const MONTH_SHORT_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const MONTH_FULL_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Helper to extract YYYY-MM
function extractYearMonth(dateStr?: string): string {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{4})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Custom tooltip for styled dark presentation
const CustomChartsTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/80 text-xs space-y-2 z-50 min-w-[200px]">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
          <span className="font-extrabold text-slate-200 text-sm">{label}</span>
          <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
            Histórico
          </span>
        </div>
        <div className="space-y-1.5 pt-0.5">
          {payload.map((entry: any, index: number) => {
            const isCurrency = entry.dataKey !== 'operaciones' && entry.dataKey !== 'margen';
            const isPercentage = entry.dataKey === 'margen';
            let formattedValue = entry.value;

            if (isCurrency && typeof entry.value === 'number') {
              formattedValue = `$${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            } else if (isPercentage && typeof entry.value === 'number') {
              formattedValue = `${entry.value.toFixed(1)}%`;
            }

            return (
              <div key={`tooltip-item-${index}`} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-slate-300 font-medium">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-xs"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span>{entry.name}:</span>
                </span>
                <span className="font-mono font-bold text-white text-right">
                  {formattedValue}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const FinancialChartsSection: React.FC<FinancialChartsSectionProps> = ({
  invoices,
  expenses,
  startDate,
  endDate,
  currencySymbol = '$',
  onExportPDF,
  onExportMonthlyFinancialPDF
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('6m');
  const [salesChartStyle, setSalesChartStyle] = useState<ChartStyleOption>('area');
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  // Filter only sales invoices
  const salesInvoices = useMemo(() => {
    return invoices.filter((i) => i.type === 'sale');
  }, [invoices]);

  // Compute monthly chronological periods based on chosen timeframe
  const monthlyData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth(); // 0-11

    let targetYearMonths: { key: string; label: string; year: number; month: number }[] = [];

    if (timeframe === '6m') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonthIdx - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const key = `${y}-${String(m).padStart(2, '0')}`;
        const label = `${MONTH_SHORT_ES[m - 1]} ${y}`;
        targetYearMonths.push({ key, label, year: y, month: m });
      }
    } else if (timeframe === '12m') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(currentYear, currentMonthIdx - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const key = `${y}-${String(m).padStart(2, '0')}`;
        const label = `${MONTH_SHORT_ES[m - 1]} ${y}`;
        targetYearMonths.push({ key, label, year: y, month: m });
      }
    } else if (timeframe === 'year') {
      for (let m = 1; m <= 12; m++) {
        const key = `${currentYear}-${String(m).padStart(2, '0')}`;
        const label = `${MONTH_SHORT_ES[m - 1]} ${currentYear}`;
        targetYearMonths.push({ key, label, year: currentYear, month: m });
      }
    } else if (timeframe === 'range') {
      // Gather all distinct months from range or all records
      const allDates = new Set<string>();
      salesInvoices.forEach((inv) => {
        const ym = extractYearMonth(inv.date);
        if (ym) allDates.add(ym);
      });
      expenses.forEach((exp) => {
        const ym = extractYearMonth(exp.date);
        if (ym) allDates.add(ym);
      });

      if (allDates.size === 0) {
        // Fallback to 6 months
        for (let i = 5; i >= 0; i--) {
          const d = new Date(currentYear, currentMonthIdx - i, 1);
          const y = d.getFullYear();
          const m = d.getMonth() + 1;
          const key = `${y}-${String(m).padStart(2, '0')}`;
          const label = `${MONTH_SHORT_ES[m - 1]} ${y}`;
          targetYearMonths.push({ key, label, year: y, month: m });
        }
      } else {
        const sortedKeys = Array.from(allDates).sort();
        targetYearMonths = sortedKeys.map((key) => {
          const [yStr, mStr] = key.split('-');
          const y = parseInt(yStr, 10);
          const m = parseInt(mStr, 10);
          return {
            key,
            label: `${MONTH_SHORT_ES[m - 1]} ${y}`,
            year: y,
            month: m
          };
        });
      }
    }

    // Aggregate metrics per month
    return targetYearMonths.map(({ key, label }) => {
      // Invoices in this month
      const monthInvoices = salesInvoices.filter((inv) => extractYearMonth(inv.date) === key);
      const monthExpenses = expenses.filter((exp) => extractYearMonth(exp.date) === key);

      const ingresos = monthInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
      const subtotal = monthInvoices.reduce((sum, inv) => sum + (Number(inv.subtotal) || 0), 0);
      const impuestos = monthInvoices.reduce((sum, inv) => sum + (Number(inv.taxTotal) || 0), 0);
      const operaciones = monthInvoices.length;
      const ticketPromedio = operaciones > 0 ? ingresos / operaciones : 0;

      const gastos = monthExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
      const utilidad = ingresos - gastos;
      const margen = ingresos > 0 ? (utilidad / ingresos) * 100 : 0;

      return {
        mes: label,
        mesClave: key,
        ingresos,
        subtotal,
        impuestos,
        gastos,
        utilidad,
        margen,
        operaciones,
        ticketPromedio
      };
    });
  }, [salesInvoices, expenses, timeframe]);

  // Executive KPI summary over the chart series
  const summary = useMemo(() => {
    const totalIngresos = monthlyData.reduce((acc, m) => acc + m.ingresos, 0);
    const totalGastos = monthlyData.reduce((acc, m) => acc + m.gastos, 0);
    const balanceNeto = totalIngresos - totalGastos;
    const totalOperaciones = monthlyData.reduce((acc, m) => acc + m.operaciones, 0);
    const margenGeneral = totalIngresos > 0 ? (balanceNeto / totalIngresos) * 100 : 0;

    // Peak sales month
    let peakMonth = { mes: 'N/A', ingresos: 0 };
    monthlyData.forEach((m) => {
      if (m.ingresos > peakMonth.ingresos) {
        peakMonth = { mes: m.mes, ingresos: m.ingresos };
      }
    });

    // Month-over-Month calculation (latest month vs previous month)
    let momGrowth: number | null = null;
    if (monthlyData.length >= 2) {
      const current = monthlyData[monthlyData.length - 1]?.ingresos || 0;
      const previous = monthlyData[monthlyData.length - 2]?.ingresos || 0;
      if (previous > 0) {
        momGrowth = ((current - previous) / previous) * 100;
      } else if (current > 0) {
        momGrowth = 100;
      } else {
        momGrowth = 0;
      }
    }

    return {
      totalIngresos,
      totalGastos,
      balanceNeto,
      totalOperaciones,
      margenGeneral,
      peakMonth,
      momGrowth
    };
  }, [monthlyData]);

  return (
    <div className="printable-area avoid-break-inside space-y-5 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs print:shadow-none print:border-slate-300">
      
      {/* Top Header & Interactive Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 print:border-slate-300">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 print:hidden">
              <Activity className="w-5 h-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Análisis Gráfico & Balance Dinámico
            </h2>
            <span className="hidden sm:inline-flex bg-slate-100 text-slate-600 text-[11px] font-bold px-2.5 py-0.5 rounded-full print:hidden">
              En Vivo
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tendencias cronológicas de facturación comercial y balance comparativo de ingresos versus gastos operativos.
          </p>
        </div>

        {/* Timeframe, Style Selectors & Export PDF Button */}
        <div className="no-print flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Timeframe selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setTimeframe('6m')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeframe === '6m'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              6 Meses
            </button>
            <button
              onClick={() => setTimeframe('12m')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeframe === '12m'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              12 Meses
            </button>
            <button
              onClick={() => setTimeframe('year')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeframe === 'year'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Año Actual
            </button>
            <button
              onClick={() => setTimeframe('range')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeframe === 'range'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Mostrar todo el historial disponible o según fechas"
            >
              Todo el Historial
            </button>
          </div>

          {/* Toggle Area vs Bar for Sales */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setSalesChartStyle('area')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                salesChartStyle === 'area'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualización en gráfico de área suave"
            >
              Área
            </button>
            <button
              onClick={() => setSalesChartStyle('bar')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                salesChartStyle === 'bar'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualización en gráfico de barras"
            >
              Barras
            </button>
          </div>

          {/* Direct Export to Monthly Financial PDF */}
          {onExportMonthlyFinancialPDF && (
            <button
              onClick={() => onExportMonthlyFinancialPDF(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer border border-emerald-500/40"
              title="Exportar directamente el Resumen Financiero Mensual a un archivo PDF formateado para impresión A4"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-200" />
              <span>Resumen Financiero PDF</span>
            </button>
          )}

          {/* Direct Export to PDF action button */}
          <button
            onClick={onExportPDF || (() => window.print())}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Exportar documento limpio con gráficos y datos a PDF usando estilos de impresión A4"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Exportar Vista a PDF</span>
          </button>
        </div>
      </div>

      {/* Mini Executive Metric Highlights */}
      <div className="avoid-break-inside grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center justify-between">
            <span>Ventas del Período</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </span>
          <div className="text-base sm:text-lg font-extrabold text-slate-900 font-mono mt-0.5">
            ${summary.totalIngresos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
            <span>{summary.totalOperaciones} facturas emitidas</span>
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center justify-between">
            <span>Gastos Registrados</span>
            <Scale className="w-3.5 h-3.5 text-rose-500" />
          </span>
          <div className="text-base sm:text-lg font-extrabold text-rose-700 font-mono mt-0.5">
            ${summary.totalGastos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Egresos operativos del período
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center justify-between">
            <span>Flujo Neto (Superávit)</span>
            {summary.balanceNeto >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
            )}
          </span>
          <div className={`text-base sm:text-lg font-extrabold font-mono mt-0.5 ${
            summary.balanceNeto >= 0 ? 'text-emerald-700' : 'text-rose-700'
          }`}>
            ${summary.balanceNeto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
            Margen operativo: {summary.margenGeneral.toFixed(1)}%
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center justify-between">
            <span>Ritmo Mensual (MoM)</span>
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
          </span>
          <div className="text-base sm:text-lg font-extrabold font-mono mt-0.5 text-slate-900 flex items-center gap-1">
            {summary.momGrowth !== null ? (
              <>
                <span className={summary.momGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  {summary.momGrowth >= 0 ? `+${summary.momGrowth.toFixed(1)}%` : `${summary.momGrowth.toFixed(1)}%`}
                </span>
                {summary.momGrowth >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-rose-600" />
                )}
              </>
            ) : (
              <span className="text-slate-400 text-sm font-normal">Sin datos previos</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 truncate">
            Mejor mes: <span className="font-bold text-slate-700">{summary.peakMonth.mes}</span>
          </div>
        </div>
      </div>

      {/* Grid of 2 Dynamic Recharts Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 print:grid-cols-1 print:gap-6">
        
        {/* CHART 1: TENDENCIA DE VENTAS MENSUALES */}
        <div className="avoid-break-inside bg-slate-50/70 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 print:bg-white print:border-slate-300 print:rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Tendencia de Ventas Mensuales
              </h3>
              <p className="text-xs text-slate-500">
                Evolución de facturación bruta y promedio de ticket en el tiempo.
              </p>
            </div>
            <button
              onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
              className="no-print text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 hover:bg-emerald-100 px-2.5 py-1 rounded-lg self-start sm:self-auto transition-colors cursor-pointer"
            >
              {showTaxBreakdown ? 'Ocultar Subtotal/Imp.' : 'Ver Subtotal/Imp.'}
            </button>
          </div>

          {/* Recharts Area / Bar Container */}
          <div className="w-full h-72 sm:h-80 print:h-64">
            <ResponsiveContainer width="100%" height="100%">
              {salesChartStyle === 'area' ? (
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorSubtotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284C7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                  />
                  <Tooltip content={<CustomChartsTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ingresos"
                    name="Total Facturado"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorIngresos)"
                    activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                  {showTaxBreakdown && (
                    <Area
                      type="monotone"
                      dataKey="subtotal"
                      name="Subtotal Neto"
                      stroke="#0284C7"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#colorSubtotal)"
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="ticketPromedio"
                    name="Ticket Promedio"
                    stroke="#D97706"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#D97706' }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                  />
                  <Tooltip content={<CustomChartsTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                  />
                  <Bar
                    dataKey="ingresos"
                    name="Total Facturado"
                    fill="#10B981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                  />
                  {showTaxBreakdown && (
                    <Bar
                      dataKey="impuestos"
                      name="Impuesto (ITBMS)"
                      fill="#0284C7"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                    />
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Puntos analizados: {monthlyData.length} meses</span>
            <span>Total ventas: <strong className="text-slate-800">${summary.totalIngresos.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* CHART 2: BALANCE DE GASTOS VERSUS INGRESOS */}
        <div className="avoid-break-inside bg-slate-50/70 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 print:bg-white print:border-slate-300 print:rounded-xl">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                Balance: Gastos vs Ingresos
              </h3>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                summary.balanceNeto >= 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {summary.balanceNeto >= 0 ? 'Superávit Operativo' : 'Déficit en Período'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Contraste mensual de facturación vs costos y flujo neto resultante.
            </p>
          </div>

          {/* Recharts Bar Comparison Container */}
          <div className="w-full h-72 sm:h-80 print:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                />
                <Tooltip content={<CustomChartsTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                />
                <Bar
                  dataKey="ingresos"
                  name="Ingresos (Ventas)"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={30}
                />
                <Bar
                  dataKey="gastos"
                  name="Gastos (Egresos)"
                  fill="#F43F5E"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={30}
                />
                <Line
                  type="monotone"
                  dataKey="utilidad"
                  name="Utilidad Neta"
                  stroke="#0284C7"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0284C7', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Ingresos: <strong>${summary.totalIngresos.toFixed(2)}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Gastos: <strong>${summary.totalGastos.toFixed(2)}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span> Utilidad: <strong className={summary.balanceNeto >= 0 ? 'text-emerald-700' : 'text-rose-700'}>${summary.balanceNeto.toFixed(2)}</strong>
            </span>
          </div>
        </div>

      </div>

      {/* Print-Only Clean Tabular Summary of Monthly Data */}
      <div className="print-only mt-4 avoid-break-inside">
        <div className="border border-slate-300 rounded-xl overflow-hidden">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-bold text-xs text-slate-800 flex justify-between">
            <span>Desglose Financiero Mensual Consolidado</span>
            <span>Valores en USD ($)</span>
          </div>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-300">
              <tr>
                <th className="py-2 px-3">Mes</th>
                <th className="py-2 px-3 text-right">Facturación Bruta</th>
                <th className="py-2 px-3 text-right">Subtotal</th>
                <th className="py-2 px-3 text-right">Gastos Operativos</th>
                <th className="py-2 px-3 text-right">Flujo Neto</th>
                <th className="py-2 px-3 text-right">Margen</th>
                <th className="py-2 px-3 text-right">Operaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {monthlyData.map((m, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                  <td className="py-1.5 px-3 font-semibold text-slate-800">{m.mes}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">${m.ingresos.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right font-mono text-slate-600">${m.subtotal.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-700">${m.gastos.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">${m.utilidad.toFixed(2)}</td>
                  <td className="py-1.5 px-3 text-right font-mono">{m.margen.toFixed(1)}%</td>
                  <td className="py-1.5 px-3 text-right font-mono">{m.operaciones}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td className="py-2 px-3">TOTAL CONSOLIDADO</td>
                <td className="py-2 px-3 text-right font-mono text-emerald-800">${summary.totalIngresos.toFixed(2)}</td>
                <td className="py-2 px-3 text-right font-mono">-</td>
                <td className="py-2 px-3 text-right font-mono text-rose-800">${summary.totalGastos.toFixed(2)}</td>
                <td className="py-2 px-3 text-right font-mono text-emerald-800">${summary.balanceNeto.toFixed(2)}</td>
                <td className="py-2 px-3 text-right font-mono">{summary.margenGeneral.toFixed(1)}%</td>
                <td className="py-2 px-3 text-right font-mono">{summary.totalOperaciones}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
};
