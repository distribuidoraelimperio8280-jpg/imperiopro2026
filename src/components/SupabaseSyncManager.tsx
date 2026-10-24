import React, { useState } from 'react';
import { 
  Cloud, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  Users, 
  Package, 
  FileText, 
  Boxes, 
  Radio, 
  ArrowUpRight, 
  ShieldCheck, 
  Copy, 
  Check,
  ExternalLink
} from 'lucide-react';
import { useSupabaseSync } from '../hooks/useSupabaseSync';
import { isSupabaseConfigured } from '../lib/supabase';

export const SupabaseSyncManager: React.FC = () => {
  const {
    user,
    isAuthenticated,
    clientes,
    productos,
    facturas,
    inventario,
    isLoading,
    isRealtimeActive,
    error,
    lastSyncedAt,
    refreshData,
  } = useSupabaseSync();

  const [copiedSQL, setCopiedSQL] = useState(false);
  const isConfigured = isSupabaseConfigured();

  const handleCopySQLNotice = () => {
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-6 p-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800">
                Sincronización en la Nube con Supabase
              </h3>
              {isConfigured ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Configurado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Pendiente .env
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Almacenamiento relacional Postgres con Row Level Security (RLS) y suscripciones Realtime.
            </p>
          </div>
        </div>

        {/* Botón de Sincronización Manual */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refreshData()}
            disabled={isLoading || !isConfigured}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Sincronizando...' : 'Consultar Supabase'}</span>
          </button>
        </div>
      </div>

      {/* Estado de Conexión y Autenticación */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Usuario Supabase</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-sm font-black text-slate-800 truncate">
            {user ? user.email : 'Sin sesión en Supabase'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {user ? `UID: ${user.id.slice(0, 8)}...` : 'Inicia sesión con correo y contraseña'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Canal Realtime</span>
            <Radio className={`w-4 h-4 ${isRealtimeActive ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <p className="text-sm font-black text-slate-800">
            {isRealtimeActive ? 'Activo en Vivo' : 'Inactivo'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Escucha INSERT / UPDATE / DELETE
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium mb-1">
            <span>Última Consulta</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-sm font-black text-slate-800">
            {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : 'Aún no consultado'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Tablas: facturas, clientes, productos, inventario
          </p>
        </div>
      </div>

      {/* Banner de Variables si falta configurar */}
      {!isConfigured && (
        <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl text-xs text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Paso necesario: Añadir tus credenciales de Supabase</span>
          </div>
          <p className="leading-relaxed text-[11px] text-amber-800">
            Para activar la sincronización real con tu proyecto de Supabase en la nube, define en tu archivo <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">.env</code>:
          </p>
          <div className="bg-amber-100/70 p-2.5 rounded-xl font-mono text-[11px] text-amber-950 space-y-1">
            <div>VITE_SUPABASE_URL=https://tu-proyecto.supabase.co</div>
            <div>VITE_SUPABASE_ANON_KEY=tu-anon-key-de-supabase</div>
          </div>
        </div>
      )}

      {/* Tarjetas de Conteo de Tablas en Supabase */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Tablas Sincronizadas por Usuario (user_id)
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Clientes</p>
              <p className="text-lg font-black text-slate-800">{clientes.length}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Productos</p>
              <p className="text-lg font-black text-slate-800">{productos.length}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Facturas</p>
              <p className="text-lg font-black text-slate-800">{facturas.length}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Inventario</p>
              <p className="text-lg font-black text-slate-800">{inventario.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Script SQL y Configuración de RLS */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Database className="w-4 h-4 text-emerald-600" />
          <span>Esquema SQL con RLS guardado en <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-bold">/supabase/schema.sql</code></span>
        </span>

        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          <span>Ir a Consola Supabase</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};

export default SupabaseSyncManager;
