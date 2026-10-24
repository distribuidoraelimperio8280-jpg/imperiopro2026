/// <reference types="vite/client" />
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Leer variables de entorno de Vite o process.env de forma segura
const rawEnvUrl = (import.meta as any).env?.VITE_SUPABASE_URL ?? (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '') ?? '';
const rawEnvKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : '') ?? '';

/**
 * Extrae el project reference desde el payload del token JWT de Supabase
 */
function extractRefFromJwt(token: string): string | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.trim().split('.');
    if (parts.length === 3) {
      // Usar atob en el navegador o Buffer en Node
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf-8');
      const payload = JSON.parse(jsonStr);
      if (payload && typeof payload.ref === 'string' && payload.ref.length > 3) {
        return payload.ref;
      }
    }
  } catch {
    // Si falla el parsing, continuar
  }
  return null;
}

/**
 * Resuelve y sanitiza la URL de Supabase.
 * Corrige automáticamente si el usuario ingresó una clave o token en el campo de la URL.
 */
export function resolveSupabaseCredentials(): { url: string | null; key: string | null } {
  let urlCandidate = typeof rawEnvUrl === 'string' ? rawEnvUrl.trim() : '';
  let keyCandidate = typeof rawEnvKey === 'string' ? rawEnvKey.trim() : '';

  // 1. Detección de swap: Si la URL parece un JWT o una clave API (inicia con eyJ... o sb_)
  const urlLooksLikeKey = urlCandidate.startsWith('eyJ') || urlCandidate.startsWith('sb_');
  const keyLooksLikeUrl = keyCandidate.startsWith('http://') || keyCandidate.startsWith('https://') || keyCandidate.includes('.supabase.co');

  if (urlLooksLikeKey && keyLooksLikeUrl) {
    // Los campos fueron invertidos
    const temp = urlCandidate;
    urlCandidate = keyCandidate;
    keyCandidate = temp;
  }

  // 2. Si la URL sigue siendo una clave (ej: sb_publishable_...), intentar deducir el project ref desde el JWT
  if (urlLooksLikeKey || !urlCandidate || !urlCandidate.includes('.')) {
    const refFromKey = extractRefFromJwt(keyCandidate) || extractRefFromJwt(urlCandidate);
    if (refFromKey) {
      urlCandidate = `https://${refFromKey}.supabase.co`;
    }
  }

  // 3. Normalizar protocolo si se omitió https://
  if (urlCandidate && !urlCandidate.startsWith('http://') && !urlCandidate.startsWith('https://')) {
    if (urlCandidate.includes('.supabase.co') || urlCandidate.includes('.')) {
      urlCandidate = `https://${urlCandidate}`;
    }
  }

  // 4. Validar estrictamente la URL con new URL()
  let validUrl: string | null = null;
  if (urlCandidate && (urlCandidate.startsWith('http://') || urlCandidate.startsWith('https://'))) {
    try {
      const parsed = new URL(urlCandidate);
      if (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        parsed.hostname &&
        parsed.hostname.includes('.') &&
        !parsed.hostname.includes('tu-proyecto') &&
        !parsed.hostname.includes('placeholder')
      ) {
        validUrl = parsed.origin;
      }
    } catch {
      validUrl = null;
    }
  }

  // 5. Validar la clave API
  let validKey: string | null = null;
  if (keyCandidate && !keyCandidate.includes('placeholder') && !keyCandidate.includes('tu-anon-key')) {
    validKey = keyCandidate;
  } else if (urlLooksLikeKey && !urlCandidate.startsWith('http')) {
    validKey = urlCandidate;
  }

  return { url: validUrl, key: validKey };
}

const { url: resolvedUrl, key: resolvedKey } = resolveSupabaseCredentials();

/**
 * Verifica si las credenciales de Supabase están correctamente configuradas y validadas
 */
export const isSupabaseConfigured = (): boolean => {
  return resolvedUrl !== null && resolvedKey !== null;
};

/**
 * Crea un cliente dummy seguro que no arroja excepciones en el montaje inicial
 * si las credenciales no están presentes en el entorno.
 */
function createSafeDummyClient(): SupabaseClient {
  const dummyQueryBuilder: any = {
    select: () => dummyQueryBuilder,
    insert: () => dummyQueryBuilder,
    update: () => dummyQueryBuilder,
    delete: () => dummyQueryBuilder,
    eq: () => dummyQueryBuilder,
    order: () => dummyQueryBuilder,
    single: async () => ({ data: null, error: null }),
    then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
  };

  const dummyChannel: any = {
    on: () => dummyChannel,
    subscribe: (cb?: (status: string) => void) => {
      if (cb) cb('CLOSED');
      return dummyChannel;
    },
    unsubscribe: () => Promise.resolve('ok'),
  };

  const clientStub: any = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: new Error('Supabase no está configurado en .env. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'),
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: new Error('Supabase no está configurado en .env. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'),
      }),
      signOut: async () => ({ error: null }),
    },
    from: () => dummyQueryBuilder,
    channel: () => dummyChannel,
  };

  return clientStub as SupabaseClient;
}

/**
 * Inicialización controlada y a prueba de caídas del cliente Supabase
 */
let clientInstance: SupabaseClient;

try {
  if (isSupabaseConfigured() && resolvedUrl && resolvedKey) {
    clientInstance = createClient(resolvedUrl, resolvedKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    console.log(`[Supabase] Cliente inicializado correctamente para: ${resolvedUrl}`);
  } else {
    clientInstance = createSafeDummyClient();
  }
} catch (initError) {
  console.warn('[Supabase] Inicialización fallida. Usando cliente seguro local:', initError);
  clientInstance = createSafeDummyClient();
}

export const supabase = clientInstance;

/**
 * Helper para obtener el usuario autenticado actual de Supabase
 */
export async function getCurrentSupabaseUser() {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

export default supabase;
