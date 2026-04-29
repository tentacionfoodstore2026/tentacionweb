import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Utensils, Settings, BarChart3, Plus, Edit2, Trash2, Save, X, Image as ImageIcon, Clock, Calendar, Truck, Tag, ShoppingBag, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { Product, OpeningHours, useAuthStore, Coupon, Order } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { ImageUpload } from '../components/ImageUpload';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { supabase } from '../lib/supabase';

const STATS_DATA = [
  { name: 'Lun', ventas: 4000, pedidos: 24 },
  { name: 'Mar', ventas: 3000, pedidos: 18 },
  { name: 'Mie', ventas: 2000, pedidos: 15 },
  { name: 'Jue', ventas: 2780, pedidos: 20 },
  { name: 'Vie', ventas: 1890, pedidos: 12 },
  { name: 'Sab', ventas: 2390, pedidos: 16 },
  { name: 'Dom', ventas: 3490, pedidos: 22 },
];

const HOURLY_STATS_DATA = [
  { time: '08:00', ventas: 120 },
  { time: '10:00', ventas: 450 },
  { time: '12:00', ventas: 1200 },
  { time: '14:00', ventas: 980 },
  { time: '16:00', ventas: 320 },
  { time: '18:00', ventas: 850 },
  { time: '20:00', ventas: 1500 },
  { time: '22:00', ventas: 600 },
];

const TOP_PRODUCTS_DATA = [
  { name: 'Pizza Margherita', sales: 145, revenue: 2900, growth: '+15%' },
  { name: 'Hamburguesa Especial', sales: 120, revenue: 1800, growth: '+8%' },
  { name: 'Papas Fritas XL', sales: 98, revenue: 490, growth: '+22%' },
  { name: 'Coca Cola 500ml', sales: 85, revenue: 255, growth: '+5%' },
  { name: 'Ensalada César', sales: 42, revenue: 420, growth: '-2%' },
];

export const MerchantPanel = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [business, setBusiness] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditingProduct, setIsEditingProduct] = React.useState(false);
  const [isEditingCoupon, setIsEditingCoupon] = React.useState(false);
  const [currentProduct, setCurrentProduct] = React.useState<Partial<Product> | null>(null);
  const [currentCoupon, setCurrentCoupon] = React.useState<Partial<Coupon> | null>(null);

  const [selectedOrder, setSelectedOrder] = React.useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !user.businessId) return;

      try {
        // Fetch Business
        const { data: bizData } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', user.businessId)
          .single();
        if (bizData) setBusiness(bizData);

        // Fetch Products
        const { data: prodData } = await supabase
          .from('products')
          .select('*')
          .eq('business_id', user.businessId);
        if (prodData) setProducts(prodData);

        // Fetch Promotions (Coupons)
        const { data: promoData } = await supabase
          .from('promotions')
          .select('*')
          .eq('business_id', user.businessId);
        if (promoData) setCoupons(promoData);

        // Fetch Orders
        const { data: orderData } = await supabase
          .from('orders')
          .select('*, profiles(name), order_items(*, products(*))')
          .eq('business_id', user.businessId)
          .order('created_at', { ascending: false });
        if (orderData) setOrders(orderData);

      } catch (error) {
        console.error('Error fetching merchant data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    if (currentProduct?.id) {
      const { data, error } = await supabase
        .from('products')
        .update({
          name: currentProduct.name,
          description: currentProduct.description,
          price: currentProduct.price,
          category: currentProduct.category,
          image: currentProduct.image,
          available: currentProduct.available
        })
        .eq('id', currentProduct.id)
        .select()
        .single();
      
      if (data) {
        setProducts(products.map(p => p.id === currentProduct.id ? data : p));
      }
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert({
          business_id: business.id,
          name: currentProduct?.name,
          description: currentProduct?.description,
          price: currentProduct?.price,
          category: currentProduct?.category,
          image: currentProduct?.image,
          available: true
        })
        .select()
        .single();
        
      if (data) {
        setProducts([...products, data]);
      }
    }
    setIsEditingProduct(false);
    setCurrentProduct(null);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    if (currentCoupon?.id) {
      const { data, error } = await supabase
        .from('promotions')
        .update({
          title: currentCoupon.description,
          description: currentCoupon.description,
          discount_percentage: currentCoupon.value,
          code: currentCoupon.code,
          valid_until: currentCoupon.endDate
        })
        .eq('id', currentCoupon.id)
        .select()
        .single();
        
      if (data) {
        setCoupons(coupons.map(c => c.id === currentCoupon.id ? data : c));
      }
    } else {
      const { data, error } = await supabase
        .from('promotions')
        .insert({
          business_id: business.id,
          title: currentCoupon?.description || 'Promoción',
          description: currentCoupon?.description,
          discount_percentage: currentCoupon?.value,
          code: currentCoupon?.code,
          valid_until: currentCoupon?.endDate || new Date().toISOString()
        })
        .select()
        .single();
        
      if (data) {
        setCoupons([...coupons, data]);
      }
    }
    setIsEditingCoupon(false);
    setCurrentCoupon(null);
  };

  const deleteCoupon = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este cupón?')) {
      await supabase.from('promotions').delete().eq('id', id);
      setCoupons(coupons.filter(c => c.id !== id));
    }
  };

  const deleteProduct = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      await supabase.from('products').delete().eq('id', id);
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select('*, profiles(name)')
      .single();
      
    if (data) {
      setOrders(orders.map(o => o.id === id ? data : o));
    }
  };

  const toggleCouponStatus = async (id: string) => {
    // Not implemented in Supabase schema directly, but we can just ignore for now
  };

  if (loading || !business) {
    return <div className="min-h-screen bg-surface pt-24 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="min-h-screen bg-surface pt-16 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-surface hidden md:flex flex-col fixed h-full pt-20">
        <div className="px-6 mb-8">
          <h2 className="text-xs font-medium text-muted uppercase tracking-widest">Panel de Control</h2>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
            { id: 'menu', label: 'Mi Menú', icon: Utensils },
            { id: 'discounts', label: 'Descuentos', icon: Tag },
            { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
            { id: 'settings', label: 'Configuración', icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl font-medium transition-all ${
                activeTab === item.id 
                  ? 'bg-primary/10 text-accent' 
                  : 'text-muted hover:bg-surface'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 sm:p-10">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-medium text-dark">Hola, {business.name} 👋</h1>
                <div className="flex items-center space-x-2 bg-primary/20 text-dark px-4 py-2 rounded-full font-medium text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span>Tienda Abierta</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-surface p-6 rounded-2xl border border-surface shadow-sm">
                  <p className="text-muted text-sm font-medium mb-1">Pedidos Hoy</p>
                  <h3 className="text-3xl font-medium text-dark">24</h3>
                </div>
                <div className="bg-surface p-6 rounded-2xl border border-surface shadow-sm">
                  <p className="text-muted text-sm font-medium mb-1">Ventas Hoy</p>
                  <h3 className="text-3xl font-medium text-accent">$12,450</h3>
                </div>
                <div className="bg-surface p-6 rounded-2xl border border-surface shadow-sm">
                  <p className="text-muted text-sm font-medium mb-1">Rating Promedio</p>
                  <h3 className="text-3xl font-medium text-yellow-500">4.8 ⭐</h3>
                </div>
              </div>

              <div className="bg-surface rounded-2xl border border-surface shadow-sm p-8">
                <h3 className="text-xl font-medium mb-6 text-dark">Últimos Pedidos</h3>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-surface rounded-2xl">
                      <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-surface rounded-md flex items-center justify-center font-medium text-accent shadow-sm">
                          #{100 + i}
                        </div>
                        <div>
                          <p className="font-medium text-dark">Juan Pérez</p>
                          <p className="text-xs text-muted">Hace 15 minutos</p>
                        </div>
                      </div>
                      <span className="bg-primary/20 text-dark px-3 py-1 rounded-full text-xs font-medium">Completado</span>
                      <span className="font-medium text-dark">$2,400</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-medium text-dark">Gestión de Pedidos</h1>
                <div className="flex bg-surface rounded-2xl p-1 border border-surface shadow-sm">
                  <button className="px-4 py-2 text-sm font-medium text-accent bg-primary/10 rounded-2xl">Todos</button>
                  <button className="px-4 py-2 text-sm font-medium text-muted hover:bg-surface rounded-2xl">Pendientes</button>
                  <button className="px-4 py-2 text-sm font-medium text-muted hover:bg-surface rounded-2xl">En Camino</button>
                </div>
              </div>

              <div className="bg-surface rounded-2xl border border-surface shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface border-b border-surface">
                      <tr>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">ID Pedido</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Cliente</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Fecha</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Total</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Estado</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface">
                      {orders.length > 0 ? (
                        orders.map((order) => (
                          <tr key={order.id} className="hover:bg-surface transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                            <td className="px-6 py-4">
                              <span className="font-mono font-medium text-accent">#{order.id}</span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-medium text-dark">{order.profiles?.name || 'Cliente'}</p>
                            </td>
                            <td className="px-6 py-4 text-muted text-sm">
                              {new Date(order.created_at).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 font-medium text-dark">${order.total}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-medium uppercase ${
                                order.status === 'pending' ? 'bg-primary/20 text-dark' :
                                order.status === 'confirmed' ? 'bg-accent/20 text-accent' :
                                order.status === 'delivered' ? 'bg-primary text-dark' :
                                'bg-red-500/10 text-red-600'
                              }`}>
                                {order.status === 'pending' ? 'Pendiente' :
                                 order.status === 'confirmed' ? 'Confirmado' :
                                 order.status === 'delivered' ? 'Entregado' : 'Cancelado'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                                {order.status === 'pending' && (
                                  <button 
                                    onClick={() => updateOrderStatus(order.id, 'confirmed')}
                                    className="p-2 bg-accent/10 text-accent rounded-2xl hover:bg-accent/20 transition-colors"
                                    title="Confirmar Pedido"
                                  >
                                    <CheckCircle2 size={18} />
                                  </button>
                                )}
                                {order.status === 'confirmed' && (
                                  <button 
                                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                                    className="p-2 bg-primary/10 text-accent rounded-2xl hover:bg-primary/20 transition-colors"
                                    title="Marcar como Entregado"
                                  >
                                    <Truck size={18} />
                                  </button>
                                )}
                                {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                  <button 
                                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                    className="p-2 bg-red-500/10 text-red-600 rounded-2xl hover:bg-red-500/20 transition-colors"
                                    title="Cancelar Pedido"
                                  >
                                    <XCircle size={18} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-muted font-medium">
                            No hay pedidos registrados aún.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-medium text-dark">Gestionar Menú</h1>
                <button 
                  onClick={() => {
                    setCurrentProduct({ name: '', price: 0, description: '', category: 'General', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80' });
                    setIsEditingProduct(true);
                  }}
                  className="bg-primary text-dark px-6 py-3 rounded-2xl font-medium flex items-center space-x-2 hover:bg-accent transition-all shadow-lg shadow-primary/20"
                >
                  <Plus size={20} />
                  <span>Nuevo Producto</span>
                </button>
              </div>

              <div className="bg-surface rounded-2xl border border-surface shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-surface border-b border-surface">
                    <tr>
                      <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Producto</th>
                      <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Categoría</th>
                      <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Precio</th>
                      <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Estado</th>
                      <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-surface transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <img 
                              src={p.image} 
                              alt={p.name} 
                              referrerPolicy="no-referrer"
                              onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/fallback/800/600'; }}
                              className="w-10 h-10 rounded-md object-cover" 
                            />
                            <span className="font-medium text-dark">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted">{p.category}</td>
                        <td className="px-6 py-4 font-medium text-accent">${p.price}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-medium uppercase ${p.available ? 'bg-primary/20 text-dark' : 'bg-red-500/10 text-red-600'}`}>
                            {p.available ? 'Disponible' : 'Agotado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button 
                            onClick={() => {
                              setCurrentProduct(p);
                              setIsEditingProduct(true);
                            }}
                            className="p-2 text-muted hover:text-accent transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => deleteProduct(p.id)}
                            className="p-2 text-muted hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'discounts' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-medium text-dark">Gestionar Descuentos</h1>
                <button 
                  onClick={() => {
                    setCurrentCoupon({ code: '', type: 'percentage', value: 0, description: '' });
                    setIsEditingCoupon(true);
                  }}
                  className="bg-primary text-dark px-6 py-3 rounded-2xl font-medium flex items-center space-x-2 hover:bg-accent transition-all shadow-lg shadow-primary/20"
                >
                  <Plus size={20} />
                  <span>Nuevo Cupón</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coupons.map((coupon) => (
                  <div key={coupon.id} className="bg-gradient-to-br from-primary to-accent rounded-2xl p-6 text-dark relative overflow-hidden group cursor-pointer shadow-lg shadow-primary/10">
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <Tag size={24} />
                        <div className="flex space-x-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentCoupon(coupon);
                              setIsEditingCoupon(true);
                            }}
                            className="p-1.5 bg-surface/20 rounded-2xl hover:bg-surface/30 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCoupon(coupon.id);
                            }}
                            className="p-1.5 bg-surface/20 rounded-2xl hover:bg-red-500/30 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-xl font-medium mb-1">{coupon.code}</h3>
                      <p className="text-dark/70 text-xs mb-4 line-clamp-2">{coupon.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="bg-surface/20 backdrop-blur-md px-3 py-1 rounded-2xl font-mono font-medium text-sm">
                          {coupon.discount_percentage}% OFF
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-widest opacity-80">
                          {new Date(coupon.valid_until) > new Date() ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-surface/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                  </div>
                ))}

                <button 
                  onClick={() => {
                    setCurrentCoupon({ code: '', type: 'percentage', value: 0, description: '' });
                    setIsEditingCoupon(true);
                  }}
                  className="bg-surface rounded-2xl border border-surface shadow-sm p-6 flex flex-col items-center justify-center text-center space-y-3 border-dashed border-2 hover:bg-surface transition-colors"
                >
                  <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center text-muted">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium text-dark text-sm">Crear nueva promoción</h3>
                    <p className="text-[10px] text-muted">Atrae a más clientes</p>
                  </div>
                </button>
              </div>

              <div className="bg-surface rounded-2xl border border-surface shadow-sm overflow-hidden">
                <div className="p-6 border-b border-surface">
                  <h3 className="font-medium text-dark">Historial de Cupones</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-surface border-b border-surface">
                      <tr>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Código</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Tipo</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Valor</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Uso</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest">Estado</th>
                        <th className="px-6 py-4 text-xs font-medium text-muted uppercase tracking-widest text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface">
                      {coupons.map((coupon) => (
                        <tr key={coupon.id} className="hover:bg-surface transition-colors">
                          <td className="px-6 py-4 font-mono font-medium text-accent">{coupon.code}</td>
                          <td className="px-6 py-4 text-muted capitalize">Porcentaje</td>
                          <td className="px-6 py-4 font-medium text-dark">
                            {coupon.discount_percentage}%
                          </td>
                          <td className="px-6 py-4 text-muted">-</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-medium uppercase ${
                              new Date(coupon.valid_until) > new Date() ? 'bg-primary/20 text-dark' : 'bg-red-500/10 text-red-600'
                            }`}>
                              {new Date(coupon.valid_until) > new Date() ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => {
                                setCurrentCoupon({
                                  id: coupon.id,
                                  code: coupon.code,
                                  description: coupon.description,
                                  value: coupon.discount_percentage,
                                  endDate: coupon.valid_until
                                } as any);
                                setIsEditingCoupon(true);
                              }}
                              className="p-2 text-muted hover:text-accent transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-medium text-dark">Estadísticas de Ventas</h1>
                <div className="flex bg-surface rounded-2xl p-1 border border-surface shadow-sm">
                  <button className="px-4 py-2 text-sm font-medium text-accent bg-primary/10 rounded-2xl">Semana</button>
                  <button className="px-4 py-2 text-sm font-medium text-muted hover:bg-surface rounded-2xl">Mes</button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-surface p-8 rounded-2xl border border-surface shadow-sm">
                  <h3 className="text-lg font-medium mb-6 text-dark">Ventas Diarias ($)</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={STATS_DATA}>
                        <defs>
                          <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EB8107" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#EB8107" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E1DB" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#4B4847', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#4B4847', fontSize: 12}} />
                        <Tooltip 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        />
                        <Area type="monotone" dataKey="ventas" stroke="#EB8107" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-surface p-8 rounded-2xl border border-surface shadow-sm">
                  <h3 className="text-lg font-medium mb-6 text-dark">Pedidos por Día</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={STATS_DATA}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E1DB" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#4B4847', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#4B4847', fontSize: 12}} />
                        <Tooltip 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                          cursor={{fill: '#E6E1DB'}}
                        />
                        <Bar dataKey="pedidos" fill="#FFC31F" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                {[
                  { label: 'Ticket Promedio', value: '$520', trend: '+12%' },
                  { label: 'Clientes Nuevos', value: '145', trend: '+5%' },
                  { label: 'Tasa de Cancelación', value: '2.4%', trend: '-1%' },
                  { label: 'Tiempo Prep. Prom.', value: '18 min', trend: '-2 min' },
                ].map((stat, i) => (
                  <div key={i} className="bg-surface p-6 rounded-2xl border border-surface shadow-sm">
                    <p className="text-muted text-xs font-medium mb-1 uppercase tracking-wider">{stat.label}</p>
                    <div className="flex items-end justify-between">
                      <h3 className="text-2xl font-medium text-dark">{stat.value}</h3>
                      <span className={`text-xs font-medium ${stat.trend.startsWith('+') ? 'text-accent' : 'text-red-500'}`}>
                        {stat.trend}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-surface p-8 rounded-2xl border border-surface shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium text-dark">Ventas por Hora</h3>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-primary rounded-full" />
                        <span className="text-xs font-medium text-muted">Hora Pico: 20:00</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-surface rounded-full" />
                        <span className="text-xs font-medium text-muted">Hora Valle: 08:00</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={HOURLY_STATS_DATA}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E1DB" />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#4B4847', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#4B4847', fontSize: 12}} />
                        <Tooltip 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        />
                        <Line type="monotone" dataKey="ventas" stroke="#EB8107" strokeWidth={4} dot={{fill: '#EB8107', strokeWidth: 2, r: 4}} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-surface p-8 rounded-2xl border border-surface shadow-sm">
                  <h3 className="text-lg font-medium mb-6 text-dark">Productos más Vendidos</h3>
                  <div className="space-y-6">
                    {TOP_PRODUCTS_DATA.map((product, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-dark">{product.name}</span>
                            <span className="text-xs font-medium text-muted">{product.sales} u.</span>
                          </div>
                          <div className="w-full bg-surface rounded-full h-1.5">
                            <div 
                              className="bg-primary h-1.5 rounded-full" 
                              style={{ width: `${(product.sales / TOP_PRODUCTS_DATA[0].sales) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-sm font-medium text-dark">${product.revenue}</p>
                          <p className={`text-[10px] font-medium ${product.growth.startsWith('+') ? 'text-accent' : 'text-red-500'}`}>
                            {product.growth}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8">
              <h1 className="text-3xl font-medium text-dark">Configuración</h1>
              <div className="bg-surface rounded-2xl border border-surface shadow-sm p-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-dark flex items-center space-x-2">
                      <Settings size={20} className="text-accent" />
                      <span>Información General</span>
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-muted mb-2">Nombre del Negocio</label>
                        <input type="text" defaultValue={business.name} className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted mb-2">WhatsApp de Pedidos</label>
                        <input type="text" defaultValue={business.whatsapp} className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted mb-2">Descripción</label>
                        <textarea defaultValue={business.description} className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 h-24 resize-none" />
                      </div>
                      <div className="pt-4 space-y-4">
                        <h4 className="text-sm font-medium text-muted uppercase tracking-wider">Redes Sociales</h4>
                        <div>
                          <label className="block text-xs font-medium text-muted mb-1">Instagram (Usuario)</label>
                          <input type="text" defaultValue={business.instagram} placeholder="@usuario" className="w-full bg-surface border border-surface rounded-2xl px-4 py-2 focus:outline-none focus:ring-4 focus:ring-primary/10" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted mb-1">Facebook (URL)</label>
                          <input type="text" defaultValue={business.facebook} placeholder="facebook.com/..." className="w-full bg-surface border border-surface rounded-2xl px-4 py-2 focus:outline-none focus:ring-4 focus:ring-primary/10" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted mb-1">Sitio Web</label>
                          <input type="text" defaultValue={business.website} placeholder="www.ejemplo.com" className="w-full bg-surface border border-surface rounded-2xl px-4 py-2 focus:outline-none focus:ring-4 focus:ring-primary/10" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-dark flex items-center space-x-2">
                      <ImageIcon size={20} className="text-accent" />
                      <span>Imágenes del Negocio</span>
                    </h3>
                    <div className="space-y-6">
                      <ImageUpload 
                        label="Logo del Comercio"
                        value={business.image}
                        onChange={(val) => console.log('Logo changed', val)}
                      />
                      <ImageUpload 
                        label="Banner Principal"
                        value={business.banner}
                        onChange={(val) => console.log('Banner changed', val)}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-6 pt-6 border-t border-surface">
                    <h3 className="text-lg font-medium text-dark flex items-center space-x-2">
                      <Clock size={20} className="text-accent" />
                      <span>Horarios de Atención</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(business.openingHours || [
                        { day: 'Lunes', open: '09:00', close: '22:00', closed: false },
                        { day: 'Martes', open: '09:00', close: '22:00', closed: false },
                        { day: 'Miércoles', open: '09:00', close: '22:00', closed: false },
                        { day: 'Jueves', open: '09:00', close: '22:00', closed: false },
                        { day: 'Viernes', open: '09:00', close: '23:00', closed: false },
                        { day: 'Sábado', open: '10:00', close: '23:00', closed: false },
                        { day: 'Domingo', open: '10:00', close: '21:00', closed: true },
                      ]).map((hour, idx) => (
                        <div key={idx} className={`p-4 rounded-2xl border transition-all ${hour.closed ? 'bg-surface border-surface opacity-60' : 'bg-surface border-surface shadow-sm'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium text-dark">{hour.day}</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" defaultChecked={!hour.closed} className="sr-only peer" />
                              <div className="w-9 h-5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input 
                              type="time" 
                              defaultValue={hour.open} 
                              disabled={hour.closed}
                              className="flex-1 bg-surface border border-surface rounded-2xl px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-surface" 
                            />
                            <span className="text-muted text-xs">a</span>
                            <input 
                              type="time" 
                              defaultValue={hour.close} 
                              disabled={hour.closed}
                              className="flex-1 bg-surface border border-surface rounded-2xl px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-surface" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-6 pt-6 border-t border-surface">
                    <h3 className="text-lg font-medium text-dark flex items-center space-x-2">
                      <Truck size={20} className="text-accent" />
                      <span>Logística</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-muted mb-2">Costo de Envío ($)</label>
                        <input type="number" defaultValue={business.deliveryFee} className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted mb-2">Tiempo de Entrega (min)</label>
                        <input type="text" defaultValue={business.deliveryTime} className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="flex items-center space-x-3 cursor-pointer group">
                          <div className="relative">
                            <input type="checkbox" defaultChecked={business.isOpen} className="sr-only peer" />
                            <div className="w-14 h-7 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-surface after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                          </div>
                          <span className="text-sm font-medium text-muted group-hover:text-accent transition-colors">
                            Tienda Abierta para Pedidos (Manual)
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-6 border-t border-surface flex justify-end">
                  <button className="bg-primary text-dark px-8 py-3 rounded-2xl font-medium flex items-center space-x-2 hover:bg-accent transition-all shadow-lg shadow-primary/20">
                    <Save size={20} />
                    <span>Guardar Configuración</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Product Editor Modal */}
      <AnimatePresence>
        {isEditingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingProduct(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md my-8 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-surface flex justify-between items-center bg-surface sticky top-0 z-10">
                <div>
                  <h3 className="text-xl font-medium text-dark">{currentProduct?.id ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                  <p className="text-[10px] font-medium text-muted uppercase tracking-widest">Completa los detalles del producto</p>
                </div>
                <button onClick={() => setIsEditingProduct(false)} className="p-2 hover:bg-surface rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSaveProduct} className="flex flex-col h-full overflow-hidden">
                <div className="p-8 space-y-8 overflow-y-auto flex-1">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-medium text-muted uppercase tracking-[0.2em] mb-2">Nombre del Producto</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ej: Pizza Margherita"
                        value={currentProduct?.name || ''}
                        onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                        className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium transition-all placeholder:text-muted/50" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-medium text-muted uppercase tracking-[0.2em] mb-2">Precio ($)</label>
                        <input 
                          type="number" 
                          required
                          placeholder="0.00"
                          value={currentProduct?.price || ''}
                          onChange={e => setCurrentProduct({ ...currentProduct, price: Number(e.target.value) })}
                          className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium transition-all placeholder:text-muted/50" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-muted uppercase tracking-[0.2em] mb-2">Categoría</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Ej: Pizzas"
                          value={currentProduct?.category || ''}
                          onChange={e => setCurrentProduct({ ...currentProduct, category: e.target.value })}
                          className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium transition-all placeholder:text-muted/50" 
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-medium text-muted uppercase tracking-[0.2em] mb-2">Descripción</label>
                      <textarea 
                        placeholder="Describe los ingredientes o detalles del plato..."
                        value={currentProduct?.description || ''}
                        onChange={e => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                        className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 h-32 resize-none font-medium transition-all placeholder:text-muted/50" 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-medium text-muted uppercase tracking-[0.2em] mb-2">Imagen del Producto</label>
                      <ImageUpload 
                        value={currentProduct?.image || ''}
                        onChange={val => setCurrentProduct({ ...currentProduct, image: val })}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-8 border-t border-surface bg-surface flex space-x-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditingProduct(false)}
                    className="flex-1 px-6 py-4 rounded-2xl font-medium text-muted hover:bg-surface transition-all uppercase tracking-widest text-xs"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] bg-primary text-dark py-4 rounded-2xl font-medium text-sm hover:bg-accent transition-all shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 uppercase tracking-widest"
                  >
                    <Save size={18} />
                    <span>{currentProduct?.id ? 'Guardar' : 'Crear'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Coupon Editor Modal */}
      <AnimatePresence>
        {isEditingCoupon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingCoupon(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-md my-8 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-surface flex justify-between items-center bg-surface sticky top-0 z-10">
                <div>
                  <h3 className="text-xl font-medium text-dark">{currentCoupon?.id ? 'Editar Cupón' : 'Nuevo Cupón'}</h3>
                  <p className="text-[10px] font-medium text-muted uppercase tracking-widest">Configura tu promoción</p>
                </div>
                <button onClick={() => setIsEditingCoupon(false)} className="p-2 hover:bg-surface rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSaveCoupon} className="flex flex-col h-full overflow-hidden">
                <div className="p-8 space-y-8 overflow-y-auto flex-1">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-medium text-muted uppercase tracking-[0.2em] mb-2">Código del Cupón</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ej: VERANO2024"
                        value={currentCoupon?.code || ''}
                        onChange={e => setCurrentCoupon({ ...currentCoupon, code: e.target.value.toUpperCase() })}
                        className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-mono font-medium transition-all placeholder:text-muted/50" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-medium text-muted uppercase tracking-[0.2em] mb-2">Tipo</label>
                        <select 
                          value={currentCoupon?.type || 'percentage'}
                          onChange={e => setCurrentCoupon({ ...currentCoupon, type: e.target.value })}
                          className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium transition-all"
                        >
                          <option value="percentage">Porcentaje (%)</option>
                          <option value="fixed">Monto Fijo ($)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-muted uppercase tracking-[0.2em] mb-2">Valor</label>
                        <input 
                          type="number" 
                          required
                          placeholder="0"
                          value={currentCoupon?.value || ''}
                          onChange={e => setCurrentCoupon({ ...currentCoupon, value: Number(e.target.value) })}
                          className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium transition-all placeholder:text-muted/50" 
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-medium text-muted uppercase tracking-[0.2em] mb-2">Fecha Inicio</label>
                        <input 
                          type="date" 
                          required
                          value={currentCoupon?.startDate || ''}
                          onChange={e => setCurrentCoupon({ ...currentCoupon, startDate: e.target.value })}
                          className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium transition-all" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-muted uppercase tracking-[0.2em] mb-2">Fecha Fin</label>
                        <input 
                          type="date" 
                          required
                          value={currentCoupon?.endDate || ''}
                          onChange={e => setCurrentCoupon({ ...currentCoupon, endDate: e.target.value })}
                          className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium transition-all" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-medium text-muted uppercase tracking-[0.2em] mb-2">Hora Inicio</label>
                        <input 
                          type="time" 
                          required
                          value={currentCoupon?.startTime || '00:00'}
                          onChange={e => setCurrentCoupon({ ...currentCoupon, startTime: e.target.value })}
                          className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium transition-all" 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-muted uppercase tracking-[0.2em] mb-2">Hora Fin</label>
                        <input 
                          type="time" 
                          required
                          value={currentCoupon?.endTime || '23:59'}
                          onChange={e => setCurrentCoupon({ ...currentCoupon, endTime: e.target.value })}
                          className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 font-medium transition-all" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium text-muted uppercase tracking-[0.2em] mb-2">Descripción</label>
                      <textarea 
                        placeholder="Ej: Válido para pedidos superiores a $2000..."
                        value={currentCoupon?.description || ''}
                        onChange={e => setCurrentCoupon({ ...currentCoupon, description: e.target.value })}
                        className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 h-32 resize-none font-medium transition-all placeholder:text-muted/50" 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium text-muted uppercase tracking-[0.2em] mb-2">Estado</label>
                      <div className="flex space-x-4">
                        <button
                          type="button"
                          onClick={() => setCurrentCoupon({ ...currentCoupon, status: 'active' })}
                          className={`flex-1 py-3 rounded-2xl font-medium text-xs uppercase tracking-widest transition-all ${
                            currentCoupon?.status === 'active' ? 'bg-primary text-dark shadow-lg shadow-primary/20' : 'bg-surface text-muted hover:bg-surface/80'
                          }`}
                        >
                          Activo
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentCoupon({ ...currentCoupon, status: 'inactive' })}
                          className={`flex-1 py-3 rounded-2xl font-medium text-xs uppercase tracking-widest transition-all ${
                            currentCoupon?.status === 'inactive' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-surface text-muted hover:bg-surface/80'
                          }`}
                        >
                          Inactivo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 border-t border-surface bg-surface flex space-x-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditingCoupon(false)}
                    className="flex-1 px-6 py-4 rounded-2xl font-medium text-muted hover:bg-surface transition-all uppercase tracking-widest text-xs"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] bg-primary text-dark py-4 rounded-2xl font-medium text-sm hover:bg-accent transition-all shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 uppercase tracking-widest"
                  >
                    <Save size={18} />
                    <span>{currentCoupon?.id ? 'Guardar' : 'Crear'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-surface flex justify-between items-center bg-surface sticky top-0 z-10">
                <div>
                  <h3 className="text-xl font-medium text-dark">Pedido #{selectedOrder.id}</h3>
                  <p className="text-[10px] font-medium text-muted uppercase tracking-widest">Detalles del pedido</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-surface rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-muted uppercase tracking-widest mb-1">Cliente</p>
                    <p className="text-lg font-medium text-dark">{selectedOrder.profiles?.name || 'Cliente'}</p>
                    <p className="text-sm text-muted">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-muted uppercase tracking-widest mb-1">Estado</p>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-medium uppercase ${
                      selectedOrder.status === 'pending' ? 'bg-primary/20 text-dark' :
                      selectedOrder.status === 'confirmed' ? 'bg-accent/20 text-accent' :
                      selectedOrder.status === 'delivered' ? 'bg-primary text-dark' :
                      'bg-red-500/10 text-red-600'
                    }`}>
                      {selectedOrder.status === 'pending' ? 'Pendiente' :
                       selectedOrder.status === 'confirmed' ? 'Confirmado' :
                       selectedOrder.status === 'delivered' ? 'Entregado' : 'Cancelado'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-medium text-muted uppercase tracking-widest border-b border-surface pb-2">Productos</p>
                  <div className="space-y-3">
                    {selectedOrder.order_items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-surface rounded-2xl flex items-center justify-center text-xs font-medium text-muted">
                            {item.quantity}x
                          </div>
                          <span className="font-medium text-dark">{item.products?.name || 'Producto'}</span>
                        </div>
                        <span className="font-medium text-dark">${item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-surface">
                  <div className="flex justify-between items-center text-xl">
                    <span className="font-medium text-dark">Total</span>
                    <span className="font-medium text-accent">${selectedOrder.total}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted uppercase tracking-widest">Cambiar Estado</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, 'confirmed');
                        setSelectedOrder({ ...selectedOrder, status: 'confirmed' });
                      }}
                      className={`py-3 rounded-2xl font-medium text-xs uppercase tracking-widest transition-all ${
                        selectedOrder.status === 'confirmed' ? 'bg-blue-500 text-white' : 'bg-surface text-muted hover:bg-surface/80'
                      }`}
                    >
                      Confirmar
                    </button>
                    <button 
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, 'delivered');
                        setSelectedOrder({ ...selectedOrder, status: 'delivered' });
                      }}
                      className={`py-3 rounded-2xl font-medium text-xs uppercase tracking-widest transition-all ${
                        selectedOrder.status === 'delivered' ? 'bg-primary text-dark' : 'bg-surface text-muted hover:bg-surface/80'
                      }`}
                    >
                      Entregado
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-surface flex justify-center">
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="text-muted font-medium text-xs uppercase tracking-widest hover:text-dark transition-colors"
                >
                  Cerrar Detalles
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
