import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, Minus, Check } from 'lucide-react';
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
    product.sizes?.length > 0 ? product.sizes[0] : undefined
  );
  const [selectedExtras, setSelectedExtras] = useState<{ groupName: string; optionName: string; price: number }[]>([]);
  const [quantity, setQuantity] = useState(1);

  // Global modifier groups loaded from Supabase
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});
  const [loadingModifiers, setLoadingModifiers] = useState(false);

  useEffect(() => {
    const fetchModifiers = async () => {
      setLoadingModifiers(true);
      try {
        const { data: pmgData } = await supabase
          .from('product_modifier_groups')
          .select('group_id, sort_order')
          .eq('product_id', product.id)
          .order('sort_order');

        if (!pmgData || pmgData.length === 0) {
          setModifierGroups([]);
          return;
        }

        const groupIds = pmgData.map((r: any) => r.group_id);
        const { data: groupData } = await supabase
          .from('modifier_groups')
          .select(`*, modifier_options(*)`)
          .in('id', groupIds);

        if (groupData) {
          // Preserve sort order from product_modifier_groups
          const sorted = groupIds
            .map((gid: string) => groupData.find((g: any) => g.id === gid))
            .filter(Boolean)
            .map((g: any) => ({
              ...g,
              options: (g.modifier_options || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
            }));
          setModifierGroups(sorted);
        }
      } finally {
        setLoadingModifiers(false);
      }
    };
    fetchModifiers();
  }, [product.id]);

  const totalPrice = useMemo(() => {
    const base = Number(selectedSize ? selectedSize.price : product.price);
    const legacyExtras = selectedExtras.reduce((acc, curr) => acc + Number(curr.price), 0);
    const modifierExtras = Object.values(selectedModifiers)
      .flat()
      .reduce((acc, optId) => {
        const opt = modifierGroups.flatMap(g => g.options).find(o => o.id === optId);
        return acc + Number(opt?.extra_price || 0);
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
        if (current.length < group.max_selections) {
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
    // Validate required modifier groups
    for (const group of modifierGroups) {
      const count = (selectedModifiers[group.id] || []).length;
      if (group.is_required && count < 1) {
        alert(`Por favor selecciona una opción de "${group.name}"`);
        return;
      }
      if (group.selection_type === 'multiple' && count < group.min_selections) {
        alert(`Selecciona al menos ${group.min_selections} opciones de "${group.name}"`);
        return;
      }
    }

    // Legacy extras validation
    for (const group of (product.extras || [])) {
      const selections = selectedExtras.filter(e => e.groupName === group.name).length;
      if (selections < group.min) {
        alert(`Por favor selecciona al menos ${group.min} opciones de "${group.name}"`);
        return;
      }
    }

    // Build combined extras for cart
    const modifierExtrasFlat = modifierGroups.flatMap(group =>
      (selectedModifiers[group.id] || []).map(optId => {
        const opt = group.options.find(o => o.id === optId);
        return { groupName: group.name, optionName: opt?.name || '', price: opt?.extra_price || 0 };
      })
    );

    const result = addItem(product, selectedSize, [...selectedExtras, ...modifierExtrasFlat], quantity);
    if (result === 'different_business') {
      if (window.confirm('Tu carrito tiene productos de otro comercio. ¿Deseas vaciarlo y agregar este producto?')) {
        clearAndAdd(product, selectedSize, [...selectedExtras, ...modifierExtrasFlat], quantity);
      } else {
        return;
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center sm:p-4 pt-16">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative bg-surface w-full max-w-2xl max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-surface/50 z-10"
      >
        {/* Header Image */}
        <div className="relative h-48 sm:h-64 shrink-0">
          <img 
            src={product.image || fallbackImage} 
            alt={product.name} 
            onError={(e) => { e.currentTarget.src = fallbackImage; }}
            className="w-full h-full object-cover" 
          />
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-black/20 backdrop-blur-md text-white rounded-full hover:bg-black/40 transition-all border border-white/20"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 scrollbar-hide">
          <div>
            <h3 className="text-3xl font-medium text-dark mb-2">{product.name}</h3>
            <p className="text-muted text-lg">{product.description}</p>
          </div>

          {/* Sizes */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-dark uppercase tracking-widest text-xs flex items-center gap-2">
                Elegí el tamaño <span className="text-[10px] text-muted">(Obligatorio)</span>
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {product.sizes.map((size) => (
                  <button
                    key={size.name}
                    onClick={() => setSelectedSize(size)}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                      selectedSize?.name === size.name 
                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10' 
                        : 'border-surface bg-surface hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedSize?.name === size.name ? 'border-accent bg-accent' : 'border-surface'
                      }`}>
                        {selectedSize?.name === size.name && <Check size={12} className="text-white" />}
                      </div>
                      <span className="font-medium text-dark">{size.name}</span>
                    </div>
                    <span className="font-medium text-accent font-mono">${size.price}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Global Modifier Groups */}
          {loadingModifiers && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          )}

          {modifierGroups.map((group) => (
            <div key={group.id} className="space-y-4">
              <div className="flex justify-between items-end">
                <h4 className="font-medium text-dark uppercase tracking-widest text-xs flex items-center gap-2">
                  {group.name}
                  {group.is_required && <span className="text-[10px] text-red-400">(Obligatorio)</span>}
                </h4>
                <p className="text-[10px] font-medium text-muted bg-surface px-2 py-1 rounded-2xl border border-surface uppercase tracking-tighter">
                  {group.selection_type === 'single' ? 'Elige 1' : `Elige hasta ${group.max_selections}`}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {group.options.filter(o => o.is_available).map((opt) => {
                  const isSelected = (selectedModifiers[group.id] || []).includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleToggleModifier(group, opt.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-surface bg-surface hover:border-primary/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {group.selection_type === 'single' ? (
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-accent bg-accent' : 'border-surface'
                          }`}>
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                        ) : (
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isSelected ? 'border-accent bg-accent' : 'border-surface bg-surface'
                          }`}>
                            {isSelected && <Plus size={14} className="text-white" />}
                          </div>
                        )}
                        <span className="font-medium text-dark">{opt.name}</span>
                      </div>
                      {opt.extra_price > 0 && (
                        <span className="font-medium text-muted text-sm font-mono">+${opt.extra_price}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Legacy Extras Groups */}
          {product.extras && product.extras.length > 0 && product.extras.map((group) => (
            <div key={group.id} className="space-y-4">
              <div className="flex justify-between items-end">
                <h4 className="font-medium text-dark uppercase tracking-widest text-xs flex items-center gap-2">
                  {group.name}
                </h4>
                <p className="text-[10px] font-medium text-muted bg-surface px-2 py-1 rounded-2xl border border-surface uppercase tracking-tighter">
                  {group.min > 0 ? `Min: ${group.min} - ` : ''} Max: {group.max}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {group.options.map((opt) => {
                  const isSelected = selectedExtras.some(e => e.groupName === group.name && e.optionName === opt.name);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleToggleExtra(group.name, opt, group.max)}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-surface bg-surface hover:border-primary/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'border-accent bg-accent' : 'border-surface bg-surface'
                        }`}>
                          {isSelected && <Plus size={14} className="text-white" />}
                        </div>
                        <span className="font-medium text-dark">{opt.name}</span>
                      </div>
                      {opt.price > 0 && (
                        <span className="font-medium text-muted text-sm font-mono">+${opt.price}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-10 border-t border-surface bg-surface/50 backdrop-blur-xl shrink-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-6">
               <div className="flex items-center bg-surface border border-surface rounded-2xl p-1">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-3 hover:text-accent transition-colors"><Minus size={20} /></button>
                  <span className="w-12 text-center font-medium text-dark text-xl">{quantity}</span>
                  <button onClick={() => setQuantity(q => q + 1)} className="p-3 hover:text-accent transition-colors"><Plus size={20} /></button>
               </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-muted uppercase tracking-widest mb-1">Precio Total</p>
              <p className="text-4xl font-medium text-dark font-mono">${totalPrice.toLocaleString('es-CL')}</p>
            </div>
          </div>
          
          <button 
            onClick={handleAddToCart}
            className="w-full bg-primary text-dark py-5 rounded-2xl font-medium text-xl shadow-2xl shadow-primary/30 hover:bg-accent transition-all active:scale-[0.98] flex items-center justify-center space-x-3"
          >
            <Plus size={24} />
            <span>Agregar al Carrito</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
