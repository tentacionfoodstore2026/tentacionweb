import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Truck } from 'lucide-react';
import { Business } from '../store/useStore';
import { motion } from 'motion/react';

export const BusinessCard = ({ business }: { business: Business }) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-surface rounded-2xl overflow-hidden border border-surface shadow-sm hover:shadow-xl transition-all group"
    >
      <Link to={`/business/${business.id}`}>
        <div className="relative h-48 overflow-hidden">
          <img 
            src={business.image} 
            alt={business.name} 
            referrerPolicy="no-referrer"
            onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/fallback/800/600'; }}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          <div className={`absolute top-4 left-4 px-2 py-1 rounded-2xl text-[10px] font-medium uppercase tracking-wider shadow-sm backdrop-blur-sm ${
            business.isOpen 
              ? 'bg-primary/90 text-dark' 
              : 'bg-muted/90 text-dark'
          }`}>
            {business.isOpen ? 'Abierto' : 'Cerrado'}
          </div>
          <div className="absolute top-4 right-4 bg-surface/90 backdrop-blur-sm px-2 py-1 rounded-2xl flex items-center space-x-1 shadow-sm">
            <Star size={14} className="text-primary fill-primary" />
            <span className="text-xs font-medium text-dark">{business.rating}</span>
          </div>
          {!business.isOpen && (
            <div className="absolute inset-0 bg-dark/40 flex items-center justify-center">
              <span className="bg-surface px-4 py-1 rounded-2xl text-sm font-medium text-dark">Cerrado</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-lg font-medium text-dark group-hover:text-accent transition-colors">
              {business.name}
            </h3>
          </div>
          <p className="text-sm text-muted line-clamp-1 mb-3">{business.description}</p>
          <div className="flex items-center space-x-4 text-xs font-medium text-muted">
            <div className="flex items-center space-x-1">
              <Clock size={14} />
              <span>{business.deliveryTime}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Truck size={14} />
              <span>${business.deliveryFee} envío</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
