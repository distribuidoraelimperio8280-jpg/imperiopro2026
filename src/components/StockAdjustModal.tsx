import React, { useState } from 'react';
import { X, ArrowUpDown, Check } from 'lucide-react';
import type { Product } from '../types';
import { db } from '../db/indexedDB';
import { syncService } from '../services/syncService';

interface StockAdjustModalProps {
  product: Product | null;
  onClose: () => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({ product, onClose }) => {
  const [adjustment, setAdjustment] = useState<number>(5);
  const [mode, setMode] = useState<'add' | 'subtract'>('add');

  if (!product) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const change = mode === 'add' ? adjustment : -adjustment;
    const newStock = Math.max(0, product.stock + change);

    await db.products.update(product.id, {
      stock: newStock,
      updatedAt: new Date().toISOString(),
    });

    const updated = await db.products.get(product.id);
    if (updated) {
      await syncService.queueChange('products', 'update', updated);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-base font-bold text-slate-900">Ajuste de Stock: {product.name}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs sm:text-sm">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center">
            <span className="text-slate-500 font-medium">Stock Actual:</span>
            <span className="text-base font-extrabold text-slate-900">{product.stock} {product.unit}</span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Tipo de Movimiento</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('add')}
                className={`py-2 rounded-xl font-bold border ${
                  mode === 'add' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-600'
                }`}
              >
                + Entrada / Compra
              </button>
              <button
                type="button"
                onClick={() => setMode('subtract')}
                className={`py-2 rounded-xl font-bold border ${
                  mode === 'subtract' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-600'
                }`}
              >
                - Salida / Pérdida
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Cantidad a Ajustar</label>
            <input
              type="number"
              min="1"
              value={adjustment}
              onChange={(e) => setAdjustment(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-lg font-extrabold text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar Ajuste</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
