-- Insertar Comercios (Businesses)
INSERT INTO public.businesses (id, name, description, category, image, banner, whatsapp, address, rating, is_open, delivery_fee, delivery_time, status)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Pizzería La Toscana', 'Las mejores pizzas artesanales a la leña con ingredientes importados.', 'Pizza', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=1200&q=80', '5491122334455', 'Av. Principal 123', 4.8, true, 150, '30-45 min', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'Burger Master', 'Hamburguesas gourmet con carne 100% angus y pan brioche artesanal.', 'Hamburguesas', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80', '5491122334456', 'Calle Falsa 456', 4.5, true, 100, '20-35 min', 'active'),
  ('33333333-3333-3333-3333-333333333333', 'Sushi Zen', 'Experiencia premium de sushi y comida japonesa tradicional.', 'Sushi', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1200&q=80', '5491122334457', 'Boulevard de las Artes 789', 4.9, true, 200, '45-60 min', 'active')
ON CONFLICT (id) DO NOTHING;

-- Insertar Productos (Products)
INSERT INTO public.products (id, business_id, name, description, price, image, category, available)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Pizza Margherita', 'Salsa de tomate, mozzarella fresca, albahaca y aceite de oliva.', 1200, 'https://images.unsplash.com/photo-1574071318508-1cdbad80ad38?auto=format&fit=crop&w=800&q=80', 'Clásicas', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Pizza Pepperoni', 'Doble pepperoni, mozzarella y salsa de la casa.', 1400, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80', 'Clásicas', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Classic Burger', 'Carne 150g, queso cheddar, lechuga, tomate y salsa secreta.', 950, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', 'Hamburguesas', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Bacon BBQ Burger', 'Carne 150g, doble bacon, aros de cebolla y salsa BBQ.', 1100, 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80', 'Hamburguesas', true)
ON CONFLICT (id) DO NOTHING;

-- Insertar Promociones (Promotions)
INSERT INTO public.promotions (id, business_id, title, description, discount_percentage, code, valid_until)
VALUES
  ('11111111-2222-3333-4444-555555555555', '11111111-1111-1111-1111-111111111111', '2x1 en Pizzas', 'Todos los martes y jueves en locales seleccionados.', 50, 'PIZZA50', timezone('utc'::text, now() + interval '30 days')),
  ('22222222-3333-4444-5555-666666666666', '22222222-2222-2222-2222-222222222222', 'Combo Familiar', '4 Hamburguesas + Papas + Bebida Grande.', 20, 'BURGER20', timezone('utc'::text, now() + interval '30 days'))
ON CONFLICT (id) DO NOTHING;
