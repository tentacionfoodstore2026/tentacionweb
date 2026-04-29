import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, Truck, CheckCircle2, MapPin, Phone, User, Clock, 
  ChevronRight, AlertCircle, Navigation, Star, RefreshCw,
  Bell, ShoppingBag, MessageSquare, XCircle, ArrowRight
} from 'lucide-react';
import { 
  fetchAvailableOrders, fetchDriverOrders, claimOrder, 
  updateOrderStatus, fetchNotifications, markAllNotificationsRead,
  subscribeToOrders, subscribeToNotifications,
  FullOrder, OrderNotification, STATUS_LABELS, STATUS_COLORS
} from '../lib/orderService';

type Tab = 'available' | 'my_orders' | 'notifications';

export const DeliveryPanel = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('available');
  const [availableOrders, setAvailableOrders] = useState<FullOrder[]>([]);
  const [myOrders, setMyOrders] = useState<FullOrder[]>([]);
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<FullOrder | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const unreadCount = notifications.filter(n => !n.read).length;

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [available, mine, notifs] = await Promise.all([
        fetchAvailableOrders(),
        fetchDriverOrders(user.id),
        fetchNotifications(user.id, 'repartidor')
      ]);
      setAvailableOrders(available);
      setMyOrders(mine);
      setNotifications(notifs);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('Error loading delivery panel:', e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();

    // Realtime subscriptions
    const ordersChannel = subscribeToOrders((updatedOrder) => {
      setAvailableOrders(prev => {
        if (updatedOrder.status === 'ready') {
          const exists = prev.find(o => o.id === updatedOrder.id);
          if (!exists) return [updatedOrder as FullOrder, ...prev];
          return prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o);
        }
        // Remove from available if no longer ready
        return prev.filter(o => o.id !== updatedOrder.id || updatedOrder.status === 'ready');
      });
      setMyOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
    });

    let notifsChannel: any;
    if (user) {
      notifsChannel = subscribeToNotifications(user.id, (notif) => {
        setNotifications(prev => [notif, ...prev]);
      });
    }

    return () => {
      ordersChannel.unsubscribe();
      notifsChannel?.unsubscribe();
    };
  }, [loadData]);

  if (!user || user.role !== 'repartidor') return null;

  const handleClaimOrder = async (orderId: string) => {
    setClaimingId(orderId);
    try {
      const success = await claimOrder(orderId, user.id);
      if (success) {
        await loadData();
        setActiveTab('my_orders');
      } else {
        alert('⚡ Este pedido ya fue tomado por otro conductor. Refresca la lista.');
        await loadData();
      }
    } catch (e) {
      alert('Error al tomar el pedido. Intenta de nuevo.');
    } finally {
      setClaimingId(null);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: any) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, status);
      await loadData();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status } : null);
      }
    } catch (e) {
      alert('Error al actualizar el estado.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const activeOrder = myOrders.find(o => ['assigned', 'picked_up', 'delivering'].includes(o.status));

  return (
    <div className="min-h-screen bg-[#f8f7ff] pt-20 pb-24">
      <div className="max-w-2xl mx-auto px-4">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-medium text-gray-900">Panel del Conductor</h1>
              <p className="text-sm text-gray-500">Hola, {user.name} 👋</p>
            </div>
            <button 
              onClick={loadData}
              className="p-2 bg-white rounded-2xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-all"
            >
              <RefreshCw size={18} className={`text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-gray-400">Actualizado: {lastRefresh.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        {/* Active order banner */}
        {activeOrder && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-4 mb-6 shadow-lg shadow-orange-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Truck size={20} />
                </div>
                <div>
                  <p className="font-medium text-sm">Pedido Activo</p>
                  <p className="text-xs text-orange-100">#{activeOrder.id.slice(0, 8).toUpperCase()} · {STATUS_LABELS[activeOrder.status]}</p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedOrder(activeOrder); setActiveTab('my_orders'); }}
                className="bg-white/20 hover:bg-white/30 transition-all px-3 py-2 rounded-2xl text-xs font-medium flex items-center space-x-1"
              >
                <span>Ver</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex bg-white rounded-2xl border border-gray-100 shadow-sm p-1 mb-6">
          {[
            { id: 'available', label: 'Disponibles', icon: Package, count: availableOrders.length },
            { id: 'my_orders', label: 'Mis Pedidos', icon: Truck, count: myOrders.filter(o => o.status !== 'delivered').length },
            { id: 'notifications', label: 'Alertas', icon: Bell, count: unreadCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── AVAILABLE ORDERS ── */}
        {activeTab === 'available' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCw size={32} className="text-amber-500 animate-spin mx-auto mb-3" />
                <p className="text-gray-500">Cargando pedidos...</p>
              </div>
            ) : availableOrders.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 bg-white rounded-2xl border border-gray-100"
              >
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package size={32} className="text-amber-500" />
                </div>
                <h3 className="font-medium text-gray-800 mb-1">No hay pedidos disponibles</h3>
                <p className="text-sm text-gray-500">Los pedidos listos aparecerán aquí automáticamente.</p>
              </motion.div>
            ) : (
              availableOrders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  {/* Order Header */}
                  <div className="p-4 border-b border-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pedido</span>
                        <h3 className="font-medium text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</h3>
                        <p className="text-xs text-gray-500 flex items-center space-x-1 mt-1">
                          <Clock size={12} />
                          <span>{new Date(order.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-medium text-amber-600">${order.total?.toLocaleString()}</p>
                        <span className="text-xs text-gray-500">{order.payment_method === 'cash' ? '💵 Efectivo' : '💳 Tarjeta'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Business & Pickup */}
                  <div className="p-4 bg-amber-50/50">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <ShoppingBag size={16} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Retirar en</p>
                        <p className="font-medium text-gray-900">{order.businesses?.name}</p>
                        <p className="text-xs text-gray-500">{order.businesses?.address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <MapPin size={16} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Entregar en</p>
                        <p className="font-medium text-gray-900">{order.delivery_address}</p>
                        {order.delivery_reference && (
                          <p className="text-xs text-gray-500">{order.delivery_reference}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Items preview */}
                  <div className="px-4 pb-3">
                    <div className="flex flex-wrap gap-1">
                      {order.order_items?.slice(0, 3).map((item, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-2xl">
                          {item.quantity}x {item.products?.name}
                        </span>
                      ))}
                      {(order.order_items?.length || 0) > 3 && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-2xl">
                          +{(order.order_items?.length || 0) - 3} más
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Claim Button */}
                  <div className="p-4 pt-0">
                    <button
                      onClick={() => handleClaimOrder(order.id)}
                      disabled={claimingId === order.id}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-2xl font-medium text-sm transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-lg shadow-amber-200 active:scale-95"
                    >
                      {claimingId === order.id ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <>
                          <Truck size={18} />
                          <span>¡Tomar este pedido!</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* ── MY ORDERS ── */}
        {activeTab === 'my_orders' && (
          <div className="space-y-4">
            {myOrders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <Truck size={40} className="text-gray-300 mx-auto mb-3" />
                <h3 className="font-medium text-gray-800 mb-1">Sin entregas aún</h3>
                <p className="text-sm text-gray-500">Toma un pedido disponible para empezar.</p>
              </div>
            ) : (
              myOrders.map((order) => (
                <motion.div
                  key={order.id}
                  layout
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                    order.id === selectedOrder?.id ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-100'
                  }`}
                >
                  <button
                    onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-gray-500">{order.businesses?.name}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${STATUS_COLORS[order.status]}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                        <ChevronRight size={16} className={`text-gray-400 transition-transform ${selectedOrder?.id === order.id ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {selectedOrder?.id === order.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-50 overflow-hidden"
                      >
                        {/* Customer info */}
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 rounded-2xl p-3">
                              <p className="text-xs text-gray-400 mb-1">Cliente</p>
                              <p className="font-medium text-sm text-gray-800">{order.customer_name}</p>
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-3">
                              <p className="text-xs text-gray-400 mb-1">Teléfono</p>
                              <a href={`tel:${order.customer_phone}`} className="font-medium text-sm text-amber-600">{order.customer_phone}</a>
                            </div>
                          </div>

                          <div className="bg-green-50 rounded-2xl p-3">
                            <p className="text-xs text-gray-400 mb-1 flex items-center space-x-1"><MapPin size={12}/><span>Dirección</span></p>
                            <p className="font-medium text-sm text-gray-800">{order.delivery_address}</p>
                            {order.delivery_reference && <p className="text-xs text-gray-500 mt-1">{order.delivery_reference}</p>}
                            <a 
                              href={`https://maps.google.com/?q=${encodeURIComponent(order.delivery_address || '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 flex items-center space-x-1 text-xs text-green-600 font-semibold"
                            >
                              <Navigation size={12} />
                              <span>Abrir en Maps</span>
                            </a>
                          </div>

                          {order.notes && (
                            <div className="bg-blue-50 rounded-2xl p-3">
                              <p className="text-xs text-gray-400 mb-1 flex items-center space-x-1"><MessageSquare size={12}/><span>Notas del cliente</span></p>
                              <p className="text-sm text-gray-700">{order.notes}</p>
                            </div>
                          )}

                          {/* Items */}
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Productos</p>
                            <div className="space-y-2">
                              {order.order_items?.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-gray-700">{item.quantity}x {item.products?.name}</span>
                                  <span className="font-semibold text-gray-900">${(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-between text-base font-medium mt-3 pt-3 border-t border-gray-100">
                              <span>Total</span>
                              <span className="text-amber-600">${order.total?.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* WhatsApp Contact */}
                          <a
                            href={`https://wa.me/${order.businesses?.whatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center space-x-2 bg-[#25D366] text-white py-3 rounded-2xl font-medium text-sm"
                          >
                            <MessageSquare size={18} />
                            <span>Contactar al Comercio</span>
                          </a>

                          {/* Status Actions */}
                          {order.status === 'assigned' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'picked_up')}
                              disabled={updatingId === order.id}
                              className="w-full bg-amber-500 text-white py-3.5 rounded-2xl font-medium text-sm flex items-center justify-center space-x-2 shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all disabled:opacity-50"
                            >
                              {updatingId === order.id ? <RefreshCw size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /><span>Confirmé el Retiro</span></>}
                            </button>
                          )}

                          {order.status === 'picked_up' && (
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'delivered')}
                              disabled={updatingId === order.id}
                              className="w-full bg-green-500 text-white py-3.5 rounded-2xl font-medium text-sm flex items-center justify-center space-x-2 shadow-lg shadow-green-200 hover:bg-green-600 transition-all disabled:opacity-50"
                            >
                              {updatingId === order.id ? <RefreshCw size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /><span>Pedido Entregado ✓</span></>}
                            </button>
                          )}

                          {order.status === 'delivered' && (
                            <div className="flex items-center justify-center space-x-2 bg-green-50 text-green-700 py-3 rounded-2xl font-medium text-sm">
                              <CheckCircle2 size={18} />
                              <span>Entrega completada</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            {unreadCount > 0 && (
              <div className="flex justify-end">
                <button onClick={handleMarkAllRead} className="text-xs text-amber-600 font-semibold hover:underline">
                  Marcar todo como leído
                </button>
              </div>
            )}
            {notifications.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <Bell size={40} className="text-gray-300 mx-auto mb-3" />
                <h3 className="font-medium text-gray-800 mb-1">Sin notificaciones</h3>
                <p className="text-sm text-gray-500">Te avisaremos cuando haya pedidos listos.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`bg-white rounded-2xl border p-4 shadow-sm ${notif.read ? 'border-gray-100 opacity-70' : 'border-amber-200 bg-amber-50/30'}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${notif.read ? 'bg-gray-100' : 'bg-amber-100'}`}>
                      <Bell size={18} className={notif.read ? 'text-gray-400' : 'text-amber-600'} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm text-gray-900">{notif.title}</p>
                        {!notif.read && <span className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0 mt-1"></span>}
                      </div>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notif.created_at).toLocaleString('es', { 
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
