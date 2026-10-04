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
}

export interface VendorCommerceStatsDto {
  totalProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
  draftProducts: number;
  totalInventoryUnits: number;
  reservedUnits: number;
  committedUnits: number;
}
