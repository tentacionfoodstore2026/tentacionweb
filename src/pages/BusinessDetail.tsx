import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Clock, Truck, MapPin, ChevronLeft, ChevronRight, Info, Phone, Instagram, Facebook, Map as MapIcon, Music, Search, X } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Business, Product, ProductCategory } from '../store/useStore';
import { isBusinessCurrentlyOpen } from '../lib/businessHours';

export const BusinessDetail = () => {
  const [id] = useState(useParams().id);
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!business?.promoImages || business.promoImages.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % business.promoImages!.length);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [business?.promoImages]);

  useEffect(() => {
    const fetchBusinessAndProducts = async () => {
      if (!id) return;
      
      try {
        // Fetch Business
        const { data: bizData, error: bizError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', id)
          .single();
          
        if (bizError) throw bizError;
        
        if (bizData) {
          setBusiness({
            id: bizData.id,
            name: bizData.name,
            description: bizData.description,
            category: bizData.category,
            image: bizData.image,
            banner: bizData.banner,
            whatsapp: bizData.whatsapp,
            address: bizData.address,
            rating: bizData.rating,
            isOpen: isBusinessCurrentlyOpen(bizData.opening_hours, bizData.is_open),
            deliveryFee: bizData.delivery_fee,
            deliveryTime: bizData.delivery_time,
            status: bizData.status,
            openingHours: bizData.opening_hours || [],
            promoImages: bizData.promo_images || [],
            youtubeUrl: bizData.youtube_url || ''
          } as Business);
        }

        // Fetch Products
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select('*')
          .eq('business_id', id);
          
        if (prodError) throw prodError;
        
        if (prodData) {
          setProducts(prodData.map(p => ({
            ...p,
            businessId: p.business_id,
            categoryId: p.category_id,
            sizes: p.sizes || [],
            extras: p.extras || []
          })));
        }

        // Fetch Categories
        const { data: catData } = await supabase
          .from('product_categories')
          .select('*')
          .eq('business_id', id)
          .order('order_index');

        if (catData) {
          setCategories(catData.map(c => ({
            id: c.id,
            businessId: c.business_id,
            name: c.name,
            parentId: c.parent_id,
            orderIndex: c.order_index
          })));
        }
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessAndProducts();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!business) return <div>Negocio no encontrado</div>;

  const getYoutubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Filtrar productos según la búsqueda
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-surface pb-20">
      {/* Banner */}
      <div className="relative h-64 sm:h-80 w-full">
        <img 
          src={business.banner} 
          alt={business.name} 
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/fallbackbanner/1200/400'; }}
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Status Badge in Banner */}
        <div className="absolute top-20 right-4 sm:right-8">
          <div className={`px-4 py-2 rounded-2xl text-sm font-medium uppercase tracking-widest shadow-lg backdrop-blur-md border ${
            business.isOpen 
              ? 'bg-green-600 text-white border-green-600' 
              : 'bg-red-600 text-white border-red-700'
          }`}>
            {business.isOpen ? 'Abierto' : 'Cerrado'}
          </div>
        </div>

        <Link 
          to="/" 
          className="absolute top-20 left-4 sm:left-8 bg-surface/90 backdrop-blur-sm p-2 rounded-2xl shadow-lg hover:bg-surface transition-all border border-surface"
        >
          <ChevronLeft size={24} />
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        <div className="bg-surface rounded-2xl shadow-xl p-6 sm:p-8 mb-8 border border-surface">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center space-x-6">
              <img 
                src={business.image} 
                alt={business.name} 
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/fallback/800/600'; }}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-surface shadow-lg" 
              />
              <div>
                <h1 className="text-3xl font-medium text-dark mb-2">{business.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-muted">
                  <div className="flex items-center space-x-1 bg-primary/10 text-accent px-2 py-1 rounded-2xl">
                    <Star size={16} className="fill-accent" />
                    <span>{business.rating}</span>
                  </div>
                  <div className={`px-2 py-1 rounded-2xl text-[10px] font-medium uppercase tracking-wider ${
                    business.isOpen 
                      ? 'bg-green-600 text-white' 
                      : 'bg-red-600 text-white'
                  }`}>
                    {business.isOpen ? 'Abierto' : 'Cerrado'}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock size={16} />
                    <span>{business.deliveryTime}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Truck size={16} />
                    <span>${business.deliveryFee} envío</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin size={16} />
                    <span>{business.address}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-surface p-4 rounded-2xl">
              <Info size={20} className="text-muted" />
              <p className="text-sm text-muted">{business.description}</p>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          {/* Menu Columns (70%) */}
          <div className="lg:col-span-7 space-y-12">
            {/* Promo Images Carousel */}
            {business.promoImages && business.promoImages.length > 0 && (
              <div className="relative h-48 sm:h-64 rounded-2xl overflow-hidden shadow-lg group">
                <img 
                  src={business.promoImages[currentBannerIndex]} 
                  alt="Promoción" 
                  className="w-full h-full object-cover transition-opacity duration-500"
                />
                
                {business.promoImages.length > 1 && (
                  <>
                    <button 
                      onClick={() => setCurrentBannerIndex((prev) => (prev - 1 + business.promoImages!.length) % business.promoImages!.length)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button 
                      onClick={() => setCurrentBannerIndex((prev) => (prev + 1) % business.promoImages!.length)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight size={24} />
                    </button>
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                      {business.promoImages.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentBannerIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${currentBannerIndex === idx ? 'bg-primary w-4' : 'bg-white/60 hover:bg-white'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Categories & Products */}
            <div className="lg:col-span-12">
              <div className="sticky top-20 z-20 bg-surface/80 backdrop-blur-md py-4 -mx-4 px-4 sm:mx-0 sm:px-0 space-y-4">
                {/* Horizontal Sliding Categories */}
                <div className="flex items-center space-x-4 overflow-x-auto pb-2 scrollbar-hide">
                  {categories.filter(c => !c.parentId).map((category) => {
                    const hasProducts = filteredProducts.some(p => 
                      p.categoryId === category.id || 
                      categories.filter(c => c.parentId === category.id).some(sub => p.categoryId === sub.id)
                    );
                    if (searchQuery && !hasProducts) return null;

                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          const element = document.getElementById(category.id);
                          if (element) {
                            window.scrollTo({
                              top: element.getBoundingClientRect().top + window.pageYOffset - 100,
                              behavior: 'smooth'
                            });
                          }
                        }}
                        className="whitespace-nowrap px-6 py-2 rounded-2xl bg-surface border-2 border-primary text-accent font-medium hover:bg-primary hover:text-dark transition-all shadow-sm"
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </div>

                {/* Buscador */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-muted" />
                  </div>
                  <input
                    type="text"
                    placeholder="¿Qué te apetece hoy? Busca platos, bebidas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-12 pr-10 py-3 bg-white border border-dark/10 rounded-2xl text-dark placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted hover:text-dark transition-colors"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-12">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dark/5 shadow-sm space-y-3">
                    <p className="text-lg text-muted font-medium">No se encontraron productos que coincidan con tu búsqueda</p>
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="px-4 py-2 bg-primary text-dark font-medium rounded-xl hover:bg-primary/90 transition-all text-sm"
                    >
                      Limpiar búsqueda
                    </button>
                  </div>
                ) : (
                  categories.filter(c => !c.parentId).map((rootCategory) => {
                    const subCats = categories.filter(c => c.parentId === rootCategory.id);
                    const rootProducts = filteredProducts.filter(p => p.categoryId === rootCategory.id);
                    const hasSubProducts = subCats.some(sub => filteredProducts.some(p => p.categoryId === sub.id));
                    
                    if (rootProducts.length === 0 && !hasSubProducts) return null;
                    
                    return (
                      <section key={rootCategory.id} id={rootCategory.id} className="scroll-mt-32">
                        <h2 className="text-3xl font-medium text-dark mb-8 flex items-center space-x-4">
                          <span className="w-2 h-10 bg-primary rounded-full shadow-lg shadow-primary/40" />
                          <span>{rootCategory.name}</span>
                        </h2>

                        {/* Products in Root Category */}
                        {rootProducts.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {rootProducts.map((product) => (
                              <ProductCard key={product.id} product={product} />
                            ))}
                          </div>
                        )}

                        {/* Subcategories */}
                        {subCats.map(sub => {
                          const subProducts = filteredProducts.filter(p => p.categoryId === sub.id);
                          if (subProducts.length === 0) return null;
                          return (
                            <div key={sub.id} className="ml-4 mb-10 border-l-2 border-surface pl-6">
                              <h3 className="text-xl font-medium text-muted mb-6 flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-accent/30 rounded-full" />
                                {sub.name}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {subProducts.map((product) => (
                                  <ProductCard key={product.id} product={product} />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </section>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Info Sidebar (30%) */}
          <div className="lg:col-span-3 space-y-8">
            {/* Offers/Promotions */}
            <div className="bg-primary rounded-2xl p-6 text-dark shadow-lg shadow-primary/20">
              <h3 className="text-xl font-medium mb-2 uppercase tracking-tight">Oferta Especial</h3>
              <p className="text-dark/80 font-medium mb-4">20% de descuento en tu primer pedido usando el código: <span className="font-medium text-dark">NUEVO20</span></p>
              <div className="bg-dark/10 rounded-2xl p-3 text-center font-medium border border-dark/20">
                Válido hasta el 31/03
              </div>
            </div>

            {/* YouTube Video */}
            {business.youtubeUrl && getYoutubeVideoId(business.youtubeUrl) && (
              <div className="bg-surface rounded-2xl p-6 shadow-sm border border-surface space-y-4">
                <h3 className="text-lg font-medium text-dark border-b border-surface pb-4">Conoce nuestro local</h3>
                <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-inner">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${getYoutubeVideoId(business.youtubeUrl)}`} 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="bg-surface rounded-2xl p-6 shadow-sm border border-surface space-y-6">
              <h3 className="text-lg font-medium text-dark border-b border-surface pb-4">Información de Contacto</h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="text-primary shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-medium text-dark">Dirección</p>
                    <p className="text-sm text-muted">{business.address}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Phone className="text-primary shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-medium text-dark">Teléfono / WhatsApp</p>
                    <p className="text-sm text-muted">+{business.whatsapp}</p>
                  </div>
                </div>
              </div>

              {business.openingHours && (
                <div className="pt-4 border-t border-surface">
                  <p className="text-sm font-medium text-dark mb-3 flex items-center">
                    <Clock size={16} className="mr-2 text-primary" />
                    Horarios de Atención
                  </p>
                  <div className="space-y-1">
                    {business.openingHours.map((hour, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-muted font-medium">{hour.day}</span>
                        <span className={`font-medium ${hour.closed ? 'text-red-400' : 'text-dark'}`}>
                          {hour.closed ? 'Cerrado' : `${hour.open} - ${hour.close}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-surface">
                <p className="text-sm font-medium text-dark mb-3">Redes Sociales</p>
                <div className="flex space-x-4">
                  {business.instagram && (
                    <a 
                      href={`https://instagram.com/${business.instagram.replace('@', '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-surface rounded-2xl text-muted hover:text-accent hover:bg-primary/10 transition-all"
                    >
                      <Instagram size={20} />
                    </a>
                  )}
                  {business.facebook && (
                    <a 
                      href={business.facebook.startsWith('http') ? business.facebook : `https://${business.facebook}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-surface rounded-2xl text-muted hover:text-accent hover:bg-primary/10 transition-all"
                    >
                      <Facebook size={20} />
                    </a>
                  )}
                  {business.tiktokUrl && (
                    <a 
                      href={business.tiktokUrl.startsWith('http') ? business.tiktokUrl : `https://${business.tiktokUrl}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-surface rounded-2xl text-muted hover:text-accent hover:bg-primary/10 transition-all"
                    >
                      <Music size={20} />
                    </a>
                  )}
                  {business.website && (
                    <a 
                      href={business.website.startsWith('http') ? business.website : `https://${business.website}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-surface rounded-2xl text-muted hover:text-accent hover:bg-primary/10 transition-all"
                    >
                      <MapIcon size={20} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Map */}
            <div className="bg-surface rounded-2xl p-6 shadow-sm border border-surface">
              <h3 className="text-lg font-medium text-dark mb-4">Ubicación</h3>
              <div className="aspect-square bg-surface rounded-2xl overflow-hidden border border-surface relative">
                {business.address ? (
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(business.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                    className="absolute inset-0"
                  ></iframe>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted space-y-2 border-2 border-dashed border-surface">
                    <MapIcon size={40} />
                    <p className="text-xs font-medium uppercase tracking-widest">Dirección no disponible</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
