import { foodService } from './foodService';
import { facilityService } from './facilityService';
import { sportsService } from './sportsService';
import { tripsService } from './tripsService';
import { smartHelpdeskService } from './smartHelpdeskService';
import { eventService } from './eventService';
import { commerceCoreService } from './commerceCoreService';
import { marketplaceService } from './marketplaceService';
import { paymentsService } from './paymentsService';
import { visitorService } from './visitorService';

export type ActivityCategory =
  | 'ALL'
  | 'ORDERS'
  | 'BOOKINGS'
  | 'PAYMENTS'
  | 'COMPLAINTS'
  | 'SPORTS_EVENTS'
  | 'VISITORS';

export interface ActivityItem {
  id: string;
  category: Exclude<ActivityCategory, 'ALL'>;
  title: string;
  subtitle: string;
  timestamp: string;
  status: string;
  amount?: string;
  icon: string;
  color: string;
  bg: string;
  route?: string;
}

function statusColor(status: string): { text: string; bg: string } {
  const s = status?.toUpperCase() ?? '';
  if (['PAID', 'CONFIRMED', 'APPROVED', 'DELIVERED', 'COMPLETED', 'RESOLVED', 'ACTIVE'].includes(s))
    return { text: '#059669', bg: '#D1FAE5' };
  if (['PENDING', 'OPEN', 'PLACED', 'WAITLISTED', 'PREPARING'].includes(s))
    return { text: '#D97706', bg: '#FEF3C7' };
  if (['CANCELLED', 'CLOSED', 'REJECTED', 'FAILED'].includes(s))
    return { text: '#DC2626', bg: '#FEE2E2' };
  if (['IN_PROGRESS', 'OUT_FOR_DELIVERY', 'ASSIGNED'].includes(s))
    return { text: '#2563EB', bg: '#DBEAFE' };
  return { text: '#64748B', bg: '#F1F5F9' };
}

function fmt(amount?: number): string | undefined {
  if (amount == null) return undefined;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export async function fetchAllActivity(): Promise<ActivityItem[]> {
  const [
    foodOrders,
    facilityBookings,
    tripBookings,
    tickets,
    myTournaments,
    myEvents,
    commerceOrders,
    receiptData,
    visitorData,
    marketplaceData,
  ] = await Promise.allSettled([
    foodService.getMyOrders(),
    facilityService.getMyBookings(),
    tripsService.getMyBookings(),
    smartHelpdeskService.getTickets(),
    sportsService.getMyTournaments(),
    eventService.getMyEvents(),
    commerceCoreService.getMyOrders(),
    paymentsService.listReceipts(),
    visitorService.getMyVisitors(),
    marketplaceService.getMyOrders(0),
  ]);

  const items: ActivityItem[] = [];

  // ── Orders (food) ───────────────────────────────────────────────
  if (foodOrders.status === 'fulfilled') {
    for (const o of foodOrders.value ?? []) {
      items.push({
        id: `food-${o.id}`,
        category: 'ORDERS',
        title: `Order · ${o.restaurantName}`,
        subtitle: `${o.items?.length ?? 0} item${(o.items?.length ?? 1) !== 1 ? 's' : ''}`,
        timestamp: o.orderTime,
        status: o.status,
        amount: fmt(o.totalAmount),
        icon: 'fast-food-outline',
        color: '#EA580C',
        bg: '#FFEDD5',
        route: '/food',
      });
    }
  }

  // ── Orders (commerce / marketplace) ────────────────────────────
  if (commerceOrders.status === 'fulfilled') {
    for (const o of commerceOrders.value ?? []) {
      items.push({
        id: `commerce-${o.id}`,
        category: 'ORDERS',
        title: `Order #${String(o.id).slice(-6)}`,
        subtitle: o.channel ? `Channel: ${o.channel}` : 'Community Store',
        timestamp: o.createdAt ?? new Date().toISOString(),
        status: o.status ?? 'PLACED',
        amount: fmt(o.totalAmount),
        icon: 'bag-handle-outline',
        color: '#7C3AED',
        bg: '#EDE9FE',
        route: '/tabs/marketplace',
      });
    }
  }

  if (marketplaceData.status === 'fulfilled') {
    const page = marketplaceData.value;
    const list = Array.isArray(page) ? page : (page as any)?.items ?? [];
    for (const o of list) {
      items.push({
        id: `mkt-${o.id}`,
        category: 'ORDERS',
        title: `Marketplace Order`,
        subtitle: o.title ?? 'Item',
        timestamp: o.createdAt ?? new Date().toISOString(),
        status: o.status ?? 'PLACED',
        amount: fmt(o.price ?? o.totalAmount),
        icon: 'storefront-outline',
        color: '#DC2626',
        bg: '#FEE2E2',
        route: '/tabs/marketplace',
      });
    }
  }

  // ── Bookings (facility) ─────────────────────────────────────────
  if (facilityBookings.status === 'fulfilled') {
    for (const b of facilityBookings.value ?? []) {
      items.push({
        id: `fac-${b.id}`,
        category: 'BOOKINGS',
        title: `Amenity · ${b.facilityName}`,
        subtitle: `${b.date}  ${b.startTime}–${b.endTime}`,
        timestamp: b.date ?? b.createdAt ?? new Date().toISOString(),
        status: b.status,
        amount: fmt(b.totalAmount),
        icon: 'fitness-outline',
        color: '#059669',
        bg: '#D1FAE5',
        route: '/facilities',
      });
    }
  }

  // ── Bookings (trips) ────────────────────────────────────────────
  if (tripBookings.status === 'fulfilled') {
    for (const b of tripBookings.value ?? []) {
      items.push({
        id: `trip-${b.id}`,
        category: 'BOOKINGS',
        title: `Trip · ${b.tripTitle}`,
        subtitle: `${b.destination} · ${b.participantCount} traveller${b.participantCount !== 1 ? 's' : ''}`,
        timestamp: b.bookedAt ?? b.departureDate ?? new Date().toISOString(),
        status: b.status,
        amount: fmt(b.totalAmount),
        icon: 'airplane-outline',
        color: '#0891B2',
        bg: '#CFFAFE',
        route: '/trips',
      });
    }
  }

  // ── Payments (receipts) ─────────────────────────────────────────
  if (receiptData.status === 'fulfilled') {
    for (const r of receiptData.value ?? []) {
      items.push({
        id: `pay-${r.id}`,
        category: 'PAYMENTS',
        title: `Payment · ${r.sourceModule?.replace(/_/g, ' ')}`,
        subtitle: `Ref: ${r.receiptNumber}`,
        timestamp: r.paidAt,
        status: 'PAID',
        amount: fmt(r.amount),
        icon: 'card-outline',
        color: '#4F46E5',
        bg: '#EEF2FF',
        route: '/finance',
      });
    }
  }

  // ── Complaints (helpdesk) ───────────────────────────────────────
  if (tickets.status === 'fulfilled') {
    for (const t of tickets.value ?? []) {
      items.push({
        id: `ticket-${t.id}`,
        category: 'COMPLAINTS',
        title: t.title,
        subtitle: `${t.category} · #${t.ticketNumber}`,
        timestamp: t.createdAt,
        status: t.status,
        icon: 'hammer-outline',
        color: '#D97706',
        bg: '#FEF3C7',
        route: '/helpdesk',
      });
    }
  }

  // ── Sports & Events (tournaments) ───────────────────────────────
  if (myTournaments.status === 'fulfilled') {
    for (const t of myTournaments.value ?? []) {
      items.push({
        id: `tourney-${t.id}`,
        category: 'SPORTS_EVENTS',
        title: `Tournament · ${t.name}`,
        subtitle: `${t.sport} · ${t.registeredTeamsCount ?? 0} teams`,
        timestamp: t.startDate ?? new Date().toISOString(),
        status: t.status ?? 'UPCOMING',
        icon: 'trophy-outline',
        color: '#059669',
        bg: '#D1FAE5',
        route: '/sports',
      });
    }
  }

  // ── Sports & Events (events) ────────────────────────────────────
  if (myEvents.status === 'fulfilled') {
    for (const e of myEvents.value ?? []) {
      items.push({
        id: `evt-${e.id}`,
        category: 'SPORTS_EVENTS',
        title: `Event · ${e.title}`,
        subtitle: e.location ?? 'Community Event',
        timestamp: e.startDate ?? e.date ?? new Date().toISOString(),
        status: e.isRegistered ? 'REGISTERED' : 'ATTENDED',
        icon: 'calendar-outline',
        color: '#7C3AED',
        bg: '#EDE9FE',
        route: '/tabs/events',
      });
    }
  }

  // ── Visitors ────────────────────────────────────────────────────
  if (visitorData.status === 'fulfilled') {
    const visitors = Array.isArray(visitorData.value) ? visitorData.value : [];
    for (const v of visitors) {
      items.push({
        id: `vis-${v.id}`,
        category: 'VISITORS',
        title: `Visitor · ${v.visitorName ?? 'Guest'}`,
        subtitle: v.purpose ?? v.passType ?? 'Entry Pass',
        timestamp: v.checkedInAt ?? v.createdAt ?? new Date().toISOString(),
        status: String(v.status ?? 'EXPECTED'),
        icon: 'shield-checkmark-outline',
        color: '#0891B2',
        bg: '#CFFAFE',
        route: '/visitors',
      });
    }
  }

  return items.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}
