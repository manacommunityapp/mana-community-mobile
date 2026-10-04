import { analytics, AnalyticsEvents } from '@/utils/analytics';

jest.mock('@/security', () => ({
  secureLog: { warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

describe('analytics', () => {
  it('initializes without errors', () => {
    expect(() => analytics.init('test-token')).not.toThrow();
  });

  it('tracks events without errors', () => {
    analytics.init('test-token');
    expect(() => analytics.track(AnalyticsEvents.LOGIN, { method: 'email' })).not.toThrow();
    expect(() => analytics.track(AnalyticsEvents.SCREEN_VIEW, { screen: 'feed' })).not.toThrow();
  });

  it('identifies users without errors', () => {
    analytics.init('test-token');
    expect(() => analytics.identify('user-123', { role: 'RESIDENT' })).not.toThrow();
  });

  it('tracks screen views', () => {
    analytics.init('test-token');
    expect(() => analytics.screen('Feed')).not.toThrow();
  });

  it('resets without errors', () => {
    analytics.init('test-token');
    expect(() => analytics.reset()).not.toThrow();
  });

  it('has all expected event constants', () => {
    expect(AnalyticsEvents.LOGIN).toBe('user_login');
    expect(AnalyticsEvents.LOGOUT).toBe('user_logout');
    expect(AnalyticsEvents.SOS_TRIGGER).toBe('sos_trigger');
    expect(AnalyticsEvents.SERVICE_BOOK).toBe('service_book');
    expect(AnalyticsEvents.SCREEN_VIEW).toBe('screen_view');
  });
});
