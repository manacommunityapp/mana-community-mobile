export type InventoryState =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'COMMITTED'
  | 'ALLOCATED'
  | 'READY'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'DAMAGED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface InventoryStateBreakdown {
  available: number;
  reserved: number;
  committed: number;
  allocated: number;
  ready: number;
  dispatched: number;
  delivered: number;
  damaged: number;
  expired: number;
  cancelled: number;
}

export interface ProductVariantDto {
  id: string;
  variantName: string;
  sku: string;
  barcode?: string;
  packSize: string;
  mrp: number;
  vendorCost: number;
  defaultCommunityPrice: number;
  isActive: boolean;
  availableQty: number;
  reservedQty: number;
  committedQty: number;
  inventoryBreakdown?: InventoryStateBreakdown;
}

export interface VendorProductDto {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  brand?: string;
  description?: string;
  hsnCode?: string;
  gstRate?: number;
  status: 'ACTIVE' | 'DRAFT' | 'INACTIVE';
  imageUrl?: string;
  variants: ProductVariantDto[];
  totalStock: number;
  inventoryBreakdown?: InventoryStateBreakdown;
}

export interface VendorCommerceStatsDto {
  totalProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
  draftProducts: number;
  totalInventoryUnits: number;
  reservedUnits: number;
  committedUnits: number;
  allocatedUnits?: number;
  readyUnits?: number;
  dispatchedUnits?: number;
  deliveredUnits?: number;
}