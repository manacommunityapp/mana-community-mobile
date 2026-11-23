import api from './apiClient';

export interface PublicSocietySummary {
  id: number;
  name: string;
  type?: string;
  city?: string;
  area?: string;
  residentCount?: number | null;
}

export interface PlatformShowcaseItemDto {
  itemKey: string;
  emoji: string;
  accentColor: string;
  title: string;
  tagline: string;
  description: string;
  tags: string[];
  sortOrder: number;
}

export interface PublicPlatformOverview {
  totalResidents: number | null;
  totalSocieties: number | null;
  totalCities: number | null;
  topBadgeText: string;
  heroCapsuleText: string;
  heroTitle: string;
  heroSubtitle: string;
  securityLabel: string;
  certificationNote: string;
  featuredSocieties: PublicSocietySummary[];
  showcaseItems: PlatformShowcaseItemDto[];
  isLive: boolean;
}

export const DEFAULT_SHOWCASE_ITEMS: PlatformShowcaseItemDto[] = [
  {
    itemKey: 'security',
    emoji: '🛡️',
    accentColor: '#10B981',
    title: 'Smart Gate & 24/7 Security',
    tagline: 'Instant QR Entry Passes & SOS Alert',
    description:
      'Digital gate passes for visitors, delivery PINs, automated staff clock-in, and one-tap emergency guard hotline.',
    tags: ['Guest QR Pass', 'Delivery PIN', 'Maid Log', 'Emergency SOS'],
    sortOrder: 1,
  },
  {
    itemKey: 'sports',
    emoji: '🏟️',
    accentColor: '#F59E0B',
    title: 'Sports Arena & Tournaments',
    tagline: 'Live Scores · Court Booking · Leagues',
    description:
      'Book clubhouse courts in seconds, register for community tournaments, and track real-time scoreboards.',
    tags: ['Court Booking', 'Live Scoreboard', 'Society Cups', 'Player Ratings'],
    sortOrder: 2,
  },
  {
    itemKey: 'marketplace',
    emoji: '🛒',
    accentColor: '#A855F7',
    title: 'Local Market & Live Auctions',
    tagline: 'Buy, Sell & Save with Verified Neighbors',
    description:
      'Trade pre-loved goods, bid in resident auctions, and unlock bulk discounts with community group buying.',
    tags: ['Classifieds', 'Live Auctions', 'Group Deals', 'Free Giveaways'],
    sortOrder: 3,
  },
  {
    itemKey: 'living',
    emoji: '⚡',
    accentColor: '#06B6D4',
    title: 'Maintenance Dues & Amenities',
    tagline: 'Seamless Clubhouse Living',
    description:
      'Pay monthly maintenance in one tap, reserve party halls, and track helpdesk tickets with automated resolution SLAs.',
    tags: ['Maintenance Pay', 'Clubhouse Booking', 'Quick Helpdesk', 'Polls & Notices'],
    sortOrder: 4,
  },
];

export const DEFAULT_PUBLIC_OVERVIEW: PublicPlatformOverview = {
  totalResidents: null,
  totalSocieties: null,
  totalCities: null,
  topBadgeText: 'Verified Gated Communities',
  heroCapsuleText: 'ELEVATING GATED LIVING',
  heroTitle: 'Mana Community',
  heroSubtitle: 'Your home, neighbors, and society operations — seamlessly connected in your pocket.',
  securityLabel: 'Bank-Grade Secure',
  certificationNote: 'Encrypted · RWA & Apartment Association Certified',
  featuredSocieties: [],
  showcaseItems: DEFAULT_SHOWCASE_ITEMS,
  isLive: false,
};

export function formatPublicCount(count: number | null | undefined): string {
  if (typeof count !== 'number' || Number.isNaN(count) || count < 0) return '—';
  return count.toLocaleString('en-IN');
}

export function normalizePublicOverview(raw: any): PublicPlatformOverview {
  if (!raw || typeof raw !== 'object') return DEFAULT_PUBLIC_OVERVIEW;
  const showcaseItems: PlatformShowcaseItemDto[] =
    Array.isArray(raw.showcaseItems) && raw.showcaseItems.length > 0
      ? raw.showcaseItems.map((item: any, idx: number) => ({
          itemKey: String(item.itemKey || `item-${idx}`),
          emoji: String(item.emoji || '✨'),
          accentColor: String(item.accentColor || '#4F46E5'),
          title: String(item.title || ''),
          tagline: String(item.tagline || ''),
          description: String(item.description || ''),
          tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
          sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : idx + 1,
        }))
      : DEFAULT_SHOWCASE_ITEMS;

  const featuredSocieties: PublicSocietySummary[] = Array.isArray(raw.featuredSocieties)
    ? raw.featuredSocieties
        .filter((s: any) => s && s.name)
        .map((s: any) => ({
          id: Number(s.id),
          name: String(s.name),
          type: s.type ? String(s.type) : undefined,
          city: s.city ? String(s.city) : undefined,
          area: s.area ? String(s.area) : undefined,
          residentCount: typeof s.residentCount === 'number' ? s.residentCount : null,
        }))
    : [];

  return {
    totalResidents: typeof raw.totalResidents === 'number' ? raw.totalResidents : null,
    totalSocieties: typeof raw.totalSocieties === 'number' ? raw.totalSocieties : null,
    totalCities: typeof raw.totalCities === 'number' ? raw.totalCities : null,
    topBadgeText: raw.topBadgeText || DEFAULT_PUBLIC_OVERVIEW.topBadgeText,
    heroCapsuleText: raw.heroCapsuleText || DEFAULT_PUBLIC_OVERVIEW.heroCapsuleText,
    heroTitle: raw.heroTitle || DEFAULT_PUBLIC_OVERVIEW.heroTitle,
    heroSubtitle: raw.heroSubtitle || DEFAULT_PUBLIC_OVERVIEW.heroSubtitle,
    securityLabel: raw.securityLabel || DEFAULT_PUBLIC_OVERVIEW.securityLabel,
    certificationNote: raw.certificationNote || DEFAULT_PUBLIC_OVERVIEW.certificationNote,
    featuredSocieties,
    showcaseItems,
    isLive: true,
  };
}

export const platformPublicService = {
  async getOverview(): Promise<PublicPlatformOverview> {
    try {
      const res = await api.get('/communities/public/overview');
      return normalizePublicOverview(res.data);
    } catch {
      // Fallback to public GET /communities on older servers so societies & cities
      // still come directly from the live database without inventing resident numbers.
      try {
        const listRes = await api.get<any[]>('/communities');
        const list = Array.isArray(listRes.data) ? listRes.data : [];
        const cities = new Set(
          list.map((c) => (c?.city || '').trim().toLowerCase()).filter(Boolean),
        );
        return {
          ...DEFAULT_PUBLIC_OVERVIEW,
          totalSocieties: list.length,
          totalCities: cities.size,
          featuredSocieties: list.slice(0, 6).map((c) => ({
            id: Number(c.id),
            name: String(c.name),
            type: c.type ? String(c.type) : undefined,
            city: c.city ? String(c.city) : undefined,
            area: c.area ? String(c.area) : undefined,
            residentCount: null,
          })),
          isLive: true,
        };
      } catch {
        return DEFAULT_PUBLIC_OVERVIEW;
      }
    }
  },
};
