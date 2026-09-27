import api from './apiClient';
import type {
  CommunityOffer,
  CommerceCategory,
  BusinessPartner,
  UserOfferClaim,
  CommunityDemandPool,
} from '@/types/offers';

export const offersService = {
  // ── Categories ───────────────────────────────────────────────────
  async getCategories(): Promise<CommerceCategory[]> {
    try {
      const res = await api.get<CommerceCategory[]>('/offers/categories');
      return res.data;
    } catch {
      return [
        { id: 'cat-all', name: 'All Deals', code: 'ALL', active: true },
        { id: 'cat-food', name: 'Food & Dining', code: 'FOOD', active: true },
        { id: 'cat-health', name: 'Health & Dental', code: 'HEALTH', active: true },
        { id: 'cat-auto', name: 'Car & Auto Care', code: 'AUTO', active: true },
        { id: 'cat-salon', name: 'Salon & Spa', code: 'SALON', active: true },
        { id: 'cat-home', name: 'Home & Tech', code: 'HOME', active: true },
      ];
    }
  },

  // ── Offers ───────────────────────────────────────────────────────
  async getOffers(category?: string): Promise<CommunityOffer[]> {
    try {
      const res = await api.get<CommunityOffer[]>('/offers', { params: { category } });
      return res.data;
    } catch {
      return [
        {
          id: 'offer-1',
          businessId: 'biz-1',
          businessName: 'Clove Dental & Orthodontics',
          categoryName: 'Health & Dental',
          title: 'Complete Preventive Dental Scaling + Consultation',
          tagline: 'Exclusive 50% Off for Mana Residency Residents',
          description:
            'Includes comprehensive digital X-ray inspection, ultrasonic plaque scaling, polishing, and consultation with senior orthodontist.',
          dealType: 'PERCENTAGE_OFF',
          discountPercentage: 50,
          originalPrice: 1800,
          communityPrice: 900,
          voucherCode: 'MANA-CLOVE50',
          validUntil: '31 Oct 2026',
          claimedCount: 84,
          distanceKm: 0.8,
          isExclusive: true,
          termsAndConditions: ['Valid on appointment only', 'Show Mana app voucher at reception'],
        },
        {
          id: 'offer-2',
          businessId: 'biz-2',
          businessName: 'Express 3M Car Care & Detailing',
          categoryName: 'Car & Auto Care',
          title: 'Full Exterior Foam Wash + Interior Deep Steam Sanitize',
          tagline: 'Flat ₹699 Community Special',
          description:
            'Complete high-pressure underbody wash, paint-safe pH-neutral foam wash, tire dressing, dashboard UV polish, and full interior steam sanitize.',
          dealType: 'COMMUNITY_PRICE',
          discountPercentage: 40,
          originalPrice: 1200,
          communityPrice: 699,
          voucherCode: 'MANA-CAR699',
          validUntil: '15 Nov 2026',
          claimedCount: 142,
          distanceKm: 1.2,
          isExclusive: true,
        },
        {
          id: 'offer-3',
          businessId: 'biz-3',
          businessName: 'Naturals Signature Salon & Spa',
          categoryName: 'Salon & Spa',
          title: 'Keratin Hair Spa + Organic Herbal Facial Combo',
          tagline: 'Buy 1 Get 1 Complimentary Treatment',
          description:
            'Book any premium hair spa treatment and receive a complimentary herbal organic glow facial worth ₹1,500.',
          dealType: 'BUY_ONE_GET_ONE',
          discountPercentage: 50,
          originalPrice: 3000,
          communityPrice: 1500,
          voucherCode: 'MANA-NATURALS-BOGO',
          validUntil: '20 Nov 2026',
          claimedCount: 63,
          distanceKm: 0.5,
          isExclusive: true,
        },
      ];
    }
  },

  async claimOffer(offerId: string): Promise<UserOfferClaim> {
    try {
      const res = await api.post<UserOfferClaim>(`/offers/${offerId}/claim`);
      return res.data;
    } catch {
      return {
        id: `claim-${Date.now()}`,
        offerId,
        offerTitle: 'Claimed Community Offer',
        businessName: 'Partner Merchant',
        discountSummary: 'Exclusive Resident Discount Applied',
        voucherCode: `MANA-${Math.floor(100000 + Math.random() * 900000)}`,
        claimedAt: new Date().toISOString(),
        validUntil: 'Valid for 30 days',
        status: 'ACTIVE',
        qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=MANA-CLAIM-OK',
      };
    }
  },

  // ── My Claims ────────────────────────────────────────────────────
  async getMyClaims(): Promise<UserOfferClaim[]> {
    try {
      const res = await api.get<UserOfferClaim[]>('/offers/my-claims');
      return res.data;
    } catch {
      return [
        {
          id: 'claim-1',
          offerId: 'offer-1',
          offerTitle: 'Complete Preventive Dental Scaling + Consultation',
          businessName: 'Clove Dental & Orthodontics',
          discountSummary: 'Flat 50% Off (Pay ₹900 at clinic)',
          voucherCode: 'MANA-CLOVE-9842',
          claimedAt: 'Yesterday',
          validUntil: '31 Oct 2026',
          status: 'ACTIVE',
          qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=MANA-CLOVE-9842',
        },
      ];
    }
  },

  // ── Community Demand Pools ───────────────────────────────────────
  async getDemandPools(): Promise<CommunityDemandPool[]> {
    try {
      const res = await api.get<CommunityDemandPool[]>('/offers/demand');
      return res.data;
    } catch {
      return [
        {
          id: 'demand-1',
          title: 'Pure A2 Gir Cow Ghee (Direct Farm Collective)',
          category: 'ORGANIC FOOD',
          targetProduct: '5L Glass Jar Bulk Drop',
          regularPrice: 3800,
          discountedPrice: 2600,
          targetCount: 50,
          currentSupporters: 38,
          deadline: '28 Oct 2026',
          userSupported: true,
          status: 'GATHERING',
        },
        {
          id: 'demand-2',
          title: 'Apartment Deep Chimney & Kitchen Duct Degreasing',
          category: 'HOME SERVICES',
          targetProduct: 'Professional Hydro-Degrease Service',
          regularPrice: 2200,
          discountedPrice: 1350,
          targetCount: 30,
          currentSupporters: 30,
          deadline: '31 Oct 2026',
          userSupported: false,
          status: 'LOCKED_IN',
        },
      ];
    }
  },

  async supportDemandPool(poolId: string): Promise<boolean> {
    try {
      await api.post(`/offers/demand/${poolId}/join`);
      return true;
    } catch {
      return true;
    }
  },

  // ── Business Directory ───────────────────────────────────────────
  async getBusinesses(): Promise<BusinessPartner[]> {
    try {
      const res = await api.get<BusinessPartner[]>('/offers/businesses');
      return res.data;
    } catch {
      return [
        {
          id: 'biz-1',
          name: 'Clove Dental Clinic',
          categoryName: 'Health & Dental',
          tagline: 'Leading multi-specialty dental care chain',
          address: 'Shop 4, Outer Ring Road, 800m from Gate 1',
          distanceKm: 0.8,
          phone: '+91 98765 43210',
          averageRating: 4.8,
          reviewCount: 124,
          activeDealsCount: 2,
          partnershipTier: 'PLATINUM_PARTNER',
          isVerified: true,
        },
        {
          id: 'biz-2',
          name: 'Express 3M Car Care',
          categoryName: 'Car & Auto Care',
          tagline: 'Certified detailing & foam wash center',
          address: 'Sarjapur Main Road, Opp HP Petrol Pump',
          distanceKm: 1.2,
          phone: '+91 91234 56789',
          averageRating: 4.6,
          reviewCount: 89,
          activeDealsCount: 3,
          partnershipTier: 'GOLD_PARTNER',
          isVerified: true,
        },
        {
          id: 'biz-3',
          name: 'Naturals Signature Salon',
          categoryName: 'Salon & Spa',
          tagline: 'Premium beauty & wellness studio',
          address: '1st Floor, Oasis Mall, 500m away',
          distanceKm: 0.5,
          phone: '+91 99887 76655',
          averageRating: 4.7,
          reviewCount: 210,
          activeDealsCount: 2,
          partnershipTier: 'PLATINUM_PARTNER',
          isVerified: true,
        },
      ];
    }
  },
};
