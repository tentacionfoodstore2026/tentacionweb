-- Adds advanced restrictions and fields to promotions (coupons) table
ALTER TABLE public.promotions 
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS value NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT 'all',
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS min_purchase NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT '00:00:00',
ADD COLUMN IF NOT EXISTS end_time TIME DEFAULT '23:59:59',
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Indexing for better performance
CREATE INDEX IF NOT EXISTS idx_promotions_category ON public.promotions(category);
CREATE INDEX IF NOT EXISTS idx_promotions_product_id ON public.promotions(product_id);

-- Add coupon columns to orders table for audit tracking
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_total NUMERIC(10, 2);

-- CREATE TABLE FOR COUPON AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  coupon_id UUID REFERENCES public.promotions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  discount_amount NUMERIC(10, 2) NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  cashier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Enable RLS on audit table
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Select policies
DROP POLICY IF EXISTS "Admins y cajeros ven canjes de cupones" ON public.coupon_redemptions;
CREATE POLICY "Admins y cajeros ven canjes de cupones" ON public.coupon_redemptions 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'cajero', 'comercio'))
  );

-- Insert policy
DROP POLICY IF EXISTS "Insercion automatica o por cajeros" ON public.coupon_redemptions;
CREATE POLICY "Insercion automatica o por cajeros" ON public.coupon_redemptions 
  FOR INSERT WITH CHECK (true);
