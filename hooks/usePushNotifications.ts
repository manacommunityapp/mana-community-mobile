import { useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { profileService } from '@/services/profileService';

// ── Global foreground handler (show banner while app is open) ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
  }),
});

// ── Android notification channel ───────────────────────────────
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name:              'Mana Community',
    importance:        Notifications.AndroidImportance.MAX,
    vibrationPattern:  [0, 250, 250, 250],
    lightColor:        '#4F46E5',
    sound:             'default',
  });

  Notifications.setNotificationChannelAsync('chat', {
    name:              'Messages',
    importance:        Notifications.AndroidImportance.HIGH,
    vibrationPattern:  [0, 150],
    lightColor:        '#4F46E5',
    sound:             'default',
  });

  Notifications.setNotificationChannelAsync('events', {
    name:              'Events & Announcements',
    importance:        Notifications.AndroidImportance.DEFAULT,
    sound:             'default',
  });
}

// ── Derive navigation target from notification data ────────────
function resolveRoute(data: Record<string, unknown>): string | null {
  const type = data?.type as string | undefined;
  switch (type) {
    case 'NEW_MESSAGE':
      return data.conversationId ? `/chat/${data.conversationId}` : '/tabs/chat';
    case 'NEW_POST':
    case 'POST_LIKE':
    case 'POST_COMMENT':
      return '/tabs/feed';
    case 'NEW_EVENT':
    case 'EVENT_REMINDER':
      return data.eventId ? `/events/${data.eventId}` : '/tabs/events';
    case 'SPORTS_MATCH':
    case 'SPORTS_RESULT':
      return '/tabs/sports';
    case 'AUCTION_BID':
    case 'AUCTION_START':
      return '/auction';
    default:
      return null;
  }
}

// ── Hook ───────────────────────────────────────────────────────
export function usePushNotifications(isAuthenticated: boolean) {
  const router              = useRouter();
  const foregroundSub       = useRef<Notifications.EventSubscription | null>(null);
  const responseSub         = useRef<Notifications.EventSubscription | null>(null);
  const tokenRegistered     = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || tokenRegistered.current) return;

    (async () => {
      // Physical device required for push tokens
      if (!Device.isDevice) {
        console.log('[Push] Skipping — not a physical device');
        return;
      }

      // Request permission
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;

      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        // Don't be annoying — just skip silently
        console.log('[Push] Permission denied');
        return;
      }

      // Get Expo push token
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'YOUR_EAS_PROJECT_ID', // ← replace from eas.json / app.json
        });

        const token    = tokenData.data;
        const platform = Platform.OS as 'ios' | 'android';

        await profileService.registerPushToken(token, platform);
        tokenRegistered.current = true;
        console.log('[Push] Token registered:', token.slice(0, 24) + '…');
      } catch (err) {
        console.warn('[Push] Token registration failed:', err);
      }
    })();

    // ── Foreground: notification arrives while app is open ───────
    foregroundSub.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        // Notification banner is shown automatically by setNotificationHandler above.
        // You could additionally update an unread badge in your state here.
        console.log('[Push] Foreground notification:', notification.request.content.title);
      },
    );

    // ── Background / killed: user taps the notification ──────────
    responseSub.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, unknown>;
        const route = resolveRoute(data);
        if (route) {
          // Small delay ensures the app is fully mounted before navigation
          setTimeout(() => router.push(route as any), 300);
        }
      },
    );

    return () => {
      foregroundSub.current?.remove();
      responseSub.current?.remove();
    };
  }, [isAuthenticated, router]);
}
