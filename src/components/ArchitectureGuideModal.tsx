import React from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle, 
  Smartphone, 
  Laptop, 
  Database, 
  WifiOff, 
  RefreshCw, 
  Code2, 
  Layers,
  Flame,
  Globe
} from 'lucide-react';

interface ArchitectureGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureGuideModal: React.FC<ArchitectureGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base sm:text-lg font-bold">Arquitectura Técnica & Manual PWA (Inspirado en Alegra)</h2>
              <p className="text-xs text-slate-300">Documentación de la arquitectura Offline-First y Sincronización Multiplataforma</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8 text-slate-700 text-xs sm:text-sm">
          
          {/* Section 1: Technical Architecture */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sky-700 font-extrabold text-base">
              <Layers className="w-5 h-5 text-sky-600" />
              <h3>1. Arquitectura Técnica Paso a Paso (Offline-First)</h3>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <p className="leading-relaxed">
                Para lograr el nivel de desempeño y disponibilidad de aplicaciones ERP como Alegra, la aplicación utiliza una arquitectura <strong>Offline-First con IndexedDB (Dexie.js) y Cola de Sincronización en la Nube</strong>.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <WifiOff className="w-4 h-4 text-amber-500" />
                    <span>Capa Local (IndexedDB)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Cualquier factura, cliente o producto creado sin internet se persiste inmediatamente en IndexedDB. La app responde en &lt; 10ms.
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-sky-500" />
                    <span>Sync Queue Engine</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Un motor registra las operaciones en la tabla <code className="bg-slate-100 px-1 py-0.5 rounded">syncQueue</code> y detecta el evento <code className="bg-slate-100 px-1 py-0.5 rounded">navigator.onLine</code>.
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <span>Nube Centralizada</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Tan pronto como el dispositivo recupera señal, se envía el lote de datos a Firebase Firestore / Express REST API y se sincronizan los dispositivos.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Firebase Firestore / Supabase Setup Instructions */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-base">
              <Flame className="w-5 h-5 text-emerald-600" />
              <h3>2. Configuración de Base de Datos Centralizada en la Nube</h3>
            </div>
            
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
              <p className="leading-relaxed">
                Para conectar este prototipo a producción en la nube con Firebase Firestore o Supabase:
              </p>

              <ol className="list-decimal pl-5 space-y-2 text-xs">
                <li>
                  <strong>Crear Proyecto en Firebase Console:</strong> Activa <em>Cloud Firestore</em> en modo de producción.
                </li>
                <li>
                  <strong>Configurar Reglas de Seguridad:</strong> Permite lectura/escritura autenticada para los módulos de <code className="bg-white px-1 rounded">invoices</code>, <code className="bg-white px-1 rounded">contacts</code>, <code className="bg-white px-1 rounded">products</code> y <code className="bg-white px-1 rounded">expenses</code>.
                </li>
                <li>
                  <strong>Sincronización Bidireccional en Tiempo Real:</strong> Reemplaza el endpoint <code className="bg-white px-1 rounded">/api/sync</code> por la librería oficial <code className="bg-white px-1 rounded">@firebase/firestore</code> usando listeners <code className="bg-white px-1 rounded">onSnapshot()</code>.
                </li>
              </ol>
            </div>
          </section>

          {/* Section 3: PWA Installation Guide for Android, iOS & Mac */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-purple-700 font-extrabold text-base">
              <Smartphone className="w-5 h-5 text-purple-600" />
              <h3>3. Instrucciones de Instalación Directa PWA (Android, iOS y macOS/Windows)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Android */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Android (Chrome)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Abre la aplicación en Google Chrome. Haz clic en el botón superior <strong>"Instalar App PWA"</strong> o abre los tres puntos superiores de Chrome y selecciona <strong>"Agregar a la pantalla principal"</strong>.
                </p>
              </div>

              {/* iOS / iPhone / iPad */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-sky-600" />
                  <span>iPhone / iPad (Safari)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Abre la aplicación en Safari. Toca el botón <strong>"Compartir"</strong> (el icono de cuadro con flecha arriba) y selecciona <strong>"Agregar al inicio"</strong> (Add to Home Screen).
                </p>
              </div>

              {/* macOS / Windows */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-purple-600" />
                  <span>macOS / Windows</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  En Chrome, Edge o Safari en Mac/PC, presiona el ícono de instalación que aparece en la barra de direcciones superior a la derecha o selecciona <strong>"Instalar Alegra ERP"</strong>.
                </p>
              </div>

            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
