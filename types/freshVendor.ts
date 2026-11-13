export type FreshVendorCapabilityType =
  | 'FRUIT_SUPPLIER'
  | 'VEGETABLE_SUPPLIER'
  | 'FRESH_CUT_PROCESSOR'
  | 'DAIRY_VENDOR'
  | 'BATTER_MANUFACTURER'
  | 'NUTRITION_VENDOR'
  | 'DRY_FRUIT_SUPPLIER'
  | 'CHICKEN_SUPPLIER'
  | 'MUTTON_SUPPLIER'
  | 'SEAFOOD_SUPPLIER'
  | 'HEALTHY_SNACK_VENDOR'
  | 'DELIVERY_PARTNER';

export type CapabilityStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface VendorCapabilityDto {
  id: number;
  vendorId: number;
  vendorBusinessName?: string;
  capabilityType: FreshVendorCapabilityType;
  status: CapabilityStatus;
  fssaiLicenseNumber?: string;
  fssaiValidUntil?: string;
  coldStorageAvailable: boolean;
  dailyCapacityUnits: number;
  operatingDays: string;
}

export type VendorDocumentType =
  | 'FSSAI_LICENSE'
  | 'GST_CERTIFICATE'
  | 'TRADE_LICENSE'
  | 'POLLUTION_NOC'
  | 'WATER_TEST_REPORT'
  | 'FSMS_CERTIFICATE';

export type DocumentVerificationStatus =
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED';

export interface VendorDocumentDto {
  id: number;
  vendorId: number;
  vendorBusinessName?: string;
  documentType: VendorDocumentType;
  documentNumber: string;
  validFrom?: string;
  validTo?: string;
  fileUrl: string;
  status: DocumentVerificationStatus;
  rejectionReason?: string;
  createdAt: string;
}

export interface UploadVendorDocumentRequest {
  vendorId: number;
  documentType: VendorDocumentType;
  documentNumber: string;
  validFrom?: string;
  validTo?: string;
  fileUrl: string;
}

export type FulfilmentGroupStatus =
  | 'CREATED'
  | 'ASSIGNED'
  | 'PICKED'
  | 'PACKED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface FulfilmentItemDto {
  id: number;
  fulfilmentGroupId: number;
  orderItemId: number;
  vendorProductId?: number;
  productName?: string;
  batchId?: number;
  batchNumber?: string;
  requestedQuantity: number;
  pickedQuantity?: number;
  unitOfMeasure: string;
  unitPrice: number;
  billedPrice: number;
  isWeightAdjusted: boolean;
  status: string;
}

export interface FulfilmentGroupDto {
  id: number;
  groupReference: string;
  orderId: number;
  orderNumber: string;
  groupNumber: number;
  vendorId?: number;
  vendorBusinessName?: string;
  fulfilmentOwnerType: string;
  deliveryMode: string;
  status: FulfilmentGroupStatus;
  targetDeliveryTime?: string;
  trackingReference?: string;
  handoverOtp?: string;
  qrCodeToken?: string;
  subtotalAmount: number;
  totalWeightG: number;
  requiresColdChain: boolean;
  failedOtpAttempts?: number;
  isHandoverLocked?: boolean;
  items: FulfilmentItemDto[];
}

export interface WeightAdjustmentDto {
  id: number;
  adjustmentReference: string;
  fulfilmentItemId: number;
  orderId: number;
  requestedWeightG: number;
  actualWeightG: number;
  weightDifferenceG: number;
  weightDifferencePct: number;
  originalAmount: number;
  adjustedAmount: number;
  refundOrChargeAmount: number;
  adjustmentStatus: string;
  reason?: string;
}

export interface RecordWeightRequest {
  fulfilmentItemId: number;
  actualWeightG: number;
  reason?: string;
}
