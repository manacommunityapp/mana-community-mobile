import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';

import en from '@/locales/en.json';
import hi from '@/locales/hi.json';

const i18n = new I18n({ en, hi });

const deviceLocale = getLocales()[0]?.languageCode ?? 'en';
i18n.locale = deviceLocale;
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export { i18n };

export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

export function setLocale(locale: string) {
  i18n.locale = locale;
}

export function getLocale(): string {
  return i18n.locale;
}
