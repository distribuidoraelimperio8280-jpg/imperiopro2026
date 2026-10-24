import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Zap, 
  CreditCard, 
  DollarSign, 
  Smartphone, 
  Building2, 
  Check, 
  Printer, 
  Package, 
  Barcode, 
  User, 
  AlertCircle,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import type { Product, Invoice, InvoiceItem, Contact, PaymentMethod, TaxRate } from '../types';
import { db } from '../db/indexedDB';
import { useLiveQuery } from 'dexie-react-hooks';
import { printInvoicePDF } from '../services/pdfService';
import { syncService } from '../services/syncService';
import confetti from 'canvas-confetti';

interface PosFlashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreated?: (invoice: Invoice) => void;
}

export const PosFlashModal: React.FC<PosFlashModalProps> = ({ isOpen, onClose, onInvoiceCreated }) => {
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const contacts = useLiveQuery(() => db.contacts.toArray(), []) || [];
  const companyProfile = useLiveQuery(() => db.companyProfile.get('default'), []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<{
    product: Product;
    quantity: number;
    unit: string;
    price: number;
    discount: number;
  }[]>([]);

  const [selectedContactId, setSelectedContactId] = useState<string>('final');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [yappyPhone, setYappyPhone] = useState<string>('6442-9775');
  const [yappyConfirmed, setYappyConfirmed] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Quick categories for Hardware, Agro & Electrical
  const quickCategories = [
    { id: 'all', label: 'Todos' },
    { id: 'Materiales Eléctricos', label: '⚡ Eléctricos / Cables' },
    { id: 'Tuberías y PVC', label: '🚰 Tubos / PVC' },
    { id: 'Pinturas y Acabados', label: '🎨 Pinturas / Brochas' },
    { id: 'Agro y Fertilizantes', label: '🌱 Agro / Machetes' },
    { id: 'Herramientas', label: '🔨 Herramientas' },
    { id: 'Fijaciones', label: '🔩 Tornillos / Pernos' },
  ];

  // Auto focus on search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      setCart([]);
      setCashReceived(0);
      setYappyConfirmed(false);
      setSearchTerm('');
    }
  }, [isOpen]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const term = searchTerm.toLowerCase().trim();
      if (!term) return matchCat;

      const matchText = 
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.material && p.material.toLowerCase().includes(term)) ||
        (p.description && p.description.toLowerCase().includes(term));

      return matchCat && matchText;
    });
  }, [products, searchTerm, selectedCategory]);

  // Cart Calculations with safe 2-decimal rounding
  const { subtotal, taxTotal, total } = useMemo(() => {
    let sub = 0;
    let tax = 0;

    cart.forEach((item) => {
      const lineSub = Math.round(item.quantity * item.price * (1 - item.discount / 100) * 100) / 100;
      const lineTax = Math.round(lineSub * (Number(item.product.taxRate || 7) / 100) * 100) / 100;
      sub += lineSub;
      tax += lineTax;
    });

    const tot = Math.round((sub + tax) * 100) / 100;
    return { subtotal: sub, taxTotal: tax, total: tot };
  }, [cart]);

  // Change / Vuelto calculator
  const changeDue = Math.max(0, Math.round((cashReceived - total) * 100) / 100);

  if (!isOpen) return null;

  // Add product to cart or increment
  const handleAddToCart = (product: Product) => {
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          unit: product.unit || 'unidad',
          price: product.price,
          discount: 0,
        },
      ]);
    }
  };

  const handleUpdateQty = (index: number, delta: number) => {
    const updated = [...cart];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
    }
    setCart(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  const handleSetQuickCash = (amount: number) => {
    setCashReceived(amount);
  };

  // Complete fast point-of-sale transaction
  const handleCompleteSale = async (shouldPrint = true) => {
    if (cart.length === 0) {
      alert('Agrega al menos un producto al carrito para facturar.');
      return;
    }

    if (paymentMethod === 'cash' && cashReceived < total) {
      alert(`El monto recibido en efectivo (B/. ${cashReceived.toFixed(2)}) es menor que el total (B/. ${total.toFixed(2)}).`);
      return;
    }

    setIsProcessing(true);

    try {
      const invoiceCount = await db.invoices.count();
      const invoiceCode = `FAC-POS-${(invoiceCount + 1).toString().padStart(4, '0')}`;

      // Selected customer details
      let customerName = 'Consumidor Final (Mostrador)';
      let customerRuc = 'N/A';
      let customerDv = '';

      if (selectedContactId !== 'final') {
        const found = contacts.find((c) => c.id === selectedContactId);
        if (found) {
          customerName = found.name;
          customerRuc = found.rucOrCedula;
          customerDv = found.dv || '';
        }
      }

      // Convert cart to invoice items
      const invoiceItems: InvoiceItem[] = cart.map((item, idx) => {
        const lineSub = Math.round(item.quantity * item.price * (1 - item.discount / 100) * 100) / 100;
        const lineTax = Math.round(lineSub * (Number(item.product.taxRate || 7) / 100) * 100) / 100;
        return {
          id: `item-pos-${Date.now()}-${idx}`,
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.price,
          taxRate: (item.product.taxRate || 7) as TaxRate,
          discount: item.discount,
          subtotal: lineSub,
          taxAmount: lineTax,
          total: Math.round((lineSub + lineTax) * 100) / 100,
        };
      });

      const today = new Date().toISOString().split('T')[0];

      const newInvoice: Invoice = {
        id: `inv-pos-${Date.now()}`,
        code: invoiceCode,
        type: 'sale',
        contactId: selectedContactId,
        contactName: customerName,
        contactRuc: customerRuc,
        contactDv: customerDv,
        date: today,
        dueDate: today,
        items: invoiceItems,
        subtotal,
        taxTotal,
        discountTotal: 0,
        total,
        paidAmount: paymentMethod === 'credit' ? 0 : total,
        status: paymentMethod === 'credit' ? 'pending' : 'paid',
        paymentMethod,
        sellerName: 'TPV Mostrador',
        notes: `Cobro TPV Flash Mostrador. Método: ${paymentMethod.toUpperCase()}${
          paymentMethod === 'cash' ? ` | Recibido: B/. ${cashReceived.toFixed(2)} | Vuelto: B/. ${changeDue.toFixed(2)}` : ''
        }`,
        isSynced: false,
        offlineCreated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Guardar factura
      await db.invoices.put(newInvoice);
      await syncService.queueChange('invoices', 'create', newInvoice);

      // 2. Descontar inventario inmediatamente
      for (const item of cart) {
        if (item.product.id) {
          const currentProd = await db.products.get(item.product.id);
          if (currentProd) {
            const newStock = Math.max(0, (currentProd.stock || 0) - item.quantity);
            const updatedProd = {
              ...currentProd,
              stock: newStock,
              updatedAt: new Date().toISOString(),
            };
            await db.products.update(item.product.id, {
              stock: newStock,
              updatedAt: new Date().toISOString(),
            });
            await syncService.queueChange('products', 'update', updatedProd);
          }
        }
      }

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });

      if (shouldPrint) {
        try {
          printInvoicePDF(newInvoice, companyProfile);
        } catch (e) {
          console.warn('Auto print falló:', e);
        }
      }

      if (onInvoiceCreated) {
        onInvoiceCreated(newInvoice);
      }

      // Reset cart and stay ready for next customer
      setCart([]);
      setCashReceived(0);
      setSearchTerm('');
      searchInputRef.current?.focus();
    } catch (err: any) {
      console.error('Error al procesar venta TPV Flash:', err);
      alert(`Error al guardar la venta: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 text-white rounded-2xl w-full max-w-7xl h-[94vh] border border-emerald-500/40 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-emerald-950/80 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Zap className="w-5 h-5 text-emerald-100 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  TPV Flash Mostrador
                </h2>
                <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  Ventas de Alta Velocidad
                </span>
                <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">
                  Ferretería • Electricidad • Agro • Pinturas
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cobro ágil con código de barras, SKU, múltiples unidades y pagos en 1 solo clic.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Cerrar TPV Flash (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Split Grid: Left Product Catalog (60%), Right Cart & Payment (40%) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          
          {/* LEFT: Catálogo Rápido con Búsqueda Instantánea */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col border-r border-slate-800 overflow-hidden bg-slate-900/60 p-4 space-y-3">
            
            {/* Search Bar + Quick Category Filters */}
            <div className="space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Escribe para buscar: Cable #12, Tubo PVC, Pintura, Machete, SKU o Barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Categorías Rápidas */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {quickCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {filteredProducts.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs text-center">
                  <Package className="w-8 h-8 mb-2 opacity-50" />
                  <span>No se encontraron productos coincidentes.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {filteredProducts.map((p) => {
                    const isOutOfStock = (p.stock || 0) <= 0;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleAddToCart(p)}
                        className="bg-slate-800/80 hover:bg-slate-800 hover:border-emerald-500/80 border border-slate-700/80 p-3 rounded-xl text-left transition-all duration-150 flex flex-col justify-between group cursor-pointer hover:shadow-md hover:scale-[1.01]"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-[10px] font-mono text-slate-400 block truncate">
                              {p.sku || 'S/N'}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              isOutOfStock ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-700 text-slate-300'
                            }`}>
                              Stock: {p.stock || 0}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 line-clamp-2 mt-1">
                            {p.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                            {p.unit || 'unidad'}
                          </span>
                        </div>

                        <div className="pt-2 mt-2 border-t border-slate-700/60 flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-black font-mono text-emerald-400">
                            B/. {p.price.toFixed(2)}
                          </span>
                          <span className="w-6 h-6 rounded-lg bg-emerald-600/30 text-emerald-300 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT: Ticket, Cliente & Panel de Pago Rápido */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col bg-slate-950 p-4 space-y-3 overflow-y-auto">
            
            {/* Selector de Cliente */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cliente Facturación:</span>
                </span>
                <span className="text-[10px] text-slate-400">RUC / Cédula</span>
              </div>
              <select
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-300 focus:outline-none"
              >
                <option value="final">Consumidor Final (Venta Mostrador) — RUC: N/A</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.rucOrCedula || 'S/N'}) {c.type === 'client' ? '[Cliente]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Carrito de Artículos */}
            <div className="flex-1 bg-slate-900/90 rounded-xl border border-slate-800 p-3 flex flex-col min-h-[180px] overflow-hidden">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 pb-2 border-b border-slate-800">
                <span>Artículos en Venta ({cart.reduce((sum, i) => sum + i.quantity, 0)})</span>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    Vaciar Carrito
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                    <Barcode className="w-7 h-7 mb-1 opacity-40" />
                    <span>Selecciona productos del catálogo para agregar.</span>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={idx} className="bg-slate-800/70 p-2 rounded-lg border border-slate-700/60 flex items-center justify-between gap-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-white truncate">{item.product.name}</h5>
                        <div className="text-[10px] text-slate-400 font-mono">
                          B/. {item.price.toFixed(2)} / {item.unit}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleUpdateQty(idx, -1)}
                          className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold text-xs px-1 min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(idx, 1)}
                          className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right shrink-0 min-w-[55px]">
                        <span className="font-mono font-black text-emerald-400 block">
                          B/. {(item.quantity * item.price).toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="text-[10px] text-rose-400 hover:text-rose-300"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totales Resumen */}
              <div className="pt-2 border-t border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold text-white">B/. {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ITBMS (7%):</span>
                  <span className="font-mono font-bold text-white">B/. {taxTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base font-black text-white pt-1 border-t border-slate-800/80">
                  <span className="text-emerald-400">TOTAL A COBRAR:</span>
                  <span className="font-mono text-emerald-400">B/. {total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Módulo de Pago Rápido */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Método de Pago:</span>
                <span className="text-emerald-400 uppercase text-[10px]">{paymentMethod}</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Efectivo</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('transfer')}
                  className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'transfer'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Yappy / ACH</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Tarjeta POS</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('credit')}
                  className={`py-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === 'credit'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Crédito</span>
                </button>
              </div>

              {/* Si es Efectivo: Calculadora de Vuelto Rápido */}
              {paymentMethod === 'cash' && (
                <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Recibido en Caja:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono font-bold text-slate-400">B/.</span>
                      <input
                        type="number"
                        step="0.01"
                        value={cashReceived || ''}
                        onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-0.5 text-xs font-mono font-bold text-right text-emerald-300 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Botones de Efectivo Rápido */}
                  <div className="flex items-center gap-1 justify-between text-[10px] font-bold">
                    <button
                      onClick={() => handleSetQuickCash(total)}
                      className="px-2 py-1 bg-slate-700 hover:bg-emerald-600 rounded text-slate-200 transition-colors cursor-pointer"
                    >
                      Exacto
                    </button>
                    <button
                      onClick={() => handleSetQuickCash(5)}
                      className="px-2 py-1 bg-slate-700 hover:bg-emerald-600 rounded text-slate-200 transition-colors cursor-pointer"
                    >
                      $5
                    </button>
                    <button
                      onClick={() => handleSetQuickCash(10)}
                      className="px-2 py-1 bg-slate-700 hover:bg-emerald-600 rounded text-slate-200 transition-colors cursor-pointer"
                    >
                      $10
                    </button>
                    <button
                      onClick={() => handleSetQuickCash(20)}
                      className="px-2 py-1 bg-slate-700 hover:bg-emerald-600 rounded text-slate-200 transition-colors cursor-pointer"
                    >
                      $20
                    </button>
                    <button
                      onClick={() => handleSetQuickCash(50)}
                      className="px-2 py-1 bg-slate-700 hover:bg-emerald-600 rounded text-slate-200 transition-colors cursor-pointer"
                    >
                      $50
                    </button>
                    <button
                      onClick={() => handleSetQuickCash(100)}
                      className="px-2 py-1 bg-slate-700 hover:bg-emerald-600 rounded text-slate-200 transition-colors cursor-pointer"
                    >
                      $100
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-700 text-xs">
                    <span className="text-slate-300 font-bold">Vuelto / Cambio a Entregar:</span>
                    <span className={`font-mono font-black text-sm ${cashReceived >= total ? 'text-emerald-400' : 'text-slate-500'}`}>
                      B/. {changeDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Si es Yappy */}
              {paymentMethod === 'transfer' && (
                <div className="bg-sky-950/40 p-2.5 rounded-lg border border-sky-600/40 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-sky-300 font-bold">
                    <span>Yappy Comercial:</span>
                    <span className="font-mono text-white">{companyProfile?.phone || yappyPhone}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>Monto a transferir:</span>
                    <span className="font-mono font-bold text-sky-400">B/. {total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Botón Principal de Cobro */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  disabled={isProcessing || cart.length === 0}
                  onClick={() => handleCompleteSale(false)}
                  className="py-3 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Cobrar (Sin Imprimir)</span>
                </button>

                <button
                  disabled={isProcessing || cart.length === 0}
                  onClick={() => handleCompleteSale(true)}
                  className="py-3 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cobrar e Imprimir</span>
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
