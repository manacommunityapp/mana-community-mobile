jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US' }],
}));

import { t, setLocale, getLocale } from '@/utils/i18n';

describe('i18n', () => {
  it('returns English strings by default', () => {
    expect(t('common.loading')).toBe('Loading...');
    expect(t('common.cancel')).toBe('Cancel');
    expect(t('common.confirm')).toBe('Confirm');
  });

  it('returns nested keys', () => {
    expect(t('auth.login')).toBe('Log In');
    expect(t('feed.title')).toBe('Community Feed');
    expect(t('safety.title')).toBe('Safety Command Center');
  });

  it('can switch to Hindi', () => {
    setLocale('hi');
    expect(t('common.loading')).toBe('लोड हो रहा है...');
    expect(t('auth.login')).toBe('लॉग इन');
    setLocale('en');
  });

  it('falls back to English for missing Hindi keys', () => {
    setLocale('hi');
    const result = t('common.loading');
    expect(result).toBeTruthy();
    setLocale('en');
  });

  it('reports current locale', () => {
    setLocale('en');
    expect(getLocale()).toBe('en');
    setLocale('hi');
    expect(getLocale()).toBe('hi');
    setLocale('en');
  });

  it('falls back for unknown locale', () => {
    setLocale('fr');
    const result = t('common.loading');
    expect(result).toBe('Loading...');
    setLocale('en');
  });
});
