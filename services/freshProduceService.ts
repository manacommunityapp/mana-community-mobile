import { apiClient } from './apiClient';

export interface FreshProduct {
  id: number;
  communityId?: number;
  categoryId?: number;
  name: string;
  description?: string;
  unit?: string;
  price: number;
  stock: number;
  imageUrl?: string;
  active: boolean;
  category?: 'Vegetables' | 'Fruits' | 'Dairy & Eggs' | 'Leafy Greens' | 'Organic Staples';
}

export interface PlaceFreshOrderItem {
  productId: number;
  quantity: number;
}

export interface PlaceFreshOrderRequest {
  items: PlaceFreshOrderItem[];
  deliveryAddress?: string;
  deliverySlot?: string;
  notes?: string;
}

export interface FreshOrderItem {
  id?: number;
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice: number;
}

export interface FreshOrder {
  id: number;
  communityId: number;
  residentId: number;
  status: 'PENDING' | 'CONFIRMED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  items: FreshOrderItem[];
  deliveryAddress?: string;
  deliverySlot?: string;
  notes?: string;
  createdAt?: string;
}

export const FALLBACK_PRODUCTS: FreshProduct[] = [
  {
    id: 101,
    name: 'Hydroponic Spinach (Palak)',
    description: 'Pesticide-free farm fresh tender spinach leaves harvested daily.',
    unit: '250g',
    price: 35.0,
    stock: 45,
    imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500&auto=format&fit=crop&q=60',
    active: true,
    category: 'Leafy Greens',
  },
  {
    id: 102,
    name: 'Farm Fresh Tomatoes (Nati)',
    description: 'Vine-ripened organic country tomatoes, juicy and tangy.',
    unit: '1 kg',
    price: 42.0,
    stock: 60,
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=60',
    active: true,
    category: 'Vegetables',
  },
  {
    id: 103,
    name: 'Alphonso Mangoes (Ratnagiri)',
    description: 'Naturally ripened, carbide-free premium sweet mangoes.',
    unit: '1 kg (approx 3-4 pcs)',
    price: 240.0,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=500&auto=format&fit=crop&q=60',
    active: true,
    category: 'Fruits',
  },
  {
    id: 104,
    name: 'A2 Desi Cow Milk (Pasteurized)',
    description: 'Single-source Gir cow milk delivered in glass bottle.',
    unit: '1 Litre',
    price: 85.0,
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=60',
    active: true,
    category: 'Dairy & Eggs',
  },
  {
    id: 105,
    name: 'Fresh Country Eggs (Free Range)',
    description: 'Brown free-range eggs enriched with Omega-3.',
    unit: 'Pack of 6',
    price: 75.0,
    stock: 35,
    imageUrl: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=500&auto=format&fit=crop&q=60',
    active: true,
    category: 'Dairy & Eggs',
  },
  {
    id: 106,
    name: 'Crisp English Cucumbers',
    description: 'Crunchy greenhouse cucumbers ideal for fresh salads.',
    unit: '500g',
    price: 30.0,
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=500&auto=format&fit=crop&q=60',
    active: true,
    category: 'Vegetables',
  },
  {
    id: 107,
    name: 'Royal Gala Apples (Himachal)',
    description: 'Crisp, sweet mountain apples direct from orchard growers.',
    unit: '1 kg',
    price: 180.0,
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=60',
    active: true,
    category: 'Fruits',
  },
  {
    id: 108,
    name: 'Cold-Pressed Groundnut Oil',
    description: 'Wood-churned traditional oil with zero preservatives.',
    unit: '1 Litre',
    price: 260.0,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=60',
    active: true,
    category: 'Organic Staples',
  },
];

export const freshProduceService = {
  getProducts: async (communityId?: number): Promise<FreshProduct[]> => {
    try {
      const query = communityId ? `?communityId=${communityId}` : '';
      const res = await apiClient.get<any>(`/fresh/products${query}`);
      const data = res.data?.data || res.data;
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any, idx: number) => ({
          ...item,
          price: Number(item.price) || 0,
          category: item.category || FALLBACK_PRODUCTS[idx % FALLBACK_PRODUCTS.length].category,
        }));
      }
      return FALLBACK_PRODUCTS;
    } catch {
      return FALLBACK_PRODUCTS;
    }
  },

  getProduct: async (id: number): Promise<FreshProduct | null> => {
    try {
      const res = await apiClient.get<any>(`/fresh/products/${id}`);
      return res.data?.data || res.data || null;
    } catch {
      return FALLBACK_PRODUCTS.find(p => p.id === id) || null;
    }
  },

  getMyOrders: async (): Promise<FreshOrder[]> => {
    try {
      const res = await apiClient.get<any>('/fresh/orders');
      const data = res.data?.data || res.data;
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  getOrder: async (id: number): Promise<FreshOrder | null> => {
    try {
      const res = await apiClient.get<any>(`/fresh/orders/${id}`);
      return res.data?.data || res.data || null;
    } catch {
      return null;
    }
  },

  placeOrder: async (data: PlaceFreshOrderRequest): Promise<FreshOrder> => {
    const res = await apiClient.post<any>('/fresh/orders', data);
    return res.data?.data || res.data;
  },

  cancelOrder: async (id: number): Promise<FreshOrder> => {
    const res = await apiClient.put<any>(`/fresh/orders/${id}/cancel`);
    return res.data?.data || res.data;
  },
};
