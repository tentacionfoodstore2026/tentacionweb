import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Tag, Sparkles, Clock, Check } from 'lucide-react';
import { useAuthStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Promotion {
  id: string;
  business_id: string;
  title: string;
  description: string;
  discount_percentage: number;
  code: string;
  valid_until: string;
  image?: string;
}

export const Promotions = () => {
  const { user, claimPromotion } = useAuthStore();
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const { data, error } = await supabase
          .from('promotions')
          .select('*')
          .gte('valid_until', new Date().toISOString());
          
        if (error) throw error;
        setPromotions(data || []);
      } catch (error) {
        console.error('Error fetching promotions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, []);

  const handleClaim = (promoId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    claimPromotion(promoId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-12 min-h-screen bg-surface/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-12">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-primary/20 text-primary rounded-2xl">
              <Tag size={32} />
            </div>
            <h1 className="text-4xl font-semibold text-dark tracking-tight">
              Promociones <span className="text-primary">Exclusivas</span>
            </h1>
          </div>
          <p className="text-xl text-muted max-w-2xl">
            Aprovecha los mejores descuentos y ofertas de tus comercios favoritos en Arica.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {promotions.map((promo, index) => {
            const isClaimed = user?.claimedPromotions?.some(p => p.promoId === promo.id);
            
            return (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group bg-surface rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-surface flex flex-col"
              >
                <div className="relative h-48 overflow-hidden bg-primary/10">
                  {promo.image ? (
                    <img 
                      src={promo.image} 
                      alt={promo.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary">
                      <Tag size={64} />
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className="bg-primary text-dark px-4 py-1.5 rounded-2xl font-medium text-sm shadow-lg">
                      {promo.discount_percentage}% OFF
                    </span>
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center space-x-2 text-primary mb-2">
                    <Sparkles size={16} />
                    <span className="text-xs font-medium uppercase tracking-wider">Oferta Destacada</span>
                  </div>
                  <h3 className="text-2xl font-medium text-dark mb-2">{promo.title}</h3>
                  <p className="text-muted mb-6 line-clamp-2">
                    {promo.description}
                  </p>
                  
                  <div className="mt-auto">
                    <div className="flex items-center text-muted/60 text-sm mb-4">
                      <Clock size={14} className="mr-1" />
                      Válido hasta {new Date(promo.valid_until).toLocaleDateString()}
                    </div>
                    
                    <button 
                      onClick={() => handleClaim(promo.id)}
                      disabled={isClaimed}
                      className={`w-full py-3.5 rounded-2xl font-medium text-sm tracking-wide transition-all duration-300 flex items-center justify-center space-x-2 ${
                        isClaimed 
                          ? 'bg-dark/5 text-muted/60 cursor-not-allowed' 
                          : 'bg-primary text-dark hover:bg-accent shadow-lg shadow-primary/20 active:scale-[0.98]'
                      }`}
                    >
                      {isClaimed ? (
                        <>
                          <Check size={18} />
                          <span>CANJEADO</span>
                        </>
                      ) : (
                        <span>LO QUIERO</span>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>


        <section className="mt-20 bg-dark rounded-2xl p-12 text-surface relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-4xl font-semibold mb-6 leading-tight">
              ¿Quieres recibir las mejores ofertas en tu WhatsApp?
            </h2>
            <p className="text-surface/80 text-lg mb-8">
              Únete a nuestro canal de promociones y no te pierdas ningún descuento relámpago.
            </p>
            <button className="bg-primary text-dark px-8 py-4 rounded-2xl font-medium text-lg hover:bg-accent transition-colors shadow-xl shadow-primary/20">
              Unirme al Canal
            </button>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full -mr-20 -mt-20 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-accent/10 rounded-full -mr-10 -mb-10 blur-2xl" />
        </section>
      </div>
    </div>
  );
};
