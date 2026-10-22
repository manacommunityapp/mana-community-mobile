const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api';

// ── Types ────────────────────────────────────────────────────────────────────

export type ExperienceCategory =
  | 'MOVIES' | 'LIVE_EVENTS' | 'SPORTS' | 'KIDS_FAMILY'
  | 'WORKSHOPS' | 'OUTINGS' | 'ONLINE';

export type ExperienceVisibility = 'OPEN' | 'MEMBERS_ONLY' | 'INVITE_ONLY';
export type ExperienceStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
export type BookingStatus = 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED' | 'ATTENDED';

export interface Experience {
  id: string;
  title: string;
  category: ExperienceCategory;
  emoji: string;
  backdrop_color: string;
  description: string;
  organizer_name: string;
  organizer_verified: boolean;
  venue: string;
  venue_area: string;
  start_date: string;
  end_date?: string;
  start_time: string;
  duration_mins?: number;
  is_free: boolean;
  price_individual?: number;
  price_group?: number;
  group_min_size?: number;
  group_current_size?: number;
  group_deadline?: string;
  visibility: ExperienceVisibility;
  community_tag?: string;
  capacity: number;
  registered_count: number;
  status: ExperienceStatus;
  is_featured: boolean;
  tags: string[];
  age_suitability?: string;
  refund_policy?: string;
  image_url?: string;
}

export interface FamilyMember {
  name: string;
  age?: number;
}

export interface ExperienceBooking {
  booking_id: string;
  experience_id: string;
  experience_title: string;
  category: ExperienceCategory;
  emoji: string;
  backdrop_color: string;
  ticket_type: 'GENERAL' | 'FAMILY' | 'GROUP' | 'VIP';
  attendee_count: number;
  total_amount: number;
  original_amount?: number;
  discount_amount?: number;
  coupon_code?: string;
  status: BookingStatus;
  refund_status?: 'NONE' | 'REQUESTED' | 'APPROVED' | 'PROCESSED';
  booked_at: string;
  qr_data: string;
  qr_pass_code: string;
  venue: string;
  start_date: string;
  start_time: string;
  payment_ref?: string;
  upi_intent_url?: string;
  family_members?: FamilyMember[];
}

export interface BookingRequest {
  experience_id: string;
  ticket_type: 'GENERAL' | 'FAMILY' | 'GROUP' | 'VIP';
  attendee_count: number;
  attendee_name: string;
  attendee_phone: string;
  is_group_booking: boolean;
  coupon_code?: string;
  family_members?: FamilyMember[];
}

// ── P2 Types ─────────────────────────────────────────────────────────────────

export interface CouponResult {
  valid: boolean;
  code: string;
  discount_type: 'PERCENT' | 'FLAT';
  discount_value: number;
  discount_amount: number;
  final_amount: number;
  message: string;
}

export interface WaitlistEntry {
  waitlist_id: string;
  experience_id: string;
  position: number;
  name: string;
  phone: string;
  joined_at: string;
}

export interface OrganizerAttendee {
  booking_id: string;
  name: string;
  phone: string;
  ticket_type: string;
  attendee_count: number;
  amount_paid: number;
  status: BookingStatus;
  booked_at: string;
  checked_in: boolean;
  checked_in_at?: string;
  coupon_used?: string;
  refund_status?: 'NONE' | 'REQUESTED' | 'APPROVED' | 'PROCESSED';
}

export interface OrganizerReport {
  experience_id: string;
  experience_title: string;
  emoji: string;
  backdrop_color: string;
  start_date: string;
  venue: string;
  capacity: number;
  registered_count: number;
  checked_in_count: number;
  gross_revenue: number;
  platform_fee: number;
  net_settlement: number;
  refunds_total: number;
  ticket_breakdown: { type: string; count: number; revenue: number }[];
  coupon_usage_count: number;
  attendees: OrganizerAttendee[];
}

export interface RefundRequest {
  refund_id: string;
  booking_id: string;
  reason: string;
  amount_requested: number;
  status: 'REQUESTED' | 'APPROVED' | 'PROCESSED' | 'REJECTED';
  requested_at: string;
  estimated_days: number;
}

// ── P3 Types ─────────────────────────────────────────────────────────────────

export type PartnerCategory =
  | 'RESTAURANT' | 'SPORTS_VENUE' | 'ACTIVITY_CENTER'
  | 'COACHING' | 'ENTERTAINMENT' | 'WELLNESS' | 'RETAIL';

export interface Partner {
  id: string;
  name: string;
  category: PartnerCategory;
  emoji: string;
  backdrop_color: string;
  tagline: string;
  description: string;
  address: string;
  area: string;
  rating: number;
  review_count: number;
  is_verified: boolean;
  is_featured: boolean;
  discount_for_members?: string;
  contact_phone?: string;
  website_url?: string;
  booking_url?: string;
  amenities: string[];
  photos_count: number;
  open_hours?: string;
  price_range: '₹' | '₹₹' | '₹₹₹' | '₹₹₹₹';
  experience_ids?: string[];
}

export interface ExperienceReview {
  review_id: string;
  experience_id: string;
  reviewer_name: string;
  reviewer_initials: string;
  rating: number;
  title: string;
  body: string;
  attended_date: string;
  created_at: string;
  helpful_count: number;
  verified_attendee: boolean;
  photos_count: number;
}

export interface ReviewRequest {
  experience_id: string;
  booking_id: string;
  rating: number;
  title: string;
  body: string;
}

export interface CoachingSession {
  session_id: string;
  partner_id: string;
  partner_name: string;
  sport: string;
  emoji: string;
  coach_name: string;
  coach_bio: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';
  duration_mins: number;
  price_per_session: number;
  group_size_max: number;
  available_slots: { date: string; time: string; spots_left: number }[];
  venue: string;
  area: string;
}

// ── Mock Data ────────────────────────────────────────────────────────────────

function nextDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

const MOCK_EXPERIENCES: Experience[] = [
  {
    id: 'exp-001',
    title: 'Mana Community Movie Night',
    category: 'MOVIES',
    emoji: '🎬',
    backdrop_color: '#1A1A2E',
    description: 'Join us for an exclusive outdoor movie screening at the community amphitheatre. This week: Pushpa 2 — The Rule. Bring your own mat or chair. Popcorn and chai provided!\n\nDoors open at 7:30 PM. Movie starts at 8:00 PM sharp.',
    organizer_name: 'Mana Community Events',
    organizer_verified: true,
    venue: 'Community Amphitheatre, Block A',
    venue_area: 'Miyapur',
    start_date: nextDate(3),
    start_time: '8:00 PM',
    duration_mins: 180,
    is_free: true,
    visibility: 'MEMBERS_ONLY',
    community_tag: 'Prestige Nirvana',
    capacity: 200,
    registered_count: 143,
    status: 'UPCOMING',
    is_featured: true,
    tags: ['Movie', 'Outdoor', 'Family', 'Evening'],
    age_suitability: 'UA · All families',
    refund_policy: 'Free event — no payment required',
  },
  {
    id: 'exp-002',
    title: 'Hyderabad Food Festival 2025',
    category: 'OUTINGS',
    emoji: '🍜',
    backdrop_color: '#7C2D12',
    description: 'The biggest food festival in Hyderabad is back! Explore 80+ stalls featuring Hyderabadi biryani, haleem, kebabs, and street food from across India. Live qawwali performances, chef demonstrations, and a kids\' food zone.',
    organizer_name: 'HydFoodFest Organizers',
    organizer_verified: true,
    venue: 'HICC Complex, Madhapur',
    venue_area: 'Madhapur',
    start_date: nextDate(5),
    end_date: nextDate(7),
    start_time: '11:00 AM',
    duration_mins: 480,
    is_free: false,
    price_individual: 299,
    price_group: 249,
    group_min_size: 10,
    group_current_size: 7,
    group_deadline: nextDate(3),
    visibility: 'OPEN',
    capacity: 5000,
    registered_count: 2847,
    status: 'UPCOMING',
    is_featured: true,
    tags: ['Food', 'Festival', 'Family', 'Weekend', 'Culture'],
    age_suitability: 'All ages',
    refund_policy: '100% refund if cancelled 48h before event',
  },
  {
    id: 'exp-003',
    title: 'Kids\' Robotics & Coding Workshop',
    category: 'KIDS_FAMILY',
    emoji: '🤖',
    backdrop_color: '#1E40AF',
    description: 'A hands-on STEM workshop for children aged 8–14. Kids will learn to build simple robots using LEGO Mindstorms and get an introduction to Python programming. All materials provided. Limited to 20 seats.',
    organizer_name: 'BrainBox Academy',
    organizer_verified: true,
    venue: 'Clubhouse Meeting Room, Tower C',
    venue_area: 'Kondapur',
    start_date: nextDate(7),
    start_time: '10:00 AM',
    duration_mins: 180,
    is_free: false,
    price_individual: 799,
    visibility: 'MEMBERS_ONLY',
    community_tag: 'Aparna Sarovar',
    capacity: 20,
    registered_count: 14,
    status: 'UPCOMING',
    is_featured: true,
    tags: ['Kids', 'STEM', 'Coding', 'Robotics', 'Workshop'],
    age_suitability: 'Ages 8–14',
    refund_policy: '50% refund if cancelled 72h before',
  },
  {
    id: 'exp-004',
    title: 'Weekend Badminton League',
    category: 'SPORTS',
    emoji: '🏸',
    backdrop_color: '#14532D',
    description: 'Join the community\'s weekend badminton doubles league. Open to all skill levels. Matches played every Saturday and Sunday morning. Registration includes a season schedule and court booking.',
    organizer_name: 'Mana Sports Club',
    organizer_verified: true,
    venue: 'Indoor Sports Complex, Block B',
    venue_area: 'Manikonda',
    start_date: nextDate(4),
    end_date: nextDate(32),
    start_time: '6:30 AM',
    duration_mins: 120,
    is_free: false,
    price_individual: 599,
    visibility: 'MEMBERS_ONLY',
    community_tag: 'Mana Serene',
    capacity: 32,
    registered_count: 24,
    status: 'UPCOMING',
    is_featured: false,
    tags: ['Sports', 'Badminton', 'League', 'Fitness', 'Morning'],
    age_suitability: '16+',
    refund_policy: 'No refund after league begins',
  },
  {
    id: 'exp-005',
    title: 'Stand-Up Comedy Night',
    category: 'LIVE_EVENTS',
    emoji: '🎤',
    backdrop_color: '#4A044E',
    description: 'An evening of laughter with Hyderabad\'s top stand-up comedians. Featuring 4 acts over 90 minutes, hosted by Abhinav Anand. Bar seating available. 18+ event. Strictly no recording.',
    organizer_name: 'Laugh Factory Hyd',
    organizer_verified: true,
    venue: 'The Humming Tree, Banjara Hills',
    venue_area: 'Banjara Hills',
    start_date: nextDate(6),
    start_time: '7:30 PM',
    duration_mins: 100,
    is_free: false,
    price_individual: 699,
    price_group: 599,
    group_min_size: 8,
    group_current_size: 5,
    group_deadline: nextDate(4),
    visibility: 'OPEN',
    capacity: 150,
    registered_count: 118,
    status: 'UPCOMING',
    is_featured: true,
    tags: ['Comedy', 'Live', 'Adults', 'Evening', 'Entertainment'],
    age_suitability: '18+',
    refund_policy: 'No refund within 24h of show',
  },
  {
    id: 'exp-006',
    title: 'Watercolor Painting for Beginners',
    category: 'WORKSHOPS',
    emoji: '🎨',
    backdrop_color: '#7C3AED',
    description: 'Learn the basics of watercolor painting in this 3-hour workshop. No prior art experience needed. All materials provided. You\'ll take home your own finished painting.',
    organizer_name: 'Studio 12 Art Space',
    organizer_verified: false,
    venue: 'Community Hall, Ground Floor',
    venue_area: 'Gachibowli',
    start_date: nextDate(9),
    start_time: '3:00 PM',
    duration_mins: 180,
    is_free: false,
    price_individual: 999,
    visibility: 'OPEN',
    capacity: 15,
    registered_count: 9,
    status: 'UPCOMING',
    is_featured: false,
    tags: ['Art', 'Workshop', 'Beginners', 'Creative', 'Adults'],
    age_suitability: '14+',
    refund_policy: '75% refund if cancelled 5 days before',
  },
  {
    id: 'exp-007',
    title: 'Community Yoga & Wellness Morning',
    category: 'OUTINGS',
    emoji: '🧘',
    backdrop_color: '#0F766E',
    description: 'Start your weekend right with a guided yoga and meditation session at the rooftop garden. Suitable for beginners to intermediate practitioners. Bring your own mat. Healthy breakfast served after the session.',
    organizer_name: 'Mana Wellness Club',
    organizer_verified: true,
    venue: 'Rooftop Garden, Tower D',
    venue_area: 'Kondapur',
    start_date: nextDate(2),
    start_time: '6:00 AM',
    duration_mins: 90,
    is_free: true,
    visibility: 'MEMBERS_ONLY',
    community_tag: 'Prestige Nirvana',
    capacity: 30,
    registered_count: 22,
    status: 'UPCOMING',
    is_featured: false,
    tags: ['Yoga', 'Wellness', 'Morning', 'Community', 'Free'],
    age_suitability: 'All ages',
    refund_policy: 'Free event',
  },
  {
    id: 'exp-008',
    title: 'Chess Tournament – Community Cup',
    category: 'SPORTS',
    emoji: '♟️',
    backdrop_color: '#1C1917',
    description: 'The annual Mana Community Chess Tournament. Open to all residents aged 12 and above. Swiss format, 6 rounds. Prizes: ₹3,000 · ₹1,500 · ₹750. Register before seats fill up.',
    organizer_name: 'Chess Club Mana',
    organizer_verified: true,
    venue: 'Community Library, Block A',
    venue_area: 'Miyapur',
    start_date: nextDate(10),
    start_time: '9:00 AM',
    duration_mins: 360,
    is_free: true,
    visibility: 'MEMBERS_ONLY',
    community_tag: 'Mana Serene',
    capacity: 48,
    registered_count: 31,
    status: 'UPCOMING',
    is_featured: false,
    tags: ['Chess', 'Tournament', 'Competition', 'Community', 'Free'],
    age_suitability: '12+',
    refund_policy: 'Free event',
  },
  {
    id: 'exp-009',
    title: 'Carnatic Music Evening',
    category: 'LIVE_EVENTS',
    emoji: '🎵',
    backdrop_color: '#9D2335',
    description: 'An intimate Carnatic classical music performance by Vidushi Lalitha Prasad accompanied by her students. Features ragas Bhairavi, Todi, and Kalyani. Post-performance tea and prasadam for all attendees.',
    organizer_name: 'Sangeetha Sabha Hyd',
    organizer_verified: true,
    venue: 'Banquet Hall, Block C',
    venue_area: 'Kondapur',
    start_date: nextDate(12),
    start_time: '6:00 PM',
    duration_mins: 120,
    is_free: true,
    visibility: 'OPEN',
    capacity: 100,
    registered_count: 67,
    status: 'UPCOMING',
    is_featured: false,
    tags: ['Music', 'Classical', 'Carnatic', 'Cultural', 'Evening'],
    age_suitability: 'All ages',
    refund_policy: 'Free event',
  },
  {
    id: 'exp-010',
    title: 'Family Heritage Walk – Old City',
    category: 'OUTINGS',
    emoji: '🕌',
    backdrop_color: '#92400E',
    description: 'A guided heritage walk through the historic lanes of Old Hyderabad — Charminar, Laad Bazaar, Mecca Masjid and Golconda Fort. Includes a biryani lunch at a heritage eatery. Bus transport from community gates.',
    organizer_name: 'Hyderabad Walks',
    organizer_verified: true,
    venue: 'Departure from Society Gate 1',
    venue_area: 'Miyapur (departure)',
    start_date: nextDate(14),
    end_date: nextDate(14),
    start_time: '7:00 AM',
    duration_mins: 540,
    is_free: false,
    price_individual: 1499,
    price_group: 1199,
    group_min_size: 15,
    group_current_size: 11,
    group_deadline: nextDate(11),
    visibility: 'OPEN',
    capacity: 30,
    registered_count: 18,
    status: 'UPCOMING',
    is_featured: true,
    tags: ['Heritage', 'Culture', 'Outing', 'Family', 'History'],
    age_suitability: 'All ages (6+ for the walk)',
    refund_policy: '80% refund if cancelled 5 days before',
  },
  {
    id: 'exp-011',
    title: 'Online: Personal Finance Masterclass',
    category: 'ONLINE',
    emoji: '💰',
    backdrop_color: '#064E3B',
    description: 'A 2-hour live online masterclass covering mutual funds, SIPs, tax-saving instruments, and building a financial plan for 2025. By SEBI-registered financial advisor Prakash Mehta.',
    organizer_name: 'Mana Finance Academy',
    organizer_verified: true,
    venue: 'Zoom Webinar',
    venue_area: 'Online',
    start_date: nextDate(1),
    start_time: '7:00 PM',
    duration_mins: 120,
    is_free: false,
    price_individual: 299,
    visibility: 'OPEN',
    capacity: 500,
    registered_count: 312,
    status: 'UPCOMING',
    is_featured: false,
    tags: ['Finance', 'Online', 'Webinar', 'Investment', 'Learning'],
    age_suitability: '18+',
    refund_policy: 'Full refund if cancelled before event',
  },
  {
    id: 'exp-012',
    title: 'Summer Swimming Camp – Kids',
    category: 'KIDS_FAMILY',
    emoji: '🏊',
    backdrop_color: '#075985',
    description: 'A 4-week structured swimming program for children aged 5–15. Beginners to advanced batches. Certified coaches, 1:8 coach ratio. Morning and evening batches available. Swim kit included.',
    organizer_name: 'AquaKids Academy',
    organizer_verified: true,
    venue: 'Community Swimming Pool',
    venue_area: 'Manikonda',
    start_date: nextDate(7),
    end_date: nextDate(35),
    start_time: '6:00 AM / 5:00 PM',
    duration_mins: 60,
    is_free: false,
    price_individual: 3499,
    visibility: 'MEMBERS_ONLY',
    community_tag: 'Aparna Sarovar',
    capacity: 40,
    registered_count: 28,
    status: 'UPCOMING',
    is_featured: false,
    tags: ['Swimming', 'Kids', 'Summer Camp', 'Sports', 'Training'],
    age_suitability: 'Ages 5–15',
    refund_policy: '50% refund before camp begins',
  },
  {
    id: 'exp-013',
    title: 'Diwali Mela – Community Celebration',
    category: 'LIVE_EVENTS',
    emoji: '🪔',
    backdrop_color: '#78350F',
    description: 'Join the biggest Diwali celebration in our community! Rangoli competition, fireworks display (11 PM), live music, food stalls, games for kids, and cultural performances. Free for all residents and their guests.',
    organizer_name: 'Mana Community Events',
    organizer_verified: true,
    venue: 'Central Courtyard & Gardens',
    venue_area: 'Kondapur',
    start_date: nextDate(18),
    start_time: '5:00 PM',
    duration_mins: 360,
    is_free: true,
    visibility: 'MEMBERS_ONLY',
    community_tag: 'All Mana Communities',
    capacity: 1000,
    registered_count: 654,
    status: 'UPCOMING',
    is_featured: true,
    tags: ['Diwali', 'Festival', 'Community', 'Free', 'Cultural', 'Family'],
    age_suitability: 'All ages',
    refund_policy: 'Free event',
  },
];

const MOCK_BOOKINGS: ExperienceBooking[] = [
  {
    booking_id: 'EXP-BK-2025-0041',
    experience_id: 'exp-001',
    experience_title: 'Mana Community Movie Night',
    category: 'MOVIES',
    emoji: '🎬',
    backdrop_color: '#1A1A2E',
    ticket_type: 'FAMILY',
    attendee_count: 3,
    total_amount: 0,
    status: 'CONFIRMED',
    booked_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    qr_data: 'EXP-BK-2025-0041|exp-001|FAMILY|3|FREE',
    qr_pass_code: 'EXP-BK-2025-0041',
    venue: 'Community Amphitheatre, Block A',
    start_date: nextDate(3),
    start_time: '8:00 PM',
  },
  {
    booking_id: 'EXP-BK-2025-0039',
    experience_id: 'exp-005',
    experience_title: 'Stand-Up Comedy Night',
    category: 'LIVE_EVENTS',
    emoji: '🎤',
    backdrop_color: '#4A044E',
    ticket_type: 'GENERAL',
    attendee_count: 2,
    total_amount: 1398,
    status: 'CONFIRMED',
    booked_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    qr_data: 'EXP-BK-2025-0039|exp-005|GENERAL|2|1398',
    qr_pass_code: 'EXP-BK-2025-0039',
    venue: 'The Humming Tree, Banjara Hills',
    start_date: nextDate(6),
    start_time: '7:30 PM',
    payment_ref: 'UPI-TXN-9823741',
  },
];

// ── P3 Mock Data ─────────────────────────────────────────────────────────────

export const PARTNER_CATEGORY_META: Record<PartnerCategory, { label: string; emoji: string; color: string; bg: string }> = {
  RESTAURANT:       { label: 'Restaurant',      emoji: '🍽️', color: '#B45309', bg: '#FEF3C7' },
  SPORTS_VENUE:     { label: 'Sports Venue',    emoji: '🏟️', color: '#047857', bg: '#D1FAE5' },
  ACTIVITY_CENTER:  { label: 'Activity Center', emoji: '🎯', color: '#7C3AED', bg: '#EDE9FE' },
  COACHING:         { label: 'Coaching',        emoji: '🏅', color: '#0891B2', bg: '#ECFEFF' },
  ENTERTAINMENT:    { label: 'Entertainment',   emoji: '🎪', color: '#DB2777', bg: '#FCE7F3' },
  WELLNESS:         { label: 'Wellness',        emoji: '🧘', color: '#059669', bg: '#ECFDF5' },
  RETAIL:           { label: 'Retail',          emoji: '🛍️', color: '#2563EB', bg: '#DBEAFE' },
};

const MOCK_PARTNERS: Partner[] = [
  {
    id: 'prt-001',
    name: 'Chaitime Community Café',
    category: 'RESTAURANT',
    emoji: '☕',
    backdrop_color: '#78350F',
    tagline: 'Your neighbourhood third place',
    description: 'A community café attached to Mana Township offering breakfast, chai, snacks, and work-from-café seating. Popular for resident meetups and small group events.',
    address: 'Ground Floor, Tower A Community Block',
    area: 'Kondapur',
    rating: 4.6,
    review_count: 142,
    is_verified: true,
    is_featured: true,
    discount_for_members: '10% off for Mana residents',
    contact_phone: '9876543210',
    amenities: ['WiFi', 'Parking', 'Outdoor Seating', 'Private Event Space'],
    photos_count: 18,
    open_hours: '7 AM – 10 PM',
    price_range: '₹₹',
    experience_ids: ['exp-001'],
  },
  {
    id: 'prt-002',
    name: 'AquaArena Sports Complex',
    category: 'SPORTS_VENUE',
    emoji: '🏊',
    backdrop_color: '#1E3A5F',
    tagline: 'Olympic-standard facilities, community prices',
    description: 'A multi-sport complex with 50m swimming pool, tennis courts, badminton hall, squash courts, and indoor cricket nets. Certified coaches for all sports.',
    address: '23, Sports City Road',
    area: 'Gachibowli',
    rating: 4.8,
    review_count: 286,
    is_verified: true,
    is_featured: true,
    discount_for_members: '20% off membership for Mana residents',
    contact_phone: '9123456789',
    booking_url: 'https://aquaarena.example.com/book',
    amenities: ['Pool', 'Tennis', 'Badminton', 'Squash', 'Cricket', 'Locker Rooms', 'Café'],
    photos_count: 34,
    open_hours: '5 AM – 11 PM',
    price_range: '₹₹₹',
    experience_ids: ['exp-003', 'exp-012'],
  },
  {
    id: 'prt-003',
    name: 'MindBody Wellness Studio',
    category: 'WELLNESS',
    emoji: '🧘',
    backdrop_color: '#064E3B',
    tagline: 'Yoga, meditation & holistic wellness',
    description: 'A premium wellness studio offering yoga, pilates, meditation, and Ayurvedic therapies. Classes run morning and evening. Certified instructors with 10+ years experience.',
    address: 'Level 2, Mana Wellness Wing',
    area: 'Miyapur',
    rating: 4.9,
    review_count: 198,
    is_verified: true,
    is_featured: false,
    discount_for_members: 'First class free for residents',
    amenities: ['Yoga Studio', 'Meditation Room', 'Spa', 'Juice Bar', 'Changing Rooms'],
    photos_count: 22,
    open_hours: '5:30 AM – 9 PM',
    price_range: '₹₹₹',
  },
  {
    id: 'prt-004',
    name: 'GameZone Entertainment Hub',
    category: 'ENTERTAINMENT',
    emoji: '🎮',
    backdrop_color: '#4A044E',
    tagline: 'Indoor gaming for all ages',
    description: 'Bowling, laser tag, arcade games, VR experiences and a food court. Perfect for birthday parties, team outings and family fun. Hosts private events up to 200 pax.',
    address: 'Inorbit Mall, Level 3',
    area: 'Hitec City',
    rating: 4.4,
    review_count: 312,
    is_verified: true,
    is_featured: true,
    discount_for_members: 'Flat ₹100 off on group bookings of 10+',
    booking_url: 'https://gamezone.example.com',
    amenities: ['Bowling', 'Laser Tag', 'VR', 'Arcade', 'Food Court', 'Party Hall'],
    photos_count: 29,
    open_hours: '10 AM – 11 PM',
    price_range: '₹₹',
  },
  {
    id: 'prt-005',
    name: 'Elite Cricket Academy',
    category: 'COACHING',
    emoji: '🏏',
    backdrop_color: '#14532D',
    tagline: 'Former Ranji-level coaches · All age groups',
    description: 'Professional cricket coaching for children (age 8+) and adults. Batting, bowling, and wicket-keeping specialisations. Residential camp option available in summer.',
    address: 'Mana Sports Ground, Gate 3',
    area: 'Manikonda',
    rating: 4.7,
    review_count: 94,
    is_verified: true,
    is_featured: false,
    discount_for_members: '15% off annual membership',
    contact_phone: '9988776655',
    amenities: ['Turf Pitch', 'Nets', 'Video Analysis', 'Gym', 'Changing Rooms'],
    photos_count: 16,
    open_hours: '6 AM – 8 AM, 5 PM – 8 PM',
    price_range: '₹₹',
  },
  {
    id: 'prt-006',
    name: 'Decathlon Kondapur',
    category: 'RETAIL',
    emoji: '🛒',
    backdrop_color: '#1D4ED8',
    tagline: 'Sports gear, rentals & try-before-you-buy',
    description: 'Full-range Decathlon outlet with sports equipment rental for residents. Try-out zone for rackets and fitness equipment. Staff knowledgeable in all sports categories.',
    address: 'Kondapur Main Road',
    area: 'Kondapur',
    rating: 4.5,
    review_count: 521,
    is_verified: true,
    is_featured: false,
    discount_for_members: '5% extra on already-discounted items',
    website_url: 'https://decathlon.in',
    amenities: ['Rental', 'Try-out Zone', 'Repair Service', 'Parking'],
    photos_count: 12,
    open_hours: '9 AM – 10 PM',
    price_range: '₹₹',
  },
];

const MOCK_REVIEWS: ExperienceReview[] = [
  {
    review_id: 'rev-001', experience_id: 'exp-001',
    reviewer_name: 'Priya Reddy', reviewer_initials: 'PR', rating: 5,
    title: 'Best community event this year!',
    body: 'Amazing movie choice, projector quality was great and the community vibe was fantastic. Loved the free popcorn and the discussions afterwards. Definitely coming for the next one.',
    attended_date: nextDate(-7), created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    helpful_count: 14, verified_attendee: true, photos_count: 3,
  },
  {
    review_id: 'rev-002', experience_id: 'exp-001',
    reviewer_name: 'Kiran Kumar', reviewer_initials: 'KK', rating: 4,
    title: 'Great atmosphere, minor sound issue early on',
    body: 'Thoroughly enjoyed the event. The sound had a small glitch at the start but was sorted within 10 minutes. Organisation was smooth, seating was comfortable and the crowd was very friendly.',
    attended_date: nextDate(-7), created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    helpful_count: 8, verified_attendee: true, photos_count: 1,
  },
  {
    review_id: 'rev-003', experience_id: 'exp-005',
    reviewer_name: 'Ananya Singh', reviewer_initials: 'AS', rating: 5,
    title: 'Incredible comedians, totally worth it',
    body: 'All three comedians were hilarious. Rohan Joshi was the highlight. The venue at Humming Tree was perfect — intimate yet professional. Definitely booking the next one already.',
    attended_date: nextDate(-14), created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    helpful_count: 22, verified_attendee: true, photos_count: 5,
  },
  {
    review_id: 'rev-004', experience_id: 'exp-003',
    reviewer_name: 'Rahul Verma', reviewer_initials: 'RV', rating: 4,
    title: 'Good workshop, great for beginners',
    body: 'Coach Ravi was patient and explained everything clearly. Would have liked slightly longer batting practice time. Overall a solid 2-hour session and good value for money.',
    attended_date: nextDate(-21), created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    helpful_count: 6, verified_attendee: true, photos_count: 0,
  },
];

const MOCK_COACHING: CoachingSession[] = [
  {
    session_id: 'cch-001', partner_id: 'prt-005', partner_name: 'Elite Cricket Academy',
    sport: 'Cricket', emoji: '🏏', coach_name: 'Ravi Shankar', level: 'ALL',
    coach_bio: 'Former Ranji Trophy player (Hyderabad). 12 years coaching experience. Specialises in batting and fielding drills.',
    duration_mins: 90, price_per_session: 599, group_size_max: 12,
    available_slots: [
      { date: nextDate(1), time: '6:00 AM', spots_left: 4 },
      { date: nextDate(2), time: '5:30 PM', spots_left: 7 },
      { date: nextDate(4), time: '6:00 AM', spots_left: 10 },
    ],
    venue: 'Mana Sports Ground, Gate 3', area: 'Manikonda',
  },
  {
    session_id: 'cch-002', partner_id: 'prt-002', partner_name: 'AquaArena Sports Complex',
    sport: 'Swimming', emoji: '🏊', coach_name: 'Sunita Rao', level: 'BEGINNER',
    coach_bio: 'National-level swimmer, RLSS certified coach. 8 years teaching all age groups from toddlers to adults.',
    duration_mins: 60, price_per_session: 399, group_size_max: 8,
    available_slots: [
      { date: nextDate(1), time: '7:00 AM', spots_left: 3 },
      { date: nextDate(3), time: '7:00 AM', spots_left: 6 },
    ],
    venue: 'AquaArena Sports Complex', area: 'Gachibowli',
  },
  {
    session_id: 'cch-003', partner_id: 'prt-002', partner_name: 'AquaArena Sports Complex',
    sport: 'Badminton', emoji: '🏸', coach_name: 'Deepak Naidu', level: 'INTERMEDIATE',
    coach_bio: 'State-level shuttler. Coach for 6 years focusing on footwork, smash technique, and doubles strategy.',
    duration_mins: 75, price_per_session: 499, group_size_max: 6,
    available_slots: [
      { date: nextDate(2), time: '6:30 PM', spots_left: 2 },
      { date: nextDate(5), time: '7:00 AM', spots_left: 5 },
    ],
    venue: 'AquaArena Sports Complex', area: 'Gachibowli',
  },
  {
    session_id: 'cch-004', partner_id: 'prt-003', partner_name: 'MindBody Wellness Studio',
    sport: 'Yoga', emoji: '🧘', coach_name: 'Meera Iyer', level: 'ALL',
    coach_bio: 'RYT-500 certified instructor. 10 years practice. Specialises in Hatha, Vinyasa and Pranayama.',
    duration_mins: 60, price_per_session: 349, group_size_max: 15,
    available_slots: [
      { date: nextDate(1), time: '6:30 AM', spots_left: 8 },
      { date: nextDate(1), time: '7:30 PM', spots_left: 11 },
      { date: nextDate(3), time: '6:30 AM', spots_left: 10 },
    ],
    venue: 'MindBody Wellness Studio, Level 2', area: 'Miyapur',
  },
];

// ── Service ──────────────────────────────────────────────────────────────────

export const experiencesService = {
  async getExperiences(params?: {
    category?: ExperienceCategory;
    query?: string;
    community?: string;
    featured?: boolean;
  }): Promise<Experience[]> {
    try {
      const qs = new URLSearchParams();
      if (params?.category) qs.set('category', params.category);
      if (params?.query) qs.set('q', params.query);
      if (params?.community) qs.set('community', params.community);
      if (params?.featured) qs.set('featured', 'true');
      const r = await fetch(`${API_BASE}/v1/experiences?${qs}`);
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d) && d.length > 0) return d;
      }
    } catch {}
    let result = [...MOCK_EXPERIENCES];
    if (params?.category) result = result.filter(e => e.category === params.category);
    if (params?.query) {
      const q = params.query.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (params?.featured) result = result.filter(e => e.is_featured);
    return result;
  },

  async getExperience(id: string): Promise<Experience | null> {
    try {
      const r = await fetch(`${API_BASE}/v1/experiences/${id}`);
      if (r.ok) return r.json();
    } catch {}
    return MOCK_EXPERIENCES.find(e => e.id === id) ?? null;
  },

  async getMyBookings(): Promise<ExperienceBooking[]> {
    try {
      const r = await fetch(`${API_BASE}/v1/experiences/my-bookings`, {
        headers: { 'Authorization': 'Bearer mock' },
      });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d)) return d;
      }
    } catch {}
    return MOCK_BOOKINGS;
  },

  async bookExperience(req: BookingRequest): Promise<ExperienceBooking> {
    try {
      const r = await fetch(`${API_BASE}/v1/experiences/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (r.ok) {
        const d = await r.json();
        if (d?.booking_id) return d;
      }
    } catch {}
    const exp = MOCK_EXPERIENCES.find(e => e.id === req.experience_id)!;
    const bookingId = `EXP-BK-${Date.now()}`;
    const amount = exp.is_free
      ? 0
      : req.is_group_booking && exp.price_group
        ? exp.price_group * req.attendee_count
        : (exp.price_individual ?? 0) * req.attendee_count;
    const tr = `EXP-TXN-${Date.now()}`;
    return {
      booking_id: bookingId,
      experience_id: req.experience_id,
      experience_title: exp.title,
      category: exp.category,
      emoji: exp.emoji,
      backdrop_color: exp.backdrop_color,
      ticket_type: req.ticket_type,
      attendee_count: req.attendee_count,
      total_amount: amount,
      status: 'CONFIRMED',
      booked_at: new Date().toISOString(),
      qr_data: `${bookingId}|${req.experience_id}|${req.ticket_type}|${req.attendee_count}|${amount}`,
      qr_pass_code: bookingId,
      venue: exp.venue,
      start_date: exp.start_date,
      start_time: exp.start_time,
      ...(amount > 0 && {
        payment_ref: tr,
        upi_intent_url: `upi://pay?pa=experiences@setu&pn=Mana+Experiences&am=${amount.toFixed(2)}&cu=INR&tr=${tr}&tn=Experience+${bookingId}`,
      }),
    };
  },

  async cancelBooking(bookingId: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/v1/experiences/bookings/${bookingId}/cancel`, { method: 'POST' });
    } catch {}
  },

  // ── P2 Methods ──────────────────────────────────────────────────────────────

  async validateCoupon(code: string, experienceId: string, originalAmount: number): Promise<CouponResult> {
    try {
      const r = await fetch(`${API_BASE}/v1/experiences/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, experience_id: experienceId, amount: originalAmount }),
      });
      if (r.ok) return r.json();
    } catch {}
    const MOCK_COUPONS: Record<string, { type: 'PERCENT' | 'FLAT'; value: number }> = {
      'MANA10':   { type: 'PERCENT', value: 10 },
      'FLAT200':  { type: 'FLAT',    value: 200 },
      'SAVE50':   { type: 'PERCENT', value: 50 },
      'WELCOME':  { type: 'FLAT',    value: 100 },
    };
    const coupon = MOCK_COUPONS[code.toUpperCase()];
    if (!coupon) {
      return { valid: false, code, discount_type: 'FLAT', discount_value: 0, discount_amount: 0, final_amount: originalAmount, message: 'Invalid coupon code' };
    }
    const discount = coupon.type === 'PERCENT'
      ? Math.round((originalAmount * coupon.value) / 100)
      : Math.min(coupon.value, originalAmount);
    return {
      valid: true,
      code: code.toUpperCase(),
      discount_type: coupon.type,
      discount_value: coupon.value,
      discount_amount: discount,
      final_amount: originalAmount - discount,
      message: coupon.type === 'PERCENT' ? `${coupon.value}% off applied!` : `₹${coupon.value} off applied!`,
    };
  },

  async joinWaitlist(experienceId: string, name: string, phone: string): Promise<WaitlistEntry> {
    try {
      const r = await fetch(`${API_BASE}/v1/experiences/${experienceId}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      if (r.ok) return r.json();
    } catch {}
    return {
      waitlist_id: `WL-${Date.now()}`,
      experience_id: experienceId,
      position: Math.floor(Math.random() * 5) + 1,
      name,
      phone,
      joined_at: new Date().toISOString(),
    };
  },

  async requestRefund(bookingId: string, reason: string, amount: number): Promise<RefundRequest> {
    try {
      const r = await fetch(`${API_BASE}/v1/experiences/bookings/${bookingId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, amount }),
      });
      if (r.ok) return r.json();
    } catch {}
    return {
      refund_id: `REF-${Date.now()}`,
      booking_id: bookingId,
      reason,
      amount_requested: amount,
      status: 'REQUESTED',
      requested_at: new Date().toISOString(),
      estimated_days: 5,
    };
  },

  async getMyOrganizedExperiences(): Promise<Experience[]> {
    try {
      const r = await fetch(`${API_BASE}/v1/experiences/my-organized`, {
        headers: { 'Authorization': 'Bearer mock' },
      });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d)) return d;
      }
    } catch {}
    return MOCK_EXPERIENCES.filter(e => e.organizer_verified).slice(0, 4);
  },

  async getOrganizerReport(experienceId: string): Promise<OrganizerReport> {
    try {
      const r = await fetch(`${API_BASE}/v1/experiences/${experienceId}/organizer-report`, {
        headers: { 'Authorization': 'Bearer mock' },
      });
      if (r.ok) return r.json();
    } catch {}
    const exp = MOCK_EXPERIENCES.find(e => e.id === experienceId)!;
    const grossRevenue = exp.is_free ? 0 : (exp.price_individual ?? 0) * exp.registered_count;
    const platformFee = Math.round(grossRevenue * 0.05);
    const mockAttendees: OrganizerAttendee[] = Array.from({ length: Math.min(exp.registered_count, 8) }, (_, i) => ({
      booking_id: `EXP-BK-${1000 + i}`,
      name: ['Priya Reddy', 'Kiran Kumar', 'Ananya Singh', 'Rahul Verma', 'Sunita Patel', 'Arun Sharma', 'Deepa Nair', 'Vijay Iyer'][i],
      phone: `98${String(40000000 + i * 1111111).slice(0, 8)}`,
      ticket_type: ['GENERAL', 'FAMILY', 'GROUP', 'GENERAL', 'VIP', 'GENERAL', 'FAMILY', 'GENERAL'][i] as string,
      attendee_count: [1, 3, 5, 2, 1, 1, 2, 1][i],
      amount_paid: exp.is_free ? 0 : ([699, 0, 3495, 1398, 699, 699, 1398, 699][i] as number),
      status: (['CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'ATTENDED', 'CONFIRMED', 'ATTENDED', 'CANCELLED', 'CONFIRMED'][i]) as BookingStatus,
      booked_at: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
      checked_in: [false, false, false, true, false, true, false, false][i],
      checked_in_at: [undefined, undefined, undefined, new Date(Date.now() - 3600000).toISOString(), undefined, new Date(Date.now() - 3600000).toISOString(), undefined, undefined][i],
      coupon_used: i === 1 ? 'MANA10' : undefined,
      refund_status: i === 6 ? 'REQUESTED' : 'NONE',
    }));
    return {
      experience_id: experienceId,
      experience_title: exp.title,
      emoji: exp.emoji,
      backdrop_color: exp.backdrop_color,
      start_date: exp.start_date,
      venue: exp.venue,
      capacity: exp.capacity,
      registered_count: exp.registered_count,
      checked_in_count: mockAttendees.filter(a => a.checked_in).length,
      gross_revenue: grossRevenue,
      platform_fee: platformFee,
      net_settlement: grossRevenue - platformFee,
      refunds_total: mockAttendees.filter(a => a.refund_status === 'REQUESTED' || a.refund_status === 'PROCESSED').reduce((s, a) => s + a.amount_paid, 0),
      ticket_breakdown: [
        { type: 'General', count: mockAttendees.filter(a => a.ticket_type === 'GENERAL').length, revenue: mockAttendees.filter(a => a.ticket_type === 'GENERAL').reduce((s, a) => s + a.amount_paid, 0) },
        { type: 'Family', count: mockAttendees.filter(a => a.ticket_type === 'FAMILY').length, revenue: mockAttendees.filter(a => a.ticket_type === 'FAMILY').reduce((s, a) => s + a.amount_paid, 0) },
        { type: 'Group', count: mockAttendees.filter(a => a.ticket_type === 'GROUP').length, revenue: mockAttendees.filter(a => a.ticket_type === 'GROUP').reduce((s, a) => s + a.amount_paid, 0) },
      ].filter(t => t.count > 0),
      coupon_usage_count: mockAttendees.filter(a => a.coupon_used).length,
      attendees: mockAttendees,
    };
  },

  // ── P3 Methods ──────────────────────────────────────────────────────────────

  async getPartners(category?: PartnerCategory): Promise<Partner[]> {
    try {
      const qs = category ? `?category=${category}` : '';
      const r = await fetch(`${API_BASE}/v1/experiences/partners${qs}`);
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d) && d.length > 0) return d;
      }
    } catch {}
    let result = [...MOCK_PARTNERS];
    if (category) result = result.filter(p => p.category === category);
    return result;
  },

  async getPartner(id: string): Promise<Partner | null> {
    try {
      const r = await fetch(`${API_BASE}/v1/experiences/partners/${id}`);
      if (r.ok) return r.json();
    } catch {}
    return MOCK_PARTNERS.find(p => p.id === id) ?? null;
  },

  async getExperienceReviews(experienceId: string): Promise<ExperienceReview[]> {
    try {
      const r = await fetch(`${API_BASE}/v1/experiences/${experienceId}/reviews`);
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d)) return d;
      }
    } catch {}
    return MOCK_REVIEWS.filter(rev => rev.experience_id === experienceId);
  },

  async submitReview(req: ReviewRequest): Promise<ExperienceReview> {
    try {
      const r = await fetch(`${API_BASE}/v1/experiences/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (r.ok) return r.json();
    } catch {}
    return {
      review_id: `REV-${Date.now()}`,
      experience_id: req.experience_id,
      reviewer_name: 'You',
      reviewer_initials: 'YO',
      rating: req.rating,
      title: req.title,
      body: req.body,
      attended_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      helpful_count: 0,
      verified_attendee: true,
      photos_count: 0,
    };
  },

  async getCoachingSessions(sport?: string): Promise<CoachingSession[]> {
    try {
      const qs = sport ? `?sport=${sport}` : '';
      const r = await fetch(`${API_BASE}/v1/experiences/coaching${qs}`);
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d) && d.length > 0) return d;
      }
    } catch {}
    let result = [...MOCK_COACHING];
    if (sport) result = result.filter(s => s.sport.toLowerCase().includes(sport.toLowerCase()));
    return result;
  },

  // ── P4 Mana Buddy AI ────────────────────────────────────────────────────────

  async getUserInterests(): Promise<InterestTag[]> {
    try {
      const r = await fetch(`${API_BASE}/v1/experiences/buddy/interests`);
      if (r.ok) return r.json();
    } catch {}
    return ['CRICKET', 'MOVIES', 'YOGA'];
  },

  async saveUserInterests(interests: InterestTag[]): Promise<void> {
    try {
      await fetch(`${API_BASE}/v1/experiences/buddy/interests`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests }),
      });
    } catch {}
  },

  async getBuddyRecommendations(interests: InterestTag[]): Promise<BuddyRecommendation[]> {
    try {
      const r = await fetch(`${API_BASE}/v1/experiences/buddy/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests }),
      });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d) && d.length > 0) return d;
      }
    } catch {}
    const all = await experiencesService.getExperiences();
    const tagToCategory: Partial<Record<InterestTag, ExperienceCategory>> = {
      CRICKET: 'SPORTS', SWIMMING: 'SPORTS', BADMINTON: 'SPORTS',
      FOOTBALL: 'SPORTS', TENNIS: 'SPORTS', CYCLING: 'SPORTS',
      YOGA: 'WORKSHOPS', FITNESS: 'WORKSHOPS', DANCE: 'WORKSHOPS',
      MEDITATION: 'WORKSHOPS', COOKING: 'WORKSHOPS', PHOTOGRAPHY: 'WORKSHOPS',
      ART_CRAFTS: 'WORKSHOPS', READING: 'WORKSHOPS',
      MOVIES: 'MOVIES', MUSIC: 'LIVE_EVENTS', THEATRE: 'LIVE_EVENTS',
      COMEDY: 'LIVE_EVENTS', TREKKING: 'OUTINGS', TRAVEL: 'OUTINGS',
      GAMING: 'ONLINE', KIDS_ACTIVITIES: 'KIDS_FAMILY',
    };
    const reasons: Record<string, string> = {
      SPORTS: 'Matches your sports interest',
      WORKSHOPS: 'Based on your wellness & hobby picks',
      MOVIES: 'Top pick for movie lovers',
      LIVE_EVENTS: 'Trending in your community',
      OUTINGS: 'Great for your adventurous spirit',
      ONLINE: 'Popular with residents like you',
      KIDS_FAMILY: 'Perfect for family time',
    };
    const categories = new Set(interests.map(i => tagToCategory[i]).filter(Boolean));
    const matched = all.filter(e => categories.has(e.category)).slice(0, 5);
    return matched.map(e => ({
      experience: e,
      reason: reasons[e.category] ?? 'Recommended for you',
      match_score: Math.floor(70 + Math.random() * 28),
    }));
  },

  async buildItinerary(interests: InterestTag[], weekend: 'THIS' | 'NEXT'): Promise<ItineraryItem[]> {
    try {
      const r = await fetch(`${API_BASE}/v1/experiences/buddy/itinerary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests, weekend }),
      });
      if (r.ok) {
        const d = await r.json();
        if (Array.isArray(d) && d.length > 0) return d;
      }
    } catch {}
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToSat = weekend === 'THIS' ? (6 - dayOfWeek + 7) % 7 || 7 : (6 - dayOfWeek + 7) % 7 + 7;
    const sat = new Date(now); sat.setDate(now.getDate() + daysToSat);
    const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    return [
      { experience_id: 'exp-001', experience_title: 'Saturday Morning Yoga', emoji: '🧘', backdrop_color: '#059669', date: fmt(sat), start_time: '07:00', venue: 'Club Lawn', venue_area: 'Phase 1', is_free: true, notes: 'Bring your mat' },
      { experience_id: 'exp-003', experience_title: 'Community Cricket Match', emoji: '🏏', backdrop_color: '#0891B2', date: fmt(sat), start_time: '10:00', venue: 'Sports Complex', venue_area: 'Block D', price: 150, is_free: false, notes: 'Gear provided' },
      { experience_id: 'exp-005', experience_title: 'Bollywood Movie Night', emoji: '🎬', backdrop_color: '#7C3AED', date: fmt(sat), start_time: '19:00', venue: 'Community Hall', venue_area: 'Main Block', price: 200, is_free: false, notes: 'Popcorn included 🍿' },
      { experience_id: 'exp-002', experience_title: 'Sunday Photography Walk', emoji: '📸', backdrop_color: '#D97706', date: fmt(sun), start_time: '06:30', venue: 'Garden Walk', venue_area: 'East Wing', is_free: true, notes: 'Golden hour shoot' },
      { experience_id: 'exp-004', experience_title: 'Cooking Workshop: North Indian', emoji: '👨‍🍳', backdrop_color: '#DB2777', date: fmt(sun), start_time: '11:00', venue: 'Community Kitchen', venue_area: 'Block B', price: 350, is_free: false, notes: 'Ingredients included' },
    ];
  },

  async getInterestMatches(): Promise<InterestMatch[]> {
    try {
      const r = await fetch(`${API_BASE}/v1/experiences/buddy/matches`);
      if (r.ok) return r.json();
    } catch {}
    return MOCK_INTEREST_MATCHES;
  },

  async sendBuddyMessage(text: string): Promise<BuddyMessage> {
    try {
      const r = await fetch(`${API_BASE}/v1/experiences/buddy/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (r.ok) return r.json();
    } catch {}
    const lower = text.toLowerCase();
    let response = "I'd love to help! Try asking me to suggest experiences, plan your weekend, or find residents with similar interests. 😊";
    if (lower.includes('weekend') || lower.includes('plan')) {
      response = "Great idea! I can plan a personalised weekend for you based on your interests. Tap 'Plan My Weekend' above to generate your itinerary! 🗓️";
    } else if (lower.includes('budget') || lower.includes('free') || lower.includes('cheap')) {
      response = "I found several free and budget-friendly experiences this week — Yoga in the Club Lawn, Photography Walk, and the Open Mic Night. Want me to add these to your itinerary? 🎯";
    } else if (lower.includes('family') || lower.includes('kid')) {
      response = "There are 3 family-friendly events this weekend: a Kids' Art Workshop, Family Movie Night, and a Nature Walk suitable for all ages. Which sounds fun? 👨‍👩‍👧";
    } else if (lower.includes('sport') || lower.includes('cricket') || lower.includes('badminton')) {
      response = "Your community has a Cricket match on Saturday at 10am and Badminton coaching on Sunday at 8am. Both have spots available! Want me to book? 🏏";
    }
    return {
      id: `msg-${Date.now()}`,
      role: 'buddy',
      text: response,
      created_at: new Date().toISOString(),
    };
  },
};

// ── P4 Types ─────────────────────────────────────────────────────────────────

export type InterestTag =
  | 'CRICKET' | 'SWIMMING' | 'BADMINTON' | 'FOOTBALL' | 'TENNIS' | 'CYCLING'
  | 'YOGA' | 'FITNESS' | 'DANCE' | 'MEDITATION'
  | 'MOVIES' | 'MUSIC' | 'THEATRE' | 'COMEDY'
  | 'COOKING' | 'PHOTOGRAPHY' | 'ART_CRAFTS' | 'READING'
  | 'TREKKING' | 'TRAVEL' | 'GAMING' | 'KIDS_ACTIVITIES';

export interface ItineraryItem {
  experience_id: string;
  experience_title: string;
  emoji: string;
  backdrop_color: string;
  date: string;
  start_time: string;
  venue: string;
  venue_area: string;
  price?: number;
  is_free: boolean;
  notes?: string;
}

export interface BuddyMessage {
  id: string;
  role: 'user' | 'buddy';
  text: string;
  suggestions?: Experience[];
  itinerary?: ItineraryItem[];
  created_at: string;
}

export interface BuddyRecommendation {
  experience: Experience;
  reason: string;
  match_score: number;
}

export interface InterestMatch {
  resident_name: string;
  resident_initials: string;
  flat: string;
  shared_interests: InterestTag[];
  match_score: number;
  open_to_group: boolean;
}

export const INTEREST_META: Record<InterestTag, { label: string; emoji: string; category: string }> = {
  CRICKET:         { label: 'Cricket',        emoji: '🏏', category: 'Sports' },
  SWIMMING:        { label: 'Swimming',       emoji: '🏊', category: 'Sports' },
  BADMINTON:       { label: 'Badminton',      emoji: '🏸', category: 'Sports' },
  FOOTBALL:        { label: 'Football',       emoji: '⚽', category: 'Sports' },
  TENNIS:          { label: 'Tennis',         emoji: '🎾', category: 'Sports' },
  CYCLING:         { label: 'Cycling',        emoji: '🚴', category: 'Sports' },
  YOGA:            { label: 'Yoga',           emoji: '🧘', category: 'Wellness' },
  FITNESS:         { label: 'Fitness',        emoji: '💪', category: 'Wellness' },
  DANCE:           { label: 'Dance',          emoji: '💃', category: 'Wellness' },
  MEDITATION:      { label: 'Meditation',     emoji: '🌿', category: 'Wellness' },
  MOVIES:          { label: 'Movies',         emoji: '🎬', category: 'Entertainment' },
  MUSIC:           { label: 'Music',          emoji: '🎵', category: 'Entertainment' },
  THEATRE:         { label: 'Theatre',        emoji: '🎭', category: 'Entertainment' },
  COMEDY:          { label: 'Comedy',         emoji: '😂', category: 'Entertainment' },
  COOKING:         { label: 'Cooking',        emoji: '👨‍🍳', category: 'Hobbies' },
  PHOTOGRAPHY:     { label: 'Photography',    emoji: '📸', category: 'Hobbies' },
  ART_CRAFTS:      { label: 'Art & Crafts',   emoji: '🎨', category: 'Hobbies' },
  READING:         { label: 'Reading',        emoji: '📚', category: 'Hobbies' },
  TREKKING:        { label: 'Trekking',       emoji: '🥾', category: 'Adventure' },
  TRAVEL:          { label: 'Travel',         emoji: '✈️', category: 'Adventure' },
  GAMING:          { label: 'Gaming',         emoji: '🎮', category: 'Adventure' },
  KIDS_ACTIVITIES: { label: 'Kids Activities', emoji: '🧒', category: 'Family' },
};

const MOCK_INTEREST_MATCHES: InterestMatch[] = [
  { resident_name: 'Arjun Mehta',   resident_initials: 'AM', flat: 'A-304', shared_interests: ['CRICKET', 'BADMINTON', 'CYCLING'], match_score: 92, open_to_group: true },
  { resident_name: 'Priya Sharma',  resident_initials: 'PS', flat: 'B-102', shared_interests: ['YOGA', 'MEDITATION', 'PHOTOGRAPHY'], match_score: 88, open_to_group: true },
  { resident_name: 'Rohit Nair',    resident_initials: 'RN', flat: 'C-501', shared_interests: ['FOOTBALL', 'GAMING', 'MOVIES'], match_score: 81, open_to_group: false },
  { resident_name: 'Kavya Reddy',   resident_initials: 'KR', flat: 'A-207', shared_interests: ['DANCE', 'MUSIC', 'COOKING'], match_score: 76, open_to_group: true },
  { resident_name: 'Sanjay Iyer',   resident_initials: 'SI', flat: 'D-403', shared_interests: ['TREKKING', 'CYCLING', 'PHOTOGRAPHY'], match_score: 71, open_to_group: true },
];

// P4 service methods are mixed into experiencesService below

// ── Category Meta ────────────────────────────────────────────────────────────

export const CATEGORY_META: Record<ExperienceCategory | 'ALL', {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  gradient: [string, string];
}> = {
  ALL:         { label: 'All',         emoji: '✨', color: '#4F46E5', bg: '#EEF2FF', gradient: ['#4338CA', '#4F46E5'] },
  MOVIES:      { label: 'Movies',      emoji: '🎬', color: '#1A1A2E', bg: '#E8E9F5', gradient: ['#1A1A2E', '#2D2D55'] },
  LIVE_EVENTS: { label: 'Live Events', emoji: '🎤', color: '#7C3AED', bg: '#F5F3FF', gradient: ['#6D28D9', '#7C3AED'] },
  SPORTS:      { label: 'Sports',      emoji: '🏆', color: '#059669', bg: '#ECFDF5', gradient: ['#047857', '#059669'] },
  KIDS_FAMILY: { label: 'Kids & Family', emoji: '👨‍👩‍👧', color: '#D97706', bg: '#FEF3C7', gradient: ['#B45309', '#D97706'] },
  WORKSHOPS:   { label: 'Workshops',   emoji: '🎓', color: '#0891B2', bg: '#ECFEFF', gradient: ['#0E7490', '#0891B2'] },
  OUTINGS:     { label: 'Outings',     emoji: '🌿', color: '#15803D', bg: '#DCFCE7', gradient: ['#166534', '#15803D'] },
  ONLINE:      { label: 'Online',      emoji: '💻', color: '#2563EB', bg: '#DBEAFE', gradient: ['#1D4ED8', '#2563EB'] },
};
