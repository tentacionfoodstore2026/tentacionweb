-- LIMPIEZA TOTAL PARA EMPEZAR DE CERO
DELETE FROM public.order_notifications;
DELETE FROM public.order_items;
DELETE FROM public.orders;
UPDATE public.loyalty_cards SET points = 0;
