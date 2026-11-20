import Constants from 'expo-constants';

export function validateEnvConfig(): void {
  const required = ['EXPO_PUBLIC_API_BASE_URL'];
  const missing = required.filter(k => {
    const fromProcess = process.env[k];
    const fromExtra = Constants.expoConfig?.extra?.[k as keyof typeof Constants.expoConfig.extra];
    return !fromProcess && !fromExtra;
  });
  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    console.error(`[Security] Missing required env vars: ${missing.join(', ')}`);
  }
}

export function assertNoLocalhostInProd(url: string): void {
  if (
    process.env.NODE_ENV === 'production' &&
    (url.includes('localhost') || url.includes('127.0.0.1'))
  ) {
    console.error(`[Security] Localhost URL detected in production build: ${url}`);
  }
}

const ALLOWED_DEEP_LINK_PREFIXES = [
  'mana://',
  'https://app.mana.community',
  'https://manacommunity.in',
];

export function isValidDeepLink(url: string): boolean {
  return ALLOWED_DEEP_LINK_PREFIXES.some(prefix => url.startsWith(prefix));
}
