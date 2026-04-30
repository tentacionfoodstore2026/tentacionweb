import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'user' | 'comercio' | 'repartidor' | 'cocina' | 'admin' | 'super_admin';

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
  loading: boolean;
  setLoading: (loading: boolean) => void;
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
      loading: true,
      setLoading: (loading) => set({ loading }),
      setUser: (user) => set({ user, loading: false }),
      logout: () => set({ user: null, loading: false }),
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
      coupons: [],
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
      orders: [],
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
      drivers: [],
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
