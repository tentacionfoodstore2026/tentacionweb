import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useStore';
import { Package, MapPin, Clock, ChevronRight, Ticket, Settings, User as UserIcon, Tag, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';

export const Profile = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = React.useState('profile');
  const [orders, setOrders] = useState<any[]>([]);
  const [loyaltyCard, setLoyaltyCard] = useState<any>(null);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      
      try {
        // Fetch Orders
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*, order_items(*, products(*)), businesses(name), driver:profiles!orders_driver_id_fkey(name, phone)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (ordersData) setOrders(ordersData);

        // Fetch Loyalty Card
        const { data: loyaltyData } = await supabase
          .from('loyalty_cards')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (loyaltyData) setLoyaltyCard(loyaltyData);

        // Fetch Promotions for claimed ones
        if (user.claimedPromotions && user.claimedPromotions.length > 0) {
          const promoIds = user.claimedPromotions.map(p => p.promoId);
          const { data: promosData } = await supabase
            .from('promotions')
            .select('*')
            .in('id', promoIds);
            
          if (promosData) setPromotions(promosData);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  // Realtime: update active orders automatically
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('profile-orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        () => {
          // Re-fetch everything to ensure joined data is retrieved properly
          supabase
            .from('orders')
            .select('*, order_items(*, products(*)), businesses(name), driver:profiles!orders_driver_id_fkey(name, phone)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .then(({ data }) => { if (data) setOrders(data); });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o));
        }
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user]);

  if (!user) return null;

  const claimedPromotions = promotions.map(promo => {
    const claim = user.claimedPromotions?.find(p => p.promoId === promo.id);
    return claim ? { ...promo, ...claim } : null;
  }).filter(Boolean) as any[];

  const activeOrderForPoint = orders.find(o => !o.point_claimed && (o.status === 'confirmed' || o.status === 'delivered'));

  return (
    <div className="min-h-screen bg-surface/50 pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-surface rounded-2xl shadow-sm border border-surface p-8 mb-8 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-8">
          <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center text-primary text-4xl font-medium">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-3xl font-medium text-dark mb-1">{user.name}</h1>
            <p className="text-muted mb-4">{user.email}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-4">
              <span className="bg-primary/10 text-accent px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider">
                {(user.role === 'super_admin' || user.email.toLowerCase() === 'joseluisquiroga76@gmail.com') ? 'Super Admin' : 
                 user.role === 'user' ? 'Cliente' : 
                 user.role === 'comercio' ? 'Comercio' : 
                 user.role === 'admin' ? 'Admin' : 'Repartidor'}
              </span>
              <span className="text-muted/60 text-xs font-medium uppercase tracking-wider">Miembro desde Mar 2024</span>
              <button 
                onClick={() => window.location.reload()}
                className="text-[10px] text-primary hover:underline font-medium uppercase tracking-widest"
              >
                Actualizar Datos
              </button>
            </div>
          </div>
          <button className="bg-dark/5 p-3 rounded-2xl text-muted hover:bg-dark/10 transition-all">
            <Settings size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-8 overflow-x-auto custom-scrollbar pb-2">
          {[
            { id: 'profile', label: 'Mi Perfil', icon: UserIcon },
            { id: 'orders', label: 'Mis Pedidos', icon: Package },
            { id: 'coupons', label: 'Cupones', icon: Ticket },
            { id: 'loyalty', label: 'Fidelidad', icon: Star },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-primary text-dark shadow-lg shadow-primary/20' 
                  : 'bg-surface text-muted hover:bg-dark/5 border border-surface'
              }`}
            >
              <tab.icon size={20} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'loyalty' && (
            <div className="bg-surface rounded-2xl border border-surface p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-medium text-dark mb-2">Tu Tarjeta de Fidelidad</h2>
                <p className="text-muted">Acumula 6 puntos y obtén una recompensa especial.</p>
                {user.loyaltyCard && (
                  <p className="text-xs text-muted/60 mt-2">
                    Válida hasta: {new Date(user.loyaltyCard.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex justify-center mb-12">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => {
                    const isEarned = user.loyaltyCard && i < user.loyaltyCard.points;
                    return (
                      <motion.div
                        key={i}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className={`w-16 h-16 rounded-full flex items-center justify-center border-4 ${
                          isEarned 
                            ? 'bg-primary border-primary text-dark shadow-lg shadow-primary/20' 
                            : 'bg-surface border-dark/10 text-dark/20'
                        }`}
                      >
                        <Star size={32} fill={isEarned ? 'currentColor' : 'none'} />
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {activeOrderForPoint ? (
                <div className="bg-dark/5 rounded-2xl p-8 text-center max-w-sm mx-auto">
                  <h3 className="font-medium text-dark mb-4">Escanea para sumar un punto</h3>
                  <p className="text-sm text-muted mb-6">
                    Muestra este código al repartidor al recibir tu pedido #{activeOrderForPoint.id}.
                  </p>
                  <div className="bg-white p-4 rounded-2xl font-medium shadow-sm">
                    <QRCodeSVG 
                      value={JSON.stringify({ userId: user.id, orderId: activeOrderForPoint.id })} 
                      size={200}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-primary/10 rounded-2xl p-6 text-center max-w-sm mx-auto">
                  <Package size={32} className="text-primary mx-auto mb-3" />
                  <h3 className="font-medium text-dark mb-2">No hay pedidos pendientes</h3>
                  <p className="text-sm text-muted">
                    Haz un nuevo pedido para generar un código QR y sumar puntos.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6">
              {orders.length === 0 ? (
                <div className="text-center py-12 text-muted">No tienes pedidos aún.</div>
              ) : (
                orders.map((order) => {
                  const steps = [
                    { key: 'pending',   label: 'Recibido',     icon: '📋' },
                    { key: 'confirmed', label: 'En Cocina',    icon: '👨‍🍳' },
                    { key: 'ready',     label: 'Listo',        icon: '✅' },
                    { key: 'assigned',  label: 'Conductor',    icon: '🛵' },
                    { key: 'picked_up', label: 'En Camino',    icon: '🚀' },
                    { key: 'delivered', label: 'Entregado',    icon: '🎉' },
                  ];
                  const statusOrder = ['pending','confirmed','ready','assigned','picked_up','delivered'];
                  const currentIdx = statusOrder.indexOf(order.status);
                  const isCancelled = order.status === 'cancelled';
                  const isActive = !isCancelled && order.status !== 'delivered';

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={order.id}
                      className={`bg-surface rounded-2xl border ${isActive ? 'border-primary/30 ring-2 ring-primary/5' : 'border-surface'} p-6 hover:shadow-md transition-shadow`}
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start mb-5">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${isActive ? 'bg-primary/20' : 'bg-dark/5'}`}>
                            {isCancelled ? '❌' : steps[Math.max(0, currentIdx)]?.icon || '📦'}
                          </div>
                          <div>
                            <p className="font-medium text-dark">Pedido #{order.id.substring(0, 8).toUpperCase()}</p>
                            <p className="text-xs text-muted">{order.businesses?.name} · {new Date(order.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${
                          isCancelled ? 'bg-red-100 text-red-600' :
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          'bg-primary/20 text-accent'
                        }`}>
                          {isCancelled ? 'Cancelado' :
                           order.status === 'delivered' ? 'Entregado' :
                           'En proceso'}
                        </span>
                      </div>

                      {/* Progress Steps */}
                      {!isCancelled && (
                        <div className="flex items-center mb-5 overflow-x-auto pb-1">
                          {steps.map((step, idx) => {
                            const done = idx <= currentIdx;
                            const active = idx === currentIdx;
                            return (
                              <React.Fragment key={step.key}>
                                <div className="flex flex-col items-center flex-shrink-0">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                                    done ? 'bg-primary text-dark shadow-sm shadow-primary/30' : 'bg-dark/10 text-muted'
                                  } ${active ? 'ring-4 ring-primary/20 scale-110' : ''}`}>
                                    {done ? '✓' : idx + 1}
                                  </div>
                                  <span className={`text-[9px] mt-1 font-medium whitespace-nowrap ${done ? 'text-accent' : 'text-muted'}`}>
                                    {step.label}
                                  </span>
                                </div>
                                {idx < steps.length - 1 && (
                                  <div className={`flex-1 h-0.5 mx-1 min-w-[12px] transition-all ${idx < currentIdx ? 'bg-primary' : 'bg-dark/10'}`} />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      )}

                      {/* Driver Info (when assigned) */}
                      {order.driver && ['assigned','picked_up','delivering'].includes(order.status) && (
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 mb-4 flex items-center space-x-3">
                          <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center text-lg">🛵</div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-amber-800">Tu conductor</p>
                            <p className="font-medium text-sm text-dark">{order.driver.name}</p>
                          </div>
                          {order.driver.phone && (
                            <a
                              href={`tel:${order.driver.phone}`}
                              className="bg-amber-500 text-white px-3 py-2 rounded-2xl text-xs font-medium"
                            >
                              Llamar
                            </a>
                          )}
                        </div>
                      )}

                      {/* Items */}
                      <div className="space-y-2 mb-4">
                        {order.order_items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm text-muted">
                            <span>{item.products?.name || 'Producto'} x {item.quantity}</span>
                            <span className="font-medium text-dark">${item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-dark/5 flex justify-between items-center">
                        <div>
                          <p className="text-xs text-muted/60 font-medium uppercase">Total Pagado</p>
                          <p className="text-xl font-medium text-primary">${order.total}</p>
                        </div>
                        {isActive && (
                          <div className="flex items-center space-x-1 text-xs text-primary animate-pulse font-medium">
                            <span className="w-2 h-2 bg-primary rounded-full"></span>
                            <span>En vivo</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'coupons' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {claimedPromotions.length === 0 ? (
                <div className="col-span-full bg-surface rounded-2xl border border-surface p-12 text-center">
                  <div className="w-16 h-16 bg-dark/5 rounded-full flex items-center justify-center text-muted mx-auto mb-4">
                    <Ticket size={32} />
                  </div>
                  <p className="text-muted font-medium">No tienes cupones canjeados aún.</p>
                </div>
              ) : (
                claimedPromotions.map((promo) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={promo.id} 
                    className={`bg-surface rounded-2xl border-2 border-dashed p-6 relative overflow-hidden group ${
                      promo.used ? 'border-muted/20 grayscale opacity-75' : 'border-primary/30'
                    }`}
                  >
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <span className={`${promo.used ? 'bg-muted/10 text-muted' : 'bg-primary/20 text-accent'} px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider`}>
                          {promo.used ? 'USADO' : promo.discount}
                        </span>
                        <Tag size={20} className={promo.used ? 'text-muted/30' : 'text-primary/30'} />
                      </div>
                      <h3 className="text-xl font-medium text-dark mb-1">{promo.title}</h3>
                      <p className="text-muted text-sm mb-4 line-clamp-2">{promo.description}</p>
                      
                      <div className={`font-mono font-medium text-center py-3 rounded-2xl border tracking-widest transition-all ${
                        promo.used 
                          ? 'bg-muted/5 text-muted/40 border-muted/10' 
                          : 'bg-primary/10 text-accent border-primary/20 hover:bg-primary/20 cursor-pointer'
                      }`}
                      onClick={() => !promo.used && navigator.clipboard.writeText(promo.code)}
                      title={promo.used ? "Cupón ya utilizado" : "Click para copiar código"}
                      >
                        {promo.code}
                      </div>
                      
                      <p className="text-[10px] text-muted/60 mt-4 text-center font-medium uppercase tracking-widest">
                        {promo.used 
                          ? `Utilizado el ${new Date(promo.usedAt).toLocaleDateString()}` 
                          : 'Presenta este código al pagar'}
                      </p>
                    </div>
                    {!promo.used && (
                      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-110 transition-transform" />
                    )}
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
