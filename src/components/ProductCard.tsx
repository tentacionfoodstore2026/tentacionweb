import React from 'react';
import { Plus } from 'lucide-react';
import { Product, useCartStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { ProductSelectionModal } from './ProductSelectionModal';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const handleAdd = () => {
    const hasOptions = (product.sizes && product.sizes.length > 0) || (product.extras && product.extras.length > 0);
    if (hasOptions) {
      setIsModalOpen(true);
    } else {
      addItem(product);
    }
  };

  return (
    <motion.div 
      layout
      className="bg-surface p-4 rounded-2xl border border-surface flex space-x-4 hover:shadow-md transition-shadow"
    >
      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shrink-0">
        <img 
          src={product.image} 
          alt={product.name} 
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/fallback/800/600'; }}
          className="w-full h-full object-cover" 
        />
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-dark mb-1">{product.name}</h4>
        <p className="text-sm text-muted line-clamp-2 mb-3">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium text-accent">${product.price}</span>
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
      </AnimatePresence>
    </motion.div>
  );
};
