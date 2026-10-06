import { useEffect, useRef } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import { useQueryClient } from '@tanstack/react-query';
import { CONFIG } from '@/constants/config';
import { tokenStore } from '@/services/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { secureLog } from '@/security';

export interface RealtimeEvent {
  module: string;
  action: string;
  entityId?: string | number;
  payload?: any;
  timestamp?: string;
}

export function useRealtimeSync(enabled: boolean = true) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const stompClientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !enabled || !user?.id) {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
        stompClientRef.current = null;
      }
      return;
    }

    let isCancelled = false;

    (async () => {
      const token = await tokenStore.getAccess();
      if (!token || isCancelled) return;

      const client = new Client({
        brokerURL: CONFIG.WS_URL,
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,

        onConnect: () => {
          secureLog.debug('[RealtimeSync] Connected to live STOMP broker');

          const handleLiveEvent = (topic: string, msg: IMessage) => {
            try {
              const event: RealtimeEvent = JSON.parse(msg.body);
              secureLog.debug(`[RealtimeSync] Live event on ${topic}:`, event);

              switch (event.module) {
                case 'FEED':
                case 'POSTS':
                  queryClient.invalidateQueries({ queryKey: ['posts'] });
                  queryClient.invalidateQueries({ queryKey: ['feed'] });
                  break;
                case 'COMMERCE':
                case 'ORDERS':
                  queryClient.invalidateQueries({ queryKey: ['commerce-orders'] });
                  queryClient.invalidateQueries({ queryKey: ['commerce-products'] });
                  queryClient.invalidateQueries({ queryKey: ['my-orders'] });
                  break;
                case 'GROUP_BUYING':
                case 'DEALS':
                  queryClient.invalidateQueries({ queryKey: ['group-buying-deals'] });
                  queryClient.invalidateQueries({ queryKey: ['group-buying-orders'] });
                  queryClient.invalidateQueries({ queryKey: ['demand-pools'] });
                  break;
                case 'NOTIFICATIONS':
                  queryClient.invalidateQueries({ queryKey: ['notifications'] });
                  queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
                  break;
                case 'VISITORS':
                case 'GATE':
                  queryClient.invalidateQueries({ queryKey: ['visitors'] });
                  queryClient.invalidateQueries({ queryKey: ['visitor-passes'] });
                  queryClient.invalidateQueries({ queryKey: ['guard-visitors'] });
                  break;
                case 'EMERGENCY':
                case 'SOS':
                  queryClient.invalidateQueries({ queryKey: ['emergency-alerts'] });
                  queryClient.invalidateQueries({ queryKey: ['active-sos'] });
                  break;
                case 'EVENTS':
                case 'CALENDAR':
                  queryClient.invalidateQueries({ queryKey: ['events'] });
                  queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
                  queryClient.invalidateQueries({ queryKey: ['mana-calendar'] });
                  break;
                case 'POLLS':
                  queryClient.invalidateQueries({ queryKey: ['polls'] });
                  queryClient.invalidateQueries({ queryKey: ['active-polls'] });
                  break;
                case 'PARKING':
                  queryClient.invalidateQueries({ queryKey: ['parking-bays'] });
                  queryClient.invalidateQueries({ queryKey: ['parking-bookings'] });
                  break;
                case 'FACILITIES':
                  queryClient.invalidateQueries({ queryKey: ['facilities'] });
                  queryClient.invalidateQueries({ queryKey: ['facility-bookings'] });
                  break;
                case 'PERSONAL_FINANCE':
                case 'FINANCE':
                  queryClient.invalidateQueries({ queryKey: ['personal-finance-dashboard'] });
                  queryClient.invalidateQueries({ queryKey: ['personal-finance-accounts'] });
                  queryClient.invalidateQueries({ queryKey: ['personal-finance-transactions'] });
                  queryClient.invalidateQueries({ queryKey: ['personal-finance-bills'] });
                  break;
                default:
                  // Generic query invalidation by module name
                  if (event.module) {
                    queryClient.invalidateQueries({ queryKey: [event.module.toLowerCase()] });
                  }
                  break;
              }
            } catch (err) {
              secureLog.warn('[RealtimeSync] Could not parse message frame', err);
            }
          };

          // ── Subscribe to Live Community Topics ──────────────────────
          const communityId = (user as any).communityId || 1;
          const topics = [
            `/topic/community.${communityId}`,
            `/topic/community/${communityId}`,
            '/topic/feed',
            '/topic/commerce',
            '/topic/group-buying',
            '/topic/notifications',
            `/topic/notifications.${user.id}`,
            `/topic/notifications/${user.id}`,
            '/topic/visitors',
            '/topic/emergency',
            '/topic/events',
            '/topic/calendar',
            '/topic/polls',
            '/topic/parking',
            '/topic/facilities',
            `/user/queue/notifications`,
            `/user/queue/commerce`,
          ];

          topics.forEach((t) => {
            client.subscribe(t, (frame: IMessage) => handleLiveEvent(t, frame));
          });
        },

        onStompError: (frame) => {
          secureLog.warn('[RealtimeSync] STOMP Error', { msg: frame.headers['message'] });
        },
      });

      client.activate();
      stompClientRef.current = client;
    })();

    return () => {
      isCancelled = true;
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
        stompClientRef.current = null;
      }
    };
  }, [isAuthenticated, enabled, user?.id, queryClient]);
}
