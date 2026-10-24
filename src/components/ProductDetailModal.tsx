import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Eye, 
  Save, 
  CheckCircle2, 
  Package, 
  DollarSign, 
  Tag, 
  AlertTriangle, 
  Layers, 
  Percent,
  Trash2,
  Calendar,
  Box,
  UploadCloud,
  Image as ImageIcon,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import type { Product, TaxRate } from '../types';
import { db } from '../db/indexedDB';
import { syncService } from '../services/syncService';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const [activeTab, setActiveTab] = useState<'view' | 'edit'>('edit');
  
  // Editable fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [material, setMaterial] = useState('');
  const [unit, setUnit] = useState('Unidad');
  const [price, setPrice] = useState<number>(0);
  const [cost, setCost] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<TaxRate>(7);
  const [type, setType] = useState<'product' | 'service'>('product');
  const [stock, setStock] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');

  // Image upload state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sync state when product changes
  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setSku(product.sku || '');
      setCategory(product.category || 'General');
      setMaterial(product.material || '');
      setUnit(product.unit || 'Unidad');
      setPrice(product.price || 0);
      setCost(product.cost || 0);
      setTaxRate(product.taxRate ?? 7);
      setType(product.type || 'product');
      setStock(product.stock ?? 0);
      setMinStockAlert(product.minStockAlert ?? (product.min_stock ?? 3));
      setDescription(product.description || '');
      setImageUrl(product.imageUrl || product.image_url || '');
      setSaveSuccessMsg(null);
      setUploadError(null);
    }
  }, [product]);

  if (!product) return null;

  // Process and validate selected image file
  const handleProcessImageFile = (file: File) => {
    setUploadError(null);

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validExtensions = /\.(jpg|jpeg|png|webp)$/i;

    if (!validTypes.includes(file.type.toLowerCase()) && !validExtensions.test(file.name)) {
      setUploadError('Formato no permitido. Solo se aceptan archivos .jpg, .jpeg, .png y .webp.');
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setUploadError(`El archivo es demasiado grande (${sizeMB} MB). El tamaño máximo permitido es de 5 MB.`);
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setImageUrl(dataUrl);

        try {
          const response = await fetch('/api/products/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: dataUrl,
              filename: file.name
            })
          });

          const result = await response.json();
          if (result.success && result.imageUrl) {
            setImageUrl(result.imageUrl);
          }
        } catch (err) {
          console.warn('Servidor no disponible, usando DataURL base64');
        } finally {
          setIsUploading(false);
        }
      }
    };

    reader.onerror = () => {
      setUploadError('Error al leer el archivo de imagen.');
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessImageFile(file);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Calculate Margin
  const marginAmount = price - cost;
  const marginPercent = price > 0 ? ((marginAmount / price) * 100) : 0;
  const isLowStock = type === 'product' && stock <= minStockAlert;

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !sku) {
      alert('Por favor ingrese el Nombre y SKU del artículo.');
      return;
    }

    const updatedProduct: Product = {
      ...product,
      name: name.trim(),
      sku: sku.trim(),
      category: category.trim(),
      material: material.trim(),
      unit,
      price: Number(price) || 0,
      cost: Number(cost) || 0,
      taxRate,
      type,
      stock: type === 'service' ? 9999 : Number(stock) || 0,
      minStockAlert: Number(minStockAlert) || 0,
      min_stock: Number(minStockAlert) || 0,
      description: description.trim(),
      imageUrl: imageUrl.trim() || undefined,
      image_url: imageUrl.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    // Save in IndexedDB
    await db.products.put(updatedProduct);
    await syncService.queueChange('products', 'update', updatedProduct);

    setSaveSuccessMsg('¡Cambios guardados correctamente en el inventario!');
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 3000);
  };

  const handleDeleteProduct = async () => {
    if (confirm(`¿Estás seguro de eliminar el artículo "${product.name}" del inventario?`)) {
      await db.products.delete(product.id);
      await syncService.queueChange('products', 'delete', { id: product.id });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-700 shadow-xs shrink-0 overflow-hidden flex items-center justify-center">
                <img src={imageUrl} alt={name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30 shrink-0">
                <Eye className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                  {sku}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {type === 'product' ? 'Producto Físico' : 'Servicio / Intangible'}
                </span>
                {material && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {material}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white truncate max-w-md mt-0.5">
                {name || product.name}
              </h2>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {saveSuccessMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3 text-xs sm:text-sm font-bold text-emerald-800 flex items-center gap-2 px-6 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Visual KPIs Card */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Precio Venta</span>
            <span className="text-base font-extrabold text-slate-900 font-mono">${Number(price).toFixed(2)}</span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Costo Directo</span>
            <span className="text-base font-extrabold text-slate-600 font-mono">${Number(cost).toFixed(2)}</span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Margen Bruto</span>
            <span className="text-base font-extrabold text-emerald-600 font-mono">
              {marginPercent.toFixed(0)}% <span className="text-[10px] font-normal text-slate-500">(${marginAmount.toFixed(2)})</span>
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stock Disponible</span>
            {type === 'product' ? (
              <span className={`text-base font-extrabold font-mono flex items-center gap-1 ${isLowStock ? 'text-rose-600' : 'text-slate-900'}`}>
                {stock} {unit}
                {isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" title="Bajo Stock" />}
              </span>
            ) : (
              <span className="text-xs font-bold text-sky-600">Ilimitado</span>
            )}
          </div>
        </div>

        {/* Main Editable Form */}
        <form onSubmit={handleSaveChanges} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Box className="w-4 h-4 text-sky-600" />
              Detalles del Artículo & Modificación
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              ID: {product.id}
            </span>
          </div>

          {/* Type Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Artículo</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setType('product')}
                className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                  type === 'product'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                📦 Producto Físico (Inventariable)
              </button>
              <button
                type="button"
                onClick={() => setType('service')}
                className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                  type === 'service'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                ⚡ Servicio / Intangible
              </button>
            </div>
          </div>

          {/* Name & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nombre del Artículo *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                SKU / Código *
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-sky-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Category & Material */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Categoría</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Material / Composición
              </label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="Ej. PVC, Cobre, Acero, etc."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Unit */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unidad de Medida</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Unidad, Caja, Metro, etc."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800"
            />
          </div>

          {/* Pricing & Tax */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Costo ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Precio Venta ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-extrabold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Impuesto / ITBMS</label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value) as TaxRate)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800"
              >
                <option value={7}>ITBMS 7%</option>
                <option value={10}>Impuesto 10%</option>
                <option value={16}>IVA 16%</option>
                <option value={19}>IVA 19%</option>
                <option value={0}>Exento 0%</option>
              </select>
            </div>
          </div>

          {/* Stock fields */}
          {type === 'product' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200">
              <div>
                <label className="block text-xs font-bold text-amber-900 uppercase mb-1">Stock Actual</label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs sm:text-sm font-mono font-extrabold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-900 uppercase mb-1">Mínimo Alerta Stock</label>
                <input
                  type="number"
                  min="0"
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-800"
                />
              </div>
            </div>
          )}

          {/* Image Uploader & Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>Imagen del Producto</span>
              </label>
              <span className="text-[10px] text-slate-400 font-semibold">JPG, PNG, WEBP (Hasta 5 MB)</span>
            </div>

            {imageUrl ? (
              <div className="relative group bg-slate-50 border-2 border-emerald-500/40 rounded-2xl p-3 flex flex-col sm:flex-row items-center gap-4 transition-all">
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-white border border-slate-200 shadow-xs shrink-0 flex items-center justify-center relative">
                  <img
                    src={imageUrl}
                    alt={name || 'Vista previa'}
                    className="w-full h-full object-contain p-1"
                  />
                  {isUploading && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-xs font-bold gap-1">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="text-xs font-bold text-slate-800 flex items-center justify-center sm:justify-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Imagen cargada</span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Cambiar</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-amber-500 bg-amber-50/70'
                    : 'border-slate-300 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/30'
                }`}
              >
                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <UploadCloud className="w-6 h-6 text-amber-600" />
                  <p className="text-xs font-bold text-slate-800">
                    Carga una imagen representativa para "{name || 'este producto'}"
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Arrastra aquí o haz clic para seleccionar (Máx. 5 MB)
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {uploadError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold bg-rose-50 p-2 rounded-xl border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción / Notas</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Escribe detalles del producto o servicio..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 resize-y"
            />
          </div>

          {/* Footer controls inside modal */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={handleDeleteProduct}
              className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar Artículo</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Cerrar
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};

