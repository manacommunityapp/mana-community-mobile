jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import { normalizeApiPath } from '@/services/apiClient';

describe('Mobile ApiClient - API path normalization', () => {
  it('strips leading /api/ from versioned API paths', () => {
    expect(normalizeApiPath('/api/v1/emergency/sos/trigger')).toBe('/v1/emergency/sos/trigger');
  });

  it('preserves paths without an api prefix', () => {
    expect(normalizeApiPath('/emergency/sos/trigger')).toBe('/emergency/sos/trigger');
  });

  it('normalizes unslashed and repeated api prefixes', () => {
    expect(normalizeApiPath('api/api/v1/me/profile')).toBe('/v1/me/profile');
  });

  it('normalizes the exact api path to an empty path', () => {
    expect(normalizeApiPath('/api')).toBe('');
    expect(normalizeApiPath('api')).toBe('');
  });

  it('preserves missing paths and trims whitespace', () => {
    expect(normalizeApiPath(undefined)).toBeUndefined();
    expect(normalizeApiPath('')).toBe('');
    expect(normalizeApiPath('  /api/v1/me/profile  ')).toBe('/v1/me/profile');
  });
});
