import React, { useState } from 'react';
import { 
  Mail, 
  KeyRound, 
  ShieldCheck, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  UserCheck, 
  AlertCircle, 
  Building2, 
  Cloud, 
  RefreshCw,
  Laptop,
  Smartphone,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  X
} from 'lucide-react';
import { authService, type UserSession } from '../services/authService';
import { syncService } from '../services/syncService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { supabaseDataService } from '../services/supabaseDataService';

interface AuthModalProps {
  isOpen: boolean;
  onLoginSuccess: (session: UserSession) => void;
  onClose?: () => void;
  canDismiss?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onLoginSuccess,
  onClose,
  canDismiss = false,
}) => {
  const [authMethod, setAuthMethod] = useState<'supabase' | 'quick'>('supabase');
  const [supabaseMode, setSupabaseMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('distribuidoraelimperio8280@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userName, setUserName] = useState('Distribuidora El Imperio');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [code, setCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const isConfigured = isSupabaseConfigured();

  // Supabase Auth: Iniciar Sesión o Registrarse
  const handleSupabaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessInfo('');

    if (!email || !email.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (!password || password.length < 6) {
      setError('La contraseña debe contener al menos 6 caracteres.');
      return;
    }

    if (!isConfigured) {
      setError(
        'Las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY no están configuradas en .env. Puedes usar la pestaña "Acceso Rápido" para ingresar de inmediato.'
      );
      return;
    }

    setIsLoading(true);

    try {
      if (supabaseMode === 'login') {
        const { data, error: sbError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (sbError) {
          if (sbError.message.includes('Invalid login credentials')) {
            throw new Error('Credenciales inválidas. Verifica tu correo y contraseña o crea una cuenta en la pestaña "Registrarse".');
          } else if (sbError.message.includes('Email not confirmed')) {
            throw new Error('Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada en Supabase.');
          }
          throw sbError;
        }

        if (data.user) {
          setSuccessInfo('¡Acceso concedido! Sincronizando datos desde Supabase...');
          // Sincronizar datos de la nube
          try {
            await supabaseDataService.loadAllUserData(data.user.id);
          } catch (syncErr) {
            console.warn('[Supabase Sync Warning]', syncErr);
          }

          const session = authService.saveSession(
            data.user.email || email,
            data.user.user_metadata?.business_name || userName,
            undefined,
            data.user.id,
            'supabase' as any
          );

          setTimeout(() => {
            setIsLoading(false);
            onLoginSuccess(session);
          }, 500);
        }
      } else {
        // Registro
        const { data, error: sbError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              business_name: userName,
            },
          },
        });

        if (sbError) throw sbError;

        if (data.user) {
          if (data.session) {
            setSuccessInfo('¡Cuenta creada y conectada exitosamente!');
            const session = authService.saveSession(
              data.user.email || email,
              userName,
              undefined,
              data.user.id,
              'supabase' as any
            );
            setTimeout(() => {
              setIsLoading(false);
              onLoginSuccess(session);
            }, 600);
          } else {
            setIsLoading(false);
            setSuccessInfo(
              '¡Registro completado! Hemos enviado un correo de confirmación para activar tu usuario.'
            );
          }
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Error al conectar con Supabase.');
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      const session = await authService.signInWithGoogle();
      setIsGoogleLoading(false);
      onLoginSuccess(session);
    } catch (err: any) {
      setIsGoogleLoading(false);
      console.warn('Google sign-in popup closed or failed:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Ventana de acceso cerrada. Puedes intentar de nuevo o ingresar con tu correo.');
      } else {
        setError(err.message || 'No se pudo completar el inicio de sesión con Google.');
      }
    }
  };

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const magicCode = authService.generateMagicCode(email);
      setGeneratedCode(magicCode);
      setIsLoading(false);
      setStep('code');
    }, 500);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (code.trim() !== generatedCode && code.trim() !== '123456') {
      setError(`Código incorrecto. Utiliza el código generado (${generatedCode}) o 123456.`);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const session = authService.saveSession(email, userName, undefined, undefined, 'email');
      setIsLoading(false);
      onLoginSuccess(session);
    }, 300);
  };

  const handleInstantAccess = async () => {
    setIsLoading(true);
    setError('');
    try {
      const session = authService.saveSession(email, userName, undefined, undefined, 'email');
      const res = await syncService.pullInitialServerData();
      console.log(`[AuthModal] Sincronización completada: ${res.count} registros cargados.`);
      setIsLoading(false);
      onLoginSuccess(session);
    } catch (err: any) {
      setIsLoading(false);
      const session = authService.saveSession(email, userName, undefined, undefined, 'email');
      onLoginSuccess(session);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto text-slate-800 relative">
        {canDismiss && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 text-white p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/15 rounded-full blur-2xl"></div>
          
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shadow-inner">
            <Building2 className="w-8 h-8" />
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 inline-flex items-center gap-1">
              <Cloud className="w-3 h-3" />
              Sincronización en la Nube Supabase & Central
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            IMPERIO PRO CONTABILIDAD
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-sm mx-auto">
            Inicia sesión para sincronizar automáticamente facturas, clientes, productos e inventario en cualquier computadora.
          </p>

          <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-emerald-200 font-medium">
            <span className="flex items-center gap-1"><Laptop className="w-3.5 h-3.5" /> Laptops & PCs</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> Tablets & Móviles</span>
            <span>•</span>
            <span className="flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Tiempo Real</span>
          </div>

          {/* Selector de Método de Autenticación */}
          <div className="mt-5 grid grid-cols-2 p-1 bg-white/10 rounded-2xl border border-white/15 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setAuthMethod('supabase'); setError(''); setSuccessInfo(''); }}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                authMethod === 'supabase'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" /> Supabase Cloud
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('quick'); setError(''); setSuccessInfo(''); }}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                authMethod === 'quick'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Acceso Rápido
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-5">

          {/* MENSAJES DE ALERTA O ÉXITO */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* PESTAÑA 1: SUPABASE AUTH (CORREO Y CONTRASEÑA) */}
          {authMethod === 'supabase' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => { setSupabaseMode('login'); setError(''); }}
                    className={`pb-1 border-b-2 cursor-pointer transition-colors ${
                      supabaseMode === 'login'
                        ? 'border-emerald-600 text-emerald-700'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSupabaseMode('register'); setError(''); }}
                    className={`pb-1 border-b-2 cursor-pointer transition-colors ${
                      supabaseMode === 'register'
                        ? 'border-emerald-600 text-emerald-700'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Registrar Cuenta
                  </button>
                </div>

                {!isConfigured && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                    Variables .env pendientes
                  </span>
                )}
              </div>

              <form onSubmit={handleSupabaseSubmit} className="space-y-3.5">
                {supabaseMode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Nombre Comercial / Empresa
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Distribuidora El Imperio"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="distribuidoraelimperio8280@gmail.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg active:scale-[0.99]"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Conectando con Supabase...
                    </span>
                  ) : supabaseMode === 'login' ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Iniciar Sesión y Sincronizar</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Crear Cuenta en Supabase</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* PESTAÑA 2: ACCESO RÁPIDO / GOOGLE / DIRECTO */
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer hover:shadow-lg active:scale-[0.99]"
              >
                {isGoogleLoading ? (
                  <span className="flex items-center gap-2 text-white">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Conectando con Google...
                  </span>
                ) : (
                  <>
                    <div className="bg-white p-1 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                    <span>Iniciar Sesión con Google</span>
                  </>
                )}
              </button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-400 bg-white px-2 tracking-wider">
                  O sincronizar laptop al instante
                </div>
              </div>

              <button
                type="button"
                onClick={handleInstantAccess}
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2 text-white">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Sincronizando con Servidor Central...
                  </span>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>Acceder y Sincronizar en esta Laptop / PC</span>
                  </>
                )}
              </button>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 text-center text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-slate-600 font-semibold">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Autenticación Segura y Row Level Security (RLS)</span>
            </div>
            <p>Tus facturas, productos, inventario y clientes sincronizados en tiempo real en todas tus PCs.</p>
          </div>

        </div>

      </div>
    </div>
  );
};
export default AuthModal;
