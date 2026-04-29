import { supabase } from './supabase';

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'ready'
  | 'assigned'
  | 'picked_up'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

export interface OrderNotification {
  id: string;
  order_id: string;
  recipient_id: string;
  recipient_role: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface FullOrder {
  id: string;
  user_id: string;
  business_id: string;
  driver_id?: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_reference?: string;
  notes?: string;
  payment_method: string;
  total: number;
  status: OrderStatus;
  created_at: string;
  assigned_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  profiles?: { name: string; email: string };
  businesses?: { name: string; whatsapp: string; address: string };
  order_items?: Array<{
    id: string;
    quantity: number;
    price: number;
    products?: { name: string; image?: string };
  }>;
  driver?: { name: string; phone: string; avatar?: string };
}

/**
 * Fetch all orders with full relational data.
 * For admins/kitchen.
 */
export async function fetchAllOrders(): Promise<FullOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      profiles(name, email),
      businesses(name, whatsapp, address),
      order_items(*, products(name, image)),
      driver:driver_id(name, phone, avatar)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as FullOrder[];
}

/**
 * Fetch orders for a specific driver.
 */
export async function fetchDriverOrders(driverId: string): Promise<FullOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      profiles(name, email),
      businesses(name, whatsapp, address),
      order_items(*, products(name, image))
    `)
    .eq('driver_id', driverId)
    .in('status', ['assigned', 'picked_up', 'delivering', 'delivered'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as FullOrder[];
}

/**
 * Fetch orders available for drivers to pick up (status = ready).
 */
export async function fetchAvailableOrders(): Promise<FullOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      profiles(name, email),
      businesses(name, whatsapp, address),
      order_items(*, products(name, image))
    `)
    .eq('status', 'ready')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as FullOrder[];
}

/**
 * Fetch orders for a specific user (client).
 */
export async function fetchUserOrders(userId: string): Promise<FullOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      businesses(name, whatsapp, address),
      order_items(*, products(name, image)),
      driver:driver_id(name, phone)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as FullOrder[];
}

/**
 * Update order status. Generic function.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  extra?: Partial<FullOrder>
): Promise<void> {
  const updateData: any = { status, ...extra };

  if (status === 'picked_up') updateData.picked_up_at = new Date().toISOString();
  if (status === 'delivered') updateData.delivered_at = new Date().toISOString();

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId);

  if (error) throw error;
}

/**
 * Driver claims an available order (atomic operation with conflict check).
 */
export async function claimOrder(orderId: string, driverId: string): Promise<boolean> {
  // Only claim if it's still 'ready' (prevent double-claim)
  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'assigned',
      driver_id: driverId,
      assigned_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('status', 'ready') // atomic guard
    .select()
    .single();

  if (error || !data) return false; // Someone else already claimed it
  return true;
}

/**
 * Fetch unread notifications for a user.
 */
export async function fetchNotifications(userId: string, role: string): Promise<OrderNotification[]> {
  let query = supabase
    .from('order_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (role === 'repartidor') {
    // Drivers see their personal notifications AND broadcast to all drivers
    query = query.or(`recipient_id.eq.${userId},recipient_role.eq.all_drivers`);
  } else {
    query = query.eq('recipient_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as OrderNotification[];
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase
    .from('order_notifications')
    .update({ read: true })
    .eq('id', notificationId);
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase
    .from('order_notifications')
    .update({ read: true })
    .eq('recipient_id', userId)
    .eq('read', false);
}

/**
 * When kitchen marks order as 'ready', send broadcast notification to all drivers.
 */
export async function notifyDriversOrderReady(orderId: string, businessName: string, address: string): Promise<void> {
  await supabase.from('order_notifications').insert({
    order_id: orderId,
    recipient_id: null,
    recipient_role: 'all_drivers',
    type: 'order_ready_for_pickup',
    title: `📦 Pedido listo en ${businessName}`,
    message: `Un pedido está listo para ser retirado en ${address}. ¡Sé el primero en tomarlo!`
  });
}

/**
 * Subscribe to realtime order changes.
 */
export function subscribeToOrders(
  onUpdate: (order: any) => void,
  filter?: { column: string; value: string }
) {
  let channel = supabase.channel('orders-realtime');

  const config: any = {
    event: '*',
    schema: 'public',
    table: 'orders',
  };

  if (filter) {
    config.filter = `${filter.column}=eq.${filter.value}`;
  }

  channel = channel.on('postgres_changes', config, (payload) => {
    onUpdate(payload.new);
  });

  channel.subscribe();
  return channel;
}

/**
 * Subscribe to realtime notifications for a user.
 */
export function subscribeToNotifications(
  userId: string,
  onNew: (notification: OrderNotification) => void
) {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'order_notifications',
        filter: `recipient_id=eq.${userId}`
      },
      (payload) => {
        onNew(payload.new as OrderNotification);
      }
    )
    .subscribe();

  return channel;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'En Cocina',
  ready: 'Listo para Envío',
  assigned: 'Conductor Asignado',
  picked_up: 'Retirado por Conductor',
  delivering: 'En Camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  ready: 'bg-purple-100 text-purple-700',
  assigned: 'bg-indigo-100 text-indigo-700',
  picked_up: 'bg-orange-100 text-orange-700',
  delivering: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};
