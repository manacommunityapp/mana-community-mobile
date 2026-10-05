export type CalendarDomain =
  | "EVENT"
  | "POOJA"
  | "SPORTS"
  | "ACADEMY"
  | "TRIP"
  | "GOVERNANCE"
  | "GROUP_BUY_PICKUP"
  | "BOOKING"
  | "PAYMENT"
  | "MAINTENANCE"
  | "COMMUNITY_MARKET";

export interface CalendarEventItem {
  id: string;
  domain: CalendarDomain;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  priority: "CRITICAL" | "HIGH" | "NORMAL" | "LOW";
  badge?: string;
  color: string;
  icon: string;
  organizerName?: string;
  targetRoute: string;
  actionLabel: string;
  isMyItem: boolean;
  googleCalendarUrl?: string;
}
