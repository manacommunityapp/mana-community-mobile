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
  category: string;
  price: number;
  unit: string;
  farmerName: string;
  isOrganic: boolean;
  inStock: boolean;
  image?: string;
}

export interface GroceryOrderDto {
  id: string;
  status: 'PLACED' | 'PACKING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
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
  isLowStock: boolean;
  category?: string;
}

export interface DiningEventDto {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  type: 'POTLUCK' | 'COMMUNITY_DINNER' | 'FESTIVAL' | 'COOKING_CLASS';
  capacity: number;
  registeredCount: number;
  pricePerPerson: number;
  organizer?: string;
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

const FALLBACK_MEAL_PLANS: MealPlanDto[] = [
  { id: 'plan-1', title: 'Healthy Homestyle Thali', chefName: 'Shanti Sharma', description: 'Balanced North Indian meals with roti, sabzi, dal, rice & salad. Pure desi ghee, no preservatives.', pricePerMonth: 4500, mealsPerDay: 'Lunch + Dinner', cuisine: 'North Indian' },
  { id: 'plan-2', title: 'South Indian Morning Box', chefName: 'Meenakshi Iyer', description: 'Authentic breakfast tiffin — idli, dosa, upma, pongal rotated daily with chutneys & sambar.', pricePerMonth: 2200, mealsPerDay: 'Breakfast Only', cuisine: 'South Indian' },
  { id: 'plan-3', title: 'Nawabi Weekend Feast', chefName: 'Farhan Zaidi', description: 'Premium biryani & kebab platter every Saturday and Sunday with raita & dessert.', pricePerMonth: 3600, mealsPerDay: 'Weekend Lunch', cuisine: 'Mughlai' },
];

const FALLBACK_SUBSCRIPTIONS: TiffinSubscriptionDto[] = [
  { id: 'sub-1', planId: 'plan-1', planTitle: 'Healthy Homestyle Thali', chefName: 'Shanti Sharma', status: 'ACTIVE', startDate: '2026-09-01', endDate: '2026-09-30', mealsPerDay: 'Lunch + Dinner', pricePerMonth: 4500, nextDelivery: 'Today, 12:30 PM' },
];

const FALLBACK_GROCERY_ITEMS: GroceryItemDto[] = [
  { id: 'groc-1', name: 'Organic Tomatoes', category: 'Vegetables', price: 60, unit: '1 kg', farmerName: 'Rajesh Patel (Tower B-301)', isOrganic: true, inStock: true },
  { id: 'groc-2', name: 'Farm Fresh Spinach', category: 'Vegetables', price: 40, unit: '250 g bundle', farmerName: 'Sunita Devi (Tower A-108)', isOrganic: true, inStock: true },
  { id: 'groc-3', name: 'Alphonso Mangoes', category: 'Fruits', price: 350, unit: '1 dozen', farmerName: 'Rajesh Patel (Tower B-301)', isOrganic: true, inStock: true },
  { id: 'groc-4', name: 'A2 Cow Milk', category: 'Dairy', price: 80, unit: '1 litre', farmerName: 'Govind Farms (Tower D-GF)', isOrganic: true, inStock: true },
  { id: 'groc-5', name: 'Fresh Cottage Cheese (Paneer)', category: 'Dairy', price: 120, unit: '200 g', farmerName: 'Govind Farms (Tower D-GF)', isOrganic: true, inStock: true },
  { id: 'groc-6', name: 'Organic Basmati Rice', category: 'Grains', price: 220, unit: '5 kg', farmerName: 'Sunita Devi (Tower A-108)', isOrganic: true, inStock: true },
  { id: 'groc-7', name: 'Homegrown Curry Leaves', category: 'Spices', price: 15, unit: '1 bunch', farmerName: 'Meenakshi Iyer (Tower A-302)', isOrganic: true, inStock: true },
  { id: 'groc-8', name: 'Cold-Pressed Coconut Oil', category: 'Organic', price: 280, unit: '500 ml', farmerName: 'Coastal Organic Co-op', isOrganic: true, inStock: true },
];

const FALLBACK_GROCERY_ORDERS: GroceryOrderDto[] = [
  { id: 'GORD-1001', status: 'DELIVERED', orderTime: 'Yesterday, 10:15 AM', totalAmount: 420, items: [{ name: 'Organic Tomatoes', qty: 2, price: 60 }, { name: 'A2 Cow Milk', qty: 2, price: 80 }, { name: 'Fresh Cottage Cheese', qty: 1, price: 120 }] },
];

const FALLBACK_PANTRY_ITEMS: PantryItemDto[] = [
  { id: 'pnt-1', name: 'Basmati Rice', quantity: 4, unit: 'kg', expiryDate: '2027-03-15', isLowStock: false, category: 'Grains' },
  { id: 'pnt-2', name: 'Toor Dal', quantity: 0.5, unit: 'kg', expiryDate: '2027-01-20', isLowStock: true, category: 'Pulses' },
  { id: 'pnt-3', name: 'Milk', quantity: 1, unit: 'L', expiryDate: '2026-10-04', isLowStock: false, category: 'Dairy' },
  { id: 'pnt-4', name: 'Bread (Whole Wheat)', quantity: 1, unit: 'pkt', expiryDate: '2026-10-03', isLowStock: false, category: 'Bakery' },
  { id: 'pnt-5', name: 'Cooking Oil', quantity: 2, unit: 'L', expiryDate: '2027-06-01', isLowStock: false, category: 'Oils' },
  { id: 'pnt-6', name: 'Sugar', quantity: 0.3, unit: 'kg', isLowStock: true, category: 'Sweeteners' },
];

const FALLBACK_DINING_EVENTS: DiningEventDto[] = [
  { id: 'din-1', title: 'Navratri Community Dinner', description: 'Celebrate Navratri with a grand community feast — 9 special dishes, live music & dandiya. Families welcome!', date: '12 Oct', time: '7:00 PM', venue: 'Society Clubhouse Lawn', type: 'FESTIVAL', capacity: 120, registeredCount: 87, pricePerPerson: 350, organizer: 'Society Cultural Committee' },
  { id: 'din-2', title: 'Saturday Potluck Night', description: 'Bring your signature dish and enjoy everyone else\'s. Theme: Street Food of India. Prizes for top 3!', date: '05 Oct', time: '7:30 PM', venue: 'Tower A Terrace', type: 'POTLUCK', capacity: 40, registeredCount: 28, pricePerPerson: 0, organizer: 'Tower A Residents' },
  { id: 'din-3', title: 'Italian Cooking Masterclass', description: 'Learn authentic pasta-making & tiramisu from Chef Priya. All ingredients provided. Limited seats!', date: '08 Oct', time: '4:00 PM', venue: 'Clubhouse Kitchen Studio', type: 'COOKING_CLASS', capacity: 15, registeredCount: 12, pricePerPerson: 500, organizer: 'Priya Sen (Tower D-1102)' },
];

const FALLBACK_RESERVATIONS: TableReservationDto[] = [
  { id: 'tbl-1', eventId: 'din-1', eventTitle: 'Navratri Community Dinner', date: '12 Oct', time: '7:00 PM', venue: 'Society Clubhouse Lawn', guests: 4, status: 'CONFIRMED', totalAmount: 1400 },
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

  // --- Tiffin Subscriptions ---

  async getMealPlans(): Promise<MealPlanDto[]> {
    try {
      const res = await api.get<MealPlanDto[]>('/food/meal-plans');
      if (res.data && res.data.length > 0) return res.data;
      return FALLBACK_MEAL_PLANS;
    } catch (err) {
      secureLog.warn('FoodService: /food/meal-plans unavailable, using fallback', err);
      return FALLBACK_MEAL_PLANS;
    }
  },

  async getMySubscriptions(): Promise<TiffinSubscriptionDto[]> {
    try {
      const res = await api.get<TiffinSubscriptionDto[]>('/food/subscriptions/mine');
      if (res.data && res.data.length > 0) return res.data;
      return FALLBACK_SUBSCRIPTIONS;
    } catch (err) {
      secureLog.warn('FoodService: /food/subscriptions/mine unavailable, using fallback', err);
      return FALLBACK_SUBSCRIPTIONS;
    }
  },

  async subscribeToPlan(planId: string): Promise<TiffinSubscriptionDto> {
    try {
      const res = await api.post<TiffinSubscriptionDto>('/food/subscriptions', { planId });
      return res.data;
    } catch (err) {
      secureLog.warn('FoodService: Subscribe failed, generating local subscription', err);
      const plan = FALLBACK_MEAL_PLANS.find((p) => p.id === planId) || FALLBACK_MEAL_PLANS[0];
      return { id: `sub-${Date.now()}`, planId, planTitle: plan.title, chefName: plan.chefName, status: 'ACTIVE', startDate: new Date().toISOString().split('T')[0], endDate: '', mealsPerDay: plan.mealsPerDay, pricePerMonth: plan.pricePerMonth };
    }
  },

  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await api.post(`/food/subscriptions/${subscriptionId}/cancel`);
    } catch (err) {
      secureLog.warn(`FoodService: Cancel subscription ${subscriptionId} failed`, err);
    }
  },

  async pauseSubscription(subscriptionId: string, days: number): Promise<void> {
    try {
      await api.post(`/food/subscriptions/${subscriptionId}/pause`, { days });
    } catch (err) {
      secureLog.warn(`FoodService: Pause subscription ${subscriptionId} failed`, err);
    }
  },

  // --- Grocery ---

  async getGroceryItems(): Promise<GroceryItemDto[]> {
    try {
      const res = await api.get<GroceryItemDto[]>('/food/grocery/items');
      if (res.data && res.data.length > 0) return res.data;
      return FALLBACK_GROCERY_ITEMS;
    } catch (err) {
      secureLog.warn('FoodService: /food/grocery/items unavailable, using fallback', err);
      return FALLBACK_GROCERY_ITEMS;
    }
  },

  async getGroceryOrders(): Promise<GroceryOrderDto[]> {
    try {
      const res = await api.get<GroceryOrderDto[]>('/food/grocery/orders/mine');
      if (res.data && res.data.length > 0) return res.data;
      return FALLBACK_GROCERY_ORDERS;
    } catch (err) {
      secureLog.warn('FoodService: /food/grocery/orders unavailable, using fallback', err);
      return FALLBACK_GROCERY_ORDERS;
    }
  },

  async placeGroceryOrder(payload: { items: Array<{ itemId: string; name: string; qty: number; price: number }>; totalAmount: number }): Promise<GroceryOrderDto> {
    try {
      const res = await api.post<GroceryOrderDto>('/food/grocery/orders', payload);
      return res.data;
    } catch (err) {
      secureLog.warn('FoodService: Grocery order failed, generating local order', err);
      return { id: `GORD-${Math.floor(1000 + Math.random() * 9000)}`, status: 'PLACED', orderTime: 'Just Now', totalAmount: payload.totalAmount, items: payload.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })) };
    }
  },

  // --- Pantry ---

  async getPantryItems(): Promise<PantryItemDto[]> {
    try {
      const res = await api.get<PantryItemDto[]>('/food/pantry/items');
      if (res.data && res.data.length > 0) return res.data;
      return FALLBACK_PANTRY_ITEMS;
    } catch (err) {
      secureLog.warn('FoodService: /food/pantry/items unavailable, using fallback', err);
      return FALLBACK_PANTRY_ITEMS;
    }
  },

  async addPantryItem(item: { name: string; quantity: number; unit: string; expiryDate?: string }): Promise<PantryItemDto> {
    try {
      const res = await api.post<PantryItemDto>('/food/pantry/items', item);
      return res.data;
    } catch (err) {
      secureLog.warn('FoodService: Add pantry item failed, generating local item', err);
      return { id: `pnt-${Date.now()}`, name: item.name, quantity: item.quantity, unit: item.unit, expiryDate: item.expiryDate, isLowStock: false };
    }
  },

  async removePantryItem(itemId: string): Promise<void> {
    try {
      await api.delete(`/food/pantry/items/${itemId}`);
    } catch (err) {
      secureLog.warn(`FoodService: Remove pantry item ${itemId} failed`, err);
    }
  },

  // --- Community Dining ---

  async getDiningEvents(): Promise<DiningEventDto[]> {
    try {
      const res = await api.get<DiningEventDto[]>('/food/dining/events');
      if (res.data && res.data.length > 0) return res.data;
      return FALLBACK_DINING_EVENTS;
    } catch (err) {
      secureLog.warn('FoodService: /food/dining/events unavailable, using fallback', err);
      return FALLBACK_DINING_EVENTS;
    }
  },

  async getMyReservations(): Promise<TableReservationDto[]> {
    try {
      const res = await api.get<TableReservationDto[]>('/food/dining/reservations/mine');
      if (res.data && res.data.length > 0) return res.data;
      return FALLBACK_RESERVATIONS;
    } catch (err) {
      secureLog.warn('FoodService: /food/dining/reservations unavailable, using fallback', err);
      return FALLBACK_RESERVATIONS;
    }
  },

  async rsvpDiningEvent(payload: { eventId: string; guests: number }): Promise<TableReservationDto> {
    try {
      const res = await api.post<TableReservationDto>('/food/dining/rsvp', payload);
      return res.data;
    } catch (err) {
      secureLog.warn('FoodService: RSVP failed, generating local reservation', err);
      const event = FALLBACK_DINING_EVENTS.find((e) => e.id === payload.eventId) || FALLBACK_DINING_EVENTS[0];
      return { id: `tbl-${Date.now()}`, eventId: payload.eventId, eventTitle: event.title, date: event.date, time: event.time, venue: event.venue, guests: payload.guests, status: 'CONFIRMED', totalAmount: event.pricePerPerson * payload.guests };
    }
  },

  async cancelReservation(reservationId: string): Promise<void> {
    try {
      await api.post(`/food/dining/reservations/${reservationId}/cancel`);
    } catch (err) {
      secureLog.warn(`FoodService: Cancel reservation ${reservationId} failed`, err);
    }
  },
};
