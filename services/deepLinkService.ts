import { Linking } from 'react-native';
import { secureLog } from '@/security/secureLogger';

export interface DeepLinkRoute {
  path: string;
  params: Record<string, string>;
  originalUrl: string;
}

/**
 * Service to parse, validate, and resolve deep links and universal links.
 * Supported schemes: mana://, mana-community://, https://app.manacommunity.com/
 */
export const deepLinkService = {
  parseDeepLink(url: string): DeepLinkRoute | null {
    if (!url || typeof url !== 'string') return null;

    try {
      // Normalize URL
      let cleanUrl = url.trim();
      let pathWithQuery = '';

      if (cleanUrl.startsWith('mana://') || cleanUrl.startsWith('mana-community://')) {
        pathWithQuery = cleanUrl.replace(/^(mana|mana-community):\/\//, '/');
      } else if (cleanUrl.startsWith('https://app.manacommunity.com')) {
        pathWithQuery = cleanUrl.replace('https://app.manacommunity.com', '');
      } else {
        return null;
      }

      // Ensure leading slash
      if (!pathWithQuery.startsWith('/')) {
        pathWithQuery = '/' + pathWithQuery;
      }

      const [pathname, queryString] = pathWithQuery.split('?');
      const params: Record<string, string> = {};

      if (queryString) {
        const searchParams = new URLSearchParams(queryString);
        searchParams.forEach((val, key) => {
          params[key] = val;
        });
      }

      const resolvedPath = this.resolveInternalRoute(pathname, params);

      return {
        path: resolvedPath,
        params,
        originalUrl: url,
      };
    } catch (e) {
      secureLog.warn('[DeepLink] Failed to parse URL: ' + url);
      return null;
    }
  },

  resolveInternalRoute(pathname: string, params: Record<string, string>): string {
    const cleanPath = pathname.replace(/\/+$/, ''); // trim trailing slash

    // 1. Payment callback
    if (cleanPath === '/payment/success' || cleanPath === '/payment/callback') {
      return '/finance/payment-success';
    }
    if (cleanPath === '/payment/failed') {
      return '/finance/payment-failed';
    }

    // 2. Emergency SOS
    if (cleanPath === '/emergency' || cleanPath === '/sos') {
      return '/emergency';
    }

    // 3. Service Ticket / Maintenance
    if (cleanPath.startsWith('/services/ticket/')) {
      const id = cleanPath.split('/services/ticket/')[1];
      return `/services/ticket/${id}`;
    }

    // 4. Visitor Gate Pass
    if (cleanPath.startsWith('/visitor/pass/')) {
      const id = cleanPath.split('/visitor/pass/')[1];
      return `/visitor/pass/${id}`;
    }

    // 5. Chat Conversation
    if (cleanPath.startsWith('/chat/')) {
      const id = cleanPath.split('/chat/')[1];
      return `/chat/${id}`;
    }

    // 6. Events
    if (cleanPath.startsWith('/events/')) {
      const id = cleanPath.split('/events/')[1];
      return `/events/${id}`;
    }

    // Default route fallback
    return cleanPath || '/tabs/home';
  },

  async getInitialRoute(): Promise<DeepLinkRoute | null> {
    const initialUrl = await Linking.getInitialURL();
    if (!initialUrl) return null;
    return this.parseDeepLink(initialUrl);
  },

  subscribe(callback: (route: DeepLinkRoute) => void): () => void {
    const subscription = Linking.addEventListener('url', (event) => {
      const route = this.parseDeepLink(event.url);
      if (route) {
        callback(route);
      }
    });

    return () => {
      subscription.remove();
    };
  },
};

export default deepLinkService;
