import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, Minus, Check, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, ProductSize, useCartStore, useAuthStore } from '../store/useStore';
import { supabase } from '../lib/supabase';
import type { ModifierGroup, ModifierOption } from './ModifierGroupManager';

interface ProductSelectionModalProps {
  product: Product;
  onClose: () => void;
}

export const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({ product, onClose }) => {
  const addItem = useCartStore((state) => state.addItem);
  const clearAndAdd = useCartStore((state) => state.clearAndAdd);
  const portalSettings = useAuthStore((state) => state.portalSettings);

  const fallbackImage = portalSettings?.default_product_image_url || '';
  
  const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>(
    (Array.isArray(product.sizes) && product.sizes.length > 0) ? product.sizes[0] : undefined
  );
  const [selectedExtras, setSelectedExtras] = useState<{ groupName: string; optionName: string; price: number }[]>([]);
  const [quantity, setQuantity] = useState(1);

  // Global modifier groups loaded from Supabase
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});
  const [loadingModifiers, setLoadingModifiers] = useState(false);
  const [notes, setNotes] = useState('');

  const isSelectionValid = () => {
    // Check global modifiers
    for (const group of modifierGroups) {
      if (group.is_required) {
        const count = (selectedModifiers[group.id] || []).length;
        if (count < (group.min_selections || 1)) return false;
      }
    }
    // Check legacy extras
    const legacyExtras = Array.isArray(product.extras) ? product.extras : [];
    for (const group of legacyExtras) {
      const selections = selectedExtras.filter(e => e.groupName === group.name).length;
      if (selections < (group.min || 0)) return false;
    }
    return true;
  };

  useEffect(() => {
    const fetchModifiers = async () => {
      setLoadingModifiers(true);
      try {
        const { data: pmgData, error: pmgError } = await supabase
          .from('product_modifier_groups')
          .select('modifier_group_id, sort_order')
          .eq('product_id', product.id)
          .order('sort_order');

        if (pmgError) throw pmgError;

        if (!pmgData || pmgData.length === 0) {
          setModifierGroups([]);
          return;
        }

        const groupIds = pmgData.map((r: any) => r.modifier_group_id);
        const { data: groupData, error: groupError } = await supabase
          .from('modifier_groups')
          .select(`*, modifier_options(*)`)
          .in('id', groupIds);

        if (groupError) throw groupError;

        if (groupData) {
          // Preserve sort order from product_modifier_groups and map fields
          const mapped = groupIds
            .map((gid: string) => groupData.find((g: any) => g.id === gid))
            .filter(Boolean)
            .map((g: any) => ({
              ...g,
              selection_type: g.type, // Map 'type' from DB to 'selection_type'
              is_required: g.required, // Map 'required' from DB to 'is_required'
              options: (g.modifier_options || [])
                .map((opt: any) => ({
                  ...opt,
                  extra_price: Number(opt.price || 0), // Map 'price' from DB to 'extra_price'
                }))
                .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)),
            }));
          setModifierGroups(mapped);
        }
      } catch (err) {
        console.error('Error fetching modifiers:', err);
      } finally {
        setLoadingModifiers(false);
      }
    };
    fetchModifiers();
  }, [product.id]);

  const totalPrice = useMemo(() => {
    const base = Number(selectedSize ? selectedSize.price : product.price);
    const legacyExtras = selectedExtras.reduce((acc, curr) => acc + Number(curr.price), 0);
    const modifierExtras = Object.entries(selectedModifiers)
      .reduce((acc, [groupId, optIds]) => {
        const group = modifierGroups.find(g => g.id === groupId);
        if (!group) return acc;
        const groupTotal = (optIds as string[]).reduce((sum, optId) => {
          const opt = group.options?.find(o => o.id === optId);
          return sum + (Number(opt?.extra_price) || 0);
        }, 0);
        return acc + groupTotal;
      }, 0);
    return (base + legacyExtras + modifierExtras) * Number(quantity);
  }, [selectedSize, selectedExtras, selectedModifiers, modifierGroups, product, quantity]);

  const handleToggleModifier = (group: ModifierGroup, optionId: string) => {
    const current = selectedModifiers[group.id] || [];
    const isSelected = current.includes(optionId);

    if (group.selection_type === 'single') {
      setSelectedModifiers(prev => ({ ...prev, [group.id]: isSelected ? [] : [optionId] }));
    } else {
      if (isSelected) {
        setSelectedModifiers(prev => ({ ...prev, [group.id]: current.filter(id => id !== optionId) }));
      } else {
        if (current.length < (group.max_selections || 99)) {
          setSelectedModifiers(prev => ({ ...prev, [group.id]: [...current, optionId] }));
        }
      }
    }
  };

  const handleToggleExtra = (groupName: string, option: { name: string, price: number }, max: number) => {
    const currentGroupSelections = selectedExtras.filter(e => e.groupName === groupName);
    const isSelected = selectedExtras.some(e => e.groupName === groupName && e.optionName === option.name);

    if (isSelected) {
      setSelectedExtras(selectedExtras.filter(e => !(e.groupName === groupName && e.optionName === option.name)));
    } else {
      if (max === 1) {
        const withoutGroup = selectedExtras.filter(e => e.groupName !== groupName);
        setSelectedExtras([...withoutGroup, { groupName, optionName: option.name, price: option.price }]);
      } else if (currentGroupSelections.length < max) {
        setSelectedExtras([...selectedExtras, { groupName, optionName: option.name, price: option.price }]);
      }
    }
  };

  const handleAddToCart = () => {
    try {
      // Validate required modifier groups
      for (const group of modifierGroups) {
        const count = (selectedModifiers[group.id] || []).length;
        if (group.is_required && count < (group.min_selections || 1)) {
          alert(`Por favor selecciona una opción de "${group.name}"`);
          return;
        }
      }

      // Legacy extras validation
      const legacyExtras = Array.isArray(product.extras) ? product.extras : [];
      for (const group of legacyExtras) {
        const selections = selectedExtras.filter(e => e.groupName === group.name).length;
        if (selections < (group.min || 0)) {
          alert(`Por favor selecciona al menos ${group.min} opciones de "${group.name}"`);
          return;
        }
      }

      // Build structured modifiers for database (Kitchen panel display)
      const structuredModifiers: Record<string, any> = {};
      for (const group of modifierGroups) {
        const selectedOptIds = selectedModifiers[group.id] || [];
        if (selectedOptIds.length > 0) {
          structuredModifiers[group.name] = selectedOptIds.map(optId => {
            const opt = group.options?.find(o => o.id === optId);
            return { name: opt?.name || 'Opción', quantity: 1, price: opt?.extra_price || 0 };
          });
        }
      }

      // Build flat extras for backward compatibility in cart display
      const modifierExtrasFlat = modifierGroups.flatMap(group =>
        (selectedModifiers[group.id] || []).map(optId => {
          const opt = group.options?.find(o => o.id === optId);
          return { groupName: group.name, optionName: opt?.name || 'Opción', price: opt?.extra_price || 0 };
        })
      );

      const combinedExtras = [...selectedExtras, ...modifierExtrasFlat];

      const result = addItem(product, selectedSize, combinedExtras, quantity, notes, structuredModifiers);
      if (result === 'different_business') {
        if (window.confirm('Tu carrito tiene productos de otro comercio. ¿Deseas vaciarlo y agregar este producto?')) {
          clearAndAdd(product, selectedSize, combinedExtras, quantity, notes, structuredModifiers);
        } else {
          return;
        }
      }
      onClose();
    } catch (err) {
      console.error('Error adding to cart:', err);
      alert('Hubo un error al agregar el producto. Por favor intenta de nuevo.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center sm:p-4 pt-10">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative bg-white w-full max-w-xl max-h-[85vh] sm:rounded-[32px] overflow-hidden flex flex-col shadow-2xl z-10"
      >
        {/* Header Image */}
        <div className="relative h-44 sm:h-52 shrink-0 bg-[#F8F9FA] flex items-center justify-center p-4 overflow-hidden border-b border-surface">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60" />
          <img 
            src={product.image || fallbackImage} 
            alt={product.name} 
            onError={(e) => { e.currentTarget.src = fallbackImage; }}
            className="w-full h-full object-contain drop-shadow-lg relative z-10 transition-transform duration-500 hover:scale-105" 
          />
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-[60] w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md text-dark hover:bg-white transition-all hover:scale-110"
          >
            <X size={18} strokeWidth={3} />
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-dark tracking-tight leading-tight">{product.name}</h3>
              <p className="text-muted text-sm leading-relaxed font-medium line-clamp-2">{product.description}</p>
              {(!Array.isArray(product.sizes) || product.sizes.length === 0) && (
                <div className="text-xl font-black text-primary font-mono mt-2">${(product.price || 0).toLocaleString('es-CL')}</div>
              )}
            </div>

            {Array.isArray(product.sizes) && product.sizes.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-dark text-base uppercase tracking-tight">Tamaño</h4>
                  <span className="text-[9px] font-black tracking-widest uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">Obligatorio</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {product.sizes.map((size) => (
                    <button
                      key={size.name}
                      onClick={() => setSelectedSize(size)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all ${
                        selectedSize?.name === size.name 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'border-surface bg-white hover:border-primary/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          selectedSize?.name === size.name ? 'border-primary bg-primary scale-110 shadow-sm' : 'border-gray-300'
                        }`}>
                          {selectedSize?.name === size.name && <Check size={12} className="text-white" strokeWidth={4} />}
                        </div>
                        <span className="font-bold text-dark text-sm">{size.name}</span>
                      </div>
                      <span className="font-bold text-primary text-sm font-mono">${size.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loadingModifiers && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Cargando opciones...</p>
              </div>
            )}

            {modifierGroups.map((group) => (
              <div key={group.id} className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-dark text-base uppercase tracking-tight">{group.name}</h4>
                    {group.is_required && <span className="text-[9px] font-black tracking-widest uppercase text-white bg-primary px-2 py-0.5 rounded-full">Obligatorio</span>}
                  </div>
                  <p className="text-[10px] font-bold text-primary bg-primary/5 border border-primary/10 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                    {group.selection_type === 'single' ? 'Elige 1' : 
                      (group.min_selections > 0 
                        ? `Elige ${group.min_selections}-${group.max_selections}` 
                        : `Máx ${group.max_selections}`)
                    }
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {Array.isArray(group.options) && group.options.map((opt) => {
                    const isSelected = (selectedModifiers[group.id] || []).includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleToggleModifier(group, opt.id)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all duration-300 ${
                          isSelected 
                            ? 'border-primary bg-primary/5 shadow-sm' 
                            : 'border-surface bg-surface/30 hover:border-primary/20 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-lg border-2 flex shrink-0 items-center justify-center transition-all ${
                            isSelected ? 'border-primary bg-primary scale-110 shadow-sm' : 'border-gray-300 bg-white'
                          }`}>
                            {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                          </div>
                          <span className={`font-bold text-sm transition-colors ${isSelected ? 'text-primary' : 'text-dark/80'}`}>{opt.name}</span>
                        </div>
                        {opt.extra_price > 0 && (
                          <span className="font-black text-dark text-xs font-mono bg-surface px-2 py-1 rounded-lg border border-surface">
                            +${opt.extra_price.toLocaleString('es-CL')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {Array.isArray(product.extras) && product.extras.length > 0 && product.extras.map((group) => (
              <div key={group.id || group.name} className="space-y-4">
                <div className="flex justify-between items-center border-b border-surface pb-2">
                  <h4 className="font-bold text-dark text-base uppercase tracking-tight">{group.name}</h4>
                  <p className="text-[10px] font-bold text-muted bg-surface px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {group.min > 0 ? `Min: ${group.min} - ` : ''} Max: {group.max}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {Array.isArray(group.options) && group.options.map((opt) => {
                    const isSelected = selectedExtras.some(e => e.groupName === group.name && e.optionName === opt.name);
                    return (
                      <button
                        key={opt.name}
                        onClick={() => handleToggleExtra(group.name, opt, group.max)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                          isSelected 
                            ? 'border-primary bg-primary/5 shadow-sm' 
                            : 'border-surface bg-white hover:border-primary/20'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-5 h-5 rounded-md border-2 flex shrink-0 items-center justify-center transition-all ${
                            isSelected ? 'border-primary bg-primary scale-110 shadow-sm' : 'border-gray-300 bg-white'
                          }`}>
                            {isSelected && <Check size={12} className="text-white" strokeWidth={4} />}
                          </div>
                          <span className="font-bold text-dark text-sm leading-tight">{opt.name}</span>
                        </div>
                        {opt.price > 0 && (
                          <span className="font-bold text-muted text-xs font-mono bg-surface px-2 py-1 rounded-lg border border-surface whitespace-nowrap ml-2">
                            +${opt.price}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            
            <div className="space-y-4 pt-4 border-t border-surface">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-surface shadow-sm">
                  <MessageSquare size={16} className="text-primary" />
                </div>
                <h4 className="font-bold text-dark text-xs uppercase tracking-tight">Notas especiales</h4>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="¿Alguna nota o preferencia para tu pedido?"
                className="w-full h-20 p-4 rounded-2xl border-2 border-surface focus:border-primary/50 focus:bg-white outline-none resize-none text-sm font-medium transition-all bg-surface/30 placeholder:text-muted/60"
              />
            </div>
          </div>

          <div className="p-4 sm:p-5 bg-white border-t border-surface flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex items-center justify-between sm:justify-start gap-4 bg-[#F8F9FA] rounded-2xl p-1 border border-surface shadow-inner">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-dark hover:text-primary transition-all active:scale-90"
              >
                <Minus size={16} strokeWidth={3} />
              </button>
              <span className="font-black text-lg min-w-[28px] text-center text-dark font-mono">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-dark hover:text-primary transition-all active:scale-90"
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={!isSelectionValid()}
              className={`flex-1 h-12 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 relative overflow-hidden group ${
                isSelectionValid()
                  ? 'bg-primary text-white shadow-lg hover:translate-y-[-2px] active:translate-y-[0px]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              }`}
            >
              <span className="relative z-10 font-bold uppercase tracking-widest">Agregar • ${(totalPrice || 0).toLocaleString('es-CL')}</span>
              {isSelectionValid() && (
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
