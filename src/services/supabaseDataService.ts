import { supabase, isSupabaseConfigured, getCurrentSupabaseUser } from '../lib/supabase';
import type { Factura, Cliente, Producto, TransaccionInventario } from '../types/supabase';
import { db } from '../db/indexedDB';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SupabaseSyncState {
  facturas: Factura[];
  clientes: Cliente[];
  productos: Producto[];
  inventario: TransaccionInventario[];
  isLoading: boolean;
  isRealtimeActive: boolean;
  lastSyncedAt: string | null;
  error: string | null;
}

class SupabaseDataService {
  private activeChannel: RealtimeChannel | null = null;

  /**
   * Carga inicial completa de todas las tablas desde Supabase para el usuario autenticado
   */
  async loadAllUserData(userId?: string): Promise<{
    facturas: Factura[];
    clientes: Cliente[];
    productos: Producto[];
    inventario: TransaccionInventario[];
  }> {
    if (!isSupabaseConfigured()) {
      console.warn('[Supabase] Credenciales no configuradas. Usando almacenamiento local.');
      return { facturas: [], clientes: [], productos: [], inventario: [] };
    }

    const currentUserId = userId || (await getCurrentSupabaseUser())?.id;
    if (!currentUserId) {
      throw new Error('No hay una sesión activa de usuario en Supabase.');
    }

    try {
      // 1. Consultar clientes
      const { data: clientesData, error: clientesError } = await (supabase.from('clientes') as any)
        .select('*')
        .eq('user_id', currentUserId)
        .order('nombre', { ascending: true });

      if (clientesError) throw clientesError;

      // 2. Consultar productos
      const { data: productosData, error: productosError } = await (supabase.from('productos') as any)
        .select('*')
        .eq('user_id', currentUserId)
        .order('nombre', { ascending: true });

      if (productosError) throw productosError;

      // 3. Consultar facturas
      const { data: facturasData, error: facturasError } = await (supabase.from('facturas') as any)
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (facturasError) throw facturasError;

      // 4. Consultar inventario
      const { data: inventarioData, error: inventarioError } = await (supabase.from('inventario') as any)
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (inventarioError) throw inventarioError;

      const result = {
        clientes: (clientesData as Cliente[]) || [],
        productos: (productosData as Producto[]) || [],
        facturas: (facturasData as Factura[]) || [],
        inventario: (inventarioData as TransaccionInventario[]) || [],
      };

      // Opcional: sincronizar en caché local Dexie para soporte offline
      await this.syncToLocalDexie(result);

      return result;
    } catch (err: any) {
      console.error('[Supabase] Error al consultar datos en la nube:', err);
      throw err;
    }
  }

  /**
   * Refleja los datos de Supabase en la base de datos local IndexedDB (Dexie)
   */
  private async syncToLocalDexie(data: {
    clientes: Cliente[];
    productos: Producto[];
    facturas: Factura[];
  }) {
    try {
      if (data.clientes.length > 0) {
        for (const c of data.clientes) {
          if (!c.id) continue;
          await db.contacts.put({
            id: c.id,
            name: c.nombre,
            rucOrCedula: c.identificacion,
            dv: c.dv || '',
            email: c.email || '',
            phone: c.telefono || '',
            whatsapp: c.whatsapp || '',
            address: c.direccion || '',
            type: c.tipo === 'proveedor' ? 'provider' : c.tipo === 'ambos' ? 'both' : 'client',
            creditLimit: Number(c.limite_credito || 0),
            balance: Number(c.saldo || 0),
            createdAt: c.created_at || new Date().toISOString(),
            updatedAt: c.updated_at || new Date().toISOString(),
          });
        }
      }

      if (data.productos.length > 0) {
        for (const p of data.productos) {
          if (!p.id) continue;
          await db.products.put({
            id: p.id,
            sku: p.sku,
            name: p.nombre,
            category: p.categoria || 'General',
            unit: p.unidad_medida || 'Unidad',
            price: Number(p.precio),
            cost: Number(p.costo),
            taxRate: (p.tasa_itbms === 7 ? 7 : p.tasa_itbms === 0 ? 0 : 7) as any,
            type: 'product',
            stock: Number(p.stock_actual),
            minStockAlert: Number(p.stock_minimo),
            description: p.descripcion || '',
            imageUrl: p.imagen_url || '',
            createdAt: p.created_at || new Date().toISOString(),
            updatedAt: p.updated_at || new Date().toISOString(),
          });
        }
      }

      if (data.facturas.length > 0) {
        for (const f of data.facturas) {
          if (!f.id) continue;
          await db.invoices.put({
            id: f.id,
            code: f.numero_factura,
            type: f.tipo === 'compra' ? 'purchase' : 'sale',
            contactId: f.cliente_id || '',
            contactName: f.cliente_nombre,
            contactRuc: f.cliente_identificacion || '',
            contactEmail: f.cliente_email || '',
            date: f.fecha_emision,
            dueDate: f.fecha_vencimiento,
            items: (f.items as any[]) || [],
            subtotal: Number(f.subtotal),
            discountTotal: Number(f.total_descuento),
            taxTotal: Number(f.total_impuestos),
            total: Number(f.total),
            paidAmount: Number(f.monto_pagado),
            status: f.estado === 'pagada' ? 'paid' : f.estado === 'vencida' ? 'overdue' : 'pending',
            paymentMethod: (f.metodo_pago === 'efectivo' ? 'cash' : f.metodo_pago === 'transferencia' ? 'transfer' : 'card') as any,
            notes: f.notas || '',
            isSynced: true,
            offlineCreated: false,
            createdAt: f.created_at || new Date().toISOString(),
            updatedAt: f.updated_at || new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.warn('[Supabase -> LocalDB] Error menor al sincronizar con almacenamiento local:', err);
    }
  }

  // ============================================================================
  // OPERACIONES CRUD: CLIENTES
  // ============================================================================
  async createCliente(cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>, userId: string): Promise<Cliente> {
    const { data, error } = await (supabase.from('clientes') as any)
      .insert({ ...cliente, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return data as Cliente;
  }

  async updateCliente(id: string, updates: Partial<Cliente>, userId: string): Promise<Cliente> {
    const { data, error } = await (supabase.from('clientes') as any)
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as Cliente;
  }

  async deleteCliente(id: string, userId: string): Promise<void> {
    const { error } = await (supabase.from('clientes') as any)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // ============================================================================
  // OPERACIONES CRUD: PRODUCTOS
  // ============================================================================
  async createProducto(producto: Omit<Producto, 'id' | 'created_at' | 'updated_at'>, userId: string): Promise<Producto> {
    const { data, error } = await (supabase.from('productos') as any)
      .insert({ ...producto, user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return data as Producto;
  }

  async updateProducto(id: string, updates: Partial<Producto>, userId: string): Promise<Producto> {
    const { data, error } = await (supabase.from('productos') as any)
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as Producto;
  }

  async deleteProducto(id: string, userId: string): Promise<void> {
    const { error } = await (supabase.from('productos') as any)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // ============================================================================
  // OPERACIONES CRUD: FACTURAS
  // ============================================================================
  async createFactura(factura: Omit<Factura, 'id' | 'created_at' | 'updated_at'>, userId: string): Promise<Factura> {
    const { data, error } = await (supabase.from('facturas') as any)
      .insert({ ...factura, user_id: userId })
      .select()
      .single();

    if (error) throw error;

    // Registrar transacciones de inventario automáticas para productos de la factura
    if (factura.items && factura.items.length > 0) {
      for (const item of factura.items) {
        if (item.producto_id) {
          await this.recordInventario({
            user_id: userId,
            producto_id: item.producto_id,
            producto_nombre: item.nombre,
            tipo: factura.tipo === 'compra' ? 'entrada' : 'salida',
            cantidad: item.cantidad,
            stock_anterior: 0,
            stock_nuevo: 0,
            referencia_factura_id: (data as any).id,
            motivo: `Factura ${factura.numero_factura} (${factura.tipo})`,
            fecha: new Date().toISOString(),
          });
        }
      }
    }

    return data as Factura;
  }

  async updateFactura(id: string, updates: Partial<Factura>, userId: string): Promise<Factura> {
    const { data, error } = await (supabase.from('facturas') as any)
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as Factura;
  }

  async deleteFactura(id: string, userId: string): Promise<void> {
    const { error } = await (supabase.from('facturas') as any)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // ============================================================================
  // OPERACIONES: INVENTARIO
  // ============================================================================
  async recordInventario(item: Omit<TransaccionInventario, 'id' | 'created_at'>): Promise<TransaccionInventario> {
    const { data, error } = await (supabase.from('inventario') as any)
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    return data as TransaccionInventario;
  }

  // ============================================================================
  // SINCRONIZACIÓN EN TIEMPO REAL (Postgres Changes Subscriptions)
  // ============================================================================
  subscribeToRealtime(
    userId: string,
    callbacks: {
      onClienteChange?: (payload: any) => void;
      onProductoChange?: (payload: any) => void;
      onFacturaChange?: (payload: any) => void;
      onInventarioChange?: (payload: any) => void;
    }
  ): () => void {
    if (!isSupabaseConfigured() || !userId) {
      return () => {};
    }

    if (this.activeChannel) {
      this.activeChannel.unsubscribe();
    }

    const channel = supabase
      .channel(`user-realtime-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clientes', filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log('[Supabase Realtime] Clientes actualizado:', payload);
          callbacks.onClienteChange?.(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'productos', filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log('[Supabase Realtime] Productos actualizado:', payload);
          callbacks.onProductoChange?.(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'facturas', filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log('[Supabase Realtime] Facturas actualizado:', payload);
          callbacks.onFacturaChange?.(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventario', filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log('[Supabase Realtime] Inventario actualizado:', payload);
          callbacks.onInventarioChange?.(payload);
        }
      )
      .subscribe((status) => {
        console.log(`[Supabase Realtime Channel] Estado de conexión: ${status}`);
      });

    this.activeChannel = channel;

    return () => {
      channel.unsubscribe();
      this.activeChannel = null;
    };
  }
}

export const supabaseDataService = new SupabaseDataService();
export default supabaseDataService;
