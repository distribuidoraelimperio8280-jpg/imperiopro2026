import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Building2, 
  Cloud, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  X,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  LogIn
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface SupabaseAuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: (user: User) => void;
  canDismiss?: boolean;
}

export const SupabaseAuthModal: React.FC<SupabaseAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  canDismiss = false,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('distribuidoraelimperio8280@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nombreNegocio, setNombreNegocio] = useState('Distribuidora El Imperio');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [mode, isOpen]);

  if (!isOpen) return null;

  // Manejo de Inicio de Sesión
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (!isConfigured) {
      setErrorMessage(
        'Las variables de entorno de Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY) aún no han sido configuradas en el archivo .env.'
      );
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Credenciales inválidas. Verifica tu correo y contraseña, o regístrate si aún no tienes cuenta.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada o desactiva la confirmación en Supabase.');
        } else {
          throw error;
        }
      }

      if (data.user) {
        setSuccessMessage('¡Inicio de sesión exitoso! Sincronizando datos en tiempo real...');
        setTimeout(() => {
          onSuccess?.(data.user);
          onClose?.();
        }, 600);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  // Manejo de Registro
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (!isConfigured) {
      setErrorMessage(
        'Las variables de entorno de Supabase no están configuradas en .env. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
      );
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            business_name: nombreNegocio,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        if (data.session) {
          setSuccessMessage('¡Cuenta creada e iniciada con éxito! Descargando entorno...');
          setTimeout(() => {
            onSuccess?.(data.user);
            onClose?.();
          }, 600);
        } else {
          setSuccessMessage(
            '¡Registro completado! Hemos enviado un enlace de confirmación a tu correo para activar el acceso.'
          );
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al registrar usuario.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-auto text-slate-800 relative">
        {canDismiss && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Encabezado */}
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white p-6 sm:p-7 text-center relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>

          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shadow-inner">
            <Building2 className="w-7 h-7" />
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 inline-flex items-center gap-1">
              <Cloud className="w-3 h-3" />
              Sincronización en la Nube Supabase
            </span>
          </div>

          <h2 className="text-xl font-black text-white tracking-tight">
            IMPERIO PRO DISTRIBUIDORA
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Accede con tu cuenta para sincronizar facturas, clientes e inventario en tiempo real en todas tus PCs.
          </p>

          {/* Selector de Modo: Login / Registro */}
          <div className="mt-5 grid grid-cols-2 p-1 bg-white/10 rounded-xl border border-white/15 text-xs font-bold">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" /> Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Registrarse
            </button>
          </div>
        </div>

        {/* Mensaje si Supabase no está configurado */}
        {!isConfigured && (
          <div className="mx-6 mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Configuración de Supabase requerida</p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Define <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code> y <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_ANON_KEY</code> en tu archivo <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env</code> para habilitar la autenticación activa en la nube.
              </p>
            </div>
          </div>
        )}

        {/* Mensajes de Alerta */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-xs text-rose-800 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="leading-tight">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2 text-xs text-emerald-800 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-tight font-medium">{successMessage}</p>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={mode === 'login' ? handleSignIn : handleSignUp} className="p-6 space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nombre de la Empresa o Sucursal
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={nombreNegocio}
                  onChange={(e) => setNombreNegocio(e.target.value)}
                  placeholder="Distribuidora El Imperio"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="distribuidoraelimperio8280@gmail.com"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Mínimo 6 caracteres.</p>
          </div>

          {/* Botón de Envío */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg active:scale-[0.99] mt-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Conectando con Supabase...
              </span>
            ) : mode === 'login' ? (
              <>
                <span>Iniciar Sesión en esta PC</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Crear Cuenta en Supabase</span>
                <UserPlus className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Protegido con Supabase Auth y Row Level Security (RLS)</span>
        </div>
      </div>
    </div>
  );
};

export default SupabaseAuthModal;
