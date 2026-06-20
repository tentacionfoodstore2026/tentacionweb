-- ============================================================================
-- SQL DE CONFIGURACIÓN Y INTEGRACIÓN DE CONDUCTORES (SUPABASE)
-- Ejecuta esto en el Editor SQL de tu panel de Supabase para habilitar 
-- la creación, sincronización y login de conductores.
-- ============================================================================

-- 1. Asegurar que la tabla driver_profiles tenga todas las columnas requeridas
ALTER TABLE public.driver_profiles
ADD COLUMN IF NOT EXISTS license_number TEXT,
ADD COLUMN IF NOT EXISTS license_type TEXT,
ADD COLUMN IF NOT EXISTS license_expiry TEXT,
ADD COLUMN IF NOT EXISTS dni TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS balance NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS vehicle_color TEXT,
ADD COLUMN IF NOT EXISTS vehicle_year TEXT,
ADD COLUMN IF NOT EXISTS vehicle_insurance_policy TEXT,
ADD COLUMN IF NOT EXISTS vehicle_insurance_expiry TEXT;

-- 2. Asegurar que RLS esté configurado correctamente para driver_profiles
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de perfiles de conductor" ON public.driver_profiles;
CREATE POLICY "Lectura pública de perfiles de conductor" ON public.driver_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Gestión total para admins y el propio conductor" ON public.driver_profiles;
CREATE POLICY "Gestión total para admins y el propio conductor" ON public.driver_profiles
  FOR ALL USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- 3. Actualizar la función trigger handle_new_user para mapear 'driver' a 'repartidor'
-- y crear automáticamente su perfil de conductor detallado sin errores de validación.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
BEGIN
  -- Extraer nombre del usuario (soporta name o full_name)
  v_name := coalesce(
    new.raw_user_meta_data->>'name', 
    new.raw_user_meta_data->>'full_name', 
    'Usuario'
  );

  -- Mapear rol 'driver' enviado por la app móvil a 'repartidor'
  v_role := coalesce(new.raw_user_meta_data->>'role', 'user');
  IF v_role = 'driver' THEN
    v_role := 'repartidor';
  END IF;

  -- Validar contra la restricción CHECK de roles
  IF v_role NOT IN ('user', 'comercio', 'repartidor', 'cocina', 'admin', 'super_admin') THEN
    v_role := 'user';
  END IF;

  -- Crear el perfil principal en public.profiles
  INSERT INTO public.profiles (id, email, name, role, phone, status)
  VALUES (
    new.id, 
    new.email, 
    v_name, 
    v_role,
    new.raw_user_meta_data->>'phone',
    'active'
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone;

  -- Si es un repartidor, crear la entrada correspondiente en driver_profiles
  IF v_role = 'repartidor' THEN
    INSERT INTO public.driver_profiles (
      id, 
      phone, 
      vehicle_type, 
      vehicle_model, 
      vehicle_plate, 
      vehicle_verified,
      dni,
      address,
      balance,
      rating,
      trips
    )
    VALUES (
      new.id,
      new.raw_user_meta_data->>'phone',
      coalesce(new.raw_user_meta_data->>'vehicle_type', 'Moto'),
      coalesce(new.raw_user_meta_data->>'vehicle_model', ''),
      coalesce(new.raw_user_meta_data->>'vehicle_plate', ''),
      true,
      coalesce(new.raw_user_meta_data->>'dni', ''),
      coalesce(new.raw_user_meta_data->>'address', ''),
      0,
      5.0,
      0
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
