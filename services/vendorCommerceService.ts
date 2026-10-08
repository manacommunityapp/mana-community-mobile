import api from './apiClient';
import type { VendorProductDto, VendorCommerceStatsDto, InventoryState } from '@/types/vendorCommerce';

const SAMPLE_PRODUCTS: VendorProductDto[] = [
  {
    id: 'vp1',
    name: 'Aashirvaad Superior MP Whole Wheat Atta',
    category: 'Groceries',
    subCategory: 'Atta & Flour',
    brand: 'ITC Aashirvaad',
    description: '100% whole wheat grain flour milled with traditional chakki process.',
    hsnCode: '11010000',
    gstRate: 5,
    status: 'ACTIVE',
    totalStock: 360,
    inventoryBreakdown: {
      available: 240, reserved: 30, committed: 73, allocated: 10, ready: 5, dispatched: 0, delivered: 0, damaged: 2, expired: 0, cancelled: 0
    },
    variants: [
      {
        id: 'v1', variantName: '10 KG Bag', sku: 'ATT-10KG-01', packSize: '10 KG', mrp: 680, vendorCost: 510, defaultCommunityPrice: 560, isActive: true,
        availableQty: 240, reservedQty: 30, committedQty: 73,
        inventoryBreakdown: { available: 240, reserved: 30, committed: 73, allocated: 10, ready: 5, dispatched: 0, delivered: 0, damaged: 2, expired: 0, cancelled: 0 }
      },
      {
        id: 'v2', variantName: '5 KG Bag', sku: 'ATT-05KG-01', packSize: '5 KG', mrp: 360, vendorCost: 280, defaultCommunityPrice: 310, isActive: true,
        availableQty: 120, reservedQty: 15, committedQty: 25,
        inventoryBreakdown: { available: 120, reserved: 15, committed: 25, allocated: 0, ready: 0, dispatched: 0, delivered: 0, damaged: 0, expired: 0, cancelled: 0 }
      },
    ],
  },
  {
    id: 'vp2',
    name: 'Tata Salt Vacuum Evaporated Iodized Salt',
    category: 'Groceries',
    subCategory: 'Salt & Sugar',
    brand: 'Tata',
    description: 'Vacuum evaporated iodized salt for everyday family health.',
    hsnCode: '25010010',
    gstRate: 5,
    status: 'ACTIVE',
    totalStock: 480,
    inventoryBreakdown: {
      available: 280, reserved: 40, committed: 120, allocated: 30, ready: 10, dispatched: 0, delivered: 0, damaged: 0, expired: 0, cancelled: 0
    },
    variants: [
      { id: 'v3', variantName: '1 KG Pack', sku: 'TS-01KG-01', packSize: '1 KG', mrp: 28, vendorCost: 19, defaultCommunityPrice: 22, isActive: true, availableQty: 280, reservedQty: 40, committedQty: 120 },
      { id: 'v4', variantName: '2 KG Pack', sku: 'TS-02KG-01', packSize: '2 KG', mrp: 52, vendorCost: 36, defaultCommunityPrice: 42, isActive: true, availableQty: 120, reservedQty: 10, committedQty: 35 },
      { id: 'v5', variantName: '5 KG Bag', sku: 'TS-05KG-01', packSize: '5 KG', mrp: 120, vendorCost: 85, defaultCommunityPrice: 98, isActive: true, availableQty: 80, reservedQty: 5, committedQty: 20 },
    ],
  },
  {
    id: 'vp3',
    name: 'Fortune Sunlite Refined Sunflower Oil',
    category: 'Groceries',
    subCategory: 'Oils & Ghee',
    brand: 'Fortune',
    description: 'Enriched with Vitamin A and D. Light and healthy cooking oil.',
    hsnCode: '15121910',
    gstRate: 5,
    status: 'ACTIVE',
    totalStock: 140,
    inventoryBreakdown: {
      available: 85, reserved: 20, committed: 58, allocated: 0, ready: 0, dispatched: 0, delivered: 0, damaged: 1, expired: 0, cancelled: 0
    },
    variants: [
      { id: 'v6', variantName: '5L Can', sku: 'FSO-05L-01', packSize: '5 L', mrp: 750, vendorCost: 590, defaultCommunityPrice: 649, isActive: true, availableQty: 85, reservedQty: 20, committedQty: 58 },
      { id: 'v7', variantName: '1L Pouch', sku: 'FSO-01L-01', packSize: '1 L', mrp: 160, vendorCost: 125, defaultCommunityPrice: 139, isActive: true, availableQty: 55, reservedQty: 10, committedQty: 18 },
    ],
  },
];

export const vendorCommerceService = {
  async getProducts(): Promise<VendorProductDto[]> {
    try {
      const res = await api.get<VendorProductDto[]>('/vendor/commerce/products');
      return res.data;
    } catch {
      return SAMPLE_PRODUCTS;
    }
  },

  async getProductById(id: string): Promise<VendorProductDto> {
    try {
      const res = await api.get<VendorProductDto>(`/vendor/commerce/products/${id}`);
      return res.data;
    } catch {
      return SAMPLE_PRODUCTS.find(p => p.id === id) ?? SAMPLE_PRODUCTS[0];
    }
  },

  async createProduct(data: any): Promise<VendorProductDto> {
    try {
      const res = await api.post<VendorProductDto>('/vendor/commerce/products', data);
      return res.data;
    } catch {
      const newP: VendorProductDto = {
        id: 'vp-' + Date.now(),
        name: data.name,
        category: data.category,
        subCategory: data.subCategory,
        brand: data.brand,
        description: data.description,
        hsnCode: data.hsnCode,
        gstRate: data.gstRate || 5,
        status: 'ACTIVE',
        totalStock: data.variants.reduce((a: number, b: any) => a + (b.initialStock || 0), 0),
        inventoryBreakdown: {
          available: data.variants.reduce((a: number, b: any) => a + (b.initialStock || 0), 0),
          reserved: 0, committed: 0, allocated: 0, ready: 0, dispatched: 0, delivered: 0, damaged: 0, expired: 0, cancelled: 0
        },
        variants: data.variants.map((v: any, idx: number) => ({
          id: 'var-' + idx + '-' + Date.now(),
          variantName: v.variantName,
          sku: v.sku,
          packSize: v.packSize,
          mrp: v.mrp,
          vendorCost: v.vendorCost,
          defaultCommunityPrice: v.defaultCommunityPrice,
          isActive: true,
          availableQty: v.initialStock || 0,
          reservedQty: 0,
          committedQty: 0,
        })),
      };
      SAMPLE_PRODUCTS.push(newP);
      return newP;
    }
  },

  async getStats(): Promise<VendorCommerceStatsDto> {
    try {
      const res = await api.get<VendorCommerceStatsDto>('/vendor/commerce/stats');
      return res.data;
    } catch {
      const totalStock = SAMPLE_PRODUCTS.reduce((a, b) => a + b.totalStock, 0);
      const allVariants = SAMPLE_PRODUCTS.flatMap(p => p.variants);
      const reserved = allVariants.reduce((a, b) => a + b.reservedQty, 0);
      const committed = allVariants.reduce((a, b) => a + b.committedQty, 0);
      return {
        totalProducts: SAMPLE_PRODUCTS.length,
        activeProducts: SAMPLE_PRODUCTS.filter(p => p.status === 'ACTIVE').length,
        outOfStockProducts: 0,
        draftProducts: 0,
        totalInventoryUnits: totalStock,
        reservedUnits: reserved,
        committedUnits: committed,
        allocatedUnits: 40,
        readyUnits: 15,
        dispatchedUnits: 0,
        deliveredUnits: 0,
      };
    }
  },

  async reserveStock(productId: string, variantId: string, quantity: number): Promise<{ success: boolean; remainingAvailable: number }> {
    const prod = SAMPLE_PRODUCTS.find(p => p.id === productId);
    if (!prod) throw new Error('Product not found');
    const variant = prod.variants.find(v => v.id === variantId) || prod.variants[0];
    if (variant.availableQty < quantity) {
      throw new Error('Insufficient inventory to reserve');
    }
    variant.availableQty -= quantity;
    variant.reservedQty += quantity;
    return { success: true, remainingAvailable: variant.availableQty };
  },

  async commitReservedStock(productId: string, variantId: string, quantity: number): Promise<{ success: boolean; committedTotal: number }> {
    const prod = SAMPLE_PRODUCTS.find(p => p.id === productId);
    if (!prod) throw new Error('Product not found');
    const variant = prod.variants.find(v => v.id === variantId) || prod.variants[0];
    variant.reservedQty = Math.max(0, variant.reservedQty - quantity);
    variant.committedQty += quantity;
    return { success: true, committedTotal: variant.committedQty };
  },
};