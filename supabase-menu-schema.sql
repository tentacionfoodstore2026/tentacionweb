-- ============================================================================
-- MENU MANAGEMENT SCHEMA UPDATES
-- ============================================================================

-- 1. Categorías y Subcategorías
CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES public.product_categories(id) ON DELETE CASCADE,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Asegurar que products tenga las nuevas columnas
-- Nota: Usamos JSONB para extras y tamaños por flexibilidad en este prototipo,
-- permitiendo que cada plato tenga opciones personalizadas sin sobrecargar de tablas.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sizes jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS extras jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory text; -- Opcional si no se usa la relación de parent_id

-- 3. Habilitar RLS en la nueva tabla
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para product_categories
DROP POLICY IF EXISTS "Lectura pública de categorías" ON public.product_categories;
CREATE POLICY "Lectura pública de categorías" ON public.product_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins y comercios gestionan categorías" ON public.product_categories;
CREATE POLICY "Admins y comercios gestionan categorías" ON public.product_categories FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (p.role IN ('admin', 'super_admin') OR (p.role = 'comercio' AND p.business_id = product_categories.business_id))
  )
);

-- 5. Actualizar políticas de productos para permitir a 'comercio' editar SUS productos
DROP POLICY IF EXISTS "Admins pueden gestionar productos" ON public.products;
CREATE POLICY "Gestión de productos" ON public.products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND (
      p.role IN ('admin', 'super_admin') 
      OR (p.role = 'comercio' AND p.business_id = products.business_id)
    )
  )
);
