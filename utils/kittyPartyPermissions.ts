import type { MemberRole } from '@/types/kittyPartyTypes';

export type PermissionAction =
  // Circle management
  | 'EDIT_CIRCLE'
  | 'DELETE_CIRCLE'
  | 'MANAGE_SETTINGS'
  // Member management
  | 'APPROVE_JOIN_REQUEST'
  | 'INVITE_MEMBER'
  | 'REMOVE_MEMBER'
  | 'CHANGE_MEMBER_ROLE'
  | 'SUSPEND_MEMBER'
  | 'MANAGE_EXTERNAL_MEMBERS'
  // Kitty / Finance
  | 'CREATE_CYCLE'
  | 'RECORD_OWN_CONTRIBUTION'
  | 'RECORD_ANY_CONTRIBUTION'
  | 'VERIFY_CONTRIBUTION'
  | 'SEND_REMINDERS'
  | 'SWAP_ROTATION'
  | 'REPLACE_MEMBER_IN_CYCLE'
  | 'VIEW_AUDIT_TRAIL'
  | 'VIEW_ALL_STATEMENTS'
  | 'VIEW_OWN_STATEMENT'
  | 'MANAGE_DISPUTES'
  | 'RESOLVE_DISPUTE'
  | 'CREATE_DISPUTE'
  // Events
  | 'CREATE_EVENT'
  | 'EDIT_EVENT'
  | 'DELETE_EVENT'
  | 'CHECK_IN_ATTENDEES'
  | 'RSVP_EVENT'
  // Housie / Games
  | 'CREATE_GAME_ROOM'
  | 'START_GAME'
  | 'CALL_NUMBERS'
  | 'MANAGE_GAME'
  | 'JOIN_GAME'
  | 'GET_TICKET'
  | 'CLAIM_PRIZE'
  // Feed
  | 'CREATE_POST'
  | 'PIN_POST'
  | 'DELETE_ANY_POST'
  | 'CREATE_ANNOUNCEMENT'
  // Expenses
  | 'CREATE_EXPENSE'
  | 'VERIFY_SETTLEMENT'
  | 'VIEW_ALL_EXPENSES'
  | 'SETTLE_OWN_SHARE'
  // Vendors
  | 'MANAGE_VENDOR_PACKAGES'
  | 'INQUIRE_VENDOR'
  // General
  | 'VIEW_CIRCLE_MODULES'
  | 'SHARE_CIRCLE'
  | 'VIEW_MEMBERS'
  | 'VIEW_LEADERBOARD';

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  OWNER: 5,
  ADMIN: 4,
  TREASURER: 3,
  HOST: 2,
  MEMBER: 1,
};

const PERMISSION_MAP: Record<PermissionAction, MemberRole[]> = {
  // Circle management — OWNER / ADMIN only
  EDIT_CIRCLE: ['OWNER', 'ADMIN'],
  DELETE_CIRCLE: ['OWNER'],
  MANAGE_SETTINGS: ['OWNER', 'ADMIN'],

  // Member management — OWNER / ADMIN only
  APPROVE_JOIN_REQUEST: ['OWNER', 'ADMIN'],
  INVITE_MEMBER: ['OWNER', 'ADMIN'],
  REMOVE_MEMBER: ['OWNER', 'ADMIN'],
  CHANGE_MEMBER_ROLE: ['OWNER', 'ADMIN'],
  SUSPEND_MEMBER: ['OWNER', 'ADMIN'],
  MANAGE_EXTERNAL_MEMBERS: ['OWNER', 'ADMIN'],

  // Kitty / Finance — OWNER, ADMIN, TREASURER for management
  CREATE_CYCLE: ['OWNER', 'ADMIN'],
  RECORD_OWN_CONTRIBUTION: ['OWNER', 'ADMIN', 'TREASURER', 'HOST', 'MEMBER'],
  RECORD_ANY_CONTRIBUTION: ['OWNER', 'ADMIN', 'TREASURER'],
  VERIFY_CONTRIBUTION: ['OWNER', 'ADMIN', 'TREASURER'],
  SEND_REMINDERS: ['OWNER', 'ADMIN', 'TREASURER'],
  SWAP_ROTATION: ['OWNER', 'ADMIN'],
  REPLACE_MEMBER_IN_CYCLE: ['OWNER', 'ADMIN'],
  VIEW_AUDIT_TRAIL: ['OWNER', 'ADMIN', 'TREASURER'],
  VIEW_ALL_STATEMENTS: ['OWNER', 'ADMIN', 'TREASURER'],
  VIEW_OWN_STATEMENT: ['OWNER', 'ADMIN', 'TREASURER', 'HOST', 'MEMBER'],
  MANAGE_DISPUTES: ['OWNER', 'ADMIN'],
  RESOLVE_DISPUTE: ['OWNER', 'ADMIN'],
  CREATE_DISPUTE: ['OWNER', 'ADMIN', 'TREASURER', 'HOST', 'MEMBER'],

  // Events — OWNER, ADMIN, HOST can manage
  CREATE_EVENT: ['OWNER', 'ADMIN', 'HOST'],
  EDIT_EVENT: ['OWNER', 'ADMIN', 'HOST'],
  DELETE_EVENT: ['OWNER', 'ADMIN'],
  CHECK_IN_ATTENDEES: ['OWNER', 'ADMIN', 'HOST'],
  RSVP_EVENT: ['OWNER', 'ADMIN', 'TREASURER', 'HOST', 'MEMBER'],

  // Housie / Games — OWNER, ADMIN, HOST can manage game flow
  CREATE_GAME_ROOM: ['OWNER', 'ADMIN', 'HOST'],
  START_GAME: ['OWNER', 'ADMIN', 'HOST'],
  CALL_NUMBERS: ['OWNER', 'ADMIN', 'HOST'],
  MANAGE_GAME: ['OWNER', 'ADMIN', 'HOST'],
  JOIN_GAME: ['OWNER', 'ADMIN', 'TREASURER', 'HOST', 'MEMBER'],
  GET_TICKET: ['OWNER', 'ADMIN', 'TREASURER', 'HOST', 'MEMBER'],
  CLAIM_PRIZE: ['OWNER', 'ADMIN', 'TREASURER', 'HOST', 'MEMBER'],

  // Feed — all members can post; OWNER/ADMIN can pin/delete
  CREATE_POST: ['OWNER', 'ADMIN', 'TREASURER', 'HOST', 'MEMBER'],
  PIN_POST: ['OWNER', 'ADMIN'],
  DELETE_ANY_POST: ['OWNER', 'ADMIN'],
  CREATE_ANNOUNCEMENT: ['OWNER', 'ADMIN', 'HOST'],

  // Expenses — OWNER, ADMIN, TREASURER, HOST can create; TREASURER verifies
  CREATE_EXPENSE: ['OWNER', 'ADMIN', 'TREASURER', 'HOST'],
  VERIFY_SETTLEMENT: ['OWNER', 'ADMIN', 'TREASURER'],
  VIEW_ALL_EXPENSES: ['OWNER', 'ADMIN', 'TREASURER'],
  SETTLE_OWN_SHARE: ['OWNER', 'ADMIN', 'TREASURER', 'HOST', 'MEMBER'],

  // Vendors — OWNER/ADMIN manage; all members can browse/inquire
  MANAGE_VENDOR_PACKAGES: ['OWNER', 'ADMIN'],
  INQUIRE_VENDOR: ['OWNER', 'ADMIN', 'TREASURER', 'HOST', 'MEMBER'],

  // General — all members; external members have limited access
  VIEW_CIRCLE_MODULES: ['OWNER', 'ADMIN', 'TREASURER', 'HOST', 'MEMBER'],
  SHARE_CIRCLE: ['OWNER', 'ADMIN', 'TREASURER', 'HOST', 'MEMBER'],
  VIEW_MEMBERS: ['OWNER', 'ADMIN', 'TREASURER', 'HOST', 'MEMBER'],
  VIEW_LEADERBOARD: ['OWNER', 'ADMIN', 'TREASURER', 'HOST', 'MEMBER'],
};

export function hasPermission(
  role: MemberRole | undefined | null,
  action: PermissionAction,
  isExternal?: boolean,
): boolean {
  if (!role) return false;

  // External/guest members have restricted access
  if (isExternal) {
    const EXTERNAL_ALLOWED: PermissionAction[] = [
      'VIEW_CIRCLE_MODULES',
      'VIEW_MEMBERS',
      'VIEW_LEADERBOARD',
      'JOIN_GAME',
      'GET_TICKET',
      'CLAIM_PRIZE',
      'RSVP_EVENT',
      'CREATE_POST',
      'VIEW_OWN_STATEMENT',
      'SETTLE_OWN_SHARE',
      'INQUIRE_VENDOR',
      'RECORD_OWN_CONTRIBUTION',
      'CREATE_DISPUTE',
    ];
    return EXTERNAL_ALLOWED.includes(action);
  }

  const allowedRoles = PERMISSION_MAP[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

export function isAdminOrOwner(role: MemberRole | undefined | null): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

export function isTreasurer(role: MemberRole | undefined | null): boolean {
  return role === 'TREASURER';
}

export function isHost(role: MemberRole | undefined | null): boolean {
  return role === 'HOST';
}

export function isFinanceRole(role: MemberRole | undefined | null): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'TREASURER';
}

export function isEventManager(role: MemberRole | undefined | null): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'HOST';
}

export function isGameHost(role: MemberRole | undefined | null): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'HOST';
}

export function getRoleLabel(role: MemberRole): string {
  switch (role) {
    case 'OWNER': return 'Circle Owner';
    case 'ADMIN': return 'Administrator';
    case 'TREASURER': return 'Treasurer';
    case 'HOST': return 'Event Host';
    case 'MEMBER': return 'Member';
    default: return role;
  }
}

export function getRoleBadgeColor(role: MemberRole): { bg: string; text: string } {
  switch (role) {
    case 'OWNER': return { bg: '#FDF2F8', text: '#BE185D' };
    case 'ADMIN': return { bg: '#EEF2FF', text: '#4338CA' };
    case 'TREASURER': return { bg: '#FEF3C7', text: '#B45309' };
    case 'HOST': return { bg: '#ECFDF5', text: '#065F46' };
    case 'MEMBER': return { bg: '#F3F4F6', text: '#6B7280' };
    default: return { bg: '#F3F4F6', text: '#6B7280' };
  }
}
