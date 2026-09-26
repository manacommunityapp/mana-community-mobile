import api from './apiClient';

export interface RestaurantDto {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  minOrder: number;
  bannerUrl?: string;
}

export interface FoodOrderDto {
  id: string;
  restaurantName: string;
  totalAmount: number;
  status: 'PLACED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
  orderTime: string;
  items: Array<{ name: string; qty: number; price: number }>;
}

export const foodService = {
  async getRestaurants(): Promise<RestaurantDto[]> {
    const res = await api.get<RestaurantDto[]>('/food/restaurants');
    return res.data;
  },

  async getMyOrders(): Promise<FoodOrderDto[]> {
    const res = await api.get<FoodOrderDto[]>('/food/orders/mine');
    return res.data;
  },
};
