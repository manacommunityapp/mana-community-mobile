import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { secureLog } from '@/security';

export const deepLinkPrefix = Linking.createURL('/');

export function handleDeepLinkUrl(url: string) {
  if (!url) return;
  try {
    const parsed = Linking.parse(url);
    const path = parsed.path;
    const queryParams = parsed.queryParams;

    secureLog.debug('DeepLink received:', { path, queryParams });

    if (!path) return;

    if (path.startsWith('commerce/order/')) {
      const orderNumber = path.replace('commerce/order/', '');
      router.push(`/commerce?order=${orderNumber}` as any);
    } else if (path.startsWith('events/')) {
      const eventId = path.replace('events/', '');
      router.push(`/events/${eventId}` as any);
    } else if (path.startsWith('calendar')) {
      router.push('/tabs/calendar' as any);
    } else if (path.startsWith('guard')) {
      router.push('/guard/tabs/dashboard' as any);
    } else if (path.startsWith('vendor')) {
      router.push('/vendor/tabs/dashboard' as any);
    } else if (path.startsWith('admin')) {
      router.push('/admin-role/tabs/dashboard' as any);
    }
  } catch (err) {
    secureLog.warn('Failed to parse deep link URL', err);
  }
}
