import { apiClient } from "./apiClient";
import type { CalendarDomain, CalendarEventItem } from "@/types/manaCalendar";

export const manaCalendarService = {
  getTimeline: async (params?: {
    from?: string;
    to?: string;
    domain?: CalendarDomain;
    onlyMine?: boolean;
    q?: string;
  }): Promise<CalendarEventItem[]> => {
    try {
      const res = await apiClient.get<CalendarEventItem[]>("/api/calendar/timeline", { params });
      return (res.data as any)?.data || res.data;
    } catch {
      return [];
    }
  },
};
