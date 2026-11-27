import api from './apiClient';
import { durableStorageAdapter } from './storageAdapter';
import type {
  OtaBundle,
  OtaManifestResponse,
  TtsAudioResponse,
  VoiceGateEntry,
} from '@/types/localization';

const OTA_BUNDLE_CACHE_PREFIX = 'mana_mobile_ota_i18n_v1_';

export const otaLocalizationService = {
  async getManifest(locale: string): Promise<OtaManifestResponse> {
    const res = await api.get<OtaManifestResponse>('/i18n/manifest', { params: { locale } });
    return res.data;
  },

  async fetchAndCacheBundle(locale: string, namespace = 'gate'): Promise<OtaBundle> {
    const res = await api.get<OtaBundle>(`/i18n/bundles/${locale}/${namespace}`);
    await durableStorageAdapter.setItem(
      `${OTA_BUNDLE_CACHE_PREFIX}${locale}_${namespace}`,
      JSON.stringify(res.data),
    );
    return res.data;
  },

  async getCachedBundle(locale: string, namespace = 'gate'): Promise<OtaBundle | null> {
    try {
      const raw = await durableStorageAdapter.getItem(`${OTA_BUNDLE_CACHE_PREFIX}${locale}_${namespace}`);
      return raw ? (JSON.parse(raw) as OtaBundle) : null;
    } catch {
      return null;
    }
  },

  async synthesizeTts(locale: string, text: string): Promise<TtsAudioResponse> {
    const res = await api.post<TtsAudioResponse>('/tts/synthesize', { locale, text });
    return res.data;
  },

  async dispatchVoiceGateEntry(payload: {
    societyId: number;
    guardUserId: string;
    flatNumber: string;
    guardLocale: string;
    residentLocale: string;
    spokenUtteranceHint?: string;
  }): Promise<VoiceGateEntry> {
    const res = await api.post<VoiceGateEntry>('/gate/voice-entry', {
      ...payload,
      audioCodec: 'OPUS_16K',
      durationMs: 2000,
      audioSizeBytes: 5120,
    });
    return res.data;
  },
};
