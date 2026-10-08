export type ProfileVisibility = 'PUBLIC' | 'NEIGHBORS' | 'PRIVATE';

export type AccessLevel = 'FULL' | 'DISCOVERABLE' | 'MASKED' | 'DENIED';

export type RecommendationType =
  | 'GROUP_BUY_DEAL'
  | 'COMMUNITY_SERVICE'
  | 'SKILL_MATCH'
  | 'NEIGHBORHOOD_EVENT'
  | 'COMMUTE_CARPOOL'
  | 'COMMUNITY_POST'
  | 'MARKETPLACE_LISTING';

export interface CommunityProfile {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  tower: string;
  floor?: string;
  flatNumber?: string;
  profession?: string;
  skills: string[];
  interests: string[];
  bio?: string;
  visibility: ProfileVisibility;
  phone?: string;
  email?: string;
  isSameTower?: boolean;
  isPhoneMasked?: boolean;
  isEmailMasked?: boolean;
}

export interface RecommendationCard {
  id: string;
  type: RecommendationType;
  title: string;
  subtitle: string;
  badge?: string;
  score: number;
  reason: string;
  targetRoute: string;
  actionLabel: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
}

export interface OmniSearchItem {
  id: string;
  category: 'PEOPLE' | 'COMMERCE' | 'SERVICES' | 'EVENTS' | 'COMMUTE' | 'GROUPS';
  title: string;
  subtitle: string;
  icon: string;
  targetRoute: string;
  score: number;
}

export interface OmniSearchResponse {
  results: OmniSearchItem[];
  query: string;
  totalMatches: number;
}

export interface UpdateVisibilityRequest {
  visibility: ProfileVisibility;
  shareProfession?: boolean;
  shareSkills?: boolean;
  shareInterests?: boolean;
  showPhoneInDirectory?: boolean;
  showEmailInDirectory?: boolean;
}
