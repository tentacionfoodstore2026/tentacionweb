import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore, useAuthStore, useCouponStore, Coupon, useOrderStore } from '../store/useStore';
import { Send, MapPin, Phone, User as UserIcon, ArrowLeft, Mail, Info, CreditCard, CheckCircle2, Loader2, ShoppingBag, Tag, X as XIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { supabase } from '../lib/supabase';

export const Checkout = () => {
  const { items, total, clearCart } = useCartStore();
  const { user, usePromotionCode } = useAuthStore();
  const { coupons } = useCouponStore();
  const navigate = useNavigate();
  
  const [step, setStep] = React.useState<'form' | 'processing' | 'success'>('form');
  const [orderId, setOrderId] = React.useState('');
  const [formData, setFormData] = React.useState({
    name: user?.name || '',
    email: user?.email || '',
    address: '',
    reference: '',
    phone: '',
    notes: '',
    paymentMethod: 'cash'
  });

  const [couponCode, setCouponCode] = React.useState('');
  const [appliedCoupon, setAppliedCoupon] = React.useState<Coupon | null>(null);
  const [appliedPromotion, setAppliedPromotion] = React.useState<any | null>(null);
  const [couponError, setCouponError] = React.useState('');
  const [business, setBusiness] = useState<any>(null);

  const businessId = items[0]?.businessId;

  useEffect(() => {
    if (businessId) {
      supabase.from('businesses').select('*').eq('id', businessId).single().then(({ data }) => {
        if (data) setBusiness(data);
      });
    }
  }, [businessId]);

  const handleApplyCoupon = async () => {
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    
    // 1. Check if it's a unique promotion code for the user
    const claimedPromo = user?.claimedPromotions?.find(p => p.code.toUpperCase() === code);
    
    if (claimedPromo) {
      if (claimedPromo.used) {
        setCouponError('Este código ya ha sido utilizado.');
        return;
      }
      
      const { data: promoData } = await supabase.from('promotions').select('*').eq('id', claimedPromo.promoId).single();

      if (promoData) {
        // If the promo is for a specific product, check if it's in the cart
        // Assuming promoData might have a product_id field in a real scenario, but for now we'll just apply it to the total
        setAppliedPromotion({ ...promoData, uniqueCode: code, value: promoData.discount_percentage, type: 'percentage' });
        setAppliedCoupon(null);
        setCouponCode('');
        return;
      }
    }

    // 2. Check standard coupons
    const coupon = coupons.find(c => c.code.toUpperCase() === code);

    if (!coupon) {
      setCouponError('Código no válido');
      return;
    }

    if (coupon.status !== 'active') {
      setCouponError('Este cupón ya no está activo');
      return;
    }

    // Check business restriction
    if (coupon.businessId !== 'all' && coupon.businessId !== businessId) {
      setCouponError('Este cupón no es válido para este comercio');
      return;
    }

    // Date and Time validation
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm

    if (today < coupon.startDate || today > coupon.endDate) {
      setCouponError('Este cupón ha expirado o aún no es válido');
      return;
    }

    if (currentTime < coupon.startTime || currentTime > coupon.endTime) {
      setCouponError('Este cupón no está disponible en este horario');
      return;
    }

    setAppliedCoupon(coupon);
    setAppliedPromotion(null);
    setCouponCode('');
  };

  const calculateDiscount = () => {
    if (appliedPromotion) {
      if (appliedPromotion.type === 'percentage') {
        // If promo is for a specific product, only discount that product
        if (appliedPromotion.productId) {
          const item = items.find(i => i.id === appliedPromotion.productId);
          if (item) {
            return Math.round((item.price * item.quantity * appliedPromotion.value) / 100);
          }
        }
        return Math.round((total() * appliedPromotion.value) / 100);
      }
      return appliedPromotion.value || 0;
    }

    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === 'percentage') {
      return Math.round((total() * appliedCoupon.value) / 100);
    }
    return appliedCoupon.value;
  };

  const finalTotal = total() - calculateDiscount();

  if (items.length === 0 && step !== 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-surface">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center bg-surface p-8 rounded-2xl shadow-xl max-w-sm w-full border border-surface"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag size={40} className="text-primary" />
          </div>
          <h2 className="text-2xl font-medium text-dark mb-2">Tu carrito está vacío</h2>
          <p className="text-muted mb-8">Parece que aún no has agregado nada a tu pedido.</p>
          <button 
            onClick={() => navigate('/')} 
            className="w-full bg-primary text-dark py-4 rounded-2xl font-medium hover:bg-accent transition-all shadow-lg shadow-primary/20"
          >
            Explorar comercios
          </button>
        </motion.div>
      </div>
    );
  }

  const handleConfirmOrder = async () => {
    if (!user) {
      alert('Debes iniciar sesión para realizar un pedido.');
      navigate('/login');
      return;
    }

    setStep('processing');
    
    try {
      // 1. Insert Order with full delivery info
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          business_id: businessId,
          total: finalTotal,
          status: 'pending',
          customer_name: formData.name,
          customer_phone: formData.phone,
          delivery_address: formData.address,
          delivery_reference: formData.reference,
          notes: formData.notes,
          payment_method: formData.paymentMethod
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Insert Order Items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Mark promotion as used if applicable
      if (appliedPromotion?.uniqueCode) {
        usePromotionCode(appliedPromotion.uniqueCode);
      }

      setOrderId(orderData.id.substring(0, 8).toUpperCase());
      setStep('success');
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Hubo un error al procesar tu pedido. Por favor intenta de nuevo.');
      setStep('form');
    }
  };

  const handleWhatsAppRedirect = () => {
    if (!business) return;

    const itemsText = items.map(i => `- ${i.name} x ${i.quantity} ($${i.price * i.quantity})`).join('\n');
    const discountText = appliedPromotion ? `\nDescuento (${appliedPromotion.code}): -$${calculateDiscount()}` : appliedCoupon ? `\nDescuento (${appliedCoupon.code}): -$${calculateDiscount()}` : '';
    const message = `Hola ${business.name}, quiero hacer un pedido:\n\nOrden: #${orderId}\n\n${itemsText}${discountText}\n\nTotal: $${finalTotal}\n\nDatos de entrega:\nNombre: ${formData.name}\nEmail: ${formData.email}\nDirección: ${formData.address}\nReferencia: ${formData.reference}\nTeléfono: ${formData.phone}\nMétodo de Pago: ${formData.paymentMethod === 'cash' ? 'Efectivo' : 'Debito / Credito'}\nNotas: ${formData.notes || 'Sin notas'}`;
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${business.whatsapp}?text=${encodedMessage}`, '_blank');
    
    clearCart();
    navigate('/');
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4 pt-24">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-surface rounded-2xl shadow-2xl p-8 text-center border border-surface"
        >
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={48} className="text-primary" />
          </div>
          <h2 className="text-3xl font-medium text-dark mb-2">¡Pedido Recibido!</h2>
          <p className="text-accent font-medium mb-6">Orden #{orderId}</p>
          <p className="text-muted mb-8 leading-relaxed">
            Hemos procesado tu pedido con éxito. Ahora puedes enviarlo por WhatsApp al comercio para coordinar la entrega.
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={handleWhatsAppRedirect}
              className="w-full bg-primary text-dark py-4 rounded-2xl font-medium text-lg hover:bg-accent transition-all flex items-center justify-center space-x-3 shadow-lg shadow-primary/20 active:scale-95"
            >
              <Send size={20} />
              <span>Enviar por WhatsApp</span>
            </button>
            <button 
              onClick={() => {
                clearCart();
                navigate('/');
              }}
              className="w-full bg-dark/5 text-muted py-4 rounded-2xl font-medium hover:bg-dark/10 transition-all"
            >
              Volver al Inicio
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <Loader2 size={64} className="text-primary animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-medium text-dark mb-2">Procesando tu pedido</h2>
          <p className="text-muted">Estamos preparando todo para tu entrega...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4">
        <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-muted mb-8 hover:text-accent transition-colors group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Volver</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface rounded-2xl shadow-sm border border-surface p-8">
              <h2 className="text-2xl font-medium text-dark mb-8">Datos de Entrega</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-muted mb-2 flex items-center space-x-2">
                    <UserIcon size={16} className="text-primary" />
                    <span>Nombre Completo</span>
                  </label>
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-dark"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted mb-2 flex items-center space-x-2">
                    <Mail size={16} className="text-primary" />
                    <span>Correo Electrónico</span>
                  </label>
                  <input 
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-dark"
                    placeholder="juan@ejemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted mb-2 flex items-center space-x-2">
                    <Phone size={16} className="text-primary" />
                    <span>Teléfono de Contacto</span>
                  </label>
                  <input 
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-dark"
                    placeholder="Ej: +54 9 11 1234 5678"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-muted mb-2 flex items-center space-x-2">
                    <MapPin size={16} className="text-primary" />
                    <span>Dirección Exacta</span>
                  </label>
                  <input 
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-dark"
                    placeholder="Calle, número, departamento..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-muted mb-2 flex items-center space-x-2">
                    <Info size={16} className="text-primary" />
                    <span>Referencia de Ubicación</span>
                  </label>
                  <input 
                    type="text"
                    value={formData.reference}
                    onChange={e => setFormData({...formData, reference: e.target.value})}
                    className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-dark"
                    placeholder="Ej: Entre calles, casa de color azul, frente a la plaza..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-muted mb-2">Notas adicionales para el comercio</label>
                  <textarea 
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all h-24 resize-none text-dark"
                    placeholder="Ej: Sin cebolla, tocar timbre 2B, etc."
                  />
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-2xl shadow-sm border border-surface p-8">
              <h2 className="text-2xl font-medium text-dark mb-8 flex items-center space-x-3">
                <CreditCard size={24} className="text-primary" />
                <span>Método de Pago</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => setFormData({...formData, paymentMethod: 'cash'})}
                  className={`p-6 rounded-2xl border-2 transition-all text-left flex items-center space-x-4 ${
                    formData.paymentMethod === 'cash' 
                    ? 'border-primary bg-primary/5 ring-4 ring-primary/5' 
                    : 'border-surface hover:border-primary/20'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    formData.paymentMethod === 'cash' ? 'bg-primary text-dark' : 'bg-surface text-muted border border-surface'
                  }`}>
                    <span className="text-xl font-medium">$</span>
                  </div>
                  <div>
                    <p className="font-medium text-dark">Efectivo</p>
                    <p className="text-sm text-muted">Pagas al recibir</p>
                  </div>
                </button>

                <button 
                  onClick={() => setFormData({...formData, paymentMethod: 'transfer'})}
                  className={`p-6 rounded-2xl border-2 transition-all text-left flex items-center space-x-4 ${
                    formData.paymentMethod === 'transfer' 
                    ? 'border-primary bg-primary/5 ring-4 ring-primary/5' 
                    : 'border-surface hover:border-primary/20'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    formData.paymentMethod === 'transfer' ? 'bg-primary text-dark' : 'bg-surface text-muted border border-surface'
                  }`}>
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <p className="font-medium text-dark">Debito / Credito</p>
                    <p className="text-sm text-muted">Pagas con tarjeta</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-surface text-dark rounded-2xl p-8 shadow-xl sticky top-24 border border-surface">
              <h3 className="text-xl font-medium mb-6 flex items-center space-x-2">
                <ShoppingBag size={20} className="text-primary" />
                <span>Resumen del Pedido</span>
              </h3>
              
              <div className="space-y-4 mb-8 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-start text-muted">
                    <div className="flex-1">
                      <p className="font-medium text-dark">{item.name}</p>
                      <p className="text-xs text-muted">Cantidad: {item.quantity}</p>
                    </div>
                    <span className="font-medium text-dark ml-4">${item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-6 border-t border-surface">
                <div className="flex justify-between items-center text-muted">
                  <span>Subtotal</span>
                  <span>${total()}</span>
                </div>
                
                {appliedCoupon && (
                  <div className="flex justify-between items-center text-accent font-medium">
                    <div className="flex items-center space-x-1">
                      <Tag size={14} />
                      <span>Descuento ({appliedCoupon.code})</span>
                    </div>
                    <span>-${calculateDiscount()}</span>
                  </div>
                )}

                {appliedPromotion && (
                  <div className="flex justify-between items-center text-accent font-medium">
                    <div className="flex items-center space-x-1">
                      <Tag size={14} />
                      <span>Promo ({appliedPromotion.title})</span>
                    </div>
                    <span>-${calculateDiscount()}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-muted">
                  <span>Envío</span>
                  <span className="text-primary font-medium">Gratis</span>
                </div>

                {/* Coupon Input */}
                {!appliedCoupon && !appliedPromotion ? (
                  <div className="pt-4">
                    <div className="flex space-x-2">
                      <input 
                        type="text"
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value)}
                        placeholder="Código de cupón"
                        className="flex-1 bg-surface border border-surface rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted"
                      />
                      <button 
                        onClick={handleApplyCoupon}
                        className="bg-primary hover:bg-accent text-dark px-4 py-2 rounded-2xl text-sm font-medium transition-all"
                      >
                        Aplicar
                      </button>
                    </div>
                    {couponError && <p className="text-red-500 text-xs mt-2 ml-1">{couponError}</p>}
                  </div>
                ) : (
                  <div className="pt-4">
                    <div className="bg-surface border border-surface rounded-2xl px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Tag size={16} className="text-primary" />
                        <span className="text-sm font-medium">
                          {appliedCoupon ? appliedCoupon.code : appliedPromotion.uniqueCode}
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          setAppliedCoupon(null);
                          setAppliedPromotion(null);
                        }}
                        className="text-muted hover:text-dark transition-colors"
                      >
                        <XIcon size={16} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-2xl pt-4">
                  <span className="font-medium">Total</span>
                  <span className="font-medium text-primary">${finalTotal}</span>
                </div>
              </div>
              
              <button 
                onClick={handleConfirmOrder}
                disabled={!formData.name || !formData.address || !formData.phone || !formData.email}
                className="w-full bg-primary text-dark py-4 rounded-2xl font-medium text-lg hover:bg-accent transition-all flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-primary/20 mt-8"
              >
                <span>Confirmar Pedido</span>
              </button>
              
              <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-surface">
                <p className="text-xs text-muted leading-relaxed">
                  Al confirmar, procesaremos tu solicitud y te daremos el enlace final para coordinar por WhatsApp.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
