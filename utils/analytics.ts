import { secureLog } from '@/security';

type EventProperties = Record<string, string | number | boolean | null>;

interface AnalyticsAdapter {
  init(token: string): void;
  identify(userId: string, traits?: EventProperties): void;
  track(event: string, properties?: EventProperties): void;
  screen(name: string, properties?: EventProperties): void;
  reset(): void;
}

const noopAdapter: AnalyticsAdapter = {
  init: () => {},
  identify: () => {},
  track: () => {},
  screen: () => {},
  reset: () => {},
};

let adapter: AnalyticsAdapter = noopAdapter;
let initialized = false;

export const analytics = {
  init(token: string, customAdapter?: AnalyticsAdapter) {
    if (initialized) return;
    adapter = customAdapter || createConsoleAdapter();
    adapter.init(token);
    initialized = true;
    secureLog.debug('[Analytics] Initialized');
  },

  identify(userId: string, traits?: EventProperties) {
    adapter.identify(userId, traits);
  },

  track(event: string, properties?: EventProperties) {
    adapter.track(event, properties);
  },

  screen(name: string, properties?: EventProperties) {
    adapter.screen(name, properties);
  },

  reset() {
    adapter.reset();
  },
};

function createConsoleAdapter(): AnalyticsAdapter {
  return {
    init: () => secureLog.debug('[Analytics] Console adapter ready'),
    identify: (userId, traits) => secureLog.debug(`[Analytics] identify: ${userId}`, traits),
    track: (event, props) => secureLog.debug(`[Analytics] track: ${event}`, props),
    screen: (name, props) => secureLog.debug(`[Analytics] screen: ${name}`, props),
    reset: () => secureLog.debug('[Analytics] reset'),
  };
}

// Screen tracking events
export const AnalyticsEvents = {
  // Auth
  LOGIN: 'user_login',
  LOGOUT: 'user_logout',
  REGISTER: 'user_register',

  // Feed
  POST_CREATE: 'post_create',
  POST_LIKE: 'post_like',
  POST_COMMENT: 'post_comment',

  // Services
  SERVICE_BOOK: 'service_book',
  SERVICE_CANCEL: 'service_cancel',

  // Marketplace
  LISTING_CREATE: 'listing_create',
  LISTING_VIEW: 'listing_view',

  // Visitor
  VISITOR_INVITE: 'visitor_invite',

  // Parking
  PARKING_BOOK: 'parking_book',

  // Emergency
  SOS_TRIGGER: 'sos_trigger',

  // Finance
  PAYMENT_MADE: 'payment_made',

  // Facility
  FACILITY_BOOK: 'facility_book',

  // Navigation
  SCREEN_VIEW: 'screen_view',
  TAB_SWITCH: 'tab_switch',
  MODULE_OPEN: 'module_open',
} as const;
