import React from 'react';
import { Plus } from 'lucide-react';
import { Product, useCartStore, useAuthStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { ProductSelectionModal } from './ProductSelectionModal';

interface ProductCardProps {
  product: Product;
}

// Modal de confirmación para cambio de comercio
const ConfirmStoreChangeModal: React.FC<{
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm z-10"
    >
      <h3 className="text-xl font-semibold text-dark mb-3">¿Cambiar de comercio?</h3>
      <p className="text-muted text-sm mb-6">
        Tu carrito tiene productos de otro comercio. Para agregar este producto debes vaciar el carrito actual y comenzar un nuevo pedido.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-2xl border border-surface text-muted font-medium hover:bg-surface transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all"
        >
          Vaciar y agregar
        </button>
      </div>
    </motion.div>
  </div>
);

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [showStoreChange, setShowStoreChange] = React.useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const clearAndAdd = useCartStore((state) => state.clearAndAdd);
  const portalSettings = useAuthStore((state) => state.portalSettings);

  const fallbackImage = portalSettings?.default_product_image_url || '';

  const handleAdd = () => {
    // Always open the modal — it fetches global modifier groups from Supabase
    // and handles the simple add-to-cart case internally if there are no options.
    setIsModalOpen(true);
  };

  return (
    <motion.div
      layout
      className="bg-surface rounded-2xl border border-surface hover:shadow-lg transition-all flex items-stretch min-h-[110px] overflow-hidden"
    >
      {/* Imagen izquierda — ocupa toda la altura */}
      <div className="w-28 sm:w-32 shrink-0 overflow-hidden">
        <img
          src={product.image || fallbackImage}
          alt={product.name}
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.src = fallbackImage; }}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Texto centrado verticalmente */}
      <div className="flex-1 flex flex-col justify-center p-3 gap-1">
        <h4 className="font-semibold text-dark leading-snug">{product.name}</h4>
        <p className="text-sm text-muted line-clamp-2">{product.description}</p>
        {/* Precio a la derecha + botón */}
        <div className="flex items-center justify-end gap-2 mt-auto">
          <span className="text-base font-bold text-accent">${product.price}</span>
          <button
            onClick={handleAdd}
            className="bg-primary/10 text-accent p-2 rounded-2xl hover:bg-primary hover:text-dark transition-all active:scale-90"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <ProductSelectionModal
            product={product}
            onClose={() => setIsModalOpen(false)}
          />
        )}
        {showStoreChange && (
          <ConfirmStoreChangeModal
            onConfirm={() => {
              setShowStoreChange(false);
              clearAndAdd(product);
            }}
            onCancel={() => setShowStoreChange(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
