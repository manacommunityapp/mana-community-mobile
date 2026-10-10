(globalThis as any).__DEV__ = true;

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: jest.fn((obj) => obj.ios) },
  Linking: {
    getInitialURL: jest.fn().mockResolvedValue(null),
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  osBuildId: 'test-build-123',
  isRootedExperimentalAsync: jest.fn().mockResolvedValue(false),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[mock]' }),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
}));

jest.mock('@/services/profileService', () => ({
  profileService: {
    addPushToken: jest.fn().mockResolvedValue({}),
    removePushToken: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn().mockResolvedValue(undefined),
  allowScreenCaptureAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn().mockResolvedValue('test_token'),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/security/secureLogger', () => ({
  secureLog: {
    warn: jest.fn(),
    info: jest.fn(),
    security: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

import { deepLinkService } from '@/services/deepLinkService';
import { deviceSecurity } from '@/security/deviceSecurity';
import { normalizeApiPath } from '@/services/apiClient';
import { resolveRoute } from '@/hooks/usePushNotifications';

describe('Mobile Platform Verification Suite', () => {

  describe('Pillar 1: Secure Token Storage & API Path Normalization', () => {
    it('normalizes redundant /api prefixes preventing double /api/api routing errors', () => {
      expect(normalizeApiPath('/api/v1/emergency/sos/trigger')).toBe('/v1/emergency/sos/trigger');
      expect(normalizeApiPath('api/v1/access/turnstiles')).toBe('/v1/access/turnstiles');
      expect(normalizeApiPath('/users/me')).toBe('/users/me');
      expect(normalizeApiPath('/api')).toBe('');
      expect(normalizeApiPath('')).toBe('');
    });
  });

  describe('Pillar 2: Deep Link Routing', () => {
    it('parses custom scheme mana://payment/success and resolves route', () => {
      const route = deepLinkService.parseDeepLink('mana://payment/success?ref=TXN-12345&amount=500');
      expect(route).not.toBeNull();
      expect(route?.path).toBe('/finance/payment-success');
      expect(route?.params.ref).toBe('TXN-12345');
      expect(route?.params.amount).toBe('500');
    });

    it('parses custom scheme mana-community://visitor/pass/402', () => {
      const route = deepLinkService.parseDeepLink('mana-community://visitor/pass/402');
      expect(route).not.toBeNull();
      expect(route?.path).toBe('/visitor/pass/402');
    });

    it('parses universal link https://app.manacommunity.com/services/ticket/SR-999', () => {
      const route = deepLinkService.parseDeepLink('https://app.manacommunity.com/services/ticket/SR-999?priority=HIGH');
      expect(route).not.toBeNull();
      expect(route?.path).toBe('/services/ticket/SR-999');
      expect(route?.params.priority).toBe('HIGH');
    });

    it('parses emergency SOS deep link mana://emergency', () => {
      const route = deepLinkService.parseDeepLink('mana://emergency');
      expect(route).not.toBeNull();
      expect(route?.path).toBe('/emergency');
    });

    it('returns null for invalid or unsupported URL protocols', () => {
      expect(deepLinkService.parseDeepLink('invalid-url-string')).toBeNull();
      expect(deepLinkService.parseDeepLink('ftp://files.example.com')).toBeNull();
    });
  });

  describe('Pillar 3: Native-Device Security', () => {
    it('inspects device security without throwing unhandled exceptions', async () => {
      const status = await deviceSecurity.inspectDevice();
      expect(status).toHaveProperty('isDevice');
      expect(status).toHaveProperty('isRootedOrJailbroken');
      expect(status).toHaveProperty('securityViolations');
      expect(Array.isArray(status.securityViolations)).toBe(true);
    });

    it('enables and disables screen capture protection gracefully', async () => {
      const enabled = await deviceSecurity.enableScreenProtection();
      expect(typeof enabled).toBe('boolean');

      const disabled = await deviceSecurity.disableScreenProtection();
      expect(typeof disabled).toBe('boolean');
    });
  });

  describe('Pillar 4: Push Notification Route Resolution', () => {
    it('routes NEW_MESSAGE to conversation chat screen', () => {
      expect(resolveRoute({ type: 'NEW_MESSAGE', conversationId: 55 })).toBe('/chat/55');
      expect(resolveRoute({ type: 'NEW_MESSAGE' })).toBe('/tabs/chat');
    });

    it('routes NEW_EVENT and EVENT_REMINDER to events screen', () => {
      expect(resolveRoute({ type: 'NEW_EVENT', eventId: 10 })).toBe('/tabs/events');
      expect(resolveRoute({ type: 'EVENT_REMINDER', eventId: 10 })).toBe('/tabs/events');
    });

    it('routes SOS_ALERT and EMERGENCY to safety screen', () => {
      expect(resolveRoute({ type: 'SOS_ALERT' })).toBe('/safety');
      expect(resolveRoute({ type: 'EMERGENCY' })).toBe('/safety');
    });

    it('routes PAYMENT_DUE and INVOICE to finance screen', () => {
      expect(resolveRoute({ type: 'PAYMENT_DUE' })).toBe('/finance');
      expect(resolveRoute({ type: 'INVOICE' })).toBe('/finance');
    });

    it('routes VISITOR_ARRIVAL to visitors screen', () => {
      expect(resolveRoute({ type: 'VISITOR_ARRIVAL' })).toBe('/visitors');
    });
  });
});
