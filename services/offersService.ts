import api from './apiClient';
import type {
  CommunityOffer,
  CommerceCategory,
  BusinessPartner,
  UserOfferClaim,
  CommunityDemandPool,
  FarmersMarketDay,
  MarketVendor,
} from '@/types/offers';

// ── Fallback Mock Datasets for High Reliability ─────────────────────────
const MOCK_CATEGORIES: CommerceCategory[] = [
  { id: 'all', name: 'All Offers', code: 'ALL', active: true, itemCount: 18 },
  { id: 'groceries', name: '🥬 Fresh & Groceries', code: 'GROCERIES', active: true, itemCount: 6 },
  { id: 'dining', name: '☕ Dining & Cafes', code: 'DINING', active: true, itemCount: 4 },
  { id: 'health', name: '🩺 Clinics & Health', code: 'HEALTH', active: true, itemCount: 3 },
  { id: 'salon', name: '💇‍♀️ Salon & Wellness', code: 'SALON', active: true, itemCount: 3 },
  { id: 'auto', name: '🚗 Auto & Car Care', code: 'AUTO', active: true, itemCount: 2 },
  { id: 'home', name: '🔧 Home Services', code: 'HOME', active: true, itemCount: 4 },
];

const MOCK_OFFERS: CommunityOffer[] = [
  {
    id: 'off-1',
    businessId: 'biz-1',
    businessName: 'GreenFields Organic Hydroponics',
    categoryName: 'Fresh & Groceries',
    categoryCode: 'GROCERIES',
    title: 'Flat 25% Off Fresh Harvest Veggie Basket',
    tagline: 'Farm-to-Society Direct Delivery every Saturday',
    description: 'Freshly harvested zero-pesticide veggies delivered right to your tower lobby. Minimum cart value ₹400.',
    dealType: 'PERCENTAGE_OFF',
    discountPercentage: 25,
    originalPrice: 799,
    communityPrice: 599,
    voucherCode: 'MANA-FARM25',
    validUntil: 'Oct 31, 2026',
    claimedCount: 84,
    maxClaims: 150,
    distanceKm: 1.2,
    isExclusive: true,
    termsAndConditions: [
      'Valid only for registered Mana Community residents',
      'Free doorstep delivery for Tower A-D lobbies',
      'Cannot be combined with other store coupons',
    ],
  },
  {
    id: 'off-2',
    businessId: 'biz-2',
    businessName: 'Artisan Sourdough & Crusts',
    categoryName: 'Dining & Cafes',
    categoryCode: 'DINING',
    title: 'Buy 1 Artisan Loaf, Get Specialty Croissant Free',
    tagline: 'Wood-fired oven bakery 500m from Gate 1',
    description: 'Fresh morning bakes baked daily at 6:30 AM. Present your resident digital pass at counter.',
    dealType: 'BUY_ONE_GET_ONE',
    discountPercentage: 40,
    originalPrice: 380,
    communityPrice: 220,
    voucherCode: 'MANA-BAKEBOGO',
    validUntil: 'Nov 15, 2026',
    claimedCount: 112,
    distanceKm: 0.5,
    isExclusive: true,
    termsAndConditions: ['Valid on Saturday & Sunday mornings 7 AM - 11 AM'],
  },
  {
    id: 'off-3',
    businessId: 'biz-3',
    businessName: 'SparklePro Doorstep Car Detailing',
    categoryName: 'Auto & Car Care',
    categoryCode: 'AUTO',
    title: 'Waterless Foam Wash & Interior Vacuuming @ ₹349',
    tagline: 'Basement Parking slot cleaning team',
    description: 'Eco-friendly waterless deep cleaning with German polymer wax coat right inside our basement slots.',
    dealType: 'COMMUNITY_PRICE',
    discountPercentage: 35,
    originalPrice: 550,
    communityPrice: 349,
    voucherCode: 'MANA-SPARK349',
    validUntil: 'Nov 30, 2026',
    claimedCount: 63,
    distanceKm: 0.1,
    isExclusive: true,
    termsAndConditions: ['Prior slot booking required via WhatsApp'],
  },
  {
    id: 'off-4',
    businessId: 'biz-4',
    businessName: 'Aura Ayurveda & Spa Studio',
    categoryName: 'Salon & Wellness',
    categoryCode: 'SALON',
    title: '30% Off Deep Tissue Massage & Herbal Steam',
    tagline: 'Certified therapists & organic aromatherapy oils',
    description: 'De-stress this weekend with personalized therapeutic treatment and steam session.',
    dealType: 'PERCENTAGE_OFF',
    discountPercentage: 30,
    originalPrice: 1800,
    communityPrice: 1260,
    voucherCode: 'MANA-AURA30',
    validUntil: 'Oct 28, 2026',
    claimedCount: 41,
    distanceKm: 1.8,
    isExclusive: true,
  },
  {
    id: 'off-5',
    businessId: 'biz-5',
    businessName: 'CarePlus Neighborhood Pediatric Clinic',
    categoryName: 'Clinics & Health',
    categoryCode: 'HEALTH',
    title: 'Zero Consultation Fee on First Child Checkup',
    tagline: 'Dr. Neha Sharma (MD Paediatrics, AIIMS)',
    description: 'Comprehensive developmental screening, vaccination audit, and nutrition counsel for society kids.',
    dealType: 'FREE_SERVICE',
    discountPercentage: 100,
    originalPrice: 600,
    communityPrice: 0,
    voucherCode: 'MANA-CAREFREE',
    validUntil: 'Dec 31, 2026',
    claimedCount: 97,
    distanceKm: 0.8,
    isExclusive: true,
  },
];

const MOCK_BUSINESSES: BusinessPartner[] = [
  {
    id: 'biz-1',
    name: 'GreenFields Organic Hydroponics',
    categoryName: 'Fresh & Groceries',
    categoryCode: 'GROCERIES',
    tagline: 'Direct-from-farm zero pesticide harvest',
    description: 'Local hydroponic farm operating 1.2km away. Specializes in exotic greens, bell peppers, vine tomatoes, and microgreens.',
    address: 'Survey 48, Haralur Main Road (Near Amrita College)',
    distanceKm: 1.2,
    phone: '+91 98450 12345',
    whatsapp: '+919845012345',
    openingHours: '7:00 AM – 9:00 PM Daily',
    averageRating: 4.8,
    reviewCount: 142,
    activeDealsCount: 2,
    partnershipTier: 'PLATINUM_PARTNER',
    isVerified: true,
    societyDiscount: 'Flat 20% on all weekly baskets + Free gate delivery',
    exclusivePerks: [
      'Priority delivery directly to Clubhouse lobby on Saturdays',
      'No minimum order for Mana Community members',
      'Free monthly farm tour for society children',
    ],
    tags: ['Organic', 'Hydroponics', 'Pesticide Free', 'Doorstep Delivery'],
  },
  {
    id: 'biz-2',
    name: 'Artisan Sourdough & Crusts',
    categoryName: 'Dining & Cafes',
    categoryCode: 'DINING',
    tagline: 'Artisanal slow-fermented bakery & cafe',
    description: 'European-style sourdough, almond croissants, artisanal focaccia, and single-origin pour-over coffee.',
    address: 'Shop 4, Green Glen Layout, Outer Ring Road',
    distanceKm: 0.5,
    phone: '+91 98765 43210',
    whatsapp: '+919876543210',
    openingHours: '6:30 AM – 10:00 PM',
    averageRating: 4.9,
    reviewCount: 318,
    activeDealsCount: 2,
    partnershipTier: 'PLATINUM_PARTNER',
    isVerified: true,
    societyDiscount: 'Buy 1 Sourdough get Croissant Free',
    exclusivePerks: [
      'Reserved weekend morning breakfast table with resident ID',
      'Complimentary mini cookie with every coffee',
    ],
    tags: ['Sourdough', 'Croissant', 'Cafe', 'Specialty Coffee'],
  },
  {
    id: 'biz-3',
    name: 'SparklePro Doorstep Car Detailing',
    categoryName: 'Auto & Car Care',
    categoryCode: 'AUTO',
    tagline: 'Basement eco-wash & ceramic polymer coating',
    description: 'Dedicated team with battery-powered pressure misting systems authorized to wash inside our basement parking.',
    address: 'Mobile Service Hub, Basement Level -1',
    distanceKm: 0.1,
    phone: '+91 91234 56789',
    whatsapp: '+919123456789',
    openingHours: '6:00 AM – 8:00 PM',
    averageRating: 4.7,
    reviewCount: 95,
    activeDealsCount: 1,
    partnershipTier: 'GOLD_PARTNER',
    isVerified: true,
    societyDiscount: 'Waterless Wash @ ₹349 (Regular ₹550)',
    exclusivePerks: [
      'No need to take car out — done at your allotted parking bay',
      'Free tyre dressing on all foam washes',
    ],
    tags: ['Car Wash', 'Detailing', 'Basement Friendly', 'Eco Friendly'],
  },
  {
    id: 'biz-4',
    name: 'Aura Ayurveda & Spa Studio',
    categoryName: 'Salon & Wellness',
    categoryCode: 'SALON',
    tagline: 'Authentic Kerala Ayurvedic therapy & salon',
    description: 'Certified Ayurvedic practitioners offering panchakarma therapies, head massages, and herbal facials.',
    address: '2nd Floor, Royal Arcade, Sarjapur Road',
    distanceKm: 1.8,
    phone: '+91 94480 88221',
    whatsapp: '+919448088221',
    openingHours: '9:00 AM – 8:30 PM (Closed Mon)',
    averageRating: 4.6,
    reviewCount: 78,
    activeDealsCount: 2,
    partnershipTier: 'GOLD_PARTNER',
    isVerified: true,
    societyDiscount: '30% Off All Therapeutic Massages',
    exclusivePerks: ['Free Prakriti constitutional analysis consultation'],
    tags: ['Ayurveda', 'Spa', 'Massage', 'Wellness'],
  },
  {
    id: 'biz-5',
    name: 'CarePlus Neighborhood Pediatric Clinic',
    categoryName: 'Clinics & Health',
    categoryCode: 'HEALTH',
    tagline: 'Child healthcare, vaccinations & emergency care',
    description: 'Dedicated pediatric clinic equipped with modern diagnostic facilities and pediatric emergency response.',
    address: 'GF-02, Sunrise Towers, Bellandur Lake Road',
    distanceKm: 0.8,
    phone: '+91 80 4123 9900',
    whatsapp: '+918041239900',
    openingHours: '8:30 AM – 1:00 PM, 5:00 PM – 9:00 PM',
    averageRating: 4.9,
    reviewCount: 204,
    activeDealsCount: 1,
    partnershipTier: 'PLATINUM_PARTNER',
    isVerified: true,
    societyDiscount: '1st Child Consultation Free + 15% on Vaccinations',
    exclusivePerks: [
      'WhatsApp emergency triage line for Mana Community parents',
      'Vaccine home administration for infants under 6 months',
    ],
    tags: ['Pediatrician', 'Child Clinic', 'Vaccines', 'Doctor'],
  },
];

const MOCK_DEMAND_POOLS: CommunityDemandPool[] = [
  {
    id: 'pool-1',
    title: 'Daikin Triple Inverter AC Deep Jet Servicing',
    category: 'Home & Appliances',
    targetProduct: 'Professional Chemical Pressure Wash + Gas Topup Check',
    description: 'Authorized technicians will service AC units across the society in batch slots. Collective order reduces individual technician transit overhead.',
    brandOrVendor: 'UrbanClap Certified HVAC Master Fleet',
    regularPrice: 1299,
    discountedPrice: 649,
    targetCount: 50,
    currentSupporters: 38,
    deadline: 'Oct 15, 2026',
    userSupported: false,
    status: 'GATHERING',
    minimumSavingsAmount: 650,
    estimatedDelivery: 'Oct 18-20, 2026',
    initiatorName: 'Suresh Menon',
    initiatorFlat: 'Tower B-902',
    perksIncluded: ['30-day cooling warranty', 'Free antibacterial duct spray'],
  },
  {
    id: 'pool-2',
    title: 'Cold-Pressed Wood Churned Mustard & Sesame Oil Cans (5L)',
    category: 'Groceries & Gourmet',
    targetProduct: '100% Native Mara Chekku Single-Origin Unrefined Oil',
    description: 'Direct procurement from Salem Farmer Producer Organization (FPO). 5L tin can at wholesale refinery gate rate.',
    brandOrVendor: 'Namma Gramam Organic FPO',
    regularPrice: 1850,
    discountedPrice: 1190,
    targetCount: 40,
    currentSupporters: 40,
    deadline: 'Oct 10, 2026',
    userSupported: true,
    status: 'LOCKED_IN',
    minimumSavingsAmount: 660,
    estimatedDelivery: 'Oct 14, 2026 at Clubhouse Lobby',
    initiatorName: 'Pooja Iyer',
    initiatorFlat: 'Tower D-1404',
    perksIncluded: ['Lab test certificate attached with batch QR code'],
  },
  {
    id: 'pool-3',
    title: 'Society Bulk Order: 7.4 kW Home EV Smart Charger',
    category: 'Automotive & EV',
    targetProduct: 'Type-2 Connector Smart WiFi Fast Charger + RWA Grid Connection Kit',
    description: 'Negotiated directly with OEM for bulk parking lot installation with RWA certified electrical safety clearance.',
    brandOrVendor: 'Statiq Power Systems',
    regularPrice: 38500,
    discountedPrice: 24900,
    targetCount: 20,
    currentSupporters: 14,
    deadline: 'Oct 25, 2026',
    userSupported: false,
    status: 'GATHERING',
    minimumSavingsAmount: 13600,
    estimatedDelivery: 'Nov 02, 2026',
    initiatorName: 'Rahul Verma',
    initiatorFlat: 'Tower A-301',
    perksIncluded: ['3-year comprehensive on-site replacement warranty', 'Free wiring up to 15 meters'],
  },
  {
    id: 'pool-4',
    title: 'Export Quality Ratnagiri Alphonso Mango Crates (1 Dozen)',
    category: 'Fresh Fruits',
    targetProduct: 'GI-Tagged Naturally Ripened Alphonso A++ (250g+ each)',
    description: 'Fresh flight harvest batch packed at Konkan orchards and delivered within 24 hours of harvest.',
    brandOrVendor: 'Konkan Fruit Growers Collective',
    regularPrice: 1400,
    discountedPrice: 899,
    targetCount: 100,
    currentSupporters: 100,
    deadline: 'May 05, 2026',
    userSupported: true,
    status: 'FULFILLED',
    minimumSavingsAmount: 501,
    estimatedDelivery: 'Delivered May 08',
    initiatorName: 'Ananya Roy',
    initiatorFlat: 'Tower C-604',
  },
];

const MOCK_CLAIMS: UserOfferClaim[] = [
  {
    id: 'claim-101',
    offerId: 'off-1',
    offerTitle: 'Flat 25% Off Fresh Harvest Veggie Basket',
    businessName: 'GreenFields Organic Hydroponics',
    businessAddress: 'Survey 48, Haralur Main Road',
    businessPhone: '+91 98450 12345',
    discountSummary: '25% OFF on minimum order ₹400',
    voucherCode: 'MANA-GF-8842',
    counterPin: '4821',
    claimedAt: '2026-10-01T10:30:00Z',
    validUntil: 'Oct 31, 2026',
    status: 'ACTIVE',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MANA-GF-8842',
    savingsAmount: 200,
    termsAndConditions: [
      'Show QR at counter or share code on WhatsApp for delivery',
      'One-time use per apartment',
    ],
  },
  {
    id: 'claim-102',
    offerId: 'off-2',
    offerTitle: 'Buy 1 Artisan Loaf, Get Specialty Croissant Free',
    businessName: 'Artisan Sourdough & Crusts',
    businessAddress: 'Shop 4, Green Glen Layout, Outer Ring Road',
    businessPhone: '+91 98765 43210',
    discountSummary: 'Buy 1 Get 1 Croissant Free',
    voucherCode: 'MANA-CRUST-1904',
    counterPin: '7392',
    claimedAt: '2026-09-28T16:15:00Z',
    validUntil: 'Nov 15, 2026',
    status: 'ACTIVE',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MANA-CRUST-1904',
    savingsAmount: 160,
    termsAndConditions: ['Valid on Saturday & Sunday mornings 7 AM - 11 AM'],
  },
  {
    id: 'claim-103',
    offerId: 'off-3',
    offerTitle: 'Waterless Foam Wash & Interior Vacuuming @ ₹349',
    businessName: 'SparklePro Doorstep Car Detailing',
    businessAddress: 'Basement Level -1 Parking Hub',
    businessPhone: '+91 91234 56789',
    discountSummary: 'Flat ₹349 Rate (Saved ₹201)',
    voucherCode: 'MANA-SPARK-0021',
    counterPin: '1109',
    claimedAt: '2026-09-15T09:00:00Z',
    validUntil: 'Sep 30, 2026',
    status: 'REDEEMED',
    redeemedAt: '2026-09-18T11:45:00Z',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MANA-SPARK-0021',
    savingsAmount: 201,
  },
];

const MOCK_MARKET_DAYS: FarmersMarketDay[] = [
  {
    id: 'market-1',
    title: 'Weekend Organic Harvest & Artisan Market',
    date: 'This Saturday, Oct 04',
    time: '7:30 AM – 1:00 PM',
    location: 'Clubhouse Central Lawn & Gate 2 Promenade',
    theme: 'Fresh Organic Produce, Sourdough Bakes, Native Honey & Handcrafted Cheeses',
    status: 'UPCOMING',
    vendorCount: 14,
    rsvpCount: 128,
    userRsvp: true,
    bannerGradient: ['#065F46', '#047857'],
    highlights: [
      '🚜 8 Direct Organic Farmers with zero-middlemen pricing',
      '🧀 Artisan Artisanal Cheese tasting table',
      '🥖 Fresh warm sourdough straight out of mobile brick oven',
      '🌱 Society Plant Swap & Seedling distribution corner',
    ],
    vendors: [
      {
        id: 'v-1',
        stallNumber: 'Stall #01',
        name: 'Vedic Farms Naturals',
        category: 'ORGANIC_VEGGIES',
        tagline: 'Certified PGS-India pesticide-free heirloom vegetables',
        description: 'Harvested at 4:30 AM from Kanakapura farm. Spinach, broccoli, cherry tomatoes, and native country greens.',
        rating: 4.9,
        reviewCount: 42,
        preOrderAvailable: true,
        popularItems: ['Baby Spinach', 'Hydroponic Strawberries', 'Exotic Salad Box', 'English Cucumbers'],
        specialSocietyDiscount: '10% Extra produce bonus on orders above ₹500',
        contactNumber: '+91 98451 11223',
        ownerName: 'Ramesh Gowda',
      },
      {
        id: 'v-2',
        stallNumber: 'Stall #04',
        name: 'The French Crust Micro-Bakery',
        category: 'BAKERY',
        tagline: 'Fermented country sourdough & butter brioche',
        description: 'Slow-proved 36-hour sourdoughs, pain au chocolat, cardamom buns, and vegan gluten-free seed loaves.',
        rating: 4.8,
        reviewCount: 65,
        preOrderAvailable: true,
        popularItems: ['Walnut Sourdough', 'Almond Croissant', 'Garlic Focaccia', 'Gluten-Free Seed Loaf'],
        specialSocietyDiscount: 'Free croissant on pre-orders placed by Friday 8 PM',
        contactNumber: '+91 98860 99881',
        ownerName: 'Chef Camille Dubois',
      },
      {
        id: 'v-3',
        stallNumber: 'Stall #07',
        name: 'Malnad Native Dairy & Honey',
        category: 'FARM_DAIRY',
        tagline: 'A2 Desi Hallikar Cow Milk, Vedic Bilona Ghee & Raw Forest Honey',
        description: 'Glass-bottled single-source raw A2 cow milk, traditional hand-churned cultured ghee, and wild unpasteurized honey.',
        rating: 4.9,
        reviewCount: 88,
        preOrderAvailable: true,
        popularItems: ['A2 Cultured Ghee (500ml)', 'Raw Coorg Blossom Honey', 'Fresh Paneer Blocks', 'A2 Curd'],
        specialSocietyDiscount: '₹50 Cashback on returning empty glass bottles',
        contactNumber: '+91 97400 33445',
        ownerName: 'Naveen Hegde',
      },
      {
        id: 'v-4',
        stallNumber: 'Stall #11',
        name: 'GreenSprout Urban Nursery & Succulents',
        category: 'PLANTS_NURSERY',
        tagline: 'Air-purifying balcony plants, exotic succulents & organic compost',
        description: 'Balcony garden specialist. Offering potting mix, self-watering pots, flowering herbs, and bonsai starters.',
        rating: 4.7,
        reviewCount: 31,
        preOrderAvailable: false,
        popularItems: ['Snake Plants in Ceramic Pots', 'Holy Basil (Tulsi)', 'Balcony Mint & Rosemary', 'Cocopeat Brick (5kg)'],
        specialSocietyDiscount: 'Free packet of heirloom marigold seeds with every plant purchase',
        contactNumber: '+91 99160 55442',
        ownerName: 'Priya Sundaram',
      },
      {
        id: 'v-5',
        stallNumber: 'Stall #12',
        name: 'Kashmir Valley Dryfruits & Saffron',
        category: 'SPECIALTY_FOOD',
        tagline: 'Pampore Mongra Saffron, Mamra Almonds & Sun-Dried Figs',
        description: 'Direct procurement from growers in Pulwama and Anantnag. Unpolished and zero sulfur treatment.',
        rating: 4.9,
        reviewCount: 54,
        preOrderAvailable: true,
        popularItems: ['Mamra Almonds (500g)', 'Kashmiri Walnuts', 'Grade-A Saffron (1g)', 'Dried Apricots'],
        specialSocietyDiscount: '15% Off society inaugural discount',
        contactNumber: '+91 94190 22334',
        ownerName: 'Tariq Mir',
      },
    ],
  },
  {
    id: 'market-2',
    title: 'Diwali Artisan & Festive Crafts Bazaar',
    date: 'Next Saturday, Oct 11',
    time: '4:00 PM – 9:30 PM',
    location: 'Clubhouse Amphitheatre & Poolside Pavilion',
    theme: 'Terracotta Diyas, Handloom Festive Kurtas, Organic Mithai & Eco Decor',
    status: 'UPCOMING',
    vendorCount: 22,
    rsvpCount: 215,
    userRsvp: false,
    bannerGradient: ['#9A3412', '#C2410C'],
    highlights: [
      '🪔 Live clay potter wheel workshop for kids',
      '👗 Handloom block print apparel from Jaipur collectives',
      '🍬 Pure jaggery & dryfruit festive sweets',
    ],
    vendors: [],
  },
];

// ── Service Implementation ──────────────────────────────────────────────
export const offersService = {
  // Categories
  async getCategories(): Promise<CommerceCategory[]> {
    try {
      const res = await api.get<CommerceCategory[]>('/offers/categories');
      return res.data && res.data.length ? res.data : MOCK_CATEGORIES;
    } catch {
      return MOCK_CATEGORIES;
    }
  },

  // Offers
  async getOffers(category?: string): Promise<CommunityOffer[]> {
    try {
      const res = await api.get<CommunityOffer[]>('/offers', { params: { category } });
      const data = res.data && res.data.length ? res.data : MOCK_OFFERS;
      if (category && category !== 'ALL') {
        return data.filter((o) => o.categoryCode === category || o.categoryName.toLowerCase().includes(category.toLowerCase()));
      }
      return data;
    } catch {
      if (category && category !== 'ALL') {
        return MOCK_OFFERS.filter((o) => o.categoryCode === category || o.categoryName.toLowerCase().includes(category.toLowerCase()));
      }
      return MOCK_OFFERS;
    }
  },

  // Claiming
  async claimOffer(offerId: string): Promise<UserOfferClaim> {
    try {
      const res = await api.post<UserOfferClaim>(`/offers/${offerId}/claim`);
      return res.data;
    } catch {
      const targetOffer = MOCK_OFFERS.find((o) => o.id === offerId) || MOCK_OFFERS[0];
      const newClaim: UserOfferClaim = {
        id: `claim-${Date.now()}`,
        offerId: targetOffer.id,
        offerTitle: targetOffer.title,
        businessName: targetOffer.businessName,
        discountSummary: targetOffer.tagline || 'Exclusive Resident Deal',
        voucherCode: targetOffer.voucherCode || `MANA-${Math.floor(1000 + Math.random() * 9000)}`,
        counterPin: `${Math.floor(1000 + Math.random() * 9000)}`,
        claimedAt: new Date().toISOString(),
        validUntil: targetOffer.validUntil,
        status: 'ACTIVE',
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${targetOffer.voucherCode || 'MANA-PASS'}`,
        savingsAmount: (targetOffer.originalPrice && targetOffer.communityPrice) ? targetOffer.originalPrice - targetOffer.communityPrice : 150,
      };
      MOCK_CLAIMS.unshift(newClaim);
      return newClaim;
    }
  },

  async getMyClaims(): Promise<UserOfferClaim[]> {
    try {
      const res = await api.get<UserOfferClaim[]>('/offers/my-claims');
      return res.data && res.data.length ? res.data : MOCK_CLAIMS;
    } catch {
      return MOCK_CLAIMS;
    }
  },

  async redeemVoucher(claimId: string, _counterPin?: string): Promise<UserOfferClaim> {
    try {
      const res = await api.post<UserOfferClaim>(`/offers/claims/${claimId}/redeem`, { counterPin: _counterPin });
      return res.data;
    } catch {
      const found = MOCK_CLAIMS.find((c) => c.id === claimId);
      if (found) {
        found.status = 'REDEEMED';
        found.redeemedAt = new Date().toISOString();
        return { ...found };
      }
      throw new Error('Voucher claim not found');
    }
  },

  // Bulk Demand Pools
  async getDemandPools(): Promise<CommunityDemandPool[]> {
    try {
      const res = await api.get<CommunityDemandPool[]>('/offers/demand');
      return res.data && res.data.length ? res.data : MOCK_DEMAND_POOLS;
    } catch {
      return MOCK_DEMAND_POOLS;
    }
  },

  async supportDemandPool(poolId: string): Promise<void> {
    try {
      await api.post(`/offers/demand/${poolId}/join`);
    } catch {
      const pool = MOCK_DEMAND_POOLS.find((p) => p.id === poolId);
      if (pool) {
        if (!pool.userSupported) {
          pool.userSupported = true;
          pool.currentSupporters += 1;
          if (pool.currentSupporters >= pool.targetCount) {
            pool.status = 'LOCKED_IN';
          }
        } else {
          pool.userSupported = false;
          pool.currentSupporters = Math.max(0, pool.currentSupporters - 1);
        }
      }
    }
  },

  async createDemandPool(data: Partial<CommunityDemandPool>): Promise<CommunityDemandPool> {
    try {
      const res = await api.post<CommunityDemandPool>('/offers/demand', data);
      return res.data;
    } catch {
      const newPool: CommunityDemandPool = {
        id: `pool-${Date.now()}`,
        title: data.title || 'Community Group Buy',
        category: data.category || 'General',
        targetProduct: data.targetProduct || 'Bulk Order',
        regularPrice: data.regularPrice || 1000,
        discountedPrice: data.discountedPrice || 700,
        targetCount: data.targetCount || 25,
        currentSupporters: 1,
        deadline: data.deadline || 'Nov 15, 2026',
        userSupported: true,
        status: 'GATHERING',
        minimumSavingsAmount: (data.regularPrice || 1000) - (data.discountedPrice || 700),
        initiatorName: 'You (Current Resident)',
        initiatorFlat: 'My Apartment',
        description: data.description,
      };
      MOCK_DEMAND_POOLS.unshift(newPool);
      return newPool;
    }
  },

  // Verified Business Partners Directory
  async getBusinesses(category?: string, search?: string): Promise<BusinessPartner[]> {
    try {
      const res = await api.get<BusinessPartner[]>('/offers/businesses', { params: { category, search } });
      let data = res.data && res.data.length ? res.data : MOCK_BUSINESSES;
      if (category && category !== 'ALL') {
        data = data.filter((b) => b.categoryCode === category || b.categoryName.toLowerCase().includes(category.toLowerCase()));
      }
      if (search) {
        const q = search.toLowerCase();
        data = data.filter((b) => b.name.toLowerCase().includes(q) || b.tagline?.toLowerCase().includes(q) || b.tags?.some((t) => t.toLowerCase().includes(q)));
      }
      return data;
    } catch {
      let data = MOCK_BUSINESSES;
      if (category && category !== 'ALL') {
        data = data.filter((b) => b.categoryCode === category || b.categoryName.toLowerCase().includes(category.toLowerCase()));
      }
      if (search) {
        const q = search.toLowerCase();
        data = data.filter((b) => b.name.toLowerCase().includes(q) || b.tagline?.toLowerCase().includes(q) || b.tags?.some((t) => t.toLowerCase().includes(q)));
      }
      return data;
    }
  },

  async getBusinessDetails(id: string): Promise<BusinessPartner | undefined> {
    try {
      const res = await api.get<BusinessPartner>(`/offers/businesses/${id}`);
      return res.data;
    } catch {
      return MOCK_BUSINESSES.find((b) => b.id === id);
    }
  },

  // Farmers Market Days
  async getMarketDays(): Promise<FarmersMarketDay[]> {
    try {
      const res = await api.get<FarmersMarketDay[]>('/offers/market-days');
      return res.data && res.data.length ? res.data : MOCK_MARKET_DAYS;
    } catch {
      return MOCK_MARKET_DAYS;
    }
  },

  async rsvpMarketDay(marketId: string): Promise<void> {
    try {
      await api.post(`/offers/market-days/${marketId}/rsvp`);
    } catch {
      const market = MOCK_MARKET_DAYS.find((m) => m.id === marketId);
      if (market) {
        market.userRsvp = !market.userRsvp;
        market.rsvpCount += market.userRsvp ? 1 : -1;
      }
    }
  },

  async bookVendorStall(data: { marketId: string; vendorName: string; category: string; phone: string; products: string }): Promise<void> {
    try {
      await api.post(`/offers/market-days/${data.marketId}/vendor-application`, data);
    } catch {
      // Mock acceptance
      return;
    }
  },
};

