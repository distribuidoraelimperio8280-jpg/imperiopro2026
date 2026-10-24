import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  Calendar, 
  DollarSign, 
  Tag, 
  Trash2, 
  AlertCircle, 
  Eye, 
  X, 
  CheckCircle2, 
  ShoppingBag, 
  FileText, 
  Building2,
  CreditCard,
  Filter,
  Pencil,
  Printer,
  Download,
  RotateCcw,
  Check,
  Truck,
  ShieldCheck,
  ShieldAlert,
  Paperclip,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';
import type { Expense, CompanyProfile, PaymentMethod } from '../types';
import { db } from '../db/indexedDB';
import { syncService } from '../services/syncService';
import { useLiveQuery } from 'dexie-react-hooks';
import { printExpenseVoucherPDF, downloadExpenseVoucherPDF, formatRucDv } from '../services/pdfService';
import { 
  EXPENSE_TAXONOMY, 
  COST_CENTERS, 
  VEHICLE_FLEET_PRESETS 
} from '../data/expenseTaxonomy';

interface ExpensesViewProps {
  onOpenNewExpense: () => void;
  onEditExpense?: (expense: Expense) => void;
  searchTerm: string;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ 
  onOpenNewExpense, 
  onEditExpense, 
  searchTerm 
}) => {
  const companyProfile = useLiveQuery(() => db.companyProfile.get('default'), []);

  // Filter States
  const [localSearch, setLocalSearch] = useState('');
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [costCenterFilter, setCostCenterFilter] = useState<string>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [deductibleFilter, setDeductibleFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Modals & Action States
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [selectedExpenseDetail, setSelectedExpenseDetail] = useState<Expense | null>(null);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<{ url: string; name: string; isPdf: boolean } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const expenses = useLiveQuery(() => db.expenses.toArray(), []) || [];

  // Categories available for currently selected expenseTypeFilter
  const availableCategoriesForFilter = useMemo(() => {
    if (expenseTypeFilter === 'all') {
      const allCats = new Set<string>();
      EXPENSE_TAXONOMY.forEach(g => g.categories.forEach(c => allCats.add(c)));
      return Array.from(allCats);
    }
    const group = EXPENSE_TAXONOMY.find(g => g.name === expenseTypeFilter);
    return group ? group.categories : [];
  }, [expenseTypeFilter]);

  // Filter expenses based on all criteria
  const filteredExpenses = useMemo(() => {
    const combinedSearch = (searchTerm || localSearch).trim().toLowerCase();

    return expenses.filter((exp) => {
      // 1. Tipo de Gasto (General)
      if (expenseTypeFilter !== 'all') {
        if (exp.expenseType) {
          if (exp.expenseType !== expenseTypeFilter) return false;
        } else {
          // Fallback matching
          if (!exp.category?.toLowerCase().includes(expenseTypeFilter.toLowerCase())) {
            const group = EXPENSE_TAXONOMY.find(g => g.name === expenseTypeFilter);
            if (!group || !group.categories.some(c => c.toLowerCase() === exp.category?.toLowerCase())) {
              return false;
            }
          }
        }
      }

      // 2. Categoría (Específica)
      if (categoryFilter !== 'all') {
        if (exp.category !== categoryFilter && !exp.category?.toLowerCase().includes(categoryFilter.toLowerCase())) {
          return false;
        }
      }

      // 3. Centro de Costo
      if (costCenterFilter !== 'all') {
        if (exp.costCenter !== costCenterFilter) return false;
      }

      // 4. Placa / Flota Vehicular
      if (vehicleFilter !== 'all') {
        if (vehicleFilter === '__with_vehicle__') {
          if (!exp.vehiclePlate) return false;
        } else if (exp.vehiclePlate !== vehicleFilter) {
          return false;
        }
      }

      // 5. Deducibilidad Fiscal
      if (deductibleFilter !== 'all') {
        const isDeductible = exp.isDeductible !== false;
        if (deductibleFilter === 'deductible' && !isDeductible) return false;
        if (deductibleFilter === 'non_deductible' && isDeductible) return false;
      }

      // 6. Payment Method Filter
      if (paymentMethodFilter !== 'all') {
        if (exp.paymentMethod !== paymentMethodFilter) return false;
      }

      // 7. Date Range Filter
      if (startDate && exp.date < startDate) return false;
      if (endDate && exp.date > endDate) return false;

      // 8. Search Filter (Provider Name, RUC, Invoice Number, Code, Vehicle Plate, Notes)
      if (!combinedSearch) return true;

      const providerMatch = exp.providerName?.toLowerCase().includes(combinedSearch);
      const rucMatch = exp.providerRuc?.toLowerCase().includes(combinedSearch);
      const invoiceMatch = exp.invoiceNumber?.toLowerCase().includes(combinedSearch);
      const codeMatch = exp.code?.toLowerCase().includes(combinedSearch);
      const categoryMatch = exp.category?.toLowerCase().includes(combinedSearch);
      const plateMatch = exp.vehiclePlate?.toLowerCase().includes(combinedSearch);
      const notesMatch = exp.notes?.toLowerCase().includes(combinedSearch);
      const itemsMatch = exp.items?.some(it => it.description?.toLowerCase().includes(combinedSearch));

      return (
        providerMatch ||
        rucMatch ||
        invoiceMatch ||
        codeMatch ||
        categoryMatch ||
        plateMatch ||
        notesMatch ||
        itemsMatch
      );
    });
  }, [
    expenses, 
    searchTerm, 
    localSearch, 
    expenseTypeFilter, 
    categoryFilter, 
    costCenterFilter,
    vehicleFilter,
    deductibleFilter,
    paymentMethodFilter, 
    startDate, 
    endDate
  ]);

  // Aggregate KPI Calculations
  const totalExpenseSum = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [expenses]);

  const deductibleStats = useMemo(() => {
    const deductibleList = expenses.filter(exp => exp.isDeductible !== false);
    const sum = deductibleList.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
    const percent = totalExpenseSum > 0 ? (sum / totalExpenseSum) * 100 : 100;
    return {
      sum,
      percent: Math.round(percent),
      count: deductibleList.length
    };
  }, [expenses, totalExpenseSum]);

  const fleetExpenseStats = useMemo(() => {
    const fleetList = expenses.filter(exp => 
      exp.vehiclePlate || 
      exp.expenseType?.includes('FLOTA') || 
      exp.category?.toLowerCase().includes('combustible') ||
      exp.category?.toLowerCase().includes('vehículo')
    );
    const sum = fleetList.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
    return {
      sum,
      count: fleetList.length
    };
  }, [expenses]);

  const creditPayablesStats = useMemo(() => {
    const creditList = expenses.filter(exp => exp.paymentMethod === 'credit');
    const sum = creditList.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
    return {
      sum,
      count: creditList.length
    };
  }, [expenses]);

  // Clear all filters
  const handleResetFilters = () => {
    setLocalSearch('');
    setExpenseTypeFilter('all');
    setCategoryFilter('all');
    setCostCenterFilter('all');
    setVehicleFilter('all');
    setDeductibleFilter('all');
    setPaymentMethodFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = 
    localSearch || 
    expenseTypeFilter !== 'all' || 
    categoryFilter !== 'all' || 
    costCenterFilter !== 'all' || 
    vehicleFilter !== 'all' || 
    deductibleFilter !== 'all' || 
    paymentMethodFilter !== 'all' || 
    startDate || 
    endDate;

  // Handle single deletion of expense or purchase
  const handleDeleteClick = (exp: Expense, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpenseToDelete(exp);
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);

    try {
      await db.expenses.delete(expenseToDelete.id);
      await syncService.queueChange('expenses', 'delete', { id: expenseToDelete.id });

      if (selectedExpenseDetail?.id === expenseToDelete.id) {
        setSelectedExpenseDetail(null);
      }

      setNotification({
        type: 'success',
        message: `El registro "${expenseToDelete.code}" (${expenseToDelete.providerName}) ha sido eliminado correctamente del sistema.`,
      });

      setExpenseToDelete(null);

      setTimeout(() => {
        setNotification(null);
      }, 4000);
    } catch (err) {
      console.error('Error al eliminar gasto/compra:', err);
      setNotification({
        type: 'error',
        message: 'Ocurrió un error al intentar eliminar el registro. Intente nuevamente.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const safeNumber = (val: any): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const formatCurrency = (val: any): string => {
    return safeNumber(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPaymentMethod = (method?: PaymentMethod | string) => {
    switch (method) {
      case 'card':
        return 'Tarjeta Débito/Crédito';
      case 'corporate_card':
        return 'Tarjeta Corporativa';
      case 'check':
        return 'Cheque Comercial';
      case 'transfer':
        return 'Transferencia / ACH';
      case 'cash':
        return 'Efectivo';
      case 'credit':
        return 'Crédito / Cuentas por Pagar';
      default:
        return method || 'N/A';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* NOTIFICATION BANNER */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 shadow-md border animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER / CONTROL PANEL BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <ShoppingBag className="w-64 h-64 text-emerald-400" />
        </div>

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Receipt className="w-4 h-4" />
            <span>Imperio Pro ERP • Módulo de Egresos Contables</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Ingreso y Gestión de Compras, Gastos y Proveedores
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Control exacto de facturas de proveedores, insumos, flota vehicular y centros de costo. Genera comprobantes oficiales con firma, respaldo fiscal y trazabilidad contable.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            onClick={onOpenNewExpense}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-2xl text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Compra / Gasto</span>
          </button>
        </div>
      </div>

      {/* 4 KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Egresos */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Egresos Registrados
            </span>
            <div className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-0.5">
              ${totalExpenseSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500">{expenses.length} registros totales</span>
          </div>
        </div>

        {/* Deducibles de Impuestos */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Gastos Deducibles ({deductibleStats.percent}%)
            </span>
            <div className="text-lg sm:text-xl font-black text-emerald-600 font-mono mt-0.5">
              ${deductibleStats.sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500">{deductibleStats.count} facturas con deducibilidad</span>
          </div>
        </div>

        {/* Flota y Transporte */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
              Flota y Transporte
            </span>
            <div className="text-lg sm:text-xl font-black text-amber-600 font-mono mt-0.5">
              ${fleetExpenseStats.sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500">{fleetExpenseStats.count} gastos vinculados a flota</span>
          </div>
        </div>

        {/* Cuentas por Pagar / Crédito */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wider block">
              Crédito Comercial / CXP
            </span>
            <div className="text-lg sm:text-xl font-black text-sky-600 font-mono mt-0.5">
              ${creditPayablesStats.sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500">{creditPayablesStats.count} compras a crédito</span>
          </div>
        </div>

      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        {/* Main Row: Quick Search, Tipo de Gasto, Forma de Pago, Fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          
          {/* Quick Search Input */}
          <div className="lg:col-span-4">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Búsqueda Rápida
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Proveedor, RUC, Factura N°, Placa, Código..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* Tipo de Gasto Filter */}
          <div className="lg:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Tipo de Gasto (General)
            </label>
            <select
              value={expenseTypeFilter}
              onChange={(e) => {
                setExpenseTypeFilter(e.target.value);
                setCategoryFilter('all');
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Todos los Tipos de Gasto</option>
              {EXPENSE_TAXONOMY.map(group => (
                <option key={group.id} value={group.name}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          {/* Categoría Específica Filter */}
          <div className="lg:col-span-3">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Categoría Específica
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Todas las Categorías</option>
              {availableCategoriesForFilter.map((cat, idx) => (
                <option key={idx} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Advanced Filters Button */}
          <div className="lg:col-span-2 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                showAdvancedFilters || hasActiveFilters
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{showAdvancedFilters ? 'Ocultar Filtros' : 'Más Filtros'}</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1"></span>
              )}
            </button>
          </div>

        </div>

        {/* Advanced Filters Row: Cost Center, Vehicle Plate, Deductibility, Payment Method, Date Range */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 animate-in fade-in duration-150">
            
            {/* Centro de Costo */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Centro de Costo / Sucursal
              </label>
              <select
                value={costCenterFilter}
                onChange={(e) => setCostCenterFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Todos los Centros</option>
                {COST_CENTERS.map((cc, idx) => (
                  <option key={idx} value={cc}>{cc}</option>
                ))}
              </select>
            </div>

            {/* Flota / Placa */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Placa / Flota Vehicular
              </label>
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Todas las opciones</option>
                <option value="__with_vehicle__">Solo Gastos con Vehículo</option>
                {VEHICLE_FLEET_PRESETS.map(v => (
                  <option key={v.id} value={v.plate}>{v.plate} ({v.name.slice(0, 18)}...)</option>
                ))}
              </select>
            </div>

            {/* Deducibilidad Fiscal */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Deducibilidad Fiscal
              </label>
              <select
                value={deductibleFilter}
                onChange={(e) => setDeductibleFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Todos (Deducibles y No)</option>
                <option value="deductible">Solo Deducibles (100%)</option>
                <option value="non_deductible">Solo No Deducibles</option>
              </select>
            </div>

            {/* Forma de Pago */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Forma de Pago
              </label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="all">Todas las Formas</option>
                <option value="transfer">Transferencia / ACH</option>
                <option value="cash">Efectivo</option>
                <option value="corporate_card">Tarjeta Corporativa</option>
                <option value="check">Cheque Comercial</option>
                <option value="card">Tarjeta Débito/Crédito</option>
                <option value="credit">Crédito Comercial (CXP)</option>
              </select>
            </div>

            {/* Rango de Fechas */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
                />
              </div>
            </div>

          </div>
        )}

        {/* Active Filter Indicators & Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Mostrando <strong>{filteredExpenses.length}</strong> de <strong>{expenses.length}</strong> compras y gastos.
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar Todos los Filtros</span>
            </button>
          </div>
        )}

      </div>

      {/* EXPENSES / PURCHASES TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[980px]">
            <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Registro / Factura</th>
                <th className="py-3 px-4">Fecha Emisión</th>
                <th className="py-3 px-4">Proveedor / Acreedor</th>
                <th className="py-3 px-4">Tipo & Categoría de Gasto</th>
                <th className="py-3 px-4">Centro / Flota</th>
                <th className="py-3 px-4 text-center">Deducibilidad</th>
                <th className="py-3 px-4 text-center">Soporte</th>
                <th className="py-3 px-4 text-right">Monto Total</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((exp) => (
                  <tr 
                    key={exp.id} 
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => setSelectedExpenseDetail(exp)}
                  >
                    {/* Código & Factura */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{exp.code}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Fac: {exp.invoiceNumber || 'S/N'}
                      </div>
                    </td>

                    {/* Fecha */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800 text-xs">
                        {exp.date}
                      </div>
                      {exp.dueDate && (
                        <div className="text-[10px] text-amber-700 font-medium">
                          Vence: {exp.dueDate}
                        </div>
                      )}
                    </td>

                    {/* Proveedor */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 max-w-[200px] truncate">
                        {exp.providerName}
                      </div>
                      {exp.providerRuc && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          RUC: {formatRucDv(exp.providerRuc, exp.providerDv)}
                        </div>
                      )}
                    </td>

                    {/* Tipo & Categoría */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 text-xs">
                        {exp.category}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[220px]">
                        {exp.expenseType || 'Gasto Operativo'}
                      </div>
                    </td>

                    {/* Centro de Costo & Placa */}
                    <td className="py-3 px-4 space-y-1">
                      {exp.vehiclePlate ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          <Truck className="w-3 h-3 text-amber-700" />
                          <span>{exp.vehiclePlate}</span>
                        </span>
                      ) : null}

                      {exp.costCenter ? (
                        <span className="block text-[10px] text-slate-600 truncate max-w-[140px]">
                          {exp.costCenter}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Oficina Principal</span>
                      )}
                    </td>

                    {/* Deducibilidad Fiscal */}
                    <td className="py-3 px-4 text-center">
                      {exp.isDeductible !== false ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-700" />
                          <span>Deducible</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <ShieldAlert className="w-3 h-3 text-rose-700" />
                          <span>No Deducible</span>
                        </span>
                      )}
                    </td>

                    {/* Soporte Digital */}
                    <td className="py-3 px-4 text-center">
                      {exp.attachment ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewAttachmentUrl({
                              url: exp.attachment!.dataUrl,
                              name: exp.attachment!.name,
                              isPdf: exp.attachment!.type.includes('pdf')
                            });
                          }}
                          title="Ver soporte digital adjunto"
                          className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">Ver</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">Sin archivo</span>
                      )}
                    </td>

                    {/* Monto Total */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono font-black text-slate-900 text-xs sm:text-sm">
                        ${formatCurrency(exp.amount)}
                      </div>
                      {safeNumber(exp.taxAmount) > 0 && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          ITBMS: ${formatCurrency(exp.taxAmount)}
                        </div>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Ver */}
                        <button
                          type="button"
                          onClick={() => setSelectedExpenseDetail(exp)}
                          title="Ver Comprobante Completo"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Editar */}
                        {onEditExpense && (
                          <button
                            type="button"
                            onClick={() => onEditExpense(exp)}
                            title="Editar y Modificar Compra / Gasto"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}

                        {/* Imprimir */}
                        <button
                          type="button"
                          onClick={() => printExpenseVoucherPDF(exp, companyProfile)}
                          title="Imprimir Comprobante Oficial"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* Eliminar */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteClick(exp, e)}
                          title="Eliminar Registro"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-bold text-slate-600">No se encontraron compras o gastos registrados.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {hasActiveFilters ? 'Pruebe modificando los filtros de búsqueda.' : 'Haga clic en "Registrar Compra / Gasto" para ingresar el primero.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          MODAL DE VISTA PREVIA DETALLADA DEL COMPROBANTE DE COMPRA
         ======================================================== */}
      {selectedExpenseDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedExpenseDetail(null)}
        >
          <div 
            className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Title & Close */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-extrabold uppercase tracking-wide">
                  Vista Previa del Comprobante Contable Oficial
                </span>
              </div>
              <button
                onClick={() => setSelectedExpenseDetail(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Voucher Body (Paper Style) */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-white text-slate-900">
              
              {/* ENCABEZADO INSTITUCIONAL */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b pb-6 border-slate-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    {companyProfile?.logoUrl && (
                      <img 
                        src={companyProfile.logoUrl} 
                        alt="Logo Empresa" 
                        className="h-10 w-auto object-contain rounded-sm"
                      />
                    )}
                    <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                      {companyProfile?.name || 'DISTRIBUIDORA EL IMPERIO'}
                    </h2>
                  </div>
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <p><strong>RUC:</strong> {formatRucDv(companyProfile?.ruc || '155689021-2-2026', companyProfile?.dv)}</p>
                    <p><strong>Tel / WhatsApp:</strong> {companyProfile?.whatsapp || companyProfile?.phone || '64429775'}</p>
                    <p><strong>Email:</strong> {companyProfile?.email || 'distribuidoraelimperio8280@gmail.com'}</p>
                    <p><strong>Dirección:</strong> {companyProfile?.address || 'Panamá, República de Panamá'}</p>
                  </div>
                </div>

                <div className="text-left sm:text-right space-y-1">
                  <div className="inline-block px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-extrabold uppercase tracking-wide">
                    COMPROBANTE DE REGISTRO DE COMPRA / GASTO INTERNO
                  </div>
                  <div className="text-xs text-slate-600 pt-1 space-y-0.5">
                    <p><strong>N° Registro:</strong> <span className="font-mono font-bold text-slate-900">{selectedExpenseDetail.code}</span></p>
                    <p><strong>Fecha Emisión:</strong> {selectedExpenseDetail.date}</p>
                    {selectedExpenseDetail.dueDate && (
                      <p><strong>Fecha Vencimiento:</strong> {selectedExpenseDetail.dueDate}</p>
                    )}
                    <p><strong>Fecha Recepción:</strong> {selectedExpenseDetail.receptionDate || selectedExpenseDetail.date}</p>
                  </div>
                </div>
              </div>

              {/* DETAILS CARDS (PROVIDER & DOCUMENT / OPERATION) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Provider Card */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider border-b border-slate-200 pb-1">
                    Datos del Proveedor / Acreedor
                  </div>
                  <p><strong>Razón Social:</strong> <span className="text-slate-900 font-bold">{selectedExpenseDetail.providerName}</span></p>
                  <p><strong>RUC:</strong> <span className="font-mono">{formatRucDv(selectedExpenseDetail.providerRuc, selectedExpenseDetail.providerDv)}</span></p>
                  <p><strong>Dirección:</strong> {selectedExpenseDetail.providerAddress || 'Panamá, Rep. de Panamá'}</p>
                  <p><strong>Teléfono:</strong> {selectedExpenseDetail.providerPhone || 'N/A'} • <strong>Email:</strong> {selectedExpenseDetail.providerEmail || 'N/A'}</p>
                  {selectedExpenseDetail.costCenter && (
                    <p><strong>Centro de Costo:</strong> <span className="font-semibold text-slate-900">{selectedExpenseDetail.costCenter}</span></p>
                  )}
                </div>

                {/* Document Card */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider border-b border-slate-200 pb-1">
                    Datos de la Factura y Operación
                  </div>
                  <p><strong>Factura de Origen N°:</strong> <span className="font-mono font-bold text-slate-900">{selectedExpenseDetail.invoiceNumber || 'S/N'}</span></p>
                  <p><strong>Tipo de Gasto:</strong> {selectedExpenseDetail.expenseType || 'General'}</p>
                  <p><strong>Categoría:</strong> <span className="font-bold text-slate-900">{selectedExpenseDetail.category}</span></p>
                  <p>
                    <strong>Flota / Placa:</strong>{' '}
                    {selectedExpenseDetail.vehiclePlate ? (
                      <span className="font-mono font-bold text-amber-700">
                        {selectedExpenseDetail.vehiclePlate} {selectedExpenseDetail.vehicleName ? `(${selectedExpenseDetail.vehicleName})` : ''}
                      </span>
                    ) : (
                      'N/A (Gasto General)'
                    )}
                  </p>
                  <p>
                    <strong>Deducibilidad Fiscal:</strong>{' '}
                    <span className={`font-bold ${selectedExpenseDetail.isDeductible !== false ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {selectedExpenseDetail.isDeductible !== false ? 'Sí, 100% Deducible' : 'No Deducible'}
                    </span>
                  </p>
                  <p><strong>Forma de Pago:</strong> {formatPaymentMethod(selectedExpenseDetail.paymentMethod)}</p>
                </div>
              </div>

              {/* ITEMS BREAKDOWN TABLE */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">#</th>
                      <th className="py-2.5 px-3">Descripción Detallada</th>
                      <th className="py-2.5 px-3 w-16 text-center">Cant.</th>
                      <th className="py-2.5 px-3 w-24 text-right">Costo Unit.</th>
                      <th className="py-2.5 px-3 w-16 text-center">ITBMS %</th>
                      <th className="py-2.5 px-3 w-24 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedExpenseDetail.items && selectedExpenseDetail.items.length > 0 ? (
                      selectedExpenseDetail.items.map((it, idx) => (
                        <tr key={it.id || idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{it.description}</td>
                          <td className="py-2.5 px-3 text-center font-bold">{it.quantity}</td>
                          <td className="py-2.5 px-3 text-right font-mono">${formatCurrency(it.unitPrice)}</td>
                          <td className="py-2.5 px-3 text-center text-slate-600 font-semibold">{safeNumber(it.taxRate)}%</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">${formatCurrency(it.subtotal)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-2.5 px-3 text-center text-slate-400 font-semibold">1</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {selectedExpenseDetail.notes || selectedExpenseDetail.category || 'Compra / Insumos según comprobante'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">1</td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          ${formatCurrency(selectedExpenseDetail.subtotal ?? (safeNumber(selectedExpenseDetail.amount) - safeNumber(selectedExpenseDetail.taxAmount)))}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600 font-semibold">
                          {safeNumber(selectedExpenseDetail.taxAmount) > 0 ? '7%' : '0%'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ${formatCurrency(selectedExpenseDetail.subtotal ?? (safeNumber(selectedExpenseDetail.amount) - safeNumber(selectedExpenseDetail.taxAmount)))}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* TOTALS & NOTES BLOCK */}
              <div className="flex flex-col sm:flex-row items-stretch justify-between gap-4">
                <div className="flex-1 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Notas y Observaciones de Auditoría
                  </span>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {selectedExpenseDetail.notes || 'Registro de compra/gasto verificado con soporte fiscal y físico en archivo contable.'}
                  </p>
                  {selectedExpenseDetail.attachment && (
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-teal-800 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                        <span>Soporte Digital: {selectedExpenseDetail.attachment.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewAttachmentUrl({
                          url: selectedExpenseDetail.attachment!.dataUrl,
                          name: selectedExpenseDetail.attachment!.name,
                          isPdf: selectedExpenseDetail.attachment!.type.includes('pdf')
                        })}
                        className="text-xs text-teal-700 hover:text-teal-900 font-bold underline cursor-pointer"
                      >
                        Ver Documento
                      </button>
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-72 bg-slate-900 text-white p-5 rounded-2xl space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Subtotal General:</span>
                    <span className="font-mono font-bold">
                      ${formatCurrency(selectedExpenseDetail.subtotal ?? (safeNumber(selectedExpenseDetail.amount) - safeNumber(selectedExpenseDetail.taxAmount)))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Impuesto ITBMS:</span>
                    <span className="font-mono font-bold">
                      ${formatCurrency(selectedExpenseDetail.taxAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-slate-800 text-emerald-400">
                    <span>TOTAL COMPRA / GASTO:</span>
                    <span className="font-mono text-lg">
                      ${formatCurrency(selectedExpenseDetail.amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* SIGNATURES & AUDIT BLOCK */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                <div className="text-center p-3.5 border border-dashed border-slate-300 rounded-xl">
                  <div className="h-10"></div>
                  <div className="border-t border-slate-400 mx-4 pt-1 text-[11px] font-bold text-slate-900 uppercase">
                    REGISTRADO POR
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Nombre: {selectedExpenseDetail.registeredBy || 'JOSE'} • Firma y Fecha
                  </div>
                </div>

                <div className="text-center p-3.5 border border-dashed border-slate-300 rounded-xl">
                  <div className="h-10"></div>
                  <div className="border-t border-slate-400 mx-4 pt-1 text-[11px] font-bold text-slate-900 uppercase">
                    APROBADO POR
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {selectedExpenseDetail.approvedBy || 'ADMINISTRACIÓN Y FINANZAS'} (Sello)
                  </div>
                </div>
              </div>

              {/* AUDIT LEGEND */}
              <div className="text-center text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                Comprobante generado por Imperio Pro Facturación y Contabilidad - Válido para control interno, conciliación contable y soporte fiscal.
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setExpenseToDelete(selectedExpenseDetail);
                }}
                className="w-full sm:w-auto px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Registro</span>
              </button>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                {onEditExpense && (
                  <button
                    type="button"
                    onClick={() => {
                      const exp = selectedExpenseDetail;
                      setSelectedExpenseDetail(null);
                      onEditExpense(exp);
                    }}
                    className="w-full sm:w-auto px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Modificar / Editar</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => downloadExpenseVoucherPDF(selectedExpenseDetail, companyProfile)}
                  className="w-full sm:w-auto px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Descargar PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => printExpenseVoucherPDF(selectedExpenseDetail, companyProfile)}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Comprobante</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          MODAL DE CONFIRMACIÓN DE ELIMINACIÓN
         ======================================================== */}
      {expenseToDelete && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isDeleting && setExpenseToDelete(null)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                ¿Eliminar registro de compra / gasto?
              </h3>
              <p className="text-xs text-slate-500">
                Se eliminará permanentemente el registro <strong className="font-mono text-slate-800">{expenseToDelete.code}</strong> correspondiente a <strong className="text-slate-800">{expenseToDelete.providerName}</strong> por un monto de <strong className="text-slate-900 font-mono">${formatCurrency(expenseToDelete.amount)}</strong>.
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Esta acción no se puede deshacer y actualizará los balances contables de egresos.</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setExpenseToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteExpense}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Eliminando...' : 'Sí, Eliminar Registro'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL DE VISTA PREVIA DEL SOPORTE DIGITAL ADJUNTO
         ======================================================== */}
      {previewAttachmentUrl && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setPreviewAttachmentUrl(null)}
        >
          <div 
            className="bg-white w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold truncate max-w-md">{previewAttachmentUrl.name}</span>
              </div>
              <button
                onClick={() => setPreviewAttachmentUrl(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-100">
              {previewAttachmentUrl.isPdf ? (
                <iframe
                  src={previewAttachmentUrl.url}
                  title="Soporte Digital PDF"
                  className="w-full h-[75vh] rounded-lg border border-slate-300"
                />
              ) : (
                <img
                  src={previewAttachmentUrl.url}
                  alt="Soporte digital"
                  className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
