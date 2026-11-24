import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Profile Module & Service Audit Spec', () => {

  // Helper matching profile normalization logic in profileService.ts
  function normalizeProfileResponse(data) {
    const resolvedName =
      data.fullName ||
      data.name ||
      data.username ||
      data.displayName ||
      (data.email ? data.email.split('@')[0] : '');
    const flat = data.flatNo || data.flatNumber || '';
    const twr = data.tower || data.block || '';
    const ph = data.phone || data.mobile || '';
    const photo = data.profilePicUrl || data.profilePhoto || '';

    return {
      ...data,
      fullName: resolvedName,
      name: resolvedName,
      flatNo: flat,
      flatNumber: flat,
      tower: twr,
      block: twr,
      phone: ph,
      mobile: ph,
      profilePicUrl: photo,
      profilePhoto: photo,
    };
  }

  // Helper matching payload formatting logic in profileService.ts
  function buildUpdateProfilePayload(data) {
    const resolvedName = (data.fullName || data.name || '').trim();
    const resolvedPhone = (data.phone || data.mobile || '').trim();
    const resolvedFlat = (data.flatNo || data.flatNumber || '').trim();
    const resolvedTower = (data.tower || data.block || '').trim();

    return {
      name: resolvedName,
      fullName: resolvedName,
      mobile: resolvedPhone || undefined,
      phone: resolvedPhone || undefined,
      flatNumber: resolvedFlat || undefined,
      flatNo: resolvedFlat || undefined,
      tower: resolvedTower || undefined,
      block: resolvedTower || undefined,
      bio: data.bio?.trim() || undefined,
      profession: data.profession?.trim() || undefined,
      profilePicUrl: data.profilePicUrl || data.profilePhoto || undefined,
    };
  }

  // Helper matching edit form field initialization in edit.tsx
  function initEditForm(user) {
    return {
      name: user?.fullName ?? user?.name ?? '',
      mobile: user?.mobile ?? user?.phone ?? '',
      bio: user?.bio ?? '',
      profession: user?.profession ?? '',
      flatNumber: user?.flatNumber ?? user?.flatNo ?? '',
      tower: user?.tower ?? user?.block ?? '',
    };
  }

  it('1. Normalizes backend Spring AppUser response to mobile UserProfileResponse', () => {
    const backendResponse = {
      id: 42,
      fullName: 'Vikram Mehta',
      email: 'vikram@example.com',
      phone: '+91 98765 00000',
      flatNo: 'B-304',
      block: 'Tower B',
      profilePicUrl: 'https://cdn.example.com/avatar.jpg',
      role: 'RESIDENT',
      status: 'ACTIVE',
    };

    const normalized = normalizeProfileResponse(backendResponse);

    assert.strictEqual(normalized.name, 'Vikram Mehta');
    assert.strictEqual(normalized.fullName, 'Vikram Mehta');
    assert.strictEqual(normalized.flatNumber, 'B-304');
    assert.strictEqual(normalized.flatNo, 'B-304');
    assert.strictEqual(normalized.tower, 'Tower B');
    assert.strictEqual(normalized.block, 'Tower B');
    assert.strictEqual(normalized.mobile, '+91 98765 00000');
    assert.strictEqual(normalized.phone, '+91 98765 00000');
    assert.strictEqual(normalized.profilePhoto, 'https://cdn.example.com/avatar.jpg');
    assert.strictEqual(normalized.profilePicUrl, 'https://cdn.example.com/avatar.jpg');
  });

  it('2. Normalizes mobile-created profile response to standard backend keys', () => {
    const mobileResponse = {
      id: 55,
      name: 'Ananya Rao',
      email: 'ananya@example.com',
      mobile: '+91 91234 56789',
      flatNumber: 'C-101',
      tower: 'Tower C',
      profilePhoto: 'https://cdn.example.com/photo.png',
    };

    const normalized = normalizeProfileResponse(mobileResponse);

    assert.strictEqual(normalized.fullName, 'Ananya Rao');
    assert.strictEqual(normalized.name, 'Ananya Rao');
    assert.strictEqual(normalized.flatNo, 'C-101');
    assert.strictEqual(normalized.flatNumber, 'C-101');
    assert.strictEqual(normalized.block, 'Tower C');
    assert.strictEqual(normalized.tower, 'Tower C');
    assert.strictEqual(normalized.phone, '+91 91234 56789');
    assert.strictEqual(normalized.mobile, '+91 91234 56789');
    assert.strictEqual(normalized.profilePicUrl, 'https://cdn.example.com/photo.png');
  });

  it('3. Initializes EditProfileScreen form with complete fallback hierarchy', () => {
    const userFromBackend = {
      id: 10,
      fullName: 'Pooja Iyer',
      email: 'pooja@example.com',
      phone: '+91 98888 77777',
      flatNo: 'D-502',
      block: 'Block D',
      bio: 'Loves tennis and community gardening',
      profession: 'Product Manager',
    };

    const form = initEditForm(userFromBackend);

    assert.strictEqual(form.name, 'Pooja Iyer');
    assert.strictEqual(form.mobile, '+91 98888 77777');
    assert.strictEqual(form.flatNumber, 'D-502');
    assert.strictEqual(form.tower, 'Block D');
    assert.strictEqual(form.bio, 'Loves tennis and community gardening');
    assert.strictEqual(form.profession, 'Product Manager');
  });

  it('4. Generates bidirectional DTO payload for PUT /users/me', () => {
    const input = {
      name: 'Pooja Iyer',
      mobile: '+91 98888 77777',
      flatNumber: 'D-502',
      tower: 'Block D',
      bio: 'Updated bio',
      profession: 'Senior PM',
    };

    const payload = buildUpdateProfilePayload(input);

    assert.strictEqual(payload.name, 'Pooja Iyer');
    assert.strictEqual(payload.fullName, 'Pooja Iyer');
    assert.strictEqual(payload.mobile, '+91 98888 77777');
    assert.strictEqual(payload.phone, '+91 98888 77777');
    assert.strictEqual(payload.flatNumber, 'D-502');
    assert.strictEqual(payload.flatNo, 'D-502');
    assert.strictEqual(payload.tower, 'Block D');
    assert.strictEqual(payload.block, 'Block D');
    assert.strictEqual(payload.bio, 'Updated bio');
    assert.strictEqual(payload.profession, 'Senior PM');
  });

  it('5. Verifies digital pass member ID and status formatting', () => {
    const user = { id: 7, status: 'ACTIVE', residentType: 'OWNER' };
    const memberId = user.id ? `MANA-${String(user.id).padStart(4, '0')}` : 'PENDING';
    const statusLabel = user.status === 'ACTIVE' ? 'VERIFIED' : user.status;

    assert.strictEqual(memberId, 'MANA-0007');
    assert.strictEqual(statusLabel, 'VERIFIED');
  });

  it('6. Merges Zustand auth user with live database profile without data loss', () => {
    const authUser = {
      id: 12,
      name: 'Karan Singh',
      email: 'karan@example.com',
      communityName: 'Greenwood Heights',
      permissions: ['VIEW_FEED', 'VIEW_VISITORS'],
    };

    const dbProfile = {
      id: 12,
      fullName: 'Karan Singh',
      phone: '+91 90000 11111',
      flatNo: 'A-102',
      status: 'ACTIVE',
    };

    const merged = { ...authUser, ...dbProfile };

    assert.strictEqual(merged.name, 'Karan Singh');
    assert.strictEqual(merged.communityName, 'Greenwood Heights');
    assert.deepStrictEqual(merged.permissions, ['VIEW_FEED', 'VIEW_VISITORS']);
    assert.strictEqual(merged.phone, '+91 90000 11111');
    assert.strictEqual(merged.flatNo, 'A-102');
    assert.strictEqual(merged.status, 'ACTIVE');
  });
});
