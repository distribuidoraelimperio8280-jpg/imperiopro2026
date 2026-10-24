import type { Invoice, Expense, Product, Contact, TaxRate } from '../types';

/**
 * Servicio Central de Contabilidad Fiscal, Normas DGI y Auditoría Financiera para Panamá
 * Imperio Pro Facturación y Contabilidad
 */

export interface FiscalTaxBreakdown {
  rate: number;
  label: string;
  taxableBase: number;
  taxAmount: number;
  totalWithTax: number;
  invoiceCount: number;
}

export interface FiscalSalesDGIReport {
  period: { startDate: string; endDate: string };
  exemptSales0: FiscalTaxBreakdown;
  standardSales7: FiscalTaxBreakdown;
  specialSales10: FiscalTaxBreakdown;
  tobaccoSales15: FiscalTaxBreakdown;
  totalGrossSales: number;
  totalTaxableBase: number;
  totalTaxCollected: number;
  totalInvoices: number;
}

export interface FiscalPurchasesDGIReport {
  period: { startDate: string; endDate: string };
  deductiblePurchases: number;
  deductibleTaxPaid: number;
  nonDeductiblePurchases: number;
  nonDeductibleTaxPaid: number;
  totalPurchases: number;
  totalTaxPaid: number;
  totalExpenseCount: number;
  netTaxToPayOrCredit: number; // Débito Fiscal - Crédito Fiscal
}

export interface JournalEntryLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  code: string; // Asiento #
  reference: string; // ej. Factura FAC-0001, Gasto G-0002
  concept: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export interface LedgerAccount {
  accountCode: string;
  accountName: string;
  initialBalance: number;
  totalDebit: number;
  totalCredit: number;
  finalBalance: number;
  nature: 'deudor' | 'acreedor';
  entries: {
    date: string;
    reference: string;
    concept: string;
    debit: number;
    credit: number;
  }[];
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  initialBalance: number;
  debit: number;
  credit: number;
  debtorBalance: number;
  creditorBalance: number;
}

export interface KardexValuationReport {
  periodEnd: string;
  initialInventoryValuation: number;
  purchasesValuation: number;
  costOfGoodsSold: number;
  finalInventoryValuation: number;
  itemCount: number;
  productsKardex: {
    id: string;
    name: string;
    sku: string;
    category: string;
    unit: string;
    initialQty: number;
    purchasedQty: number;
    soldQty: number;
    finalStock: number;
    unitCost: number;
    unitPrice: number;
    totalValuation: number;
  }[];
}

export interface AgingBucket {
  current: number;       // Corriente (Al día)
  days1_30: number;      // 1 - 30 días
  days31_60: number;     // 31 - 60 días
  days61_90: number;     // 61 - 90 días
  daysOver90: number;    // +90 días
  totalPending: number;
}

export interface ClientAgingRecord {
  contactId: string;
  name: string;
  rucOrCedula: string;
  phone?: string;
  creditLimit: number;
  buckets: AgingBucket;
  invoicesPendingCount: number;
}

export interface CashRegisterClosingReport {
  date: string;
  cashierName: string;
  openingCashFund: number;
  salesCash: number;
  salesYappy: number;
  salesACH: number;
  salesCards: number;
  salesCheck: number;
  salesCredit: number;
  totalInflows: number;
  pettyCashOutflows: number;
  expectedCashInDrawer: number;
  countedCashInDrawer: number;
  difference: number; // Positivo: sobrante, Negativo: faltante
  isBalanced: boolean;
  notes?: string;
}

/** Redondeo financiero estricto a 2 decimales sin fallos de punto flotante */
export function round2(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/** Formateo de moneda en Balboas / USD */
export function formatBalboas(val: number): string {
  return `B/. ${round2(val).toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Genera el Reporte de Ventas e ITBMS DGI desglosado por tasas fiscales */
export function generateFiscalSalesDGIReport(
  invoices: Invoice[],
  startDate: string,
  endDate: string
): FiscalSalesDGIReport {
  const filtered = invoices.filter(
    (i) => i.type === 'sale' && i.status !== 'cancelled' && i.date >= startDate && i.date <= endDate
  );

  let exemptBase = 0;
  let exemptCount = 0;

  let base7 = 0;
  let tax7 = 0;
  let count7 = 0;

  let base10 = 0;
  let tax10 = 0;
  let count10 = 0;

  let base15 = 0;
  let tax15 = 0;
  let count15 = 0;

  filtered.forEach((inv) => {
    inv.items.forEach((item) => {
      const rate = Number(item.taxRate) || 0;
      const subtotal = round2(item.subtotal);
      const tax = round2(item.taxAmount);

      if (rate === 0) {
        exemptBase += subtotal;
        exemptCount++;
      } else if (rate === 7) {
        base7 += subtotal;
        tax7 += tax;
        count7++;
      } else if (rate === 10) {
        base10 += subtotal;
        tax10 += tax;
        count10++;
      } else if (rate === 15 || rate === 16 || rate === 19) {
        // En Panamá el tabaco es 15%
        base15 += subtotal;
        tax15 += tax;
        count15++;
      } else {
        // Por defecto al 7%
        base7 += subtotal;
        tax7 += tax;
        count7++;
      }
    });
  });

  exemptBase = round2(exemptBase);
  base7 = round2(base7);
  tax7 = round2(tax7);
  base10 = round2(base10);
  tax10 = round2(tax10);
  base15 = round2(base15);
  tax15 = round2(tax15);

  const totalGrossSales = round2(filtered.reduce((sum, i) => sum + i.total, 0));
  const totalTaxableBase = round2(exemptBase + base7 + base10 + base15);
  const totalTaxCollected = round2(tax7 + tax10 + tax15);

  return {
    period: { startDate, endDate },
    exemptSales0: {
      rate: 0,
      label: 'Exento (0%) - Agro / Canasta / Medicina',
      taxableBase: exemptBase,
      taxAmount: 0,
      totalWithTax: exemptBase,
      invoiceCount: exemptCount,
    },
    standardSales7: {
      rate: 7,
      label: 'General (7%) - Ferretería / Electricidad / Insumos',
      taxableBase: base7,
      taxAmount: tax7,
      totalWithTax: round2(base7 + tax7),
      invoiceCount: count7,
    },
    specialSales10: {
      rate: 10,
      label: 'Selectivo (10%) - Licores / Hospedaje',
      taxableBase: base10,
      taxAmount: tax10,
      totalWithTax: round2(base10 + tax10),
      invoiceCount: count10,
    },
    tobaccoSales15: {
      rate: 15,
      label: 'Especial (15%) - Cigarrillos / Tabaco',
      taxableBase: base15,
      taxAmount: tax15,
      totalWithTax: round2(base15 + tax15),
      invoiceCount: count15,
    },
    totalGrossSales,
    totalTaxableBase,
    totalTaxCollected,
    totalInvoices: filtered.length,
  };
}

/** Genera el Registro de Compras y Gastos Deducibles con ITBMS */
export function generateFiscalPurchasesDGIReport(
  expenses: Expense[],
  salesReport: FiscalSalesDGIReport,
  startDate: string,
  endDate: string
): FiscalPurchasesDGIReport {
  const filtered = expenses.filter(
    (e) => e.date >= startDate && e.date <= endDate
  );

  let deductiblePurchases = 0;
  let deductibleTaxPaid = 0;
  let nonDeductiblePurchases = 0;
  let nonDeductibleTaxPaid = 0;

  filtered.forEach((e) => {
    const isDeductible = (e as any).isTaxDeductible !== false && (e as any).isDeductible !== false; // por defecto deducible
    const subtotal = round2(Number(e.subtotal) || Number(e.amount) || 0);
    const tax = round2(Number(e.taxAmount) || 0);

    if (isDeductible) {
      deductiblePurchases += subtotal;
      deductibleTaxPaid += tax;
    } else {
      nonDeductiblePurchases += subtotal;
      nonDeductibleTaxPaid += tax;
    }
  });

  deductiblePurchases = round2(deductiblePurchases);
  deductibleTaxPaid = round2(deductibleTaxPaid);
  nonDeductiblePurchases = round2(nonDeductiblePurchases);
  nonDeductibleTaxPaid = round2(nonDeductibleTaxPaid);

  const totalPurchases = round2(deductiblePurchases + nonDeductiblePurchases);
  const totalTaxPaid = round2(deductibleTaxPaid + nonDeductibleTaxPaid);
  const netTaxToPayOrCredit = round2(salesReport.totalTaxCollected - deductibleTaxPaid);

  return {
    period: { startDate, endDate },
    deductiblePurchases,
    deductibleTaxPaid,
    nonDeductiblePurchases,
    nonDeductibleTaxPaid,
    totalPurchases,
    totalTaxPaid,
    totalExpenseCount: filtered.length,
    netTaxToPayOrCredit,
  };
}

/** Genera Asientos Automáticos de Partida Doble (Libro Diario) */
export function generateJournalEntries(
  invoices: Invoice[],
  expenses: Expense[],
  products: Product[],
  startDate: string = '2000-01-01',
  endDate: string = '2099-12-31'
): JournalEntry[] {
  const entries: JournalEntry[] = [];
  let entryNumber = 1;

  const costMap: Record<string, number> = {};
  products.forEach((p) => {
    costMap[p.id] = Number(p.cost) || 0;
  });

  // 1. Asientos por cada Venta
  const filteredInvoices = invoices
    .filter((i) => i.type === 'sale' && i.status !== 'cancelled' && i.date >= startDate && i.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  filteredInvoices.forEach((inv) => {
    const isPaid = inv.status === 'paid';
    const isCredit = inv.paymentMethod === 'credit' || !isPaid;

    const total = round2(inv.total);
    const subtotal = round2(inv.subtotal);
    const taxTotal = round2(inv.taxTotal);

    // Líneas del asiento de venta
    const lines: JournalEntryLine[] = [];

    if (isCredit) {
      lines.push({
        accountCode: '1103',
        accountName: 'Cuentas por Cobrar Clientes',
        debit: total,
        credit: 0,
      });
    } else if (inv.paymentMethod === 'cash') {
      lines.push({
        accountCode: '1101',
        accountName: 'Caja General / Mostrador',
        debit: total,
        credit: 0,
      });
    } else {
      lines.push({
        accountCode: '1102',
        accountName: 'Bancos / Yappy / ACH Comercial',
        debit: total,
        credit: 0,
      });
    }

    lines.push({
      accountCode: '4101',
      accountName: 'Ingresos por Ventas de Mercancías',
      debit: 0,
      credit: subtotal,
    });

    if (taxTotal > 0) {
      lines.push({
        accountCode: '2105',
        accountName: 'Débito Fiscal ITBMS por Pagar',
        debit: 0,
        credit: taxTotal,
      });
    }

    const totalDebit = round2(lines.reduce((sum, l) => sum + l.debit, 0));
    const totalCredit = round2(lines.reduce((sum, l) => sum + l.credit, 0));

    entries.push({
      id: `asiento-${inv.id}`,
      date: inv.date,
      code: `AS-${entryNumber.toString().padStart(5, '0')}`,
      reference: inv.code,
      concept: `Venta factura ${inv.code} - ${inv.contactName}`,
      lines,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.05,
    });
    entryNumber++;

    // Asiento de Costo de Ventas e Inventario
    let invCost = 0;
    inv.items.forEach((item) => {
      const c = costMap[item.productId] || (item.price * 0.65); // 65% margen estandar
      invCost += (Number(item.quantity) || 1) * c;
    });
    invCost = round2(invCost);

    if (invCost > 0) {
      entries.push({
        id: `asiento-costo-${inv.id}`,
        date: inv.date,
        code: `AS-${entryNumber.toString().padStart(5, '0')}`,
        reference: inv.code,
        concept: `Costo de lo vendido para factura ${inv.code}`,
        lines: [
          {
            accountCode: '5101',
            accountName: 'Costo de Ventas de Mercancías',
            debit: invCost,
            credit: 0,
          },
          {
            accountCode: '1105',
            accountName: 'Inventario de Mercancías en Almacén',
            debit: 0,
            credit: invCost,
          },
        ],
        totalDebit: invCost,
        totalCredit: invCost,
        isBalanced: true,
      });
      entryNumber++;
    }
  });

  // 2. Asientos por cada Gasto / Compra
  const filteredExpenses = expenses
    .filter((e) => e.date >= startDate && e.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  filteredExpenses.forEach((exp) => {
    const isCredit = exp.paymentMethod === 'credit';
    const subtotal = round2(Number(exp.subtotal) || Number(exp.amount) || 0);
    const tax = round2(Number(exp.taxAmount) || 0);
    const total = round2(subtotal + tax);

    const isInventoryPurchase =
      exp.expenseType === 'COSTO_VENTAS_INVENTARIO' ||
      exp.category?.toLowerCase().includes('compra de mercadería') ||
      exp.category?.toLowerCase().includes('inventario');

    const expenseAccountCode = isInventoryPurchase ? '1105' : '5201';
    const expenseAccountName = isInventoryPurchase
      ? 'Inventario de Mercancías en Almacén'
      : `Gastos Operativos (${exp.category || 'Generales'})`;

    const lines: JournalEntryLine[] = [
      {
        accountCode: expenseAccountCode,
        accountName: expenseAccountName,
        debit: subtotal,
        credit: 0,
      },
    ];

    if (tax > 0) {
      lines.push({
        accountCode: '1107',
        accountName: 'Crédito Fiscal ITBMS Deducible',
        debit: tax,
        credit: 0,
      });
    }

    if (isCredit) {
      lines.push({
        accountCode: '2101',
        accountName: 'Cuentas por Pagar Proveedores',
        debit: 0,
        credit: total,
      });
    } else {
      lines.push({
        accountCode: '1101',
        accountName: 'Caja General / Banco ACH Pagos',
        debit: 0,
        credit: total,
      });
    }

    const totalDebit = round2(lines.reduce((sum, l) => sum + l.debit, 0));
    const totalCredit = round2(lines.reduce((sum, l) => sum + l.credit, 0));

    entries.push({
      id: `asiento-${exp.id}`,
      date: exp.date,
      code: `AS-${entryNumber.toString().padStart(5, '0')}`,
      reference: exp.code || exp.invoiceNumber || 'G-EXP',
      concept: `Registro de compra/gasto: ${exp.providerName} (${exp.category || 'Operaciones'})`,
      lines,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.05,
    });
    entryNumber++;
  });

  return entries;
}

/** Genera el Libro Mayor y el Balance de Comprobación */
export function generateLedgerAndTrialBalance(journalEntries: JournalEntry[]): {
  ledger: Record<string, LedgerAccount>;
  trialBalance: TrialBalanceRow[];
  totalTrialDebit: number;
  totalTrialCredit: number;
  isTrialBalanced: boolean;
} {
  const ledger: Record<string, LedgerAccount> = {};

  journalEntries.forEach((entry) => {
    entry.lines.forEach((line) => {
      if (!ledger[line.accountCode]) {
        const isAssetOrExpense = line.accountCode.startsWith('1') || line.accountCode.startsWith('5');
        ledger[line.accountCode] = {
          accountCode: line.accountCode,
          accountName: line.accountName,
          initialBalance: 0,
          totalDebit: 0,
          totalCredit: 0,
          finalBalance: 0,
          nature: isAssetOrExpense ? 'deudor' : 'acreedor',
          entries: [],
        };
      }

      ledger[line.accountCode].totalDebit += line.debit;
      ledger[line.accountCode].totalCredit += line.credit;
      ledger[line.accountCode].entries.push({
        date: entry.date,
        reference: entry.reference,
        concept: entry.concept,
        debit: line.debit,
        credit: line.credit,
      });
    });
  });

  const trialBalance: TrialBalanceRow[] = [];
  let totalTrialDebit = 0;
  let totalTrialCredit = 0;

  Object.values(ledger).forEach((acc) => {
    acc.totalDebit = round2(acc.totalDebit);
    acc.totalCredit = round2(acc.totalCredit);

    let debtorBalance = 0;
    let creditorBalance = 0;

    if (acc.nature === 'deudor') {
      const net = acc.totalDebit - acc.totalCredit;
      if (net >= 0) debtorBalance = round2(net);
      else creditorBalance = round2(Math.abs(net));
    } else {
      const net = acc.totalCredit - acc.totalDebit;
      if (net >= 0) creditorBalance = round2(net);
      else debtorBalance = round2(Math.abs(net));
    }

    acc.finalBalance = debtorBalance > 0 ? debtorBalance : creditorBalance;

    totalTrialDebit += debtorBalance;
    totalTrialCredit += creditorBalance;

    trialBalance.push({
      accountCode: acc.accountCode,
      accountName: acc.accountName,
      initialBalance: 0,
      debit: acc.totalDebit,
      credit: acc.totalCredit,
      debtorBalance,
      creditorBalance,
    });
  });

  trialBalance.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  totalTrialDebit = round2(totalTrialDebit);
  totalTrialCredit = round2(totalTrialCredit);

  return {
    ledger,
    trialBalance,
    totalTrialDebit,
    totalTrialCredit,
    isTrialBalanced: Math.abs(totalTrialDebit - totalTrialCredit) < 0.05,
  };
}

/** Calcula el Kardex y Valoración de Inventario al Cierre Anual / Período */
export function calculateInventoryKardex(
  products: Product[],
  invoices: Invoice[],
  expenses: Expense[],
  periodEnd: string
): KardexValuationReport {
  let initialInventoryValuation = 0;
  let purchasesValuation = 0;
  let costOfGoodsSold = 0;
  let finalInventoryValuation = 0;

  // Mapa de ventas por producto
  const soldQtyMap: Record<string, number> = {};
  invoices.forEach((inv) => {
    if (inv.status !== 'cancelled') {
      inv.items.forEach((item) => {
        soldQtyMap[item.productId] = (soldQtyMap[item.productId] || 0) + (Number(item.quantity) || 0);
      });
    }
  });

  const productsKardex = products.map((prod) => {
    const finalStock = Number(prod.stock) || 0;
    const unitCost = Number(prod.cost) || 0;
    const unitPrice = Number(prod.price) || 0;
    const soldQty = soldQtyMap[prod.id] || 0;

    // Estimación de inventario inicial para el ejercicio contable
    const purchasedQty = Math.round(soldQty * 0.8);
    const initialQty = Math.max(0, finalStock + soldQty - purchasedQty);

    const totalValuation = round2(finalStock * unitCost);

    initialInventoryValuation += initialQty * unitCost;
    purchasesValuation += purchasedQty * unitCost;
    costOfGoodsSold += soldQty * unitCost;
    finalInventoryValuation += totalValuation;

    return {
      id: prod.id,
      name: prod.name,
      sku: prod.sku || 'S/N',
      category: prod.category || 'General',
      unit: prod.unit || 'Unidad',
      initialQty,
      purchasedQty,
      soldQty,
      finalStock,
      unitCost,
      unitPrice,
      totalValuation,
    };
  });

  return {
    periodEnd,
    initialInventoryValuation: round2(initialInventoryValuation),
    purchasesValuation: round2(purchasesValuation),
    costOfGoodsSold: round2(costOfGoodsSold),
    finalInventoryValuation: round2(finalInventoryValuation),
    itemCount: products.length,
    productsKardex: productsKardex.sort((a, b) => b.totalValuation - a.totalValuation),
  };
}

/** Calcula el Reporte de Antigüedad de Saldos (Aging) de Cuentas por Cobrar */
export function calculateClientAgingReport(
  invoices: Invoice[],
  contacts: Contact[]
): {
  clientRecords: ClientAgingRecord[];
  totals: AgingBucket;
} {
  const now = new Date();
  const recordsMap: Record<string, ClientAgingRecord> = {};

  contacts.forEach((c) => {
    recordsMap[c.id] = {
      contactId: c.id,
      name: c.name,
      rucOrCedula: c.rucOrCedula || 'N/A',
      phone: c.phone || c.whatsapp || c.mobile,
      creditLimit: Number(c.creditLimit) || 0,
      buckets: {
        current: 0,
        days1_30: 0,
        days31_60: 0,
        days61_90: 0,
        daysOver90: 0,
        totalPending: 0,
      },
      invoicesPendingCount: 0,
    };
  });

  const totals: AgingBucket = {
    current: 0,
    days1_30: 0,
    days31_60: 0,
    days61_90: 0,
    daysOver90: 0,
    totalPending: 0,
  };

  invoices.forEach((inv) => {
    if (inv.status === 'pending' || inv.status === 'overdue') {
      const pendingAmount = round2(Math.max(0, inv.total - (Number(inv.paidAmount) || 0)));
      if (pendingAmount <= 0) return;

      const due = new Date(inv.dueDate || inv.date);
      const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

      const contactId = inv.contactId || 'generico';
      if (!recordsMap[contactId]) {
        recordsMap[contactId] = {
          contactId,
          name: inv.contactName || 'Cliente No Identificado',
          rucOrCedula: inv.contactRuc || 'N/A',
          creditLimit: 0,
          buckets: { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, daysOver90: 0, totalPending: 0 },
          invoicesPendingCount: 0,
        };
      }

      const rec = recordsMap[contactId];
      rec.invoicesPendingCount++;
      rec.buckets.totalPending += pendingAmount;
      totals.totalPending += pendingAmount;

      if (diffDays <= 0) {
        rec.buckets.current += pendingAmount;
        totals.current += pendingAmount;
      } else if (diffDays <= 30) {
        rec.buckets.days1_30 += pendingAmount;
        totals.days1_30 += pendingAmount;
      } else if (diffDays <= 60) {
        rec.buckets.days31_60 += pendingAmount;
        totals.days31_60 += pendingAmount;
      } else if (diffDays <= 90) {
        rec.buckets.days61_90 += pendingAmount;
        totals.days61_90 += pendingAmount;
      } else {
        rec.buckets.daysOver90 += pendingAmount;
        totals.daysOver90 += pendingAmount;
      }
    }
  });

  // Redondear todo
  totals.current = round2(totals.current);
  totals.days1_30 = round2(totals.days1_30);
  totals.days31_60 = round2(totals.days31_60);
  totals.days61_90 = round2(totals.days61_90);
  totals.daysOver90 = round2(totals.daysOver90);
  totals.totalPending = round2(totals.totalPending);

  const clientRecords = Object.values(recordsMap)
    .filter((c) => c.buckets.totalPending > 0)
    .sort((a, b) => b.buckets.totalPending - a.buckets.totalPending);

  clientRecords.forEach((c) => {
    c.buckets.current = round2(c.buckets.current);
    c.buckets.days1_30 = round2(c.buckets.days1_30);
    c.buckets.days31_60 = round2(c.buckets.days31_60);
    c.buckets.days61_90 = round2(c.buckets.days61_90);
    c.buckets.daysOver90 = round2(c.buckets.daysOver90);
    c.buckets.totalPending = round2(c.buckets.totalPending);
  });

  return {
    clientRecords,
    totals,
  };
}

/** Calcula el Cierre y Arqueo Diario de Caja (Reporte Z) */
export function calculateDailyCashClosing(
  targetDate: string,
  invoices: Invoice[],
  expenses: Expense[],
  openingFund: number,
  cashierName: string,
  countedCashInDrawer: number
): CashRegisterClosingReport {
  const dayInvoices = invoices.filter(
    (i) => i.date === targetDate && i.type === 'sale' && i.status !== 'cancelled'
  );

  let salesCash = 0;
  let salesYappy = 0;
  let salesACH = 0;
  let salesCards = 0;
  let salesCheck = 0;
  let salesCredit = 0;

  dayInvoices.forEach((inv) => {
    const isPaid = inv.status === 'paid';
    const amount = round2(inv.total);

    if (!isPaid || inv.paymentMethod === 'credit') {
      salesCredit += amount;
    } else if (inv.paymentMethod === 'cash') {
      salesCash += amount;
    } else if (inv.paymentMethod === 'transfer') {
      // Diferenciar Yappy o ACH según notas o vendedor
      if (inv.notes?.toLowerCase().includes('yappy') || inv.sellerName?.toLowerCase().includes('yappy')) {
        salesYappy += amount;
      } else {
        salesACH += amount;
      }
    } else if (inv.paymentMethod === 'card' || inv.paymentMethod === 'corporate_card') {
      salesCards += amount;
    } else if (inv.paymentMethod === 'check') {
      salesCheck += amount;
    } else {
      salesCash += amount;
    }
  });

  // Salidas de caja menor en el día
  const dayExpenses = expenses.filter(
    (e) => e.date === targetDate && e.paymentMethod === 'cash'
  );
  const pettyCashOutflows = round2(
    dayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  );

  salesCash = round2(salesCash);
  salesYappy = round2(salesYappy);
  salesACH = round2(salesACH);
  salesCards = round2(salesCards);
  salesCheck = round2(salesCheck);
  salesCredit = round2(salesCredit);

  const totalInflows = round2(salesCash + salesYappy + salesACH + salesCards + salesCheck + salesCredit);
  const expectedCashInDrawer = round2(openingFund + salesCash - pettyCashOutflows);
  const difference = round2(countedCashInDrawer - expectedCashInDrawer);

  return {
    date: targetDate,
    cashierName: cashierName || 'Cajero de Turno',
    openingCashFund: round2(openingFund),
    salesCash,
    salesYappy,
    salesACH,
    salesCards,
    salesCheck,
    salesCredit,
    totalInflows,
    pettyCashOutflows,
    expectedCashInDrawer,
    countedCashInDrawer: round2(countedCashInDrawer),
    difference,
    isBalanced: Math.abs(difference) < 0.05,
  };
}

/** Genera y descarga archivo CSV estructurado para importación contable (Peachtree, QuickBooks, etc.) */
export function exportToAccountingCSV(
  arg1?: any,
  arg2?: any,
  arg3?: any,
  arg4?: any
): string {
  const entries: JournalEntry[] = Array.isArray(arg1) ? arg1 : (Array.isArray(arg4) ? arg4 : []);
  const headers = ['Fecha', 'Asiento', 'Referencia', 'Cuenta Contable', 'Nombre Cuenta', 'Concepto', 'Debe ($)', 'Haber ($)'];
  const rows: string[] = [headers.join(',')];

  entries.forEach((e) => {
    e.lines.forEach((l) => {
      rows.push([
        e.date,
        `"${e.code}"`,
        `"${e.reference.replace(/"/g, '""')}"`,
        `"${l.accountCode}"`,
        `"${l.accountName.replace(/"/g, '""')}"`,
        `"${e.concept.replace(/"/g, '""')}"`,
        l.debit.toFixed(2),
        l.credit.toFixed(2),
      ].join(','));
    });
  });

  const csvContent = rows.join('\r\n');

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Libro_Diario_Contable_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return csvContent;
}
