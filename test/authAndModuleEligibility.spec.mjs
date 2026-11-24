import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Module Aliases mapping (mirrored from hooks/useAuth.ts)
 */
const MODULE_ALIASES = {
  HOME_SERVICES: ['SERVICE_PLATFORM', 'HOME_SERVICES'],
  SERVICE_PLATFORM: ['SERVICE_PLATFORM', 'HOME_SERVICES'],
  PERSONAL_FINANCE: ['FINANCE_MGMT', 'PERSONAL_FINANCE'],
  FINANCE_MGMT: ['FINANCE_MGMT', 'PERSONAL_FINANCE'],
  GOVERNANCE: ['COMMUNITY_MGMT', 'GOVERNANCE'],
  COMMUNITY_MGMT: ['COMMUNITY_MGMT', 'GOVERNANCE'],
  BOOKINGS: ['BOOKINGS', 'FACILITIES'],
  FACILITIES: ['FACILITIES', 'BOOKINGS'],
  PAYMENTS: ['PAYMENTS', 'MANA_PAY'],
  MANA_PAY: ['MANA_PAY', 'PAYMENTS'],
  DISCOVER: ['DISCOVER', 'MARKETPLACE'],
  MARKETPLACE: ['MARKETPLACE', 'DISCOVER'],
  SAFETY: ['SAFETY', 'EMERGENCY'],
  EMERGENCY: ['EMERGENCY', 'SAFETY'],
};

/**
 * hasModule logic (mirrored from hooks/useAuth.ts)
 */
function hasModule(user, moduleKey) {
  if (!user?.enabledModules || user.enabledModules.length === 0) {
    return true; // Fail-open fallback
  }

  const normalized = (moduleKey || '').toUpperCase().trim();
  const aliases = MODULE_ALIASES[normalized] || [normalized];

  return aliases.some(alias =>
    user.enabledModules.some(
      (m) => (m || '').toUpperCase().trim() === alias
    )
  );
}

/**
 * Mock Tenant & ApiClient state tracker
 */
class MockApiClient {
  constructor() {
    this.headers = {};
  }
  setCommunityId(communityId) {
    if (communityId != null) {
      this.headers['X-Community-ID'] = String(communityId);
    } else {
      delete this.headers['X-Community-ID'];
    }
  }
}

/**
 * User profile enrichment logic (mirrored from hooks/useAuth.ts)
 */
async function enrichUserProfile(user, loginCommunityId, loginModules, fetchCommunityDetails) {
  let enriched = { ...user };

  if (!enriched.communityId && loginCommunityId != null) {
    enriched.communityId = loginCommunityId;
  }
  if ((!enriched.enabledModules || enriched.enabledModules.length === 0) && loginModules && loginModules.length > 0) {
    enriched.enabledModules = loginModules;
  }

  const effectiveCommunityId = enriched.communityId;
  if (effectiveCommunityId != null && (!enriched.communityName || !enriched.enabledModules || enriched.enabledModules.length === 0)) {
    try {
      const comm = await fetchCommunityDetails(effectiveCommunityId);
      if (comm) {
        if (!enriched.communityName && comm.name) {
          enriched.communityName = comm.name;
        }
        if ((!enriched.enabledModules || enriched.enabledModules.length === 0) && comm.enabledModules?.length) {
          enriched.enabledModules = comm.enabledModules;
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  return enriched;
}

describe('Auth & Module Eligibility Test Suite', () => {
  describe('1. Module Gating & Alias Resolution (hasModule)', () => {
    it('returns true when user has no enabledModules configured (fail-open)', () => {
      const userWithoutModules = { id: 1, email: 'user@example.com' };
      assert.strictEqual(hasModule(userWithoutModules, 'VISITORS'), true);
      assert.strictEqual(hasModule(userWithoutModules, 'SERVICE_PLATFORM'), true);

      const userWithEmptyModules = { id: 2, enabledModules: [] };
      assert.strictEqual(hasModule(userWithEmptyModules, 'BOOKINGS'), true);
    });

    it('matches canonical backend module keys exactly', () => {
      const user = {
        id: 1,
        enabledModules: ['COMMUNITY_FEED', 'VISITORS', 'NOTICES', 'BOOKINGS'],
      };

      assert.strictEqual(hasModule(user, 'COMMUNITY_FEED'), true);
      assert.strictEqual(hasModule(user, 'VISITORS'), true);
      assert.strictEqual(hasModule(user, 'NOTICES'), true);
      assert.strictEqual(hasModule(user, 'BOOKINGS'), true);
      assert.strictEqual(hasModule(user, 'SPORTS'), false);
      assert.strictEqual(hasModule(user, 'INSURANCE'), false);
    });

    it('resolves HOME_SERVICES frontend query to SERVICE_PLATFORM canonical backend key', () => {
      const userWithBackendKey = {
        id: 1,
        enabledModules: ['SERVICE_PLATFORM'],
      };
      assert.strictEqual(hasModule(userWithBackendKey, 'HOME_SERVICES'), true);
      assert.strictEqual(hasModule(userWithBackendKey, 'SERVICE_PLATFORM'), true);

      const userWithLegacyKey = {
        id: 2,
        enabledModules: ['HOME_SERVICES'],
      };
      assert.strictEqual(hasModule(userWithLegacyKey, 'SERVICE_PLATFORM'), true);
      assert.strictEqual(hasModule(userWithLegacyKey, 'HOME_SERVICES'), true);
    });

    it('resolves PERSONAL_FINANCE and FINANCE_MGMT aliases bidirectionally', () => {
      const userWithFinance = {
        id: 1,
        enabledModules: ['FINANCE_MGMT'],
      };
      assert.strictEqual(hasModule(userWithFinance, 'PERSONAL_FINANCE'), true);
      assert.strictEqual(hasModule(userWithFinance, 'FINANCE_MGMT'), true);
    });

    it('resolves GOVERNANCE and COMMUNITY_MGMT aliases bidirectionally', () => {
      const userWithGov = {
        id: 1,
        enabledModules: ['COMMUNITY_MGMT'],
      };
      assert.strictEqual(hasModule(userWithGov, 'GOVERNANCE'), true);
      assert.strictEqual(hasModule(userWithGov, 'COMMUNITY_MGMT'), true);
    });

    it('resolves BOOKINGS and FACILITIES aliases bidirectionally', () => {
      const userWithFacilities = {
        id: 1,
        enabledModules: ['FACILITIES'],
      };
      assert.strictEqual(hasModule(userWithFacilities, 'BOOKINGS'), true);
      assert.strictEqual(hasModule(userWithFacilities, 'FACILITIES'), true);
    });

    it('resolves PAYMENTS and MANA_PAY aliases bidirectionally', () => {
      const userWithPayments = {
        id: 1,
        enabledModules: ['PAYMENTS'],
      };
      assert.strictEqual(hasModule(userWithPayments, 'MANA_PAY'), true);
      assert.strictEqual(hasModule(userWithPayments, 'PAYMENTS'), true);
    });

    it('handles case-insensitivity and whitespace safely', () => {
      const user = {
        id: 1,
        enabledModules: ['  visitors  ', 'COMMUNITY_FEED'],
      };
      assert.strictEqual(hasModule(user, 'VISITORS'), true);
      assert.strictEqual(hasModule(user, ' visitors '), true);
      assert.strictEqual(hasModule(user, 'community_feed'), true);
    });
  });

  describe('2. Login Profile Enrichment & Community Data Capture', () => {
    it('enriches user profile with communityName and enabledModules when /users/me is missing them', async () => {
      const rawUserFromMe = {
        id: 42,
        email: 'resident@manacommunity.com',
        role: 'RESIDENT',
        communityId: 101,
      };

      const mockFetchCommunity = async (id) => {
        if (id === 101) {
          return {
            id: 101,
            name: 'Palm Meadows Villa Society',
            enabledModules: ['COMMUNITY_FEED', 'VISITORS', 'SERVICE_PLATFORM', 'BOOKINGS'],
          };
        }
        return null;
      };

      const enriched = await enrichUserProfile(
        rawUserFromMe,
        101,
        ['COMMUNITY_FEED', 'VISITORS', 'SERVICE_PLATFORM', 'BOOKINGS'],
        mockFetchCommunity
      );

      assert.strictEqual(enriched.communityId, 101);
      assert.strictEqual(enriched.communityName, 'Palm Meadows Villa Society');
      assert.deepStrictEqual(enriched.enabledModules, [
        'COMMUNITY_FEED',
        'VISITORS',
        'SERVICE_PLATFORM',
        'BOOKINGS',
      ]);
      assert.strictEqual(hasModule(enriched, 'HOME_SERVICES'), true);
      assert.strictEqual(hasModule(enriched, 'VISITORS'), true);
      assert.strictEqual(hasModule(enriched, 'INSURANCE'), false);
    });

    it('uses login response data if community service fails or returns null', async () => {
      const rawUser = { id: 10, email: 'test@example.com' };
      const failingFetch = async () => {
        throw new Error('Community service offline');
      };

      const enriched = await enrichUserProfile(
        rawUser,
        202,
        ['COMMUNITY_FEED', 'NOTICES'],
        failingFetch
      );

      assert.strictEqual(enriched.communityId, 202);
      assert.deepStrictEqual(enriched.enabledModules, ['COMMUNITY_FEED', 'NOTICES']);
      assert.strictEqual(hasModule(enriched, 'NOTICES'), true);
      assert.strictEqual(hasModule(enriched, 'VISITORS'), false);
    });
  });

  describe('3. Tenant Context & ApiClient Header Synchronization', () => {
    it('sets X-Community-ID header on login and clears it on logout', () => {
      const client = new MockApiClient();

      // Before login
      assert.strictEqual(client.headers['X-Community-ID'], undefined);

      // On login with communityId 55
      client.setCommunityId(55);
      assert.strictEqual(client.headers['X-Community-ID'], '55');

      // Tenant switch to communityId 99
      client.setCommunityId(99);
      assert.strictEqual(client.headers['X-Community-ID'], '99');

      // On logout
      client.setCommunityId(null);
      assert.strictEqual(client.headers['X-Community-ID'], undefined);
    });
  });

  describe('4. QuickActions Service Filtering', () => {
    const SAMPLE_SERVICES = [
      { id: 'visitors', label: 'Visitors', category: 'essentials', moduleKey: 'VISITORS' },
      { id: 'notices', label: 'Notices', category: 'essentials', moduleKey: 'NOTICES' },
      { id: 'home-services', label: 'Home Services', category: 'daily', moduleKey: 'SERVICE_PLATFORM' },
      { id: 'group-buy', label: 'Group Buying', category: 'daily', moduleKey: 'GROUP_BUYING' },
      { id: 'facility-booking', label: 'Book Facility', category: 'facilities', moduleKey: 'BOOKINGS' },
      { id: 'sports', label: 'Sports', category: 'facilities', moduleKey: 'SPORTS' },
      { id: 'insurance', label: 'Insurance', category: 'daily', moduleKey: 'INSURANCE' },
    ];

    it('filters out disabled services based on community enabledModules', () => {
      const communityUser = {
        id: 1,
        enabledModules: ['VISITORS', 'SERVICE_PLATFORM'],
      };

      const visible = SAMPLE_SERVICES.filter(item => hasModule(communityUser, item.moduleKey));

      const visibleIds = visible.map(s => s.id);
      assert.deepStrictEqual(visibleIds, ['visitors', 'home-services']);
      assert.strictEqual(visibleIds.includes('notices'), false);
      assert.strictEqual(visibleIds.includes('facility-booking'), false);
      assert.strictEqual(visibleIds.includes('sports'), false);
      assert.strictEqual(visibleIds.includes('insurance'), false);
    });

    it('omits categories that have zero eligible services', () => {
      const communityUser = {
        id: 1,
        enabledModules: ['VISITORS', 'NOTICES'],
      };

      const visible = SAMPLE_SERVICES.filter(item => hasModule(communityUser, item.moduleKey));
      const activeCategories = new Set(visible.map(s => s.category));

      assert.strictEqual(activeCategories.has('essentials'), true);
      assert.strictEqual(activeCategories.has('facilities'), false);
      assert.strictEqual(activeCategories.has('daily'), false);
    });

    it('displays all services when enabledModules is not configured', () => {
      const unrestrictedUser = { id: 1 };
      const visible = SAMPLE_SERVICES.filter(item => hasModule(unrestrictedUser, item.moduleKey));
      assert.strictEqual(visible.length, SAMPLE_SERVICES.length);
    });
  });
});
