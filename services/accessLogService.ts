import api from './apiClient';

export type AccessDecision = 'ACCESS_GRANTED' | 'ACCESS_DENIED' | 'TIME_RESTRICTED' | string;

export interface AccessLogDto {
  id: number;
  turnstileId?: number;
  turnstileName?: string;
  personName?: string;
  personType?: string;
  unitNumber?: string;
  confidenceScore?: number;
  accessDecision?: AccessDecision;
  failureReason?: string;
  snapshotUrl?: string;
  timestamp: string;
}

export interface AccessLogPage {
  content: AccessLogDto[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
}

/** Access history is intentionally API-only: an empty result means no recorded events. */
export const accessLogService = {
  async getCommunityLogs(communityId: number, page = 0, size = 30): Promise<AccessLogPage> {
    const res = await api.get<AccessLogPage>(
      `/api/v1/access/turnstiles/logs/${communityId}?page=${page}&size=${size}&sort=timestamp,desc`,
    );
    const data = res.data as AccessLogPage | AccessLogDto[];
    if (Array.isArray(data)) return { content: data };
    return { ...data, content: Array.isArray(data?.content) ? data.content : [] };
  },
};

