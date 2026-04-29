import { Business, Product, Order } from '../store/useStore';

export const MOCK_BUSINESSES: Business[] = [
  {
    id: 'biz-1',
    name: 'Pizzería La Toscana',
    description: 'Las mejores pizzas artesanales a la leña con ingredientes importados.',
    category: 'Pizza',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=1200&q=80',
    whatsapp: '5491122334455',
    address: 'Av. Principal 123',
    rating: 4.8,
    isOpen: true,
    deliveryFee: 150,
    deliveryTime: '30-45 min',
    status: 'active',
    openingHours: [
      { day: 'Lunes', open: '09:00', close: '22:00', closed: false },
      { day: 'Martes', open: '09:00', close: '22:00', closed: false },
      { day: 'Miércoles', open: '09:00', close: '22:00', closed: false },
      { day: 'Jueves', open: '09:00', close: '22:00', closed: false },
      { day: 'Viernes', open: '09:00', close: '23:00', closed: false },
      { day: 'Sábado', open: '10:00', close: '23:00', closed: false },
      { day: 'Domingo', open: '10:00', close: '21:00', closed: true },
    ],
    instagram: 'pizzerialatoscana',
    facebook: 'facebook.com/pizzerialatoscana',
    website: 'www.latoscana.com'
  },
  {
    id: 'biz-2',
    name: 'Burger Master',
    description: 'Hamburguesas gourmet con carne 100% angus y pan brioche artesanal.',
    category: 'Hamburguesas',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
    whatsapp: '5491122334456',
    address: 'Calle Falsa 456',
    rating: 4.5,
    isOpen: true,
    deliveryFee: 100,
    deliveryTime: '20-35 min',
    status: 'active',
    instagram: 'burgermaster',
    facebook: 'facebook.com/burgermaster'
  },
  {
    id: 'biz-3',
    name: 'Sushi Zen',
    description: 'Experiencia premium de sushi y comida japonesa tradicional.',
    category: 'Sushi',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1200&q=80',
    whatsapp: '5491122334457',
    address: 'Boulevard de las Artes 789',
    rating: 4.9,
    isOpen: true,
    deliveryFee: 200,
    deliveryTime: '45-60 min',
    status: 'active',
    instagram: 'sushizen',
    website: 'www.sushizen.com'
  },
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    businessId: 'biz-1',
    name: 'Pizza Margherita',
    description: 'Salsa de tomate, mozzarella fresca, albahaca y aceite de oliva.',
    price: 1200,
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbad80ad38?auto=format&fit=crop&w=800&q=80',
    category: 'Clásicas',
    available: true,
  },
  {
    id: 'p2',
    businessId: 'biz-1',
    name: 'Pizza Pepperoni',
    description: 'Doble pepperoni, mozzarella y salsa de la casa.',
    price: 1400,
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80',
    category: 'Clásicas',
    available: true,
  },
  {
    id: 'p3',
    businessId: 'biz-2',
    name: 'Classic Burger',
    description: 'Carne 150g, queso cheddar, lechuga, tomate y salsa secreta.',
    price: 950,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    category: 'Hamburguesas',
    available: true,
  },
  {
    id: 'p4',
    businessId: 'biz-2',
    name: 'Bacon BBQ Burger',
    description: 'Carne 150g, doble bacon, aros de cebolla y salsa BBQ.',
    price: 1100,
    image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80',
    category: 'Hamburguesas',
    available: true,
  },
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ord-1',
    userId: 'user-1',
    businessId: 'biz-1',
    items: [
      { productId: 'p1', name: 'Pizza Margherita', price: 1200, quantity: 1 },
      { productId: 'p2', name: 'Pizza Pepperoni', price: 1400, quantity: 1 },
    ],
    total: 2600,
    status: 'delivered',
    createdAt: '2024-03-15T20:30:00Z',
  },
];

export const MOCK_PROMOTIONS = [
  {
    id: '1',
    title: "2x1 en Pizzas",
    description: "Todos los martes y jueves en locales seleccionados.",
    discount: "50% OFF",
    value: 50,
    type: 'percentage' as const,
    productId: 'p1', // Pizza Margherita
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800",
    color: "bg-red-500",
    expiry: "Expira en 2 días"
  },
  {
    id: '2',
    title: "Envío Gratis",
    description: "En tu primer pedido superior a $15.000.",
    discount: "FREE",
    value: 0,
    type: 'fixed' as const,
    image: "https://images.unsplash.com/photo-1526367790999-0150786486a9?auto=format&fit=crop&q=80&w=800",
    color: "bg-emerald-500",
    expiry: "Válido todo el mes"
  },
  {
    id: '3',
    title: "Combo Familiar",
    description: "4 Hamburguesas + Papas + Bebida Grande.",
    discount: "20% OFF",
    value: 20,
    type: 'percentage' as const,
    productId: 'p3', // Classic Burger
    image: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&q=80&w=800",
    color: "bg-amber-500",
    expiry: "Solo fines de semana"
  }
];
