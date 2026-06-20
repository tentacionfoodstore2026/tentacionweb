-- =============================================================================
-- TENTACION FOOD STORE - Sistema de Canje de Tarjeta de Fidelización
-- Ejecutar en: Supabase SQL Editor
-- =============================================================================

-- 1. ACTUALIZAR COLUMNAS EN loyalty_cards
ALTER TABLE public.loyalty_cards ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE public.loyalty_cards ADD COLUMN IF NOT EXISTS reward_token TEXT;
ALTER TABLE public.loyalty_cards ADD COLUMN IF NOT EXISTS reward_status TEXT DEFAULT NULL 
  CHECK (reward_status IS NULL OR reward_status IN ('pending', 'redeemed'));

-- 2. AGREGAR ROL "cajero" A PROFILES (si el CHECK CONSTRAINT existe)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('user', 'admin', 'super_admin', 'comercio', 'repartidor', 'cocina', 'cajero'));

-- 3. TABLA DE HISTORIAL DE CANJES
CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  cashier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  reward_token TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  points_at_redemption INTEGER DEFAULT 6,
  notes TEXT
);

ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins pueden ver canjes" ON public.loyalty_redemptions;
CREATE POLICY "Admins pueden ver canjes" ON public.loyalty_redemptions 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'cajero'))
  );

DROP POLICY IF EXISTS "Cajeros pueden insertar canjes" ON public.loyalty_redemptions;
CREATE POLICY "Cajeros pueden insertar canjes" ON public.loyalty_redemptions 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'cajero'))
  );

DROP POLICY IF EXISTS "Usuarios pueden ver su historial" ON public.loyalty_redemptions;
CREATE POLICY "Usuarios pueden ver su historial" ON public.loyalty_redemptions
  FOR SELECT USING (auth.uid() = user_id);

-- 4. FUNCIÓN PRINCIPAL: Incrementar puntos con lógica de ciclo completo
CREATE OR REPLACE FUNCTION public.increment_loyalty_points(user_uuid UUID, points_to_add INTEGER)
RETURNS void AS $$
DECLARE
  current_pts INTEGER;
  vencido BOOLEAN;
  new_token TEXT;
BEGIN
  -- Obtener datos actuales
  SELECT points, (expires_at < now()) INTO current_pts, vencido
  FROM public.loyalty_cards
  WHERE user_id = user_uuid;

  -- Si no existe la tarjeta, crearla con el primer punto
  IF NOT FOUND THEN
    INSERT INTO public.loyalty_cards (user_id, points, activated_at, expires_at, reward_token, reward_status)
    VALUES (user_uuid, 1, now(), now() + interval '6 months', NULL, NULL);
    RETURN;
  END IF;

  -- Reset por expiración: si venció, empezar de cero
  IF vencido THEN
    current_pts := 0;
  END IF;

  -- Sumar el nuevo punto
  current_pts := current_pts + points_to_add;

  -- COMPLETADO (6 estrellas): Generar token de canje único
  IF current_pts >= 6 THEN
    new_token := encode(gen_random_bytes(32), 'hex');
    UPDATE public.loyalty_cards SET
      points = 6,
      reward_token = new_token,
      reward_status = 'pending'
    WHERE user_id = user_uuid;

  -- PRIMER PUNTO (nuevo ciclo): Activar fechas
  ELSIF current_pts = 1 THEN
    UPDATE public.loyalty_cards SET
      points = 1,
      activated_at = now(),
      expires_at = now() + interval '6 months',
      reward_token = NULL,
      reward_status = NULL
    WHERE user_id = user_uuid;

  -- PROGRESIÓN NORMAL (2 a 5 estrellas)
  ELSE
    UPDATE public.loyalty_cards SET
      points = current_pts
    WHERE user_id = user_uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCIÓN: Validar y canjear el token (para la cajera)
CREATE OR REPLACE FUNCTION public.redeem_loyalty_reward(
  p_reward_token TEXT,
  p_cashier_id UUID,
  p_business_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  card_row public.loyalty_cards%ROWTYPE;
  result JSONB;
BEGIN
  -- Buscar la tarjeta con ese token
  SELECT * INTO card_row FROM public.loyalty_cards WHERE reward_token = p_reward_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Token de canje inválido o no encontrado.');
  END IF;

  IF card_row.reward_status = 'redeemed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este premio ya fue canjeado anteriormente.');
  END IF;

  IF card_row.reward_status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'La tarjeta no tiene un premio pendiente.');
  END IF;

  -- Registrar en el historial
  INSERT INTO public.loyalty_redemptions (user_id, cashier_id, business_id, reward_token, points_at_redemption)
  VALUES (card_row.user_id, p_cashier_id, p_business_id, p_reward_token, card_row.points);

  -- Resetear la tarjeta para nuevo ciclo
  UPDATE public.loyalty_cards SET
    points = 0,
    activated_at = NULL,
    expires_at = now() + interval '100 years',
    reward_token = NULL,
    reward_status = NULL
  WHERE user_id = card_row.user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Premio canjeado exitosamente. La tarjeta ha sido reiniciada.',
    'user_id', card_row.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. POLÍTICAS RLS PARA loyalty_cards (cajeros pueden actualizar)
DROP POLICY IF EXISTS "loyalty_update_policy" ON public.loyalty_cards;
CREATE POLICY "loyalty_update_policy" ON public.loyalty_cards
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'cajero'))
  );

DROP POLICY IF EXISTS "loyalty_select_policy" ON public.loyalty_cards;
CREATE POLICY "loyalty_select_policy" ON public.loyalty_cards
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'cajero'))
  );

-- 7. REALTIME para loyalty_cards y loyalty_redemptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_redemptions;

-- =============================================================================
-- FIN DEL SCRIPT
-- =============================================================================
