-- ============================================================================
-- SQL DE ALMACENAMIENTO (IMÁGENES)
-- Ejecuta esto para habilitar la subida de imágenes a Supabase Storage
-- ============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'images' );
CREATE POLICY "Auth Upload Access" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'images' );
CREATE POLICY "Auth Update Access" ON storage.objects FOR UPDATE WITH CHECK ( bucket_id = 'images' );
CREATE POLICY "Auth Delete Access" ON storage.objects FOR DELETE USING ( bucket_id = 'images' );

-- ============================================================================
-- SQL PRINCIPAL
-- ============================================================================

-- Habilitar extensión para generar UUIDs
create extension if not exists "uuid-ossp";

-- 1. Crear tabla de perfiles de usuario (se vincula con auth.users de Supabase)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text,
  email text,
  role text check (role in ('user', 'comercio', 'repartidor', 'cocina', 'admin', 'super_admin')) default 'user',
  business_id uuid, -- Se vinculará a businesses(id) más adelante
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Crear tabla de Comercios (Businesses)
create table public.businesses (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  category text,
  image text,
  banner text,
  whatsapp text,
  address text,
  rating numeric default 5.0,
  is_open boolean default true,
  delivery_fee numeric default 0,
  delivery_time text,
  status text check (status in ('pending', 'active', 'inactive')) default 'active',
  instagram text,
  facebook text,
  website text,
  opening_hours jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Añadir llave foránea a profiles ahora que businesses existe
alter table public.profiles add constraint fk_business foreign key (business_id) references public.businesses(id);

-- 3. Crear tabla de Productos
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  name text not null,
  description text,
  price numeric not null,
  image text,
  category text,
  available boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Crear tabla de Pedidos (Orders)
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  business_id uuid references public.businesses(id) on delete cascade not null,
  total numeric not null,
  status text check (status in ('pending', 'confirmed', 'delivering', 'delivered', 'cancelled')) default 'pending',
  point_claimed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Crear tabla de Items del Pedido (Order Items)
create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  quantity integer not null,
  price numeric not null
);

-- 6. Crear tabla de Tarjetas de Fidelidad (Loyalty Cards)
create table public.loyalty_cards (
  user_id uuid references public.profiles(id) on delete cascade not null primary key,
  points integer default 0,
  expires_at timestamp with time zone not null
);

-- 7. Crear tabla de Promociones (Promotions)
create table public.promotions (
  id uuid default uuid_generate_v4() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  title text not null,
  description text,
  discount_percentage numeric,
  code text unique,
  valid_until timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Configurar Seguridad (Row Level Security - RLS)
-- Para este prototipo, permitiremos lectura pública de comercios y productos,
-- y restringiremos lectura/escritura de pedidos y perfiles a los usuarios autenticados.

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.loyalty_cards enable row level security;
alter table public.promotions enable row level security;

-- Políticas Básicas (Permisivas para facilitar el desarrollo inicial)
create policy "Lectura pública de comercios" on public.businesses for select using (true);
create policy "Lectura pública de productos" on public.products for select using (true);
create policy "Lectura pública de promociones" on public.promotions for select using (true);

-- Políticas de Perfiles
create policy "Usuarios pueden ver su propio perfil" on public.profiles for select using (auth.uid() = id or exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'));
create policy "Usuarios pueden actualizar su propio perfil" on public.profiles for update using (auth.uid() = id or exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'));

-- Políticas de Pedidos
create policy "Usuarios pueden ver sus propios pedidos" on public.orders for select using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')));
create policy "Usuarios pueden crear sus propios pedidos" on public.orders for insert with check (auth.uid() = user_id);
create policy "Admins pueden actualizar pedidos" on public.orders for update using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin', 'comercio', 'repartidor')));

-- Políticas de Items de Pedidos
create policy "Usuarios pueden ver items de sus pedidos" on public.order_items for select using (
  exists (select 1 from public.orders where orders.id = order_items.order_id and (orders.user_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))))
);

-- Políticas de Comercios y Productos (Escritura para admins)
create policy "Admins pueden gestionar comercios" on public.businesses for all using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')));
create policy "Admins pueden gestionar productos" on public.products for all using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin', 'comercio')));
create policy "Admins pueden gestionar promociones" on public.promotions for all using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin', 'comercio')));

-- Políticas de Fidelidad
create policy "Usuarios pueden ver su tarjeta de fidelidad" on public.loyalty_cards for select using (auth.uid() = user_id);

-- Trigger para crear un perfil automáticamente cuando un usuario se registra en Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'name', 
    case 
      when new.email IN ('tentacionfoodstore2026@gmail.com', 'joseluisquiroga76@gmail.com') then 'super_admin'
      else coalesce(new.raw_user_meta_data->>'role', 'user')
    end
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
-- ============================================================================
-- 8. Crear tabla de Configuraci�n del Portal (Portal Settings)
-- ============================================================================
create table if not exists public.portal_settings (
  id uuid default '00000000-0000-0000-0000-000000000000' primary key,
  name text default 'Tentacion Food Store',
  support_email text default 'soporte@tentacion.com',
  support_phone text default '+58 412 000 0000',
  address text default 'Arica, Chile',
  maintenance_mode boolean default false,
  primary_color text default '#fbbf24',
  logo_url text,
  favicon_url text,
  google_maps_key text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insertar valores por defecto si no existen
INSERT INTO public.portal_settings (id) VALUES ('00000000-0000-0000-0000-000000000000') ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS
alter table public.portal_settings enable row level security;

-- Pol�tica de lectura p�blica
create policy "Lectura p�blica de configuracion" on public.portal_settings for select using (true);

-- Pol�tica de actualizaci�n solo para super_admins
create policy "Super Admins pueden actualizar la configuracion" on public.portal_settings for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'));
