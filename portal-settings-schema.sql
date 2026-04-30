-- ============================================================================
-- PORTAL SETTINGS TABLE
-- Ejecuta este SQL en el Editor SQL de Supabase para habilitar la persistencia
-- de la configuración del portal.
-- ============================================================================

-- 1. Crear tabla de configuración
CREATE TABLE IF NOT EXISTS public.portal_settings (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  name text DEFAULT 'Tentacion Food Store',
  support_email text DEFAULT 'soporte@tentacion.com',
  support_phone text DEFAULT '+58 412 000 0000',
  address text DEFAULT 'Arica, Chile',
  maintenance_mode boolean DEFAULT false,
  primary_color text DEFAULT '#fbbf24',
  logo_url text,
  favicon_url text,
  google_maps_key text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS
ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso
-- Lectura pública para que el frontend pueda mostrar el nombre/logo
DROP POLICY IF EXISTS "Public Read Settings" ON public.portal_settings;
CREATE POLICY "Public Read Settings" ON public.portal_settings FOR SELECT USING (true);

-- Solo Super Admins pueden modificar la configuración
DROP POLICY IF EXISTS "SuperAdmin Manage Settings" ON public.portal_settings;
CREATE POLICY "SuperAdmin Manage Settings" ON public.portal_settings FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'super_admin'
  )
);

-- 4. Insertar fila inicial por defecto (si no existe)
-- Usamos un UUID estático de ceros para que siempre sea la misma fila
INSERT INTO public.portal_settings (id, name, address) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Tentacion Food Store', 'Arica, Chile')
ON CONFLICT (id) DO NOTHING;
