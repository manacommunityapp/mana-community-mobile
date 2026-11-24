export interface InteriorDesigner {
  id: number; userId: number; userName?: string; businessName?: string; bio?: string;
  verificationStatus: string; verifiedCredentialLevel?: string; avgRating?: number;
  profileImageUrl?: string; serviceAreas?: string; portfolio?: string;
}
export interface InteriorQuoteLine {
  id: number; category: string; description: string; quantity: number; unit: string;
  unitPrice: number; lineTotal: number; catalogProductId?: number; procurementQuantity?: number;
}
export interface InteriorQuote {
  id: number; projectId: number; providerId: number; providerName: string; quotedAmount: number;
  estimatedDurationDays: number; status: string; lineItems: InteriorQuoteLine[];
}
export interface InteriorProject {
  id: number; title: string; status: string; propertyType: string; homeSize: string; locality: string;
  stylePreference?: string; focusAreas: string[]; budgetMin?: number; budgetMax?: number; projectScope: string;
  invitedDesignerIds: number[]; quotes: InteriorQuote[]; milestoneApprovals: string[];
}
export interface SavedInspiration {
  id: number; projectId?: number; sourceUrl: string; imageUrl?: string; title?: string; notes?: string; tags?: string;
}
export interface InteriorChangeRequest {
  id: number; projectId: number; proposedBy: number; description: string; scopeDelta?: string;
  priceDelta?: number; proposedStartDate?: string; proposedEndDate?: string; status: string; decisionNote?: string;
}
export interface InteriorPaymentMilestone {
  id: number; projectId: number; providerId: number; title: string; amount: number; dueDate?: string; status: string;
  razorpayOrderId?: string; razorpayPaymentId?: string; invoiceReference?: string; invoiceUrl?: string;
}
