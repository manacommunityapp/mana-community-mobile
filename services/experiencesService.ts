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
};

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
