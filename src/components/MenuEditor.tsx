import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ChevronRight, ChevronDown, Save, X, Image as ImageIcon, PlusCircle, MinusCircle, GripVertical, ImagePlus, Pizza } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Business, Product, ProductCategory, ProductSize, ProductExtraGroup, ProductExtra } from '../store/useStore';
import { ImageUpload } from './ImageUpload';
import { uploadImageToStorage } from '../lib/uploadImage';

interface MenuEditorProps {
  businessId: string;
  businessName: string;
  onClose: () => void;
}

export const MenuEditor: React.FC<MenuEditorProps> = ({ businessId, businessName, onClose }) => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  
  // UI States
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<ProductCategory> | null>(null);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchMenuData();
  }, [businessId]);

  const fetchMenuData = async () => {
    setLoading(true);
    try {
      // Fetch categories
      const { data: catData } = await supabase
        .from('product_categories')
        .select('*')
        .eq('business_id', businessId)
        .order('order_index');

      if (catData) {
        setCategories(catData.map(c => ({
          id: c.id,
          businessId: c.business_id,
          name: c.name,
          parentId: c.parent_id,
          orderIndex: c.order_index
        })));
        if (catData.length > 0 && !activeCategoryId) {
          setActiveCategoryId(catData[0].id);
        }
      }

      // Fetch products
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId);

      if (prodData) {
        setProducts(prodData.map(p => ({
          ...p,
          businessId: p.business_id,
          categoryId: p.category_id,
          sizes: p.sizes || [],
          extras: p.extras || []
        })));
      }
    } catch (error) {
      console.error('Error fetching menu data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCategory?.name) return;

    setIsSaving(true);
    try {
      const catData = {
        business_id: businessId,
        name: currentCategory.name,
        parent_id: currentCategory.parentId || null,
        order_index: currentCategory.orderIndex || 0
      };

      let result;
      if (currentCategory.id) {
        result = await supabase.from('product_categories').update(catData).eq('id', currentCategory.id);
      } else {
        result = await supabase.from('product_categories').insert(catData);
      }
      
      if (result.error) throw result.error;
      
      await fetchMenuData();
      setIsEditingCategory(false);
      setCurrentCategory(null);
    } catch (error: any) {
      console.error('Error saving category:', error);
      alert(`Error al guardar: ${error.message || 'Error técnico'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('¿Estás seguro? Se eliminarán también las subcategorías vinculadas.')) return;
    try {
      const { error } = await supabase.from('product_categories').delete().eq('id', id);
      if (error) throw error;
      await fetchMenuData();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      alert(`Error al eliminar categoría: ${error.message}`);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (currentProduct) {
          setCurrentProduct({ ...currentProduct, image: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct?.name || !currentProduct?.price) return;

    setIsSaving(true);
    try {
      let imageUrl = currentProduct.image || '';
      if (imageUrl.startsWith('data:image')) {
        imageUrl = await uploadImageToStorage(imageUrl, 'images');
      }

      const prodData = {
        business_id: businessId,
        category_id: currentProduct.categoryId || activeCategoryId,
        name: currentProduct.name,
        description: currentProduct.description || '',
        price: Number(currentProduct.price),
        image: imageUrl,
        available: currentProduct.available ?? true,
        sizes: currentProduct.sizes || [],
        extras: currentProduct.extras || []
      };

      if (currentProduct.id) {
        await supabase.from('products').update(prodData).eq('id', currentProduct.id);
      } else {
        await supabase.from('products').insert(prodData);
      }

      await fetchMenuData();
      setIsEditingProduct(false);
      setCurrentProduct(null);
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(`Error al guardar plato: ${error.message || 'Verifica que la categoría existe'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('¿Eliminar este plato?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      await fetchMenuData();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert(`Error al eliminar plato: ${error.message}`);
    }
  };

  const addSize = () => {
    if (!currentProduct) return;
    const sizes = [...(currentProduct.sizes || [])];
    sizes.push({ name: '', price: 0 });
    setCurrentProduct({ ...currentProduct, sizes });
  };

  const removeSize = (index: number) => {
    if (!currentProduct || !currentProduct.sizes) return;
    const sizes = currentProduct.sizes.filter((_, i) => i !== index);
    setCurrentProduct({ ...currentProduct, sizes });
  };

  const addExtraGroup = () => {
    if (!currentProduct) return;
    const extras = [...(currentProduct.extras || [])];
    extras.push({ 
      id: Date.now().toString(), 
      name: '', 
      min: 0, 
      max: 1, 
      options: [] 
    });
    setCurrentProduct({ ...currentProduct, extras });
  };

  const removeExtraGroup = (index: number) => {
    if (!currentProduct || !currentProduct.extras) return;
    const extras = currentProduct.extras.filter((_, i) => i !== index);
    setCurrentProduct({ ...currentProduct, extras });
  };

  const addExtraOption = (groupIndex: number) => {
    if (!currentProduct || !currentProduct.extras) return;
    const extras = [...currentProduct.extras];
    if (!extras[groupIndex].options) extras[groupIndex].options = [];
    extras[groupIndex].options.push({
      id: Date.now().toString(),
      name: '',
      price: 0,
      available: true
    });
    setCurrentProduct({ ...currentProduct, extras });
  };

  const removeExtraOption = (groupIndex: number, optionIndex: number) => {
    if (!currentProduct || !currentProduct.extras) return;
    const extras = [...currentProduct.extras];
    extras[groupIndex].options = extras[groupIndex].options.filter((_, i) => i !== optionIndex);
    setCurrentProduct({ ...currentProduct, extras });
  };

  const rootCategories = categories.filter(c => !c.parentId);
  const subCategories = (parentId: string) => categories.filter(c => c.parentId === parentId);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-surface/50"
      >
        {/* Header */}
        <div className="p-8 border-b border-surface flex items-center justify-between bg-surface/50 backdrop-blur-xl shrink-0">
          <div>
            <h3 className="text-3xl font-medium text-dark flex items-center gap-3">
              Gestión de Menú
              <span className="text-sm font-medium text-muted bg-primary/10 px-3 py-1 rounded-2xl">{businessName}</span>
            </h3>
            <p className="text-muted mt-1 font-medium">Configura tus categorías, platos, tamaños y extras.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-surface rounded-2xl transition-all text-muted hover:text-dark border border-surface"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Categories Sidebar */}
          <div className="w-80 border-r border-surface flex flex-col bg-surface/30">
            <div className="p-6 flex items-center justify-between shrink-0">
              <h4 className="font-medium text-dark uppercase tracking-widest text-xs">Categorías</h4>
              <button 
                onClick={() => {
                  setCurrentCategory({ businessId, name: '', orderIndex: categories.length });
                  setIsEditingCategory(true);
                }}
                className="p-2 bg-primary/20 text-accent rounded-xl hover:bg-primary/30 transition-all"
              >
                <Plus size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                rootCategories.map(cat => (
                  <div key={cat.id} className="space-y-1">
                    <div 
                      className={`group flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer ${
                        activeCategoryId === cat.id ? 'bg-primary text-dark shadow-lg shadow-primary/20' : 'hover:bg-surface text-muted hover:text-dark'
                      }`}
                      onClick={() => setActiveCategoryId(cat.id)}
                    >
                      <div className="flex items-center gap-3 font-medium">
                        <ChevronRight size={16} className={activeCategoryId === cat.id ? 'rotate-90 transition-transform' : ''} />
                        <span>{cat.name}</span>
                      </div>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentCategory(cat);
                            setIsEditingCategory(true);
                          }}
                          className="p-1.5 hover:bg-white/20 rounded-lg"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(cat.id);
                          }}
                          className="p-1.5 hover:bg-red-500/20 text-red-500 rounded-lg"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    {/* Subcategories (simplified for now) */}
                    {subCategories(cat.id).map(sub => (
                      <div 
                        key={sub.id}
                        className={`ml-6 group flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                          activeCategoryId === sub.id ? 'bg-primary/20 text-accent' : 'hover:bg-surface text-muted/60 hover:text-dark'
                        }`}
                        onClick={() => setActiveCategoryId(sub.id)}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <MinusCircle size={12} />
                          <span>{sub.name}</span>
                        </div>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentCategory(sub);
                              setIsEditingCategory(true);
                            }}
                            className="p-1"
                          >
                            <Edit2 size={10} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(sub.id);
                            }}
                            className="p-1 text-red-500"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        setCurrentCategory({ businessId, parentId: cat.id, name: '', orderIndex: 0 });
                        setIsEditingCategory(true);
                      }}
                      className="ml-8 py-1 px-2 text-[10px] font-medium text-muted hover:text-accent flex items-center gap-1 uppercase tracking-tighter"
                    >
                      <Plus size={10} /> Añadir Subcategoría
                    </button>
                  </div>
                ))
              )}
              {!loading && rootCategories.length === 0 && (
                <div className="p-10 text-center space-y-4">
                   <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mx-auto border-2 border-dashed border-surface">
                      <PlusCircle className="text-muted/20" size={24} />
                   </div>
                   <p className="text-xs font-medium text-muted uppercase tracking-tighter">Empieza creando una categoría</p>
                </div>
              )}
            </div>
          </div>

          {/* Products Table/Grid */}
          <div className="flex-1 bg-surface/10 overflow-hidden flex flex-col">
            <div className="p-8 border-b border-surface flex items-center justify-between shrink-0">
              <h4 className="text-xl font-medium text-dark flex items-center gap-3">
                {categories.find(c => c.id === activeCategoryId)?.name || 'Selecciona una categoría'}
                <span className="text-xs font-medium text-muted bg-surface px-2 py-1 rounded-lg border border-surface">
                  {products.filter(p => p.categoryId === activeCategoryId).length} platos
                </span>
              </h4>
              <button 
                onClick={() => {
                  setCurrentProduct({ 
                    businessId, 
                    categoryId: activeCategoryId || undefined, 
                    available: true,
                    sizes: [],
                    extras: [],
                    price: 0
                  });
                  setIsEditingProduct(true);
                }}
                disabled={!activeCategoryId}
                className="bg-primary text-dark px-6 py-3 rounded-2xl font-medium flex items-center space-x-2 hover:bg-accent transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                <Plus size={20} />
                <span>Agregar Plato</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {products.filter(p => p.categoryId === activeCategoryId).map(product => (
                  <div key={product.id} className="bg-surface rounded-3xl border border-surface shadow-sm p-4 flex gap-4 group hover:shadow-xl hover:border-primary/30 transition-all">
                    <img 
                      src={product.image || 'https://picsum.photos/seed/food/200/200'} 
                      alt={product.name}
                      className="w-24 h-24 rounded-2xl object-cover shrink-0"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-medium text-dark text-lg">{product.name}</h5>
                          <p className="text-sm text-muted line-clamp-2">{product.description}</p>
                        </div>
                        <span className="font-medium text-accent font-mono">
                          ${product.price}
                        </span>
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between pt-4 border-t border-surface">
                        <div className="flex gap-2">
                          {product.sizes && product.sizes.length > 0 && (
                            <span className="text-[10px] font-medium text-muted bg-surface px-2 py-1 rounded-md border border-surface">
                              {product.sizes.length} Tamaños
                            </span>
                          )}
                          {product.extras && product.extras.length > 0 && (
                            <span className="text-[10px] font-medium text-muted bg-surface px-2 py-1 rounded-md border border-surface">
                              {product.extras.length} Grupos Extras
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setCurrentProduct(product);
                              setIsEditingProduct(true);
                            }}
                            className="p-2 hover:bg-primary/10 text-muted hover:text-accent rounded-xl transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {products.filter(p => p.categoryId === activeCategoryId).length === 0 && (
                  <div className="col-span-full py-20 text-center">
                    <div className="w-20 h-20 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-4 border border-surface shadow-inner">
                      <ImageIcon className="text-muted/30" size={32} />
                    </div>
                    <p className="text-muted font-medium">No hay platos en esta categoría.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MODALS */}
        <AnimatePresence>
          {/* Category Modal */}
          {isEditingCategory && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setIsEditingCategory(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative bg-surface rounded-2xl p-8 w-full max-w-md shadow-2xl border border-surface"
              >
                <h3 className="text-2xl font-medium text-dark mb-6">
                  {currentCategory?.id ? 'Editar Categoría' : 'Nueva Categoría'}
                </h3>
                <form onSubmit={handleSaveCategory} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-muted mb-2 uppercase tracking-widest">Nombre</label>
                    <input 
                      type="text"
                      autoFocus
                      required
                      value={currentCategory?.name || ''}
                      onChange={(e) => setCurrentCategory({ ...currentCategory, name: e.target.value })}
                      className="w-full bg-surface border border-surface rounded-2xl px-5 py-4 text-dark font-medium focus:outline-none focus:ring-4 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setIsEditingCategory(false)}
                      className="flex-1 py-4 font-medium text-muted hover:text-dark transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 bg-primary text-dark py-4 rounded-2xl font-medium shadow-lg shadow-primary/20 hover:bg-accent transition-all disabled:opacity-50"
                    >
                      {isSaving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {isEditingProduct && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-md"
                onClick={() => setIsEditingProduct(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
              >
                {/* Header Superior Fijo */}
                <div className="px-10 py-6 border-b border-surface flex items-center justify-between bg-white z-10 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                      <Pizza size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-dark tracking-tighter uppercase whitespace-nowrap">
                        {currentProduct?.id ? 'Editar Plato' : 'Nuevo Plato'}
                      </h3>
                      <p className="text-[10px] font-medium text-muted uppercase tracking-[0.2em] opacity-60">Configura tu menú premium</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsEditingProduct(false)}
                    className="w-12 h-12 flex items-center justify-center hover:bg-surface rounded-2xl transition-colors text-muted"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Cuerpo del Formulario con Rejilla de 2 Columnas */}
                <div className="flex-1 overflow-y-auto bg-surface/30 p-10">
                  <form id="productForm" onSubmit={handleSaveProduct} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    
                    {/* Columna 1: Información Básica (5 de 12 col) */}
                    <div className="lg:col-span-5 space-y-8">
                      {/* Subir Imagen */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-surface/50">
                        <label className="block text-[10px] font-semibold text-muted mb-4 uppercase tracking-[0.2em]">Fotografía del Plato</label>
                        <div className="relative group aspect-square">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageChange}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          <div className="w-full h-full rounded-3xl bg-surface border-2 border-dashed border-muted/20 flex flex-col items-center justify-center overflow-hidden group-hover:border-accent/50 transition-all">
                            {currentProduct?.image ? (
                              <img src={currentProduct.image} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Preview" />
                            ) : (
                              <div className="text-center p-8">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-surface">
                                  <ImagePlus className="text-accent" size={32} />
                                </div>
                                <p className="text-[11px] font-semibold text-dark uppercase tracking-widest">Añadir Foto</p>
                                <p className="text-[9px] font-medium text-muted mt-1 uppercase">Resolución recomendada 800x800px</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Info General */}
                      <div className="bg-white p-8 rounded-2xl shadow-sm border border-surface/50 space-y-6">
                        <div>
                          <label className="block text-[10px] font-semibold text-muted mb-3 uppercase tracking-[0.2em]">Nombre del Plato</label>
                          <input 
                            type="text"
                            required
                            placeholder="P. ej. Burger Triple Queso"
                            value={currentProduct?.name || ''}
                            onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                            className="w-full bg-surface border-none rounded-2xl px-6 py-4 text-base font-medium placeholder:text-muted/40 focus:ring-4 focus:ring-accent/10 transition-all uppercase tracking-tight"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-semibold text-muted mb-3 uppercase tracking-[0.2em]">Precio Base</label>
                            <div className="relative">
                              <span className="absolute left-6 top-1/2 -translate-y-1/2 font-semibold text-muted">$</span>
                              <input 
                                type="number"
                                required
                                value={currentProduct?.price || ''}
                                onChange={(e) => setCurrentProduct({ ...currentProduct, price: Number(e.target.value) })}
                                className="w-full bg-surface border-none rounded-2xl pl-10 pr-6 py-4 text-base font-semibold focus:ring-4 focus:ring-accent/10 transition-all"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-muted mb-3 uppercase tracking-[0.2em]">Estado</label>
                            <select 
                              value={currentProduct?.available ? 'true' : 'false'}
                              onChange={(e) => setCurrentProduct({ ...currentProduct, available: e.target.value === 'true' })}
                              className="w-full bg-surface border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-accent/10 appearance-none"
                            >
                              <option value="true">🟢 Disponible</option>
                              <option value="false">🔴 Agotado</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-muted mb-3 uppercase tracking-[0.2em]">Descripción</label>
                          <textarea 
                            rows={3}
                            placeholder="Describe los ingredientes, alérgenos o el sabor..."
                            value={currentProduct?.description || ''}
                            onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                            className="w-full bg-surface border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-accent/10 resize-none transition-all placeholder:text-muted/30"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Columna 2: Tamaños y Extras (7 de 12 col) */}
                    <div className="lg:col-span-7 space-y-8">
                      
                      {/* Sección Tamaños */}
                      <div className="bg-white p-8 rounded-2xl shadow-sm border border-surface/50">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <label className="block text-[10px] font-semibold text-muted uppercase tracking-[0.2em]">Tamaños / Porciones</label>
                            <p className="text-[9px] font-medium text-muted/60 mt-1 uppercase italic">Si no hay tamaños, se usará el precio base</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              if (!currentProduct) return;
                              const sizes = [...(currentProduct.sizes || [])];
                              sizes.push({ name: '', price: 0 });
                              setCurrentProduct({ ...currentProduct, sizes });
                            }}
                            className="h-10 px-5 bg-dark text-white rounded-xl text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2 hover:bg-accent hover:text-dark transition-all shadow-md active:scale-95"
                          >
                            <Plus size={14} /> Añadir
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          {(currentProduct?.sizes || []).map((size, index) => (
                            <motion.div 
                              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                              key={index} className="flex gap-3 items-center group"
                            >
                              <div className="flex-1 relative">
                                <input 
                                  placeholder="Nombre (ej: Familiar, 12 piezas)"
                                  value={size.name}
                                  onChange={(e) => {
                                    if (!currentProduct || !currentProduct.sizes) return;
                                    const sizes = [...currentProduct.sizes];
                                    sizes[index].name = e.target.value;
                                    setCurrentProduct({ ...currentProduct, sizes });
                                  }}
                                  className="w-full bg-surface border-none rounded-2xl px-5 py-3 text-xs font-medium uppercase tracking-tight"
                                />
                              </div>
                              <div className="w-28 relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-muted/50 text-[10px]">$</span>
                                <input 
                                  type="number"
                                  placeholder="Precio"
                                  value={size.price}
                                  onChange={(e) => {
                                    if (!currentProduct || !currentProduct.sizes) return;
                                    const sizes = [...currentProduct.sizes];
                                    sizes[index].price = Number(e.target.value);
                                    setCurrentProduct({ ...currentProduct, sizes });
                                  }}
                                  className="w-full bg-surface border-none rounded-2xl pl-8 pr-4 py-3 text-xs font-semibold"
                                />
                              </div>
                              <button 
                                type="button"
                                onClick={() => {
                                  if (!currentProduct || !currentProduct.sizes) return;
                                  const sizes = currentProduct.sizes.filter((_, i) => i !== index);
                                  setCurrentProduct({ ...currentProduct, sizes });
                                }}
                                className="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 rounded-2xl transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </motion.div>
                          ))}
                          {(!currentProduct?.sizes || currentProduct.sizes.length === 0) && (
                            <div className="py-6 text-center border-2 border-dashed border-surface rounded-2xl">
                              <p className="text-[10px] font-medium text-muted uppercase tracking-widest opacity-40">No se han definido tamaños</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sección Extras */}
                      <div className="bg-white p-8 rounded-2xl shadow-sm border border-surface/50">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <label className="block text-[10px] font-semibold text-muted uppercase tracking-[0.2em]">Opciones Adicionales</label>
                            <p className="text-[9px] font-medium text-muted/60 mt-1 uppercase italic">Grupos de personalización para el cliente</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                                if (!currentProduct) return;
                                const extras = [...(currentProduct.extras || [])];
                                extras.push({ id: Date.now().toString(), name: '', min: 0, max: 1, options: [] });
                                setCurrentProduct({ ...currentProduct, extras });
                            }}
                            className="h-10 px-5 bg-dark text-white rounded-xl text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2 hover:bg-accent hover:text-dark transition-all shadow-md active:scale-95"
                          >
                            <Plus size={14} /> Crear Grupo
                          </button>
                        </div>

                        <div className="space-y-6">
                          {(currentProduct?.extras || []).map((group, gIdx) => (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                              key={group.id} className="bg-surface/50 p-6 rounded-3xl border border-surface/50 relative"
                            >
                              <div className="flex flex-col sm:flex-row gap-4 mb-5">
                                <div className="flex-1">
                                  <input 
                                    type="text"
                                    placeholder="Nombre del grupo (ej: Elige tu salsa)"
                                    value={group.name}
                                    onChange={(e) => {
                                      if (!currentProduct || !currentProduct.extras) return;
                                      const extras = [...currentProduct.extras];
                                      extras[gIdx].name = e.target.value;
                                      setCurrentProduct({ ...currentProduct, extras });
                                    }}
                                    className="w-full bg-white border-none rounded-2xl px-5 py-3 text-[11px] font-semibold uppercase tracking-tight shadow-sm"
                                  />
                                </div>
                                <div className="flex items-center gap-3 bg-white px-4 rounded-2xl shadow-sm shrink-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-semibold text-muted uppercase">Min</span>
                                    <input type="number" className="w-8 text-[10px] font-semibold text-accent outline-none" value={group.min} onChange={(e) => {
                                      if (!currentProduct || !currentProduct.extras) return;
                                      const extras = [...currentProduct.extras];
                                      extras[gIdx].min = Number(e.target.value);
                                      setCurrentProduct({ ...currentProduct, extras });
                                    }} />
                                  </div>
                                  <div className="w-px h-4 bg-surface" />
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-semibold text-muted uppercase">Max</span>
                                    <input type="number" className="w-8 text-[10px] font-semibold text-accent outline-none" value={group.max} onChange={(e) => {
                                      if (!currentProduct || !currentProduct.extras) return;
                                      const extras = [...currentProduct.extras];
                                      extras[gIdx].max = Number(e.target.value);
                                      setCurrentProduct({ ...currentProduct, extras });
                                    }} />
                                  </div>
                                </div>
                                <button onClick={() => {
                                  if (!currentProduct || !currentProduct.extras) return;
                                  const extras = currentProduct.extras.filter((_, i) => i !== gIdx);
                                  setCurrentProduct({ ...currentProduct, extras });
                                }} className="p-2 text-red-400 hover:text-red-600 transition-colors">
                                  <Trash2 size={18} />
                                </button>
                              </div>
                              
                              <div className="space-y-2">
                                {(group.options || []).map((opt, oIdx) => (
                                  <div key={opt.id} className="flex gap-2 items-center pl-4 border-l-2 border-accent/20">
                                    <input 
                                      placeholder="Pimiento, Extra Queso..."
                                      value={opt.name}
                                      onChange={(e) => {
                                        if (!currentProduct || !currentProduct.extras) return;
                                        const extras = [...currentProduct.extras];
                                        extras[gIdx].options[oIdx].name = e.target.value;
                                        setCurrentProduct({ ...currentProduct, extras });
                                      }}
                                      className="flex-1 bg-white/60 border-none rounded-xl px-4 py-2 text-[10px] font-medium"
                                    />
                                    <div className="w-20 relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[8px] font-medium">+$</span>
                                      <input 
                                        type="number"
                                        placeholder="0"
                                        value={opt.price}
                                        onChange={(e) => {
                                          if (!currentProduct || !currentProduct.extras) return;
                                          const extras = [...currentProduct.extras];
                                          extras[gIdx].options[oIdx].price = Number(e.target.value);
                                          setCurrentProduct({ ...currentProduct, extras });
                                        }}
                                        className="w-full bg-white/60 border-none rounded-xl pl-7 pr-3 py-2 text-[10px] font-semibold"
                                      />
                                    </div>
                                    <button onClick={() => {
                                      if (!currentProduct || !currentProduct.extras) return;
                                      const extras = [...currentProduct.extras];
                                      extras[gIdx].options = extras[gIdx].options.filter((_, i) => i !== oIdx);
                                      setCurrentProduct({ ...currentProduct, extras });
                                    }} className="p-2 text-muted/30 hover:text-red-400">
                                      <X size={14} />
                                    </button>
                                  </div>
                                ))}
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    if (!currentProduct || !currentProduct.extras) return;
                                    const extras = [...currentProduct.extras];
                                    if (!extras[gIdx].options) extras[gIdx].options = [];
                                    extras[gIdx].options.push({ id: Date.now().toString(), name: '', price: 0, available: true });
                                    setCurrentProduct({ ...currentProduct, extras });
                                  }}
                                  className="text-[9px] font-semibold text-accent flex items-center gap-2 pl-4 py-2 hover:opacity-60 uppercase tracking-widest mt-2"
                                >
                                  <PlusCircle size={14} /> Añadir Opción
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Footer Inferior Fijo */}
                <div className="px-10 py-6 border-t border-surface bg-gray-50 flex items-center justify-between shrink-0">
                  <p className="text-[9px] font-medium text-muted uppercase tracking-widest opacity-40">LOS CAMBIOS SE GUARDARÁN AL INSTANTE EN LA NUBE</p>
                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setIsEditingProduct(false)}
                      className="px-8 py-4 font-semibold text-muted hover:text-dark transition-all uppercase text-[10px] tracking-widest"
                    >
                      Descartar
                    </button>
                    <button 
                      form="productForm"
                      type="submit"
                      disabled={isSaving}
                      className="px-12 py-4 bg-accent text-dark rounded-[1.25rem] font-semibold shadow-[0_10px_30px_-5px_rgba(255,191,0,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3 uppercase text-[10px] tracking-widest"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-dark border-r-transparent"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          <span>Finalizar y Guardar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
