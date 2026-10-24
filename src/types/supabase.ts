/**
 * Definiciones de Tipos de TypeScript para Supabase
 * Distribuidora y Facturación Imperio Pro
 */

export type TipoIdentificacion = 'RUC' | 'CEDULA' | 'PASAPORTE';
export type TipoCliente = 'cliente' | 'proveedor' | 'ambos';
export type EstadoFactura = 'pagada' | 'pendiente' | 'vencida' | 'anulada';
export type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta' | 'credito' | 'cheque';
export type TipoTransaccionInventario = 'entrada' | 'salida' | 'ajuste' | 'venta' | 'devolucion';

/**
 * 1. Interface para Cliente
 */
export interface Cliente {
  id?: string;
  user_id?: string;
  nombre: string;
  identificacion: string; // RUC o Cédula
  dv?: string; // Dígito verificador
  tipo: TipoCliente;
  email?: string;
  telefono?: string;
  whatsapp?: string;
  direccion?: string;
  ciudad?: string;
  limite_credito?: number;
  saldo?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * 2. Interface para Producto
 */
export interface Producto {
  id?: string;
  user_id?: string;
  sku: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  precio: number;
  costo: number;
  tasa_itbms: number; // 0, 7, 10, etc.
  stock_actual: number;
  stock_minimo: number;
  unidad_medida?: string;
  imagen_url?: string;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Detalle de Ítem de Factura
 */
export interface ItemFactura {
  id?: string;
  factura_id?: string;
  producto_id?: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  tasa_itbms: number;
  descuento: number;
  subtotal: number;
  impuesto_monto: number;
  total: number;
}

/**
 * 3. Interface para Factura
 */
export interface Factura {
  id?: string;
  user_id?: string;
  numero_factura: string;
  tipo: 'venta' | 'compra';
  cliente_id?: string;
  cliente_nombre: string;
  cliente_identificacion?: string;
  cliente_email?: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  subtotal: number;
  total_descuento: number;
  total_impuestos: number;
  total: number;
  monto_pagado: number;
  estado: EstadoFactura;
  metodo_pago: MetodoPago;
  notas?: string;
  items?: ItemFactura[];
  created_at?: string;
  updated_at?: string;
}

/**
 * 4. Interface para Transacción de Inventario
 */
export interface TransaccionInventario {
  id?: string;
  user_id?: string;
  producto_id: string;
  producto_nombre?: string;
  tipo: TipoTransaccionInventario;
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  referencia_factura_id?: string;
  motivo?: string;
  fecha: string;
  created_at?: string;
}

/**
 * Mapeo de esquema para el cliente tipado de Supabase
 */
export interface Database {
  public: {
    Tables: {
      clientes: {
        Row: Cliente;
        Insert: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Cliente, 'id' | 'user_id'>>;
      };
      productos: {
        Row: Producto;
        Insert: Omit<Producto, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Producto, 'id' | 'user_id'>>;
      };
      facturas: {
        Row: Factura;
        Insert: Omit<Factura, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Factura, 'id' | 'user_id'>>;
      };
      inventario: {
        Row: TransaccionInventario;
        Insert: Omit<TransaccionInventario, 'id' | 'created_at'>;
        Update: Partial<Omit<TransaccionInventario, 'id' | 'user_id'>>;
      };
    };
  };
}
