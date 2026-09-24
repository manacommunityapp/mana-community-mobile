import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { profileService } from '@/services/profileService';
import { tokenStore } from '@/services/apiClient';
import Constants from 'expo-constants';

let Notifications: typeof import('expo-notifications') | null = null;

try {
  Notifications = require('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Mana Community',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F46E5',
      sound: 'default',
    });

    Notifications.setNotificationChannelAsync('chat', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 150],
      lightColor: '#4F46E5',
      sound: 'default',
    });

    Notifications.setNotificationChannelAsync('events', {
      name: 'Events & Announcements',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }
} catch {
  console.warn('[Push] expo-notifications not available (Expo Go SDK 53+). Push disabled.');
}

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
      return '/tabs/events';
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

export function usePushNotifications(isAuthenticated: boolean) {
  const router = useRouter();
  const foregroundSub = useRef<any>(null);
  const responseSub = useRef<any>(null);
  const tokenRegistered = useRef(false);

  useEffect(() => {
    if (!Notifications || !isAuthenticated) {
      tokenRegistered.current = false;
      return;
    }

    if (tokenRegistered.current) return;

    (async () => {
      if (!Device.isDevice) {
        console.log('[Push] Skipping — not a physical device');
        return;
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;

      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[Push] Permission denied');
        return;
      }

      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          (Constants as any)?.easConfig?.projectId ??
          undefined;

        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );

        const token = tokenData.data;
        const platform = Platform.OS as 'ios' | 'android';

        await profileService.registerPushToken(token, platform);
        await tokenStore.setPushToken(token);
        tokenRegistered.current = true;
        console.log('[Push] Token registered:', token.slice(0, 24) + '…');
      } catch (err) {
        console.warn('[Push] Token registration failed:', err);
      }
    })();

    foregroundSub.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[Push] Foreground notification:', notification.request.content.title);
      },
    );

    responseSub.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, unknown>;
        const route = resolveRoute(data);
        if (route) {
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
