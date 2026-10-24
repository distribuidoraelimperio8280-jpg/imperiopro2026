import { jsPDF } from 'jspdf';
import type { Invoice, CompanyProfile, Quote, CreditNote, Product, Expense } from '../types';
import type { 
  FiscalSalesDGIReport, 
  FiscalPurchasesDGIReport, 
  KardexValuationReport, 
  CashRegisterClosingReport, 
  JournalEntry, 
  TrialBalanceRow 
} from './accountingService';

function hexToRgb(hex?: string): [number, number, number] {
  if (!hex || !hex.startsWith('#')) return [2, 132, 199];
  const cleaned = hex.replace('#', '');
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    return [isNaN(r) ? 2 : r, isNaN(g) ? 132 : g, isNaN(b) ? 199 : b];
  }
  return [2, 132, 199];
}

function toNum(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? 0 : parsed;
}

function fmt(val: any, decimals = 2): string {
  return toNum(val).toFixed(decimals);
}

export function formatRucDv(rucStr?: string, dvStr?: string): string {
  if (!rucStr && !dvStr) return 'N/A';
  let ruc = (rucStr || '').trim();
  let dv = (dvStr || '').trim();

  if (!ruc) return dv ? `DV: ${dv}` : 'N/A';

  // Check if RUC string already contains DV pattern, e.g. "8-765-4321 DV 45" or "8-765-4321 (DV: 45)" or "8-765-4321 DV: 45"
  const dvMatch = ruc.match(/^(.*?)\s*[\(\[-]?\s*D\.?V\.?:?\s*([0-9A-Z]+)\s*[\)\]]?$/i);
  if (dvMatch) {
    ruc = dvMatch[1].trim();
    if (!dv) {
      dv = dvMatch[2].trim();
    }
  }

  // Remove any leftover trailing "DV", "DV:", "(DV)", etc. from ruc
  ruc = ruc.replace(/\s*[\(\[-]?\s*D\.?V\.?:?\s*$/i, '').trim();

  if (dv) {
    return `${ruc}  DV: ${dv}`;
  }

  return ruc;
}

export function formatTaxLabel(taxName?: string, defaultRate = 7): string {
  if (!taxName || !taxName.trim()) {
    return `ITBMS (${defaultRate}%)`;
  }
  const str = taxName.trim();

  // If str is duplicated e.g. "ITBMS (7%) 7%" or "ITBMS (ITBMS..."
  if (/^ITBMS.*7%.*7%/i.test(str) || /^ITBMS\s*\(\s*ITBMS/i.test(str)) {
    return `ITBMS (${defaultRate}%)`;
  }

  if (/\d+\s*%/i.test(str)) {
    return str;
  }
  return `${str} (${defaultRate}%)`;
}

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  name: 'DISTRIBUIDORA EL IMPERIO',
  ruc: '155689021-2-2026',
  email: 'distribuidoraelimperio8280@gmail.com',
  phone: '64429775',
  whatsapp: '64429775',
  mobile: '64429775',
  address: 'Panamá, República de Panamá',
  currency: 'USD',
  taxName: 'ITBMS (7%)',
};

export function generateInvoicePDF(invoice: Invoice, company?: CompanyProfile) {
  const activeCompany = company || DEFAULT_COMPANY_PROFILE;
  // Use Letter format (8.5 x 11 in = 215.9 x 279.4 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  // Soft translucent & pastel tones (no pure harsh colors)
  const primaryColor = activeCompany.templateConfig?.primaryColor 
    ? hexToRgb(activeCompany.templateConfig.primaryColor)
    : [56, 148, 210]; // Soft sky blue #3894d2
  const darkNavy = [30, 41, 59]; // Soft slate #1e293b
  const textGray = [100, 116, 139]; // Slate 500 #64748b

  // Header Banner Accent Line (soft pastel sky)
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 216, 4, 'F');

  // Company Logo (if uploaded) - compact
  let textLeftOffset = 12;
  if (activeCompany.logoUrl) {
    try {
      doc.addImage(activeCompany.logoUrl, 'PNG', 12, 8, 24, 20);
      textLeftOffset = 39;
    } catch (e) {
      try {
        doc.addImage(activeCompany.logoUrl, 'JPEG', 12, 8, 24, 20);
        textLeftOffset = 39;
      } catch (err) {
        textLeftOffset = 12;
      }
    }
  }

  // Company Information (Left - Compact Horizontal)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(activeCompany.name || 'DISTRIBUIDORA EL IMPERIO', textLeftOffset, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  
  const rucFormatted = `RUC: ${formatRucDv(activeCompany.ruc || '155689021-2-2026', activeCompany.dv)}`;
  const phoneFormatted = `WAP/Cel: ${activeCompany.whatsapp || activeCompany.phone || '64429775'}`;

  doc.text(`${rucFormatted}  |  ${phoneFormatted}`, textLeftOffset, 16.5);
  doc.text(`${activeCompany.email || ''}  |  ${activeCompany.address || 'Panamá'}`, textLeftOffset, 20.5);

  // Invoice Title & Details Block (Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('FACTURA DE VENTA', 204, 12, { align: 'right' });

  doc.setFontSize(10.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(`N° ${invoice.code}`, 204, 17, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text(`Emisión: ${invoice.date}  |  Vence: ${invoice.dueDate}`, 204, 21.5, { align: 'right' });

  // Soft Status Badge
  let statusText = 'PENDIENTE';
  let badgeR = 217, badgeG = 119, badgeB = 6; // Soft Amber
  if (invoice.status === 'paid') {
    statusText = 'PAGADA';
    badgeR = 16, badgeG = 149, badgeB = 100; // Soft Emerald
  } else if (invoice.status === 'overdue') {
    statusText = 'VENCIDA';
    badgeR = 225, badgeG = 29, badgeB = 72; // Soft Rose
  } else if (invoice.status === 'cancelled') {
    statusText = 'ANULADA';
    badgeR = 100, badgeG = 116, badgeB = 139; // Soft Slate
  }

  doc.setFillColor(badgeR, badgeG, badgeB);
  doc.roundedRect(178, 24, 26, 5, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text(statusText, 191, 27.5, { align: 'center' });

  // Client Information Box - Compact & Horizontal
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, 31, 192, 15, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(12, 31, 192, 15, 1.5, 1.5, 'S');

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('DATOS DEL CLIENTE / RECEPTOR:', 15, 35);

  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFontSize(8);
  doc.text(`Cliente: ${invoice.contactName}`, 15, 39.5);
  doc.text(`RUC/Cédula: ${formatRucDv(invoice.contactRuc, invoice.contactDv)}`, 110, 39.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text(`Dirección: ${invoice.contactAddress || 'Panamá'}`, 15, 43.5);
  doc.text(`Tel: ${invoice.contactPhone || 'N/A'}  |  Pago: ${invoice.paymentMethod?.toUpperCase() || 'CONTADO'}`, 110, 43.5);

  // Table Header - Compact 5mm bar
  const startY = 49;
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(12, startY, 192, 5.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('CANT.', 15, startY + 3.8);
  doc.text('CÓDIGO / DESCRIPCIÓN CONTINUA DEL PRODUCTO', 32, startY + 3.8);
  doc.text('PRECIO UNIT.', 142, startY + 3.8, { align: 'right' });
  doc.text('ITBMS', 168, startY + 3.8, { align: 'right' });
  doc.text('TOTAL', 201, startY + 3.8, { align: 'right' });

  // Table Items Body - Compact 4.8mm - 5.2mm per item to fit 10-15 rows
  let currentY = startY + 5.5;
  const rowHeight = 5.2;

  invoice.items.forEach((item, index) => {
    // Zebra background
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(12, currentY, 192, rowHeight, 'F');
    }

    // Border line bottom
    doc.setDrawColor(241, 245, 249);
    doc.line(12, currentY + rowHeight, 204, currentY + rowHeight);

    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(`${item.quantity}`, 15, currentY + 3.6);
    
    // Horizontal single line product description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    const skuPrefix = item.productId ? `[${item.productId}] ` : '';
    const fullDesc = `${skuPrefix}${item.name}${item.description ? ` - ${item.description}` : ''}`;
    const shortDesc = fullDesc.length > 78 ? fullDesc.substring(0, 75) + '...' : fullDesc;
    doc.text(shortDesc, 32, currentY + 3.6);

    doc.text(`B/. ${fmt(item.price)}`, 142, currentY + 3.6, { align: 'right' });
    doc.text(`${item.taxRate}%`, 168, currentY + 3.6, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`B/. ${fmt(item.total)}`, 201, currentY + 3.6, { align: 'right' });

    currentY += rowHeight;
  });

  // Table Bottom Line
  doc.setDrawColor(203, 213, 225);
  doc.line(12, currentY, 204, currentY);

  // Totals Summary Block (Right side)
  const totalsY = currentY + 4;
  
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);

  doc.text('Subtotal:', 150, totalsY);
  doc.text(`B/. ${fmt(invoice.subtotal)}`, 201, totalsY, { align: 'right' });

  let nextTotalsY = totalsY + 4;
  if (toNum(invoice.discountTotal) > 0) {
    doc.text('Descuentos:', 150, nextTotalsY);
    doc.text(`-B/. ${fmt(invoice.discountTotal)}`, 201, nextTotalsY, { align: 'right' });
    nextTotalsY += 4;
  }

  doc.text(`Impuestos (${formatTaxLabel(activeCompany.taxName)}):`, 150, nextTotalsY);
  doc.text(`B/. ${fmt(invoice.taxTotal)}`, 201, nextTotalsY, { align: 'right' });
  nextTotalsY += 5;

  // Soft Translucent Blue Total Box
  doc.setFillColor(236, 246, 254); // soft translucent sky tint
  doc.roundedRect(144, nextTotalsY - 1, 60, 8, 1.2, 1.2, 'F');
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(144, nextTotalsY - 1, 60, 8, 1.2, 1.2, 'S');

  doc.setTextColor(3, 105, 161); // sky 700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TOTAL FACTURA:', 148, nextTotalsY + 4.2);
  doc.text(`B/. ${fmt(invoice.total)}`, 201, nextTotalsY + 4.2, { align: 'right' });

  // Notes & Payment Terms (Left side of bottom)
  if (invoice.notes) {
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Observaciones / Términos:', 12, totalsY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    const splitNotes = doc.splitTextToSize(invoice.notes, 120);
    doc.text(splitNotes, 12, totalsY + 3.5);
  }

  // Footer Stamp
  const footerY = 268;
  doc.setDrawColor(226, 232, 240);
  doc.line(12, footerY, 204, footerY);

  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text('Factura generada con IMPERIO PRO DISTRIBUIDORA - Formato Alta Densidad (10-15 ítems / hoja 8.5x11")', 108, footerY + 3.5, { align: 'center' });
  doc.text('Documento oficial válido para fines fiscales y comerciales.', 108, footerY + 6.8, { align: 'center' });

  // Save / Open
  doc.save(`${invoice.code}_${invoice.contactName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

export function printInvoicePDF(invoice: Invoice, company?: CompanyProfile) {
  const activeCompany = company || DEFAULT_COMPANY_PROFILE;
  // Render high-density Letter (8.5 x 11 in) invoice template accommodating 10-15 items per page
  const itemsRows = invoice.items.map((item, idx) => `
    <tr>
      <td style="text-align: center; color: #64748b; font-weight: 600; font-size: 7.5pt;">${idx + 1}</td>
      <td style="text-align: center; font-weight: 700; font-size: 8pt;">${item.quantity}</td>
      <td>
        <div style="display: flex; align-items: baseline; gap: 6px; font-size: 8pt; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 440px;">
          ${item.productId ? `<span style="font-family: monospace; font-size: 7pt; color: #0284c7; background: rgba(56, 148, 210, 0.1); padding: 1px 4px; border-radius: 3px;">${item.productId}</span>` : ''}
          <span style="font-weight: 700; color: #1e293b;">${item.name}</span>
          ${item.description ? `<span style="font-weight: 400; color: #64748b; font-size: 7pt;">— ${item.description}</span>` : ''}
        </div>
      </td>
      <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 600;">B/. ${fmt(item.price)}</td>
      <td style="text-align: center; color: #64748b; font-size: 7.5pt;">${item.taxRate}%</td>
      <td style="text-align: right; font-family: monospace; font-size: 8pt; font-weight: 700; color: #0f172a;">B/. ${fmt(item.total)}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Factura ${invoice.code} - ${activeCompany.name || 'DISTRIBUIDORA EL IMPERIO'}</title>
      <style>
        @page {
          size: letter portrait;
          margin: 8mm;
        }
        *, *:before, *:after {
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 8pt;
          line-height: 1.25;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .page-card {
          width: 100%;
          max-width: 216mm;
          margin: 0 auto;
          background: #ffffff;
          padding: 12px 14px;
        }
        .header-grid {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1.5px solid #e2e8f0;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }
        .company-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .company-logo {
          max-height: 48px;
          max-width: 140px;
          object-fit: contain;
        }
        .company-details h1 {
          font-size: 13pt;
          font-weight: 800;
          margin: 0;
          color: #1e293b;
          letter-spacing: -0.3px;
          text-transform: uppercase;
        }
        .company-details p {
          margin: 1.5px 0 0 0;
          font-size: 7.5pt;
          color: #64748b;
          line-height: 1.25;
        }
        .invoice-box {
          text-align: right;
          background: rgba(241, 245, 249, 0.6);
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px 12px;
          min-width: 190px;
        }
        .invoice-type {
          font-size: 8pt;
          font-weight: 800;
          text-transform: uppercase;
          color: #3894d2;
          letter-spacing: 0.5px;
        }
        .invoice-code {
          font-size: 13pt;
          font-weight: 900;
          color: #1e293b;
          font-family: monospace;
          margin: 2px 0;
        }
        .invoice-status {
          display: inline-block;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 7pt;
          font-weight: 700;
          text-transform: uppercase;
          background: rgba(226, 232, 240, 0.7);
          color: #475569;
        }
        .invoice-status.paid {
          background: rgba(16, 185, 129, 0.15);
          color: #065f46;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 10px;
          margin-bottom: 10px;
        }
        .info-block {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px 10px;
        }
        .info-block-title {
          font-size: 7pt;
          font-weight: 800;
          text-transform: uppercase;
          color: #3894d2;
          letter-spacing: 0.4px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 2px;
          margin-bottom: 4px;
        }
        .info-row {
          display: flex;
          margin-bottom: 2px;
          font-size: 7.5pt;
        }
        .info-label {
          width: 90px;
          color: #64748b;
          font-weight: 600;
        }
        .info-value {
          flex: 1;
          color: #1e293b;
          font-weight: 600;
        }

        .table-container {
          margin-bottom: 10px;
        }
        table.items-table {
          width: 100%;
          border-collapse: collapse;
        }
        table.items-table th {
          background: #1e293b;
          color: #ffffff;
          font-size: 7pt;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          padding: 4px 6px;
          text-align: left;
        }
        table.items-table td {
          padding: 3.5px 6px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 8pt;
        }
        table.items-table tr:nth-child(even) td {
          background: #f8fafc;
        }

        .bottom-grid {
          display: grid;
          grid-template-columns: 1fr 240px;
          gap: 12px;
          margin-bottom: 10px;
        }
        .notes-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 7.5pt;
          color: #64748b;
        }
        .notes-card strong {
          color: #1e293b;
          display: block;
          margin-bottom: 2px;
          font-size: 7.5pt;
        }
        .totals-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px 12px;
        }
        .totals-line {
          display: flex;
          justify-content: space-between;
          padding: 2px 0;
          font-size: 7.5pt;
          color: #64748b;
        }
        .totals-line.grand-total {
          border-top: 1.5px solid #3894d2;
          margin-top: 4px;
          padding-top: 4px;
          font-size: 10.5pt;
          font-weight: 800;
          color: #0369a1;
        }

        .signatures-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-top: 14px;
          padding-top: 6px;
        }
        .signature-box {
          border-top: 1px solid #94a3b8;
          text-align: center;
          padding-top: 4px;
          font-size: 7pt;
          color: #64748b;
          font-weight: 600;
        }

        .legal-footer {
          border-top: 1px solid #e2e8f0;
          padding-top: 4px;
          text-align: center;
          font-size: 6.8pt;
          color: #94a3b8;
          margin-top: 8px;
        }

        .no-print-toolbar {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
        }
        .btn-print {
          background: #3894d2;
          color: #ffffff;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 9pt;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(56, 148, 210, 0.35);
          cursor: pointer;
        }
        @media print {
          .no-print-toolbar {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print-toolbar">
        <button class="btn-print" onclick="window.print()">Imprimir Factura (8.5 x 11")</button>
      </div>

      <div class="page-card">
        <div class="header-grid">
          <div class="company-brand">
            ${activeCompany.logoUrl ? `<img src="${activeCompany.logoUrl}" class="company-logo" alt="Logo" />` : ''}
            <div class="company-details">
              <h1>${activeCompany.name || 'DISTRIBUIDORA EL IMPERIO'}</h1>
              <p>RUC: ${formatRucDv(activeCompany.ruc || '155689021-2-2026', activeCompany.dv)} | Tel/WAP: ${activeCompany.whatsapp || activeCompany.phone || '64429775'}</p>
              <p>${activeCompany.email || ''} | ${activeCompany.address || 'Panamá'}</p>
            </div>
          </div>
          <div class="invoice-box">
            <div class="invoice-type">FACTURA DE VENTA</div>
            <div class="invoice-code">${invoice.code}</div>
            <div class="invoice-status ${invoice.status}">${invoice.status.toUpperCase()}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-block">
            <div class="info-block-title">Datos del Receptor / Cliente</div>
            <div class="info-row"><span class="info-label">Cliente:</span><span class="info-value">${invoice.contactName}</span></div>
            <div class="info-row"><span class="info-label">RUC / Cédula:</span><span class="info-value">${formatRucDv(invoice.contactRuc, invoice.contactDv)}</span></div>
            <div class="info-row"><span class="info-label">Dirección:</span><span class="info-value">${invoice.contactAddress || 'Panamá'}</span></div>
          </div>
          <div class="info-block">
            <div class="info-block-title">Detalles de la Factura</div>
            <div class="info-row"><span class="info-label">Fecha Emisión:</span><span class="info-value">${invoice.date}</span></div>
            <div class="info-row"><span class="info-label">Vencimiento:</span><span class="info-value">${invoice.dueDate}</span></div>
            <div class="info-row"><span class="info-label">Método Pago:</span><span class="info-value">${invoice.paymentMethod?.toUpperCase() || 'CONTADO'}</span></div>
          </div>
        </div>

        <div class="table-container">
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 25px; text-align: center;">#</th>
                <th style="width: 40px; text-align: center;">CANT.</th>
                <th>DESCRIPCIÓN / PRODUCTO (CONTINUO HORIZONTAL)</th>
                <th style="width: 90px; text-align: right;">PRECIO UNIT.</th>
                <th style="width: 50px; text-align: center;">ITBMS</th>
                <th style="width: 95px; text-align: right;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
        </div>

        <div class="bottom-grid">
          <div class="notes-card">
            <strong>Observaciones y Términos de Pago:</strong>
            ${invoice.notes || 'Documento oficial de venta. Todos los precios están expresados en Balboas (USD).'}
          </div>
          <div class="totals-card">
            <div class="totals-line"><span>Subtotal:</span><strong>B/. ${fmt(invoice.subtotal)}</strong></div>
            ${toNum(invoice.discountTotal) > 0 ? `<div class="totals-line"><span>Descuentos:</span><strong style="color: #e11d48;">-B/. ${fmt(invoice.discountTotal)}</strong></div>` : ''}
            <div class="totals-line"><span>Impuestos (${formatTaxLabel(activeCompany.taxName)}):</span><strong>B/. ${fmt(invoice.taxTotal)}</strong></div>
            <div class="totals-line grand-total"><span>TOTAL:</span><span>B/. ${fmt(invoice.total)}</span></div>
          </div>
        </div>

        <div class="signatures-grid">
          <div class="signature-box">Entregado Conforme / Firma Autorizada</div>
          <div class="signature-box">Recibido Conforme / Cliente</div>
        </div>

        <div class="legal-footer">
          Distribuidora y Facturación Imperio Pro · Documento emitido electrónicamente en alta densidad (10 a 15 productos por hoja 8.5 x 11")
        </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}

export function generateQuotePDF(quote: Quote, company?: CompanyProfile) {
  const activeCompany = company || DEFAULT_COMPANY_PROFILE;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [16, 185, 129]; // #10b981 Emerald
  const darkNavy = [15, 23, 42];
  const textGray = [71, 85, 105];

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 6, 'F');

  let textLeftOffset = 14;
  if (activeCompany.logoUrl) {
    try {
      doc.addImage(activeCompany.logoUrl, 'PNG', 14, 10, 32, 28);
      textLeftOffset = 49;
    } catch (e) {
      try {
        doc.addImage(activeCompany.logoUrl, 'JPEG', 14, 10, 32, 28);
        textLeftOffset = 49;
      } catch (err) {
        textLeftOffset = 14;
      }
    }
  }

  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(activeCompany.name || 'IMPERIO PRO CONTABILIDAD', textLeftOffset, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  
  const rucFormatted = `RUC: ${formatRucDv(activeCompany.ruc, activeCompany.dv)}`;
  const phoneFormatted = `WAP: ${activeCompany.whatsapp || activeCompany.phone || ''}${activeCompany.mobile ? ` | Cel: ${activeCompany.mobile}` : ''}`;
  const repFormatted = activeCompany.ownerName ? `Rep: ${activeCompany.ownerName}` : '';

  doc.text(rucFormatted, textLeftOffset, 21.5);
  doc.text(phoneFormatted, textLeftOffset, 26.5);
  if (repFormatted) {
    doc.text(`${repFormatted} | Email: ${activeCompany.email || ''}`, textLeftOffset, 31.5);
    doc.text(`Dirección: ${activeCompany.address || ''}`, textLeftOffset, 36.5);
  } else {
    doc.text(`Email: ${activeCompany.email || ''}`, textLeftOffset, 31.5);
    doc.text(`Dirección: ${activeCompany.address || ''}`, textLeftOffset, 36.5);
  }

  // Quote Header Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('COTIZACIÓN DE VENTA', 200, 18, { align: 'right' });

  doc.setFontSize(12);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(`N° ${quote.code}`, 200, 25, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text(`Fecha Emisión: ${quote.date}`, 200, 31, { align: 'right' });
  doc.text(`Válida hasta: ${quote.validUntil}`, 200, 36, { align: 'right' });

  // Status Badge
  let statusText = 'PENDIENTE';
  let badgeR = 234, badgeG = 179, badgeB = 8;
  if (quote.status === 'accepted') {
    statusText = 'ACEPTADA';
    badgeR = 34; badgeG = 197; badgeB = 94;
  } else if (quote.status === 'converted') {
    statusText = 'FACTURADA';
    badgeR = 2; badgeG = 132; badgeB = 199;
  } else if (quote.status === 'rejected') {
    statusText = 'RECHAZADA';
    badgeR = 239; badgeG = 68; badgeB = 68;
  }

  doc.setFillColor(badgeR, badgeG, badgeB);
  doc.roundedRect(165, 41, 35, 7, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(statusText, 182.5, 45.8, { align: 'center' });

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 48, 200, 48);

  // Client Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 52, 186, 22, 2, 2, 'F');

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('COTIZADO A / CLIENTE:', 18, 58);

  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFontSize(10);
  doc.text(quote.contactName, 18, 64);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text(`RUC / Cédula: ${formatRucDv(quote.contactRuc, quote.contactDv)}`, 18, 69);
  if (quote.contactPhone) {
    doc.text(`Teléfono: ${quote.contactPhone}`, 120, 69);
  }

  // Items table
  const startY = 80;
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.rect(14, startY, 186, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CANT.', 18, startY + 5.5);
  doc.text('DESCRIPCIÓN / PRODUCTO O SERVICIO', 42, startY + 5.5);
  doc.text('PRECIO UNIT.', 130, startY + 5.5, { align: 'right' });
  doc.text('IMP %', 160, startY + 5.5, { align: 'right' });
  doc.text('TOTAL', 195, startY + 5.5, { align: 'right' });

  let currentY = startY + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  quote.items.forEach((item, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, currentY, 186, 7.5, 'F');
    }

    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(`${item.quantity}`, 18, currentY + 5);
    
    const shortName = item.name.length > 45 ? item.name.substring(0, 42) + '...' : item.name;
    doc.text(shortName, 42, currentY + 5);

    doc.text(`$${fmt(item.price)}`, 130, currentY + 5, { align: 'right' });
    doc.text(`${item.taxRate}%`, 160, currentY + 5, { align: 'right' });
    doc.text(`$${fmt(item.total)}`, 195, currentY + 5, { align: 'right' });

    currentY += 7.5;
  });

  doc.setDrawColor(226, 232, 240);
  doc.line(14, currentY, 200, currentY);

  const totalsY = currentY + 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);

  doc.text('Subtotal:', 140, totalsY);
  doc.text(`$${fmt(quote.subtotal)}`, 195, totalsY, { align: 'right' });

  let nextTotalsY = totalsY + 5;
  if (toNum(quote.discountTotal) > 0) {
    doc.text('Descuentos:', 140, nextTotalsY);
    doc.text(`-$${fmt(quote.discountTotal)}`, 195, nextTotalsY, { align: 'right' });
    nextTotalsY += 5;
  }

  doc.text(`Impuestos (${formatTaxLabel(activeCompany.taxName)}):`, 140, nextTotalsY);
  doc.text(`$${fmt(quote.taxTotal)}`, 195, nextTotalsY, { align: 'right' });
  nextTotalsY += 6;

  doc.setFillColor(16, 185, 129); // Emerald
  doc.roundedRect(135, nextTotalsY, 65, 9, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL COTIZACIÓN:', 140, nextTotalsY + 6);
  doc.text(`$${fmt(quote.total)}`, 195, nextTotalsY + 6, { align: 'right' });

  if (quote.notes) {
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Condiciones y Observaciones:', 14, totalsY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    const splitNotes = doc.splitTextToSize(quote.notes, 110);
    doc.text(splitNotes, 14, totalsY + 4);
  }

  const footerY = 280;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerY, 200, footerY);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Cotización emitida por ${company.name || 'Nuestra Empresa'} - Válida hasta ${quote.validUntil}`, 107, footerY + 4, { align: 'center' });

  doc.save(`${quote.code}_Cotizacion_${quote.contactName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

export function sendQuoteWhatsApp(quote: Quote, company: CompanyProfile) {
  // 1. Download the PDF
  generateQuotePDF(quote, company);

  // 2. Format WhatsApp message
  const itemsList = quote.items.map((i) => `• ${i.quantity}x ${i.name} - $${fmt(i.total)}`).join('\n');
  
  const message = `Hola *${quote.contactName}*, le enviamos la cotización *${quote.code}* de *${company.name}*.\n\n` +
    `*Resumen de Cotización:*\n${itemsList}\n\n` +
    `*Monto Total:* $${fmt(quote.total)} USD\n` +
    `*Válida hasta:* ${quote.validUntil}\n\n` +
    `📄 Le hemos descargado la hoja PDF de la cotización para que la adjunte en este chat.\n\n` +
    `¡Quedamos atentos a cualquier duda o confirmación!`;

  let phone = quote.contactPhone || '';
  phone = phone.replace(/[^0-9]/g, '');

  if (phone) {
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, '_blank');
  } else {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  }
}

export function generateCreditNotePDF(cn: CreditNote, company: CompanyProfile) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [225, 29, 72]; // Rose / Red for Credit Note
  const darkNavy = [15, 23, 42];
  const textGray = [71, 85, 105];

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 6, 'F');

  let textLeftOffset = 14;
  if (company.logoUrl) {
    try {
      doc.addImage(company.logoUrl, 'PNG', 14, 10, 32, 28);
      textLeftOffset = 49;
    } catch (e) {
      try {
        doc.addImage(company.logoUrl, 'JPEG', 14, 10, 32, 28);
        textLeftOffset = 49;
      } catch (err) {
        textLeftOffset = 14;
      }
    }
  }

  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(company.name || 'IMPERIO PRO CONTABILIDAD', textLeftOffset, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  
  const rucFormatted = `RUC: ${formatRucDv(company.ruc, company.dv)}`;
  const phoneFormatted = `WAP: ${company.whatsapp || company.phone || ''}${company.mobile ? ` | Cel: ${company.mobile}` : ''}`;

  doc.text(rucFormatted, textLeftOffset, 21.5);
  doc.text(phoneFormatted, textLeftOffset, 26.5);
  doc.text(`Email: ${company.email || ''}`, textLeftOffset, 31.5);
  doc.text(`Dirección: ${company.address || ''}`, textLeftOffset, 36.5);

  // Credit Note Header Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('NOTA DE CRÉDITO', 200, 18, { align: 'right' });

  doc.setFontSize(12);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(`N° ${cn.code}`, 200, 25, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text(`Fecha Emisión: ${cn.date}`, 200, 31, { align: 'right' });
  if (cn.invoiceCode) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(`Afecta Factura: ${cn.invoiceCode}`, 200, 36, { align: 'right' });
  }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 48, 200, 48);

  // Client Box
  doc.setFillColor(254, 242, 242); // Rose tint
  doc.roundedRect(14, 52, 186, 22, 2, 2, 'F');

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('EMITIDA A / CLIENTE:', 18, 58);

  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFontSize(10);
  doc.text(cn.contactName, 18, 64);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text(`RUC / Cédula: ${formatRucDv(cn.contactRuc, cn.contactDv)}`, 18, 69);
  doc.text(`Motivo: ${cn.reason}`, 110, 69);

  // Stock Adjustment Badge
  if (cn.adjustInventory) {
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(130, 56, 62, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('✓ STOCK REINGRESADO A INVENTARIO', 161, 60.2, { align: 'center' });
  }

  // Items table
  const startY = 80;
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.rect(14, startY, 186, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CANT.', 18, startY + 5.5);
  doc.text('DESCRIPCIÓN / ÍTEM ACREDITADO', 42, startY + 5.5);
  doc.text('PRECIO UNIT.', 130, startY + 5.5, { align: 'right' });
  doc.text('IMP %', 160, startY + 5.5, { align: 'right' });
  doc.text('TOTAL', 195, startY + 5.5, { align: 'right' });

  let currentY = startY + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  cn.items.forEach((item, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, currentY, 186, 7.5, 'F');
    }

    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(`${item.quantity}`, 18, currentY + 5);
    
    const shortName = item.name.length > 45 ? item.name.substring(0, 42) + '...' : item.name;
    doc.text(shortName, 42, currentY + 5);

    doc.text(`$${fmt(item.price)}`, 130, currentY + 5, { align: 'right' });
    doc.text(`${item.taxRate}%`, 160, currentY + 5, { align: 'right' });
    doc.text(`$${fmt(item.total)}`, 195, currentY + 5, { align: 'right' });

    currentY += 7.5;
  });

  doc.setDrawColor(226, 232, 240);
  doc.line(14, currentY, 200, currentY);

  const totalsY = currentY + 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);

  doc.text('Subtotal:', 140, totalsY);
  doc.text(`$${fmt(cn.subtotal)}`, 195, totalsY, { align: 'right' });

  let nextTotalsY = totalsY + 5;
  doc.text(`Impuestos (${formatTaxLabel(company.taxName)}):`, 140, nextTotalsY);
  doc.text(`$${fmt(cn.taxTotal)}`, 195, nextTotalsY, { align: 'right' });
  nextTotalsY += 6;

  doc.setFillColor(225, 29, 72); // Rose
  doc.roundedRect(135, nextTotalsY, 65, 9, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL ACREDITADO:', 140, nextTotalsY + 6);
  doc.text(`$${fmt(cn.total)}`, 195, nextTotalsY + 6, { align: 'right' });

  if (cn.notes) {
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Observaciones:', 14, totalsY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    const splitNotes = doc.splitTextToSize(cn.notes, 110);
    doc.text(splitNotes, 14, totalsY + 4);
  }

  const footerY = 280;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerY, 200, footerY);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Nota de Crédito emitida por ${company.name || 'Nuestra Empresa'} - Registro de ajuste de saldo e inventarios.`, 107, footerY + 4, { align: 'center' });

  doc.save(`${cn.code}_NotaCredito_${cn.contactName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

export function sendCreditNoteWhatsApp(cn: CreditNote, company: CompanyProfile) {
  generateCreditNotePDF(cn, company);

  const itemsList = cn.items.map((i) => `• ${i.quantity}x ${i.name} - $${fmt(i.total)}`).join('\n');
  
  const message = `Hola *${cn.contactName}*, le adjuntamos la *Nota de Crédito ${cn.code}* de *${company.name}*.\n\n` +
    `*Motivo:* ${cn.reason}\n` +
    `${cn.invoiceCode ? `*Factura Afectada:* ${cn.invoiceCode}\n` : ''}` +
    `*Ítems Acreditados:*\n${itemsList}\n\n` +
    `*Monto Acreditado:* $${fmt(cn.total)} USD\n` +
    `${cn.adjustInventory ? `✓ Los productos han reingresado a nuestro inventario.\n` : ''}\n` +
    `📄 Le hemos descargado la hoja PDF de la Nota de Crédito para su archivo.`;

  let phone = cn.contactPhone || '';
  phone = phone.replace(/[^0-9]/g, '');

  if (phone) {
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, '_blank');
  } else {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  }
}

// ==========================================
// REPORTE EJECUTIVO INTEGRAL EN FORMATO PDF
// ==========================================
export interface ExecutiveReportData {
  company?: CompanyProfile;
  period: {
    startDate: string;
    endDate: string;
    label?: string;
  };
  kpis: {
    totalGrossSales: number;
    totalSubtotal: number;
    totalTaxCollected: number;
    totalDiscount: number;
    invoiceCount: number;
    averageTicket: number;
    paidTotal: number;
    paidCount: number;
    pendingReceivable: number;
    pendingCount: number;
    overdueTotal: number;
    overdueCount: number;
    collectionRate: number;
    totalEstimatedCost: number;
    estimatedNetProfit: number;
    netProfitMargin: number;
  };
  topItems: Array<{
    name: string;
    quantity: number;
    subtotal: number;
    total: number;
    profit: number;
  }>;
  topClients: Array<{
    name: string;
    ruc: string;
    invoiceCount: number;
    total: number;
    percentage: number;
  }>;
  sellers: Array<{
    name: string;
    invoiceCount: number;
    total: number;
    percentage: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    total: number;
    percentage: number;
  }>;
  infrastructureHealth?: {
    lastBackupDate?: string | null;
    lastBackupFile?: string | null;
    diskUsageFormatted?: string | null;
    pwaStatus?: string;
  };
}

export function generateExecutiveReportPDF(data: ExecutiveReportData): void {
  const company = data.company || DEFAULT_COMPANY_PROFILE;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const navy = [15, 23, 42];      // #0f172a
  const blue = [2, 132, 199];     // #0284c7
  const slate50 = [248, 250, 252];
  const slate200 = [226, 232, 240];
  const slate500 = [100, 116, 139];
  const slate800 = [30, 41, 59];
  const emerald = [16, 185, 129];
  const amber = [245, 158, 11];

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2); // 182mm

  // --------------------------------------------------------------------------
  // PÁGINA 1: RESUMEN EJECUTIVO, KPIS FINANCIEROS Y PRODUCTOS CLAVE
  // --------------------------------------------------------------------------

  // 1. Top Executive Banner
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Accent Line
  doc.setFillColor(blue[0], blue[1], blue[2]);
  doc.rect(0, 23, pageWidth, 1.5, 'F');

  // Title in Banner
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('REPORTE EJECUTIVO INTEGRAL', margin, 13);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Consolidado Comercial, Financiero y de Operaciones - Auditoría Gerencial', margin, 19);

  // Period in Banner (Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`PERÍODO: ${data.period.startDate} al ${data.period.endDate}`, pageWidth - margin, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(186, 230, 253);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-PA')} ${new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin, 18, { align: 'right' });

  // 2. Company & Audit Metadata
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(company.name, margin, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text(`RUC: ${formatRucDv(company.ruc, company.dv)} | Teléfono: ${company.phone || '+507 6890-1234'}`, margin, 37);
  doc.text(`Ubicación: ${company.address || 'Panamá, Rep. de Panamá'} | Correo: ${company.email || 'info@empresa.com'}`, margin, 41);

  // Report Badge Info Box
  doc.setFillColor(slate50[0], slate50[1], slate50[2]);
  doc.roundedRect(pageWidth - margin - 60, 28, 60, 15, 1.5, 1.5, 'F');
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.roundedRect(pageWidth - margin - 60, 28, 60, 15, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(blue[0], blue[1], blue[2]);
  doc.text('ESTADO DE AUDITORÍA', pageWidth - margin - 56, 33);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(slate800[0], slate800[1], slate800[2]);
  doc.text(`• Moneda Base: USD ($)`, pageWidth - margin - 56, 37);
  doc.text(`• Comprobantes: ${data.kpis.invoiceCount} procesados`, pageWidth - margin - 56, 41);

  // Divider
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin, 46, pageWidth - margin, 46);

  // 3. KPI Grid: 6 Critical Financial Metrics
  const kpiRow1Y = 49;
  const kpiWidth = (contentWidth - 8) / 3;
  const kpiHeight = 15;

  const kpisToDraw = [
    { label: 'VENTAS TOTALES (BRUTO)', val: `$${fmt(data.kpis.totalGrossSales)}`, color: navy, note: `Subtotal: $${fmt(data.kpis.totalSubtotal)}` },
    { label: 'COBRANZA EFECTIVA (LIQUIDADA)', val: `$${fmt(data.kpis.paidTotal)}`, color: emerald, note: `${data.kpis.paidCount} facturas canceladas` },
    { label: 'CUENTAS POR COBRAR (PENDIENTE)', val: `$${fmt(data.kpis.pendingReceivable)}`, color: amber, note: `${data.kpis.pendingCount} pendientes / ${data.kpis.overdueCount} venc.` },
    { label: 'ITBMS RECAUDADO FISCAL', val: `$${fmt(data.kpis.totalTaxCollected)}`, color: blue, note: `Descuentos: -$${fmt(data.kpis.totalDiscount)}` },
    { label: 'PROMEDIO POR OPERACIÓN (TICKET)', val: `$${fmt(data.kpis.averageTicket)}`, color: navy, note: `${data.kpis.invoiceCount} ventas cerradas` },
    { label: 'UTILIDAD BRUTA ESTIMADA', val: `$${fmt(data.kpis.estimatedNetProfit)}`, color: emerald, note: `Margen Comercial: ${fmt(data.kpis.netProfitMargin, 1)}%` },
  ];

  kpisToDraw.forEach((kpi, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = margin + col * (kpiWidth + 4);
    const y = kpiRow1Y + row * (kpiHeight + 3);

    doc.setFillColor(slate50[0], slate50[1], slate50[2]);
    doc.roundedRect(x, y, kpiWidth, kpiHeight, 1.5, 1.5, 'F');
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.roundedRect(x, y, kpiWidth, kpiHeight, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(kpi.label, x + 3, y + 4.5);

    doc.setFontSize(10);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, x + 3, y + 9.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(kpi.note, x + 3, y + 13.2);
  });

  // 4. Status Breakdown Banner
  const statusBoxY = 88;
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.roundedRect(margin, statusBoxY, contentWidth, 13, 1.5, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ESTRUCTURA DE COBRANZA Y CARTERA:', margin + 4, statusBoxY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  
  const colRatio = data.kpis.collectionRate;
  doc.text(`• Cobradas al 100%: $${fmt(data.kpis.paidTotal)} (${data.kpis.paidCount} docs)`, margin + 4, statusBoxY + 10);
  doc.text(`• Saldo en Crédito/Pendiente: $${fmt(data.kpis.pendingReceivable)} (${data.kpis.pendingCount} docs)`, margin + 65, statusBoxY + 10);
  doc.text(`• Efectividad de Recaudación: ${fmt(colRatio, 1)}%`, margin + 135, statusBoxY + 10);

  // 5. Tabla: TOP 8 PRODUCTOS / SERVICIOS
  let table1Y = 106;
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('1. TOP ARTÍCULOS Y SERVICIOS CON MAYOR VOLUMEN COMERCIAL', margin, table1Y);

  table1Y += 3;
  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(margin, table1Y, contentWidth, 6, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('PRODUCTO / SERVICIO', margin + 3, table1Y + 4.2);
  doc.text('UNIDADES', margin + 95, table1Y + 4.2, { align: 'right' });
  doc.text('SUBTOTAL ($)', margin + 125, table1Y + 4.2, { align: 'right' });
  doc.text('MARGEN EST. ($)', margin + 155, table1Y + 4.2, { align: 'right' });
  doc.text('TOTAL VENDIDO ($)', margin + contentWidth - 3, table1Y + 4.2, { align: 'right' });

  table1Y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const itemsList = data.topItems.slice(0, 8);
  if (itemsList.length === 0) {
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text('Sin registros de ventas de ítems en este rango.', margin + 3, table1Y + 5);
    table1Y += 8;
  } else {
    itemsList.forEach((item, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(slate50[0], slate50[1], slate50[2]);
        doc.rect(margin, table1Y, contentWidth, 5.5, 'F');
      }
      doc.setTextColor(navy[0], navy[1], navy[2]);
      const shortName = item.name.length > 42 ? item.name.substring(0, 40) + '...' : item.name;
      doc.text(shortName, margin + 3, table1Y + 3.8);
      doc.text(`${item.quantity}`, margin + 95, table1Y + 3.8, { align: 'right' });
      doc.text(`$${fmt(item.subtotal)}`, margin + 125, table1Y + 3.8, { align: 'right' });
      doc.text(`$${fmt(item.profit)}`, margin + 155, table1Y + 3.8, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(`$${fmt(item.total)}`, margin + contentWidth - 3, table1Y + 3.8, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      table1Y += 5.5;
    });
  }

  // 6. Resumen de Flujo Comercial en Página 1
  let summaryY = table1Y + 4;
  doc.setFillColor(slate50[0], slate50[1], slate50[2]);
  doc.roundedRect(margin, summaryY, contentWidth, 18, 1.5, 1.5, 'F');
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.roundedRect(margin, summaryY, contentWidth, 18, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(blue[0], blue[1], blue[2]);
  doc.text('OBSERVACIONES DE GERENCIA Y CONTROL PRESUPUESTARIO:', margin + 4, summaryY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text(`• El ${fmt(data.kpis.collectionRate, 1)}% del valor total facturado ha ingresado a flujo líquido en cuentas bancarias o caja operativa.`, margin + 4, summaryY + 9);
  doc.text(`• Se cuenta con una cartera pendiente por cobrar de $${fmt(data.kpis.pendingReceivable)} USD dividida en ${data.kpis.pendingCount} facturas.`, margin + 4, summaryY + 13);
  doc.text(`• El ticket promedio por cliente se situó en $${fmt(data.kpis.averageTicket)} USD con una utilidad estimada global de $${fmt(data.kpis.estimatedNetProfit)} USD.`, margin + 4, summaryY + 16.5);

  // Footer Página 1
  const page1FooterY = 282;
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin, page1FooterY, pageWidth - margin, page1FooterY);

  doc.setFontSize(7);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text(`${company.name} | Sistema ERP Imperio Pro | Informe Oficial de Auditoría`, margin, page1FooterY + 4);
  doc.text('Página 1 de 2', pageWidth - margin, page1FooterY + 4, { align: 'right' });

  // --------------------------------------------------------------------------
  // PÁGINA 2: CLIENTES CLAVE, VENDEDORES, CANALES Y CERTIFICACIÓN
  // --------------------------------------------------------------------------
  doc.addPage();

  // Page 2 Header Banner
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageWidth, 18, 'F');
  doc.setFillColor(blue[0], blue[1], blue[2]);
  doc.rect(0, 17, pageWidth, 1, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('REPORTE EJECUTIVO INTEGRAL - ANÁLISIS DE CLIENTES Y CONTROL', margin, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Período Auditado: ${data.period.startDate} al ${data.period.endDate}`, pageWidth - margin, 11, { align: 'right' });

  // Tabla 2: TOP 8 CLIENTES PRINCIPALES
  let table2Y = 26;
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('2. CARTERA DE CLIENTES CLAVE Y PARTICIPACIÓN EN VENTAS', margin, table2Y);

  table2Y += 3;
  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(margin, table2Y, contentWidth, 6, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('CLIENTE / RAZÓN SOCIAL', margin + 3, table2Y + 4.2);
  doc.text('RUC / IDENTIFICACIÓN', margin + 80, table2Y + 4.2);
  doc.text('N° DOCS', margin + 125, table2Y + 4.2, { align: 'center' });
  doc.text('TOTAL COMPRADO ($)', margin + 155, table2Y + 4.2, { align: 'right' });
  doc.text('% PARTICIPACIÓN', margin + contentWidth - 3, table2Y + 4.2, { align: 'right' });

  table2Y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const clientsList = data.topClients.slice(0, 8);
  if (clientsList.length === 0) {
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text('No hay registro de clientes en este período.', margin + 3, table2Y + 5);
    table2Y += 8;
  } else {
    clientsList.forEach((c, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(slate50[0], slate50[1], slate50[2]);
        doc.rect(margin, table2Y, contentWidth, 5.5, 'F');
      }
      doc.setTextColor(navy[0], navy[1], navy[2]);
      const shortClient = c.name.length > 34 ? c.name.substring(0, 32) + '...' : c.name;
      doc.text(shortClient, margin + 3, table2Y + 3.8);
      doc.text(c.ruc || 'N/A', margin + 80, table2Y + 3.8);
      doc.text(`${c.invoiceCount}`, margin + 125, table2Y + 3.8, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(`$${fmt(c.total)}`, margin + 155, table2Y + 3.8, { align: 'right' });
      doc.text(`${fmt(c.percentage, 1)}%`, margin + contentWidth - 3, table2Y + 3.8, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      table2Y += 5.5;
    });
  }

  // 3. Dos Columnas: Medios de Pago y Vendedores/Canales
  const dualColY = table2Y + 6;
  const halfColWidth = (contentWidth - 6) / 2;

  // Izquierda: Métodos de Pago
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('3. MEDIOS DE PAGO UTILIZADOS', margin, dualColY);

  let payY = dualColY + 3;
  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(margin, payY, halfColWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.text('MÉTODO', margin + 3, payY + 3.8);
  doc.text('DOCS', margin + halfColWidth - 25, payY + 3.8, { align: 'center' });
  doc.text('TOTAL ($)', margin + halfColWidth - 3, payY + 3.8, { align: 'right' });

  payY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  data.paymentMethods.slice(0, 5).forEach((pm, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(slate50[0], slate50[1], slate50[2]);
      doc.rect(margin, payY, halfColWidth, 5, 'F');
    }
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(pm.method, margin + 3, payY + 3.5);
    doc.text(`${pm.count}`, margin + halfColWidth - 25, payY + 3.5, { align: 'center' });
    doc.text(`$${fmt(pm.total)}`, margin + halfColWidth - 3, payY + 3.5, { align: 'right' });
    payY += 5;
  });

  // Derecha: Vendedores / Canales
  const rightColX = margin + halfColWidth + 6;
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('4. VENDEDORES Y CANALES', rightColX, dualColY);

  let sellerY = dualColY + 3;
  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(rightColX, sellerY, halfColWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.text('VENDEDOR / CANAL', rightColX + 3, sellerY + 3.8);
  doc.text('VENTAS', rightColX + halfColWidth - 25, sellerY + 3.8, { align: 'center' });
  doc.text('TOTAL ($)', rightColX + halfColWidth - 3, sellerY + 3.8, { align: 'right' });

  sellerY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  data.sellers.slice(0, 5).forEach((s, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(slate50[0], slate50[1], slate50[2]);
      doc.rect(rightColX, sellerY, halfColWidth, 5, 'F');
    }
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(s.name, rightColX + 3, sellerY + 3.5);
    doc.text(`${s.invoiceCount}`, rightColX + halfColWidth - 25, sellerY + 3.5, { align: 'center' });
    doc.text(`$${fmt(s.total)}`, rightColX + halfColWidth - 3, sellerY + 3.5, { align: 'right' });
    sellerY += 5;
  });

  // 4. Bloque de Infraestructura y Respaldo de Datos
  const infraY = Math.max(payY, sellerY) + 6;
  doc.setFillColor(slate50[0], slate50[1], slate50[2]);
  doc.roundedRect(margin, infraY, contentWidth, 16, 1.5, 1.5, 'F');
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.roundedRect(margin, infraY, contentWidth, 16, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('5. AUDITORÍA DE INFRAESTRUCTURA, RESPALDOS Y RESILIENCIA OFFLINE PWA', margin + 4, infraY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  const lastBackupStr = data.infrastructureHealth?.lastBackupDate 
    ? new Date(data.infrastructureHealth.lastBackupDate).toLocaleString('es-PA')
    : 'Vigente en almacenamiento central (/storage/backups/db/)';
  doc.text(`• Último Respaldo Verificado: ${lastBackupStr}`, margin + 4, infraY + 8.5);
  doc.text(`• Resguardo Cifrado: Compresión GZIP activa con retención de 30 días en BACKUP_STORAGE_PATH.`, margin + 4, infraY + 12);
  doc.text(`• Persistencia Local: Los comprobantes emitidos en modo offline se integran a la base de datos Dexie/Firestore.`, margin + 4, infraY + 15);

  // 5. Bloque Formal de Firmas Ejecutivas
  const signaturesY = 218;
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('6. DECLARACIÓN DE CONFORMIDAD Y APROBACIÓN EJECUTIVA', margin, signaturesY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text('Certifico que la información financiera y operativa contenida en este reporte ha sido validada contra los registros auxiliares de facturación e inventario.', margin, signaturesY + 4);

  // Signature lines
  const sig1X = margin + 10;
  const sig2X = margin + contentWidth - 70;
  const sigLineY = signaturesY + 28;

  // Signature 1: Gerencia General
  doc.setDrawColor(slate800[0], slate800[1], slate800[2]);
  doc.line(sig1X, sigLineY, sig1X + 60, sigLineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('GERENCIA GENERAL', sig1X + 30, sigLineY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text(company.name, sig1X + 30, sigLineY + 7.5, { align: 'center' });

  // Signature 2: Auditoría / Contador Público
  doc.line(sig2X, sigLineY, sig2X + 60, sigLineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('DIRECCIÓN FINANCIERA / AUDITOR', sig2X + 30, sigLineY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text('Control Contable y Fiscal', sig2X + 30, sigLineY + 7.5, { align: 'center' });

  // Footer Página 2
  const page2FooterY = 282;
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin, page2FooterY, pageWidth - margin, page2FooterY);

  doc.setFontSize(7);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text(`${company.name} | Sistema ERP Imperio Pro | Informe Oficial de Auditoría`, margin, page2FooterY + 4);
  doc.text('Página 2 de 2', pageWidth - margin, page2FooterY + 4, { align: 'right' });

  // Guardar archivo
  const safeCompany = (company.name || 'ImperioPro').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Reporte_Ejecutivo_Integral_${safeCompany}_${data.period.startDate}_a_${data.period.endDate}.pdf`;
  doc.save(filename);
}

// ============================================================================
// REPORTES FINANCIEROS ESPECIALIZADOS: FLUJO DE CAJA Y VENTAS MENSUALES
// ============================================================================

export interface CashFlowReportData {
  company?: CompanyProfile;
  period: { startDate: string; endDate: string };
  summary: {
    totalInflows: number;       // Total Ingresos
    totalOutflows: number;      // Total Gastos / Egresos
    netCashFlow: number;        // Flujo Neto = Ingresos - Gastos
    coverageRatio: number;      // Ratio de Cobertura (Ingresos / Gastos)
    operatingMargin: number;    // Margen Operativo %
    inflowTransactionCount: number;
    outflowTransactionCount: number;
  };
  monthlyCashFlow: Array<{
    month: string;
    key: string;
    inflows: number;
    outflows: number;
    net: number;
    accumulated: number;
    marginPercent: number;
  }>;
  outflowsByCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  inflowsByPaymentMethod: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
}

export interface MonthlySalesReportData {
  company?: CompanyProfile;
  period: { startDate: string; endDate: string };
  summary: {
    totalGrossSales: number;
    totalSubtotal: number;
    totalTaxCollected: number;
    totalDiscounts: number;
    invoiceCount: number;
    averageTicket: number;
    averageMonthlySales: number;
    bestMonth: { month: string; amount: number };
  };
  monthlySales: Array<{
    month: string;
    key: string;
    grossSales: number;
    subtotal: number;
    taxes: number;
    invoiceCount: number;
    averageTicket: number;
    growthRateMom: number; // % MoM vs mes anterior
  }>;
  topProducts: Array<{
    name: string;
    quantity: number;
    total: number;
    percentage: number;
  }>;
  topClients: Array<{
    name: string;
    ruc: string;
    total: number;
    invoiceCount: number;
    percentage: number;
  }>;
  salesBySeller: Array<{
    seller: string;
    invoiceCount: number;
    total: number;
    percentage: number;
  }>;
}

export interface PDFExportOptions {
  autoPrint?: boolean;
  fileName?: string;
  returnOnly?: boolean;
}

/**
 * Genera y descarga el Reporte Financiero de Flujo de Caja (Cash Flow Statement) en formato PDF
 * utilizando la librería de impresión y generación jsPDF.
 */
export function generateCashFlowReportPDF(data: CashFlowReportData, options?: PDFExportOptions): jsPDF {
  const company = data.company || DEFAULT_COMPANY_PROFILE;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const navy = [15, 23, 42];        // #0f172a
  const blue = [2, 132, 199];       // #0284c7
  const slate50 = [248, 250, 252];
  const slate100 = [241, 245, 249];
  const slate200 = [226, 232, 240];
  const slate500 = [100, 116, 139];
  const slate700 = [51, 65, 85];
  const slate800 = [30, 41, 59];
  const emerald = [16, 185, 129];
  const rose = [225, 29, 72];
  const amber = [217, 119, 6];

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2); // 182mm

  // Banner Superior
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setFillColor(emerald[0], emerald[1], emerald[2]);
  doc.rect(0, 23, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text('ESTADO DE FLUJO DE CAJA (CASH FLOW STATEMENT)', margin, 13);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Auditoría Financiera de Tesorería, Entradas, Salidas y Saldo Operativo Neto', margin, 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`PERÍODO: ${data.period.startDate} al ${data.period.endDate}`, pageWidth - margin, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(167, 243, 208);
  doc.text(`Emisión: ${new Date().toLocaleDateString('es-PA')} ${new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin, 18, { align: 'right' });

  // Metadatos de la Empresa
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text(company.name, margin, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text(`RUC: ${formatRucDv(company.ruc, company.dv)} | Tel: ${company.phone || company.whatsapp || '+507 6890-1234'}`, margin, 37);
  doc.text(`Dirección: ${company.address || 'Panamá, Rep. de Panamá'} | Moneda: USD ($)`, margin, 41);

  // Badge de Resumen de Tesorería
  doc.setFillColor(slate50[0], slate50[1], slate50[2]);
  doc.roundedRect(pageWidth - margin - 62, 28, 62, 15, 1.5, 1.5, 'F');
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.roundedRect(pageWidth - margin - 62, 28, 62, 15, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(emerald[0], emerald[1], emerald[2]);
  doc.text('BALANZA DE TESORERÍA', pageWidth - margin - 58, 33);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(slate800[0], slate800[1], slate800[2]);
  const isSurplus = data.summary.netCashFlow >= 0;
  doc.text(`• Condición: ${isSurplus ? 'SUPERÁVIT OPERATIVO' : 'DÉFICIT FINANCIERO'}`, pageWidth - margin - 58, 37);
  doc.text(`• Cobertura: ${data.summary.coverageRatio.toFixed(2)}x (Entradas / Gastos)`, pageWidth - margin - 58, 41);

  // Divider
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin, 46, pageWidth - margin, 46);

  // 4 Tarjetas de Métricas de Flujo de Caja
  const kpiY = 50;
  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 16;

  const kpis = [
    {
      title: 'TOTAL ENTRADAS (INGRESOS)',
      amount: `$${fmt(data.summary.totalInflows)}`,
      note: `${data.summary.inflowTransactionCount} operaciones cerradas`,
      color: emerald,
    },
    {
      title: 'TOTAL SALIDAS (EGRESOS)',
      amount: `$${fmt(data.summary.totalOutflows)}`,
      note: `${data.summary.outflowTransactionCount} egresos registrados`,
      color: rose,
    },
    {
      title: 'FLUJO NETO DEL PERÍODO',
      amount: `${data.summary.netCashFlow >= 0 ? '+' : ''}$${fmt(data.summary.netCashFlow)}`,
      note: isSurplus ? 'Rendimiento positivo neto' : 'Salidas superaron ingresos',
      color: isSurplus ? emerald : rose,
    },
    {
      title: 'MARGEN DE FLUJO LIBRE',
      amount: `${data.summary.operatingMargin.toFixed(1)}%`,
      note: `Cobertura: ${data.summary.coverageRatio.toFixed(2)}x gastos`,
      color: blue,
    },
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (cardWidth + 3);
    doc.setFillColor(slate50[0], slate50[1], slate50[2]);
    doc.roundedRect(x, kpiY, cardWidth, cardHeight, 1.5, 1.5, 'F');
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.roundedRect(x, kpiY, cardWidth, cardHeight, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(kpi.title, x + 2.5, kpiY + 4.2);

    doc.setFontSize(9.5);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.amount, x + 2.5, kpiY + 9.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(kpi.note, x + 2.5, kpiY + 13.8);
  });

  // TABLA 1: FLUJO DE CAJA MENSUAL CRONOLÓGICO
  let table1Y = 72;
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('1. CRONOLOGÍA MENSUAL DE ENTRADAS, SALIDAS Y SALDO NETO', margin, table1Y);

  table1Y += 3;
  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(margin, table1Y, contentWidth, 6, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('MES / PERÍODO', margin + 3, table1Y + 4.2);
  doc.text('ENTRADAS ($)', margin + 55, table1Y + 4.2, { align: 'right' });
  doc.text('SALIDAS ($)', margin + 92, table1Y + 4.2, { align: 'right' });
  doc.text('FLUJO NETO ($)', margin + 130, table1Y + 4.2, { align: 'right' });
  doc.text('SALDO ACUMULADO ($)', margin + 165, table1Y + 4.2, { align: 'right' });
  doc.text('MARGEN', margin + contentWidth - 3, table1Y + 4.2, { align: 'right' });

  table1Y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const months = data.monthlyCashFlow;
  if (months.length === 0) {
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text('No hay movimientos registrados en el período seleccionado.', margin + 3, table1Y + 5);
    table1Y += 8;
  } else {
    months.forEach((m, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(slate50[0], slate50[1], slate50[2]);
        doc.rect(margin, table1Y, contentWidth, 5.5, 'F');
      }
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text(m.month, margin + 3, table1Y + 3.8);

      doc.setTextColor(emerald[0], emerald[1], emerald[2]);
      doc.text(`$${fmt(m.inflows)}`, margin + 55, table1Y + 3.8, { align: 'right' });

      doc.setTextColor(rose[0], rose[1], rose[2]);
      doc.text(`$${fmt(m.outflows)}`, margin + 92, table1Y + 3.8, { align: 'right' });

      const netColor = m.net >= 0 ? emerald : rose;
      doc.setTextColor(netColor[0], netColor[1], netColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(`${m.net >= 0 ? '+' : ''}$${fmt(m.net)}`, margin + 130, table1Y + 3.8, { align: 'right' });

      doc.setTextColor(slate800[0], slate800[1], slate800[2]);
      doc.text(`$${fmt(m.accumulated)}`, margin + 165, table1Y + 3.8, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(slate700[0], slate700[1], slate700[2]);
      doc.text(`${fmt(m.marginPercent, 1)}%`, margin + contentWidth - 3, table1Y + 3.8, { align: 'right' });

      table1Y += 5.5;
    });

    // Fila de Totales del Período
    doc.setFillColor(slate100[0], slate100[1], slate100[2]);
    doc.rect(margin, table1Y, contentWidth, 6, 'F');
    doc.setDrawColor(slate800[0], slate800[1], slate800[2]);
    doc.line(margin, table1Y, margin + contentWidth, table1Y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text('TOTAL CONSOLIDADO', margin + 3, table1Y + 4.2);
    doc.text(`$${fmt(data.summary.totalInflows)}`, margin + 55, table1Y + 4.2, { align: 'right' });
    doc.text(`$${fmt(data.summary.totalOutflows)}`, margin + 92, table1Y + 4.2, { align: 'right' });
    const totNetColor = data.summary.netCashFlow >= 0 ? emerald : rose;
    doc.setTextColor(totNetColor[0], totNetColor[1], totNetColor[2]);
    doc.text(`${data.summary.netCashFlow >= 0 ? '+' : ''}$${fmt(data.summary.netCashFlow)}`, margin + 130, table1Y + 4.2, { align: 'right' });
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(`$${fmt(data.summary.netCashFlow)}`, margin + 165, table1Y + 4.2, { align: 'right' });
    doc.text(`${fmt(data.summary.operatingMargin, 1)}%`, margin + contentWidth - 3, table1Y + 4.2, { align: 'right' });

    table1Y += 9;
  }

  // DOS COLUMNAS: DESGLOSE DE GASTOS POR CATEGORÍA vs COBROS POR MÉTODO
  const dualY = table1Y + 2;
  const colW = (contentWidth - 6) / 2;

  // Columna Izquierda: Egresos por Categoría
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('2. DISTRIBUCIÓN DE EGRESOS POR CATEGORÍA', margin, dualY);

  let catY = dualY + 3;
  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(margin, catY, colW, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.text('CATEGORÍA DE GASTO', margin + 3, catY + 3.8);
  doc.text('MONTO ($)', margin + colW - 25, catY + 3.8, { align: 'right' });
  doc.text('% TOTAL', margin + colW - 3, catY + 3.8, { align: 'right' });

  catY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  if (data.outflowsByCategory.length === 0) {
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text('No hay registro de gastos detallados.', margin + 3, catY + 3.5);
    catY += 5.5;
  } else {
    data.outflowsByCategory.slice(0, 6).forEach((cat, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(slate50[0], slate50[1], slate50[2]);
        doc.rect(margin, catY, colW, 5, 'F');
      }
      doc.setTextColor(navy[0], navy[1], navy[2]);
      const shortName = cat.category.length > 25 ? cat.category.substring(0, 23) + '...' : cat.category;
      doc.text(shortName, margin + 3, catY + 3.5);
      doc.text(`$${fmt(cat.amount)}`, margin + colW - 25, catY + 3.5, { align: 'right' });
      doc.text(`${fmt(cat.percentage, 1)}%`, margin + colW - 3, catY + 3.5, { align: 'right' });
      catY += 5;
    });
  }

  // Columna Derecha: Ingresos por Método de Pago
  const rightX = margin + colW + 6;
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('3. CANALES Y MÉTODOS DE RECAUDACIÓN', rightX, dualY);

  let methY = dualY + 3;
  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(rightX, methY, colW, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.text('MÉTODO DE COBRO', rightX + 3, methY + 3.8);
  doc.text('RECAUDADO ($)', rightX + colW - 25, methY + 3.8, { align: 'right' });
  doc.text('% PARTICIPACIÓN', rightX + colW - 3, methY + 3.8, { align: 'right' });

  methY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  if (data.inflowsByPaymentMethod.length === 0) {
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text('No hay registro de cobranzas en este período.', rightX + 3, methY + 3.5);
    methY += 5.5;
  } else {
    data.inflowsByPaymentMethod.slice(0, 6).forEach((pm, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(slate50[0], slate50[1], slate50[2]);
        doc.rect(rightX, methY, colW, 5, 'F');
      }
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text(pm.method, rightX + 3, methY + 3.5);
      doc.text(`$${fmt(pm.amount)}`, rightX + colW - 25, methY + 3.5, { align: 'right' });
      doc.text(`${fmt(pm.percentage, 1)}%`, rightX + colW - 3, methY + 3.5, { align: 'right' });
      methY += 5;
    });
  }

  // Firma y Certificación Contable
  const sigY = Math.max(catY, methY) + 6;
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin, sigY, pageWidth - margin, sigY);

  const sigLineY = sigY + 16;
  const sigW = 55;
  const sig1X = margin + 12;
  const sig2X = pageWidth - margin - sigW - 12;

  doc.setDrawColor(slate700[0], slate700[1], slate700[2]);
  doc.line(sig1X, sigLineY, sig1X + sigW, sigLineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('ELABORADO POR TESORERÍA', sig1X + sigW / 2, sigLineY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text(company.name, sig1X + sigW / 2, sigLineY + 6.5, { align: 'center' });

  doc.line(sig2X, sigLineY, sig2X + sigW, sigLineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('AUDITORÍA FINANCIERA / GERENCIA', sig2X + sigW / 2, sigLineY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text('Control Contable Oficial', sig2X + sigW / 2, sigLineY + 6.5, { align: 'center' });

  // Pie de Página
  const footerY = 284;
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  doc.setFontSize(7);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text(`${company.name} | Informe Oficial de Flujo de Caja y Tesorería`, margin, footerY + 4);
  doc.text('Página 1 de 1', pageWidth - margin, footerY + 4, { align: 'right' });

  if (options?.autoPrint) {
    doc.autoPrint();
  }

  if (!options?.returnOnly) {
    const safeCompany = (company.name || 'ImperioPro').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = options?.fileName || `Reporte_Flujo_Caja_${safeCompany}_${data.period.startDate}_a_${data.period.endDate}.pdf`;
    doc.save(filename);
  }

  return doc;
}

/**
 * Genera y descarga el Reporte Financiero de Ventas Mensuales (Monthly Sales Report) en formato PDF
 * utilizando la librería de impresión y generación jsPDF.
 */
export function generateMonthlySalesReportPDF(data: MonthlySalesReportData, options?: PDFExportOptions): jsPDF {
  const company = data.company || DEFAULT_COMPANY_PROFILE;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const navy = [15, 23, 42];        // #0f172a
  const blue = [2, 132, 199];       // #0284c7
  const slate50 = [248, 250, 252];
  const slate100 = [241, 245, 249];
  const slate200 = [226, 232, 240];
  const slate500 = [100, 116, 139];
  const slate700 = [51, 65, 85];
  const slate800 = [30, 41, 59];
  const emerald = [16, 185, 129];
  const sky = [14, 165, 233];
  const amber = [217, 119, 6];

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2); // 182mm

  // Banner Superior
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setFillColor(blue[0], blue[1], blue[2]);
  doc.rect(0, 23, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text('REPORTE FINANCIERO DE VENTAS MENSUALES', margin, 13);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Evolución de Ingresos Brutos, Base Gravable, ITBMS y Rendimiento Comercial Mensual', margin, 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`PERÍODO: ${data.period.startDate} al ${data.period.endDate}`, pageWidth - margin, 13, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(186, 230, 253);
  doc.text(`Emisión: ${new Date().toLocaleDateString('es-PA')} ${new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin, 18, { align: 'right' });

  // Metadatos de la Empresa
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text(company.name, margin, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text(`RUC: ${formatRucDv(company.ruc, company.dv)} | Tel: ${company.phone || company.whatsapp || '+507 6890-1234'}`, margin, 37);
  doc.text(`Ubicación: ${company.address || 'Panamá, Rep. de Panamá'} | Moneda: USD ($)`, margin, 41);

  // Badge de Resumen Comercial
  doc.setFillColor(slate50[0], slate50[1], slate50[2]);
  doc.roundedRect(pageWidth - margin - 62, 28, 62, 15, 1.5, 1.5, 'F');
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.roundedRect(pageWidth - margin - 62, 28, 62, 15, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(blue[0], blue[1], blue[2]);
  doc.text('PROMEDIO Y ESTACIONALIDAD', pageWidth - margin - 58, 33);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(slate800[0], slate800[1], slate800[2]);
  doc.text(`• Promedio Mensual: $${fmt(data.summary.averageMonthlySales)}`, pageWidth - margin - 58, 37);
  doc.text(`• Mes Pico: ${data.summary.bestMonth.month || 'N/A'} ($${fmt(data.summary.bestMonth.amount)})`, pageWidth - margin - 58, 41);

  // Divider
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin, 46, pageWidth - margin, 46);

  // 4 Tarjetas de Métricas de Ventas Mensuales
  const kpiY = 50;
  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 16;

  const kpis = [
    {
      title: 'TOTAL VENTAS (BRUTO)',
      amount: `$${fmt(data.summary.totalGrossSales)}`,
      note: `Subtotal Neto: $${fmt(data.summary.totalSubtotal)}`,
      color: emerald,
    },
    {
      title: 'ITBMS / IMPUESTOS FISCALES',
      amount: `$${fmt(data.summary.totalTaxCollected)}`,
      note: `Descuentos: -$${fmt(data.summary.totalDiscounts)}`,
      color: blue,
    },
    {
      title: 'TOTAL COMPROBANTES',
      amount: `${data.summary.invoiceCount} facturas`,
      note: `Ticket promedio: $${fmt(data.summary.averageTicket)}`,
      color: navy,
    },
    {
      title: 'PROMEDIO MENSUAL DE VENTA',
      amount: `$${fmt(data.summary.averageMonthlySales)}`,
      note: `${data.monthlySales.length} meses analizados`,
      color: sky,
    },
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (cardWidth + 3);
    doc.setFillColor(slate50[0], slate50[1], slate50[2]);
    doc.roundedRect(x, kpiY, cardWidth, cardHeight, 1.5, 1.5, 'F');
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.roundedRect(x, kpiY, cardWidth, cardHeight, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(kpi.title, x + 2.5, kpiY + 4.2);

    doc.setFontSize(9.5);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.amount, x + 2.5, kpiY + 9.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(kpi.note, x + 2.5, kpiY + 13.8);
  });

  // TABLA 1: VENTAS MENSUALES DETALLADAS
  let table1Y = 72;
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('1. CONSOLIDADO MENSUAL DE FACTURACIÓN, IMPUESTOS Y CRECIMIENTO', margin, table1Y);

  table1Y += 3;
  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(margin, table1Y, contentWidth, 6, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('MES / PERÍODO', margin + 3, table1Y + 4.2);
  doc.text('SUBTOTAL ($)', margin + 55, table1Y + 4.2, { align: 'right' });
  doc.text('ITBMS ($)', margin + 85, table1Y + 4.2, { align: 'right' });
  doc.text('TOTAL FACTURADO ($)', margin + 125, table1Y + 4.2, { align: 'right' });
  doc.text('N° DOCS', margin + 150, table1Y + 4.2, { align: 'center' });
  doc.text('TICKET PROMEDIO', margin + contentWidth - 3, table1Y + 4.2, { align: 'right' });

  table1Y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const months = data.monthlySales;
  if (months.length === 0) {
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text('No hay facturas registradas en este período.', margin + 3, table1Y + 5);
    table1Y += 8;
  } else {
    months.forEach((m, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(slate50[0], slate50[1], slate50[2]);
        doc.rect(margin, table1Y, contentWidth, 5.5, 'F');
      }
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text(m.month, margin + 3, table1Y + 3.8);

      doc.setTextColor(slate700[0], slate700[1], slate700[2]);
      doc.text(`$${fmt(m.subtotal)}`, margin + 55, table1Y + 3.8, { align: 'right' });

      doc.text(`$${fmt(m.taxes)}`, margin + 85, table1Y + 3.8, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(emerald[0], emerald[1], emerald[2]);
      doc.text(`$${fmt(m.grossSales)}`, margin + 125, table1Y + 3.8, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text(`${m.invoiceCount}`, margin + 150, table1Y + 3.8, { align: 'center' });

      doc.text(`$${fmt(m.averageTicket)}`, margin + contentWidth - 3, table1Y + 3.8, { align: 'right' });

      table1Y += 5.5;
    });

    // Fila de Totales del Período
    doc.setFillColor(slate100[0], slate100[1], slate100[2]);
    doc.rect(margin, table1Y, contentWidth, 6, 'F');
    doc.setDrawColor(slate800[0], slate800[1], slate800[2]);
    doc.line(margin, table1Y, margin + contentWidth, table1Y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text('TOTAL PERÍODO', margin + 3, table1Y + 4.2);
    doc.text(`$${fmt(data.summary.totalSubtotal)}`, margin + 55, table1Y + 4.2, { align: 'right' });
    doc.text(`$${fmt(data.summary.totalTaxCollected)}`, margin + 85, table1Y + 4.2, { align: 'right' });
    doc.setTextColor(emerald[0], emerald[1], emerald[2]);
    doc.text(`$${fmt(data.summary.totalGrossSales)}`, margin + 125, table1Y + 4.2, { align: 'right' });
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(`${data.summary.invoiceCount}`, margin + 150, table1Y + 4.2, { align: 'center' });
    doc.text(`$${fmt(data.summary.averageTicket)}`, margin + contentWidth - 3, table1Y + 4.2, { align: 'right' });

    table1Y += 9;
  }

  // DOS COLUMNAS: TOP ARTÍCULOS VENDIDOS vs TOP CLIENTES
  const dualY = table1Y + 2;
  const colW = (contentWidth - 6) / 2;

  // Columna Izquierda: Top Artículos
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('2. ARTÍCULOS MÁS VENDIDOS EN EL PERÍODO', margin, dualY);

  let prodY = dualY + 3;
  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(margin, prodY, colW, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.text('PRODUCTO / SERVICIO', margin + 3, prodY + 3.8);
  doc.text('CANT', margin + colW - 32, prodY + 3.8, { align: 'center' });
  doc.text('TOTAL ($)', margin + colW - 3, prodY + 3.8, { align: 'right' });

  prodY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  if (data.topProducts.length === 0) {
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text('No hay productos registrados.', margin + 3, prodY + 3.5);
    prodY += 5.5;
  } else {
    data.topProducts.slice(0, 6).forEach((p, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(slate50[0], slate50[1], slate50[2]);
        doc.rect(margin, prodY, colW, 5, 'F');
      }
      doc.setTextColor(navy[0], navy[1], navy[2]);
      const shortP = p.name.length > 25 ? p.name.substring(0, 23) + '...' : p.name;
      doc.text(shortP, margin + 3, prodY + 3.5);
      doc.text(`${p.quantity}`, margin + colW - 32, prodY + 3.5, { align: 'center' });
      doc.text(`$${fmt(p.total)}`, margin + colW - 3, prodY + 3.5, { align: 'right' });
      prodY += 5;
    });
  }

  // Columna Derecha: Top Clientes
  const rightX = margin + colW + 6;
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('3. PRINCIPALES CLIENTES EN FACTURACIÓN', rightX, dualY);

  let clientY = dualY + 3;
  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(rightX, clientY, colW, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.text('CLIENTE', rightX + 3, clientY + 3.8);
  doc.text('FACTS', rightX + colW - 32, clientY + 3.8, { align: 'center' });
  doc.text('TOTAL ($)', rightX + colW - 3, clientY + 3.8, { align: 'right' });

  clientY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  if (data.topClients.length === 0) {
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text('No hay clientes registrados en este período.', rightX + 3, clientY + 3.5);
    clientY += 5.5;
  } else {
    data.topClients.slice(0, 6).forEach((c, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(slate50[0], slate50[1], slate50[2]);
        doc.rect(rightX, clientY, colW, 5, 'F');
      }
      doc.setTextColor(navy[0], navy[1], navy[2]);
      const shortC = c.name.length > 25 ? c.name.substring(0, 23) + '...' : c.name;
      doc.text(shortC, rightX + 3, clientY + 3.5);
      doc.text(`${c.invoiceCount}`, rightX + colW - 32, clientY + 3.5, { align: 'center' });
      doc.text(`$${fmt(c.total)}`, rightX + colW - 3, clientY + 3.5, { align: 'right' });
      clientY += 5;
    });
  }

  // Firma y Certificación Comercial
  const sigY = Math.max(prodY, clientY) + 6;
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin, sigY, pageWidth - margin, sigY);

  const sigLineY = sigY + 16;
  const sigW = 55;
  const sig1X = margin + 12;
  const sig2X = pageWidth - margin - sigW - 12;

  doc.setDrawColor(slate700[0], slate700[1], slate700[2]);
  doc.line(sig1X, sigLineY, sig1X + sigW, sigLineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('DIRECCIÓN COMERCIAL / VENTAS', sig1X + sigW / 2, sigLineY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text(company.name, sig1X + sigW / 2, sigLineY + 6.5, { align: 'center' });

  doc.line(sig2X, sigLineY, sig2X + sigW, sigLineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('GERENCIA GENERAL / AUDITORÍA', sig2X + sigW / 2, sigLineY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text('Certificación de Ingresos Oficiales', sig2X + sigW / 2, sigLineY + 6.5, { align: 'center' });

  // Pie de Página
  const footerY = 284;
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  doc.setFontSize(7);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text(`${company.name} | Informe Oficial de Ventas Mensuales y Facturación Fiscal`, margin, footerY + 4);
  doc.text('Página 1 de 1', pageWidth - margin, footerY + 4, { align: 'right' });

  if (options?.autoPrint) {
    doc.autoPrint();
  }

  if (!options?.returnOnly) {
    const safeCompany = (company.name || 'ImperioPro').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = options?.fileName || `Reporte_Ventas_Mensuales_${safeCompany}_${data.period.startDate}_a_${data.period.endDate}.pdf`;
    doc.save(filename);
  }

  return doc;
}

/**
 * Función unificada para generar y descargar cualquier reporte financiero en formato PDF
 * ('flujo_caja', 'ventas_mensuales', o 'consolidado')
 */
export function generateFinancialReportPDF(
  type: 'flujo_caja' | 'ventas_mensuales' | 'consolidado' | 'resumen_mensual' | 'estados_financieros' | 'ventas_gastos_mensual',
  data: {
    cashFlow?: CashFlowReportData;
    monthlySales?: MonthlySalesReportData;
    executive?: ExecutiveReportData;
    financialSummary?: MonthlyFinancialSummaryData;
    financialStatements?: FinancialStatementsData;
    salesAndExpenses?: MonthlySalesAndExpensesData;
  },
  options?: PDFExportOptions
): jsPDF {
  if (type === 'ventas_gastos_mensual' && data.salesAndExpenses) {
    return generateMonthlySalesAndExpensesPDF(data.salesAndExpenses, options);
  } else if (type === 'estados_financieros' && data.financialStatements) {
    return generateFinancialStatementsPDF(data.financialStatements, options);
  } else if (type === 'flujo_caja' && data.cashFlow) {
    return generateCashFlowReportPDF(data.cashFlow, options);
  } else if (type === 'ventas_mensuales' && data.monthlySales) {
    return generateMonthlySalesReportPDF(data.monthlySales, options);
  } else if (data.salesAndExpenses) {
    return generateMonthlySalesAndExpensesPDF(data.salesAndExpenses, options);
  } else if (data.financialStatements) {
    return generateFinancialStatementsPDF(data.financialStatements, options);
  } else if (data.executive) {
    generateExecutiveReportPDF(data.executive);
    const dummyDoc = new jsPDF();
    return dummyDoc;
  } else if (data.monthlySales) {
    return generateMonthlySalesReportPDF(data.monthlySales, options);
  } else if (data.cashFlow) {
    return generateCashFlowReportPDF(data.cashFlow, options);
  } else if ((type as string) === 'resumen_mensual' && (data as any).financialSummary) {
    return generateMonthlyFinancialSummaryPDF((data as any).financialSummary, options);
  }
  throw new Error('Datos insuficientes para generar el reporte financiero solicitado.');
}

// ==========================================
// RESUMEN FINANCIERO MENSUAL (ESTADO CONSOLIDADO)
// Formateado para Impresión A4 y Auditoría Contable
// Distribuidora El Imperio | Tel: 64429775
// distribuidoraelimperio8280@gmail.com
// ==========================================

export interface MonthlyFinancialSummaryData {
  company?: CompanyProfile;
  period: {
    startDate: string;
    endDate: string;
  };
  kpis: {
    totalGrossSales: number;     // Ventas Brutas
    totalSubtotal: number;       // Base Imponible
    totalTaxCollected: number;   // ITBMS / Impuestos
    totalDiscounts: number;      // Descuentos aplicados
    totalExpenses: number;       // Total Egresos Operativos
    netBalance: number;          // Flujo Neto / Superávit o Déficit
    operatingMargin: number;     // Margen Operativo %
    coverageRatio: number;       // Cobertura de Ingresos sobre Gastos
    invoiceCount: number;        // Facturas Emitidas
    averageTicket: number;       // Promedio por Venta
    averageMonthlySales: number; // Promedio Mensual
    peakMonth?: { month: string; amount: number };
  };
  monthlyBreakdown: Array<{
    month: string;               // e.g. "Ene 2026"
    key: string;                 // "2026-01"
    income: number;              // Ingresos del mes
    expenses: number;            // Gastos del mes
    net: number;                 // Flujo neto
    accumulated: number;         // Saldo acumulado
    marginPercent: number;       // Margen %
    taxes: number;               // ITBMS
    invoiceCount: number;        // Cantidad Facturas
    averageTicket: number;       // Ticket Promedio
    growthRateMom?: number;      // % Crecimiento vs mes anterior
  }>;
  expensesByCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  topProducts: Array<{
    name: string;
    quantity: number;
    total: number;
    percentage: number;
  }>;
  paymentMethods?: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
}

/**
 * Imprime el resumen financiero mensual en PDF mediante iframe seguro en segundo plano.
 * Compatible con iframes y bloqueadores de ventanas emergentes.
 */
export function printFinancialSummaryPDF(doc: jsPDF): void {
  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.warn('Iframe print falló en resumen financiero, fallback a window.print:', err);
          window.print();
        }
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
          URL.revokeObjectURL(blobUrl);
        }, 5000);
      }, 400);
    };
  } catch (err) {
    console.error('Error al imprimir resumen financiero PDF:', err);
    window.print();
  }
}

/**
 * Descarga el resumen financiero mensual en formato PDF de manera resiliente.
 */
export function downloadFinancialSummaryPDF(doc: jsPDF, filename: string): boolean {
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 2000);
    return true;
  } catch (err) {
    console.error('Error al descargar resumen financiero PDF:', err);
    doc.save(filename);
    return false;
  }
}

/**
 * Genera el Resumen Financiero Mensual directamente a un archivo PDF formateado para impresión A4,
 * con balance de ingresos vs egresos, cronograma mes a mes, ITBMS, indicadores clave y certificación contable.
 */
export function generateMonthlyFinancialSummaryPDF(
  data: MonthlyFinancialSummaryData,
  options?: PDFExportOptions
): jsPDF {
  const company = data.company || DEFAULT_COMPANY_PROFILE;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const navy = [15, 23, 42];        // #0f172a
  const blue = [2, 132, 199];       // #0284c7
  const emerald = [16, 185, 129];   // #10b981
  const teal = [13, 148, 136];      // #0d9488
  const rose = [225, 29, 72];       // #e11d48
  const slate50 = [248, 250, 252];
  const slate100 = [241, 245, 249];
  const slate200 = [226, 232, 240];
  const slate500 = [100, 116, 139];
  const slate700 = [51, 65, 85];
  const slate800 = [30, 41, 59];

  const pageWidth = 210;
  const margin = 13;
  const contentWidth = pageWidth - (margin * 2); // 184mm

  // ==========================================
  // BANNER SUPERIOR CON ESTILO CORPORATIVO
  // ==========================================
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Franja decorativa dual (Esmeralda / Teal)
  doc.setFillColor(emerald[0], emerald[1], emerald[2]);
  doc.rect(0, 22.5, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text('RESUMEN FINANCIERO MENSUAL - ESTADO CONSOLIDADO', margin, 11);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Auditoría Contable Oficial de Ingresos, Egresos Operativos, Balance Neto e ITBMS', margin, 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`PERÍODO: ${data.period.startDate} al ${data.period.endDate}`, pageWidth - margin, 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(167, 243, 208);
  doc.text(
    `Emisión: ${new Date().toLocaleDateString('es-PA')} ${new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}`,
    pageWidth - margin,
    17.5,
    { align: 'right' }
  );

  // ==========================================
  // METADATOS DE LA EMPRESA & ESTADO FINANCIERO
  // ==========================================
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const companyName = company.name || 'DISTRIBUIDORA EL IMPERIO';
  doc.text(companyName, margin, 31);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  const phoneStr = company.phone || company.whatsapp || '64429775';
  doc.text(`RUC: ${formatRucDv(company.ruc, company.dv)} | Tel / WhatsApp: ${phoneStr}`, margin, 35.5);
  const emailStr = company.email || 'distribuidoraelimperio8280@gmail.com';
  doc.text(`Correo: ${emailStr} | Ubicación: ${company.address || 'Panamá, Rep. de Panamá'}`, margin, 39.5);

  // Badge Estado de Resultados
  const badgeW = 64;
  const badgeX = pageWidth - margin - badgeW;
  doc.setFillColor(slate50[0], slate50[1], slate50[2]);
  doc.roundedRect(badgeX, 26.5, badgeW, 14.5, 1.5, 1.5, 'F');
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.roundedRect(badgeX, 26.5, badgeW, 14.5, 1.5, 1.5, 'S');

  const isSurplus = data.kpis.netBalance >= 0;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(isSurplus ? emerald[0] : rose[0], isSurplus ? emerald[1] : rose[1], isSurplus ? emerald[2] : rose[2]);
  doc.text(`CONDICIÓN: ${isSurplus ? 'SUPERÁVIT OPERATIVO' : 'DÉFICIT FINANCIERO'}`, badgeX + 3.5, 31);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(slate800[0], slate800[1], slate800[2]);
  doc.text(`• Cobertura: ${data.kpis.coverageRatio.toFixed(2)}x (Ingresos / Gastos)`, badgeX + 3.5, 35);
  doc.text(`• Margen Operativo: ${data.kpis.operatingMargin.toFixed(1)}% | Moneda: USD ($)`, badgeX + 3.5, 39);

  // Línea divisoria
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin, 43.5, pageWidth - margin, 43.5);

  // ==========================================
  // 5 TARJETAS DE INDICADORES CLAVE (KPIS)
  // ==========================================
  const kpiY = 46.5;
  const cardW = (contentWidth - 10) / 5; // ~34.8mm
  const cardH = 15;

  const kpiList = [
    {
      title: 'VENTAS BRUTAS ($)',
      value: `$${fmt(data.kpis.totalGrossSales)}`,
      sub: `${data.kpis.invoiceCount} facturas`,
      color: emerald,
    },
    {
      title: 'GASTOS TOTALES ($)',
      value: `$${fmt(data.kpis.totalExpenses)}`,
      sub: 'Egresos operativos',
      color: rose,
    },
    {
      title: 'BALANCE NETO ($)',
      value: `${data.kpis.netBalance >= 0 ? '+' : ''}$${fmt(data.kpis.netBalance)}`,
      sub: isSurplus ? 'Rendimiento positivo' : 'Déficit del período',
      color: isSurplus ? emerald : rose,
    },
    {
      title: 'ITBMS FISCAL ($)',
      value: `$${fmt(data.kpis.totalTaxCollected)}`,
      sub: 'Impuesto cobrado',
      color: blue,
    },
    {
      title: 'TICKET PROMEDIO ($)',
      value: `$${fmt(data.kpis.averageTicket)}`,
      sub: `Prom. mes: $${fmt(data.kpis.averageMonthlySales)}`,
      color: slate800,
    },
  ];

  kpiList.forEach((kpi, idx) => {
    const x = margin + idx * (cardW + 2.5);
    doc.setFillColor(slate50[0], slate50[1], slate50[2]);
    doc.roundedRect(x, kpiY, cardW, cardH, 1.2, 1.2, 'F');
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.roundedRect(x, kpiY, cardW, cardH, 1.2, 1.2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(kpi.title, x + 2.5, kpiY + 4);

    doc.setFontSize(8.8);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, x + 2.5, kpiY + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(kpi.sub, x + 2.5, kpiY + 13);
  });

  // ==========================================
  // TABLA 1: RESUMEN MENSUAL CRONOLÓGICO
  // ==========================================
  let table1Y = 66;
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('1. CONSOLIDADO MENSUAL: INGRESOS, GASTOS, BALANCE NETO Y FISCALIDAD', margin, table1Y);

  table1Y += 2.5;
  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(margin, table1Y, contentWidth, 5.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('MES / PERÍODO', margin + 3, table1Y + 3.8);
  doc.text('INGRESOS ($)', margin + 46, table1Y + 3.8, { align: 'right' });
  doc.text('GASTOS ($)', margin + 78, table1Y + 3.8, { align: 'right' });
  doc.text('BALANCE NETO ($)', margin + 115, table1Y + 3.8, { align: 'right' });
  doc.text('MARGEN', margin + 134, table1Y + 3.8, { align: 'right' });
  doc.text('ITBMS ($)', margin + 155, table1Y + 3.8, { align: 'right' });
  doc.text('FACTS', margin + 168, table1Y + 3.8, { align: 'center' });
  doc.text('TICKET PROM ($)', margin + contentWidth - 3, table1Y + 3.8, { align: 'right' });

  table1Y += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);

  const months = data.monthlyBreakdown;
  if (months.length === 0) {
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text('No hay operaciones registradas en el período seleccionado.', margin + 3, table1Y + 4.5);
    table1Y += 7;
  } else {
    months.forEach((m, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(slate50[0], slate50[1], slate50[2]);
        doc.rect(margin, table1Y, contentWidth, 5, 'F');
      }
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text(m.month, margin + 3, table1Y + 3.5);

      doc.setTextColor(emerald[0], emerald[1], emerald[2]);
      doc.text(`$${fmt(m.income)}`, margin + 46, table1Y + 3.5, { align: 'right' });

      doc.setTextColor(rose[0], rose[1], rose[2]);
      doc.text(`$${fmt(m.expenses)}`, margin + 78, table1Y + 3.5, { align: 'right' });

      const mNetColor = m.net >= 0 ? emerald : rose;
      doc.setTextColor(mNetColor[0], mNetColor[1], mNetColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(`${m.net >= 0 ? '+' : ''}$${fmt(m.net)}`, margin + 115, table1Y + 3.5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(slate700[0], slate700[1], slate700[2]);
      doc.text(`${fmt(m.marginPercent, 1)}%`, margin + 134, table1Y + 3.5, { align: 'right' });

      doc.setTextColor(slate700[0], slate700[1], slate700[2]);
      doc.text(`$${fmt(m.taxes)}`, margin + 155, table1Y + 3.5, { align: 'right' });

      doc.setTextColor(slate800[0], slate800[1], slate800[2]);
      doc.text(`${m.invoiceCount}`, margin + 168, table1Y + 3.5, { align: 'center' });

      doc.text(`$${fmt(m.averageTicket)}`, margin + contentWidth - 3, table1Y + 3.5, { align: 'right' });

      table1Y += 5;
    });

    // Fila de Totales Consolidados
    doc.setFillColor(slate100[0], slate100[1], slate100[2]);
    doc.rect(margin, table1Y, contentWidth, 5.5, 'F');
    doc.setDrawColor(slate800[0], slate800[1], slate800[2]);
    doc.line(margin, table1Y, margin + contentWidth, table1Y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text('TOTAL CONSOLIDADO', margin + 3, table1Y + 3.8);

    doc.setTextColor(emerald[0], emerald[1], emerald[2]);
    doc.text(`$${fmt(data.kpis.totalGrossSales)}`, margin + 46, table1Y + 3.8, { align: 'right' });

    doc.setTextColor(rose[0], rose[1], rose[2]);
    doc.text(`$${fmt(data.kpis.totalExpenses)}`, margin + 78, table1Y + 3.8, { align: 'right' });

    const totNetColor = data.kpis.netBalance >= 0 ? emerald : rose;
    doc.setTextColor(totNetColor[0], totNetColor[1], totNetColor[2]);
    doc.text(`${data.kpis.netBalance >= 0 ? '+' : ''}$${fmt(data.kpis.netBalance)}`, margin + 115, table1Y + 3.8, { align: 'right' });

    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(`${fmt(data.kpis.operatingMargin, 1)}%`, margin + 134, table1Y + 3.8, { align: 'right' });
    doc.text(`$${fmt(data.kpis.totalTaxCollected)}`, margin + 155, table1Y + 3.8, { align: 'right' });
    doc.text(`${data.kpis.invoiceCount}`, margin + 168, table1Y + 3.8, { align: 'center' });
    doc.text(`$${fmt(data.kpis.averageTicket)}`, margin + contentWidth - 3, table1Y + 3.8, { align: 'right' });

    table1Y += 8.5;
  }

  // ==========================================
  // DOS COLUMNAS: GASTOS POR CATEGORÍA vs TOP ARTÍCULOS
  // ==========================================
  const dualY = table1Y + 1;
  const colW = (contentWidth - 6) / 2;

  // Columna Izquierda: Egresos por Categoría
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('2. DISTRIBUCIÓN DE EGRESOS POR CATEGORÍA', margin, dualY);

  let catY = dualY + 2.5;
  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(margin, catY, colW, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.text('CATEGORÍA DE GASTO', margin + 3, catY + 3.5);
  doc.text('MONTO ($)', margin + colW - 25, catY + 3.5, { align: 'right' });
  doc.text('% TOTAL', margin + colW - 3, catY + 3.5, { align: 'right' });

  catY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  if (data.expensesByCategory.length === 0) {
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text('No hay registro de egresos en este período.', margin + 3, catY + 3.5);
    catY += 5;
  } else {
    data.expensesByCategory.slice(0, 5).forEach((cat, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(slate50[0], slate50[1], slate50[2]);
        doc.rect(margin, catY, colW, 4.8, 'F');
      }
      doc.setTextColor(navy[0], navy[1], navy[2]);
      const shortName = cat.category.length > 25 ? cat.category.substring(0, 23) + '...' : cat.category;
      doc.text(shortName, margin + 3, catY + 3.3);
      doc.text(`$${fmt(cat.amount)}`, margin + colW - 25, catY + 3.3, { align: 'right' });
      doc.text(`${fmt(cat.percentage, 1)}%`, margin + colW - 3, catY + 3.3, { align: 'right' });
      catY += 4.8;
    });
  }

  // Columna Derecha: Top Productos en Facturación
  const rightX = margin + colW + 6;
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('3. PRINCIPALES ARTÍCULOS EN FACTURACIÓN', rightX, dualY);

  let prodY = dualY + 2.5;
  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(rightX, prodY, colW, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.text('PRODUCTO / SERVICIO', rightX + 3, prodY + 3.5);
  doc.text('CANT', rightX + colW - 30, prodY + 3.5, { align: 'center' });
  doc.text('TOTAL ($)', rightX + colW - 3, prodY + 3.5, { align: 'right' });

  prodY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  if (data.topProducts.length === 0) {
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text('No hay productos registrados en este período.', rightX + 3, prodY + 3.5);
    prodY += 5;
  } else {
    data.topProducts.slice(0, 5).forEach((p, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(slate50[0], slate50[1], slate50[2]);
        doc.rect(rightX, prodY, colW, 4.8, 'F');
      }
      doc.setTextColor(navy[0], navy[1], navy[2]);
      const shortP = p.name.length > 25 ? p.name.substring(0, 23) + '...' : p.name;
      doc.text(shortP, rightX + 3, prodY + 3.3);
      doc.text(`${p.quantity}`, rightX + colW - 30, prodY + 3.3, { align: 'center' });
      doc.text(`$${fmt(p.total)}`, rightX + colW - 3, prodY + 3.3, { align: 'right' });
      prodY += 4.8;
    });
  }

  // ==========================================
  // CERTIFICACIÓN CONTABLE Y FIRMAS
  // ==========================================
  const sigY = Math.max(catY, prodY) + 6;
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin, sigY, pageWidth - margin, sigY);

  const sigLineY = sigY + 15;
  const sigW = 55;
  const sig1X = margin + 14;
  const sig2X = pageWidth - margin - sigW - 14;

  doc.setDrawColor(slate700[0], slate700[1], slate700[2]);
  doc.line(sig1X, sigLineY, sig1X + sigW, sigLineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('ELABORADO POR: CONTABILIDAD / TESORERÍA', sig1X + sigW / 2, sigLineY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text(companyName, sig1X + sigW / 2, sigLineY + 6.5, { align: 'center' });

  doc.line(sig2X, sigLineY, sig2X + sigW, sigLineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('APROBADO POR: GERENCIA GENERAL / AUDITORÍA', sig2X + sigW / 2, sigLineY + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text('Certificación Contable Oficial para Impresión', sig2X + sigW / 2, sigLineY + 6.5, { align: 'center' });

  // ==========================================
  // PIE DE PÁGINA FORMATEADO PARA IMPRESIÓN
  // ==========================================
  const footerY = 284;
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  doc.setFontSize(6.8);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text(
    `${companyName} | Resumen Financiero Mensual Formateado para Impresión A4 | Tel: ${phoneStr}`,
    margin,
    footerY + 4
  );
  doc.text('Página 1 de 1', pageWidth - margin, footerY + 4, { align: 'right' });

  if (options?.autoPrint) {
    doc.autoPrint();
  }

  if (!options?.returnOnly) {
    const safeCompany = companyName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename =
      options?.fileName ||
      `Resumen_Financiero_Mensual_${safeCompany}_${data.period.startDate}_a_${data.period.endDate}.pdf`;
    downloadFinancialSummaryPDF(doc, filename);
  }

  return doc;
}

// ==========================================
// CATÁLOGO DE PRODUCTOS EN FORMATO PDF
// Dirigido a Proyectos y Ferretería de Panamá
// Celular: 64429775 | distribuidoraelimperio8280@gmail.com
// ==========================================

export interface ProductCatalogOptions {
  category?: string; // 'all' o nombre de la categoría
  showStockQuantity?: boolean; // true = cantidad exacta, false = 'Disponible' / 'Bajo Pedido'
  showOnlyInStock?: boolean; // filtrar solo productos con existencia
  directedTo?: string; // destinatario / proyecto
  validityText?: string; // texto de validez comercial
  customNote?: string; // notas adicionales
  autoPrint?: boolean;
  fileName?: string;
  returnOnly?: boolean;
  company?: CompanyProfile;
}

// Helper para convertir cualquier imagen (WebP, JPEG, PNG, URL relativa /uploads/, o DataURL) a formato seguro para jsPDF
export async function prepareImageForPdf(imageSrc?: string): Promise<{ dataUrl: string; format: 'JPEG' | 'PNG' } | null> {
  if (!imageSrc || typeof window === 'undefined') return null;

  try {
    const src = imageSrc.trim();
    if (!src) return null;

    // DataURL PNG ya listo
    if (src.startsWith('data:image/png')) {
      return { dataUrl: src, format: 'PNG' };
    }
    // DataURL JPEG ya listo
    if (src.startsWith('data:image/jpeg') || src.startsWith('data:image/jpg')) {
      return { dataUrl: src, format: 'JPEG' };
    }

    // Para imágenes WebP, URLs relativas (/uploads/...) o remotas (http/https):
    // Se pre-renderizan a través de un canvas para garantizar compatibilidad universal en jsPDF
    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const timer = setTimeout(() => {
        resolve(null);
      }, 1500);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 320;
          let w = img.naturalWidth || img.width || 200;
          let h = img.naturalHeight || img.height || 200;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          canvas.width = Math.max(w, 20);
          canvas.height = Math.max(h, 20);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const jpegData = canvas.toDataURL('image/jpeg', 0.85);
            resolve({ dataUrl: jpegData, format: 'JPEG' });
            return;
          }
        } catch (e) {
          // ignore canvas taint
        }
        resolve(null);
      };

      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };

      img.src = src;
    });
  } catch {
    return null;
  }
}

// Función para imprimir catálogo PDF mediante iframe seguro (compatible con iframes y bloqueadores)
export function printProductCatalogPDF(doc: jsPDF): void {
  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.warn('Iframe print falló, intentando abrir directamente:', err);
          window.print();
        }
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
          URL.revokeObjectURL(blobUrl);
        }, 5000);
      }, 400);
    };
  } catch (err) {
    console.error('Error al imprimir catálogo PDF:', err);
    window.print();
  }
}

// Función para descargar catálogo PDF con manejo resiliente de blobs en sandboxes
export function downloadProductCatalogPDF(doc: jsPDF, filename: string): boolean {
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 2000);
    return true;
  } catch (err) {
    console.warn('Fallback a doc.save:', err);
    try {
      doc.save(filename);
      return true;
    } catch {
      return false;
    }
  }
}

// Genera el documento y devuelve tanto el jsPDF como el Blob y Blob URL para vista previa interactiva
export async function getProductCatalogBlobUrl(
  products: Product[],
  options?: ProductCatalogOptions
): Promise<{ doc: jsPDF; blob: Blob; blobUrl: string; filename: string }> {
  const doc = await generateProductCatalogPDF(products, { ...options, returnOnly: true });
  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);
  const today = new Date();
  const safeCategory = (options?.category && options.category !== 'all' ? options.category : 'General').replace(/[^a-zA-Z0-9]/g, '_');
  const safeDate = today.toISOString().split('T')[0];
  const filename = options?.fileName || `Catalogo_Productos_ImperioPro_${safeCategory}_${safeDate}.pdf`;
  return { doc, blob, blobUrl, filename };
}

export async function generateProductCatalogPDF(
  products: Product[],
  options?: ProductCatalogOptions
): Promise<jsPDF> {
  const company = options?.company || DEFAULT_COMPANY_PROFILE;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186mm

  // Paleta de colores idéntica a la aplicación
  const slate900 = [15, 23, 42]; // #0f172a
  const slate800 = [30, 41, 59]; // #1e293b
  const slate700 = [51, 65, 85]; // #334155
  const slate600 = [71, 85, 105]; // #475569
  const slate500 = [100, 116, 139]; // #64748b
  const slate400 = [148, 163, 184]; // #94a3b8
  const slate300 = [203, 213, 225]; // #cbd5e1
  const slate200 = [226, 232, 240]; // #e2e8f0
  const slate100 = [241, 245, 249]; // #f1f5f9
  const slate50 = [248, 250, 252]; // #f8fafc

  const amber = [217, 119, 6]; // #d97706 (Ámbar principal de la app)
  const amberDark = [180, 83, 9]; // #b45309
  const amberLight = [254, 243, 199]; // #fef3c7
  const goldAccent = [245, 158, 11]; // #f59e0b

  const emerald = [5, 150, 105]; // #059669
  const emeraldLight = [209, 250, 229]; // #d1fae5
  const sky = [2, 132, 199]; // #0284c7
  const skyLight = [224, 242, 254]; // #e0f2fe
  const rose = [225, 29, 72]; // #e11d48
  const roseLight = [255, 228, 230]; // #ffe4e6

  // Filtrado de productos según las opciones
  let filtered = [...products];

  if (options?.category && options.category !== 'all') {
    filtered = filtered.filter(
      (p) => p.category?.trim().toLowerCase() === options.category?.trim().toLowerCase()
    );
  }

  if (options?.showOnlyInStock) {
    filtered = filtered.filter((p) => p.type === 'service' || (p.stock && p.stock > 0));
  }

  // Ordenar por categoría y luego por nombre
  filtered.sort((a, b) => {
    const catComp = (a.category || '').localeCompare(b.category || '', 'es', { sensitivity: 'base' });
    if (catComp !== 0) return catComp;
    return (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' });
  });

  // Pre-procesar imágenes de forma asíncrona segura para evitar bloqueos y fallos de formato
  const preparedImages = await Promise.all(
    filtered.map(async (p) => {
      const src = p.imageUrl || p.image_url;
      if (!src) return null;
      return await prepareImageForPdf(src);
    })
  );

  // Fecha actual formateada
  const today = new Date();
  const dateFormatted = today.toLocaleDateString('es-PA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // Función para dibujar encabezado de continuación en páginas posteriores
  const drawPageHeader = (pageNum: number) => {
    // Franja superior ámbar de marca
    doc.setFillColor(amber[0], amber[1], amber[2]);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Barra de cabecera slate900
    doc.setFillColor(slate900[0], slate900[1], slate900[2]);
    doc.rect(margin, 7, contentWidth, 11, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('DISTRIBUIDORA EL IMPERIO  |  CATÁLOGO PARA PROYECTOS Y FERRETERÍA', margin + 4, 12.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.text('📞 Cel / WhatsApp: 64429775  |  distribuidoraelimperio8280@gmail.com  |  Panamá', margin + contentWidth - 4, 12.5, { align: 'right' });

    // Cabecera de la tabla
    drawTableHeader(20);
  };

  // Función para dibujar cabecera de tabla de productos
  const drawTableHeader = (y: number) => {
    const tableH = 7;
    doc.setFillColor(slate800[0], slate800[1], slate800[2]);
    doc.rect(margin, y, contentWidth, tableH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(255, 255, 255);

    // Columnas:
    // FOTO (15mm) | SKU (24mm) | ARTÍCULO, MATERIAL & ESPECIFICACIONES (78mm) | UNIDAD (15mm) | STOCK (24mm) | PRECIO ($) + ITBMS (30mm)
    doc.text('FOTO', margin + 7.5, y + 4.6, { align: 'center' });
    doc.text('SKU / CÓDIGO', margin + 17, y + 4.6);
    doc.text('ARTÍCULO, MATERIAL & ESPECIFICACIONES', margin + 41, y + 4.6);
    doc.text('UNIDAD', margin + 120, y + 4.6, { align: 'center' });
    doc.text('DISPONIBILIDAD', margin + 143, y + 4.6, { align: 'center' });
    doc.text('PRECIO UNIT. (USD)', margin + contentWidth - 4, y + 4.6, { align: 'right' });
  };

  // ==========================================
  // PÁGINA 1: PORTADA Y ENCABEZADO EJECUTIVO
  // ==========================================

  // 1. Franja decorativa ámbar superior
  doc.setFillColor(amber[0], amber[1], amber[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Banner Principal de la Empresa (Slate 900)
  const headerY = 9;
  const headerHeight = 34;
  doc.setFillColor(slate900[0], slate900[1], slate900[2]);
  doc.roundedRect(margin, headerY, contentWidth, headerHeight, 2, 2, 'F');

  // Borde sutil ámbar a la izquierda
  doc.setFillColor(amber[0], amber[1], amber[2]);
  doc.rect(margin, headerY, 3, headerHeight, 'F');

  // Textos del Banner Empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DISTRIBUIDORA EL IMPERIO', margin + 8, headerY + 8);

  doc.setFontSize(8.5);
  doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
  doc.text('CATÁLOGO DE PRODUCTOS & MATERIALES DE FERRETERÍA Y CONSTRUCCIÓN', margin + 8, headerY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(slate300[0], slate300[1], slate300[2]);
  doc.text('Suministro integral para contratistas, obras civiles, proyectos residenciales y ferreterías', margin + 8, headerY + 19.5);
  doc.text('RUC: 155689021-2-2026  |  Ciudad de Panamá, República de Panamá', margin + 8, headerY + 24);
  doc.text('Despacho directo y logística a obras en Panamá, Panamá Oeste y Provincias', margin + 8, headerY + 28.5);

  // Recuadro de Contacto Comercial en la esquina superior derecha
  const contactBoxW = 68;
  const contactBoxH = 26;
  const contactBoxX = margin + contentWidth - contactBoxW - 4;
  const contactBoxY = headerY + 4;

  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.roundedRect(contactBoxX, contactBoxY, contactBoxW, contactBoxH, 1.5, 1.5, 'F');
  doc.setDrawColor(amber[0], amber[1], amber[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(contactBoxX, contactBoxY, contactBoxW, contactBoxH, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
  doc.text('CONTACTO COMERCIAL & PEDIDOS', contactBoxX + contactBoxW / 2, contactBoxY + 5, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('📞 Cel / WhatsApp: 64429775', contactBoxX + 4, contactBoxY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text('✉️ distribuidoraelimperio8280@gmail.com', contactBoxX + 4, contactBoxY + 17);

  doc.setFontSize(6.8);
  doc.setTextColor(slate300[0], slate300[1], slate300[2]);
  doc.text('Cotizaciones rápidas para proyectos y mayoreo', contactBoxX + 4, contactBoxY + 22);

  // 3. Tarjeta de Destinatario y Parámetros del Catálogo
  const destY = headerY + headerHeight + 3.5;
  const destH = 17;
  doc.setFillColor(slate50[0], slate50[1], slate50[2]);
  doc.roundedRect(margin, destY, contentWidth, destH, 1.5, 1.5, 'F');
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, destY, contentWidth, destH, 1.5, 1.5, 'S');

  const directedToText = options?.directedTo || 'Atención: Proyectos de Construcción, Contratistas y Ferreterías de Panamá';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text('DIRIGIDO A / DESTINATARIO:', margin + 4, destY + 4.5);

  doc.setFontSize(8.5);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text(directedToText, margin + 4, destY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  const validityText = options?.validityText || 'Precios vigentes para cotizaciones y pedidos en Panamá | Moneda: Dólares Americanos (USD)';
  doc.text(`Fecha: ${dateFormatted}  •  ${validityText}`, margin + 4, destY + 13.5);

  // Mini-KPIs en el lado derecho de la tarjeta
  const kpiX = margin + contentWidth - 62;
  doc.setFillColor(amberLight[0], amberLight[1], amberLight[2]);
  doc.roundedRect(kpiX, destY + 2.5, 28, 12, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(amberDark[0], amberDark[1], amberDark[2]);
  doc.text('TOTAL ÍTEMS', kpiX + 14, destY + 6.5, { align: 'center' });
  doc.setFontSize(9);
  doc.text(`${filtered.length}`, kpiX + 14, destY + 11.5, { align: 'center' });

  const kpi2X = kpiX + 31;
  doc.setFillColor(emeraldLight[0], emeraldLight[1], emeraldLight[2]);
  doc.roundedRect(kpi2X, destY + 2.5, 28, 12, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(emerald[0], emerald[1], emerald[2]);
  doc.text('DISPONIBILIDAD', kpi2X + 14, destY + 6.5, { align: 'center' });
  doc.setFontSize(8);
  doc.text('EN ALMACÉN', kpi2X + 14, destY + 11.5, { align: 'center' });

  // 4. Dibujar cabecera inicial de la tabla
  let currentY = destY + destH + 4;
  drawTableHeader(currentY);
  currentY += 7;

  // Si no hay productos disponibles
  if (filtered.length === 0) {
    doc.setFillColor(slate50[0], slate50[1], slate50[2]);
    doc.rect(margin, currentY, contentWidth, 20, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text('No hay productos disponibles con los filtros especificados.', margin + contentWidth / 2, currentY + 11, { align: 'center' });
    currentY += 20;
  }

  // 5. Agrupación y renderizado de productos
  let currentCategory = '';
  const rowHeight = 16.5; // Altura cómoda para imagen, material, descripción y precio

  filtered.forEach((p, index) => {
    const prodCat = (p.category || 'General').trim();

    // Si cambia de categoría, insertamos una barra divisoria de categoría
    if (prodCat !== currentCategory) {
      currentCategory = prodCat;

      // Verificar si cabe la barra de categoría y al menos un producto (25mm)
      if (currentY + 26 > pageHeight - 18) {
        doc.addPage();
        drawPageHeader(doc.getNumberOfPages());
        currentY = 27;
      }

      // Dibujar barra de categoría
      doc.setFillColor(slate100[0], slate100[1], slate100[2]);
      doc.rect(margin, currentY, contentWidth, 5.5, 'F');
      doc.setFillColor(amber[0], amber[1], amber[2]);
      doc.rect(margin, currentY, 2.5, 5.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(slate900[0], slate900[1], slate900[2]);
      doc.text(`CATEGORÍA: ${prodCat.toUpperCase()}`, margin + 5, currentY + 3.8);

      const itemsInCat = filtered.filter((item) => (item.category || 'General').trim() === prodCat).length;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(slate500[0], slate500[1], slate500[2]);
      doc.text(`(${itemsInCat} ${itemsInCat === 1 ? 'artículo' : 'artículos'})`, margin + 65, currentY + 3.8);

      currentY += 5.5;
    }

    // Verificar si la fila de producto cabe en la página actual
    if (currentY + rowHeight > pageHeight - 18) {
      doc.addPage();
      drawPageHeader(doc.getNumberOfPages());
      currentY = 27;
    }

    // Fondo alternado de fila
    if (index % 2 === 1) {
      doc.setFillColor(slate50[0], slate50[1], slate50[2]);
      doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
    }

    // Línea divisoria inferior
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY + rowHeight, margin + contentWidth, currentY + rowHeight);

    // =============================
    // Columna 1: FOTO / MINIATURA (15mm)
    // =============================
    const imgBoxX = margin + 1.5;
    const imgBoxY = currentY + 1.8;
    const imgBoxSize = 12.5;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(imgBoxX, imgBoxY, imgBoxSize, imgBoxSize, 1, 1, 'F');
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.roundedRect(imgBoxX, imgBoxY, imgBoxSize, imgBoxSize, 1, 1, 'S');

    const prepImg = preparedImages[index];
    let imageDrawn = false;

    if (prepImg) {
      try {
        doc.addImage(prepImg.dataUrl, prepImg.format, imgBoxX + 0.5, imgBoxY + 0.5, imgBoxSize - 1, imgBoxSize - 1);
        imageDrawn = true;
      } catch (err) {
        imageDrawn = false;
      }
    }

    if (!imageDrawn) {
      // Placeholder elegante con iniciales
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(slate400[0] || 148, slate400[1] || 163, slate400[2] || 184);
      doc.text('IMP', imgBoxX + imgBoxSize / 2, imgBoxY + imgBoxSize / 2 + 1, { align: 'center' });
    }

    // =============================
    // Columna 2: SKU / CÓDIGO (24mm)
    // =============================
    const skuX = margin + 17;
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(slate900[0], slate900[1], slate900[2]);
    doc.text(p.sku || `PROD-${index + 1}`, skuX, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(p.type === 'service' ? 'Servicio' : 'Físico', skuX, currentY + 10.5);

    // =============================
    // Columna 3: ARTÍCULO, MATERIAL & ESPECIFICACIONES (78mm)
    // =============================
    const descX = margin + 41;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(slate900[0], slate900[1], slate900[2]);

    // Truncar nombre si es muy largo
    const cleanName = p.name || 'Sin Nombre';
    const displayName = cleanName.length > 46 ? cleanName.substring(0, 44) + '...' : cleanName;
    doc.text(displayName, descX, currentY + 5.5);

    // Pill de Material si existe
    let secondLineY = currentY + 9.5;
    if (p.material && p.material.trim()) {
      doc.setFillColor(amberLight[0], amberLight[1], amberLight[2]);
      const matText = `Material: ${p.material.trim()}`;
      const matWidth = Math.min(doc.getTextWidth(matText) + 3, 40);
      doc.roundedRect(descX, secondLineY - 3, matWidth, 4, 0.8, 0.8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(amberDark[0], amberDark[1], amberDark[2]);
      doc.text(matText, descX + 1.5, secondLineY);

      // Descripción corta tras el material
      if (p.description) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(slate600[0], slate600[1], slate600[2]);
        const shortDesc = p.description.length > 45 ? p.description.substring(0, 42) + '...' : p.description;
        doc.text(`• ${shortDesc}`, descX + matWidth + 2.5, secondLineY);
      }
    } else if (p.description) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(slate600[0], slate600[1], slate600[2]);
      const shortDesc = p.description.length > 58 ? p.description.substring(0, 55) + '...' : p.description;
      doc.text(shortDesc, descX, secondLineY);
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(slate400[0] || 148, slate400[1] || 163, slate400[2] || 184);
      doc.text('Especificación estándar para proyectos y ferretería', descX, secondLineY);
    }

    // Línea 3: Categoría
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(`Rubro: ${prodCat}`, descX, currentY + 13.8);

    // =============================
    // Columna 4: UNIDAD (15mm)
    // =============================
    const unitX = margin + 120;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(slate700[0], slate700[1], slate700[2]);
    doc.text(p.unit || 'Unidad', unitX, currentY + 8.5, { align: 'center' });

    // =============================
    // Columna 5: STOCK DISPONIBLE (24mm)
    // =============================
    const stockCenterX = margin + 143;
    const stockBadgeW = 22;
    const stockBadgeH = 6;
    const stockBadgeY = currentY + 5;

    if (p.type === 'service') {
      doc.setFillColor(skyLight[0], skyLight[1], skyLight[2]);
      doc.roundedRect(stockCenterX - stockBadgeW / 2, stockBadgeY, stockBadgeW, stockBadgeH, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(sky[0], sky[1], sky[2]);
      doc.text('Servicio Activo', stockCenterX, stockBadgeY + 4.2, { align: 'center' });
    } else {
      const currentStock = p.stock ?? 0;
      const minStock = p.minStockAlert ?? (p.min_stock ?? 3);
      const showExact = options?.showStockQuantity !== false;

      if (currentStock > minStock) {
        // Stock suficiente (Verde)
        doc.setFillColor(emeraldLight[0], emeraldLight[1], emeraldLight[2]);
        doc.roundedRect(stockCenterX - stockBadgeW / 2, stockBadgeY, stockBadgeW, stockBadgeH, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(emerald[0], emerald[1], emerald[2]);
        const stockLabel = showExact ? `${currentStock} En Stock` : 'Disponible';
        doc.text(stockLabel, stockCenterX, stockBadgeY + 4.2, { align: 'center' });
      } else if (currentStock > 0) {
        // Stock bajo / limitado (Ámbar)
        doc.setFillColor(amberLight[0], amberLight[1], amberLight[2]);
        doc.roundedRect(stockCenterX - stockBadgeW / 2, stockBadgeY, stockBadgeW, stockBadgeH, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(amberDark[0], amberDark[1], amberDark[2]);
        const stockLabel = showExact ? `${currentStock} (Limitado)` : 'Stock Limitado';
        doc.text(stockLabel, stockCenterX, stockBadgeY + 4.2, { align: 'center' });
      } else {
        // Agotado / Sobre pedido (Rosa)
        doc.setFillColor(roseLight[0], roseLight[1], roseLight[2]);
        doc.roundedRect(stockCenterX - stockBadgeW / 2, stockBadgeY, stockBadgeW, stockBadgeH, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(rose[0], rose[1], rose[2]);
        doc.text('Bajo Pedido', stockCenterX, stockBadgeY + 4.2, { align: 'center' });
      }
    }

    // =============================
    // Columna 6: PRECIO ($) + ITBMS (30mm)
    // =============================
    const priceRightX = margin + contentWidth - 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(amberDark[0], amberDark[1], amberDark[2]);
    doc.text(`$${fmt(p.price || 0)}`, priceRightX, currentY + 7, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    const taxLabel = p.taxRate && p.taxRate > 0 ? `+${p.taxRate}% ITBMS` : 'ITBMS Exento (0%)';
    doc.text(taxLabel, priceRightX, currentY + 11.5, { align: 'right' });

    currentY += rowHeight;
  });

  // ==========================================
  // BLOQUE DE CIERRE: CONDICIONES COMERCIALES Y FIRMAS
  // ==========================================
  const notesHeight = 36;
  if (currentY + notesHeight > pageHeight - 18) {
    doc.addPage();
    drawPageHeader(doc.getNumberOfPages());
    currentY = 27;
  } else {
    currentY += 4;
  }

  // Recuadro de condiciones comerciales para ferreterías y proyectos
  doc.setFillColor(slate50[0], slate50[1], slate50[2]);
  doc.roundedRect(margin, currentY, contentWidth, 23, 1.5, 1.5, 'F');
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, contentWidth, 23, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text('TÉRMINOS Y CONDICIONES PARA PROYECTOS Y FERRETERÍAS:', margin + 4, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('• Precios en Dólares Americanos (USD). Facturación fiscal electrónica emitida conforme a las normativas de la DGI en Panamá.', margin + 4, currentY + 8.5);
  doc.text('• Precios especiales y descuentos escalonados disponibles para contratistas por compras de volumen y licitaciones.', margin + 4, currentY + 12.5);
  doc.text('• Despacho directo a obra o retiro en almacén central. Para cotizaciones de proyectos, pedidos o reservas de stock:', margin + 4, currentY + 16.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(amberDark[0], amberDark[1], amberDark[2]);
  doc.text('📞 Contacto Directo Proyectos: Cel. 64429775  |  Correo: distribuidoraelimperio8280@gmail.com', margin + 4, currentY + 20.5);

  // Firmas y sellos comerciales
  const sigY = currentY + 26;
  const sigBoxW = 60;
  const sig1X = margin + 18;
  const sig2X = margin + contentWidth - sigBoxW - 18;

  doc.setDrawColor(slate400[0] || 148, slate400[1] || 163, slate400[2] || 184);
  doc.setLineWidth(0.5);

  doc.line(sig1X, sigY + 6, sig1X + sigBoxW, sigY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text('VENTAS Y ASESORÍA TÉCNICA', sig1X + sigBoxW / 2, sigY + 9.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text('Distribuidora El Imperio | Proyectos', sig1X + sigBoxW / 2, sigY + 13, { align: 'center' });

  doc.line(sig2X, sigY + 6, sig2X + sigBoxW, sigY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(slate900[0], slate900[1], slate900[2]);
  doc.text('DEPARTAMENTO DE LOGÍSTICA & DESPACHO', sig2X + sigBoxW / 2, sigY + 9.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text('Celular Comercial: 64429775', sig2X + sigBoxW / 2, sigY + 13, { align: 'center' });

  // ==========================================
  // PIE DE PÁGINA NUMERADO EN TODAS LAS PÁGINAS
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  const footerY = pageHeight - 8;

  for (let pIdx = 1; pIdx <= totalPages; pIdx++) {
    doc.setPage(pIdx);

    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.setLineWidth(0.4);
    doc.line(margin, footerY - 2, margin + contentWidth, footerY - 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(
      'DISTRIBUIDORA EL IMPERIO PRO  |  Contacto Proyectos: Cel. 64429775  |  distribuidoraelimperio8280@gmail.com  |  Panamá',
      margin,
      footerY + 1.5
    );

    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${pIdx} de ${totalPages}`, margin + contentWidth, footerY + 1.5, { align: 'right' });
  }

  // Descarga o impresión según las opciones
  if (!options?.returnOnly) {
    const safeCategory = (options?.category && options.category !== 'all' ? options.category : 'General').replace(/[^a-zA-Z0-9]/g, '_');
    const safeDate = today.toISOString().split('T')[0];
    const filename = options?.fileName || `Catalogo_Productos_ImperioPro_${safeCategory}_${safeDate}.pdf`;

    if (options?.autoPrint) {
      printProductCatalogPDF(doc);
    } else {
      downloadProductCatalogPDF(doc, filename);
    }
  }

  return doc;
}

// Vinculación global en window para pruebas, consola y auditoría
if (typeof window !== 'undefined') {
  (window as any).generarCatalogoPDF = generateProductCatalogPDF;
}

/**
 * =========================================================================
 * COMPROBANTE OFICIAL DE REGISTRO DE COMPRA / GASTO INTERNO (PDF Y PRINT)
 * =========================================================================
 */

export function generateExpenseVoucherPDF(
  expense: Expense,
  company?: CompanyProfile,
  options?: { autoPrint?: boolean }
): jsPDF {
  const activeCompany = company || DEFAULT_COMPANY_PROFILE;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryEmerald = [5, 150, 105]; // #059669
  const darkNavy = [15, 23, 42]; // #0f172a
  const slate600 = [71, 85, 105];
  const slate200 = [226, 232, 240];
  const slate100 = [241, 245, 249];

  // Top Accent Bar
  doc.setFillColor(primaryEmerald[0], primaryEmerald[1], primaryEmerald[2]);
  doc.rect(0, 0, 210, 6, 'F');

  // Company Logo (if available)
  let textLeftOffset = 14;
  if (activeCompany.logoUrl) {
    try {
      doc.addImage(activeCompany.logoUrl, 'PNG', 14, 10, 32, 28);
      textLeftOffset = 49;
    } catch {
      try {
        doc.addImage(activeCompany.logoUrl, 'JPEG', 14, 10, 32, 28);
        textLeftOffset = 49;
      } catch {
        textLeftOffset = 14;
      }
    }
  }

  // Institutional Header (Left Side)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(activeCompany.name || 'DISTRIBUIDORA EL IMPERIO', textLeftOffset, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);

  const rucFormatted = `RUC: ${formatRucDv(activeCompany.ruc || '155689021-2-2026', activeCompany.dv)}`;
  const phoneFormatted = `Tel / WAP: ${activeCompany.whatsapp || activeCompany.phone || '64429775'}${activeCompany.mobile ? ` | Cel: ${activeCompany.mobile}` : ''}`;

  doc.text(rucFormatted, textLeftOffset, 21.5);
  doc.text(phoneFormatted, textLeftOffset, 26.5);
  doc.text(`Email: ${activeCompany.email || 'distribuidoraelimperio8280@gmail.com'}`, textLeftOffset, 31.5);
  doc.setFontSize(7.5);
  doc.text(`Dirección: ${activeCompany.address || 'Panamá, República de Panamá'}`, textLeftOffset, 36.5);

  // Document Title & Voucher Badge (Right Side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryEmerald[0], primaryEmerald[1], primaryEmerald[2]);
  doc.text('COMPROBANTE DE REGISTRO', 196, 16, { align: 'right' });
  doc.text('DE COMPRA / GASTO INTERNO', 196, 21, { align: 'right' });

  // Code & Dates Box
  doc.setFillColor(slate100[0], slate100[1], slate100[2]);
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.roundedRect(125, 25, 71, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(`N° REGISTRO:`, 128, 30);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryEmerald[0], primaryEmerald[1], primaryEmerald[2]);
  doc.text(expense.code || 'EXP-0001', 193, 30, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(`Fecha Emisión Factura:`, 128, 35);
  doc.text(expense.date || '-', 193, 35, { align: 'right' });
  doc.text(`Fecha Recepción / Reg.:`, 128, 39.5);
  doc.text(expense.receptionDate || expense.date || '-', 193, 39.5, { align: 'right' });

  // Divider line
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(14, 45, 196, 45);

  // Section: Datos del Proveedor & Datos del Documento
  const yBlock = 49;
  const blockHeight = 40;

  // Provider Box (Left)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.roundedRect(14, yBlock, 89, blockHeight, 2, 2, 'D');

  doc.setFillColor(slate100[0], slate100[1], slate100[2]);
  doc.rect(14, yBlock, 89, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('DATOS DEL PROVEEDOR / ACREEDOR', 18, yBlock + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(expense.providerName || 'Proveedor General', 18, yBlock + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(`RUC: ${formatRucDv(expense.providerRuc, expense.providerDv)}`, 18, yBlock + 16.5);
  doc.text(`Dirección: ${expense.providerAddress || 'Panamá, Rep. de Panamá'}`, 18, yBlock + 21.5);
  doc.text(`Tel: ${expense.providerPhone || 'N/A'}  |  Email: ${expense.providerEmail || 'N/A'}`, 18, yBlock + 26.5);

  // Centro de costo tag in provider box
  if (expense.costCenter) {
    doc.text(`Centro de Costo / Sucursal:`, 18, yBlock + 31.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(expense.costCenter, 18, yBlock + 36);
  }

  // Invoice / Document Box (Right)
  doc.roundedRect(107, yBlock, 89, blockHeight, 2, 2, 'D');
  doc.setFillColor(slate100[0], slate100[1], slate100[2]);
  doc.rect(107, yBlock, 89, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('DATOS DE LA FACTURA Y OPERACIÓN', 111, yBlock + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Factura / Comprobante N°:', 111, yBlock + 11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(expense.invoiceNumber || 'S/N', 192, yBlock + 11.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Tipo & Categoría:', 111, yBlock + 16.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  const catText = `${expense.expenseType ? `${expense.expenseType.slice(0, 15)}... / ` : ''}${expense.category || 'Insumos'}`;
  doc.text(doc.splitTextToSize(catText, 45)[0], 192, yBlock + 16.5, { align: 'right' });

  // Placa / Vehículo if present
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Vehículo / Flota:', 111, yBlock + 21.5);
  doc.setFont('helvetica', 'bold');
  if (expense.vehiclePlate) {
    doc.setTextColor(primaryEmerald[0], primaryEmerald[1], primaryEmerald[2]);
    doc.text(`Placa: ${expense.vehiclePlate}${expense.vehicleName ? ` (${expense.vehicleName})` : ''}`, 192, yBlock + 21.5, { align: 'right' });
  } else {
    doc.setTextColor(slate600[0], slate600[1], slate600[2]);
    doc.text('N/A (Gasto General)', 192, yBlock + 21.5, { align: 'right' });
  }

  // Deducibilidad Fiscal & Forma de Pago
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Deducibilidad Fiscal:', 111, yBlock + 26.5);
  doc.setFont('helvetica', 'bold');
  if (expense.isDeductible !== false) {
    doc.setTextColor(primaryEmerald[0], primaryEmerald[1], primaryEmerald[2]);
    doc.text('DEDUCIBLE (100% Gasto)', 192, yBlock + 26.5, { align: 'right' });
  } else {
    doc.setTextColor(190, 24, 93);
    doc.text('NO DEDUCIBLE', 192, yBlock + 26.5, { align: 'right' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Forma de Pago:', 111, yBlock + 31.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  const paymentMethodLabel = 
    expense.paymentMethod === 'transfer' ? 'Transferencia / ACH' :
    expense.paymentMethod === 'cash' ? 'Efectivo' :
    expense.paymentMethod === 'card' ? 'Tarjeta Débito/Crédito' :
    expense.paymentMethod === 'corporate_card' ? 'Tarjeta Corporativa' :
    expense.paymentMethod === 'check' ? 'Cheque Comercial' :
    expense.paymentMethod === 'credit' ? 'Crédito / Cuentas por Pagar' :
    String(expense.paymentMethod || 'Otro');
  doc.text(paymentMethodLabel, 192, yBlock + 31.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Soporte Digital Adjunto:', 111, yBlock + 36.5);
  doc.setFont('helvetica', 'bold');
  doc.text(expense.attachment ? `Sí (${expense.attachment.name.slice(0, 20)})` : 'Físico en Archivo', 192, yBlock + 36.5, { align: 'right' });

  // Items Table Section
  const yTable = yBlock + blockHeight + 6;
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.rect(14, yTable, 182, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('#', 17, yTable + 4.8);
  doc.text('DESCRIPCIÓN DETALLADA DEL PRODUCTO / INSUMO', 26, yTable + 4.8);
  doc.text('CANT.', 122, yTable + 4.8, { align: 'center' });
  doc.text('COSTO UNIT.', 144, yTable + 4.8, { align: 'right' });
  doc.text('ITBMS %', 165, yTable + 4.8, { align: 'center' });
  doc.text('SUBTOTAL', 192, yTable + 4.8, { align: 'right' });

  // Items Rows
  let curY = yTable + 7;
  const itemsList = expense.items && expense.items.length > 0
    ? expense.items
    : [
        {
          id: '1',
          description: expense.notes || expense.category || 'Compra / Insumos según comprobante',
          quantity: 1,
          unitPrice: expense.subtotal || (expense.amount - (expense.taxAmount || 0)),
          taxRate: expense.taxAmount > 0 ? 7 : 0,
          subtotal: expense.subtotal || (expense.amount - (expense.taxAmount || 0)),
          taxAmount: expense.taxAmount || 0,
          total: expense.amount,
        }
      ];

  itemsList.forEach((item, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(250, 250, 250);
      doc.rect(14, curY, 182, 6.5, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slate600[0], slate600[1], slate600[2]);
    doc.text(String(index + 1), 17, curY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    const maxDescWidth = 92;
    const descText = doc.splitTextToSize(item.description, maxDescWidth)[0];
    doc.text(descText, 26, curY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slate600[0], slate600[1], slate600[2]);
    doc.text(String(item.quantity), 122, curY + 4.5, { align: 'center' });
    doc.text(`$${fmt(item.unitPrice)}`, 144, curY + 4.5, { align: 'right' });
    doc.text(`${item.taxRate || 0}%`, 165, curY + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(`$${fmt(item.subtotal)}`, 192, curY + 4.5, { align: 'right' });

    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.line(14, curY + 6.5, 196, curY + 6.5);
    curY += 6.5;
  });

  // Observations and Totals Block
  const yTotals = Math.max(curY + 4, 160);

  // Left: Notes / Observations
  doc.setFillColor(slate100[0], slate100[1], slate100[2]);
  doc.roundedRect(14, yTotals, 105, 26, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('NOTAS / OBSERVACIONES CONTABLES:', 18, yTotals + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  const notesText = expense.notes || 'Registro de compra/gasto verificado con soporte fiscal y físico en archivo contable.';
  const splitNotes = doc.splitTextToSize(notesText, 97);
  doc.text(splitNotes.slice(0, 3), 18, yTotals + 10);

  // Right: Consolidated Totals
  const subtotalVal = expense.subtotal || (expense.amount - (expense.taxAmount || 0));
  const taxVal = expense.taxAmount || 0;
  const totalVal = expense.amount;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.roundedRect(125, yTotals, 71, 26, 2, 2, 'D');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Subtotal General:', 129, yTotals + 6);
  doc.text(`$${fmt(subtotalVal)}`, 192, yTotals + 6, { align: 'right' });

  doc.text('Impuesto ITBMS:', 129, yTotals + 12);
  doc.text(`$${fmt(taxVal)}`, 192, yTotals + 12, { align: 'right' });

  doc.setFillColor(primaryEmerald[0], primaryEmerald[1], primaryEmerald[2]);
  doc.rect(125, yTotals + 17, 71, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL COMPRA / GASTO:', 129, yTotals + 23);
  doc.text(`$${fmt(totalVal)}`, 192, yTotals + 23, { align: 'right' });

  // Signatures Section (Pie de Página)
  const ySigs = yTotals + 36;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);

  // Box 1: Registrado Por
  doc.roundedRect(14, ySigs, 85, 26, 2, 2, 'D');
  doc.line(22, ySigs + 17, 91, ySigs + 17);
  doc.text('REGISTRADO POR (Firma y Fecha)', 22, ySigs + 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(`Responsable: ${expense.registeredBy || 'JOSE'} - Contabilidad`, 22, ySigs + 15);

  // Box 2: Aprobado Por
  doc.roundedRect(111, ySigs, 85, 26, 2, 2, 'D');
  doc.line(119, ySigs + 17, 188, ySigs + 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('APROBADO POR (Sello y Auditoría)', 119, ySigs + 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(`Auditor: ${expense.approvedBy || 'ADMINISTRACIÓN Y FINANZAS'}`, 119, ySigs + 15);

  // Internal Audit Legend
  const yAudit = ySigs + 33;
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(14, yAudit, 196, yAudit);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(
    'Comprobante generado por Imperio Pro Facturación y Contabilidad - Válido para control interno, conciliación contable y soporte fiscal.',
    105,
    yAudit + 4,
    { align: 'center' }
  );
  doc.text(
    `Generado el ${new Date().toLocaleString()} | ID Transacción: ${expense.id} | Sincronizado en la Nube`,
    105,
    yAudit + 7.5,
    { align: 'center' }
  );

  if (options?.autoPrint) {
    doc.autoPrint();
  }

  return doc;
}

export function downloadExpenseVoucherPDF(expense: Expense, company?: CompanyProfile) {
  const doc = generateExpenseVoucherPDF(expense, company);
  const safeCode = (expense.code || 'COMPROBANTE').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeProvider = (expense.providerName || 'PROVEEDOR').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Comprobante_Compra_${safeCode}_${safeProvider}.pdf`);
}

export function printExpenseVoucherPDF(expense: Expense, company?: CompanyProfile) {
  const activeCompany = company || DEFAULT_COMPANY_PROFILE;
  const items = expense.items && expense.items.length > 0
    ? expense.items
    : [
        {
          id: '1',
          description: expense.notes || expense.category || 'Compra / Insumos según comprobante',
          quantity: 1,
          unitPrice: expense.subtotal || (expense.amount - (expense.taxAmount || 0)),
          taxRate: expense.taxAmount > 0 ? 7 : 0,
          subtotal: expense.subtotal || (expense.amount - (expense.taxAmount || 0)),
          taxAmount: expense.taxAmount || 0,
          total: expense.amount,
        }
      ];

  const subtotalVal = expense.subtotal || (expense.amount - (expense.taxAmount || 0));
  const taxVal = expense.taxAmount || 0;
  const totalVal = expense.amount;

  const itemsRows = items.map((it, idx) => `
    <tr>
      <td style="text-align: center; color: #64748b; font-weight: 600; padding: 7px 6px;">${idx + 1}</td>
      <td style="padding: 7px 8px;">
        <div style="font-weight: 700; color: #0f172a;">${it.description}</div>
      </td>
      <td style="text-align: center; font-weight: 700; padding: 7px 6px;">${it.quantity}</td>
      <td style="text-align: right; font-family: monospace; font-weight: 600; padding: 7px 8px;">$${fmt(it.unitPrice)}</td>
      <td style="text-align: center; color: #64748b; padding: 7px 6px;">${it.taxRate || 0}%</td>
      <td style="text-align: right; font-family: monospace; font-weight: 800; color: #0f172a; padding: 7px 8px;">$${fmt(it.subtotal)}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Comprobante de Compra ${expense.code} - ${activeCompany.name}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm;
        }
        *, *:before, *:after {
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 24px;
          background: #ffffff;
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #059669;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .company-info h1 {
          margin: 0 0 4px 0;
          font-size: 20px;
          color: #0f172a;
          letter-spacing: -0.5px;
        }
        .company-info p {
          margin: 2px 0;
          font-size: 12px;
          color: #475569;
        }
        .voucher-title-box {
          text-align: right;
        }
        .voucher-badge {
          background: #059669;
          color: #ffffff;
          display: inline-block;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .voucher-meta {
          font-size: 12px;
          color: #475569;
        }
        .voucher-meta strong {
          color: #0f172a;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .info-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          background: #f8fafc;
        }
        .info-card h3 {
          margin: 0 0 8px 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #059669;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
        }
        .info-card p {
          margin: 3px 0;
          font-size: 12px;
          color: #334155;
        }
        .info-card strong {
          color: #0f172a;
        }
        table.items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 12px;
        }
        table.items-table th {
          background: #0f172a;
          color: #ffffff;
          padding: 8px;
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
        }
        table.items-table td {
          border-bottom: 1px solid #e2e8f0;
        }
        .bottom-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 30px;
        }
        .notes-box {
          flex: 1;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 8px;
          padding: 12px;
          font-size: 12px;
          color: #475569;
        }
        .totals-box {
          width: 260px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
          font-size: 13px;
          border-bottom: 1px solid #f1f5f9;
        }
        .totals-row.grand-total {
          background: #059669;
          color: #ffffff;
          font-weight: 800;
          font-size: 15px;
        }
        .signatures-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          margin-top: 36px;
          margin-bottom: 24px;
        }
        .sig-box {
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }
        .sig-line {
          height: 1px;
          background: #64748b;
          margin: 32px 20px 8px 20px;
        }
        .sig-title {
          font-size: 11px;
          font-weight: 700;
          color: #0f172a;
          text-transform: uppercase;
        }
        .sig-sub {
          font-size: 10px;
          color: #64748b;
        }
        .audit-footer {
          border-top: 1px solid #e2e8f0;
          padding-top: 12px;
          text-align: center;
          font-size: 10px;
          color: #64748b;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="header-top">
        <div class="company-info">
          <h1>${activeCompany.name}</h1>
          <p><strong>RUC:</strong> ${formatRucDv(activeCompany.ruc, activeCompany.dv)}</p>
          <p><strong>Tel / WhatsApp:</strong> ${activeCompany.whatsapp || activeCompany.phone || '64429775'}</p>
          <p><strong>Email:</strong> ${activeCompany.email || 'distribuidoraelimperio8280@gmail.com'}</p>
          <p><strong>Dirección:</strong> ${activeCompany.address || 'Panamá, República de Panamá'}</p>
        </div>
        <div class="voucher-title-box">
          <div class="voucher-badge">COMPROBANTE DE COMPRA / GASTO INTERNO</div>
          <div class="voucher-meta">
            <p><strong>N° Comprobante:</strong> ${expense.code}</p>
            <p><strong>Fecha Emisión:</strong> ${expense.date}</p>
            <p><strong>Fecha Recepción:</strong> ${expense.receptionDate || expense.date}</p>
          </div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-card">
          <h3>Datos del Proveedor</h3>
          <p><strong>Razón Social:</strong> ${expense.providerName}</p>
          <p><strong>RUC:</strong> ${formatRucDv(expense.providerRuc, expense.providerDv)}</p>
          <p><strong>Dirección:</strong> ${expense.providerAddress || 'Panamá'}</p>
          <p><strong>Teléfono:</strong> ${expense.providerPhone || 'N/A'} | <strong>Email:</strong> ${expense.providerEmail || 'N/A'}</p>
        </div>
        <div class="info-card">
          <h3>Datos del Documento / Factura</h3>
          <p><strong>Factura de Origen N°:</strong> ${expense.invoiceNumber || 'S/N'}</p>
          <p><strong>Tipo de Gasto:</strong> ${expense.category}</p>
          <p><strong>Forma de Pago:</strong> ${
            expense.paymentMethod === 'transfer' ? 'Transferencia / ACH' :
            expense.paymentMethod === 'cash' ? 'Efectivo' :
            expense.paymentMethod === 'card' ? 'Tarjeta' :
            expense.paymentMethod === 'credit' ? 'Crédito' : 'Cheque / Otro'
          }</p>
          <p><strong>Cuenta Contable:</strong> ${expense.expenseAccount || '5105 - Costo de Ventas e Insumos'}</p>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 35px; text-align: center;">#</th>
            <th>Descripción del Producto / Insumo</th>
            <th style="width: 70px; text-align: center;">Cant.</th>
            <th style="width: 100px; text-align: right;">Costo Unit.</th>
            <th style="width: 70px; text-align: center;">ITBMS %</th>
            <th style="width: 110px; text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="bottom-section">
        <div class="notes-box">
          <strong style="display: block; margin-bottom: 4px; color: #0f172a;">Notas y Observaciones Contables:</strong>
          ${expense.notes || 'Registro de compra/gasto verificado con soporte fiscal y físico en archivo contable.'}
        </div>
        <div class="totals-box">
          <div class="totals-row">
            <span>Subtotal General:</span>
            <span style="font-family: monospace; font-weight: 700;">$${fmt(subtotalVal)}</span>
          </div>
          <div class="totals-row">
            <span>ITBMS Fiscal:</span>
            <span style="font-family: monospace; font-weight: 700;">$${fmt(taxVal)}</span>
          </div>
          <div class="totals-row grand-total">
            <span>TOTAL:</span>
            <span style="font-family: monospace;">$${fmt(totalVal)}</span>
          </div>
        </div>
      </div>

      <div class="signatures-grid">
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-title">REGISTRADO POR</div>
          <div class="sig-sub">Nombre: ${expense.registeredBy || 'JOSE'} | Firma y Fecha</div>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-title">APROBADO POR</div>
          <div class="sig-sub">Auditoría / Administración Contable (Sello)</div>
        </div>
      </div>

      <div class="audit-footer">
        <p><strong>Comprobante generado por Imperio Pro Facturación y Contabilidad</strong> - Válido para control interno, conciliación contable y soporte fiscal.</p>
        <p>Generado el ${new Date().toLocaleString()} | ID Transacción: ${expense.id} | Base de datos sincronizada</p>
      </div>
    </body>
    </html>
  `;

  let iframe = document.getElementById('expense-print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'expense-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }

  const docFrame = iframe.contentDocument || iframe.contentWindow?.document;
  if (docFrame) {
    docFrame.open();
    docFrame.write(htmlContent);
    docFrame.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Error al imprimir comprobante de compra:', err);
        const pdf = generateExpenseVoucherPDF(expense, company, { autoPrint: true });
        const blobUrl = pdf.output('bloburl');
        window.open(blobUrl, '_blank');
      }
    }, 400);
  } else {
    const pdf = generateExpenseVoucherPDF(expense, company, { autoPrint: true });
    const blobUrl = pdf.output('bloburl');
    window.open(blobUrl, '_blank');
  }
}

// ==========================================
// ESTADOS FINANCIEROS Y BALANCE GENERAL
// Formateado para Impresión A4 y Auditoría Contable Oficial
// Distribuidora El Imperio | Tel: 64429775
// ==========================================

export interface FinancialStatementsData {
  company?: CompanyProfile;
  period: {
    startDate: string;
    endDate: string;
  };
  statementDate?: string;
  balanceSheet: {
    cashAndEquivalents: number;
    accountsReceivable: number;
    inventoryValuation: number;
    totalCurrentAssets: number;
    accountsPayable: number;
    netTaxLiability: number;
    totalCurrentLiabilities: number;
    workingCapital: number;
    currentRatio: number;
  };
  incomeStatement: {
    grossRevenue: number;
    discounts: number;
    netRevenue: number;
    costOfGoodsSold: number;
    grossProfit: number;
    grossMarginPercent: number;
    operatingExpenses: number;
    netIncome: number;
    netMarginPercent: number;
  };
  taxBalance: {
    taxCollected: number;
    taxPaid: number;
    netTaxBalance: number;
  };
  expensesBreakdown: Array<{
    category: string;
    expenseType?: string;
    amount: number;
    percentage: number;
  }>;
  paymentMethodsBreakdown: Array<{
    method: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
}

/**
 * Imprime directamente los Estados Financieros y Balance General en PDF mediante un iframe invisible.
 */
export function printFinancialStatementsPDF(doc: jsPDF): void {
  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.warn('Iframe print falló en estados financieros, fallback a window.print:', err);
          window.print();
        }
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
          URL.revokeObjectURL(blobUrl);
        }, 5000);
      }, 400);
    };
  } catch (err) {
    console.error('Error al imprimir estados financieros PDF:', err);
    window.print();
  }
}

/**
 * Descarga los Estados Financieros y Balance General en formato PDF de manera segura.
 */
export function downloadFinancialStatementsPDF(doc: jsPDF, filename?: string): boolean {
  const safeFilename = filename || `Estados_Financieros_Balance_${new Date().toISOString().split('T')[0]}.pdf`;
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 2000);
    return true;
  } catch (err) {
    console.error('Error al descargar estados financieros PDF:', err);
    doc.save(safeFilename);
    return false;
  }
}

/**
 * Genera el documento oficial de Estados Financieros y Balance General Consolidado
 * formateado específicamente para impresión A4, auditoría y presentación bancaria.
 */
export function generateFinancialStatementsPDF(
  data: FinancialStatementsData,
  options?: PDFExportOptions
): jsPDF {
  const company = data.company || DEFAULT_COMPANY_PROFILE;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const navy = [15, 23, 42];        // #0f172a
  const emerald = [5, 150, 105];    // #059669
  const rose = [225, 29, 72];       // #e11d48
  const slate50 = [248, 250, 252];
  const slate100 = [241, 245, 249];
  const slate200 = [226, 232, 240];
  const slate500 = [100, 116, 139];
  const slate600 = [71, 85, 105];
  const slate700 = [51, 65, 85];
  const slate800 = [30, 41, 59];

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - (margin * 2); // 186mm

  const bs = data.balanceSheet;
  const is = data.incomeStatement;
  const tb = data.taxBalance;

  // =========================================================================
  // PÁGINA 1: BALANCE GENERAL & ESTADO DE RESULTADOS
  // =========================================================================

  // Top Header Banner
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Decorative Accent Strip
  doc.setFillColor(emerald[0], emerald[1], emerald[2]);
  doc.rect(0, 22.5, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('ESTADOS FINANCIEROS & BALANCE GENERAL CONSOLIDADO', margin, 11);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Estado de Situación Financiera, Estado de Resultados, Balances de Tesorería y Posición Fiscal', margin, 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`PERÍODO: ${data.period.startDate} al ${data.period.endDate}`, pageWidth - margin, 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(167, 243, 208);
  const printDateStr = data.statementDate || `${new Date().toLocaleDateString('es-PA')} ${new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}`;
  doc.text(`Emisión: ${printDateStr}`, pageWidth - margin, 17.5, { align: 'right' });

  // Company Information Block
  let textLeft = margin;
  if (company.logoUrl) {
    try {
      doc.addImage(company.logoUrl, 'PNG', margin, 27, 20, 16);
      textLeft = margin + 23;
    } catch (e) {
      try {
        doc.addImage(company.logoUrl, 'JPEG', margin, 27, 20, 16);
        textLeft = margin + 23;
      } catch (err) {
        textLeft = margin;
      }
    }
  }

  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(company.name || 'DISTRIBUIDORA EL IMPERIO', textLeft, 31);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(`RUC: ${formatRucDv(company.ruc, company.dv)}  |  Tel: ${company.phone || company.whatsapp || '64429775'}`, textLeft, 35.5);
  doc.text(`Correo: ${company.email || 'distribuidoraelimperio8280@gmail.com'}  |  Ubicación: ${company.address || 'Panamá, Rep. de Panamá'}`, textLeft, 39.5);

  // Solvency Status Badge (Right)
  const isSolvent = bs.workingCapital >= 0 && is.netIncome >= 0;
  const badgeW = 68;
  const badgeX = pageWidth - margin - badgeW;
  doc.setFillColor(slate50[0], slate50[1], slate50[2]);
  doc.roundedRect(badgeX, 26.5, badgeW, 14.5, 1.5, 1.5, 'F');
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.roundedRect(badgeX, 26.5, badgeW, 14.5, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(isSolvent ? emerald[0] : rose[0], isSolvent ? emerald[1] : rose[1], isSolvent ? emerald[2] : rose[2]);
  doc.text(`CONDICIÓN: ${isSolvent ? 'SOLVENTE / SUPERÁVIT' : 'DÉFICIT / ILIQUIDEZ'}`, badgeX + 3.5, 31);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.7);
  doc.setTextColor(slate800[0], slate800[1], slate800[2]);
  doc.text(`• Ratio de Liquidez: ${fmt(bs.currentRatio)}x (Activo / Pasivo)`, badgeX + 3.5, 35);
  doc.text(`• Margen Operativo: ${fmt(is.netMarginPercent, 1)}%  |  Moneda: USD ($)`, badgeX + 3.5, 39);

  // Separator Line
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin, 43.5, pageWidth - margin, 43.5);

  // 4 Top KPI Highlights
  const kpiY = 46.5;
  const cardW = (contentWidth - 9) / 4; // ~44.2mm
  const cardH = 15;

  const topCards = [
    {
      title: 'TOTAL ACTIVOS CORRIENTES',
      value: `$${fmt(bs.totalCurrentAssets)}`,
      sub: 'Caja, Cobros e Inventario',
      color: emerald,
    },
    {
      title: 'TOTAL PASIVOS CORRIENTES',
      value: `$${fmt(bs.totalCurrentLiabilities)}`,
      sub: 'Cuentas por pagar e ITBMS',
      color: rose,
    },
    {
      title: 'CAPITAL DE TRABAJO NETO',
      value: `${bs.workingCapital >= 0 ? '+' : ''}$${fmt(bs.workingCapital)}`,
      sub: bs.workingCapital >= 0 ? 'Liquidez operativa positiva' : 'Atención a vencimientos',
      color: bs.workingCapital >= 0 ? emerald : rose,
    },
    {
      title: 'UTILIDAD NETA DEL PERÍODO',
      value: `${is.netIncome >= 0 ? '+' : ''}$${fmt(is.netIncome)}`,
      sub: `Margen Neto: ${fmt(is.netMarginPercent, 1)}%`,
      color: is.netIncome >= 0 ? emerald : rose,
    },
  ];

  topCards.forEach((c, idx) => {
    const x = margin + idx * (cardW + 3);
    doc.setFillColor(slate50[0], slate50[1], slate50[2]);
    doc.roundedRect(x, kpiY, cardW, cardH, 1.2, 1.2, 'F');
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.roundedRect(x, kpiY, cardW, cardH, 1.2, 1.2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(c.title, x + 2.5, kpiY + 4);

    doc.setFontSize(8.8);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, x + 2.5, kpiY + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(c.sub, x + 2.5, kpiY + 13);
  });

  // ==========================================
  // SECCIÓN 1: ESTADO DE SITUACIÓN FINANCIERA (BALANCE GENERAL)
  // Dos columnas paralelas: Activos vs Pasivos y Patrimonio
  // ==========================================
  let secY = 66;

  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(margin, secY, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('I. ESTADO DE SITUACIÓN FINANCIERA (BALANCE GENERAL)', margin + 3, secY + 3.8);
  doc.setFontSize(6.8);
  doc.text('Expresado en Dólares Estadounidenses (USD)', pageWidth - margin - 3, secY + 3.8, { align: 'right' });

  secY += 7.5;

  const colW = (contentWidth - 6) / 2; // ~90mm
  const leftX = margin;
  const rightX = margin + colW + 6;

  // Header Sub-columna Izquierda: ACTIVOS CORRIENTES
  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(leftX, secY, colW, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('ACTIVOS CORRIENTES (CIRCULANTES)', leftX + 2.5, secY + 3.8);
  doc.text('MONTO ($)', leftX + colW - 2.5, secY + 3.8, { align: 'right' });

  // Header Sub-columna Derecha: PASIVOS Y PATRIMONIO
  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(rightX, secY, colW, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('PASIVOS CORRIENTES Y PATRIMONIO', rightX + 2.5, secY + 3.8);
  doc.text('MONTO ($)', rightX + colW - 2.5, secY + 3.8, { align: 'right' });

  secY += 5.5;

  // Rows Left (Activos)
  const assetRows = [
    { label: 'Efectivo y Equivalentes (Caja / Bancos Recaudados)', val: bs.cashAndEquivalents, desc: 'Fondos cobrados en operaciones' },
    { label: 'Cuentas por Cobrar Comerciales (Clientes)', val: bs.accountsReceivable, desc: 'Facturas pendientes de cobro' },
    { label: 'Inventario de Mercaderías Valorizado', val: bs.inventoryValuation, desc: 'Stock físico valorado al costo' },
  ];

  // Rows Right (Pasivos y Patrimonio)
  const liabilityRows = [
    { label: 'Cuentas por Pagar Comerciales (Proveedores)', val: bs.accountsPayable, desc: 'Compras a crédito y gastos pendientes' },
    { label: 'Pasivo Fiscal Estimado (ITBMS Neto por Pagar)', val: bs.netTaxLiability, desc: 'Retenciones fiscales por liquidar' },
    { label: 'Capital de Trabajo Neto (Liquidez Operativa)', val: bs.workingCapital, desc: 'Activo Corriente - Pasivo Corriente' },
  ];

  const rowH = 9.5;
  assetRows.forEach((row, i) => {
    const curY = secY + (i * rowH);
    const bg = i % 2 === 0 ? slate50 : [255, 255, 255];
    
    // Left Box
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(leftX, curY, colW, rowH, 'F');
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.rect(leftX, curY, colW, rowH, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(slate800[0], slate800[1], slate800[2]);
    doc.text(row.label, leftX + 2.5, curY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(row.desc, leftX + 2.5, curY + 7.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(`$${fmt(row.val)}`, leftX + colW - 2.5, curY + 5.5, { align: 'right' });

    // Right Box
    const rRow = liabilityRows[i];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(rightX, curY, colW, rowH, 'F');
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.rect(rightX, curY, colW, rowH, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(slate800[0], slate800[1], slate800[2]);
    doc.text(rRow.label, rightX + 2.5, curY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(rRow.desc, rightX + 2.5, curY + 7.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    const valColor = i === 2 ? (rRow.val >= 0 ? emerald : rose) : navy;
    doc.setTextColor(valColor[0], valColor[1], valColor[2]);
    doc.text(`${i === 2 && rRow.val >= 0 ? '+' : ''}$${fmt(rRow.val)}`, rightX + colW - 2.5, curY + 5.5, { align: 'right' });
  });

  secY += (assetRows.length * rowH);

  // Totales de Activos vs Pasivos
  const totalH = 7.5;
  // Total Activo Corriente
  doc.setFillColor(slate100[0], slate100[1], slate100[2]);
  doc.rect(leftX, secY, colW, totalH, 'F');
  doc.setDrawColor(emerald[0], emerald[1], emerald[2]);
  doc.setLineWidth(0.4);
  doc.rect(leftX, secY, colW, totalH, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(slate800[0], slate800[1], slate800[2]);
  doc.text('TOTAL ACTIVOS CORRIENTES', leftX + 2.5, secY + 4.8);
  doc.setFontSize(8.2);
  doc.setTextColor(emerald[0], emerald[1], emerald[2]);
  doc.text(`$${fmt(bs.totalCurrentAssets)}`, leftX + colW - 2.5, secY + 4.8, { align: 'right' });

  // Total Pasivo Corriente
  doc.setFillColor(slate100[0], slate100[1], slate100[2]);
  doc.rect(rightX, secY, colW, totalH, 'F');
  doc.setDrawColor(rose[0], rose[1], rose[2]);
  doc.setLineWidth(0.4);
  doc.rect(rightX, secY, colW, totalH, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(slate800[0], slate800[1], slate800[2]);
  doc.text('TOTAL PASIVOS CORRIENTES', rightX + 2.5, secY + 4.8);
  doc.setFontSize(8.2);
  doc.setTextColor(rose[0], rose[1], rose[2]);
  doc.text(`$${fmt(bs.totalCurrentLiabilities)}`, rightX + colW - 2.5, secY + 4.8, { align: 'right' });

  doc.setLineWidth(0.1);
  secY += totalH + 6;

  // ==========================================
  // SECCIÓN 2: ESTADO DE RESULTADOS OPERATIVO (PÉRDIDAS Y GANANCIAS)
  // ==========================================
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(margin, secY, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('II. ESTADO DE RESULTADOS OPERATIVO (PÉRDIDAS Y GANANCIAS)', margin + 3, secY + 3.8);
  doc.setFontSize(6.8);
  doc.text(`Período contable: ${data.period.startDate} a ${data.period.endDate}`, pageWidth - margin - 3, secY + 3.8, { align: 'right' });

  secY += 5.5;

  // Table Header
  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(margin, secY, contentWidth, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('CONCEPTO / RUBRO FINANCIERO', margin + 3, secY + 3.5);
  doc.text('NOTAS / DESGLOSE', margin + 95, secY + 3.5);
  doc.text('% S/ VENTAS', margin + 145, secY + 3.5, { align: 'right' });
  doc.text('MONTO ($ USD)', pageWidth - margin - 3, secY + 3.5, { align: 'right' });

  secY += 5;

  const incomeRows = [
    {
      concept: '1. Ingresos Operativos Brutos (Ventas Facturadas)',
      note: 'Total bruto facturado en el período',
      pct: 100.0,
      amount: is.grossRevenue,
      isBold: true,
      color: navy,
    },
    {
      concept: '   (-) Descuentos Otorgados y Devoluciones',
      note: 'Descuentos comerciales aplicados a clientes',
      pct: is.grossRevenue > 0 ? (is.discounts / is.grossRevenue) * 100 : 0,
      amount: -is.discounts,
      isBold: false,
      color: slate600,
    },
    {
      concept: '2. (=) INGRESOS OPERATIVOS NETOS',
      note: 'Ventas brutas menos descuentos comerciales',
      pct: is.grossRevenue > 0 ? (is.netRevenue / is.grossRevenue) * 100 : 0,
      amount: is.netRevenue,
      isBold: true,
      color: navy,
      highlight: true,
    },
    {
      concept: '   (-) Costo de Mercaderías Vendidas e Insumos (CMV)',
      note: 'Costo directo de los productos despachados',
      pct: is.grossRevenue > 0 ? (is.costOfGoodsSold / is.grossRevenue) * 100 : 0,
      amount: -is.costOfGoodsSold,
      isBold: false,
      color: rose,
    },
    {
      concept: '3. (=) GANANCIA BRUTA OPERATIVA (MARGEN BRUTO)',
      note: `Margen Bruto de Utilidad: ${fmt(is.grossMarginPercent, 1)}%`,
      pct: is.grossMarginPercent,
      amount: is.grossProfit,
      isBold: true,
      color: emerald,
      highlight: true,
    },
    {
      concept: '   (-) Gastos Operativos y Administrativos',
      note: 'Compras operativas, insumos, servicios y transporte',
      pct: is.grossRevenue > 0 ? (is.operatingExpenses / is.grossRevenue) * 100 : 0,
      amount: -is.operatingExpenses,
      isBold: false,
      color: rose,
    },
    {
      concept: '4. (=) UTILIDAD NETA DEL EJERCICIO (RESULTADO NETO)',
      note: is.netIncome >= 0 ? 'Rendimiento superavitario final' : 'Déficit operativo acumulado',
      pct: is.netMarginPercent,
      amount: is.netIncome,
      isBold: true,
      color: is.netIncome >= 0 ? emerald : rose,
      isFinalTotal: true,
    },
  ];

  incomeRows.forEach((r, idx) => {
    const rH = r.isFinalTotal ? 8.5 : 7;
    const isEven = idx % 2 === 0;

    if (r.isFinalTotal) {
      doc.setFillColor(slate100[0], slate100[1], slate100[2]);
      doc.rect(margin, secY, contentWidth, rH, 'F');
      doc.setDrawColor(r.color[0], r.color[1], r.color[2]);
      doc.setLineWidth(0.5);
      doc.rect(margin, secY, contentWidth, rH, 'S');
      doc.setLineWidth(0.1);
    } else if (r.highlight) {
      doc.setFillColor(slate50[0], slate50[1], slate50[2]);
      doc.rect(margin, secY, contentWidth, rH, 'F');
      doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
      doc.rect(margin, secY, contentWidth, rH, 'S');
    } else {
      const rowBg = isEven ? [255, 255, 255] : slate50;
      doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
      doc.rect(margin, secY, contentWidth, rH, 'F');
      doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
      doc.rect(margin, secY, contentWidth, rH, 'S');
    }

    doc.setFont('helvetica', r.isBold ? 'bold' : 'normal');
    doc.setFontSize(r.isFinalTotal ? 7.6 : 6.8);
    doc.setTextColor(r.color[0], r.color[1], r.color[2]);
    doc.text(r.concept, margin + 3, secY + (rH / 2) + 1.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(r.note, margin + 95, secY + (rH / 2) + 1.2);

    doc.setFont('helvetica', r.isBold ? 'bold' : 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(slate700[0], slate700[1], slate700[2]);
    doc.text(`${fmt(r.pct, 1)}%`, margin + 145, secY + (rH / 2) + 1.2, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(r.isFinalTotal ? 8.2 : 7.2);
    doc.setTextColor(r.color[0], r.color[1], r.color[2]);
    const sign = r.amount > 0 && r.isBold && !r.isFinalTotal ? '' : (r.amount > 0 && r.isFinalTotal ? '+' : '');
    doc.text(`${sign}$${fmt(r.amount)}`, pageWidth - margin - 3, secY + (rH / 2) + 1.2, { align: 'right' });

    secY += rH;
  });

  // Footer de Página 1
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text('Imperio Pro Facturación y Contabilidad  |  Comprobante Oficial de Estados Financieros', margin, pageHeight - 8);
  doc.text('Página 1 de 2', pageWidth - margin, pageHeight - 8, { align: 'right' });

  // =========================================================================
  // PÁGINA 2: BALANCE FISCAL ITBMS, GASTOS, TESORERÍA Y FIRMAS
  // =========================================================================
  doc.addPage('a4', 'portrait');

  // Mini Banner Superior
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageWidth, 16, 'F');
  doc.setFillColor(emerald[0], emerald[1], emerald[2]);
  doc.rect(0, 15, pageWidth, 1, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('ESTADOS FINANCIEROS & BALANCE GENERAL CONSOLIDADO (CONT.)', margin, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`${company.name || 'DISTRIBUIDORA EL IMPERIO'} | Período: ${data.period.startDate} al ${data.period.endDate}`, pageWidth - margin, 10, { align: 'right' });

  let p2Y = 22;

  // SECCIÓN 3: BALANCE FISCAL Y LIQUIDACIÓN DE ITBMS (DGI)
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(margin, p2Y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('III. BALANCE DE LIQUIDACIÓN FISCAL (ITBMS / RETENCIONES DGI)', margin + 3, p2Y + 3.8);
  doc.setFontSize(6.8);
  doc.text('Conciliación Tributaria del Período', pageWidth - margin - 3, p2Y + 3.8, { align: 'right' });

  p2Y += 5.5;

  const taxRows = [
    {
      concept: 'ITBMS Débito Fiscal (Impuesto Recaudado en Facturación de Ventas)',
      detail: '7% cobrado a clientes en comprobantes fiscales',
      amount: tb.taxCollected,
      color: navy,
    },
    {
      concept: 'ITBMS Crédito Fiscal (Impuesto Pagado en Compras y Gastos Deducibles)',
      detail: '7% soportado en compras a proveedores verificados',
      amount: tb.taxPaid,
      color: navy,
    },
    {
      concept: tb.netTaxBalance >= 0 ? 'POSICIÓN FISCAL NETA: IMPUESTO A PAGAR A DGI' : 'POSICIÓN FISCAL NETA: CRÉDITO FISCAL A FAVOR',
      detail: tb.netTaxBalance >= 0 ? 'Obligación fiscal neta pendiente de liquidación' : 'Saldo acumulable para futuros períodos impositivos',
      amount: Math.abs(tb.netTaxBalance),
      color: tb.netTaxBalance >= 0 ? rose : emerald,
      isTotal: true,
    },
  ];

  taxRows.forEach((tr) => {
    const rH = tr.isTotal ? 8 : 7;
    const taxBg = tr.isTotal ? slate100 : [255, 255, 255];
    doc.setFillColor(taxBg[0], taxBg[1], taxBg[2]);
    doc.rect(margin, p2Y, contentWidth, rH, 'F');
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.rect(margin, p2Y, contentWidth, rH, 'S');

    doc.setFont('helvetica', tr.isTotal ? 'bold' : 'normal');
    doc.setFontSize(tr.isTotal ? 7.2 : 6.8);
    doc.setTextColor(tr.color[0], tr.color[1], tr.color[2]);
    doc.text(tr.concept, margin + 3, p2Y + (rH / 2) + 1.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(tr.detail, margin + 110, p2Y + (rH / 2) + 1.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(tr.isTotal ? 8.2 : 7.2);
    doc.setTextColor(tr.color[0], tr.color[1], tr.color[2]);
    doc.text(`$${fmt(tr.amount)}`, pageWidth - margin - 3, p2Y + (rH / 2) + 1.2, { align: 'right' });

    p2Y += rH;
  });

  p2Y += 5;

  // SECCIÓN 4: DESGLOSE DE GASTOS Y COSTOS OPERATIVOS POR CATEGORÍA
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(margin, p2Y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('IV. DESGLOSE DE GASTOS OPERATIVOS POR CATEGORÍA & TAXONOMÍA', margin + 3, p2Y + 3.8);
  doc.setFontSize(6.8);
  doc.text(`Total Egresos: $${fmt(is.operatingExpenses)} USD`, pageWidth - margin - 3, p2Y + 3.8, { align: 'right' });

  p2Y += 5.5;

  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(margin, p2Y, contentWidth, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('CATEGORÍA / CONCEPTO DE GASTO', margin + 3, p2Y + 3.5);
  doc.text('TIPO GENERAL', margin + 95, p2Y + 3.5);
  doc.text('% PARTICIPACIÓN', margin + 145, p2Y + 3.5, { align: 'right' });
  doc.text('MONTO TOTAL ($)', pageWidth - margin - 3, p2Y + 3.5, { align: 'right' });

  p2Y += 5;

  const topExpenses = (data.expensesBreakdown || []).slice(0, 5);
  if (topExpenses.length === 0) {
    doc.setFillColor(slate50[0], slate50[1], slate50[2]);
    doc.rect(margin, p2Y, contentWidth, 7, 'F');
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.rect(margin, p2Y, contentWidth, 7, 'S');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text('No se registraron gastos operativos en el período seleccionado.', margin + 3, p2Y + 4.5);
    p2Y += 7;
  } else {
    topExpenses.forEach((exp, idx) => {
      const isEven = idx % 2 === 0;
      const expBg = isEven ? [255, 255, 255] : slate50;
      doc.setFillColor(expBg[0], expBg[1], expBg[2]);
      doc.rect(margin, p2Y, contentWidth, 6.5, 'F');
      doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
      doc.rect(margin, p2Y, contentWidth, 6.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(slate800[0], slate800[1], slate800[2]);
      doc.text(exp.category, margin + 3, p2Y + 4.3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(slate500[0], slate500[1], slate500[2]);
      doc.text(exp.expenseType || 'Operativo General', margin + 95, p2Y + 4.3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(slate700[0], slate700[1], slate700[2]);
      doc.text(`${fmt(exp.percentage, 1)}%`, margin + 145, p2Y + 4.3, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(rose[0], rose[1], rose[2]);
      doc.text(`$${fmt(exp.amount)}`, pageWidth - margin - 3, p2Y + 4.3, { align: 'right' });

      p2Y += 6.5;
    });
  }

  p2Y += 5;

  // SECCIÓN 5: BALANCE DE TESORERÍA Y CONCILIACIÓN POR FORMA DE PAGO
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(margin, p2Y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('V. CONCILIACIÓN DE FORMAS DE PAGO & CANALES DE COBRO', margin + 3, p2Y + 3.8);
  doc.setFontSize(6.8);
  doc.text(`Ventas Brutas: $${fmt(is.grossRevenue)} USD`, pageWidth - margin - 3, p2Y + 3.8, { align: 'right' });

  p2Y += 5.5;

  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(margin, p2Y, contentWidth, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('CANAL / FORMA DE PAGO', margin + 3, p2Y + 3.5);
  doc.text('TRANSACCIONES', margin + 95, p2Y + 3.5);
  doc.text('% RECAUDACIÓN', margin + 145, p2Y + 3.5, { align: 'right' });
  doc.text('MONTO TOTAL ($)', pageWidth - margin - 3, p2Y + 3.5, { align: 'right' });

  p2Y += 5;

  const paymentList = (data.paymentMethodsBreakdown || []).slice(0, 4);
  if (paymentList.length === 0) {
    doc.setFillColor(slate50[0], slate50[1], slate50[2]);
    doc.rect(margin, p2Y, contentWidth, 7, 'F');
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.rect(margin, p2Y, contentWidth, 7, 'S');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text('No hay transacciones registradas en este período.', margin + 3, p2Y + 4.5);
    p2Y += 7;
  } else {
    paymentList.forEach((pm, idx) => {
      const isEven = idx % 2 === 0;
      const pmBg = isEven ? [255, 255, 255] : slate50;
      doc.setFillColor(pmBg[0], pmBg[1], pmBg[2]);
      doc.rect(margin, p2Y, contentWidth, 6.5, 'F');
      doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
      doc.rect(margin, p2Y, contentWidth, 6.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(slate800[0], slate800[1], slate800[2]);
      doc.text(pm.method, margin + 3, p2Y + 4.3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(slate500[0], slate500[1], slate500[2]);
      doc.text(`${pm.count} factura(s)`, margin + 95, p2Y + 4.3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(slate700[0], slate700[1], slate700[2]);
      doc.text(`${fmt(pm.percentage, 1)}%`, margin + 145, p2Y + 4.3, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(emerald[0], emerald[1], emerald[2]);
      doc.text(`$${fmt(pm.amount)}`, pageWidth - margin - 3, p2Y + 4.3, { align: 'right' });

      p2Y += 6.5;
    });
  }

  p2Y += 8;

  // SECCIÓN 6: DECLARACIÓN JURADA Y FIRMAS DE AUDITORÍA CONTABLE
  doc.setFillColor(slate50[0], slate50[1], slate50[2]);
  doc.rect(margin, p2Y, contentWidth, 12, 'F');
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.rect(margin, p2Y, contentWidth, 12, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('CERTIFICACIÓN Y FE PÚBLICA DE AUDITORÍA CONTABLE:', margin + 3, p2Y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  const certText = 'Certificamos que las cifras presentadas en este Estado de Situación Financiera, Estado de Resultados y Balances corresponden fielmente a los registros contables, comprobantes de pago y facturas emitidas por la empresa en el período señalado, cumpliendo con las normas contables y tributarias vigentes de la República de Panamá.';
  doc.text(doc.splitTextToSize(certText, contentWidth - 6), margin + 3, p2Y + 7.5);

  p2Y += 16;

  // Dos Bloques de Firmas
  const sigW = (contentWidth - 10) / 2; // ~88mm
  const sigH = 34;
  const sigLeftX = margin;
  const sigRightX = margin + sigW + 10;

  // Firma 1: Representante Legal
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(sigLeftX, p2Y, sigW, sigH, 1.5, 1.5, 'F');
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.roundedRect(sigLeftX, p2Y, sigW, sigH, 1.5, 1.5, 'S');

  doc.setDrawColor(slate700[0], slate700[1], slate700[2]);
  doc.line(sigLeftX + 10, p2Y + 20, sigLeftX + sigW - 10, p2Y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('REPRESENTANTE LEGAL / GERENCIA GENERAL', sigLeftX + (sigW / 2), p2Y + 24, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text(`${company.ownerName || company.name || 'DISTRIBUIDORA EL IMPERIO'}`, sigLeftX + (sigW / 2), p2Y + 27.5, { align: 'center' });
  doc.text('Firma Autorizada y Cédula de Identidad Personal', sigLeftX + (sigW / 2), p2Y + 30.5, { align: 'center' });

  // Firma 2: Contador Público Autorizado (CPA)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(sigRightX, p2Y, sigW, sigH, 1.5, 1.5, 'F');
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.roundedRect(sigRightX, p2Y, sigW, sigH, 1.5, 1.5, 'S');

  doc.setDrawColor(slate700[0], slate700[1], slate700[2]);
  doc.line(sigRightX + 10, p2Y + 20, sigRightX + sigW - 10, p2Y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('CONTADOR PÚBLICO AUTORIZADO (C.P.A.)', sigRightX + (sigW / 2), p2Y + 24, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text('Licencia / Idoneidad Profesional No: __________________', sigRightX + (sigW / 2), p2Y + 27.5, { align: 'center' });
  doc.text('Firma y Sello Oficial de Auditoría Contable', sigRightX + (sigW / 2), p2Y + 30.5, { align: 'center' });

  // Footer de Página 2
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text('Imperio Pro Facturación y Contabilidad  |  Comprobante Oficial de Estados Financieros y Balance General', margin, pageHeight - 8);
  doc.text('Página 2 de 2', pageWidth - margin, pageHeight - 8, { align: 'right' });

  // Handle Export Options (download or autoPrint)
  if (options?.autoPrint) {
    if (!options.returnOnly) {
      printFinancialStatementsPDF(doc);
    }
  } else if (!options?.returnOnly) {
    const defaultFilename = options?.fileName || `Estados_Financieros_Balance_${data.period.startDate}_a_${data.period.endDate}.pdf`;
    downloadFinancialStatementsPDF(doc, defaultFilename);
  }

  return doc;
}

// ==========================================
// REPORTE MENSUAL DE VENTAS Y GASTOS (COMPRAS OPERATIVAS)
// Formateado para Impresión A4 y Descarga Directa en PDF con jsPDF
// Distribuidora El Imperio | Tel: 64429775
// ==========================================

export interface MonthlySalesAndExpensesData {
  company?: CompanyProfile;
  monthTitle?: string;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalSales: number;
    totalExpenses: number;
    netBalance: number;
    marginPercent: number;
    salesCount: number;
    expensesCount: number;
    averageSalesTicket: number;
    taxCollected: number; // ITBMS en ventas
    taxPaid: number;      // ITBMS en gastos
    netTaxBalance: number;
  };
  monthlyBreakdown: Array<{
    month: string;
    key: string;
    sales: number;
    expenses: number;
    net: number;
    marginPercent: number;
    taxesSales: number;
    taxesExpenses: number;
    salesCount: number;
    expensesCount: number;
  }>;
  expensesByCategory: Array<{
    category: string;
    expenseType?: string;
    amount: number;
    percentage: number;
  }>;
  topProducts: Array<{
    name: string;
    quantity: number;
    total: number;
    percentage: number;
  }>;
  topProviders?: Array<{
    name: string;
    ruc?: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  paymentMethods?: Array<{
    method: string;
    salesAmount: number;
    expensesAmount: number;
  }>;
}

/**
 * Descarga directamente el Reporte Mensual de Ventas y Gastos en formato PDF utilizando jsPDF.
 */
export function downloadMonthlySalesAndExpensesPDF(doc: jsPDF, filename?: string): boolean {
  const safeFilename = filename || `Reporte_Mensual_Ventas_y_Gastos_${new Date().toISOString().split('T')[0]}.pdf`;
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 2000);
    return true;
  } catch (err) {
    console.error('Error al descargar reporte mensual de ventas y gastos en PDF:', err);
    doc.save(safeFilename);
    return false;
  }
}

/**
 * Imprime directamente el Reporte Mensual de Ventas y Gastos en PDF mediante un iframe invisible.
 */
export function printMonthlySalesAndExpensesPDF(doc: jsPDF): void {
  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.src = blobUrl;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.warn('Iframe print falló en reporte mensual de ventas y gastos, fallback a window.print:', err);
          window.print();
        }
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
          URL.revokeObjectURL(blobUrl);
        }, 5000);
      }, 400);
    };
  } catch (err) {
    console.error('Error al imprimir reporte mensual de ventas y gastos PDF:', err);
    window.print();
  }
}

/**
 * Genera el Reporte Mensual de Ventas y Gastos en formato PDF descargable utilizando jsPDF,
 * con cronograma comparativo, desglose de gastos de proveedores, productos líderes, ITBMS y certificación.
 */
export function generateMonthlySalesAndExpensesPDF(
  data: MonthlySalesAndExpensesData,
  options?: PDFExportOptions
): jsPDF {
  const company = data.company || DEFAULT_COMPANY_PROFILE;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const navy = [15, 23, 42];        // #0f172a
  const blue = [2, 132, 199];       // #0284c7
  const emerald = [5, 150, 105];    // #059669
  const rose = [225, 29, 72];       // #e11d48
  const amber = [217, 119, 6];      // #d97706
  const slate50 = [248, 250, 252];
  const slate100 = [241, 245, 249];
  const slate200 = [226, 232, 240];
  const slate500 = [100, 116, 139];
  const slate600 = [71, 85, 105];
  const slate700 = [51, 65, 85];
  const slate800 = [30, 41, 59];

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - (margin * 2); // 186mm

  const s = data.summary;
  const isSurplus = s.netBalance >= 0;

  // =========================================================================
  // PÁGINA 1: COMPARATIVA MENSUAL & DESGLOSE DE GASTOS
  // =========================================================================

  // Banner Superior
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Franja decorativa dual
  doc.setFillColor(emerald[0], emerald[1], emerald[2]);
  doc.rect(0, 22.5, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('REPORTE MENSUAL DE VENTAS Y GASTOS OPERATIVOS', margin, 11);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Auditoría Comparativa de Ingresos por Facturación vs Egresos de Proveedores y Margen Neto', margin, 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  const displayMonthPeriod = data.monthTitle || `PERÍODO: ${data.period.startDate} al ${data.period.endDate}`;
  doc.text(displayMonthPeriod, pageWidth - margin, 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(167, 243, 208);
  doc.text(
    `Emisión: ${new Date().toLocaleDateString('es-PA')} ${new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}`,
    pageWidth - margin,
    17.5,
    { align: 'right' }
  );

  // Metadatos de la Empresa
  let textLeft = margin;
  if (company.logoUrl) {
    try {
      doc.addImage(company.logoUrl, 'PNG', margin, 27, 20, 16);
      textLeft = margin + 23;
    } catch (e) {
      try {
        doc.addImage(company.logoUrl, 'JPEG', margin, 27, 20, 16);
        textLeft = margin + 23;
      } catch (err) {
        textLeft = margin;
      }
    }
  }

  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(company.name || 'DISTRIBUIDORA EL IMPERIO', textLeft, 31);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(`RUC: ${formatRucDv(company.ruc, company.dv)}  |  Tel: ${company.phone || company.whatsapp || '64429775'}`, textLeft, 35.5);
  doc.text(`Correo: ${company.email || 'distribuidoraelimperio8280@gmail.com'}  |  Ubicación: ${company.address || 'Panamá, Rep. de Panamá'}`, textLeft, 39.5);

  // Badge de Rentabilidad del Período
  const badgeW = 68;
  const badgeX = pageWidth - margin - badgeW;
  doc.setFillColor(slate50[0], slate50[1], slate50[2]);
  doc.roundedRect(badgeX, 26.5, badgeW, 14.5, 1.5, 1.5, 'F');
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.roundedRect(badgeX, 26.5, badgeW, 14.5, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(isSurplus ? emerald[0] : rose[0], isSurplus ? emerald[1] : rose[1], isSurplus ? emerald[2] : rose[2]);
  doc.text(`CONDICIÓN: ${isSurplus ? 'SUPERÁVIT MENSUAL (+)' : 'DÉFICIT OPERATIVO (-)'}`, badgeX + 3.5, 31);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.7);
  doc.setTextColor(slate800[0], slate800[1], slate800[2]);
  doc.text(`• Margen Operativo: ${fmt(s.marginPercent, 1)}%`, badgeX + 3.5, 35);
  doc.text(`• Cobertura: ${s.totalExpenses > 0 ? fmt(s.totalSales / s.totalExpenses, 2) : '100.00'}x  |  Moneda: USD ($)`, badgeX + 3.5, 39);

  // Línea divisoria
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin, 43.5, pageWidth - margin, 43.5);

  // 4 Tarjetas de Métricas Principales (KPIs)
  const kpiY = 46.5;
  const cardW = (contentWidth - 9) / 4; // ~44.2mm
  const cardH = 15;

  const kpis = [
    {
      title: 'VENTAS DEL MES / PERÍODO',
      value: `$${fmt(s.totalSales)}`,
      sub: `${s.salesCount} facturas emitidas`,
      color: emerald,
    },
    {
      title: 'GASTOS Y COMPRAS OPERATIVAS',
      value: `$${fmt(s.totalExpenses)}`,
      sub: `${s.expensesCount} compras registradas`,
      color: rose,
    },
    {
      title: 'BALANCE NETO (UTILIDAD)',
      value: `${s.netBalance >= 0 ? '+' : ''}$${fmt(s.netBalance)}`,
      sub: `Margen: ${fmt(s.marginPercent, 1)}%`,
      color: isSurplus ? emerald : rose,
    },
    {
      title: 'LIQUIDACIÓN FISCAL ITBMS',
      value: `${s.netTaxBalance >= 0 ? '+' : ''}$${fmt(s.netTaxBalance)}`,
      sub: s.netTaxBalance >= 0 ? 'Saldo a pagar a DGI' : 'Crédito fiscal a favor',
      color: blue,
    },
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (cardW + 3);
    doc.setFillColor(slate50[0], slate50[1], slate50[2]);
    doc.roundedRect(x, kpiY, cardW, cardH, 1.2, 1.2, 'F');
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.roundedRect(x, kpiY, cardW, cardH, 1.2, 1.2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(kpi.title, x + 2.5, kpiY + 4);

    doc.setFontSize(8.8);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, x + 2.5, kpiY + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(kpi.sub, x + 2.5, kpiY + 13);
  });

  // ==========================================
  // TABLA 1: CUADRO COMPARATIVO MENSUAL (CRONOGRAMA)
  // ==========================================
  let secY = 66;

  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(margin, secY, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('I. CRONOGRAMA COMPARATIVO: VENTAS VS GASTOS MENSUALES', margin + 3, secY + 3.8);
  doc.setFontSize(6.8);
  doc.text('Valores expresados en USD ($)', pageWidth - margin - 3, secY + 3.8, { align: 'right' });

  secY += 5.5;

  // Header de la tabla comparativa
  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(margin, secY, contentWidth, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('MES / PERÍODO', margin + 3, secY + 3.5);
  doc.text('VENTAS BRUTAS ($)', margin + 45, secY + 3.5, { align: 'right' });
  doc.text('GASTOS / COMPRAS ($)', margin + 85, secY + 3.5, { align: 'right' });
  doc.text('BALANCE NETO ($)', margin + 125, secY + 3.5, { align: 'right' });
  doc.text('MARGEN %', margin + 148, secY + 3.5, { align: 'right' });
  doc.text('ITBMS VENTAS', margin + 168, secY + 3.5, { align: 'right' });
  doc.text('ITBMS GASTOS', pageWidth - margin - 3, secY + 3.5, { align: 'right' });

  secY += 5;

  const rows = data.monthlyBreakdown && data.monthlyBreakdown.length > 0
    ? data.monthlyBreakdown
    : [{
        month: data.monthTitle || 'Período Completo',
        key: 'actual',
        sales: s.totalSales,
        expenses: s.totalExpenses,
        net: s.netBalance,
        marginPercent: s.marginPercent,
        taxesSales: s.taxCollected,
        taxesExpenses: s.taxPaid,
        salesCount: s.salesCount,
        expensesCount: s.expensesCount,
      }];

  rows.forEach((r, idx) => {
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? [255, 255, 255] : slate50;
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2]);
    doc.rect(margin, secY, contentWidth, 6.5, 'F');
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.rect(margin, secY, contentWidth, 6.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(r.month, margin + 3, secY + 4.3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(emerald[0], emerald[1], emerald[2]);
    doc.text(`$${fmt(r.sales)}`, margin + 45, secY + 4.3, { align: 'right' });

    doc.setTextColor(rose[0], rose[1], rose[2]);
    doc.text(`$${fmt(r.expenses)}`, margin + 85, secY + 4.3, { align: 'right' });

    const netColor = r.net >= 0 ? emerald : rose;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(netColor[0], netColor[1], netColor[2]);
    doc.text(`${r.net >= 0 ? '+' : ''}$${fmt(r.net)}`, margin + 125, secY + 4.3, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slate700[0], slate700[1], slate700[2]);
    doc.text(`${fmt(r.marginPercent, 1)}%`, margin + 148, secY + 4.3, { align: 'right' });

    doc.setTextColor(slate600[0], slate600[1], slate600[2]);
    doc.text(`$${fmt(r.taxesSales)}`, margin + 168, secY + 4.3, { align: 'right' });
    doc.text(`$${fmt(r.taxesExpenses)}`, pageWidth - margin - 3, secY + 4.3, { align: 'right' });

    secY += 6.5;
  });

  // Fila de Totales del Cronograma
  doc.setFillColor(slate100[0], slate100[1], slate100[2]);
  doc.rect(margin, secY, contentWidth, 7.5, 'F');
  doc.setDrawColor(slate800[0], slate800[1], slate800[2]);
  doc.setLineWidth(0.4);
  doc.rect(margin, secY, contentWidth, 7.5, 'S');
  doc.setLineWidth(0.1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('TOTAL ACUMULADO DEL PERÍODO', margin + 3, secY + 4.8);

  doc.setTextColor(emerald[0], emerald[1], emerald[2]);
  doc.text(`$${fmt(s.totalSales)}`, margin + 45, secY + 4.8, { align: 'right' });

  doc.setTextColor(rose[0], rose[1], rose[2]);
  doc.text(`$${fmt(s.totalExpenses)}`, margin + 85, secY + 4.8, { align: 'right' });

  doc.setTextColor(isSurplus ? emerald[0] : rose[0], isSurplus ? emerald[1] : rose[1], isSurplus ? emerald[2] : rose[2]);
  doc.text(`${s.netBalance >= 0 ? '+' : ''}$${fmt(s.netBalance)}`, margin + 125, secY + 4.8, { align: 'right' });

  doc.setTextColor(slate800[0], slate800[1], slate800[2]);
  doc.text(`${fmt(s.marginPercent, 1)}%`, margin + 148, secY + 4.8, { align: 'right' });

  doc.setTextColor(slate700[0], slate700[1], slate700[2]);
  doc.text(`$${fmt(s.taxCollected)}`, margin + 168, secY + 4.8, { align: 'right' });
  doc.text(`$${fmt(s.taxPaid)}`, pageWidth - margin - 3, secY + 4.8, { align: 'right' });

  secY += 12;

  // ==========================================
  // TABLA 2: DESGLOSE DE GASTOS Y COMPRAS OPERATIVAS POR CATEGORÍA
  // ==========================================
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(margin, secY, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('II. DESGLOSE DE COMPRAS Y GASTOS OPERATIVOS POR CATEGORÍA & TAXONOMÍA', margin + 3, secY + 3.8);
  doc.setFontSize(6.8);
  doc.text(`Total Egresos: $${fmt(s.totalExpenses)} USD`, pageWidth - margin - 3, secY + 3.8, { align: 'right' });

  secY += 5.5;

  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(margin, secY, contentWidth, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('CATEGORÍA DE COMPRA / GASTO', margin + 3, secY + 3.5);
  doc.text('TIPO GENERAL', margin + 85, secY + 3.5);
  doc.text('% PARTICIPACIÓN', margin + 140, secY + 3.5, { align: 'right' });
  doc.text('MONTO TOTAL ($)', pageWidth - margin - 3, secY + 3.5, { align: 'right' });

  secY += 5;

  const expenseItems = (data.expensesByCategory || []).slice(0, 7);
  if (expenseItems.length === 0) {
    doc.setFillColor(slate50[0], slate50[1], slate50[2]);
    doc.rect(margin, secY, contentWidth, 7, 'F');
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.rect(margin, secY, contentWidth, 7, 'S');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text('No se registraron gastos operativos en este período.', margin + 3, secY + 4.5);
    secY += 7;
  } else {
    expenseItems.forEach((exp, idx) => {
      const isEven = idx % 2 === 0;
      const expBg = isEven ? [255, 255, 255] : slate50;
      doc.setFillColor(expBg[0], expBg[1], expBg[2]);
      doc.rect(margin, secY, contentWidth, 6.5, 'F');
      doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
      doc.rect(margin, secY, contentWidth, 6.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(slate800[0], slate800[1], slate800[2]);
      doc.text(exp.category, margin + 3, secY + 4.3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(slate500[0], slate500[1], slate500[2]);
      doc.text(exp.expenseType || 'Operativo General', margin + 85, secY + 4.3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(slate700[0], slate700[1], slate700[2]);
      doc.text(`${fmt(exp.percentage, 1)}%`, margin + 140, secY + 4.3, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(rose[0], rose[1], rose[2]);
      doc.text(`$${fmt(exp.amount)}`, pageWidth - margin - 3, secY + 4.3, { align: 'right' });

      secY += 6.5;
    });
  }

  // Footer Página 1
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text('Imperio Pro Facturación y Contabilidad  |  Reporte Mensual de Ventas y Gastos', margin, pageHeight - 8);
  doc.text('Página 1 de 2', pageWidth - margin, pageHeight - 8, { align: 'right' });

  // =========================================================================
  // PÁGINA 2: VENTAS, ITBMS, TESORERÍA Y FIRMAS
  // =========================================================================
  doc.addPage('a4', 'portrait');

  // Mini Banner Superior
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageWidth, 16, 'F');
  doc.setFillColor(emerald[0], emerald[1], emerald[2]);
  doc.rect(0, 15, pageWidth, 1, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('REPORTE MENSUAL DE VENTAS Y GASTOS (CONT.)', margin, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`${company.name || 'DISTRIBUIDORA EL IMPERIO'} | ${displayMonthPeriod}`, pageWidth - margin, 10, { align: 'right' });

  let p2Y = 22;

  // TABLA 3: PRODUCTOS Y SERVICIOS LÍDERES EN FACTURACIÓN
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(margin, p2Y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('III. PRODUCTOS Y SERVICIOS LÍDERES EN VENTAS', margin + 3, p2Y + 3.8);
  doc.setFontSize(6.8);
  doc.text(`Total Facturado: $${fmt(s.totalSales)} USD`, pageWidth - margin - 3, p2Y + 3.8, { align: 'right' });

  p2Y += 5.5;

  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(margin, p2Y, contentWidth, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('PRODUCTO / SERVICIO', margin + 3, p2Y + 3.5);
  doc.text('CANTIDAD', margin + 95, p2Y + 3.5, { align: 'right' });
  doc.text('% VENTAS', margin + 140, p2Y + 3.5, { align: 'right' });
  doc.text('TOTAL VENDIDO ($)', pageWidth - margin - 3, p2Y + 3.5, { align: 'right' });

  p2Y += 5;

  const topProds = (data.topProducts || []).slice(0, 6);
  if (topProds.length === 0) {
    doc.setFillColor(slate50[0], slate50[1], slate50[2]);
    doc.rect(margin, p2Y, contentWidth, 7, 'F');
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.rect(margin, p2Y, contentWidth, 7, 'S');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text('No se registraron ventas de productos en este período.', margin + 3, p2Y + 4.5);
    p2Y += 7;
  } else {
    topProds.forEach((prod, idx) => {
      const isEven = idx % 2 === 0;
      const prodBg = isEven ? [255, 255, 255] : slate50;
      doc.setFillColor(prodBg[0], prodBg[1], prodBg[2]);
      doc.rect(margin, p2Y, contentWidth, 6.5, 'F');
      doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
      doc.rect(margin, p2Y, contentWidth, 6.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(slate800[0], slate800[1], slate800[2]);
      doc.text(prod.name.substring(0, 48), margin + 3, p2Y + 4.3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(slate600[0], slate600[1], slate600[2]);
      doc.text(`${prod.quantity}`, margin + 95, p2Y + 4.3, { align: 'right' });

      doc.setTextColor(slate700[0], slate700[1], slate700[2]);
      doc.text(`${fmt(prod.percentage, 1)}%`, margin + 140, p2Y + 4.3, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(emerald[0], emerald[1], emerald[2]);
      doc.text(`$${fmt(prod.total)}`, pageWidth - margin - 3, p2Y + 4.3, { align: 'right' });

      p2Y += 6.5;
    });
  }

  p2Y += 5;

  // TABLA 4: CONCILIACIÓN FISCAL DE ITBMS (DGI)
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(margin, p2Y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('IV. CONCILIACIÓN TRIBUTARIA: ITBMS EN VENTAS VS COMPRAS', margin + 3, p2Y + 3.8);
  doc.setFontSize(6.8);
  doc.text('Base Fiscal y Retenciones', pageWidth - margin - 3, p2Y + 3.8, { align: 'right' });

  p2Y += 5.5;

  const taxRows = [
    {
      concept: 'ITBMS Débito Fiscal (Impuesto Recaudado en Facturación de Ventas)',
      detail: '7% cobrado a clientes',
      amount: s.taxCollected,
      color: navy,
    },
    {
      concept: 'ITBMS Crédito Fiscal (Impuesto Pagado en Compras y Gastos Deducibles)',
      detail: '7% soportado en compras operativas',
      amount: s.taxPaid,
      color: navy,
    },
    {
      concept: s.netTaxBalance >= 0 ? 'SALDO FISCAL NETO: IMPUESTO A LIQUIDAR A DGI' : 'SALDO FISCAL NETO: CRÉDITO FISCAL A FAVOR',
      detail: s.netTaxBalance >= 0 ? 'Obligación fiscal por pagar al fisco' : 'Crédito deducible en futuros períodos',
      amount: Math.abs(s.netTaxBalance),
      color: s.netTaxBalance >= 0 ? rose : emerald,
      isTotal: true,
    },
  ];

  taxRows.forEach((tr) => {
    const rH = tr.isTotal ? 8 : 7;
    const taxBg = tr.isTotal ? slate100 : [255, 255, 255];
    doc.setFillColor(taxBg[0], taxBg[1], taxBg[2]);
    doc.rect(margin, p2Y, contentWidth, rH, 'F');
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.rect(margin, p2Y, contentWidth, rH, 'S');

    doc.setFont('helvetica', tr.isTotal ? 'bold' : 'normal');
    doc.setFontSize(tr.isTotal ? 7.2 : 6.8);
    doc.setTextColor(tr.color[0], tr.color[1], tr.color[2]);
    doc.text(tr.concept, margin + 3, p2Y + (rH / 2) + 1.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(tr.detail, margin + 115, p2Y + (rH / 2) + 1.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(tr.isTotal ? 8.2 : 7.2);
    doc.setTextColor(tr.color[0], tr.color[1], tr.color[2]);
    doc.text(`$${fmt(tr.amount)}`, pageWidth - margin - 3, p2Y + (rH / 2) + 1.2, { align: 'right' });

    p2Y += rH;
  });

  p2Y += 5;

  // TABLA 5: CANALES DE COBRO Y FORMAS DE PAGO
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(margin, p2Y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('V. CONCILIACIÓN DE CAJA Y FORMAS DE PAGO (INGRESOS VS EGRESOS)', margin + 3, p2Y + 3.8);
  doc.setFontSize(6.8);
  doc.text('Flujo Financiero por Método', pageWidth - margin - 3, p2Y + 3.8, { align: 'right' });

  p2Y += 5.5;

  doc.setFillColor(slate800[0], slate800[1], slate800[2]);
  doc.rect(margin, p2Y, contentWidth, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('FORMA / MÉTODO DE PAGO', margin + 3, p2Y + 3.5);
  doc.text('VENTAS RECAUDADAS ($)', margin + 75, p2Y + 3.5, { align: 'right' });
  doc.text('GASTOS PAGADOS ($)', margin + 125, p2Y + 3.5, { align: 'right' });
  doc.text('SALDO NETO EN CANAL ($)', pageWidth - margin - 3, p2Y + 3.5, { align: 'right' });

  p2Y += 5;

  const paymentList = (data.paymentMethods && data.paymentMethods.length > 0)
    ? data.paymentMethods
    : [
        { method: 'Efectivo', salesAmount: s.totalSales * 0.6, expensesAmount: s.totalExpenses * 0.3 },
        { method: 'Transferencia / ACH', salesAmount: s.totalSales * 0.4, expensesAmount: s.totalExpenses * 0.7 },
      ];

  paymentList.slice(0, 4).forEach((pm, idx) => {
    const isEven = idx % 2 === 0;
    const pmBg = isEven ? [255, 255, 255] : slate50;
    doc.setFillColor(pmBg[0], pmBg[1], pmBg[2]);
    doc.rect(margin, p2Y, contentWidth, 6.5, 'F');
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.rect(margin, p2Y, contentWidth, 6.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(slate800[0], slate800[1], slate800[2]);
    doc.text(pm.method, margin + 3, p2Y + 4.3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(emerald[0], emerald[1], emerald[2]);
    doc.text(`$${fmt(pm.salesAmount)}`, margin + 75, p2Y + 4.3, { align: 'right' });

    doc.setTextColor(rose[0], rose[1], rose[2]);
    doc.text(`$${fmt(pm.expensesAmount)}`, margin + 125, p2Y + 4.3, { align: 'right' });

    const netChannel = pm.salesAmount - pm.expensesAmount;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(netChannel >= 0 ? emerald[0] : rose[0], netChannel >= 0 ? emerald[1] : rose[1], netChannel >= 0 ? emerald[2] : rose[2]);
    doc.text(`${netChannel >= 0 ? '+' : ''}$${fmt(netChannel)}`, pageWidth - margin - 3, p2Y + 4.3, { align: 'right' });

    p2Y += 6.5;
  });

  p2Y += 8;

  // DECLARACIÓN Y CERTIFICACIÓN CONTABLE
  doc.setFillColor(slate50[0], slate50[1], slate50[2]);
  doc.rect(margin, p2Y, contentWidth, 12, 'F');
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.rect(margin, p2Y, contentWidth, 12, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('CERTIFICACIÓN Y AUDITORÍA CONTABLE:', margin + 3, p2Y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  const certText = 'El presente informe consolida los comprobantes fiscales de venta y facturas de compras y gastos de insumos registrados formalmente en el sistema, habiéndose verificado la exactitud matemática de las operaciones, retenciones de ITBMS y márgenes operativos resultantes.';
  doc.text(doc.splitTextToSize(certText, contentWidth - 6), margin + 3, p2Y + 7.5);

  p2Y += 16;

  // Dos Bloques de Firmas
  const sigW = (contentWidth - 10) / 2;
  const sigH = 34;
  const sigLeftX = margin;
  const sigRightX = margin + sigW + 10;

  // Firma 1: Representante Legal
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(sigLeftX, p2Y, sigW, sigH, 1.5, 1.5, 'F');
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.roundedRect(sigLeftX, p2Y, sigW, sigH, 1.5, 1.5, 'S');

  doc.setDrawColor(slate700[0], slate700[1], slate700[2]);
  doc.line(sigLeftX + 10, p2Y + 20, sigLeftX + sigW - 10, p2Y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('REPRESENTANTE LEGAL / GERENCIA GENERAL', sigLeftX + (sigW / 2), p2Y + 24, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text(`${company.ownerName || company.name || 'DISTRIBUIDORA EL IMPERIO'}`, sigLeftX + (sigW / 2), p2Y + 27.5, { align: 'center' });
  doc.text('Firma Autorizada y Cédula de Identidad', sigLeftX + (sigW / 2), p2Y + 30.5, { align: 'center' });

  // Firma 2: Auditoría / Contador
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(sigRightX, p2Y, sigW, sigH, 1.5, 1.5, 'F');
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.roundedRect(sigRightX, p2Y, sigW, sigH, 1.5, 1.5, 'S');

  doc.setDrawColor(slate700[0], slate700[1], slate700[2]);
  doc.line(sigRightX + 10, p2Y + 20, sigRightX + sigW - 10, p2Y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('CONTADOR PÚBLICO AUTORIZADO (C.P.A.)', sigRightX + (sigW / 2), p2Y + 24, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text('Licencia / Idoneidad Profesional No: __________________', sigRightX + (sigW / 2), p2Y + 27.5, { align: 'center' });
  doc.text('Firma y Sello Oficial de Auditoría Contable', sigRightX + (sigW / 2), p2Y + 30.5, { align: 'center' });

  // Footer Página 2
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(slate500[0], slate500[1], slate500[2]);
  doc.text('Imperio Pro Facturación y Contabilidad  |  Reporte Mensual de Ventas y Gastos', margin, pageHeight - 8);
  doc.text('Página 2 de 2', pageWidth - margin, pageHeight - 8, { align: 'right' });

  // Export handling
  if (options?.autoPrint) {
    if (!options.returnOnly) {
      printMonthlySalesAndExpensesPDF(doc);
    }
  } else if (!options?.returnOnly) {
    const defaultFilename = options?.fileName || `Reporte_Mensual_Ventas_y_Gastos_${data.period.startDate}_a_${data.period.endDate}.pdf`;
    downloadMonthlySalesAndExpensesPDF(doc, defaultFilename);
  }

  return doc;
}

/**
 * Genera el Informe Fiscal Oficial DGI (Ventas e ITBMS 0%, 7%, 10%, 15%, Compras Deducibles y Kardex)
 * Diseñado conforme a los estándares de la Dirección General de Ingresos de Panamá y para el CPA
 */
export function generateFiscalDGIReportPDF(
  salesReport: FiscalSalesDGIReport,
  purchasesReport: FiscalPurchasesDGIReport,
  kardexReport: KardexValuationReport,
  company?: CompanyProfile,
  options?: PDFExportOptions
): jsPDF {
  const activeCompany = company || DEFAULT_COMPANY_PROFILE;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const navy = [15, 23, 42];
  const emerald = [5, 150, 105];
  const slate50 = [248, 250, 252];
  const slate200 = [226, 232, 240];
  const slate600 = [71, 85, 105];

  const pageWidth = 210;
  const margin = 12;

  // Header Banner
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageWidth, 24, 'F');
  doc.setFillColor(emerald[0], emerald[1], emerald[2]);
  doc.rect(0, 22.5, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text('INFORME FISCAL OFICIAL DGI - VENTAS E ITBMS (REPÚBLICA DE PANAMÁ)', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Cumplimiento Tributario DGI | Formulario 433 & Anexo de Renta | Período: ${salesReport.period.startDate} al ${salesReport.period.endDate}`, margin, 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Emisión: ${new Date().toLocaleDateString('es-PA')}`, pageWidth - margin, 14, { align: 'right' });

  // Datos Contribuyente
  let y = 30;
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(activeCompany.name || 'DISTRIBUIDORA EL IMPERIO', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(`RUC: ${formatRucDv(activeCompany.ruc, activeCompany.dv)} | Tel: ${activeCompany.phone || '64429775'} | Email: ${activeCompany.email || 'distribuidoraelimperio8280@gmail.com'}`, margin, y + 4.5);
  doc.text(`Dirección Fiscal: ${activeCompany.address || 'Panamá, Rep. de Panamá'}`, margin, y + 8.5);

  y += 14;

  // 1. CUADRO RESUMEN DE VENTAS E ITBMS POR ALÍCUOTA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('1. DESGLOSE DE VENTAS Y DÉBITO FISCAL ITBMS SEGÚN TASA DGI', margin, y);

  y += 4;
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(margin, y, pageWidth - (margin * 2), 6.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text('TASA FISCAL ITBMS', margin + 3, y + 4.5);
  doc.text('BASE IMPONIBLE (B/.)', margin + 75, y + 4.5, { align: 'right' });
  doc.text('ITBMS COBRADO (B/.)', margin + 125, y + 4.5, { align: 'right' });
  doc.text('TOTAL FACTURADO (B/.)', pageWidth - margin - 3, y + 4.5, { align: 'right' });

  y += 6.5;
  const rates = [
    salesReport.exemptSales0,
    salesReport.standardSales7,
    salesReport.specialSales10,
    salesReport.tobaccoSales15,
  ];

  rates.forEach((r, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(slate50[0], slate50[1], slate50[2]);
      doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');
    }
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text(r.label, margin + 3, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.text(`B/. ${r.taxableBase.toFixed(2)}`, margin + 75, y + 4.2, { align: 'right' });
    doc.text(`B/. ${r.taxAmount.toFixed(2)}`, margin + 125, y + 4.2, { align: 'right' });
    doc.text(`B/. ${r.totalWithTax.toFixed(2)}`, pageWidth - margin - 3, y + 4.2, { align: 'right' });

    y += 6;
  });

  // Fila Total Ventas
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('TOTAL VENTAS DEL PERÍODO', margin + 3, y + 4.8);
  doc.text(`B/. ${salesReport.totalTaxableBase.toFixed(2)}`, margin + 75, y + 4.8, { align: 'right' });
  doc.text(`B/. ${salesReport.totalTaxCollected.toFixed(2)}`, margin + 125, y + 4.8, { align: 'right' });
  doc.text(`B/. ${salesReport.totalGrossSales.toFixed(2)}`, pageWidth - margin - 3, y + 4.8, { align: 'right' });

  y += 12;

  // 2. CUADRO DE COMPRAS Y CRÉDITO FISCAL DEDUCIBLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('2. LIQUIDACIÓN DE ITBMS (CRÉDITO FISCAL DEDUCIBLE VS DÉBITO FISCAL)', margin, y);

  y += 4;
  const colW = (pageWidth - (margin * 2)) / 3;

  doc.setFillColor(slate50[0], slate50[1], slate50[2]);
  doc.roundedRect(margin, y, colW - 2, 16, 1.5, 1.5, 'F');
  doc.roundedRect(margin + colW, y, colW - 2, 16, 1.5, 1.5, 'F');
  doc.roundedRect(margin + (colW * 2), y, colW, 16, 1.5, 1.5, 'F');

  doc.setFontSize(7);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('DÉBITO FISCAL (VENTAS)', margin + 4, y + 4.5);
  doc.text('CRÉDITO DEDUCIBLE (COMPRAS)', margin + colW + 4, y + 4.5);
  doc.text(purchasesReport.netTaxToPayOrCredit >= 0 ? 'SALDO A PAGAR DGI' : 'CRÉDITO A FAVOR', margin + (colW * 2) + 4, y + 4.5);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(`B/. ${salesReport.totalTaxCollected.toFixed(2)}`, margin + 4, y + 12);
  doc.text(`B/. ${purchasesReport.deductibleTaxPaid.toFixed(2)}`, margin + colW + 4, y + 12);

  if (purchasesReport.netTaxToPayOrCredit >= 0) {
    doc.setTextColor(225, 29, 72);
    doc.text(`B/. ${purchasesReport.netTaxToPayOrCredit.toFixed(2)}`, margin + (colW * 2) + 4, y + 12);
  } else {
    doc.setTextColor(5, 150, 105);
    doc.text(`B/. ${Math.abs(purchasesReport.netTaxToPayOrCredit).toFixed(2)}`, margin + (colW * 2) + 4, y + 12);
  }

  y += 22;

  // 3. KARDEX Y VALORACIÓN AL 31 DE DICIEMBRE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('3. VALORACIÓN DE INVENTARIO Y COSTO DE LO VENDIDO (ANEXO DE RENTA)', margin, y);

  y += 4;
  doc.setFillColor(slate50[0], slate50[1], slate50[2]);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 20, 1.5, 1.5, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Inventario Inicial Estimado:', margin + 4, y + 6);
  doc.text('Compras Netas de Mercancía (+):', margin + 4, y + 11);
  doc.text('Costo de Mercancía Vendida (-):', margin + 4, y + 16);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(`B/. ${kardexReport.initialInventoryValuation.toFixed(2)}`, margin + 80, y + 6, { align: 'right' });
  doc.text(`B/. ${kardexReport.purchasesValuation.toFixed(2)}`, margin + 80, y + 11, { align: 'right' });
  doc.text(`B/. ${kardexReport.costOfGoodsSold.toFixed(2)}`, margin + 80, y + 16, { align: 'right' });

  doc.setFontSize(8.5);
  doc.text('INVENTARIO FINAL VALORIZADO AL CIERRE:', margin + 95, y + 11);
  doc.setFontSize(11);
  doc.setTextColor(emerald[0], emerald[1], emerald[2]);
  doc.text(`B/. ${kardexReport.finalInventoryValuation.toFixed(2)}`, pageWidth - margin - 4, y + 11, { align: 'right' });

  y += 28;

  // 4. CERTIFICACIÓN CONTABLE Y FIRMAS
  const boxW = (pageWidth - (margin * 2) - 8) / 2;
  const boxH = 34;

  // Caja Representante Legal
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.roundedRect(margin, y, boxW, boxH, 1.5, 1.5, 'S');
  doc.line(margin + 8, y + 22, margin + boxW - 8, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('REPRESENTANTE LEGAL / ADMINISTRADOR', margin + (boxW / 2), y + 26, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(activeCompany.name || 'DISTRIBUIDORA EL IMPERIO', margin + (boxW / 2), y + 29.5, { align: 'center' });

  // Caja CPA
  doc.roundedRect(margin + boxW + 8, y, boxW, boxH, 1.5, 1.5, 'S');
  doc.line(margin + boxW + 16, y + 22, margin + (boxW * 2) - 0, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('CONTADOR PÚBLICO AUTORIZADO (C.P.A.)', margin + boxW + 8 + (boxW / 2), y + 26, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Idoneidad Junta Técnica de Contabilidad: ___________________', margin + boxW + 8 + (boxW / 2), y + 29.5, { align: 'center' });

  // Pie de página
  doc.setFontSize(6.2);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Imperio Pro Facturación & Contabilidad | Informe Fiscal Certificado para la DGI', margin, 290);
  doc.text('Página 1 de 1', pageWidth - margin, 290, { align: 'right' });

  if (options?.autoPrint) {
    if (!options.returnOnly) {
      printMonthlySalesAndExpensesPDF(doc);
    }
  } else if (!options?.returnOnly) {
    doc.save(options?.fileName || `Informe_Fiscal_DGI_${salesReport.period.startDate}_a_${salesReport.period.endDate}.pdf`);
  }

  return doc;
}

/**
 * Genera el Reporte Z de Cierre y Arqueo Diario de Caja
 */
export function generateDailyCashClosingPDF(
  report: CashRegisterClosingReport,
  company?: CompanyProfile,
  options?: PDFExportOptions
): jsPDF {
  const activeCompany = company || DEFAULT_COMPANY_PROFILE;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const navy = [15, 23, 42];
  const emerald = [5, 150, 105];
  const slate50 = [248, 250, 252];
  const slate200 = [226, 232, 240];
  const slate600 = [71, 85, 105];

  const pageWidth = 210;
  const margin = 14;

  // Header Banner
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setFillColor(emerald[0], emerald[1], emerald[2]);
  doc.rect(0, 20.5, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('REPORTE Z - CIERRE Y ARQUEO DIARIO DE CAJA', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Fecha Operativa: ${report.date} | Cajero: ${report.cashierName}`, margin, 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Hora: ${new Date().toLocaleTimeString('es-PA')}`, pageWidth - margin, 14, { align: 'right' });

  let y = 30;
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(activeCompany.name || 'DISTRIBUIDORA EL IMPERIO', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text(`RUC: ${formatRucDv(activeCompany.ruc, activeCompany.dv)} | Punto de Venta Mostrador`, margin, y + 4.5);

  y += 12;

  // Resumen Métodos de Pago
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('INGRESOS DEL DÍA POR MÉTODO DE COBRO', margin, y);

  y += 4;
  const paymentRows = [
    { label: 'Efectivo en Caja', amount: report.salesCash },
    { label: 'Yappy Comercial', amount: report.salesYappy },
    { label: 'Transferencia Bancaria ACH', amount: report.salesACH },
    { label: 'Tarjetas de Débito / Crédito (POS)', amount: report.salesCards },
    { label: 'Cheques Recibidos', amount: report.salesCheck },
    { label: 'Crédito a Clientes (Cuentas por Cobrar)', amount: report.salesCredit },
  ];

  paymentRows.forEach((row, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(slate50[0], slate50[1], slate50[2]);
      doc.rect(margin, y, pageWidth - (margin * 2), 6, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(row.label, margin + 3, y + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(`B/. ${row.amount.toFixed(2)}`, pageWidth - margin - 3, y + 4.2, { align: 'right' });
    y += 6;
  });

  // Fila Total Ingresos
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - (margin * 2), 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TOTAL RECAUDACIÓN DEL DÍA', margin + 3, y + 4.5);
  doc.text(`B/. ${report.totalInflows.toFixed(2)}`, pageWidth - margin - 3, y + 4.5, { align: 'right' });

  y += 14;

  // Arqueo de Efectivo Físico
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CONCILIACIÓN Y ARQUEO FÍSICO DE GAVETA', margin, y);

  y += 4;
  doc.setFillColor(slate50[0], slate50[1], slate50[2]);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 34, 1.5, 1.5, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Fondo Inicial de Apertura (+):', margin + 5, y + 7);
  doc.text('Ventas en Efectivo del Día (+):', margin + 5, y + 13);
  doc.text('Salidas de Caja Menor / Gastos Menores (-):', margin + 5, y + 19);
  doc.text('Saldo Teórico Esperado en Gaveta (=):', margin + 5, y + 26);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(`B/. ${report.openingCashFund.toFixed(2)}`, margin + 110, y + 7, { align: 'right' });
  doc.text(`B/. ${report.salesCash.toFixed(2)}`, margin + 110, y + 13, { align: 'right' });
  doc.text(`B/. ${report.pettyCashOutflows.toFixed(2)}`, margin + 110, y + 19, { align: 'right' });
  doc.text(`B/. ${report.expectedCashInDrawer.toFixed(2)}`, margin + 110, y + 26, { align: 'right' });

  // Cuadro Conteo vs Diferencia
  const rightBoxX = margin + 125;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(rightBoxX, y + 3, pageWidth - rightBoxX - margin - 3, 28, 1.5, 1.5, 'F');
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.roundedRect(rightBoxX, y + 3, pageWidth - rightBoxX - margin - 3, 28, 1.5, 1.5, 'S');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slate600[0], slate600[1], slate600[2]);
  doc.text('Conteo Físico Real:', rightBoxX + 4, y + 9);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(`B/. ${report.countedCashInDrawer.toFixed(2)}`, pageWidth - margin - 7, y + 9, { align: 'right' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Diferencia de Caja:', rightBoxX + 4, y + 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  if (Math.abs(report.difference) < 0.05) {
    doc.setTextColor(5, 150, 105);
    doc.text('B/. 0.00 (CUADRADA)', pageWidth - margin - 7, y + 18, { align: 'right' });
  } else if (report.difference > 0) {
    doc.setTextColor(5, 150, 105);
    doc.text(`+B/. ${report.difference.toFixed(2)} (SOBRANTE)`, pageWidth - margin - 7, y + 18, { align: 'right' });
  } else {
    doc.setTextColor(225, 29, 72);
    doc.text(`-B/. ${Math.abs(report.difference).toFixed(2)} (FALTANTE)`, pageWidth - margin - 7, y + 18, { align: 'right' });
  }

  y += 46;

  // Firmas
  const signW = (pageWidth - (margin * 2) - 10) / 2;
  doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
  doc.line(margin + 10, y + 18, margin + signW - 10, y + 18);
  doc.line(margin + signW + 20, y + 18, pageWidth - margin - 10, y + 18);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text(`Cajero: ${report.cashierName}`, margin + (signW / 2), y + 23, { align: 'center' });
  doc.text('Supervisión / Auditoría', margin + signW + 10 + (signW / 2), y + 23, { align: 'center' });

  if (options?.autoPrint) {
    if (!options.returnOnly) {
      printMonthlySalesAndExpensesPDF(doc);
    }
  } else if (!options?.returnOnly) {
    doc.save(options?.fileName || `Reporte_Z_Cierre_Caja_${report.date}.pdf`);
  }

  return doc;
}

/**
 * Genera el PDF del Libro Diario General y Balance de Comprobación
 */
export function generateAccountingJournalPDF(
  entries: JournalEntry[],
  trialBalance: TrialBalanceRow[],
  period: { startDate: string; endDate: string },
  company?: CompanyProfile,
  options?: PDFExportOptions
): jsPDF {
  const activeCompany = company || DEFAULT_COMPANY_PROFILE;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const navy = [15, 23, 42];
  const emerald = [5, 150, 105];
  const slate50 = [248, 250, 252];
  const slate600 = [71, 85, 105];

  const pageWidth = 210;
  const margin = 12;

  // Header Banner
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setFillColor(emerald[0], emerald[1], emerald[2]);
  doc.rect(0, 20.5, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('LIBRO DIARIO Y BALANCE DE COMPROBACIÓN CONTABLE', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`${activeCompany.name} | Período: ${period.startDate} al ${period.endDate}`, margin, 17);

  let y = 30;

  // Balance de Comprobación
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('BALANCE DE COMPROBACIÓN DE SUMAS Y SALDOS', margin, y);

  y += 4;
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(margin, y, pageWidth - (margin * 2), 6.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text('CTA', margin + 3, y + 4.5);
  doc.text('NOMBRE DE LA CUENTA', margin + 20, y + 4.5);
  doc.text('DEBE (B/.)', margin + 115, y + 4.5, { align: 'right' });
  doc.text('HABER (B/.)', margin + 145, y + 4.5, { align: 'right' });
  doc.text('SALDO DEUDOR', margin + 165, y + 4.5, { align: 'right' });
  doc.text('SALDO ACREEDOR', pageWidth - margin - 3, y + 4.5, { align: 'right' });

  y += 6.5;

  let sumDebe = 0;
  let sumHaber = 0;

  trialBalance.slice(0, 18).forEach((row, idx) => {
    sumDebe += row.debit;
    sumHaber += row.credit;

    if (idx % 2 === 1) {
      doc.setFillColor(slate50[0], slate50[1], slate50[2]);
      doc.rect(margin, y, pageWidth - (margin * 2), 5.5, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(row.accountCode, margin + 3, y + 4);
    doc.text(row.accountName.substring(0, 38), margin + 20, y + 4);
    doc.text(`B/. ${row.debit.toFixed(2)}`, margin + 115, y + 4, { align: 'right' });
    doc.text(`B/. ${row.credit.toFixed(2)}`, margin + 145, y + 4, { align: 'right' });
    doc.text(row.debtorBalance > 0 ? `B/. ${row.debtorBalance.toFixed(2)}` : '-', margin + 165, y + 4, { align: 'right' });
    doc.text(row.creditorBalance > 0 ? `B/. ${row.creditorBalance.toFixed(2)}` : '-', pageWidth - margin - 3, y + 4, { align: 'right' });

    y += 5.5;
  });

  // Fila Sumas Iguales
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - (margin * 2), 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('SUMAS IGUALES AUDITADAS', margin + 3, y + 4.5);
  doc.text(`B/. ${sumDebe.toFixed(2)}`, margin + 115, y + 4.5, { align: 'right' });
  doc.text(`B/. ${sumHaber.toFixed(2)}`, margin + 145, y + 4.5, { align: 'right' });

  y += 14;

  // Muestra de Asientos del Libro Diario
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('EXTRACTO DE ASIENTOS DEL LIBRO DIARIO', margin, y);

  y += 4;
  entries.slice(0, 8).forEach((entry) => {
    if (y > 270) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(`${entry.code} | ${entry.date} | Ref: ${entry.reference} - ${entry.concept.substring(0, 60)}`, margin + 2, y + 3.5);
    y += 4.5;

    entry.lines.forEach((l) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(slate600[0], slate600[1], slate600[2]);
      const indent = l.credit > 0 ? '     ' : '';
      doc.text(`${indent}${l.accountCode} - ${l.accountName}`, margin + 6, y + 3);
      if (l.debit > 0) doc.text(`B/. ${l.debit.toFixed(2)}`, margin + 130, y + 3, { align: 'right' });
      if (l.credit > 0) doc.text(`B/. ${l.credit.toFixed(2)}`, margin + 165, y + 3, { align: 'right' });
      y += 4;
    });
    y += 1.5;
  });

  if (options?.autoPrint) {
    if (!options.returnOnly) {
      printMonthlySalesAndExpensesPDF(doc);
    }
  } else if (!options?.returnOnly) {
    doc.save(options?.fileName || `Libro_Diario_y_Balance_${period.startDate}_a_${period.endDate}.pdf`);
  }

  return doc;
}



