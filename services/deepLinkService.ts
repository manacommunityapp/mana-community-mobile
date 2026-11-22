import { Linking } from 'react-native';
import { secureLog } from '@/security/secureLogger';

export interface DeepLinkRoute {
  path: string;
  params: Record<string, string>;
  originalUrl: string;
}

/**
 * Route a deep link falls back to when it names nothing recognised.
 * `/tabs/feed` is the app's home tab (see app/tabs/_layout.tsx).
 */
const SAFE_FALLBACK_ROUTE = '/tabs/feed';

/** A single id path segment: no slashes, so nested paths cannot slip through. */
const ID_SEGMENT = /^[A-Za-z0-9._-]{1,128}$/;

type RouteRule =
  | { kind: 'exact'; match: string[]; target: string }
  | { kind: 'prefix'; prefix: string };

/**
 * The complete set of routes an inbound deep link may open. Anything outside
 * this list resolves to SAFE_FALLBACK_ROUTE, so a crafted link cannot reach
 * privileged routes (admin, finance, settings, ...).
 *
 * NOTE: the two payment targets below do not currently exist under `app/`.
 * They are preserved verbatim because the existing contract/tests depend on
 * them; the real screens still need to be created (or these remapped to
 * `/payments/receipt`) by whoever owns the payment flow.
 */
const ROUTE_ALLOWLIST: RouteRule[] = [
  // 1. Payment callbacks
  { kind: 'exact', match: ['/payment/success', '/payment/callback'], target: '/finance/payment-success' },
  { kind: 'exact', match: ['/payment/failed'], target: '/finance/payment-failed' },

  // 2. Emergency SOS
  { kind: 'exact', match: ['/emergency', '/sos'], target: '/emergency' },

  // 3-6. Resource routes, passed through only under a known-safe prefix.
  { kind: 'prefix', prefix: '/services/ticket/' },
  { kind: 'prefix', prefix: '/visitor/pass/' },
  { kind: 'prefix', prefix: '/chat/' },
  { kind: 'prefix', prefix: '/events/' },
];

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
    if (!cleanPath) return SAFE_FALLBACK_ROUTE;

    for (const rule of ROUTE_ALLOWLIST) {
      if (rule.kind === 'exact') {
        if (rule.match.includes(cleanPath)) return rule.target;
        continue;
      }
      if (cleanPath.startsWith(rule.prefix)) {
        const id = cleanPath.slice(rule.prefix.length);
        // A single, well-formed id segment only — this blocks nested paths and
        // traversal such as `/chat/../admin/audit-logs`.
        if (ID_SEGMENT.test(id) && !id.includes('..')) {
          return `${rule.prefix}${id}`;
        }
        break;
      }
    }

    // Deny by default. Returning `cleanPath` verbatim here previously let any
    // inbound link resolve to any route, including `mana://admin/audit-logs`.
    secureLog.security('[DeepLink] Rejected unrecognised route', { path: cleanPath });
    return SAFE_FALLBACK_ROUTE;
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
