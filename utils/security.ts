export function validateEnvConfig(apiUrl: string, wsUrl: string): void {
  if (process.env.NODE_ENV !== 'production') return;

  for (const [name, value, protocol] of [
    ['EXPO_PUBLIC_API_URL', apiUrl, 'https:'],
    ['EXPO_PUBLIC_WS_URL', wsUrl, 'wss:'],
  ] as const) {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`[Security] ${name} must be an absolute ${protocol} URL in production.`);
    }
    if (parsed.protocol !== protocol || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      throw new Error(`[Security] ${name} must use ${protocol} and a public host in production.`);
    }
  }
}

export function assertNoLocalhostInProd(url: string): void {
  if (
    process.env.NODE_ENV === 'production' &&
    (url.includes('localhost') || url.includes('127.0.0.1'))
  ) {
    throw new Error(`[Security] Localhost URL detected in production build: ${url}`);
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
