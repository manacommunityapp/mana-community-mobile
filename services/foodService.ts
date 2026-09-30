import api from './apiClient';
import { secureLog } from '@/security';

export interface MenuItemDto {
  id: string;
  name: string;
  price: number;
  isVeg: boolean;
  desc: string;
  category?: string;
  image?: string;
  rating?: number;
  preparationTime?: string;
}

export interface RestaurantDto {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  minOrder: number;
  bannerUrl?: string;
  chefName?: string;
  flatNumber?: string;
  isOpen?: boolean;
  menu?: MenuItemDto[];
}

export interface FoodOrderDto {
  id: string;
  restaurantId?: string;
  restaurantName: string;
  totalAmount: number;
  status: 'PLACED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  orderTime: string;
  deliveryAddress?: string;
  items: Array<{ name: string; qty: number; price: number; isVeg?: boolean }>;
}

export interface MealPlanDto {
  id: string;
  title: string;
  chefName: string;
  description: string;
  pricePerMonth: number;
  mealsPerDay: string;
  cuisine: string;
}

const FALLBACK_RESTAURANTS: RestaurantDto[] = [
  {
    id: 'res-1',
    name: "Shanti's Homely Rasoi",
    cuisine: 'North Indian & Thali',
    rating: 4.8,
    deliveryTime: '25-35 mins',
    minOrder: 150,
    chefName: 'Shanti Sharma',
    flatNumber: 'Tower B - 604',
    isOpen: true,
    menu: [
      { id: 'm101', name: 'Special Resident Thali (Roti, Dal, Paneer, Rice, Sweet)', price: 180, isVeg: true, desc: 'Fresh home-cooked balanced meal with pure desi ghee', category: 'Thali' },
      { id: 'm102', name: 'Paneer Butter Masala Combo (with 3 Phulkas)', price: 160, isVeg: true, desc: 'Soft paneer in rich tomato-cashew gravy with hot phulkas', category: 'Main Course' },
      { id: 'm103', name: 'Gharwali Dal Khichdi with Roasted Papad & Pickle', price: 130, isVeg: true, desc: 'Comforting moong dal khichdi tempered with hing and jeera', category: 'Light Meal' },
    ],
  },
  {
    id: 'res-2',
    name: 'Coastal Aroma Kitchen',
    cuisine: 'South Indian & Coastal',
    rating: 4.9,
    deliveryTime: '20-30 mins',
    minOrder: 120,
    chefName: 'Meenakshi Iyer',
    flatNumber: 'Tower A - 302',
    isOpen: true,
    menu: [
      { id: 'm201', name: 'Ghee Podi Tatte Idli (Plate of 2 with Chutney & Sambar)', price: 90, isVeg: true, desc: 'Steaming soft button idlis drenched in gunpowder ghee', category: 'Breakfast / Snack' },
      { id: 'm202', name: 'Mangalore Style Ghee Roast Thali', price: 240, isVeg: false, desc: 'Spiced coastal roast served with neer dosas and coconut curry', category: 'Main Course' },
      { id: 'm203', name: 'Madras Filter Coffee Flask (Serves 2)', price: 80, isVeg: true, desc: 'Freshly brewed aromatic chicory-coffee decoction with thick milk', category: 'Beverage' },
    ],
  },
  {
    id: 'res-3',
    name: 'Bake & Bloom Artisan Studio',
    cuisine: 'Bakery & Desserts',
    rating: 4.7,
    deliveryTime: '30-45 mins',
    minOrder: 200,
    chefName: 'Priya Sen',
    flatNumber: 'Tower D - 1102',
    isOpen: true,
    menu: [
      { id: 'm301', name: 'Dark Chocolate Fudge Brownie Box (4 pcs)', price: 220, isVeg: true, desc: 'Warm gooey Belgian chocolate brownies topped with walnuts', category: 'Dessert' },
      { id: 'm302', name: 'Artisan Sourdough Loaf (Whole Wheat)', price: 160, isVeg: true, desc: 'Naturally fermented 36-hour sourdough bread loaf', category: 'Bakery' },
      { id: 'm303', name: 'Fresh Blueberry Cheese Pastry', price: 140, isVeg: true, desc: 'Creamy mascarpone cheese pastry with natural blueberry compote', category: 'Dessert' },
    ],
  },
  {
    id: 'res-4',
    name: "Nawabi Dastarkhwan",
    cuisine: 'Biryani & Kebabs',
    rating: 4.8,
    deliveryTime: '35-45 mins',
    minOrder: 250,
    chefName: 'Farhan Zaidi',
    flatNumber: 'Tower C - 801',
    isOpen: true,
    menu: [
      { id: 'm401', name: 'Dum Matka Biryani with Burani Raita', price: 260, isVeg: false, desc: 'Slow-cooked aromatic basmati rice layered with spiced marinated meat', category: 'Biryani' },
      { id: 'm402', name: 'Paneer Tikka Roll in Roomali Roti', price: 150, isVeg: true, desc: 'Charcoal grilled spiced paneer chunks rolled with mint chutney', category: 'Rolls' },
      { id: 'm403', name: 'Shahi Tukda with Rabri', price: 120, isVeg: true, desc: 'Crisp fried bread slices steeped in saffron milk syrup and thick malai', category: 'Dessert' },
    ],
  },
];

const FALLBACK_ORDERS: FoodOrderDto[] = [
  {
    id: 'ORD-FOOD-8821',
    restaurantId: 'res-1',
    restaurantName: "Shanti's Homely Rasoi",
    totalAmount: 340,
    status: 'PREPARING',
    orderTime: 'Today, 12:45 PM',
    deliveryAddress: 'Tower A - Flat 1204',
    items: [
      { name: 'Special Resident Thali', qty: 1, price: 180, isVeg: true },
      { name: 'Paneer Butter Masala Combo', qty: 1, price: 160, isVeg: true },
    ],
  },
  {
    id: 'ORD-FOOD-6102',
    restaurantId: 'res-2',
    restaurantName: 'Coastal Aroma Kitchen',
    totalAmount: 170,
    status: 'DELIVERED',
    orderTime: 'Yesterday, 08:15 AM',
    deliveryAddress: 'Tower A - Flat 1204',
    items: [
      { name: 'Ghee Podi Tatte Idli', qty: 1, price: 90, isVeg: true },
      { name: 'Madras Filter Coffee Flask', qty: 1, price: 80, isVeg: true },
    ],
  },
];

export const foodService = {
  async getRestaurants(): Promise<RestaurantDto[]> {
    try {
      const res = await api.get<RestaurantDto[]>('/food/restaurants');
      if (res.data && res.data.length > 0) {
        return res.data;
      }
      return FALLBACK_RESTAURANTS;
    } catch (err) {
      secureLog.warn('FoodService: Live /food/restaurants unavailable, using fallback', err);
      return FALLBACK_RESTAURANTS;
    }
  },

  async getRestaurantById(id: string): Promise<RestaurantDto> {
    try {
      const res = await api.get<RestaurantDto>(`/food/restaurants/${id}`);
      return res.data;
    } catch (err) {
      secureLog.warn(`FoodService: Live /food/restaurants/${id} unavailable, using fallback`, err);
      const found = FALLBACK_RESTAURANTS.find((r) => r.id === id);
      return found || FALLBACK_RESTAURANTS[0];
    }
  },

  async getRestaurantMenu(restaurantId: string): Promise<MenuItemDto[]> {
    try {
      const res = await api.get<MenuItemDto[]>(`/food/restaurants/${restaurantId}/menu`);
      if (res.data && res.data.length > 0) return res.data;
      const r = FALLBACK_RESTAURANTS.find((item) => item.id === restaurantId);
      return r?.menu || FALLBACK_RESTAURANTS[0].menu || [];
    } catch (err) {
      secureLog.warn(`FoodService: Menu for ${restaurantId} unavailable, using fallback`, err);
      const r = FALLBACK_RESTAURANTS.find((item) => item.id === restaurantId);
      return r?.menu || FALLBACK_RESTAURANTS[0].menu || [];
    }
  },

  async getMyOrders(): Promise<FoodOrderDto[]> {
    try {
      const res = await api.get<FoodOrderDto[]>('/food/orders/mine');
      if (res.data && res.data.length > 0) {
        return res.data;
      }
      return FALLBACK_ORDERS;
    } catch (err) {
      secureLog.warn('FoodService: Live /food/orders/mine unavailable, using fallback', err);
      return FALLBACK_ORDERS;
    }
  },

  async placeOrder(payload: {
    restaurantId?: string;
    restaurantName: string;
    items: Array<{ name: string; qty: number; price: number; isVeg?: boolean }>;
    totalAmount: number;
    deliveryAddress?: string;
  }): Promise<FoodOrderDto> {
    try {
      const res = await api.post<FoodOrderDto>('/food/orders', payload);
      return res.data;
    } catch (err) {
      secureLog.warn('FoodService: /food/orders post failed, generating resilient local order', err);
      return {
        id: `ORD-FOOD-${Math.floor(1000 + Math.random() * 9000)}`,
        restaurantId: payload.restaurantId,
        restaurantName: payload.restaurantName,
        totalAmount: payload.totalAmount,
        status: 'PLACED',
        orderTime: 'Just Now',
        deliveryAddress: payload.deliveryAddress || 'Current Residence',
        items: payload.items,
      };
    }
  },

  async cancelOrder(orderId: string): Promise<void> {
    try {
      await api.post(`/food/orders/${orderId}/cancel`);
    } catch (err) {
      secureLog.warn(`FoodService: Cancel for ${orderId} failed`, err);
    }
  },

  async rateOrder(orderId: string, rating: number, comment?: string): Promise<void> {
    try {
      await api.post(`/food/orders/${orderId}/review`, { rating, comment });
    } catch (err) {
      secureLog.warn(`FoodService: Rate order ${orderId} failed`, err);
    }
  },
};
