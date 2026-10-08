export interface EventProgramResponse {
  id: number;
  eventId: number;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  duration?: string;
  dayLabel?: string;
  venue?: string;
  performer?: string;
  performerName?: string;
  activityType?: string;
  requiresRegistration?: boolean;
  spotsLeft?: number;
  maxParticipants?: number;
  registeredCount?: number;
}

export interface EventGalleryItemResponse {
  id: number;
  eventId: number;
  url?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  albumName?: string;
  uploadedBy?: string;
  createdAt: string;
}

export interface EventSponsorResponse {
  id: number;
  eventId: number;
  name: string;
  tier: 'TITLE' | 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' | string;
  logoUrl?: string;
  websiteUrl?: string;
  contactEmail?: string;
  contributionAmount?: number;
  description?: string;
}

export interface EventDonationResponse {
  id: number;
  eventId: number;
  donorName: string;
  flatNumber?: string;
  amount: number;
  anonymous?: boolean;
  transactionId?: string;
  note?: string;
  createdAt: string;
}

export interface EventExpenseResponse {
  id: number;
  eventId: number;
  category: string;
  description: string;
  amount: number;
  vendorName?: string;
  invoiceUrl?: string;
  paidBy?: string;
  createdAt: string;
}

export interface EventVolunteerResponse {
  id: number;
  eventId: number;
  userId: number;
  userName?: string;
  role: string;
  shift: string;
  zone?: string;
  status?: string;
  checkInTime?: string;
}

export interface EventTaskResponse {
  id: number;
  eventId: number;
  title: string;
  phase: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  assignee?: string;
  assigneeName?: string;
  done?: boolean;
  isDone?: boolean;
  dueDate?: string;
}

export interface EventMealPreferenceResponse {
  id?: number;
  eventId: number;
  userId?: number;
  dietaryPref?: string;
  allergies?: string;
  meals?: Array<{
    date?: string;
    lunch: boolean;
    dinner: boolean;
    headCount: number;
  }>;
}
