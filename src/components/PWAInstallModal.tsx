import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Smartphone, 
  Laptop, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles, 
  Share2, 
  PlusSquare, 
  MoreVertical, 
  Monitor,
  ShieldCheck,
  Check,
  AlertCircle
} from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstalled: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstalled
}) => {
  const [activeDeviceTab, setActiveDeviceTab] = useState<'android' | 'ios' | 'desktop'>('android');
  const [copied, setCopied] = useState(false);

  const [showDev403Notice, setShowDev403Notice] = useState(false);

  if (!isOpen) return null;

  const handleNativePrompt = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          onInstalled();
          onClose();
        }
      } catch (err) {
        setShowDev403Notice(true);
      }
    } else {
      setShowDev403Notice(true);
    }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      // Fallback
    }
  };

  const isInIframe = window.self !== window.top;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 text-white p-5 sm:p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  Instalar IMPERIO PRO CONTABILIDAD como App Nativa
                </h2>
                <p className="text-xs text-sky-200/80">
                  Acceso directo en pantalla de inicio, modo offline sin conexión y velocidad ultra-rápida.
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-5 text-slate-700">
          
          {/* 403 Warning Notice if triggered */}
          {showDev403Notice && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 space-y-2 text-xs animate-in fade-in">
              <div className="flex items-center gap-2 font-extrabold text-amber-950 text-sm">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>¿Por qué sale Error 403 al abrir en pestaña nueva?</span>
              </div>
              <p className="leading-relaxed text-amber-900">
                Las URLs de desarrollo de AI Studio (<code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">ais-dev-...</code>) están protegidas por contraseña e iframe proxy del contenedor, por lo que el navegador muestra un <strong>Error 403 Prohibido</strong> si intentas abrirlas directamente en una pestaña independiente.
              </p>
              <div className="bg-white p-3 rounded-xl border border-amber-200/80 space-y-1.5 font-medium text-slate-800">
                <p className="font-bold text-slate-900">✅ 2 Soluciones muy sencillas:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>
                    <strong>Usa la App aquí mismo:</strong> Toda la funcionalidad (base de datos local, exportación a Excel, cotizaciones, gastos, etc.) funciona al 100% en esta pantalla.
                  </li>
                  <li>
                    <strong>Enlace público sin 403:</strong> Haz clic en el botón <strong>"Compartir" (Share)</strong> en el menú superior de Google AI Studio para obtener el enlace público (<code className="bg-slate-100 px-1 rounded text-[11px]">ais-pre-...</code>) que no pide login ni da error 403.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Main Action Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-extrabold text-emerald-950 text-sm">
                  {deferredPrompt ? '¡Tu navegador permite la instalación automática!' : 'Instalación PWA Directa'}
                </h3>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Puedes instalar esta aplicación directamente en la pantalla de inicio de tu dispositivo como una App Nativa. Funciona sin internet (Offline-First) y guarda todos tus datos localmente.
                </p>
              </div>
            </div>

            <div className="pt-1 flex flex-wrap items-center gap-2">
              <button
                onClick={handleNativePrompt}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{deferredPrompt ? 'Instalar Ahora Automáticamente' : 'Instalar en tu Dispositivo'}</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
              </button>
            </div>
          </div>

          {/* Device Tabs Instructions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Instrucciones Paso a Paso por Dispositivo:
              </span>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl mb-4 text-xs font-bold text-slate-600">
              <button
                onClick={() => setActiveDeviceTab('android')}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeDeviceTab === 'android' ? 'bg-white text-emerald-700 shadow-2xs font-black' : 'hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Android (Chrome)</span>
              </button>

              <button
                onClick={() => setActiveDeviceTab('ios')}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeDeviceTab === 'ios' ? 'bg-white text-sky-700 shadow-2xs font-black' : 'hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-4 h-4 text-sky-600" />
                <span>iPhone / iPad (Safari)</span>
              </button>

              <button
                onClick={() => setActiveDeviceTab('desktop')}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeDeviceTab === 'desktop' ? 'bg-white text-purple-700 shadow-2xs font-black' : 'hover:text-slate-900'
                }`}
              >
                <Laptop className="w-4 h-4 text-purple-600" />
                <span>PC / Mac (Chrome/Edge)</span>
              </button>
            </div>

            {/* Android Instructions */}
            {activeDeviceTab === 'android' && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <ol className="space-y-2.5">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Abre este enlace en el navegador <strong>Google Chrome</strong> de tu teléfono Android.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span className="flex items-center gap-1">
                      Toca el menú de los <strong>3 puntos verticales</strong> <MoreVertical className="w-3.5 h-3.5 text-slate-600 inline" /> en la esquina superior derecha.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span className="flex items-center gap-1">
                      Selecciona la opción <strong>"Agregar a la pantalla principal"</strong> o <strong>"Instalar aplicación"</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <span>¡Listo! Se creará el ícono oficial de <strong>Imperio Pro</strong> en tu teléfono.</span>
                  </li>
                </ol>
              </div>
            )}

            {/* iOS Instructions */}
            {activeDeviceTab === 'ios' && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <ol className="space-y-2.5">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Abre este enlace obligatoriamente en el navegador <strong>Safari</strong> de tu iPhone o iPad.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span className="flex items-center gap-1">
                      Toca el botón <strong>Compartir</strong> <Share2 className="w-3.5 h-3.5 text-sky-600 inline" /> (icono del cuadrado con la flecha hacia arriba).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span className="flex items-center gap-1">
                      Desplázate hacia abajo en el menú y selecciona <PlusSquare className="w-3.5 h-3.5 text-slate-700 inline" /> <strong>"Agregar a inicio" (Add to Home Screen)</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <span>Confirma haciendo clic en <strong>"Agregar"</strong> en la esquina superior.</span>
                  </li>
                </ol>
              </div>
            )}

            {/* Desktop Instructions */}
            {activeDeviceTab === 'desktop' && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <ol className="space-y-2.5">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Abre la aplicación en Google Chrome, Microsoft Edge o Brave.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span className="flex items-center gap-1">
                      Haz clic en el icono de <strong>Instalación de App</strong> <Download className="w-3.5 h-3.5 text-purple-600 inline" /> que aparece a la derecha de la barra de direcciones URL.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Presiona <strong>"Instalar"</strong> para abrir IMPERIO PRO CONTABILIDAD en su propia ventana sin barras de navegador.</span>
                  </li>
                </ol>
              </div>
            )}

          </div>

          {/* Benefits list */}
          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold text-slate-800">Funciona 100% Offline</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
              <span className="font-bold text-slate-800">Sin tienda App Store / Play Store</span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => {
              handleCopyLink();
              setShowDev403Notice(true);
            }}
            className="text-xs font-bold text-sky-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Copiar Enlace Directo</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
