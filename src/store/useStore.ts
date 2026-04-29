import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'user' | 'comercio' | 'repartidor' | 'admin' | 'super_admin';

export interface ClaimedPromotion {
  promoId: string;
  code: string;
  used: boolean;
  usedAt?: string;
}

export interface LoyaltyCard {
  points: number;
  expiresAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  businessId?: string; // For merchants
  claimedPromotions: ClaimedPromotion[]; // IDs of claimed promotions
  loyaltyCard?: LoyaltyCard;
  status?: 'active' | 'inactive';
}

export interface OpeningHours {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

export interface Business {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string;
  banner: string;
  whatsapp: string;
  address: string;
  rating: number;
  isOpen: boolean;
  deliveryFee: number;
  deliveryTime: string;
  status: 'pending' | 'active' | 'inactive';
  openingHours?: OpeningHours[];
  instagram?: string;
  facebook?: string;
  website?: string;
}

export interface ProductSize {
  name: string;
  price: number;
}

export interface ProductExtra {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

export interface ProductExtraGroup {
  id: string;
  name: string;
  min: number;
  max: number;
  options: ProductExtra[];
}

export interface ProductCategory {
  id: string;
  businessId: string;
  name: string;
  parentId?: string;
  orderIndex: number;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  categoryId?: string;
  available: boolean;
  sizes: ProductSize[];
  extras: ProductExtraGroup[];
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  selectedSize?: string;
  selectedExtras?: string[];
}

export interface Order {
  id: string;
  userId: string;
  customerName?: string;
  businessId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  createdAt: string;
  pointClaimed?: boolean;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  dni: string;
  address: string;
  avatar: string;
  status: 'active' | 'inactive';
  rating: number;
  totalDeliveries: number;
  licenseNumber: string;
  licenseType: string;
  licenseExpiry: string;
  vehicle: {
    type: 'moto' | 'auto' | 'bici' | 'otro';
    model: string;
    plate: string;
    color: string;
    year: string;
    insurancePolicy: string;
    insuranceExpiry: string;
  };
  balance: number;
  joinedAt: string;
}

export interface CartItem extends Product {
  quantity: number;
  selectedSize?: ProductSize;
  selectedExtras?: { groupName: string; optionName: string; price: number }[];
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  usageCount: number;
  status: 'active' | 'inactive';
  businessId: string; // 'all' for global coupons
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  claimPromotion: (promoId: string) => void;
  usePromotionCode: (code: string) => void;
  addLoyaltyPoint: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
      claimPromotion: async (promoId) => {
        const user = get().user;
        if (!user) return;
        
        const alreadyClaimed = user.claimedPromotions?.some(p => p.promoId === promoId);
        if (alreadyClaimed) return;

        const uniqueCode = `PROMO-${user.id.slice(-4)}-${promoId.substring(0, 4)}-${Math.random().toString(36).substr(2, 4)}`.toUpperCase();

        const newClaimedPromotions = [
          ...(user.claimedPromotions || []),
          { promoId, code: uniqueCode, used: false }
        ];

        // Update local state first for immediate UI feedback
        set({
          user: {
            ...user,
            claimedPromotions: newClaimedPromotions,
          },
        });

        // Update Supabase user metadata
        try {
          const { supabase } = await import('../lib/supabase');
          await supabase.auth.updateUser({
            data: { claimedPromotions: newClaimedPromotions }
          });
        } catch (error) {
          console.error('Error saving promotion to Supabase:', error);
        }
      },
      usePromotionCode: async (code) => {
        const user = get().user;
        if (!user) return;

        const newClaimedPromotions = user.claimedPromotions.map(p => 
          p.code === code ? { ...p, used: true, usedAt: new Date().toISOString() } : p
        );

        set({
          user: {
            ...user,
            claimedPromotions: newClaimedPromotions
          }
        });

        try {
          const { supabase } = await import('../lib/supabase');
          await supabase.auth.updateUser({
            data: { claimedPromotions: newClaimedPromotions }
          });
        } catch (error) {
          console.error('Error updating promotion to Supabase:', error);
        }
      },
      addLoyaltyPoint: () => {
        const user = get().user;
        if (!user) return;

        let { points, expiresAt } = user.loyaltyCard || { points: 0, expiresAt: new Date().toISOString() };
        
        const now = new Date();
        const expirationDate = new Date(expiresAt);

        // If expired or completed, reset
        if (now > expirationDate || points >= 6) {
          points = 0;
          expirationDate.setMonth(now.getMonth() + 6);
        }

        points += 1;

        set({
          user: {
            ...user,
            loyaltyCard: {
              points,
              expiresAt: expirationDate.toISOString()
            }
          }
        });
      }
    }),
    { name: 'auth-storage' }
  )
);

interface CartState {
  items: CartItem[];
  addItem: (product: Product, selectedSize?: ProductSize, selectedExtras?: { groupName: string; optionName: string; price: number }[]) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, selectedSize, selectedExtras) => {
        const items = get().items;
        
        // Generate a unique key for the item based on its selections
        const selectionsKey = JSON.stringify({ 
          id: product.id, 
          size: selectedSize?.name, 
          extras: selectedExtras?.map(e => e.optionName).sort() 
        });

        const existingItemIndex = items.findIndex((i) => {
          const itemKey = JSON.stringify({ 
            id: i.id, 
            size: i.selectedSize?.name, 
            extras: i.selectedExtras?.map(e => e.optionName).sort() 
          });
          return itemKey === selectionsKey;
        });

        if (existingItemIndex > -1) {
          const newItems = [...items];
          newItems[existingItemIndex].quantity += 1;
          set({ items: newItems });
        } else {
          // Calculate final price based on selected size
          const basePrice = selectedSize ? selectedSize.price : product.price;
          const extrasPrice = selectedExtras?.reduce((acc, e) => acc + e.price, 0) || 0;
          
          set({ 
            items: [...items, { 
              ...product, 
              price: basePrice + extrasPrice,
              quantity: 1, 
              selectedSize, 
              selectedExtras 
            }] 
          });
        }
      },
      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.id !== productId) }),
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.id === productId ? { ...i, quantity } : i
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    }),
    { name: 'cart-storage' }
  )
);

interface CouponState {
  coupons: Coupon[];
  addCoupon: (coupon: Coupon) => void;
  updateCoupon: (coupon: Coupon) => void;
  deleteCoupon: (id: string) => void;
  toggleCouponStatus: (id: string) => void;
}

export const useCouponStore = create<CouponState>()(
  persist(
    (set) => ({
      coupons: [
        { 
          id: 'gc1', 
          code: 'PLATAFORMA10', 
          type: 'percentage', 
          value: 10, 
          usageCount: 150, 
          status: 'active', 
          businessId: 'all', 
          description: '10% de descuento global en todo el marketplace.',
          startDate: '2024-01-01',
          endDate: '2026-12-31',
          startTime: '00:00',
          endTime: '23:59'
        },
        { 
          id: 'c1', 
          code: 'BIENVENIDO15', 
          type: 'percentage', 
          value: 15, 
          usageCount: 45, 
          status: 'active', 
          businessId: 'biz-1', 
          description: '15% de descuento para nuevos clientes.',
          startDate: '2024-01-01',
          endDate: '2026-12-31',
          startTime: '00:00',
          endTime: '23:59'
        },
      ],
      addCoupon: (coupon) => set((state) => ({ coupons: [...state.coupons, coupon] })),
      updateCoupon: (coupon) => set((state) => ({
        coupons: state.coupons.map((c) => (c.id === coupon.id ? coupon : c)),
      })),
      deleteCoupon: (id) => set((state) => ({
        coupons: state.coupons.filter((c) => c.id !== id),
      })),
      toggleCouponStatus: (id) => set((state) => ({
        coupons: state.coupons.map((c) =>
          c.id === id ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' } : c
        ),
      })),
    }),
    { name: 'coupon-storage' }
  )
);

interface OrderState {
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (id: string, status: Order['status']) => void;
  markPointClaimed: (id: string) => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      orders: [
        {
          id: '101',
          userId: 'user-1',
          customerName: 'Juan Pérez',
          businessId: 'biz-1',
          items: [
            { productId: 'p1', name: 'Pizza Margherita', price: 1200, quantity: 2 }
          ],
          total: 2400,
          status: 'delivered',
          createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
          pointClaimed: true,
        },
        {
          id: '102',
          userId: 'user-2',
          customerName: 'María García',
          businessId: 'biz-1',
          items: [
            { productId: 'p2', name: 'Hamburguesa Especial', price: 1800, quantity: 1 },
            { productId: 'p3', name: 'Papas Fritas XL', price: 600, quantity: 1 }
          ],
          total: 2400,
          status: 'confirmed',
          createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
          pointClaimed: false,
        },
        {
          id: '103',
          userId: 'user-3',
          customerName: 'Carlos López',
          businessId: 'biz-1',
          items: [
            { productId: 'p4', name: 'Coca Cola 500ml', price: 300, quantity: 2 },
            { productId: 'p1', name: 'Pizza Margherita', price: 1200, quantity: 1 }
          ],
          total: 1800,
          status: 'pending',
          createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
          pointClaimed: false,
        }
      ],
      addOrder: (order) => set((state) => ({ orders: [order, ...state.orders] })),
      updateOrderStatus: (id, status) => set((state) => ({
        orders: state.orders.map((o) => o.id === id ? { ...o, status } : o)
      })),
      markPointClaimed: (id) => set((state) => ({
        orders: state.orders.map((o) => o.id === id ? { ...o, pointClaimed: true } : o)
      })),
    }),
    { name: 'order-storage' }
  )
);

interface DriverState {
  drivers: Driver[];
  addDriver: (driver: Driver) => void;
  updateDriver: (driver: Driver) => void;
  deleteDriver: (id: string) => void;
  toggleDriverStatus: (id: string) => void;
}

export const useDriverStore = create<DriverState>()(
  persist(
    (set) => ({
      drivers: [
        {
          id: 'drv-1',
          name: 'Carlos Rodríguez',
          email: 'carlos.r@email.com',
          phone: '1122334455',
          dni: '35.123.456',
          address: 'Calle Falsa 123, CABA',
          avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80',
          status: 'active',
          rating: 4.9,
          totalDeliveries: 156,
          licenseNumber: 'AB-12345678',
          licenseType: 'A.3 (Motos)',
          licenseExpiry: '2026-10-15',
          vehicle: {
            type: 'moto',
            model: 'Honda GLH 150',
            plate: '123 ABC',
            color: 'Rojo',
            year: '2023',
            insurancePolicy: 'RU-987654321',
            insuranceExpiry: '2025-01-20'
          },
          balance: 15400,
          joinedAt: '2023-05-10T10:00:00Z'
        },
        {
          id: 'drv-2',
          name: 'Ana Belén Martínez',
          email: 'ana.bm@email.com',
          phone: '1199887766',
          dni: '40.987.654',
          address: 'Av. Siempre Viva 742, CABA',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
          status: 'inactive',
          rating: 4.7,
          totalDeliveries: 89,
          licenseNumber: 'CD-87654321',
          licenseType: 'B.1 (Autos)',
          licenseExpiry: '2025-12-31',
          vehicle: {
            type: 'auto',
            model: 'Fiat Cronos',
            plate: 'XY 456 ZW',
            color: 'Blanco',
            year: '2022',
            insurancePolicy: 'ST-123456789',
            insuranceExpiry: '2024-11-15'
          },
          balance: 8200,
          joinedAt: '2023-08-15T14:30:00Z'
        }
      ],
      addDriver: (driver) => set((state) => ({ drivers: [driver, ...state.drivers] })),
      updateDriver: (driver) => set((state) => ({
        drivers: state.drivers.map((d) => (d.id === driver.id ? driver : d)),
      })),
      deleteDriver: (id) => set((state) => ({
        drivers: state.drivers.filter((d) => d.id !== id),
      })),
      toggleDriverStatus: (id) => set((state) => ({
        drivers: state.drivers.map((d) =>
          d.id === id ? { ...d, status: d.status === 'active' ? 'inactive' : 'active' } : d
        ),
      })),
    }),
    { name: 'driver-storage' }
  )
);
