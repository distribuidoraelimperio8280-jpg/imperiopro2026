import React, { useState, useEffect } from 'react';
import { Monitor, Download, X, Laptop, CheckCircle2, ArrowRight, ExternalLink, Sparkles, Smartphone } from 'lucide-react';

interface DesktopShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopShortcutModal: React.FC<DesktopShortcutModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  if (!isOpen) return null;

  // Generates and downloads a native Windows .url shortcut file
  const handleDownloadUrlShortcut = () => {
    const appUrl = window.location.href.split('#')[0];
    const shortcutContent = `[InternetShortcut]
URL=${appUrl}
IconIndex=0
IconFile=${window.location.origin}/favicon.ico
HotKey=0
IDList=
[{000214A0-0000-0000-C000-000000000046}]
Prop3=19,2
`;

    const blob = new Blob([shortcutContent], { type: 'application/x-mswinurl' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'DISTRIBUIDORA_EL_IMPERIO_CONTABILIDAD.url';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 5000);
  };

  // Triggers browser PWA prompt if available
  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert(
        'Instrucción para Chrome / Edge:\n\n1. En la esquina superior derecha del navegador, haz clic en el menú de 3 puntos (⋮).\n2. Selecciona "Guardar y compartir" o "Más herramientas".\n3. Haz clic en "Crear acceso directo..." o "Instalar esta página".\n4. Marca "Abrir como ventana" y presiona Crear.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-auto">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center font-extrabold shadow-inner">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-sky-400 block">
                DISTRIBUIDORA EL IMPERIO
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white">
                Crear Acceso Directo en tu Escritorio
              </h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6 text-slate-700 text-sm">
          
          <p className="text-slate-600 leading-relaxed text-xs sm:text-sm">
            Para ingresar al sistema directamente con 1 solo clic desde la pantalla de inicio de tu computadora (Windows/Mac), elige la opción que prefieras:
          </p>

          {/* Option 1: Direct Download Shortcut (.url) */}
          <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                <h3 className="font-bold text-slate-900 text-sm">Descargar Archivo de Acceso Directo (.url)</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-sky-200 text-sky-800 uppercase">
                Recomendado Windows
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-normal">
              Descarga un icono directo a tu carpeta de descargas. Luego muévelo a tu <strong>Escritorio</strong>. Al hacerle doble clic se abrirá el sistema al instante.
            </p>

            <button
              onClick={handleDownloadUrlShortcut}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Acceso Directo al Escritorio</span>
            </button>

            {downloadSuccess && (
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>¡Archivo descargado! Búscalo en tus 'Descargas' y arrástralo a tu Escritorio.</span>
              </div>
            )}
          </div>

          {/* Option 2: Browser Native PWA Install */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center">2</span>
              <h3 className="font-bold text-slate-900 text-sm">Instalar como Aplicación Web (PWA)</h3>
            </div>

            <p className="text-xs text-slate-600 leading-normal">
              Añade el icono de la app a tu barra de tareas y escritorio directamente desde tu navegador (Chrome o Microsoft Edge).
            </p>

            <button
              onClick={handleInstallPWA}
              disabled={isInstalled}
              className={`w-full py-2.5 px-4 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${
                isInstalled
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md cursor-pointer'
              }`}
            >
              {isInstalled ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>¡Ya instalada como Aplicación!</span>
                </>
              ) : (
                <>
                  <Laptop className="w-4 h-4 text-sky-400" />
                  <span>{deferredPrompt ? 'Instalar App en el Sistema' : 'Ver Guía de Instalación Chrome/Edge'}</span>
                </>
              )}
            </button>
          </div>

          {/* Manual Instructions for Chrome / Edge */}
          <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <strong className="text-slate-800 font-bold block">💡 Manual para Google Chrome y Microsoft Edge:</strong>
            <ol className="list-decimal pl-4 space-y-1 leading-relaxed">
              <li>Haz clic en el menú de 3 puntos <strong>(⋮)</strong> en la esquina superior derecha del navegador.</li>
              <li>Selecciona <strong>Guardar y compartir</strong> o <strong>Más herramientas</strong>.</li>
              <li>Haz clic en <strong>Crear acceso directo...</strong> o <strong>Instalar esta página como aplicación</strong>.</li>
              <li>Asegúrate de marcar la casilla <strong>"Abrir como ventana"</strong> y presiona <strong>Crear</strong>.</li>
            </ol>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Entendido / Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
