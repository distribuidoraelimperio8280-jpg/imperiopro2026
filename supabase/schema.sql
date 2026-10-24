-- ==============================================================================
-- SCRIPT SQL PARA SUPABASE: IMPERIO PRO DISTRIBUIDORA Y CONTABILIDAD
-- Incluye Tablas, Claves Foráneas, Índices, Triggers y Row Level Security (RLS)
-- ==============================================================================

-- 1. Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 2. TABLA: CLIENTES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    identificacion VARCHAR(100) NOT NULL,
    dv VARCHAR(10) DEFAULT '',
    tipo VARCHAR(50) DEFAULT 'cliente' CHECK (tipo IN ('cliente', 'proveedor', 'ambos')),
    email VARCHAR(255),
    telefono VARCHAR(50),
    whatsapp VARCHAR(50),
    direccion TEXT,
    ciudad VARCHAR(100),
    limite_credito NUMERIC(12, 2) DEFAULT 0.00,
    saldo NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. TABLA: PRODUCTOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(100) DEFAULT 'General',
    precio NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    costo NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tasa_itbms NUMERIC(5, 2) NOT NULL DEFAULT 7.00,
    stock_actual INTEGER NOT NULL DEFAULT 0,
    stock_minimo INTEGER NOT NULL DEFAULT 5,
    unidad_medida VARCHAR(50) DEFAULT 'Unidad',
    imagen_url TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT uq_user_sku UNIQUE (user_id, sku)
);

-- ------------------------------------------------------------------------------
-- 4. TABLA: FACTURAS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.facturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    numero_factura VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'venta' CHECK (tipo IN ('venta', 'compra')),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    cliente_nombre VARCHAR(255) NOT NULL,
    cliente_identificacion VARCHAR(100),
    cliente_email VARCHAR(255),
    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_descuento NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_impuestos NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    monto_pagado NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pagada', 'pendiente', 'vencida', 'anulada')),
    metodo_pago VARCHAR(50) NOT NULL DEFAULT 'efectivo' CHECK (metodo_pago IN ('efectivo', 'transferencia', 'tarjeta', 'credito', 'cheque')),
    notas TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT uq_user_factura UNIQUE (user_id, numero_factura)
);

-- ------------------------------------------------------------------------------
-- 5. TABLA: INVENTARIO (Movimientos y Kardex)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    producto_nombre VARCHAR(255),
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste', 'venta', 'devolucion')),
    cantidad INTEGER NOT NULL,
    stock_anterior INTEGER NOT NULL,
    stock_nuevo INTEGER NOT NULL,
    referencia_factura_id UUID REFERENCES public.facturas(id) ON DELETE SET NULL,
    motivo TEXT,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 6. ÍNDICES DE RENDIMIENTO (Performance Indexes)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_identificacion ON public.clientes(user_id, identificacion);

CREATE INDEX IF NOT EXISTS idx_productos_user_id ON public.productos(user_id);
CREATE INDEX IF NOT EXISTS idx_productos_sku ON public.productos(user_id, sku);

CREATE INDEX IF NOT EXISTS idx_facturas_user_id ON public.facturas(user_id);
CREATE INDEX IF NOT EXISTS idx_facturas_numero ON public.facturas(user_id, numero_factura);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON public.facturas(user_id, fecha_emision);

CREATE INDEX IF NOT EXISTS idx_inventario_user_id ON public.inventario(user_id);
CREATE INDEX IF NOT EXISTS idx_inventario_producto_id ON public.inventario(producto_id);

-- ------------------------------------------------------------------------------
-- 7. TRIGGER AUTOMÁTICO PARA ACTUALIZAR updated_at
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_clientes_updated_at ON public.clientes;
CREATE TRIGGER tr_clientes_updated_at
    BEFORE UPDATE ON public.clientes
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_productos_updated_at ON public.productos;
CREATE TRIGGER tr_productos_updated_at
    BEFORE UPDATE ON public.productos
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_facturas_updated_at ON public.facturas;
CREATE TRIGGER tr_facturas_updated_at
    BEFORE UPDATE ON public.facturas
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 8. HABILITAR ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 9. POLÍTICAS RLS: CLIENTES (Acceso exclusivo por user_id)
-- ------------------------------------------------------------------------------
CREATE POLICY "Clientes: Lectura propia" 
    ON public.clientes FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Clientes: Inserción propia" 
    ON public.clientes FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clientes: Actualización propia" 
    ON public.clientes FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clientes: Eliminación propia" 
    ON public.clientes FOR DELETE 
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 10. POLÍTICAS RLS: PRODUCTOS
-- ------------------------------------------------------------------------------
CREATE POLICY "Productos: Lectura propia" 
    ON public.productos FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Productos: Inserción propia" 
    ON public.productos FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Productos: Actualización propia" 
    ON public.productos FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Productos: Eliminación propia" 
    ON public.productos FOR DELETE 
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 11. POLÍTICAS RLS: FACTURAS
-- ------------------------------------------------------------------------------
CREATE POLICY "Facturas: Lectura propia" 
    ON public.facturas FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Facturas: Inserción propia" 
    ON public.facturas FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Facturas: Actualización propia" 
    ON public.facturas FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Facturas: Eliminación propia" 
    ON public.facturas FOR DELETE 
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 12. POLÍTICAS RLS: INVENTARIO
-- ------------------------------------------------------------------------------
CREATE POLICY "Inventario: Lectura propia" 
    ON public.inventario FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Inventario: Inserción propia" 
    ON public.inventario FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Inventario: Actualización propia" 
    ON public.inventario FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Inventario: Eliminación propia" 
    ON public.inventario FOR DELETE 
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 13. HABILITAR PUBLICACIÓN EN TIEMPO REAL (Supabase Realtime)
-- Permite que los cambios se sincronicen al instante entre múltiples PCs
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'clientes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'productos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.productos;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'facturas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.facturas;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'inventario'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventario;
  END IF;
END $$;
