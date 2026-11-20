import api from './apiClient';

export type FulfillmentEventType =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface FulfillmentEvent {
  id: number;
  orderId: string;
  eventType: FulfillmentEventType;
  actorRole?: string;
  note?: string;
  occurredAt: string;
}

export interface DeliveryAssignment {
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  estimatedArrival?: string;
  status: string;
}

const FALLBACK_EVENTS: FulfillmentEvent[] = [
  { id: 1, orderId: 'unknown', eventType: 'PLACED',    occurredAt: new Date(Date.now() - 900000).toISOString() },
  { id: 2, orderId: 'unknown', eventType: 'CONFIRMED', occurredAt: new Date(Date.now() - 600000).toISOString() },
];

export const fulfillmentService = {
  async getTimeline(orderId: string): Promise<FulfillmentEvent[]> {
    try {
      const res = await api.get<FulfillmentEvent[]>(`/orders/${orderId}/timeline`);
      return res.data ?? FALLBACK_EVENTS.map(e => ({ ...e, orderId }));
    } catch {
      return FALLBACK_EVENTS.map(e => ({ ...e, orderId }));
    }
  },

  async getCurrentStatus(orderId: string): Promise<FulfillmentEventType> {
    try {
      const res = await api.get<{ status: FulfillmentEventType }>(`/orders/${orderId}/status`);
      return res.data?.status ?? 'PLACED';
    } catch {
      return 'PLACED';
    }
  },

  async getDeliveryAssignment(orderId: string): Promise<DeliveryAssignment | null> {
    try {
      const res = await api.get<DeliveryAssignment>(`/orders/${orderId}/delivery-assignment`);
      return res.data ?? null;
    } catch {
      return null;
    }
  },
};
