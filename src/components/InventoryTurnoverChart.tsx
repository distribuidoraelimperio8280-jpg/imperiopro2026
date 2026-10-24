import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Package,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Flame,
  Award,
  DollarSign,
  Boxes,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Info
} from 'lucide-react';
import type { Product, Invoice } from '../types';

interface InventoryTurnoverChartProps {
  products: Product[];
  invoices: Invoice[];
  onSelectProduct?: (product: Product) => void;
}

type TimeframeOption = '30d' | 'thisMonth' | 'prevMonth' | 'all';
type MetricOption = 'units' | 'revenue';

export interface TurnoverProductItem {
  productId: string;
  product?: Product;
  name: string;
  sku: string;
  category: string;
  material: string;
  currentStock: number;
  minStockAlert: number;
  unit: string;
  unitsSold: number;
  revenue: number;
  invoiceCount: number;
}

// Colores en degradado temático para el Top 5 de rotación
const RANK_COLORS = [
  { fill: '#f59e0b', stroke: '#d97706', gradientId: 'rank1Grad', name: 'Oro / #1' },      // 1er lugar (Oro/Ámbar)
  { fill: '#10b981', stroke: '#059669', gradientId: 'rank2Grad', name: 'Esmeralda / #2' }, // 2do lugar
  { fill: '#0ea5e9', stroke: '#0284c7', gradientId: 'rank3Grad', name: 'Zafiro / #3' },    // 3er lugar
  { fill: '#6366f1', stroke: '#4f46e5', gradientId: 'rank4Grad', name: 'Índigo / #4' },    // 4to lugar
  { fill: '#8b5cf6', stroke: '#7c3aed', gradientId: 'rank5Grad', name: 'Violeta / #5' },   // 5to lugar
];

export const InventoryTurnoverChart: React.FC<InventoryTurnoverChartProps> = ({
  products,
  invoices,
  onSelectProduct,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30d');
  const [metric, setMetric] = useState<MetricOption>('units');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Fechas de cálculo
  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => now.toISOString().split('T')[0], [now]);
  
  // Últimos 30 días móviles ("último mes")
  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  }, [now]);

  // Mes actual (1º del mes al día de hoy)
  const firstDayThisMonthStr = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }, [now]);

  // Mes anterior (completo)
  const firstDayPrevMonthStr = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  }, [now]);
  const lastDayPrevMonthStr = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
  }, [now]);

  // Facturas de venta no canceladas
  const salesInvoices = useMemo(() => {
    return invoices.filter((i) => i.type === 'sale' && i.status !== 'cancelled');
  }, [invoices]);

  // Filtrado de facturas según el período seleccionado
  const filteredInvoices = useMemo(() => {
    return salesInvoices.filter((inv) => {
      if (!inv.date) return false;
      if (timeframe === '30d') {
        return inv.date >= thirtyDaysAgoStr && inv.date <= todayStr;
      }
      if (timeframe === 'thisMonth') {
        return inv.date >= firstDayThisMonthStr && inv.date <= todayStr;
      }
      if (timeframe === 'prevMonth') {
        return inv.date >= firstDayPrevMonthStr && inv.date <= lastDayPrevMonthStr;
      }
      return true; // 'all'
    });
  }, [salesInvoices, timeframe, thirtyDaysAgoStr, todayStr, firstDayThisMonthStr, firstDayPrevMonthStr, lastDayPrevMonthStr]);

  // Cálculo de rotación por producto
  const turnoverMap = useMemo<Record<string, TurnoverProductItem>>(() => {
    const map: Record<string, TurnoverProductItem> = {};

    // Mapa de productos por ID y por nombre para match rápido
    const productById = new Map<string, Product>();
    const productByName = new Map<string, Product>();
    products.forEach((p) => {
      productById.set(p.id, p);
      productByName.set(p.name.trim().toLowerCase(), p);
    });

    filteredInvoices.forEach((inv) => {
      if (!inv.items || !Array.isArray(inv.items)) return;

      inv.items.forEach((item) => {
        const matchedProduct = (item.productId && productById.get(item.productId)) ||
          productByName.get((item.name || '').trim().toLowerCase());

        const key = matchedProduct?.id || item.productId || item.name || 'item_desconocido';
        const name = matchedProduct?.name || item.name || 'Producto';
        const sku = matchedProduct?.sku || 'N/A';
        const category = matchedProduct?.category || 'General';
        const material = matchedProduct?.material || '';
        const currentStock = matchedProduct?.stock ?? 0;
        const minStockAlert = matchedProduct?.minStockAlert ?? (matchedProduct?.min_stock ?? 0);
        const unit = matchedProduct?.unit || 'Unidad';

        const qty = Number(item.quantity) || 0;
        const total = Number(item.total) || 0;

        if (!map[key]) {
          map[key] = {
            productId: key,
            product: matchedProduct,
            name,
            sku,
            category,
            material,
            currentStock,
            minStockAlert,
            unit,
            unitsSold: 0,
            revenue: 0,
            invoiceCount: 0,
          };
        }

        map[key].unitsSold += qty;
        map[key].revenue += total;
        map[key].invoiceCount += 1;
      });
    });

    return map;
  }, [filteredInvoices, products]);

  // Obtener los Top 5 productos según la métrica elegida
  const top5List = useMemo<TurnoverProductItem[]>(() => {
    const items: TurnoverProductItem[] = Object.values(turnoverMap);
    return items
      .sort((a, b) => {
        if (metric === 'units') {
          return b.unitsSold - a.unitsSold || b.revenue - a.revenue;
        }
        return b.revenue - a.revenue || b.unitsSold - a.unitsSold;
      })
      .slice(0, 5);
  }, [turnoverMap, metric]);

  // Total acumulado de las ventas del Top 5
  const top5Totals = useMemo(() => {
    const totalUnits = top5List.reduce((acc, p) => acc + p.unitsSold, 0);
    const totalRevenue = top5List.reduce((acc, p) => acc + p.revenue, 0);
    const totalInvoicesInWindow = filteredInvoices.length;
    return { totalUnits, totalRevenue, totalInvoicesInWindow };
  }, [top5List, filteredInvoices]);

  // Formato para Recharts (gráfico horizontal para máxima legibilidad de nombres)
  const chartData = useMemo(() => {
    return top5List.map((item, index) => {
      // Acortar nombre si excede longitud para el eje
      const maxLen = 22;
      const shortName = item.name.length > maxLen
        ? `${item.name.substring(0, maxLen - 2)}...`
        : item.name;

      // Ratio de rotación (unidades vendidas / stock actual)
      const turnoverRatio = item.currentStock > 0
        ? Number((item.unitsSold / item.currentStock).toFixed(2))
        : null;

      return {
        rank: index + 1,
        id: item.productId,
        name: item.name,
        displayName: `${index + 1}º ${shortName}`,
        sku: item.sku,
        category: item.category,
        material: item.material,
        unitsSold: item.unitsSold,
        revenue: Number(item.revenue.toFixed(2)),
        stock: item.currentStock,
        minStockAlert: item.minStockAlert,
        unit: item.unit,
        invoiceCount: item.invoiceCount,
        turnoverRatio,
        product: item.product,
      };
    });
  }, [top5List]);

  // Custom Tooltip Recharts con estilo glassmorphism moderno
  const CustomTurnoverTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const rankColor = RANK_COLORS[data.rank - 1] || RANK_COLORS[0];

      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 text-xs space-y-2.5 z-50 min-w-[240px] max-w-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] text-white shrink-0 shadow-xs"
                style={{ backgroundColor: rankColor.fill }}
              >
                #{data.rank}
              </span>
              <span className="font-mono text-[11px] font-bold text-amber-400">{data.sku}</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              {data.category}
            </span>
          </div>

          <div>
            <h4 className="font-bold text-slate-100 text-sm leading-snug">{data.name}</h4>
            {data.material && (
              <span className="inline-block mt-1 text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                Material: {data.material}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Rotación (Salidas)</span>
              <span className="text-sm font-mono font-black text-emerald-400">
                {data.unitsSold} {data.unit}
              </span>
            </div>

            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Facturación Total</span>
              <span className="text-sm font-mono font-black text-sky-400">
                ${data.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
            <span>Stock en Bodega:</span>
            <span className={`font-mono font-bold ${
              data.stock <= data.minStockAlert ? 'text-rose-400' : 'text-slate-100'
            }`}>
              {data.stock} {data.unit}
              {data.stock <= data.minStockAlert && ' (Bajo)'}
            </span>
          </div>

          {data.turnoverRatio !== null && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Velocidad de Rotación:</span>
              <span className="font-mono font-bold text-amber-300">
                {data.turnoverRatio}x del stock actual
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Etiqueta legible del período seleccionado
  const periodLabel = useMemo(() => {
    if (timeframe === '30d') return `Últimos 30 días (${thirtyDaysAgoStr} al ${todayStr})`;
    if (timeframe === 'thisMonth') return `Mes Actual (${firstDayThisMonthStr} al ${todayStr})`;
    if (timeframe === 'prevMonth') return `Mes Anterior (${firstDayPrevMonthStr} al ${lastDayPrevMonthStr})`;
    return 'Todo el Histórico de Ventas';
  }, [timeframe, thirtyDaysAgoStr, todayStr, firstDayThisMonthStr, firstDayPrevMonthStr, lastDayPrevMonthStr]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
      {/* Encabezado del Componente */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
            <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                <span>Top 5 Productos de Mayor Rotación</span>
              </h2>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-wide">
                Recharts Analytics
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Demanda de inventario y velocidad de venta calculada durante el último mes.
            </p>
          </div>
        </div>

        {/* Controles de Período, Métrica y Colapso */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Selector de Período */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <button
              onClick={() => setTimeframe('30d')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeframe === '30d'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Filtrar por los últimos 30 días móviles"
            >
              Último Mes (30d)
            </button>
            <button
              onClick={() => setTimeframe('thisMonth')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeframe === 'thisMonth'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Filtrar por el mes en curso"
            >
              Este Mes
            </button>
            <button
              onClick={() => setTimeframe('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeframe === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Ver acumulado general de ventas"
            >
              Todo
            </button>
          </div>

          {/* Selector de Métrica (Unidades vs Monto Facturado) */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 text-xs font-semibold">
            <button
              onClick={() => setMetric('units')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                metric === 'units'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Ordenar y graficar por cantidad de unidades despachadas"
            >
              Unidades
            </button>
            <button
              onClick={() => setMetric('revenue')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                metric === 'revenue'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
              title="Ordenar y graficar por volumen monetario facturado ($)"
            >
              Monto ($)
            </button>
          </div>

          {/* Botón Minimizar / Expandir */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expandir panel de rotación' : 'Minimizar panel de rotación'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Contenido si no está minimizado */}
      {!isCollapsed && (
        <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-200">
          
          {/* Tarjetas KPI Resumen del Top 5 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* KPI 1: Líder en Rotación */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 p-3.5 sm:p-4 rounded-2xl border border-amber-200/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                <span>Producto #1 en Ventas</span>
                <Award className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 truncate" title={top5List[0]?.name || 'Sin ventas'}>
                {top5List[0]?.name || 'N/A'}
              </div>
              <div className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                <span className="font-mono font-black">{top5List[0]?.unitsSold || 0}</span>
                <span>unidades rotadas</span>
              </div>
            </div>

            {/* KPI 2: Unidades Totales del Top 5 */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/40 p-3.5 sm:p-4 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                <span>Total Unidades (Top 5)</span>
                <Boxes className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {top5Totals.totalUnits}
              </div>
              <div className="text-xs font-semibold text-emerald-700">
                En {top5Totals.totalInvoicesInWindow} facturas del período
              </div>
            </div>

            {/* KPI 3: Facturación Total del Top 5 */}
            <div className="bg-gradient-to-br from-sky-50 to-sky-100/40 p-3.5 sm:p-4 rounded-2xl border border-sky-200/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-sky-800 uppercase tracking-wider">
                <span>Ventas Brutas (Top 5)</span>
                <DollarSign className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                ${top5Totals.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs font-semibold text-sky-700">
                Volumen monetario generado
              </div>
            </div>

            {/* KPI 4: Período Activo */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Rango Temporal</span>
                <Calendar className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-slate-800 leading-tight">
                {timeframe === '30d' ? 'Últimos 30 Días' : timeframe === 'thisMonth' ? 'Mes en Curso' : 'Todo el Histórico'}
              </div>
              <div className="text-[11px] text-slate-500 truncate" title={periodLabel}>
                {periodLabel}
              </div>
            </div>

          </div>

          {/* Gráfico Recharts y Lista Detallada */}
          {chartData.length === 0 ? (
            /* Estado Vacío cuando no hay ventas en el período */
            <div className="p-8 sm:p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  No se registraron ventas en el período seleccionado
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Actualmente no hay comprobantes emitidos en {periodLabel.toLowerCase()}.
                </p>
              </div>
              {salesInvoices.length > 0 && timeframe !== 'all' && (
                <button
                  onClick={() => setTimeframe('all')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ver rotación con todas las ventas registradas ({salesInvoices.length} facturas)</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              {/* Gráfico de Barras con Recharts (7 columnas en desktop) */}
              <div className="lg:col-span-7 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <span>Distribución de Demanda ({metric === 'units' ? 'Unidades Vendidas' : 'Total Facturado ($)'})</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pasa el cursor sobre cada barra para inspeccionar la rotación y el stock en bodega.
                    </p>
                  </div>
                </div>

                {/* Contenedor Responsivo Recharts */}
                <div className="w-full h-72 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                      <defs>
                        {RANK_COLORS.map((rc) => (
                          <linearGradient key={rc.gradientId} id={rc.gradientId} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={rc.fill} stopOpacity={0.85} />
                            <stop offset="100%" stopColor={rc.fill} stopOpacity={1} />
                          </linearGradient>
                        ))}
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />

                      {/* Eje X (Valores Numéricos de Unidades o Facturación) */}
                      <XAxis
                        type="number"
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                        tickFormatter={(val) => metric === 'units' ? `${val}` : `$${val}`}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />

                      {/* Eje Y (Nombres de Productos del Top 5) */}
                      <YAxis
                        type="category"
                        dataKey="displayName"
                        width={130}
                        tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 700 }}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />

                      <Tooltip content={<CustomTurnoverTooltip />} />

                      <Bar
                        dataKey={metric === 'units' ? 'unitsSold' : 'revenue'}
                        name={metric === 'units' ? 'Unidades Vendidas' : 'Total Facturado ($)'}
                        radius={[0, 8, 8, 0]}
                        barSize={24}
                      >
                        {chartData.map((entry, index) => {
                          const color = RANK_COLORS[index] || RANK_COLORS[0];
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={`url(#${color.gradientId})`}
                              stroke={color.stroke}
                              strokeWidth={1}
                              className="transition-opacity hover:opacity-85 cursor-pointer"
                              onClick={() => {
                                if (entry.product && onSelectProduct) {
                                  onSelectProduct(entry.product);
                                }
                              }}
                            />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Lista Detallada con Podio del Top 5 (5 columnas en desktop) */}
              <div className="lg:col-span-5 space-y-2.5">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Podio de Artículos Más Despachados</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Clic para ver ficha</span>
                </div>

                <div className="space-y-2">
                  {chartData.map((item, idx) => {
                    const color = RANK_COLORS[idx] || RANK_COLORS[0];
                    const isLowStock = item.stock <= item.minStockAlert;
                    const percentOfTop5 = top5Totals.totalUnits > 0
                      ? ((item.unitsSold / top5Totals.totalUnits) * 100).toFixed(1)
                      : '0';

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (item.product && onSelectProduct) {
                            onSelectProduct(item.product);
                          }
                        }}
                        className="group bg-white hover:bg-slate-50/90 p-3 rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3"
                      >
                        {/* Insignia de Ranking */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 shadow-2xs transition-transform group-hover:scale-105"
                            style={{ backgroundColor: color.fill }}
                          >
                            #{item.rank}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                {item.sku}
                              </span>
                              {item.material && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  {item.material}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5 group-hover:text-amber-700 transition-colors" title={item.name}>
                              {item.name}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span>Stock actual:</span>
                              <span className={`font-mono font-bold ${isLowStock ? 'text-rose-600' : 'text-slate-700'}`}>
                                {item.stock} {item.unit}
                              </span>
                              {isLowStock && (
                                <span className="text-rose-600 font-bold flex items-center gap-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Bajo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Métricas de Salida */}
                        <div className="text-right shrink-0">
                          <div className="font-mono font-black text-sm text-slate-900">
                            {item.unitsSold} <span className="text-xs font-semibold text-slate-500">{item.unit}</span>
                          </div>
                          <div className="font-mono font-bold text-[11px] text-emerald-600">
                            ${item.revenue.toFixed(2)}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400">
                            {percentOfTop5}% del Top 5
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* Footer Informativo del Gráfico */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                La rotación de ventas mide la salida física de inventario para optimizar compras y evitar quiebres de stock.
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Actualizado en tiempo real desde IndexedDB</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
