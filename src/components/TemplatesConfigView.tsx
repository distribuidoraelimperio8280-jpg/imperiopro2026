import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Sparkles, 
  CheckCircle2, 
  FileText, 
  Layout, 
  Type, 
  Printer, 
  Save, 
  QrCode, 
  Sliders, 
  Eye, 
  ShieldCheck, 
  Image as ImageIcon,
  ChevronRight,
  Info
} from 'lucide-react';
import { db } from '../db/indexedDB';
import { useLiveQuery } from 'dexie-react-hooks';
import type { InvoiceTemplateConfig, CompanyProfile } from '../types';
import { generateInvoicePDF, formatRucDv } from '../services/pdfService';

// Definition of 25 Templates
export interface TemplatePreset {
  id: string; // '1' to '25'
  name: string;
  category: 'modern' | 'executive' | 'minimal' | 'tech' | 'creative' | 'fiscal';
  description: string;
  primaryColor: string;
  accentColor: string;
  headerBgColor: string;
  fontFamily: 'sans' | 'serif' | 'mono' | 'geometric';
  headerStyle: 'standard' | 'full-banner' | 'centered' | 'split-side';
  tableStyle: 'striped' | 'minimal' | 'bordered' | 'solid-header';
  borderRadius: 'none' | 'rounded' | 'large';
  tag: string;
}

export const TEMPLATES_CATALOG: TemplatePreset[] = [
  // Modernas y Contemporáneas (1-5)
  {
    id: '1',
    name: 'Alegra ERP Modern Classic',
    category: 'modern',
    description: 'El estándar corporativo moderno con cabecera azul, líneas limpias y diseño equilibrado.',
    primaryColor: '#0284c7',
    accentColor: '#38bdf8',
    headerBgColor: '#f8fafc',
    fontFamily: 'sans',
    headerStyle: 'standard',
    tableStyle: 'striped',
    borderRadius: 'rounded',
    tag: 'Popular'
  },
  {
    id: '2',
    name: 'Nordic Slate Minimalist',
    category: 'minimal',
    description: 'Inspiración escandinava con tonos gris pizarra, tipografía espaciosa y máxima pulcritud.',
    primaryColor: '#334155',
    accentColor: '#64748b',
    headerBgColor: '#f1f5f9',
    fontFamily: 'sans',
    headerStyle: 'standard',
    tableStyle: 'minimal',
    borderRadius: 'none',
    tag: 'Minimalista'
  },
  {
    id: '3',
    name: 'Emerald Commerce Pro',
    category: 'modern',
    description: 'Verde esmeralda vibrante ideal para empresas de retail, servicios sostenibles y comercio.',
    primaryColor: '#059669',
    accentColor: '#34d399',
    headerBgColor: '#ecfdf5',
    fontFamily: 'sans',
    headerStyle: 'full-banner',
    tableStyle: 'striped',
    borderRadius: 'rounded',
    tag: 'Contemporánea'
  },
  {
    id: '4',
    name: 'Indigo Pulse Creative',
    category: 'creative',
    description: 'Tonos púrpura e índigo con estilo vanguardista para agencias, diseñadores y consultoría.',
    primaryColor: '#4f46e5',
    accentColor: '#818cf8',
    headerBgColor: '#eef2ff',
    fontFamily: 'geometric',
    headerStyle: 'standard',
    tableStyle: 'solid-header',
    borderRadius: 'large',
    tag: 'Creativa'
  },
  {
    id: '5',
    name: 'Crimson Executive Elite',
    category: 'executive',
    description: 'Rojo carmesí profundo y elegante que transmite fuerza comercial, prestigio y solidez.',
    primaryColor: '#be123c',
    accentColor: '#fb7185',
    headerBgColor: '#fff1f2',
    fontFamily: 'serif',
    headerStyle: 'standard',
    tableStyle: 'striped',
    borderRadius: 'none',
    tag: 'Ejecutiva'
  },

  // Ejecutivas y Corporativas (6-10)
  {
    id: '6',
    name: 'Royal Navy Financial',
    category: 'executive',
    description: 'Azul marino institucional con detalles metálicos. Perfecto para firmas legales y contables.',
    primaryColor: '#1e3a8a',
    accentColor: '#60a5fa',
    headerBgColor: '#eff6ff',
    fontFamily: 'sans',
    headerStyle: 'full-banner',
    tableStyle: 'bordered',
    borderRadius: 'rounded',
    tag: 'Financiera'
  },
  {
    id: '7',
    name: 'Boutique Elegance Serif',
    category: 'minimal',
    description: 'Encabezados con fuentes Serif sofisticadas y fondo crema cálido para tiendas exclusivas.',
    primaryColor: '#78350f',
    accentColor: '#d97706',
    headerBgColor: '#fef3c7',
    fontFamily: 'serif',
    headerStyle: 'centered',
    tableStyle: 'minimal',
    borderRadius: 'rounded',
    tag: 'Lujo'
  },
  {
    id: '8',
    name: 'Corporate Charcoal Grid',
    category: 'executive',
    description: 'Estructura rígida de cuadrícula industrial en gris carbón. Gran precisión visual.',
    primaryColor: '#18181b',
    accentColor: '#a1a1aa',
    headerBgColor: '#fafafa',
    fontFamily: 'sans',
    headerStyle: 'standard',
    tableStyle: 'bordered',
    borderRadius: 'none',
    tag: 'Corporativa'
  },
  {
    id: '9',
    name: 'Teal Balance Corporate',
    category: 'modern',
    description: 'Azul verdoso corporativo con contraste equilibrado y tablas de alta visibilidad.',
    primaryColor: '#0d9488',
    accentColor: '#2dd4bf',
    headerBgColor: '#f0fdfa',
    fontFamily: 'geometric',
    headerStyle: 'standard',
    tableStyle: 'solid-header',
    borderRadius: 'rounded',
    tag: 'Contemporánea'
  },
  {
    id: '10',
    name: 'Sunset Coral Dynamic',
    category: 'creative',
    description: 'Naranja coral cálido con alto impacto visual, ideal para eventos, gastronomía y tecnología.',
    primaryColor: '#ea580c',
    accentColor: '#fb923c',
    headerBgColor: '#fff7ed',
    fontFamily: 'sans',
    headerStyle: 'full-banner',
    tableStyle: 'striped',
    borderRadius: 'large',
    tag: 'Cálida'
  },

  // Tech y Creativas (11-15)
  {
    id: '11',
    name: 'Cyber Dark Mode Tech',
    category: 'tech',
    description: 'Estilo tecnológico con cabecera oscura tipo consola y acentos verde cian deslumbrante.',
    primaryColor: '#0f172a',
    accentColor: '#06b6d4',
    headerBgColor: '#0f172a',
    fontFamily: 'mono',
    headerStyle: 'full-banner',
    tableStyle: 'solid-header',
    borderRadius: 'rounded',
    tag: 'Tech'
  },
  {
    id: '12',
    name: 'Amethyst Violet SaaS',
    category: 'creative',
    description: 'Inspirada en las mejores empresas de software SaaS, con cabecera lavanda y estilo pulido.',
    primaryColor: '#7e22ce',
    accentColor: '#c084fc',
    headerBgColor: '#faf5ff',
    fontFamily: 'geometric',
    headerStyle: 'split-side',
    tableStyle: 'minimal',
    borderRadius: 'large',
    tag: 'SaaS'
  },
  {
    id: '13',
    name: 'Monochrome High Contrast',
    category: 'minimal',
    description: 'Blanco y negro puro sin distracciones de color. Imprime limpio y ahorra tinta.',
    primaryColor: '#000000',
    accentColor: '#525252',
    headerBgColor: '#ffffff',
    fontFamily: 'mono',
    headerStyle: 'centered',
    tableStyle: 'bordered',
    borderRadius: 'none',
    tag: 'Ahorro Tinta'
  },
  {
    id: '14',
    name: 'Split Side Navy Modern',
    category: 'modern',
    description: 'Columna lateral izquierda distintiva con logo e información de la compañía.',
    primaryColor: '#1e293b',
    accentColor: '#38bdf8',
    headerBgColor: '#f8fafc',
    fontFamily: 'sans',
    headerStyle: 'split-side',
    tableStyle: 'striped',
    borderRadius: 'rounded',
    tag: 'Innovadora'
  },
  {
    id: '15',
    name: 'Soft Glass Pastel',
    category: 'creative',
    description: 'Bordes finos pastel, esquinas curvas elegantes y cajas de totales destacadas.',
    primaryColor: '#2563eb',
    accentColor: '#93c5fd',
    headerBgColor: '#f0f9ff',
    fontFamily: 'sans',
    headerStyle: 'standard',
    tableStyle: 'striped',
    borderRadius: 'large',
    tag: 'Fresco'
  },

  // Fiscales y Oficiales (16-20)
  {
    id: '16',
    name: 'Oficial Fiscal DGI / SUNAT',
    category: 'fiscal',
    description: 'Formato estándar fiscal con caja destacada de RUC, sello digital y desglose de impuestos.',
    primaryColor: '#1d4ed8',
    accentColor: '#60a5fa',
    headerBgColor: '#f8fafc',
    fontFamily: 'sans',
    headerStyle: 'standard',
    tableStyle: 'bordered',
    borderRadius: 'none',
    tag: 'Oficial Fiscal'
  },
  {
    id: '17',
    name: 'Compact Point-of-Sale (POS)',
    category: 'fiscal',
    description: 'Estructura vertical optimizada para lectura ultra rápida y formato simplificado.',
    primaryColor: '#374151',
    accentColor: '#9ca3af',
    headerBgColor: '#f9fafb',
    fontFamily: 'sans',
    headerStyle: 'centered',
    tableStyle: 'minimal',
    borderRadius: 'none',
    tag: 'Compacta'
  },
  {
    id: '18',
    name: 'Gold Executive Deluxe',
    category: 'executive',
    description: 'Detalles en dorado champán con negro profundo para servicios de alto valor y lujo.',
    primaryColor: '#854d0e',
    accentColor: '#eab308',
    headerBgColor: '#fefce8',
    fontFamily: 'serif',
    headerStyle: 'full-banner',
    tableStyle: 'solid-header',
    borderRadius: 'rounded',
    tag: 'Exclusiva'
  },
  {
    id: '19',
    name: 'Forest Green Eco',
    category: 'modern',
    description: 'Verde bosque sobrio enfocado en empresas industriales, agrícolas y sostenibles.',
    primaryColor: '#15803d',
    accentColor: '#4ade80',
    headerBgColor: '#f0fdf4',
    fontFamily: 'sans',
    headerStyle: 'standard',
    tableStyle: 'striped',
    borderRadius: 'rounded',
    tag: 'Ecológica'
  },
  {
    id: '20',
    name: 'Steel Slate Industrial',
    category: 'executive',
    description: 'Tono acero con resaltado de ítems y cabeceras de columnas sólidas de alto contraste.',
    primaryColor: '#475569',
    accentColor: '#94a3b8',
    headerBgColor: '#f8fafc',
    fontFamily: 'sans',
    headerStyle: 'standard',
    tableStyle: 'solid-header',
    borderRadius: 'none',
    tag: 'Industrial'
  },

  // Contemporáneas Extra (21-25)
  {
    id: '21',
    name: 'Ocean Gradient Wave',
    category: 'modern',
    description: 'Cabecera degradada de azul marino a azul cian con aspecto visual contemporáneo.',
    primaryColor: '#0369a1',
    accentColor: '#38bdf8',
    headerBgColor: '#e0f2fe',
    fontFamily: 'geometric',
    headerStyle: 'full-banner',
    tableStyle: 'striped',
    borderRadius: 'large',
    tag: 'Vanguardista'
  },
  {
    id: '22',
    name: 'Retro Monospace Tech',
    category: 'tech',
    description: 'Aesthetic retro informático con fuente código de máquina y líneas divisorias dobles.',
    primaryColor: '#1e293b',
    accentColor: '#f59e0b',
    headerBgColor: '#f8fafc',
    fontFamily: 'mono',
    headerStyle: 'centered',
    tableStyle: 'bordered',
    borderRadius: 'none',
    tag: 'Retro'
  },
  {
    id: '23',
    name: 'Rose Gold Boutique',
    category: 'creative',
    description: 'Paleta delicada rosa elegante y bronce para spas, belleza, moda y eventos.',
    primaryColor: '#9f1239',
    accentColor: '#fb7185',
    headerBgColor: '#fff1f2',
    fontFamily: 'serif',
    headerStyle: 'centered',
    tableStyle: 'minimal',
    borderRadius: 'large',
    tag: 'Boutique'
  },
  {
    id: '24',
    name: 'Cobalt Shield Security',
    category: 'fiscal',
    description: 'Azul cobalto de alta confianza con recuadro doble para certificación y firma.',
    primaryColor: '#1d4ed8',
    accentColor: '#3b82f6',
    headerBgColor: '#eff6ff',
    fontFamily: 'sans',
    headerStyle: 'standard',
    tableStyle: 'solid-header',
    borderRadius: 'rounded',
    tag: 'Segura'
  },
  {
    id: '25',
    name: 'Ultra Clean Studio',
    category: 'minimal',
    description: 'El resumen máximo de diseño: sin adornos innecesarios, tipografía pulida y máxima legibilidad.',
    primaryColor: '#18181b',
    accentColor: '#71717a',
    headerBgColor: '#ffffff',
    fontFamily: 'geometric',
    headerStyle: 'standard',
    tableStyle: 'minimal',
    borderRadius: 'rounded',
    tag: 'Ultra Clean'
  },
];

// Color Palette presets
const COLOR_PRESETS = [
  { name: 'Azul Alegra ERP', primary: '#0284c7', accent: '#38bdf8', bg: '#f8fafc' },
  { name: 'Azul Marino Real', primary: '#1e3a8a', accent: '#60a5fa', bg: '#eff6ff' },
  { name: 'Verde Esmeralda', primary: '#059669', accent: '#34d399', bg: '#ecfdf5' },
  { name: 'Rojo Carmesí', primary: '#be123c', accent: '#fb7185', bg: '#fff1f2' },
  { name: 'Púrpura Índigo', primary: '#4f46e5', accent: '#818cf8', bg: '#eef2ff' },
  { name: 'Naranja Sunset', primary: '#ea580c', accent: '#fb923c', bg: '#fff7ed' },
  { name: 'Gris Carbón Pro', primary: '#18181b', accent: '#a1a1aa', bg: '#fafafa' },
  { name: 'Turquesa Teal', primary: '#0d9488', accent: '#2dd4bf', bg: '#f0fdfa' },
  { name: 'Dorado Ejecutivo', primary: '#854d0e', accent: '#eab308', bg: '#fefce8' },
  { name: 'Verde Bosque Eco', primary: '#15803d', accent: '#4ade80', bg: '#f0fdf4' },
];

export const TemplatesConfigView: React.FC = () => {
  const companyProfile = useLiveQuery(() => db.companyProfile.get('default'), []);

  // Category filter for the 25 templates
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Active Template State (initialized from DB or fallback to Template #1)
  const [activeConfig, setActiveConfig] = useState<InvoiceTemplateConfig>({
    templateId: '1',
    templateName: 'Alegra ERP Modern Classic',
    category: 'modern',
    primaryColor: '#0284c7',
    accentColor: '#38bdf8',
    headerBgColor: '#f8fafc',
    fontFamily: 'sans',
    headerStyle: 'standard',
    tableStyle: 'striped',
    borderRadius: 'rounded',
    showLogo: true,
    showQRCode: true,
    showTaxBreakdown: true,
    showWatermark: true,
    watermarkText: 'PAGADO',
    customFooterNote: 'Gracias por su preferencia. Factura emitida en cumplimiento de normativas vigentes.',
    bankDetailsNote: 'Pagos por transferencia: Banco General - Cta Ahorros N° 04-98-12-345678-9',
  });

  // Sync DB when loaded
  useEffect(() => {
    if (companyProfile?.templateConfig) {
      setActiveConfig(companyProfile.templateConfig);
    }
  }, [companyProfile]);

  // Apply a template preset from catalog
  const handleSelectPreset = (preset: TemplatePreset) => {
    setActiveConfig((prev) => ({
      ...prev,
      templateId: preset.id,
      templateName: preset.name,
      category: preset.category,
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
      headerBgColor: preset.headerBgColor,
      fontFamily: preset.fontFamily,
      headerStyle: preset.headerStyle,
      tableStyle: preset.tableStyle,
      borderRadius: preset.borderRadius,
    }));
  };

  // Save to IndexedDB
  const handleSaveConfig = async () => {
    const existing = await db.companyProfile.get('default');
    if (existing) {
      await db.companyProfile.update('default', {
        templateConfig: activeConfig,
      });
    } else {
      await db.companyProfile.put({
        id: 'default',
        name: 'Distribuidora & Servicios Globales S.A.',
        ruc: '155689021-2-2024',
        email: 'contacto@distribuidoraglobal.com',
        phone: '+507 6890-1234',
        address: 'Ciudad Comercial, Torre 2, Piso 8',
        currency: 'USD',
        taxName: 'ITBMS (7%)',
        templateConfig: activeConfig,
      });
    }

    setSaveSuccessMsg('¡Plantilla y estilos guardados exitosamente en tu perfil!');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Generate Sample PDF
  const handleTestPDF = () => {
    const sampleCompany: CompanyProfile = {
      name: companyProfile?.name || 'Distribuidora & Servicios Globales S.A.',
      ruc: companyProfile?.ruc || '155689021-2-2024',
      email: companyProfile?.email || 'ventas@ejemplo.com',
      phone: companyProfile?.phone || '+507 6890-1234',
      address: companyProfile?.address || 'Av. Balboa, Plaza Financiera',
      currency: 'USD',
      taxName: 'ITBMS (7%)',
      logoUrl: companyProfile?.logoUrl,
      templateConfig: activeConfig,
    };

    const sampleInvoice = {
      id: 'test-inv',
      code: 'FAC-2026-0089',
      contactId: 'cnt-1',
      contactName: 'Comercializadora San José S.A.',
      contactRuc: '8-765-4321 DV 45',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      type: 'sale' as const,
      items: [
        {
          id: 'item-1',
          productId: 'p-1',
          name: 'Consultoría Comercial & Auditoría de Procesos',
          quantity: 1,
          price: 450.00,
          discount: 0,
          taxRate: 7 as const,
          subtotal: 450.00,
          taxAmount: 31.50,
          total: 481.50,
        },
        {
          id: 'item-2',
          productId: 'p-2',
          name: 'Licencia Software ERP Anual Multi-usuario',
          quantity: 2,
          price: 180.00,
          discount: 0,
          taxRate: 7 as const,
          subtotal: 360.00,
          taxAmount: 25.20,
          total: 385.20,
        },
      ],
      subtotal: 810.00,
      taxTotal: 56.70,
      discountTotal: 0,
      total: 866.70,
      paidAmount: 866.70,
      status: 'paid' as const,
      paymentMethod: 'transfer' as const,
      sellerName: 'Carlos Pérez (Oficina)',
      notes: activeConfig.customFooterNote || 'Gracias por su preferencia.',
      isSynced: true,
      offlineCreated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    generateInvoicePDF(sampleInvoice, sampleCompany);
  };

  // Filter templates
  const filteredTemplates = TEMPLATES_CATALOG.filter((t) => {
    if (selectedCategory === 'all') return true;
    return t.category === selectedCategory;
  });

  return (
    <div className="space-y-8 pb-16 animate-in fade-in duration-200">
      
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Palette className="w-6 h-6 text-sky-600" />
            Configuración de Plantillas & Diseños de Factura
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Elige entre <span className="font-bold text-slate-800">25 plantillas modernas y contemporáneas</span>. Personaliza paletas de color, fuentes, marcas de agua y detalles para PDF e impresión.
          </p>
        </div>

        {/* Header CTA Buttons */}
        <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
          <button
            onClick={handleTestPDF}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-2"
            title="Descargar PDF de muestra"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Descargar Muestra PDF</span>
          </button>

          <button
            onClick={handleSaveConfig}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Plantilla Activa</span>
          </button>
        </div>
      </div>

      {/* Success notification */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main Grid: Left Controls & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Customizer Controls & Preset Colors (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Active Template Summary Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Plantilla Seleccionada
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 uppercase">
                Modelo #{activeConfig.templateId}
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">{activeConfig.templateName}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Personaliza los colores, tipografía y diseño visual a continuación.
              </p>
            </div>

            {/* Quick Color Pickers */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">
                Paleta de Colores Rápidos:
              </span>
              <div className="grid grid-cols-5 gap-2">
                {COLOR_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveConfig((prev) => ({
                        ...prev,
                        primaryColor: p.primary,
                        accentColor: p.accent,
                        headerBgColor: p.bg,
                      }));
                    }}
                    className="group flex flex-col items-center gap-1 p-1.5 rounded-xl border border-slate-200 hover:border-slate-400 transition-all text-[10px] font-semibold text-slate-600"
                    title={p.name}
                  >
                    <div className="w-full h-5 rounded-lg flex overflow-hidden border border-slate-300">
                      <div className="w-2/3 h-full" style={{ backgroundColor: p.primary }} />
                      <div className="w-1/3 h-full" style={{ backgroundColor: p.accent }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Customizer Controls */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-600" />
              <span>Ajustes de Estilo y Visualización</span>
            </h3>

            {/* Custom Hex Color Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Color Primario</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
                  <input
                    type="color"
                    value={activeConfig.primaryColor}
                    onChange={(e) => setActiveConfig((prev) => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={activeConfig.primaryColor}
                    onChange={(e) => setActiveConfig((prev) => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-full text-xs font-mono font-bold bg-transparent text-slate-800 uppercase focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Color Secundario / Acento</label>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
                  <input
                    type="color"
                    value={activeConfig.accentColor}
                    onChange={(e) => setActiveConfig((prev) => ({ ...prev, accentColor: e.target.value }))}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={activeConfig.accentColor}
                    onChange={(e) => setActiveConfig((prev) => ({ ...prev, accentColor: e.target.value }))}
                    className="w-full text-xs font-mono font-bold bg-transparent text-slate-800 uppercase focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Typography Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Familia Tipográfica</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'sans', name: 'Sans-Serif Moderna', sample: 'Helvetica / Jakarta' },
                  { id: 'serif', name: 'Serif Elegante', sample: 'Georgia / Playfair' },
                  { id: 'mono', name: 'Monospace Tech', sample: 'Courier / Code' },
                  { id: 'geometric', name: 'Clean Geometric', sample: 'Outfit / Futura' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveConfig((prev) => ({ ...prev, fontFamily: f.id as any }))}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      activeConfig.fontFamily === f.id
                        ? 'border-sky-600 bg-sky-50/50 font-bold text-sky-900 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-semibold">{f.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{f.sample}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Header Style Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Estilo de Cabecera</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'standard', name: 'Estándar Dividido' },
                  { id: 'full-banner', name: 'Banner Superior Completo' },
                  { id: 'centered', name: 'Corporativo Centrado' },
                  { id: 'split-side', name: 'Columna Lateral Split' },
                ].map((h) => (
                  <button
                    key={h.id}
                    onClick={() => setActiveConfig((prev) => ({ ...prev, headerStyle: h.id as any }))}
                    className={`p-2 rounded-xl border text-center transition-all font-medium ${
                      activeConfig.headerStyle === h.id
                        ? 'border-sky-600 bg-sky-50/50 font-bold text-sky-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {h.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Style Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Estilo de Tabla de Productos</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'striped', name: 'Filas Sombreadas Alternas' },
                  { id: 'minimal', name: 'Minimalista con Líneas Finas' },
                  { id: 'bordered', name: 'Cuadrícula con Bordes' },
                  { id: 'solid-header', name: 'Cabecera de Columna Sólida' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveConfig((prev) => ({ ...prev, tableStyle: t.id as any }))}
                    className={`p-2 rounded-xl border text-center transition-all font-medium ${
                      activeConfig.tableStyle === t.id
                        ? 'border-sky-600 bg-sky-50/50 font-bold text-sky-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Toggles & Custom Notes */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Opciones Adicionales & Marcas
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs font-medium">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeConfig.showLogo}
                    onChange={(e) => setActiveConfig((prev) => ({ ...prev, showLogo: e.target.checked }))}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span>Mostrar Logo de Empresa</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeConfig.showQRCode}
                    onChange={(e) => setActiveConfig((prev) => ({ ...prev, showQRCode: e.target.checked }))}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span>Sello QR / Certificación</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeConfig.showWatermark}
                    onChange={(e) => setActiveConfig((prev) => ({ ...prev, showWatermark: e.target.checked }))}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span>Marca de Agua en PDF</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeConfig.showTaxBreakdown}
                    onChange={(e) => setActiveConfig((prev) => ({ ...prev, showTaxBreakdown: e.target.checked }))}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span>Desglose de Impuestos</span>
                </label>
              </div>

              {/* Watermark text */}
              {activeConfig.showWatermark && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Texto de Marca de Agua
                  </label>
                  <input
                    type="text"
                    value={activeConfig.watermarkText || 'PAGADO'}
                    onChange={(e) => setActiveConfig((prev) => ({ ...prev, watermarkText: e.target.value }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                  />
                </div>
              )}

              {/* Custom Footer Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nota al Pie de la Factura
                </label>
                <textarea
                  rows={2}
                  value={activeConfig.customFooterNote || ''}
                  onChange={(e) => setActiveConfig((prev) => ({ ...prev, customFooterNote: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  placeholder="Mensaje de agradecimiento o términos generales..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Datos de Cuenta / Transferencia
                </label>
                <input
                  type="text"
                  value={activeConfig.bankDetailsNote || ''}
                  onChange={(e) => setActiveConfig((prev) => ({ ...prev, bankDetailsNote: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                  placeholder="Banco, N° Cuenta, Tipo..."
                />
              </div>

            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Live Preview Sheet (7 Cols) */}
        <div className="lg:col-span-7">
          <div className="sticky top-6 bg-slate-900/90 text-white p-4 sm:p-6 rounded-3xl shadow-xl space-y-4 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-sky-400" />
                <h3 className="font-extrabold text-sm sm:text-base tracking-wide uppercase">
                  Vista Previa en Tiempo Real
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                Formato A4 PDF
              </span>
            </div>

            {/* MOCK INVOICE PAPER CANVAS */}
            <div 
              className={`bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6 transition-all duration-300 min-h-[580px] text-xs ${
                activeConfig.fontFamily === 'serif' ? 'font-serif' :
                activeConfig.fontFamily === 'mono' ? 'font-mono' :
                activeConfig.fontFamily === 'geometric' ? 'font-sans' : 'font-sans'
              }`}
              style={{
                borderColor: activeConfig.primaryColor,
              }}
            >
              
              {/* TOP HEADER PREVIEW */}
              {activeConfig.headerStyle === 'full-banner' ? (
                <div 
                  className="-mx-6 -mt-6 -mr-6 sm:-mx-8 sm:-mt-8 sm:-mr-8 p-6 text-white flex justify-between items-center rounded-t-2xl"
                  style={{ backgroundColor: activeConfig.primaryColor }}
                >
                  <div>
                    <h2 className="text-lg font-bold">
                      {companyProfile?.name || 'Distribuidora & Servicios Globales S.A.'}
                    </h2>
                    <p className="text-[11px] opacity-80">RUC: {formatRucDv(companyProfile?.ruc || '155689021-2-2026', companyProfile?.dv || '26')}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-extrabold tracking-wider">FACTURA DE VENTA</div>
                    <div className="text-xs font-mono opacity-90">N° FAC-2026-0089</div>
                  </div>
                </div>
              ) : activeConfig.headerStyle === 'centered' ? (
                <div className="text-center border-b pb-4 space-y-1" style={{ borderColor: activeConfig.primaryColor }}>
                  <h2 className="text-lg font-extrabold uppercase tracking-wide" style={{ color: activeConfig.primaryColor }}>
                    {companyProfile?.name || 'Distribuidora & Servicios Globales S.A.'}
                  </h2>
                  <p className="text-slate-500 text-[11px]">RUC: {formatRucDv(companyProfile?.ruc || '155689021-2-2026', companyProfile?.dv || '26')} | WAP: {companyProfile?.phone || '+507 6890-1234'}</p>
                  <div className="pt-2 flex justify-center items-center gap-4 text-slate-800 font-bold">
                    <span>FACTURA N° FAC-2026-0089</span>
                    <span>•</span>
                    <span>FECHA: 30/07/2026</span>
                  </div>
                </div>
              ) : activeConfig.headerStyle === 'split-side' ? (
                <div className="grid grid-cols-12 gap-4 pb-4 border-b border-slate-200">
                  <div className="col-span-4 p-3 rounded-xl text-white space-y-1" style={{ backgroundColor: activeConfig.primaryColor }}>
                    <div className="font-bold text-xs">{companyProfile?.name || 'Empresa Alegra'}</div>
                    <div className="text-[10px] opacity-90">RUC: {formatRucDv(companyProfile?.ruc || '155689021-2-2026', companyProfile?.dv || '26')}</div>
                  </div>
                  <div className="col-span-8 text-right space-y-1">
                    <h2 className="text-base font-extrabold" style={{ color: activeConfig.primaryColor }}>FACTURA DE VENTA</h2>
                    <p className="font-mono font-bold text-slate-800 text-sm">N° FAC-2026-0089</p>
                    <p className="text-slate-500 text-[11px]">Emisión: 30/07/2026 | Vencimiento: 14/08/2026</p>
                  </div>
                </div>
              ) : (
                /* Standard Header */
                <div className="flex justify-between items-start pb-4 border-b border-slate-200">
                  <div className="space-y-1">
                    <div className="w-2.5 h-2.5 rounded-full mb-1" style={{ backgroundColor: activeConfig.primaryColor }} />
                    <h2 className="text-base font-extrabold text-slate-900">
                      {companyProfile?.name || 'Distribuidora & Servicios Globales S.A.'}
                    </h2>
                    <p className="text-slate-500 text-[11px]">RUC: {formatRucDv(companyProfile?.ruc || '155689021-2-2026', companyProfile?.dv || '26')}</p>
                    <p className="text-slate-500 text-[11px]">Tel: {companyProfile?.phone || '+507 6890-1234'} | Email: {companyProfile?.email || 'contacto@alegra.com'}</p>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="text-base font-extrabold tracking-tight block" style={{ color: activeConfig.primaryColor }}>
                      FACTURA DE VENTA
                    </span>
                    <span className="text-sm font-mono font-bold text-slate-800 block">N° FAC-2026-0089</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-white bg-emerald-600 inline-block">
                      PAGADA
                    </span>
                  </div>
                </div>
              )}

              {/* CLIENT DETAILS BOX */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cliente Facturado:</span>
                  <div className="font-bold text-slate-900 text-sm">Comercializadora San José S.A.</div>
                  <div className="text-slate-500 font-mono text-[11px]">RUC: {formatRucDv('8-765-4321', '45')}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fecha de Emisión:</span>
                  <div className="font-semibold text-slate-800">30 de Julio, 2026</div>
                  <div className="text-slate-500 text-[11px]">Método: Transferencia Bancaria</div>
                </div>
              </div>

              {/* ITEMS TABLE PREVIEW */}
              <div className="overflow-hidden border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr 
                      className="text-[10px] font-bold uppercase tracking-wider text-slate-700"
                      style={{ 
                        backgroundColor: activeConfig.tableStyle === 'solid-header' ? activeConfig.primaryColor : '#f1f5f9',
                        color: activeConfig.tableStyle === 'solid-header' ? '#ffffff' : '#334155'
                      }}
                    >
                      <th className="p-2.5">Descripción / Producto</th>
                      <th className="p-2.5 text-center">Cant.</th>
                      <th className="p-2.5 text-right">Precio</th>
                      <th className="p-2.5 text-right">Total ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    <tr className={activeConfig.tableStyle === 'striped' ? 'bg-slate-50/50' : ''}>
                      <td className="p-2.5 font-medium text-slate-800">
                        Consultoría Comercial & Auditoría de Procesos
                      </td>
                      <td className="p-2.5 text-center font-mono">1</td>
                      <td className="p-2.5 text-right font-mono">$450.00</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">$450.00</td>
                    </tr>
                    <tr className={activeConfig.tableStyle === 'striped' ? 'bg-white' : ''}>
                      <td className="p-2.5 font-medium text-slate-800">
                        Licencia Software ERP Anual Multi-usuario
                      </td>
                      <td className="p-2.5 text-center font-mono">2</td>
                      <td className="p-2.5 text-right font-mono">$180.00</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">$360.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TOTALS SUMMARY SECTION */}
              <div className="flex justify-between items-end pt-2">
                
                {/* QR Code & Watermark Box */}
                <div className="space-y-2">
                  {activeConfig.showQRCode && (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl w-48">
                      <QrCode className="w-8 h-8 text-slate-700 shrink-0" />
                      <div className="text-[9px] text-slate-500 leading-tight">
                        <div className="font-bold text-slate-800">Comprobante Fiscal</div>
                        <div>Firma Electrónica Válida</div>
                      </div>
                    </div>
                  )}

                  {activeConfig.showWatermark && (
                    <div className="inline-block px-3 py-1 border-2 border-emerald-500 text-emerald-600 font-extrabold text-xs tracking-widest rounded-lg transform -rotate-3 uppercase opacity-80">
                      {activeConfig.watermarkText || 'PAGADO'}
                    </div>
                  )}
                </div>

                {/* Numeric Totals */}
                <div className="w-56 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold">$810.00</span>
                  </div>
                  {activeConfig.showTaxBreakdown && (
                    <div className="flex justify-between text-slate-600">
                      <span>ITBMS (7%):</span>
                      <span className="font-mono font-semibold">$56.70</span>
                    </div>
                  )}
                  <div 
                    className="flex justify-between p-2 rounded-xl text-white font-extrabold text-sm"
                    style={{ backgroundColor: activeConfig.primaryColor }}
                  >
                    <span>TOTAL:</span>
                    <span className="font-mono">$866.70 USD</span>
                  </div>
                </div>

              </div>

              {/* FOOTER NOTES PREVIEW */}
              <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-500 space-y-1">
                {activeConfig.bankDetailsNote && (
                  <div className="font-bold text-slate-700">
                    {activeConfig.bankDetailsNote}
                  </div>
                )}
                <div>
                  {activeConfig.customFooterNote || 'Gracias por su preferencia.'}
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* 25 TEMPLATES CATALOG SECTION */}
      <div className="space-y-6 pt-6 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layout className="w-5 h-5 text-sky-600" />
              Catálogo Completo de 25 Plantillas
            </h2>
            <p className="text-xs text-slate-500">
              Haz clic en cualquier modelo para aplicarlo instantáneamente a tus facturas y cotizaciones.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'Todas (25)' },
              { id: 'modern', label: 'Modernas' },
              { id: 'executive', label: 'Ejecutivas' },
              { id: 'minimal', label: 'Minimalistas' },
              { id: 'tech', label: 'Tech & SaaS' },
              { id: 'creative', label: 'Creativas' },
              { id: 'fiscal', label: 'Fiscales' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTemplates.map((t) => {
            const isSelected = activeConfig.templateId === t.id;

            return (
              <div
                key={t.id}
                onClick={() => handleSelectPreset(t)}
                className={`group relative bg-white p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'border-sky-600 ring-2 ring-sky-500/20 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                }`}
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Modelo #{t.id}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    {t.tag}
                  </span>
                </div>

                {/* Color Banner Thumbnail Preview */}
                <div 
                  className="w-full h-16 rounded-xl p-3 flex justify-between items-center text-white overflow-hidden shadow-2xs"
                  style={{ backgroundColor: t.primaryColor }}
                >
                  <div className="space-y-1">
                    <div className="w-12 h-2 bg-white/40 rounded-sm" />
                    <div className="w-20 h-1.5 bg-white/20 rounded-sm" />
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-mono font-bold text-xs">
                    FAC
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                    {t.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                    {t.description}
                  </p>
                </div>

                {/* Action button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectPreset(t);
                  }}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 group-hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      <span>Plantilla Activa</span>
                    </>
                  ) : (
                    <span>Aplicar Plantilla #{t.id}</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
