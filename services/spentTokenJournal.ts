import { durableStorageAdapter } from './storageAdapter';

export interface SpentQrRecord {
  jti: string;
  passCode: string;
  gate: string;
  spentAt: string;
  expiresAtEpochSec: number;
}

const SPENT_KEY = '@mana/guard_spent_qr_v1';

/**
 * Durable Anti-Replay Spent-Token Journal (MMKV-backed with AsyncStorage fallback)
 * so offline mobile guard tablets block WhatsApp screenshot replays immediately.
 */
export const spentTokenJournal = {
  async readMap(): Promise<Record<string, SpentQrRecord>> {
    try {
      const raw = await durableStorageAdapter.getItem(SPENT_KEY);
      return raw ? (JSON.parse(raw) as Record<string, SpentQrRecord>) : {};
    } catch {
      return {};
    }
  },

  async consumeOnce(params: {
    jti: string;
    passCode: string;
    gate: string;
    expiresAtEpochSec?: number;
  }): Promise<{ allowed: boolean; prior?: SpentQrRecord }> {
    const map = await this.readMap();
    const existing = map[params.jti];
    if (existing) {
      return { allowed: false, prior: existing };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    for (const [k, v] of Object.entries(map)) {
      if (v.expiresAtEpochSec > 0 && v.expiresAtEpochSec < nowSec) {
        delete map[k];
      }
    }

    map[params.jti] = {
      jti: params.jti,
      passCode: params.passCode,
      gate: params.gate,
      spentAt: new Date().toISOString(),
      expiresAtEpochSec: params.expiresAtEpochSec ?? nowSec + 43_200,
    };
    await durableStorageAdapter.setItem(SPENT_KEY, JSON.stringify(map));
    return { allowed: true };
  },
};
