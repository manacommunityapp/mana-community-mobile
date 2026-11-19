import { apiClient } from './apiClient';

export type SearchModule =
  | 'PERSON'
  | 'EVENT' | 'POOJA'
  | 'SPORTS_EVENT' | 'COACHING'
  | 'FOOD_RESTAURANT' | 'FOOD_MENU_ITEM' | 'GROCERY_PRODUCT' | 'HOME_CHEF'
  | 'HOME_SERVICE' | 'VENDOR'
  | 'MARKETPLACE_LISTING'
  | 'HEALTH_DOCTOR' | 'HEALTH_CLINIC'
  | 'COURSE' | 'WORKSHOP'
  | 'TRIP' | 'RIDE'
  | 'JOB' | 'PROFESSIONAL_SERVICE';

export interface SearchResultDto {
  id: string;
  module: SearchModule;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  tags?: string[];
  deepLinkType: string;
  deepLinkId: string;
  rank: number;
  metadata?: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResultDto[];
  facets: Record<string, number>;
  total: number;
  page: number;
  size: number;
}

export const searchService = {
  search: (params: {
    q: string;
    modules?: SearchModule[];
    page?: number;
    size?: number;
  }): Promise<SearchResponse> =>
    apiClient
      .get<SearchResponse>('/search', {
        params: {
          q: params.q,
          modules: params.modules?.join(','),
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      })
      .then((r) => r.data),
};
