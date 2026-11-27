import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import api from './apiClient';
import { durableStorageAdapter } from './storageAdapter';
import type {
  KioskScanResult,
  LocalRedemptionRecord,
  RedemptionSyncPayload,
  RedemptionSyncResult,
  SampleVoucher,
} from '@/types/voucher';

const LOCAL_REDEMPTIONS_KEY = 'mana_mobile_kiosk_redemptions_v1';
const CAMPAIGN_SEEDS_KEY = 'mana_mobile_kiosk_totp_seeds_v1';

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  }
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export const mobileVoucherService = {
  async listAvailableVouchers(societyId: string): Promise<SampleVoucher[]> {
    const res = await api.get<SampleVoucher[]>('/vouchers', { params: { societyId } });
    return res.data;
  },

  async claimVoucher(voucherId: string): Promise<SampleVoucher> {
    const res = await api.post<SampleVoucher>(`/vouchers/${voucherId}/claim`);
    const claimed = res.data;
    if (claimed.signedToken?.totpSecret) {
      await secureSet(`voucher_totp_${claimed.signedToken.payload.vid}`, claimed.signedToken.totpSecret);
    }
    return claimed;
  },

  async getMyClaimedVouchers(): Promise<SampleVoucher[]> {
    const res = await api.get<SampleVoucher[]>('/vouchers/my-claims');
    return res.data;
  },

  async verifyQrOnline(qrString: string, kioskId: string): Promise<KioskScanResult> {
    const res = await api.post<KioskScanResult>('/vouchers/kiosk/verify', { qrString, kioskId });
    return res.data;
  },

  async syncRedemptions(payload: RedemptionSyncPayload): Promise<RedemptionSyncResult> {
    const res = await api.post<RedemptionSyncResult>('/vouchers/kiosk/sync', payload);
    return res.data;
  },

  async loadLocalRedemptions(): Promise<LocalRedemptionRecord[]> {
    try {
      const raw = await durableStorageAdapter.getItem(LOCAL_REDEMPTIONS_KEY);
      return raw ? (JSON.parse(raw) as LocalRedemptionRecord[]) : [];
    } catch {
      return [];
    }
  },

  async saveLocalRedemption(record: LocalRedemptionRecord): Promise<void> {
    const existing = await this.loadLocalRedemptions();
    const idx = existing.findIndex((r) => r.vid === record.vid);
    if (idx >= 0) {
      existing[idx] = record;
    } else {
      existing.push(record);
    }
    await durableStorageAdapter.setItem(LOCAL_REDEMPTIONS_KEY, JSON.stringify(existing));
  },

  async isRedeemedLocally(vid: string): Promise<LocalRedemptionRecord | null> {
    const all = await this.loadLocalRedemptions();
    return all.find((r) => r.vid === vid) ?? null;
  },

  async applySyncResult(result: RedemptionSyncResult): Promise<void> {
    const records = await this.loadLocalRedemptions();
    const accepted = new Set(result.accepted);
    const conflicts = new Set(result.conflicts.map((c) => c.vid));
    let changed = false;

    for (const r of records) {
      if (accepted.has(r.vid)) {
        r.synced = true;
        r.conflicted = false;
        changed = true;
      } else if (conflicts.has(r.vid)) {
        r.synced = true;
        r.conflicted = true;
        changed = true;
      }
    }

    if (changed) {
      await durableStorageAdapter.setItem(LOCAL_REDEMPTIONS_KEY, JSON.stringify(records));
    }
  },

  async getCachedCampaignTotpSecret(campaignId: string): Promise<string | null> {
    try {
      const raw = await secureGet(CAMPAIGN_SEEDS_KEY);
      if (!raw) return null;
      const map = JSON.parse(raw) as Record<string, string>;
      return map[campaignId] ?? null;
    } catch {
      return null;
    }
  },
};
