-- ============================================================================
-- FIX: Sistema de Puntos de Fidelidad y Validación de QR
-- Ejecuta este script en el SQL Editor de Supabase para cerrar el ciclo.
-- ============================================================================

-- 1. Crear función para incrementar puntos de fidelidad (RPC)
CREATE OR REPLACE FUNCTION public.increment_loyalty_points(user_uuid UUID, points_to_add INTEGER)
RETURNS void AS $$
BEGIN
  -- Insertar o actualizar la tarjeta de fidelidad del usuario
  INSERT INTO public.loyalty_cards (user_id, points, expires_at)
  VALUES (user_uuid, points_to_add, (now() + interval '1 year'))
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    points = public.loyalty_cards.points + points_to_add,
    expires_at = EXCLUDED.expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asegurar que los conductores puedan actualizar la columna point_claimed
-- (Esto ya debería estar por las políticas de update de orders, pero lo reforzamos)
DROP POLICY IF EXISTS "Actualizacion de pedidos para repartidores" ON public.orders;
CREATE POLICY "Actualizacion de pedidos para repartidores" ON public.orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('repartidor', 'admin', 'super_admin')
    )
  );

-- 3. Trigger automático: Cuando point_claimed pasa a TRUE, sumar el punto
-- Esto hace que el sistema sea infalible aunque falle la llamada RPC desde la App.
CREATE OR REPLACE FUNCTION public.handle_point_claimed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.point_claimed = true AND (OLD.point_claimed = false OR OLD.point_claimed IS NULL) THEN
    PERFORM public.increment_loyalty_points(NEW.user_id, 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_point_claimed ON public.orders;
CREATE TRIGGER on_point_claimed
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_point_claimed();

-- 4. Corregir política de fidelidad para que sea visible (Select)
DROP POLICY IF EXISTS "Usuarios pueden ver su tarjeta de fidelidad" ON public.loyalty_cards;
DROP POLICY IF EXISTS "loyalty_select_policy" ON public.loyalty_cards;
CREATE POLICY "loyalty_select_policy" ON public.loyalty_cards
  FOR SELECT USING (auth.uid() = user_id);

-- 5. Habilitar Realtime para loyalty_cards (CRÍTICO para que la estrella se prenda sola)
ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_cards;

-- ============================================================================
-- LIMPIEZA TOTAL (Opcional: Descomenta si quieres borrar todo para empezar limpio)
-- ============================================================================
-- DELETE FROM public.order_notifications;
-- DELETE FROM public.order_items;
-- DELETE FROM public.orders;
-- UPDATE public.loyalty_cards SET points = 0;
