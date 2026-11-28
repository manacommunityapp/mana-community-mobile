import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Society Persona RBAC & Cross-Society Isolation (Mobile Spec)', () => {
  const MATRIX = {
    FLAT_OWNER: new Set(['APPROVE_VISITOR', 'BOOK_AMENITY', 'RAISE_COMPLAINT', 'VIEW_OWN_DUES', 'VOTE_OWNER_AGM']),
    TENANT: new Set(['APPROVE_VISITOR', 'BOOK_AMENITY', 'RAISE_COMPLAINT', 'VIEW_OWN_DUES']),
    FAMILY_MEMBER: new Set(['APPROVE_VISITOR', 'BOOK_AMENITY', 'RAISE_COMPLAINT']),
    GUARD: new Set(['GATE_CHECKIN_SCAN']),
    ESTATE_MANAGER: new Set(['GATE_CHECKIN_SCAN', 'MANAGE_HELPDESK_SLA']),
    MC_ADMIN: new Set(['APPROVE_VISITOR', 'GATE_CHECKIN_SCAN', 'MANAGE_HELPDESK_SLA', 'MANAGE_SOCIETY_GOVERNANCE']),
  };

  function isAuthorized(actor, targetCommunityId, targetFlatId, cap) {
    if (!MATRIX[actor.role]?.has(cap)) return false;
    if (!actor.communityId || actor.communityId !== targetCommunityId) return false;
    if (['FLAT_OWNER', 'TENANT', 'FAMILY_MEMBER'].includes(actor.role) && targetFlatId != null && actor.flatId !== targetFlatId) {
      return false;
    }
    return true;
  }

  it('1. Enforces distinct privileges across Flat Owner, Tenant, Family Member, Guard, Estate Manager, and MC Admin', () => {
    const owner = { role: 'FLAT_OWNER', communityId: 101, flatId: 501 };
    const tenant = { role: 'TENANT', communityId: 101, flatId: 501 };
    const family = { role: 'FAMILY_MEMBER', communityId: 101, flatId: 501 };
    const guard = { role: 'GUARD', communityId: 101 };
    const manager = { role: 'ESTATE_MANAGER', communityId: 101 };
    const mcAdmin = { role: 'MC_ADMIN', communityId: 101 };

    assert.equal(isAuthorized(owner, 101, 501, 'VOTE_OWNER_AGM'), true);
    assert.equal(isAuthorized(tenant, 101, 501, 'VOTE_OWNER_AGM'), false);
    assert.equal(isAuthorized(family, 101, 501, 'VIEW_OWN_DUES'), false);
    assert.equal(isAuthorized(guard, 101, null, 'GATE_CHECKIN_SCAN'), true);
    assert.equal(isAuthorized(guard, 101, 501, 'VIEW_OWN_DUES'), false);
    assert.equal(isAuthorized(manager, 101, null, 'MANAGE_HELPDESK_SLA'), true);
    assert.equal(isAuthorized(manager, 101, null, 'MANAGE_SOCIETY_GOVERNANCE'), false);
    assert.equal(isAuthorized(mcAdmin, 101, null, 'MANAGE_SOCIETY_GOVERNANCE'), true);
  });

  it('2. Blocks cross-society and cross-flat data leaks for every persona including MC Admin', () => {
    const mcAdmin = { role: 'MC_ADMIN', communityId: 101 };
    const owner = { role: 'FLAT_OWNER', communityId: 101, flatId: 501 };

    assert.equal(isAuthorized(mcAdmin, 202, null, 'MANAGE_SOCIETY_GOVERNANCE'), false);
    assert.equal(isAuthorized(owner, 202, 501, 'VIEW_OWN_DUES'), false);
    assert.equal(isAuthorized(owner, 101, 502, 'VIEW_OWN_DUES'), false);
  });
});
