import React, { useEffect, useState } from 'react';
import { Search, Filter, ChevronRight, Zap, Award, Clock } from 'lucide-react';
import { BusinessCard } from '../components/BusinessCard';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Business } from '../store/useStore';

import { Footer } from '../components/Footer';



export const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<string[]>(['Todos']);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusinesses = async () => {
      setFetchError(null);
      try {
        console.log('[Home] Fetching businesses from Supabase...');
        const { data, error } = await supabase
          .from('businesses')
          .select('*');
        
        if (error) {
          console.error('[Home] Supabase error:', error.code, error.message, error.hint);
          throw error;
        }
        
        console.log(`[Home] Supabase returned ${data?.length ?? 0} businesses total`);

        if (!data || data.length === 0) {
          console.warn('[Home] No businesses found — run supabase-rls-fixes.sql in your Supabase SQL Editor');
        }

        // Map snake_case to camelCase and handle potentially null fields
        const formattedData = (data || []).map(b => ({
          id: b.id,
          name: b.name || 'Sin nombre',
          description: b.description || '',
          category: b.category || 'Sin categoría',
          image: b.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
          banner: b.banner,
          whatsapp: b.whatsapp,
          address: b.address,
          rating: b.rating || 5.0,
          isOpen: b.is_open ?? true,
          deliveryFee: b.delivery_fee || 0,
          deliveryTime: b.delivery_time || '30-45 min',
          status: b.status || 'active'
        })) as Business[];

        setBusinesses(formattedData);

        // Extract unique categories dynamically from all fetched businesses
        const uniqueCategories = ['Todos', ...Array.from(new Set(formattedData.map(b => b.category)))].filter(Boolean);
        setCategories(uniqueCategories);
        console.log('[Home] Dynamic categories:', uniqueCategories);

      } catch (err: any) {
        console.error('[Home] Critical error fetching businesses:', err);
        setFetchError(err?.message || 'Error de conexión con Supabase');
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, []);

  const filteredBusinesses = businesses.filter((biz) => {
    const matchesCategory = selectedCategory === 'Todos' || biz.category === selectedCategory;
    const matchesSearch = biz.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         biz.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-surface pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Hero Section */}
        <section className="relative rounded-2xl overflow-hidden bg-accent p-8 sm:p-12 mb-12">
          <div className="relative z-10 max-w-2xl">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-5xl font-medium text-white mb-6 leading-tight"
            >
              Lo mejor de Arica <br />
              <span className="text-primary">te lo llevamos a tu mesa</span>
            </motion.h1>
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
              <input 
                type="text"
                placeholder="¿Qué se te antoja hoy?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface rounded-2xl py-4 pl-12 pr-4 text-dark placeholder-muted focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-xl border border-surface"
              />
            </div>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/2 hidden lg:block">
            <img 
              src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80" 
              alt="Food" 
              className="w-full h-full object-cover opacity-40 mix-blend-overlay"
            />
          </div>
        </section>

        {/* Categories */}
        <section className="mb-12 overflow-x-auto no-scrollbar">
          <div className="flex space-x-4 pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-3 rounded-2xl font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat 
                    ? 'bg-primary text-dark shadow-lg shadow-primary/20' 
                    : 'bg-surface text-muted hover:bg-primary/5 border border-surface'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Featured Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-medium text-dark flex items-center space-x-2">
              <Zap className="text-primary fill-primary" size={24} />
              <span>Comercios Destacados</span>
            </h2>
            <button className="text-accent font-medium flex items-center space-x-1 hover:underline">
              <span>Ver todos</span>
              <ChevronRight size={18} />
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : fetchError ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
              <p className="text-red-600 font-medium text-lg mb-2">⚠️ Error de conexión con Supabase</p>
              <p className="text-red-500 text-sm font-mono">{fetchError}</p>
              <p className="text-muted text-sm mt-4">Ejecuta <strong>supabase-rls-fixes.sql</strong> en el Editor SQL de Supabase y recarga la página.</p>
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="bg-surface border border-dashed border-muted/30 rounded-2xl p-12 text-center">
              <p className="text-muted font-medium text-lg mb-2">No hay comercios disponibles</p>
              <p className="text-muted/60 text-sm">Si acabas de configurar Supabase, ejecuta <strong>supabase-rls-fixes.sql</strong> en el SQL Editor para insertar los datos de prueba.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredBusinesses.map((biz) => (
                <div key={biz.id}>
                  <BusinessCard business={biz} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Promotions */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-gradient-to-br from-primary to-accent rounded-2xl p-8 text-dark relative overflow-hidden group cursor-pointer border border-surface shadow-lg">
            <div className="relative z-10">
              <Award className="mb-4" size={32} />
              <h3 className="text-2xl font-medium mb-2">Envío Gratis</h3>
              <p className="text-dark/70 mb-4">En tu primer pedido en locales seleccionados.</p>
              <span className="bg-dark/10 backdrop-blur-md px-4 py-2 rounded-2xl font-medium">Usar Cupón: HOLA50</span>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          </div>
          <div className="bg-gradient-to-br from-accent to-dark rounded-2xl p-8 text-white relative overflow-hidden group cursor-pointer border border-surface shadow-lg">
            <div className="relative z-10">
              <Clock className="mb-4" size={32} />
              <h3 className="text-2xl font-medium mb-2 text-primary">Happy Hour</h3>
              <p className="text-white/70 mb-4">2x1 en hamburguesas seleccionadas de 18:00 a 20:00.</p>
              <span className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl font-medium">Ver Locales</span>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};
