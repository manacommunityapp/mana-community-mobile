export type SupportedLocale = 'en' | 'te' | 'kn' | 'ta' | 'hi' | 'mr' | 'ur';

export interface FontProfile {
  family: string;
  fontUrl: string;
  lineHeightMultiplier: number;
}

export interface NamespaceManifestEntry {
  namespace: string;
  versionHash: string;
  bundleUrl: string;
  audioPackUrl?: string;
  stringCount: number;
}

export interface OtaManifestResponse {
  locale: SupportedLocale | string;
  direction: 'ltr' | 'rtl';
  fontProfile: FontProfile;
  namespaces: Record<string, NamespaceManifestEntry>;
}

export interface OtaBundle {
  bundleId: string;
  locale: string;
  namespace: string;
  versionHash: string;
  direction: 'ltr' | 'rtl';
  fontProfile: FontProfile;
  strings: Record<string, string>;
  ttsHints: Record<string, string>;
  audioPackUrl?: string;
  publishedAt: string;
}

export interface TtsAudioResponse {
  cacheKey: string;
  locale: string;
  voiceId: string;
  normalizedText: string;
  audioUrl: string;
  codec: string;
  durationMs: number;
  sizeBytes: number;
  cacheHit: boolean;
}

export interface VoiceGateEntry {
  entryId: string;
  societyId: number;
  guardUserId: string;
  flatNumber: string;
  guardLocale: string;
  residentLocale: string;
  audioUrl: string;
  audioCodec: string;
  durationMs: number;
  audioSizeBytes: number;
  transcriptRaw?: string;
  transcriptTranslated?: string;
  detectedVisitorName?: string;
  detectedOrgName?: string;
  entityConfidence?: number;
  status: string;
  expiresAt: string;
  createdAt: string;
}
