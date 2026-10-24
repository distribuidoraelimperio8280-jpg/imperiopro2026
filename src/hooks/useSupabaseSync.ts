import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { supabaseDataService } from '../services/supabaseDataService';
import type { Factura, Cliente, Producto, TransaccionInventario } from '../types/supabase';
import type { User } from '@supabase/supabase-js';

export function useSupabaseSync() {
  const [user, setUser] = useState<User | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [inventario, setInventario] = useState<TransaccionInventario[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Escuchar cambios de estado de autenticación en Supabase
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    // Verificar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Función para consultar todos los datos del usuario en Supabase
  const refreshData = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await supabaseDataService.loadAllUserData(user.id);
      setClientes(data.clientes);
      setProductos(data.productos);
      setFacturas(data.facturas);
      setInventario(data.inventario);
      setLastSyncedAt(new Date());
    } catch (err: any) {
      console.error('[useSupabaseSync] Error al sincronizar:', err);
      setError(err.message || 'Error al conectar con Supabase');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Al cambiar el usuario autenticado, cargar datos y activar Realtime
  useEffect(() => {
    if (!user) {
      setClientes([]);
      setProductos([]);
      setFacturas([]);
      setInventario([]);
      setIsRealtimeActive(false);
      return;
    }

    refreshData();

    // Suscribirse a cambios en tiempo real desde otras computadoras/dispositivos
    const unsubscribe = supabaseDataService.subscribeToRealtime(user.id, {
      onClienteChange: () => refreshData(),
      onProductoChange: () => refreshData(),
      onFacturaChange: () => refreshData(),
      onInventarioChange: () => refreshData(),
    });

    setIsRealtimeActive(true);

    return () => {
      unsubscribe();
      setIsRealtimeActive(false);
    };
  }, [user, refreshData]);

  // Helper CRUD: Clientes
  const addCliente = async (cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('Usuario no autenticado');
    const nuevo = await supabaseDataService.createCliente(cliente, user.id);
    setClientes((prev) => [...prev, nuevo]);
    return nuevo;
  };

  const editCliente = async (id: string, updates: Partial<Cliente>) => {
    if (!user) throw new Error('Usuario no autenticado');
    const actualizado = await supabaseDataService.updateCliente(id, updates, user.id);
    setClientes((prev) => prev.map((c) => (c.id === id ? actualizado : c)));
    return actualizado;
  };

  const removeCliente = async (id: string) => {
    if (!user) throw new Error('Usuario no autenticado');
    await supabaseDataService.deleteCliente(id, user.id);
    setClientes((prev) => prev.filter((c) => c.id !== id));
  };

  // Helper CRUD: Productos
  const addProducto = async (producto: Omit<Producto, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('Usuario no autenticado');
    const nuevo = await supabaseDataService.createProducto(producto, user.id);
    setProductos((prev) => [...prev, nuevo]);
    return nuevo;
  };

  const editProducto = async (id: string, updates: Partial<Producto>) => {
    if (!user) throw new Error('Usuario no autenticado');
    const actualizado = await supabaseDataService.updateProducto(id, updates, user.id);
    setProductos((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
    return actualizado;
  };

  const removeProducto = async (id: string) => {
    if (!user) throw new Error('Usuario no autenticado');
    await supabaseDataService.deleteProducto(id, user.id);
    setProductos((prev) => prev.filter((p) => p.id !== id));
  };

  // Helper CRUD: Facturas
  const addFactura = async (factura: Omit<Factura, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('Usuario no autenticado');
    const nueva = await supabaseDataService.createFactura(factura, user.id);
    setFacturas((prev) => [nueva, ...prev]);
    return nueva;
  };

  const editFactura = async (id: string, updates: Partial<Factura>) => {
    if (!user) throw new Error('Usuario no autenticado');
    const actualizada = await supabaseDataService.updateFactura(id, updates, user.id);
    setFacturas((prev) => prev.map((f) => (f.id === id ? actualizada : f)));
    return actualizada;
  };

  const removeFactura = async (id: string) => {
    if (!user) throw new Error('Usuario no autenticado');
    await supabaseDataService.deleteFactura(id, user.id);
    setFacturas((prev) => prev.filter((f) => f.id !== id));
  };

  return {
    user,
    isAuthenticated: !!user,
    isConfigured: isSupabaseConfigured(),
    clientes,
    productos,
    facturas,
    inventario,
    isLoading,
    isRealtimeActive,
    error,
    lastSyncedAt,
    refreshData,
    addCliente,
    editCliente,
    removeCliente,
    addProducto,
    editProducto,
    removeProducto,
    addFactura,
    editFactura,
    removeFactura,
  };
}
