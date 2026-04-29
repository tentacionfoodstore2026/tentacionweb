-- ============================================================================
-- UPGRADE: Sistema completo de Pedidos + Delivery + Notificaciones
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================================================

-- 1. Ampliar perfiles para soportar desactivación
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 2. Ampliar la tabla orders con campos de delivery
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS delivery_reference text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;

-- Actualizar el check de status para incluir el nuevo flujo
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN (
    'pending',       -- Recibido, esperando cocina
    'confirmed',     -- Cocina lo aceptó y está preparando
    'ready',         -- Listo para retirar (conductor puede tomarlo)
    'assigned',      -- Conductor asignado
    'picked_up',     -- Conductor retiró el pedido
    'delivering',    -- En camino al cliente
    'delivered',     -- Entregado
    'cancelled'      -- Cancelado
  ));

-- 2. Tabla de notificaciones del sistema
CREATE TABLE IF NOT EXISTS public.order_notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_role text, -- 'user', 'repartidor', 'all_drivers', 'kitchen'
  type text NOT NULL, -- 'order_ready', 'driver_assigned', 'picked_up', 'delivered', etc.
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de notificaciones push personalizadas (desde admin)
CREATE TABLE IF NOT EXISTS public.push_notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id uuid REFERENCES public.profiles(id),
  target text NOT NULL, -- 'all', 'drivers', 'specific'
  recipient_id uuid REFERENCES public.profiles(id),
  title text NOT NULL,
  message text NOT NULL,
  image_url text,
  link text,
  read_count integer DEFAULT 0,
  sent_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para order_notifications
ALTER TABLE public.order_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus notificaciones" ON public.order_notifications
  FOR SELECT USING (
    auth.uid() = recipient_id
    OR recipient_role = 'all_drivers'
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Sistema puede insertar notificaciones" ON public.order_notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'comercio', 'repartidor')
    )
  );

CREATE POLICY "Usuarios pueden marcar sus notificaciones como leidas" ON public.order_notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- RLS para push_notifications
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins pueden enviar push" ON public.push_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Usuarios ven push dirigidas a ellos" ON public.push_notifications
  FOR SELECT USING (
    auth.uid() = recipient_id
    OR target = 'all'
    OR (
      target = 'drivers' AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'repartidor'
      )
    )
  );

-- Políticas ampliadas para orders (conductores pueden leer y actualizar)
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios pedidos" ON public.orders;
CREATE POLICY "Lectura de pedidos" ON public.orders 
  FOR SELECT USING (
    auth.uid() = user_id 
    OR auth.uid() = driver_id
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'repartidor', 'comercio')
    )
  );

-- Conductores pueden actualizarse a sí mismos en pedidos listos
DROP POLICY IF EXISTS "Admins pueden actualizar pedidos" ON public.orders;
CREATE POLICY "Actualizacion de pedidos" ON public.orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'comercio', 'repartidor')
    )
    OR auth.uid() = driver_id
  );

-- Habilitar Realtime para las tablas
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_notifications;

-- Función para crear notificación automática cuando cambia el estado de un pedido
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notificar al cliente cuando el pedido está listo
  IF NEW.status = 'ready' AND OLD.status != 'ready' THEN
    INSERT INTO public.order_notifications (order_id, recipient_id, recipient_role, type, title, message)
    VALUES (NEW.id, NEW.user_id, 'user', 'order_ready', 
      '¡Tu pedido está listo! 🎉', 
      'Tu pedido está siendo asignado a un conductor. ¡Pronto estará en camino!');
  END IF;

  -- Notificar cuando se asigna conductor
  IF NEW.status = 'assigned' AND OLD.status != 'assigned' THEN
    INSERT INTO public.order_notifications (order_id, recipient_id, recipient_role, type, title, message)
    VALUES (NEW.id, NEW.user_id, 'user', 'driver_assigned',
      '🛵 Conductor asignado',
      'Un conductor tomó tu pedido y se dirige a buscarlo.');
  END IF;

  -- Notificar cuando el conductor retira
  IF NEW.status = 'picked_up' AND OLD.status != 'picked_up' THEN
    INSERT INTO public.order_notifications (order_id, recipient_id, recipient_role, type, title, message)
    VALUES (NEW.id, NEW.user_id, 'user', 'picked_up',
      '🚀 Tu pedido está en camino',
      '¡El conductor ya retiró tu pedido y está en camino hacia ti!');
  END IF;

  -- Notificar entrega
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    INSERT INTO public.order_notifications (order_id, recipient_id, recipient_role, type, title, message)
    VALUES (NEW.id, NEW.user_id, 'user', 'delivered',
      '✅ Pedido entregado',
      '¡Tu pedido fue entregado! Esperamos que disfrutes tu comida. 🍕');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE PROCEDURE public.notify_order_status_change();
