import React, { useState, useMemo } from 'react';
import { Package, Plus, Search, AlertTriangle, ArrowUpDown, Tag, Percent, Layers, Eye, Pencil, Trash2, ArrowUpAZ, ArrowDownZA, ArrowDown10, ArrowUp10, Filter, FileText, Download, Printer } from 'lucide-react';
import type { Product, Invoice } from '../types';
import { db } from '../db/indexedDB';
import { syncService } from '../services/syncService';
import { useLiveQuery } from 'dexie-react-hooks';
import { ProductDetailModal } from './ProductDetailModal';
import { ProductFormModal } from './ProductFormModal';
import { InventoryTurnoverChart } from './InventoryTurnoverChart';
import { CatalogExportModal } from './CatalogExportModal';
import { generateProductCatalogPDF } from '../services/pdfService';

interface InventoryViewProps {
  onOpenNewProduct: () => void;
  onOpenStockAdjust: (product: Product) => void;
  searchTerm: string;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  onOpenNewProduct,
  onOpenStockAdjust,
  searchTerm,
}) => {
  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'service'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'description' | 'category' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);
  const [selectedEditProduct, setSelectedEditProduct] = useState<Product | null>(null);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState<boolean>(false);

  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const invoices = useLiveQuery(() => db.invoices.toArray(), []) || [];
  const companyProfile = useLiveQuery(() => db.companyProfile.get('default'), []);

  const handleDeleteProduct = async (product: Product) => {
    if (confirm(`¿Estás seguro de eliminar el artículo "${product.name}" (${product.sku}) del inventario?`)) {
      await db.products.delete(product.id);
      await syncService.queueChange('products', 'delete', { id: product.id });
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [products]);

  const sortedAndFilteredProducts = useMemo(() => {
    const list = products.filter((p) => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = typeFilter === 'all' || p.type === typeFilter;
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;

      return matchesSearch && matchesType && matchesCategory;
    });

    return list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
      } else if (sortBy === 'description') {
        const descA = a.description || '';
        const descB = b.description || '';
        comparison = descA.localeCompare(descB, 'es', { sensitivity: 'base' });
      } else if (sortBy === 'category') {
        const catA = a.category || '';
        const catB = b.category || '';
        comparison = catA.localeCompare(catB, 'es', { sensitivity: 'base' });
        // Secondary sort by name
        if (comparison === 0) {
          comparison = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
        }
      } else if (sortBy === 'price') {
        comparison = (a.price || 0) - (b.price || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [products, searchTerm, typeFilter, selectedCategory, sortBy, sortOrder]);

  const handleHeaderSort = (field: 'name' | 'description' | 'category' | 'price') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventario y Productos</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Control de stock en tiempo real, catálogo de productos ordenado, precios, márgenes y categorías.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Botón Catálogo PDF para Clientes (Proyectos y Ferretería) */}
          <button
            onClick={() => setIsCatalogModalOpen(true)}
            className="px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/30 text-amber-900 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer border border-amber-300/40 backdrop-blur-xs"
            title="Generar catálogo en formato PDF con diseño para proyectos y ferreterías de Panamá (Cel: 64429775)"
          >
            <FileText className="w-4 h-4 text-amber-700" />
            <span>Catálogo PDF Clientes</span>
          </button>

          <button
            onClick={onOpenNewProduct}
            className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-800 active:bg-slate-900 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer backdrop-blur-xs"
          >
            <Plus className="w-4 h-4 text-emerald-300" />
            <span>Agregar Producto / Servicio</span>
          </button>
        </div>
      </div>

      {/* Visualización con Recharts: Top 5 Productos con Mayor Rotación de Ventas (Último Mes) */}
      <InventoryTurnoverChart
        products={products}
        invoices={invoices}
        onSelectProduct={(product) => setSelectedDetailProduct(product)}
      />

      {/* Filter and Sort Toolbar */}
      <div className="bg-white/80 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        
        {/* Type Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/70 border border-slate-200/50'
            }`}
          >
            Todos ({products.length})
          </button>

          <button
            onClick={() => setTypeFilter('product')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              typeFilter === 'product'
                ? 'bg-amber-500/25 text-amber-950 border border-amber-300/60 shadow-xs'
                : 'bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 border border-amber-200/40'
            }`}
          >
            Productos Físicos ({products.filter(p => p.type === 'product').length})
          </button>

          <button
            onClick={() => setTypeFilter('service')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              typeFilter === 'service'
                ? 'bg-sky-500/25 text-sky-950 border border-sky-300/60 shadow-xs'
                : 'bg-sky-500/10 text-sky-800 hover:bg-sky-500/20 border border-sky-200/40'
            }`}
          >
            Servicios ({products.filter(p => p.type === 'service').length})
          </button>
        </div>

        {/* Ordering & Category Controls */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
          
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-500">Categoría:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="all">Todas ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Sort By Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-500">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent font-bold text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="name">Nombre</option>
              <option value="description">Descripción</option>
              <option value="category">Categoría</option>
              <option value="price">Precio de Venta</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-200"
            title={sortOrder === 'asc' ? 'Orden Ascendente (Click para Descendente)' : 'Orden Descendente (Click para Ascendente)'}
          >
            {sortBy === 'price' ? (
              sortOrder === 'asc' ? <ArrowUp10 className="w-4 h-4 text-emerald-600" /> : <ArrowDown10 className="w-4 h-4 text-emerald-600" />
            ) : (
              sortOrder === 'asc' ? <ArrowUpAZ className="w-4 h-4 text-sky-600" /> : <ArrowDownZA className="w-4 h-4 text-sky-600" />
            )}
            <span className="text-[11px] font-bold">{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
          </button>

        </div>
      </div>

      {/* Mobile-Optimized Phone View: Una sola línea horizontal continua para código, nombre, stock y descripción corrida */}
      <div className="block md:hidden space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold px-1 pb-1">
          <span>{sortedAndFilteredProducts.length} Artículos en Inventario</span>
          <span className="text-[10px] text-slate-400">Vista compacta móvil</span>
        </div>

        {sortedAndFilteredProducts.map((p) => {
          const minStockLimit = p.minStockAlert ?? (p.min_stock ?? 0);
          const isLowStock = p.type === 'product' && p.stock <= minStockLimit;
          const prodImg = p.imageUrl || p.image_url;

          return (
            <div 
              key={p.id} 
              className={`p-2.5 rounded-2xl border transition-all ${
                isLowStock 
                  ? 'bg-rose-50/40 border-rose-200/60' 
                  : 'bg-white/80 backdrop-blur-md border-slate-200/70 shadow-2xs'
              }`}
            >
              {/* Línea 1 Horizontal: Código, Nombre, Stock y Precio de Venta */}
              <div className="flex items-center gap-1.5 text-xs">
                {prodImg && (
                  <img
                    src={prodImg}
                    alt={p.name}
                    className="w-5 h-5 rounded-md object-contain bg-white border border-slate-200/60 shrink-0"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                )}
                <span className="font-mono font-bold text-[10px] text-slate-600 bg-slate-100/80 px-1.5 py-0.2 rounded shrink-0">
                  {p.sku}
                </span>
                <span className="font-extrabold text-slate-900 truncate text-[11.5px] tracking-tight">
                  {p.name}
                </span>
                
                {p.type === 'product' ? (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ml-auto ${
                    isLowStock
                      ? 'bg-rose-500/15 text-rose-800 border border-rose-300/40'
                      : 'bg-emerald-500/15 text-emerald-800 border border-emerald-300/40'
                  }`}>
                    {p.stock} {p.unit}
                  </span>
                ) : (
                  <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ml-auto bg-sky-500/15 text-sky-800 border border-sky-300/40">
                    Servicio
                  </span>
                )}

                <span className="font-mono font-black text-xs text-slate-900 shrink-0">
                  ${p.price.toFixed(2)}
                </span>
              </div>

              {/* Línea 2 Horizontal: Descripción corrida en letra menuda y compacta */}
              <div className="pt-1 text-[10.5px] text-slate-600 tracking-tight leading-snug truncate" title={p.description || p.name}>
                {p.description ? (
                  <span>{p.description}</span>
                ) : (
                  <span className="text-slate-400 italic">Sin descripción adicional</span>
                )}
              </div>

              {/* Línea 3: Metadatos y acciones rápidas en una sola tira horizontal */}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100/80 mt-1 text-[10px]">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="bg-slate-100/70 px-1.5 py-0.2 rounded text-[9.5px] font-semibold text-slate-600">
                    {p.category}
                  </span>
                  <span>Costo: ${p.cost.toFixed(2)}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedDetailProduct(p)}
                    className="px-2 py-0.5 text-sky-800 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-300/30 rounded-lg font-bold text-[10px] cursor-pointer"
                  >
                    Ver Ficha
                  </button>
                  {p.type === 'product' && (
                    <button
                      onClick={() => onOpenStockAdjust(p)}
                      className="px-2 py-0.5 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/60 rounded-lg font-bold text-[10px] cursor-pointer"
                    >
                      Stock
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedEditProduct(p)}
                    className="px-2 py-0.5 text-amber-800 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-300/30 rounded-lg font-bold text-[10px] cursor-pointer"
                  >
                    Editar
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {sortedAndFilteredProducts.length === 0 && (
          <div className="p-8 text-center bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/60 text-slate-400 text-xs">
            No se encontraron productos registrados con los filtros seleccionados.
          </div>
        )}
      </div>

      {/* Desktop & Tablet View: Tabla Horizontal de Alta Densidad con Letras Menudas y Espaciado Reducido */}
      <div className="hidden md:block bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse tracking-tight">
            <thead className="bg-slate-50/90 text-slate-500 uppercase font-bold text-[9.5px] tracking-wider border-b border-slate-200/80 select-none">
              <tr>
                <th className="py-2.5 px-3 w-28">Código</th>
                
                <th 
                  onClick={() => handleHeaderSort('name')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100/60 transition-colors w-48"
                  title="Ordenar por Nombre"
                >
                  <div className="flex items-center gap-1">
                    <span>Nombre</span>
                    {sortBy === 'name' && (
                      <span className="text-sky-600 font-extrabold">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleHeaderSort('description')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100/60 transition-colors"
                  title="Ordenar por Descripción"
                >
                  <div className="flex items-center gap-1">
                    <span>Descripción Corrida (Horizontal)</span>
                    {sortBy === 'description' && (
                      <span className="text-sky-600 font-extrabold">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>

                <th 
                  onClick={() => handleHeaderSort('category')}
                  className="py-2.5 px-2.5 cursor-pointer hover:bg-slate-100/60 transition-colors w-28"
                  title="Ordenar por Categoría"
                >
                  <div className="flex items-center gap-1">
                    <span>Categoría</span>
                    {sortBy === 'category' && (
                      <span className="text-sky-600 font-extrabold">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>

                <th className="py-2.5 px-2.5 text-right w-20">Costo</th>

                <th 
                  onClick={() => handleHeaderSort('price')}
                  className="py-2.5 px-2.5 text-right cursor-pointer hover:bg-slate-100/60 transition-colors w-24"
                  title="Ordenar por Precio de Venta"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Precio Venta</span>
                    {sortBy === 'price' && (
                      <span className="text-sky-600 font-extrabold">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>

                <th className="py-2.5 px-2 text-right w-16">Margen</th>
                <th className="py-2.5 px-3 text-center w-28">Stock</th>
                <th className="py-2.5 px-3 text-center w-36">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {sortedAndFilteredProducts.map((p) => {
                const marginPercent = p.price > 0 ? (((p.price - p.cost) / p.price) * 100) : 0;
                const minStockLimit = p.minStockAlert ?? (p.min_stock ?? 0);
                const isLowStock = p.type === 'product' && p.stock <= minStockLimit;
                const prodImg = p.imageUrl || p.image_url;

                return (
                  <tr 
                    key={p.id} 
                    className={`hover:bg-slate-50/70 transition-colors border-b border-slate-100/70 ${
                      isLowStock ? 'bg-rose-50/25' : ''
                    }`}
                  >
                    {/* Código / SKU */}
                    <td className="py-2 px-3 font-mono font-bold text-slate-800 text-[11px] whitespace-nowrap">
                      {p.sku}
                    </td>
                    
                    {/* Nombre */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        {prodImg && (
                          <div className="w-6 h-6 rounded-md bg-white border border-slate-200/70 shrink-0 overflow-hidden flex items-center justify-center p-0.5">
                            <img
                              src={prodImg}
                              alt={p.name}
                              className="w-full h-full object-contain"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          </div>
                        )}
                        <span className="font-bold text-slate-900 text-xs truncate max-w-[170px]" title={p.name}>
                          {p.name}
                        </span>
                      </div>
                    </td>

                    {/* Descripción corrida en horizontal */}
                    <td className="py-2 px-3">
                      <div className="text-[11px] text-slate-600 truncate max-w-sm xl:max-w-md font-normal leading-tight" title={p.description || 'Sin descripción'}>
                        {p.description || <span className="text-slate-300 italic">Sin descripción</span>}
                      </div>
                    </td>

                    {/* Categoría */}
                    <td className="py-2 px-2.5 text-slate-600 font-medium whitespace-nowrap">
                      <span className="px-1.5 py-0.5 bg-slate-100/70 text-slate-700 rounded text-[10px] font-semibold border border-slate-200/50">
                        {p.category}
                      </span>
                    </td>

                    {/* Costo */}
                    <td className="py-2 px-2.5 text-right font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      ${p.cost.toFixed(2)}
                    </td>
                    
                    {/* Precio Venta */}
                    <td className="py-2 px-2.5 text-right font-mono font-black text-slate-900 text-xs whitespace-nowrap">
                      ${p.price.toFixed(2)}
                    </td>

                    {/* Margen % */}
                    <td className="py-2 px-2 text-right font-mono font-bold text-emerald-700 text-[11px] whitespace-nowrap">
                      {marginPercent.toFixed(0)}%
                    </td>

                    {/* Stock Actual */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      {p.type === 'product' ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                            isLowStock 
                              ? 'bg-rose-500/15 text-rose-800 border border-rose-300/40' 
                              : 'bg-emerald-500/15 text-emerald-800 border border-emerald-300/40'
                          }`}>
                            {p.stock} {p.unit}
                          </span>
                          {isLowStock && <AlertTriangle className="w-3 h-3 text-rose-600" title={`Alerta de stock bajo (Mínimo: ${minStockLimit})`} />}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-sky-800 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-300/30">
                          Servicio
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedDetailProduct(p)}
                          className="p-1 px-1.5 text-sky-800 bg-sky-500/10 hover:bg-sky-500/20 rounded-lg transition-colors border border-sky-300/30 flex items-center gap-1 font-semibold text-[10.5px] cursor-pointer"
                          title="Ver ficha del artículo"
                        >
                          <Eye className="w-3 h-3 text-sky-600" />
                          <span>Ficha</span>
                        </button>

                        <button
                          onClick={() => setSelectedEditProduct(p)}
                          className="p-1 px-1.5 text-amber-800 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors border border-amber-300/30 flex items-center gap-1 font-semibold text-[10.5px] cursor-pointer"
                          title="Editar producto"
                        >
                          <Pencil className="w-3 h-3 text-amber-600" />
                          <span>Editar</span>
                        </button>

                        {p.type === 'product' && (
                          <button
                            onClick={() => onOpenStockAdjust(p)}
                            className="p-1 px-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200/60 flex items-center gap-1 font-bold text-[10.5px] cursor-pointer"
                            title="Ajustar Stock"
                          >
                            <ArrowUpDown className="w-3 h-3 text-slate-500" />
                            <span>Stock</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteProduct(p)}
                          className="p-1 text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors border border-rose-300/30 flex items-center justify-center cursor-pointer"
                          title="Eliminar artículo"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {sortedAndFilteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 text-xs">
                    No hay productos registrados que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Detail / Single Article View Modal */}
      <ProductDetailModal
        product={selectedDetailProduct}
        onClose={() => setSelectedDetailProduct(null)}
      />

      {/* Product Edit Modal */}
      <ProductFormModal
        isOpen={!!selectedEditProduct}
        productToEdit={selectedEditProduct}
        onClose={() => setSelectedEditProduct(null)}
      />

      {/* Catalog Export Modal */}
      <CatalogExportModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        products={products}
        companyProfile={companyProfile}
      />

    </div>
  );
};
