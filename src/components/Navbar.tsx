import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut, Store, Search, Menu as MenuIcon, X, Tag } from 'lucide-react';
import { useAuthStore, useCartStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationBell } from './NotificationBell';

import { supabase } from '../lib/supabase';

export const Navbar = () => {
  const { user, logout } = useAuthStore();
  const { items, total, removeItem, updateQuantity } = useCartStore();
  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/');
  };

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-surface/80 backdrop-blur-md border-b border-surface z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setIsMenuOpen(true)}
                className="md:hidden p-2 -ml-2 text-muted hover:text-accent transition-colors"
              >
                <MenuIcon size={24} />
              </button>
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-dark font-medium text-xl">
                  T
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm sm:text-lg font-medium text-accent uppercase tracking-tighter">
                    TENTACION
                  </span>
                  <span className="text-[8px] sm:text-[10px] font-medium text-muted uppercase tracking-widest -mt-1">
                    Food Store
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {(user?.role === 'admin' || user?.role === 'super_admin') && (
                <Link to="/admin" className="p-2 text-muted hover:text-accent transition-colors">
                  <Store size={24} />
                </Link>
              )}
              {user?.role === 'comercio' && (
                <Link to="/merchant" className="p-2 text-muted hover:text-accent transition-colors">
                  <Store size={24} />
                </Link>
              )}
              {user?.role === 'repartidor' && (
                <Link to="/delivery" className="p-2 text-muted hover:text-accent transition-colors">
                  <Store size={24} />
                </Link>
              )}
              
              <Link 
                to="/promotions" 
                className="hidden md:flex items-center space-x-1 px-3 py-2 text-muted hover:text-accent font-medium transition-colors"
              >
                <Tag size={20} />
                <span>Promociones</span>
              </Link>

              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-muted hover:text-accent transition-colors"
              >
                <ShoppingCart size={24} />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-primary text-dark text-[10px] font-medium w-5 h-5 flex items-center justify-center rounded-full border-2 border-surface">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Notification Bell — visible to logged-in users (not admin/comercio) */}
              {user && (user.role === 'user' || user.role === 'repartidor') && (
                <NotificationBell />
              )}

              {user ? (
                <div className="flex items-center space-x-2">
                  <Link to="/profile" className="p-2 text-muted hover:text-accent transition-colors">
                    <User size={24} />
                  </Link>
                  <button onClick={handleLogout} className="p-2 text-muted hover:text-red-600 transition-colors">
                    <LogOut size={24} />
                  </button>
                </div>
              ) : (
                <Link 
                  to="/login" 
                  className="bg-primary text-dark px-4 py-2 rounded-2xl font-medium hover:bg-accent transition-colors"
                >
                  Ingresar
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-full max-w-xs bg-surface shadow-2xl z-50 flex flex-col border-r border-surface"
            >
              <div className="p-6 border-b border-surface flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary rounded-2xl flex items-center justify-center text-dark font-medium text-lg">
                    T
                  </div>
                  <span className="text-lg font-medium text-accent uppercase tracking-tighter">
                    TENTACION
                  </span>
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-primary/10 rounded-2xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <Link 
                  to="/promotions" 
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-primary/10 text-dark font-medium transition-colors"
                >
                  <Tag size={24} className="text-primary" />
                  <span>Promociones</span>
                </Link>
                
                {(user?.role === 'admin' || user?.role === 'super_admin') && (
                  <Link 
                    to="/admin" 
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-primary/10 text-dark font-medium transition-colors"
                  >
                    <Store size={24} className="text-primary" />
                    <span>Panel Admin</span>
                  </Link>
                )}
                
                {user?.role === 'comercio' && (
                  <Link 
                    to="/merchant" 
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-primary/10 text-dark font-medium transition-colors"
                  >
                    <Store size={24} className="text-primary" />
                    <span>Panel Comercio</span>
                  </Link>
                )}

                {user?.role === 'repartidor' && (
                  <Link 
                    to="/delivery" 
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-primary/10 text-dark font-medium transition-colors"
                  >
                    <Store size={24} className="text-primary" />
                    <span>Panel Repartidor</span>
                  </Link>
                )}

                {!user && (
                  <Link 
                    to="/login" 
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center space-x-3 p-3 rounded-2xl bg-primary text-dark font-medium transition-colors"
                  >
                    <User size={24} />
                    <span>Ingresar</span>
                  </Link>
                )}

                {user && (
                  <button 
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center space-x-3 p-3 rounded-2xl hover:bg-red-500/10 text-red-600 font-medium transition-colors w-full text-left mt-4 border-t border-dark/5 pt-6"
                  >
                    <LogOut size={24} />
                    <span>Cerrar Sesión</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface shadow-2xl z-50 flex flex-col border-l border-surface"
            >
              <div className="p-6 border-b border-surface flex justify-between items-center">
                <h2 className="text-xl font-medium text-dark">Tu Carrito</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-primary/10 rounded-2xl transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted space-y-4">
                    <ShoppingCart size={64} strokeWidth={1} />
                    <p className="text-lg">Tu carrito está vacío</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="text-primary font-medium hover:underline"
                    >
                      Explorar comercios
                    </button>
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="flex space-x-4">
                      <img src={item.image} alt={item.name} className="w-20 h-20 rounded-2xl object-cover" />
                      <div className="flex-1">
                        <h3 className="font-medium text-dark">{item.name}</h3>
                        <p className="text-sm text-muted line-clamp-1">{item.description}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center space-x-3 bg-surface/50 rounded-2xl p-1">
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-6 h-6 flex items-center justify-center hover:bg-primary/10 rounded-xl transition-colors text-dark"
                            >
                              -
                            </button>
                            <span className="font-medium text-sm w-4 text-center text-dark">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center hover:bg-primary/10 rounded-xl transition-colors text-dark"
                            >
                              +
                            </button>
                          </div>
                          <span className="font-medium text-accent">${item.price * item.quantity}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {items.length > 0 && (
                <div className="p-6 border-t border-surface bg-surface/30">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-muted">Total</span>
                    <span className="text-2xl font-medium text-dark">${total()}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setIsCartOpen(false);
                      navigate('/checkout');
                    }}
                    className="w-full bg-primary text-dark py-4 rounded-2xl font-medium text-lg hover:bg-accent transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
                  >
                    Confirmar Pedido
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
