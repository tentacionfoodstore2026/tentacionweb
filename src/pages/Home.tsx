import React, { useEffect, useState } from 'react';
import { Search, ChevronRight, Zap, Award, Clock, MapPin } from 'lucide-react';
import { BusinessMap, MapBusiness } from '../components/BusinessMap';
import { BusinessCard } from '../components/BusinessCard';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Business, PromotionalBanner } from '../store/useStore';
import { isBusinessCurrentlyOpen } from '../lib/businessHours';
import { Footer } from '../components/Footer';

const CACHE_KEY = 'home_data_v1';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

function loadCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL) { sessionStorage.removeItem(CACHE_KEY); return null; }
    return parsed;
  } catch { return null; }
}

function saveCache(data: any) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, ts: Date.now() })); } catch {}
}

export const Home = () => {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [mapBusinesses, setMapBusinesses] = useState<MapBusiness[]>([]);
  const [categories, setCategories] = useState<string[]>(['Todos']);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      setBusinesses(cached.businesses);
      setBanners(cached.banners);
      setCategories(cached.categories);
      if (cached.mapBusinesses) setMapBusinesses(cached.mapBusinesses);
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setFetchError(null);
      try {
        const [bannersRes, bizRes] = await Promise.all([
          supabase
            .from('promotional_banners')
            .select('id,title,subtitle,image_url,duration_ms,sort_order,is_active,start_date,end_date')
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
          supabase
            .from('businesses')
            .select('id,name,description,category,image,banner,whatsapp,address,rating,delivery_fee,delivery_time,status,is_open,opening_hours,latitude,longitude')
            .neq('status', 'inactive'),
        ]);

        const bannerData = (!bannersRes.error && bannersRes.data) ? bannersRes.data as PromotionalBanner[] : [];
        setBanners(bannerData);

        if (bizRes.error) throw bizRes.error;

        const formatted: Business[] = (bizRes.data || []).map((b: any) => ({
          id: b.id,
          name: b.name || 'Sin nombre',
          description: b.description || '',
          category: b.category || 'Sin categoría',
          image: b.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
          banner: b.banner || '',
          whatsapp: b.whatsapp || '',
          address: b.address || '',
          rating: b.rating || 5.0,
          isOpen: isBusinessCurrentlyOpen(b.opening_hours, b.is_open),
          deliveryFee: b.delivery_fee || 0,
          deliveryTime: b.delivery_time || '30-45 min',
          status: b.status || 'active',
        }));

        const mapData: MapBusiness[] = (bizRes.data || [])
          .filter((b: any) => b.latitude && b.longitude)
          .map((b: any) => ({
            id: b.id,
            name: b.name || 'Sin nombre',
            image: b.image || '',
            latitude: Number(b.latitude),
            longitude: Number(b.longitude),
            address: b.address || '',
          }));
        setMapBusinesses(mapData);

        const cats = ['Todos', ...Array.from(new Set(formatted.map(b => b.category)))].filter(Boolean);

        setBusinesses(formatted);
        setCategories(cats);
        saveCache({ businesses: formatted, banners: bannerData, categories: cats, mapBusinesses: mapData });
      } catch (err: any) {
        setFetchError(err?.message || 'Error de conexión con Supabase');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const duration = banners[currentBannerIndex]?.duration_ms || 5000;
    const timer = setTimeout(() => setCurrentBannerIndex(p => (p + 1) % banners.length), duration);
    return () => clearTimeout(timer);
  }, [banners, currentBannerIndex]);

  const filteredBusinesses = businesses.filter(biz => {
    const matchCat = selectedCategory === 'Todos' || biz.category === selectedCategory;
    const matchSearch = biz.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      biz.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-surface pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

        {/* Hero */}
        {loading ? (
          <div className="w-full h-[300px] bg-accent/10 animate-pulse rounded-2xl mb-12 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : banners.length > 0 ? (
          <section className="relative rounded-2xl overflow-hidden bg-accent p-8 sm:p-12 mb-12 min-h-[300px]">
            <div className="absolute inset-0 z-0">
              <img
                key={`img-${currentBannerIndex}`}
                src={banners[currentBannerIndex].image_url}
                alt={banners[currentBannerIndex].title}
                loading="eager"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-accent/90 via-accent/50 to-transparent" />
            </div>
            <div className="relative z-10 max-w-2xl h-full flex flex-col justify-center">
              <motion.h1
                key={`title-${currentBannerIndex}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-4xl sm:text-5xl font-medium text-white mb-6 leading-tight drop-shadow-md"
              >
                {banners[currentBannerIndex].title} <br />
                <span className="text-primary">{banners[currentBannerIndex].subtitle}</span>
              </motion.h1>
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
                <input
                  type="text"
                  placeholder="¿Qué se te antoja hoy?"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-surface rounded-2xl py-4 pl-12 pr-4 text-dark placeholder-muted focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-xl border border-surface"
                />
              </div>
            </div>
          </section>
        ) : (
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
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-surface rounded-2xl py-4 pl-12 pr-4 text-dark placeholder-muted focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all shadow-xl border border-surface"
                />
              </div>
            </div>
          </section>
        )}

        {/* Categories */}
        <section className="mb-12 overflow-x-auto no-scrollbar">
          <div className="flex space-x-4 pb-2">
            {categories.map(cat => (
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

        {/* Businesses */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-surface rounded-2xl overflow-hidden border border-surface shadow-sm animate-pulse">
                  <div className="h-48 bg-accent/10" />
                  <div className="p-4 space-y-2">
                    <div className="h-5 bg-accent/10 rounded w-2/3" />
                    <div className="h-4 bg-accent/10 rounded w-full" />
                    <div className="h-4 bg-accent/10 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : fetchError ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
              <p className="text-red-600 font-medium text-lg mb-2">🔌 Error de conexión con Supabase</p>
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
              {filteredBusinesses.map(biz => (
                <div key={biz.id}>
                  <BusinessCard business={biz} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Promo banners */}
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

        {/* Map Section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <MapPin className="text-accent" size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-medium text-dark">Comercios en el mapa</h2>
              <p className="text-sm text-muted">Encuentra los locales cerca de ti</p>
            </div>
          </div>
          <BusinessMap businesses={mapBusinesses} />
        </section>

      </div>
      <Footer />
    </div>
  );
};
