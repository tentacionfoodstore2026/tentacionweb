-- ============================================================================
-- SUPABASE RLS FIXES - TENTACION FOOD STORE
-- Versión 2: elimina TODOS los posibles nombres anteriores antes de recrear
-- ============================================================================

-- ============================================================================
-- 1. PERFILES (profiles)
-- ============================================================================

-- Eliminar TODAS las políticas posibles (nombres viejos y nuevos)
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios pueden crear su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- SELECT: cada usuario ve su propio perfil + admins ven todos
CREATE POLICY "profiles_select_policy"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

-- INSERT: cada usuario puede crear su propio perfil
CREATE POLICY "profiles_insert_policy"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- UPDATE: cada usuario actualiza su perfil + admins actualizan todos
CREATE POLICY "profiles_update_policy"
ON public.profiles FOR UPDATE
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

-- ============================================================================
-- 2. COMERCIOS (businesses)
-- ============================================================================

DROP POLICY IF EXISTS "Lectura pública de comercios" ON public.businesses;
DROP POLICY IF EXISTS "Admins pueden gestionar comercios" ON public.businesses;
DROP POLICY IF EXISTS "businesses_select_public" ON public.businesses;
DROP POLICY IF EXISTS "businesses_insert_admin" ON public.businesses;
DROP POLICY IF EXISTS "businesses_update_admin" ON public.businesses;
DROP POLICY IF EXISTS "businesses_delete_admin" ON public.businesses;

CREATE POLICY "businesses_select_public"
ON public.businesses FOR SELECT
USING (true);

CREATE POLICY "businesses_insert_admin"
ON public.businesses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "businesses_update_admin"
ON public.businesses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "businesses_delete_admin"
ON public.businesses FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin')
  )
);

-- ============================================================================
-- 3. PRODUCTOS (products)
-- ============================================================================

DROP POLICY IF EXISTS "Lectura pública de productos" ON public.products;
DROP POLICY IF EXISTS "Admins pueden gestionar productos" ON public.products;
DROP POLICY IF EXISTS "products_select_public" ON public.products;
DROP POLICY IF EXISTS "products_insert_admin" ON public.products;
DROP POLICY IF EXISTS "products_update_admin" ON public.products;
DROP POLICY IF EXISTS "products_delete_admin" ON public.products;

CREATE POLICY "products_select_public"
ON public.products FOR SELECT
USING (true);

CREATE POLICY "products_insert_admin"
ON public.products FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin', 'comercio')
  )
);

CREATE POLICY "products_update_admin"
ON public.products FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin', 'comercio')
  )
);

CREATE POLICY "products_delete_admin"
ON public.products FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin', 'comercio')
  )
);

-- ============================================================================
-- 4. PROMOCIONES (promotions)
-- ============================================================================

DROP POLICY IF EXISTS "Lectura pública de promociones" ON public.promotions;
DROP POLICY IF EXISTS "Admins pueden gestionar promociones" ON public.promotions;
DROP POLICY IF EXISTS "promotions_select_public" ON public.promotions;
DROP POLICY IF EXISTS "promotions_insert_admin" ON public.promotions;
DROP POLICY IF EXISTS "promotions_update_admin" ON public.promotions;
DROP POLICY IF EXISTS "promotions_delete_admin" ON public.promotions;

CREATE POLICY "promotions_select_public"
ON public.promotions FOR SELECT
USING (true);

CREATE POLICY "promotions_insert_admin"
ON public.promotions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin', 'comercio')
  )
);

CREATE POLICY "promotions_update_admin"
ON public.promotions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin', 'comercio')
  )
);

CREATE POLICY "promotions_delete_admin"
ON public.promotions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin', 'comercio')
  )
);

-- ============================================================================
-- 5. PEDIDOS (orders)
-- ============================================================================

DROP POLICY IF EXISTS "Usuarios pueden ver sus propios pedidos" ON public.orders;
DROP POLICY IF EXISTS "Usuarios pueden crear sus propios pedidos" ON public.orders;
DROP POLICY IF EXISTS "Admins pueden actualizar pedidos" ON public.orders;
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;

CREATE POLICY "orders_select_policy"
ON public.orders FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin', 'comercio', 'repartidor')
  )
);

CREATE POLICY "orders_insert_policy"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "orders_update_policy"
ON public.orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'super_admin', 'comercio', 'repartidor')
  )
);

-- ============================================================================
-- 6. ITEMS DE PEDIDOS (order_items)
-- ============================================================================

DROP POLICY IF EXISTS "Usuarios pueden ver items de sus pedidos" ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_policy" ON public.order_items;

CREATE POLICY "order_items_select_policy"
ON public.order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
    AND (
      o.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'super_admin')
      )
    )
  )
);

-- ============================================================================
-- 7. DATOS DE PRUEBA (se insertan solo si no existen)
-- ============================================================================

INSERT INTO public.businesses (id, name, description, category, image, banner, whatsapp, address, rating, is_open, delivery_fee, delivery_time, status)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Pizzería La Toscana', 'Las mejores pizzas artesanales a la leña con ingredientes importados.', 'Pizza',
   'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=1200&q=80',
   '5491122334455', 'Av. Principal 123', 4.8, true, 150, '30-45 min', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'Burger Master', 'Hamburguesas gourmet con carne 100% angus y pan brioche artesanal.', 'Hamburguesas',
   'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
   '5491122334456', 'Calle Falsa 456', 4.5, true, 100, '20-35 min', 'active'),
  ('33333333-3333-3333-3333-333333333333', 'Sushi Zen', 'Experiencia premium de sushi y comida japonesa tradicional.', 'Sushi',
   'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
   'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1200&q=80',
   '5491122334457', 'Boulevard de las Artes 789', 4.9, true, 200, '45-60 min', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, business_id, name, description, price, image, category, available)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Pizza Margherita',
   'Salsa de tomate, mozzarella fresca, albahaca y aceite de oliva.', 1200,
   'https://images.unsplash.com/photo-1574071318508-1cdbad80ad38?auto=format&fit=crop&w=800&q=80', 'Clásicas', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Pizza Pepperoni',
   'Doble pepperoni, mozzarella y salsa de la casa.', 1400,
   'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80', 'Clásicas', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Classic Burger',
   'Carne 150g, queso cheddar, lechuga, tomate y salsa secreta.', 950,
   'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', 'Hamburguesas', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Bacon BBQ Burger',
   'Carne 150g, doble bacon, aros de cebolla y salsa BBQ.', 1100,
   'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80', 'Hamburguesas', true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '33333333-3333-3333-3333-333333333333', 'Sashimi Premium',
   'Selección de salmón, atún y pez mantequilla frescos.', 2200,
   'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=800&q=80', 'Sashimi', true),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '33333333-3333-3333-3333-333333333333', 'Combo Sushi 16 piezas',
   'Rolls variados con salmón, palta y pepino.', 1800,
   'https://images.unsplash.com/photo-1617196034183-421b4040ed20?auto=format&fit=crop&w=800&q=80', 'Rolls', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.promotions (id, business_id, title, description, discount_percentage, code, valid_until)
VALUES
  ('11111111-2222-3333-4444-555555555555', '11111111-1111-1111-1111-111111111111',
   '2x1 en Pizzas', 'Todos los martes y jueves en locales seleccionados.', 50, 'PIZZA50',
   timezone('utc'::text, now() + interval '60 days')),
  ('22222222-3333-4444-5555-666666666666', '22222222-2222-2222-2222-222222222222',
   'Combo Familiar', '4 Hamburguesas + Papas + Bebida Grande.', 20, 'BURGER20',
   timezone('utc'::text, now() + interval '60 days')),
  ('33333333-4444-5555-6666-777777777777', '33333333-3333-3333-3333-333333333333',
   'Happy Hour Sushi', '30% OFF en todos los combos de lunes a miércoles.', 30, 'SUSHI30',
   timezone('utc'::text, now() + interval '60 days'))
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
SELECT 'businesses' as tabla, count(*) as total FROM public.businesses
UNION ALL
SELECT 'products', count(*) FROM public.products
UNION ALL
SELECT 'promotions', count(*) FROM public.promotions;
