import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Check, 
  Save, 
  Trash2, 
  Tag, 
  FolderPlus, 
  UploadCloud, 
  Image as ImageIcon, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Layers,
  Box
} from 'lucide-react';
import type { Product, TaxRate } from '../types';
import { db } from '../db/indexedDB';
import { syncService } from '../services/syncService';
import { useLiveQuery } from 'dexie-react-hooks';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const generateNextProductSku = (products: Product[]): string => {
  let maxNum = 10000; // So maxNum + 1 = 10001 for first item
  if (Array.isArray(products)) {
    products.forEach((p) => {
      if (p.sku) {
        const match = p.sku.match(/IMP-(\d+)/i) || p.sku.match(/(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    });
  }
  return `IMP-${maxNum + 1}`;
};

const COMMON_MATERIALS = [
  'PVC',
  'Cobre',
  'Acero Inoxidable',
  'Hierro Galvanizado',
  'Aluminio',
  'Bronce',
  'Madera',
  'Plástico / Polímero',
  'Vidrio Templado',
  'Cerámica',
  'N/A (Servicio)'
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, productToEdit }) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Materiales Eléctricos');
  const [material, setMaterial] = useState('');
  const [unit, setUnit] = useState('Unidad');
  const [price, setPrice] = useState<number>(100);
  const [cost, setCost] = useState<number>(60);
  const [taxRate, setTaxRate] = useState<TaxRate>(7);
  const [type, setType] = useState<'product' | 'service'>('product');
  const [stock, setStock] = useState<number>(10);
  const [minStockAlert, setMinStockAlert] = useState<number>(3);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');

  // Image Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all existing products
  const allProducts = useLiveQuery(() => db.products.toArray(), []) || [];

  const defaultCategories = [
    'Materiales Eléctricos',
    'Ferretería',
    'Equipos Cómputo',
    'Hardware',
    'Servicios',
    'Oficina',
    'Insumos',
    'General'
  ];

  // Unique list of categories sorted alphabetically
  const existingCategories = Array.from(
    new Set([
      ...defaultCategories,
      ...allProducts.map((p) => p.category?.trim()).filter(Boolean) as string[]
    ])
  ).sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name || '');
      setSku(productToEdit.sku || '');
      setCategory(productToEdit.category || 'General');
      setMaterial(productToEdit.material || '');
      setUnit(productToEdit.unit || 'Unidad');
      setPrice(productToEdit.price || 0);
      setCost(productToEdit.cost || 0);
      setTaxRate(productToEdit.taxRate ?? 7);
      setType(productToEdit.type || 'product');
      setStock(productToEdit.stock ?? 0);
      setMinStockAlert(productToEdit.minStockAlert ?? (productToEdit.min_stock ?? 3));
      setDescription(productToEdit.description || '');
      setImageUrl(productToEdit.imageUrl || productToEdit.image_url || '');
    } else {
      setName('');
      setSku(generateNextProductSku(allProducts));
      setCategory('Materiales Eléctricos');
      setMaterial('');
      setUnit('Unidad');
      setPrice(100);
      setCost(60);
      setTaxRate(7);
      setType('product');
      setStock(10);
      setMinStockAlert(3);
      setDescription('');
      setImageUrl('');
    }
    setUploadError(null);
    setIsDragging(false);
  }, [productToEdit, isOpen, allProducts.length]);

  if (!isOpen) return null;

  // Process and validate selected image file
  const handleProcessImageFile = (file: File) => {
    setUploadError(null);

    // Formatos permitidos: .jpg, .jpeg, .png, .webp
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validExtensions = /\.(jpg|jpeg|png|webp)$/i;

    if (!validTypes.includes(file.type.toLowerCase()) && !validExtensions.test(file.name)) {
      setUploadError('Formato no permitido. Solo se aceptan archivos .jpg, .jpeg, .png y .webp.');
      return;
    }

    // Límite de tamaño: Máximo 5 MB (5 * 1024 * 1024 bytes)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setUploadError(`El archivo es demasiado grande (${sizeMB} MB). El tamaño máximo permitido es de 5 MB.`);
      return;
    }

    // Previsualización en tiempo real vía FileReader
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        // Establecer previsualización inmediata en tiempo real
        setImageUrl(dataUrl);

        // Subir al servidor backend para almacenamiento persistente
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
          // En modo offline, el DataURL base64 sigue funcionando como respaldo en IndexedDB
          console.warn('Servidor no disponible, usando almacenamiento local de imagen en IndexedDB');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Por favor completa el Nombre del producto o servicio.');
      return;
    }

    const now = new Date().toISOString();

    if (productToEdit) {
      const updatedProduct: Product = {
        ...productToEdit,
        name: name.trim(),
        sku: sku.trim() || productToEdit.sku,
        category,
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
        updatedAt: now,
      };

      await db.products.put(updatedProduct);
      await syncService.queueChange('products', 'update', updatedProduct);
    } else {
      // Re-query latest products to ensure exact sequence on save
      const freshProducts = await db.products.toArray();
      const nextSequentialSku = generateNextProductSku(freshProducts);

      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        name: name.trim(),
        sku: nextSequentialSku,
        category,
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
        createdAt: now,
        updatedAt: now,
      };

      await db.products.add(newProduct);
      await syncService.queueChange('products', 'create', newProduct);
    }

    onClose();
  };

  const handleDelete = async () => {
    if (productToEdit && confirm(`¿Estás seguro de eliminar el artículo "${productToEdit.name}" (${productToEdit.sku})?`)) {
      await db.products.delete(productToEdit.id);
      await syncService.queueChange('products', 'delete', { id: productToEdit.id });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                {productToEdit ? `Editar Artículo: ${productToEdit.sku}` : 'Registrar Nuevo Producto o Servicio'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Gestión de catálogo, especificaciones técnicas, inventario y multimedia
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm overflow-y-auto flex-1">
          
          {/* Tipo de Ítem */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Tipo de Ítem *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('product')}
                className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                  type === 'product'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                📦 Producto Físico (Control de Stock)
              </button>
              <button
                type="button"
                onClick={() => setType('service')}
                className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                  type === 'service'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                ⚡ Servicio / Intangible (Ilimitado)
              </button>
            </div>
          </div>

          {/* Nombre del Producto */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Nombre del Producto / Servicio <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Tubería Conduit PVC 1/2 pulgada, Cable THHN #12, etc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
          </div>

          {/* SKU y Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700 uppercase">SKU / Código *</label>
                {!productToEdit && (
                  <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300">
                    ⚡ Automático
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                readOnly={!productToEdit}
                value={productToEdit ? sku : (sku || generateNextProductSku(allProducts))}
                onChange={(e) => setSku(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl font-mono font-extrabold transition-colors ${
                  !productToEdit
                    ? 'bg-amber-50/70 border border-amber-300 text-amber-950 cursor-not-allowed select-none'
                    : 'bg-slate-50 border border-slate-300 text-slate-900'
                }`}
                title={!productToEdit ? "Código secuencial generado automáticamente para Distribuidora El Imperio" : "SKU / Código"}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700 uppercase">Categoría *</label>
                <span className="text-[10px] text-slate-400 font-semibold">{existingCategories.length} registradas</span>
              </div>

              {/* Select menu from existing categories */}
              <select
                value={existingCategories.includes(category) ? category : '__custom__'}
                onChange={(e) => {
                  if (e.target.value !== '__custom__') {
                    setCategory(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 mb-1 focus:bg-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="" disabled>-- Selecciona categoría --</option>
                {existingCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    📁 {cat}
                  </option>
                ))}
                <option value="__custom__">✏️ + Escribir nueva categoría...</option>
              </select>

              <div className="relative">
                <input
                  type="text"
                  list="categories-datalist"
                  placeholder="Categoría personalizada..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
                <datalist id="categories-datalist">
                  {existingCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Categoría / Material Especificación Técnica */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-700 uppercase">
                Material / Composición Técnica
              </label>
              <span className="text-[10px] text-slate-400 font-semibold">Opcional (ej. PVC, Cobre, Acero)</span>
            </div>

            <div className="relative">
              <input
                type="text"
                list="materials-datalist"
                placeholder="Especifica el material (ej. PVC, Cobre, Acero, Aluminio...)"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
              />
              <datalist id="materials-datalist">
                {COMMON_MATERIALS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            {/* Quick click badges for materials */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Sugeridos:</span>
              {['PVC', 'Cobre', 'Acero', 'Hierro', 'Aluminio', 'Bronce', 'Madera', 'Plástico'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMaterial(m)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    material.toLowerCase() === m.toLowerCase()
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Costo, Precio Venta e Impuesto */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Costo ($) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Precio Venta ($) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-extrabold font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">
                Impuesto / ITBMS <span className="text-rose-500">*</span>
              </label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value) as TaxRate)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold focus:bg-white focus:ring-2 focus:ring-amber-500"
              >
                <option value={7}>ITBMS 7% (Estándar Panamá)</option>
                <option value={10}>Impuesto 10% (Licores/Otros)</option>
                <option value={16}>IVA 16%</option>
                <option value={19}>IVA 19%</option>
                <option value={0}>Exento 0% (Alimentos/Medicinas)</option>
              </select>
            </div>
          </div>

          {/* Stock Actual y Stock Mínimo */}
          {type === 'product' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200">
              <div>
                <label className="block font-bold text-amber-900 uppercase mb-1">
                  Stock Actual <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-extrabold font-mono text-amber-950 focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-amber-700 mt-1 block">Existencias físicas disponibles</span>
              </div>

              <div>
                <label className="block font-bold text-amber-900 uppercase mb-1">
                  Stock Mínimo (Alerta de Reabastecimiento) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-extrabold font-mono text-amber-950 focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-amber-700 mt-1 block">Aviso cuando el stock sea menor o igual</span>
              </div>
            </div>
          )}

          {/* SUBSISTEMA DE CARGA Y PREVISUALIZACIÓN DE IMÁGENES (IMAGE UPLOADER) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span>Imagen del Producto</span>
              </label>
              <span className="text-[10px] text-slate-400 font-semibold">
                JPG, JPEG, PNG, WEBP (Hasta 5 MB)
              </span>
            </div>

            {imageUrl ? (
              /* Previsualización en tiempo real (Image Preview Thumbnail & Controls) */
              <div className="relative group bg-slate-50 border-2 border-emerald-500/40 rounded-2xl p-3 flex flex-col sm:flex-row items-center gap-4 transition-all">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-white border border-slate-200 shadow-xs shrink-0 flex items-center justify-center relative">
                  <img
                    src={imageUrl}
                    alt={name || 'Vista previa del producto'}
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="%2394a3b8" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>';
                    }}
                  />
                  {isUploading && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-2xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Guardando...</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Imagen asignada al producto</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Esta miniatura se mostrará en el inventario, catálogo, búsquedas y comprobantes.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Cambiar Imagen</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Eliminar Imagen</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Dropzone Drag & Drop */
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 sm:p-6 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-amber-500 bg-amber-50/70 scale-[1.01]'
                    : 'border-slate-300 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/30'
                }`}
              >
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    isDragging ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'
                  }`}>
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800">
                      {isDragging
                        ? '¡Suelta la imagen aquí!'
                        : 'Arrastra y suelta una imagen aquí, o haz clic para seleccionar'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 italic">
                      "Carga una imagen representativa para {name.trim() ? `"${name.trim()}"` : 'este producto'}"
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="mt-1 px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                    <span>Seleccionar Archivo</span>
                  </button>
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
              <div className="flex items-center gap-1.5 text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Descripción (textarea, Opcional) */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Descripción (Opcional)</label>
            <textarea
              rows={3}
              placeholder="Detalles técnicos, especificaciones de instalación, compatibilidad o notas del producto..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden resize-y"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 shrink-0">
            {productToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Artículo</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs sm:text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{productToEdit ? 'Guardar Cambios' : 'Guardar Producto'}</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};

