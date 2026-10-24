import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Printer, 
  Package, 
  CheckCircle2, 
  Phone, 
  Mail, 
  Sparkles,
  Eye,
  Settings,
  RefreshCw,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import type { Product, CompanyProfile } from '../types';
import { 
  generateProductCatalogPDF, 
  getProductCatalogBlobUrl, 
  printProductCatalogPDF, 
  downloadProductCatalogPDF,
  type ProductCatalogOptions 
} from '../services/pdfService';
import { seedSampleHardwareProducts } from '../db/indexedDB';

interface CatalogExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  companyProfile?: CompanyProfile;
}

export const CatalogExportModal: React.FC<CatalogExportModalProps> = ({
  isOpen,
  onClose,
  products,
  companyProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'preview'>('config');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showStockQuantity, setShowStockQuantity] = useState<boolean>(true);
  const [showOnlyInStock, setShowOnlyInStock] = useState<boolean>(false);
  const [directedTo, setDirectedTo] = useState<string>(
    'Atención: Proyectos de Construcción, Contratistas y Ferreterías de Panamá'
  );
  const [validityText, setValidityText] = useState<string>(
    'Precios vigentes para cotizaciones y pedidos en Panamá | Moneda: USD ($)'
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string; downloadUrl?: string } | null>(null);

  // Listado único de categorías
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  // Cantidad estimada de productos filtrados
  const filteredProductsCount = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category?.trim().toLowerCase() === selectedCategory.trim().toLowerCase();
      const matchStock = !showOnlyInStock || p.type === 'service' || (p.stock && p.stock > 0);
      return matchCat && matchStock;
    }).length;
  }, [products, selectedCategory, showOnlyInStock]);

  // Limpiar Blob URL cuando se desmonta o cambia el modal
  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  // Si se cierra el modal, limpiar estado
  useEffect(() => {
    if (!isOpen) {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
        setPreviewBlobUrl(null);
      }
      setActiveTab('config');
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Cargar productos de demostración si el inventario está vacío
  const handleSeedDemoProducts = async () => {
    setIsSeeding(true);
    setStatusMessage(null);
    try {
      const count = await seedSampleHardwareProducts();
      setStatusMessage({
        type: 'success',
        text: `¡Se cargaron exitosamente ${count} productos de ferretería y construcción con especificaciones técnicas!`
      });
    } catch (err) {
      console.error('Error al cargar productos de muestra:', err);
      setStatusMessage({
        type: 'error',
        text: 'No se pudieron cargar los productos de muestra. Intenta de nuevo.'
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const getCatalogOptions = (): ProductCatalogOptions => ({
    category: selectedCategory,
    showStockQuantity,
    showOnlyInStock,
    directedTo: directedTo.trim() || 'Atención: Proyectos y Ferretería de Panamá',
    validityText: validityText.trim(),
    company: companyProfile,
  });

  // Generar o refrescar la vista previa interactiva
  const handleGeneratePreview = async () => {
    setIsGenerating(true);
    setStatusMessage(null);
    try {
      const { blobUrl, filename } = await getProductCatalogBlobUrl(products, getCatalogOptions());
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
      setPreviewBlobUrl(blobUrl);
      setPreviewFilename(filename);
      setActiveTab('preview');
      setStatusMessage({
        type: 'info',
        text: 'Vista previa del catálogo generada correctamente.',
        downloadUrl: blobUrl
      });
    } catch (err) {
      console.error('Error al generar la vista previa del catálogo:', err);
      setStatusMessage({
        type: 'error',
        text: 'Ocurrió un error al generar la vista previa del catálogo. Por favor intenta de nuevo.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Imprimir catálogo directamente con fallback
  const handlePrint = async () => {
    setIsGenerating(true);
    setStatusMessage(null);
    try {
      const doc = await generateProductCatalogPDF(products, {
        ...getCatalogOptions(),
        returnOnly: true,
      });

      printProductCatalogPDF(doc);

      setStatusMessage({
        type: 'success',
        text: 'Preparando documento para impresión. Se ha abierto la ventana de impresión de tu navegador.'
      });
    } catch (err) {
      console.error('Error al imprimir el catálogo:', err);
      setStatusMessage({
        type: 'error',
        text: 'No se pudo iniciar el proceso de impresión. Prueba ver la vista previa primero.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Descargar archivo PDF con fallback directo
  const handleDownload = async () => {
    setIsGenerating(true);
    setStatusMessage(null);
    try {
      const { doc, blobUrl, filename } = await getProductCatalogBlobUrl(products, getCatalogOptions());
      
      const success = downloadProductCatalogPDF(doc, filename);

      setStatusMessage({
        type: 'success',
        text: success 
          ? `¡Catálogo "${filename}" listo!` 
          : 'Catálogo generado.',
        downloadUrl: blobUrl
      });
    } catch (err) {
      console.error('Error al descargar el catálogo:', err);
      setStatusMessage({
        type: 'error',
        text: 'Ocurrió un error al descargar el archivo PDF. Intenta la opción de vista previa.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Catálogo PDF para Clientes y Proyectos
              </h2>
              <p className="text-[11px] text-slate-400">
                Diseñado para proyectos, obras civiles y ferreterías de Panamá con precios y existencias
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Selector de pestañas */}
            <div className="hidden sm:flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('config')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'config' 
                    ? 'bg-amber-500 text-slate-950 shadow-xs' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configuración</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!previewBlobUrl) {
                    handleGeneratePreview();
                  } else {
                    setActiveTab('preview');
                  }
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'preview' 
                    ? 'bg-amber-500 text-slate-950 shadow-xs' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Vista Previa en Vivo</span>
              </button>
            </div>

            <button 
              onClick={onClose} 
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de pestañas en dispositivos móviles */}
        <div className="flex sm:hidden border-b border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold text-center transition-colors ${
              activeTab === 'config' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
            }`}
          >
            Configuración
          </button>
          <button
            type="button"
            onClick={() => {
              if (!previewBlobUrl) {
                handleGeneratePreview();
              } else {
                setActiveTab('preview');
              }
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold text-center transition-colors ${
              activeTab === 'preview' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
            }`}
          >
            Vista Previa
          </button>
        </div>

        {/* Notificaciones y mensajes de estado in-modal */}
        {statusMessage && (
          <div className={`mx-4 sm:mx-6 mt-4 p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 shrink-0 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : statusMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-sky-50 border-sky-200 text-sky-900'
          }`}>
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              {statusMessage.type === 'info' && <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>

            {statusMessage.downloadUrl && (
              <a
                href={statusMessage.downloadUrl}
                download={previewFilename || 'Catalogo_Productos_ImperioPro.pdf'}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shrink-0 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Abrir / Descargar PDF</span>
              </a>
            )}
          </div>
        )}

        {/* Contenido según la pestaña activa */}
        <div className="p-4 sm:p-6 text-xs sm:text-sm overflow-y-auto flex-1">
          {activeTab === 'config' ? (
            <div className="space-y-4">
              
              {/* Card de Datos Comerciales Registrados */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Emisor: Distribuidora El Imperio (Panamá)
                  </span>
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                    Datos Oficiales
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-amber-950/90 pt-1 border-t border-amber-200/60">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span><strong>Cel / WhatsApp:</strong> 64429775</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span className="truncate"><strong>Email:</strong> distribuidoraelimperio8280@gmail.com</span>
                  </div>
                </div>
              </div>

              {/* Si no hay productos en el inventario, mostrar botón para cargar ejemplos de ferretería */}
              {products.length === 0 && (
                <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3 border border-slate-800">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">Tu inventario aún no tiene productos registrados</h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Para generar un catálogo completo con fotos, materiales (PVC, Cobre, Acero) y precios en Balboas/USD, puedes cargar 8 productos modelo de ferretería panameña con 1 clic:
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSeedDemoProducts}
                    disabled={isSeeding}
                    className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>{isSeeding ? 'Cargando productos...' : 'Cargar 8 Productos de Ferretería y Proyectos (Panamá)'}</span>
                  </button>
                </div>
              )}

              {/* Destinatario / Nombre de Proyecto o Cliente */}
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  Destinatario / Proyecto (Encabezado del PDF)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={directedTo}
                    onChange={(e) => setDirectedTo(e.target.value)}
                    placeholder="Ej. Atención: Constructora San Antonio / Ferretería El Tornillo"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-hidden transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Aparecerá destacado en la portada para cotizaciones formales a clientes o contratistas.
                </p>
              </div>

              {/* Filtro por Categoría */}
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  Filtrar por Categoría de Productos
                </label>
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-hidden transition-all cursor-pointer"
                  >
                    <option value="all">Todas las Categorías ({products.length} ítems en total)</option>
                    {categories.map((cat) => {
                      const count = products.filter((p) => p.category?.trim() === cat).length;
                      return (
                        <option key={cat} value={cat}>
                          {cat} ({count} {count === 1 ? 'producto' : 'productos'})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Opciones de Visualización de Stock */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="block font-bold text-slate-700 text-xs">
                  Configuración de Existencias y Stock
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={showStockQuantity}
                      onChange={(e) => setShowStockQuantity(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-[11px]">
                      <span className="font-bold text-slate-800 block">Cantidad Numérica de Stock</span>
                      <span className="text-slate-500 text-[10px]">Muestra ej. "45 En Stock" o "Disponible"</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={showOnlyInStock}
                      onChange={(e) => setShowOnlyInStock(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-[11px]">
                      <span className="font-bold text-slate-800 block">Solo con Stock Disponible</span>
                      <span className="text-slate-500 text-[10px]">Oculta ítems agotados</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Nota de Vigencia y Precios */}
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  Nota de Vigencia / Términos de Entrega
                </label>
                <input
                  type="text"
                  value={validityText}
                  onChange={(e) => setValidityText(e.target.value)}
                  placeholder="Precios vigentes para cotizaciones y pedidos en Panamá | Moneda: USD ($)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-hidden transition-all"
                />
              </div>

              {/* Resumen del Documento a Generar */}
              <div className="bg-slate-900 text-white rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Package className="w-5 h-5 text-amber-400" />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {filteredProductsCount} {filteredProductsCount === 1 ? 'Producto seleccionado' : 'Productos seleccionados'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Formato A4 PDF de alta resolución con imágenes, especificaciones y precios en USD
                    </span>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  Listo para Exportar
                </span>
              </div>

            </div>
          ) : (
            /* Pestaña: Vista Previa en Vivo */
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-2xl">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Documento generado ({previewFilename || 'Catálogo'})</span>
                </div>

                <button
                  type="button"
                  onClick={handleGeneratePreview}
                  disabled={isGenerating}
                  className="px-3 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>Regenerar Vista</span>
                </button>
              </div>

              {previewBlobUrl ? (
                <div className="w-full h-[500px] rounded-2xl border border-slate-200 bg-slate-900/5 overflow-hidden shadow-inner">
                  <iframe
                    src={`${previewBlobUrl}#toolbar=1`}
                    title="Vista Previa de Catálogo PDF"
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="w-full h-[350px] rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-3">
                  <FileText className="w-12 h-12 text-slate-300" />
                  <p className="text-xs max-w-sm">
                    Haz clic en el botón inferior para compilar el catálogo con diseño profesional y previsualizarlo en pantalla.
                  </p>
                  <button
                    type="button"
                    onClick={handleGeneratePreview}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Cargar Vista Previa</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Enlace o botón secundario para ver en nueva pestaña */}
          <div>
            {previewBlobUrl && (
              <a
                href={previewBlobUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir en pestaña completa</span>
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            {/* Botón Ver Vista Previa */}
            <button
              type="button"
              onClick={handleGeneratePreview}
              disabled={isGenerating}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Eye className="w-4 h-4 text-amber-600" />
              <span>{isGenerating ? 'Generando...' : 'Vista Previa'}</span>
            </button>

            {/* Botón Imprimir */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isGenerating}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-800 hover:text-slate-900 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>Imprimir</span>
            </button>

            {/* Botón Descargar Catálogo PDF */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating}
              className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 active:bg-amber-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-white" />
              <span>{isGenerating ? 'Generando PDF...' : 'Descargar Catálogo PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
