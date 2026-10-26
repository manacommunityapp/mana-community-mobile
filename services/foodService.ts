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

export interface TiffinSubscriptionDto {
  id: string;
  planId: string;
  planTitle: string;
  chefName: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';
  startDate: string;
  endDate: string;
  mealsPerDay: string;
  pricePerMonth: number;
  nextDelivery?: string;
}

export interface GroceryItemDto {
  id: string;
  name: string;
  category: 'Vegetables' | 'Fruits' | 'Dairy' | 'Grains' | 'Spices' | 'Organic';
  price: number;
  unit: string;
  farmerName?: string;
  isOrganic?: boolean;
  inStock: boolean;
  image?: string;
}

export interface GroceryOrderDto {
  id: string;
  status: 'PLACED' | 'CONFIRMED' | 'DELIVERED';
  orderTime: string;
  totalAmount: number;
  items: Array<{ name: string; qty: number; price: number }>;
}

export interface PantryItemDto {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  isLowStock?: boolean;
  category?: string;
}

export interface DiningEventDto {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  type: 'POTLUCK' | 'FESTIVAL' | 'COOKING_CLASS' | 'CHEF_TABLE';
  capacity: number;
  registeredCount: number;
  pricePerPerson: number;
  organizer: string;
}

export interface TableReservationDto {
  id: string;
  eventId: string;
  eventTitle: string;
  date: string;
  time: string;
  venue: string;
  guests: number;
  status: 'CONFIRMED' | 'CANCELLED' | 'WAITLISTED';
  totalAmount: number;
}

const FALLBACK_RESTAURANTS: RestaurantDto[] = [];
const FALLBACK_MEAL_PLANS: MealPlanDto[] = [];
const FALLBACK_SUBSCRIPTIONS: TiffinSubscriptionDto[] = [];
const FALLBACK_GROCERY_ITEMS: GroceryItemDto[] = [];
const FALLBACK_GROCERY_ORDERS: GroceryOrderDto[] = [];
const FALLBACK_PANTRY_ITEMS: PantryItemDto[] = [];
const FALLBACK_DINING_EVENTS: DiningEventDto[] = [];
const FALLBACK_RESERVATIONS: TableReservationDto[] = [];
const FALLBACK_ORDERS: FoodOrderDto[] = [];

export const foodService = {
  async getRestaurants(): Promise<RestaurantDto[]> {
    try {
      const res = await api.get<RestaurantDto[]>('/food/restaurants');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.warn('FoodService: Live /food/restaurants unavailable', err);
      return [];
    }
  },

  async getRestaurantById(id: string): Promise<RestaurantDto> {
    try {
      const res = await api.get<RestaurantDto>('/food/restaurants/' + id);
      return res.data;
    } catch (err) {
      secureLog.warn('FoodService: Live /food/restaurants/' + id + ' unavailable', err);
      return null as unknown as RestaurantDto;
    }
  },

  async getRestaurantMenu(restaurantId: string): Promise<MenuItemDto[]> {
    try {
      const res = await api.get<MenuItemDto[]>('/food/home-chefs/' + restaurantId + '/menu');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.warn('FoodService: Menu for ' + restaurantId + ' unavailable', err);
      return [];
    }
  },

  async getMyOrders(): Promise<FoodOrderDto[]> {
    try {
      const res = await api.get<FoodOrderDto[]>('/food/orders/mine');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.warn('FoodService: Live /food/orders/mine unavailable', err);
      return [];
    }
  },

  async placeOrder(payload: {
    restaurantId?: string;
    restaurantName: string;
    items: Array<{ name: string; qty: number; price: number; isVeg?: boolean }>;
    totalAmount: number;
    deliveryAddress?: string;
    deliveryInstructions?: string;
  }): Promise<FoodOrderDto> {
    try {
      const res = await api.post<FoodOrderDto>('/food/orders', payload);
      return res.data;
    } catch (err) {
      secureLog.warn('FoodService: /food/orders post failed', err);
      throw err;
    }
  },

  async cancelOrder(orderId: string): Promise<void> {
    try {
      await api.post('/food/orders/' + orderId + '/cancel');
    } catch (err) {
      secureLog.warn('FoodService: Cancel for ' + orderId + ' failed', err);
      throw err;
    }
  },

  async rateOrder(orderId: string, rating: number, comment?: string): Promise<void> {
    try {
      await api.post('/food/orders/' + orderId + '/review', { rating, comment });
    } catch (err) {
      secureLog.warn('FoodService: Rate order ' + orderId + ' failed', err);
      throw err;
    }
  },

  // --- Tiffin Subscriptions ---

  async getMealPlans(): Promise<MealPlanDto[]> {
    try {
      const res = await api.get<MealPlanDto[]>('/food/meal-plans');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.warn('FoodService: /food/meal-plans unavailable', err);
      return [];
    }
  },

  async getMySubscriptions(): Promise<TiffinSubscriptionDto[]> {
    try {
      const res = await api.get<TiffinSubscriptionDto[]>('/food/subscriptions/mine');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.warn('FoodService: /food/subscriptions/mine unavailable', err);
      return [];
    }
  },

  async subscribeToPlan(planId: string): Promise<TiffinSubscriptionDto> {
    try {
      const res = await api.post<TiffinSubscriptionDto>('/food/subscriptions', { planId });
      return res.data;
    } catch (err) {
      secureLog.warn('FoodService: Subscribe failed', err);
      throw err;
    }
  },

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await api.post('/food/subscriptions/' + subscriptionId + '/cancel');
    } catch (err) {
      secureLog.warn('FoodService: Cancel subscription ' + subscriptionId + ' failed', err);
      throw err;
    }
  },

  async pauseSubscription(subscriptionId: string, days: number): Promise<void> {
    try {
      await api.post('/food/subscriptions/' + subscriptionId + '/pause', { days });
    } catch (err) {
      secureLog.warn('FoodService: Pause subscription ' + subscriptionId + ' failed', err);
      throw err;
    }
  },

  // --- Grocery ---

  async getGroceryItems(): Promise<GroceryItemDto[]> {
    try {
      const res = await api.get<GroceryItemDto[]>('/food/grocery/items');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.warn('FoodService: /food/grocery/items unavailable', err);
      return [];
    }
  },

  async getGroceryOrders(): Promise<GroceryOrderDto[]> {
    try {
      const res = await api.get<GroceryOrderDto[]>('/food/grocery/orders/mine');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.warn('FoodService: /food/grocery/orders unavailable', err);
      return [];
    }
  },

  async placeGroceryOrder(payload: { items: Array<{ itemId: string; name: string; qty: number; price: number }>; totalAmount: number }): Promise<GroceryOrderDto> {
    try {
      const res = await api.post<GroceryOrderDto>('/food/grocery/orders', payload);
      return res.data;
    } catch (err) {
      secureLog.warn('FoodService: Grocery order failed', err);
      throw err;
    }
  },

  // --- Pantry ---

  async getPantryItems(): Promise<PantryItemDto[]> {
    try {
      const res = await api.get<PantryItemDto[]>('/food/pantry/items');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.warn('FoodService: /food/pantry/items unavailable', err);
      return [];
    }
  },

  async addPantryItem(item: { name: string; quantity: number; unit: string; expiryDate?: string }): Promise<PantryItemDto> {
    try {
      const res = await api.post<PantryItemDto>('/food/pantry/items', item);
      return res.data;
    } catch (err) {
      secureLog.warn('FoodService: Add pantry item failed', err);
      throw err;
    }
  },

  async removePantryItem(itemId: string): Promise<void> {
    try {
      await api.delete('/food/pantry/items/' + itemId);
    } catch (err) {
      secureLog.warn('FoodService: Remove pantry item ' + itemId + ' failed', err);
      throw err;
    }
  },

  // --- Community Dining ---

  async getDiningEvents(): Promise<DiningEventDto[]> {
    try {
      const res = await api.get<DiningEventDto[]>('/food/dining/events');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.warn('FoodService: /food/dining/events unavailable', err);
      return [];
    }
  },

  async getMyReservations(): Promise<TableReservationDto[]> {
    try {
      const res = await api.get<TableReservationDto[]>('/food/dining/reservations/mine');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      secureLog.warn('FoodService: /food/dining/reservations unavailable', err);
      return [];
    }
  },

  async rsvpDiningEvent(payload: { eventId: string; guests: number }): Promise<TableReservationDto> {
    try {
      const res = await api.post<TableReservationDto>('/food/dining/rsvp', payload);
      return res.data;
    } catch (err) {
      secureLog.warn('FoodService: RSVP failed', err);
      throw err;
    }
  },

  async cancelReservation(reservationId: string): Promise<void> {
    try {
      await api.post('/food/dining/reservations/' + reservationId + '/cancel');
    } catch (err) {
      secureLog.warn('FoodService: Cancel reservation ' + reservationId + ' failed', err);
      throw err;
    }
  },
};
