import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPicker } from '../components/MapPicker';
import { useCartStore, useAuthStore, useCouponStore, Coupon, useOrderStore } from '../store/useStore';
import { Send, MapPin, Phone, User as UserIcon, ArrowLeft, Mail, Info, CreditCard, CheckCircle2, Loader2, ShoppingBag, Tag, X as XIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isBusinessCurrentlyOpen } from '../lib/businessHours';

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
    address: user?.address || '',
    reference: '',
    phone: user?.phone || '',
    notes: '',
    paymentMethod: 'cash'
  });

  const [couponCode, setCouponCode] = React.useState('');
  const [appliedCoupon, setAppliedCoupon] = React.useState<Coupon | null>(null);
  const [appliedPromotion, setAppliedPromotion] = React.useState<any | null>(null);
  const [couponError, setCouponError] = React.useState('');
  const [business, setBusiness] = useState<any>(null);
  const [savedOrderInfo, setSavedOrderInfo] = useState<any>(null);

  const businessId = items[0]?.businessId;
  const isStoreOpen = business ? isBusinessCurrentlyOpen(business.opening_hours, business.is_open) : true;

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
        // Apply minimum purchase threshold check if present in promotion
        if (promoData.min_purchase && total() < Number(promoData.min_purchase)) {
          setCouponError(`Compra mínima requerida: $${Number(promoData.min_purchase).toLocaleString('es-CL')}`);
          return;
        }

        // Apply category / product constraints check if present in promotion
        const eligibleItems = items.filter(item => {
          if (promoData.product_id && item.id !== promoData.product_id) return false;
          if (promoData.category && promoData.category !== 'all' && (item.category || '').toLowerCase() !== promoData.category.toLowerCase()) return false;
          return true;
        });

        if (eligibleItems.length === 0) {
          setCouponError('Tu carrito no contiene productos elegibles para esta promoción.');
          return;
        }

        setAppliedPromotion({ ...promoData, uniqueCode: code, value: promoData.value || promoData.discount_percentage, type: promoData.type || 'percentage' });
        setAppliedCoupon(null);
        setCouponCode('');
        return;
      }
    }

    // 2. Check standard coupons in promotions table in Supabase
    const { data: dbCoupon, error: dbCouponError } = await supabase
      .from('promotions')
      .select('*')
      .eq('code', code)
      .single();

    if (dbCouponError || !dbCoupon) {
      setCouponError('Código no válido');
      return;
    }

    // Map dbCoupon to Coupon interface
    const coupon: Coupon = {
      id: dbCoupon.id,
      code: dbCoupon.code,
      type: (dbCoupon.type || 'percentage') as 'percentage' | 'fixed',
      value: dbCoupon.value || dbCoupon.discount_percentage || 0,
      usageCount: dbCoupon.usage_count || 0,
      status: dbCoupon.is_active ? 'active' : 'inactive',
      businessId: dbCoupon.business_id,
      category: dbCoupon.category || 'all',
      productId: dbCoupon.product_id || undefined,
      minPurchase: Number(dbCoupon.min_purchase || 0),
      description: dbCoupon.description || dbCoupon.title || '',
      startDate: dbCoupon.start_date || dbCoupon.created_at?.split('T')[0] || '',
      endDate: dbCoupon.end_date || dbCoupon.valid_until?.split('T')[0] || '',
      startTime: dbCoupon.start_time?.substring(0, 5) || '00:00',
      endTime: dbCoupon.end_time?.substring(0, 5) || '23:59',
    };

    if (coupon.status !== 'active') {
      setCouponError('Este cupón ya no está activo');
      return;
    }

    // Check business restriction
    if (coupon.businessId !== 'all' && coupon.businessId !== businessId) {
      setCouponError('Este cupón no es válido para este comercio');
      return;
    }

    // Check minimum purchase threshold
    if (coupon.minPurchase && total() < coupon.minPurchase) {
      setCouponError(`Compra mínima requerida: $${coupon.minPurchase.toLocaleString('es-CL')}`);
      return;
    }

    // Check category / product constraints validation to prevent cross-product misuse
    const eligibleItems = items.filter(item => {
      // product constraint
      if (coupon.productId && coupon.productId !== 'all' && item.id !== coupon.productId) {
        return false;
      }
      // category constraint
      if (coupon.category && coupon.category !== 'all') {
        const itemCat = (item.category || '').toLowerCase();
        const coupCat = coupon.category.toLowerCase();
        if (itemCat !== coupCat) {
          return false;
        }
      }
      return true;
    });

    if (eligibleItems.length === 0) {
      if (coupon.productId && coupon.productId !== 'all') {
        setCouponError('Este cupón solo es válido para un producto específico que no está en tu carrito.');
      } else {
        setCouponError(`Este cupón solo es válido para productos de la categoría "${coupon.category}".`);
      }
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
      const eligibleItems = items.filter(item => {
        if (appliedPromotion.product_id && item.id !== appliedPromotion.product_id) return false;
        if (appliedPromotion.category && appliedPromotion.category !== 'all' && (item.category || '').toLowerCase() !== appliedPromotion.category.toLowerCase()) return false;
        return true;
      });
      if (eligibleItems.length === 0) return 0;
      const eligibleTotal = eligibleItems.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);

      if (appliedPromotion.type === 'percentage') {
        return Math.round((eligibleTotal * (appliedPromotion.value || appliedPromotion.discount_percentage || 0)) / 100);
      }
      return Math.min(appliedPromotion.value || 0, eligibleTotal);
    }

    if (!appliedCoupon) return 0;
    const eligibleItems = items.filter(item => {
      if (appliedCoupon.productId && item.id !== appliedCoupon.productId) return false;
      if (appliedCoupon.category && appliedCoupon.category !== 'all' && (item.category || '').toLowerCase() !== appliedCoupon.category.toLowerCase()) return false;
      return true;
    });
    if (eligibleItems.length === 0) return 0;
    const eligibleTotal = eligibleItems.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);

    if (appliedCoupon.type === 'percentage') {
      return Math.round((eligibleTotal * appliedCoupon.value) / 100);
    }
    return Math.min(appliedCoupon.value, eligibleTotal);
  };

  const deliveryFee = business?.delivery_fee || 0;
  const finalTotal = total() + deliveryFee - calculateDiscount();

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
      // 1. Insert Order
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
          payment_method: formData.paymentMethod,
          coupon_id: appliedCoupon ? appliedCoupon.id : (appliedPromotion ? appliedPromotion.id : null),
          discount_amount: calculateDiscount(),
          original_total: total()
        })
        .select()
        .single();

      if (orderError) {
        console.error('Supabase Order Error:', orderError);
        throw new Error(orderError.message);
      }

      // 2. Insert Order Items with full modifier details
      const orderItems = items.map(item => {
        // Always send an explicit value (not undefined) so Supabase includes
        // the column in the INSERT SQL and does not fall back to DB default.
        const modifiers = item.selected_modifiers != null && typeof item.selected_modifiers === 'object'
          ? item.selected_modifiers
          : {};
        const extras = Array.isArray(item.selectedExtras) ? item.selectedExtras : [];

        return {
          order_id: orderData.id,
          product_id: item.id,
          quantity: item.quantity,
          price: item.price,
          selected_modifiers: modifiers,
          selected_size: item.selectedSize ? item.selectedSize.name : null,
          selected_extras: extras,
          notes: item.notes || null,
          category_name: item.category || null
        };
      });

      if ((import.meta as any).env.DEV) console.log('[Checkout] Inserting order items:', JSON.stringify(orderItems));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) {
        console.error('[Checkout] Error saving order items:', itemsError.message, itemsError.details, itemsError.hint);
        throw new Error('Error al registrar productos del pedido: ' + itemsError.message);
      }

      // 2.5 Log coupon usage in the audit table if applicable
      if (appliedCoupon || appliedPromotion) {
        const couponId = appliedCoupon ? appliedCoupon.id : appliedPromotion.id;
        const discountAmt = calculateDiscount();
        await supabase.from('coupon_redemptions').insert({
          coupon_id: couponId,
          user_id: user.id,
          order_id: orderData.id,
          discount_amount: discountAmt
        });
      }

      // 3. Save order locally
      useOrderStore.getState().addOrder({
        id: orderData.id,
        userId: user.id,
        customerName: formData.name,
        businessId: businessId,
        items: items.map(item => ({
          productId: item.id,
          name: item.category ? `${item.category} - ${item.name}` : item.name,
          price: item.price,
          quantity: item.quantity
        })),
        total: finalTotal,
        status: 'pending',
        createdAt: new Date().toISOString(),
        coupon_id: appliedCoupon ? appliedCoupon.id : (appliedPromotion ? appliedPromotion.id : undefined),
        discount_amount: calculateDiscount(),
        original_total: total()
      });

      if (appliedPromotion?.uniqueCode) {
        usePromotionCode(appliedPromotion.uniqueCode);
      }

      const currentItems = [...items];
      const currentFinalTotal = finalTotal;
      const currentDiscountText = appliedPromotion ? `\nDescuento (${appliedPromotion.code}): -$${calculateDiscount()}` : appliedCoupon ? `\nDescuento (${appliedCoupon.code}): -$${calculateDiscount()}` : '';
      const currentDeliveryFee = deliveryFee;
      
      setSavedOrderInfo({
        items: currentItems,
        finalTotal: currentFinalTotal,
        discountText: currentDiscountText,
        deliveryFee: currentDeliveryFee
      });

      clearCart();

      setOrderId(orderData.id.substring(0, 8).toUpperCase());
      setStep('success');
    } catch (error: any) {
      console.error('Detailed Order Error:', error);
      alert(`Error: ${error.message || 'Error desconocido al procesar el pedido'}`);
      setStep('form');
    }
  };

  const handleWhatsAppRedirect = () => {
    if (!business || !savedOrderInfo) return;

    const itemsText = savedOrderInfo.items.map((i: any) => {
      const displayName = i.category ? `${i.category} - ${i.name}` : i.name;
      let text = `- ${displayName} x ${i.quantity} ($${i.price * i.quantity})`;
      
      // Modifiers
      if (i.selected_modifiers && Object.keys(i.selected_modifiers).length > 0) {
        Object.entries(i.selected_modifiers).forEach(([group, options]) => {
          const optsText = Array.isArray(options) 
            ? options.map((o: any) => typeof o === 'string' ? o : o.name).join(', ')
            : String(options);
          text += `\n  * ${group}: ${optsText}`;
        });
      }
      
      // Extras
      let filteredExtras = i.selectedExtras || [];
      if (i.selected_modifiers && i.selectedExtras) {
        const selectedModifierNames = new Set<string>();
        Object.values(i.selected_modifiers).forEach((opts: any) => {
          if (Array.isArray(opts)) {
            opts.forEach(o => {
              const name = typeof o === 'string' ? o : (o.name || o);
              if (name) selectedModifierNames.add(name.toString().trim().toLowerCase());
            });
          } else if (typeof opts === 'string') {
            opts.split(',').forEach(o => selectedModifierNames.add(o.trim().toLowerCase()));
          }
        });
        filteredExtras = i.selectedExtras.filter((e: any) => {
          const name = (e.optionName || e.name || '').toString().trim().toLowerCase();
          return !selectedModifierNames.has(name);
        });
      }
      
      if (filteredExtras.length > 0) {
        const extrasText = filteredExtras.map((e: any) => e.optionName || e.name || String(e)).join(', ');
        text += `\n  * Extras: ${extrasText}`;
      }

      // Notes
      if (i.notes) {
        text += `\n  * Nota: ${i.notes}`;
      }

      return text;
    }).join('\n');

    const deliveryText = savedOrderInfo.deliveryFee > 0 ? `\nEnvío: $${savedOrderInfo.deliveryFee}` : '\nEnvío: Gratis';
    const message = `Hola ${business.name}, quiero hacer un pedido:\n\nOrden: #${orderId}\n\n${itemsText}${savedOrderInfo.discountText}${deliveryText}\n\nTotal: $${savedOrderInfo.finalTotal}\n\nDatos de entrega:\nNombre: ${formData.name}\nEmail: ${formData.email}\nDirección: ${formData.address}\nReferencia: ${formData.reference}\nTeléfono: ${formData.phone}\nMétodo de Pago: ${formData.paymentMethod === 'cash' ? 'Efectivo' : 'Debito / Credito'}\nNotas: ${formData.notes || 'Sin notas'}`;
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${business.whatsapp}?text=${encodedMessage}`, '_blank');
    
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
          <p className="text-muted mb-6 leading-relaxed">
            Hemos procesado tu pedido con éxito. Ahora puedes enviarlo por WhatsApp al comercio para coordinar la entrega.
          </p>

          <div className="bg-surface/50 rounded-2xl p-4 mb-8 border border-surface text-left">
            <h4 className="text-xs font-bold text-muted uppercase tracking-widest mb-3 border-b border-surface pb-2">Resumen de tu pedido</h4>
            <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {savedOrderInfo?.items?.map((item: any, idx: number) => (
                <div key={idx} className="border-b border-surface last:border-0 pb-3 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div className="font-bold text-dark text-sm">
                      <span className="text-muted mr-1">{item.quantity}x</span>
                      <span>{item.category ? `${item.category} - ${item.name}` : item.name}</span>
                    </div>
                    <span className="font-bold text-dark text-sm ml-2">${item.price * item.quantity}</span>
                  </div>
                  
                  {/* Modifiers display */}
                  {item.selected_modifiers && Object.entries(item.selected_modifiers).length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {Object.entries(item.selected_modifiers).map(([group, opts]: [string, any]) => (
                        <p key={group} className="text-[10px] text-muted leading-tight">
                          <span className="font-bold uppercase">{group}:</span> {Array.isArray(opts) ? opts.map(o => typeof o === 'string' ? o : o.name).join(', ') : String(opts)}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Extras display */}
                  {item.selectedExtras && item.selectedExtras.length > 0 && (() => {
                    const selectedModifierNames = new Set<string>();
                    if (item.selected_modifiers) {
                      Object.values(item.selected_modifiers).forEach((opts: any) => {
                        if (Array.isArray(opts)) {
                          opts.forEach(o => {
                            const name = typeof o === 'string' ? o : (o.name || o);
                            if (name) selectedModifierNames.add(name.toString().trim().toLowerCase());
                          });
                        } else if (typeof opts === 'string') {
                          opts.split(',').forEach(o => selectedModifierNames.add(o.trim().toLowerCase()));
                        }
                      });
                    }
                    const filteredExtras = item.selectedExtras.filter((e: any) => {
                      const name = (e.optionName || e.name || '').toString().trim().toLowerCase();
                      return !selectedModifierNames.has(name);
                    });
                    if (filteredExtras.length === 0) return null;
                    return (
                      <div className="mt-1">
                        <p className="text-[10px] text-muted leading-tight">
                          <span className="font-bold uppercase">EXTRAS:</span> {filteredExtras.map((e: any) => e.optionName || e.name || String(e)).join(', ')}
                        </p>
                      </div>
                    );
                  })()}

                  {item.notes && (
                    <p className="text-[10px] text-accent italic mt-1 leading-tight">"{item.notes}"</p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-surface flex justify-between items-center">
              <span className="font-bold text-dark uppercase text-xs">Total a pagar</span>
              <span className="font-bold text-accent text-lg">${savedOrderInfo?.finalTotal}</span>
            </div>
          </div>
          
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
                    className="w-full bg-surface border border-surface rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-dark mb-3"
                    placeholder="Calle, número, departamento..."
                  />
                  <MapPicker 
                    address={formData.address} 
                    onChangeAddress={(addr) => setFormData(prev => ({ ...prev, address: addr }))} 
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
                  <div key={item.cartItemId} className="flex justify-between items-start text-muted">
                    <div className="flex-1">
                      <p className="font-medium text-dark">
                        {item.category ? `${item.category} - ${item.name}` : item.name}
                      </p>
                      <p className="text-xs text-muted">Cantidad: {item.quantity}</p>
                      {item.selected_modifiers && Object.keys(item.selected_modifiers).length > 0 && (
                        <div className="text-[10px] text-muted mt-1 space-y-0.5">
                          {Object.entries(item.selected_modifiers).map(([group, opts]: [string, any]) => {
                            const optsString = Array.isArray(opts) ? opts.map(o => {
                              if (typeof o === 'string') return o;
                              const q = o.quantity ? `${o.quantity}x ` : '';
                              const n = o.name || o.optionName || o;
                              return `${q}${n}`;
                            }).join(', ') : (typeof opts === 'object' && opts !== null ? (opts.name || opts.optionName || JSON.stringify(opts)) : String(opts));
                            return <div key={group}><span className="font-medium">{group}:</span> {optsString}</div>;
                          })}
                        </div>
                      )}
                      {item.selectedExtras && item.selectedExtras.length > 0 && (() => {
                        const selectedModifierNames = new Set<string>();
                        if (item.selected_modifiers) {
                          Object.values(item.selected_modifiers).forEach((opts: any) => {
                            if (Array.isArray(opts)) {
                              opts.forEach(o => {
                                const name = typeof o === 'string' ? o : (o.name || o);
                                if (name) selectedModifierNames.add(name.toString().trim().toLowerCase());
                              });
                            } else if (typeof opts === 'string') {
                              opts.split(',').forEach(o => selectedModifierNames.add(o.trim().toLowerCase()));
                            }
                          });
                        }
                        const filteredExtras = item.selectedExtras.filter((e: any) => {
                          const name = (e.optionName || e.name || '').toString().trim().toLowerCase();
                          return !selectedModifierNames.has(name);
                        });
                        if (filteredExtras.length === 0) return null;
                        return (
                          <div className="text-[10px] text-muted mt-0.5">
                            <span className="font-medium">Extras:</span> {filteredExtras.map((e: any) => e.optionName).join(', ')}
                          </div>
                        );
                      })()}
                      {item.selectedSize && (
                        <div className="text-[10px] text-primary font-medium mt-0.5">
                          Tamaño: {item.selectedSize.name}
                        </div>
                      )}
                      {item.notes && (
                        <div className="text-[10px] text-orange-600 bg-orange-50 p-1.5 rounded-lg mt-1 italic border border-orange-100">
                          "{item.notes}"
                        </div>
                      )}
                    </div>
                    <span className="font-medium text-dark ml-4">${Number(item.price) * Number(item.quantity)}</span>
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
                  <span className="text-primary font-medium">
                    {deliveryFee > 0 ? `$${deliveryFee}` : 'Gratis'}
                  </span>
                </div>

                {/* Coupon Input */}
                {!appliedCoupon && !appliedPromotion ? (
                  <div className="pt-4">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text"
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value)}
                        placeholder="Código de cupón"
                        className="flex-1 min-w-0 bg-gray-50/80 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-muted/60 text-dark"
                      />
                      <button 
                        onClick={handleApplyCoupon}
                        className="bg-primary hover:bg-accent text-dark px-4 py-2.5 rounded-2xl text-sm font-medium transition-all shrink-0"
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
                disabled={!formData.name || !formData.address || !formData.phone || !formData.email || !isStoreOpen}
                className={`w-full ${isStoreOpen ? 'bg-primary hover:bg-accent' : 'bg-muted'} text-dark py-4 rounded-2xl font-medium text-lg transition-all flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-primary/20 mt-8`}
              >
                <span>{isStoreOpen ? 'Confirmar Pedido' : 'Comercio Cerrado'}</span>
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
