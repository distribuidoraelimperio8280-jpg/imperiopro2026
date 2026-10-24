import React from 'react';
import { X, MessageCircle, QrCode } from 'lucide-react';

interface WhatsAppLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppLinkModal: React.FC<WhatsAppLinkModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 font-sans flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-500" />
            Vincular WhatsApp
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="w-32 h-32 bg-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300">
            <QrCode className="w-16 h-16 text-slate-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 font-sans mb-2">Escanea el código QR</h3>
            <p className="text-sm text-slate-600 font-sans">
              1. Abre WhatsApp en tu teléfono.<br/>
              2. Toca <strong>Menú</strong> o <strong>Configuración</strong> y selecciona <strong>Dispositivos vinculados</strong>.<br/>
              3. Toca en <strong>Vincular un dispositivo</strong>.<br/>
              4. Apunta tu teléfono a esta pantalla para capturar el código.
            </p>
          </div>
          
          <div className="w-full pt-4">
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm text-left border border-emerald-100 font-sans flex items-start gap-2">
              <span className="shrink-0 mt-0.5">ℹ️</span>
              <p>Esta es una integración en fase Beta. Algunas funciones podrían estar limitadas.</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm font-medium transition-colors font-sans w-full"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
