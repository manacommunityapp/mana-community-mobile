import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import pure constants from permissions.ts (no @/ dependencies)
import {
  ROLE_PERMISSIONS,
  ADMIN_ROLES,
  ADMIN_PORTAL_ROLES,
  GUARD_ROLES,
  ROLE_ALIASES,
  resolveRoleAliases,
  VIEW_FEED,
  VIEW_EMERGENCY,
  TRIGGER_SOS,
  VIEW_VISITORS,
  MANAGE_VISITORS,
  VIEW_MAINTENANCE_DUES,
  PAY_MAINTENANCE_DUES,
  MANAGE_BILLING,
  VIEW_ADMIN_DASHBOARD,
  VIEW_GUARD_DASHBOARD,
  VIEW_VENDOR_DASHBOARD,
  VIEW_SPORTS_DASHBOARD,
  VIEW_INSURANCE,
} from '../constants/permissions.ts';

// Logic under test (mirrored from hooks/useAuth.ts and hooks/useRoleSwitcher.ts)
const ROLE_PORTAL_MAP = {
  SUPER_ADMIN:          { role: 'SUPER_ADMIN',          label: 'Admin Console',       route: '/admin-role/tabs/dashboard', icon: 'shield-checkmark' },
  ADMIN:                { role: 'ADMIN',                 label: 'Admin Console',       route: '/admin-role/tabs/dashboard', icon: 'shield-checkmark' },
  COMMUNITY_ADMIN:      { role: 'COMMUNITY_ADMIN',       label: 'Admin Console',       route: '/admin-role/tabs/dashboard', icon: 'shield-checkmark' },
  MODERATOR:            { role: 'MODERATOR',              label: 'Moderator',           route: '/admin-role/tabs/dashboard', icon: 'shield-half' },
  GUARD:                { role: 'GUARD',                  label: 'Guard Portal',        route: '/guard/tabs/dashboard',      icon: 'eye' },
  SECURITY:             { role: 'SECURITY',               label: 'Security Portal',     route: '/guard/tabs/dashboard',      icon: 'eye' },
  VENDOR:               { role: 'VENDOR',                 label: 'Vendor Portal',       route: '/vendor/tabs/dashboard',     icon: 'construct' },
  SPORTS_ADMIN:         { role: 'SPORTS_ADMIN',           label: 'Sports Admin',        route: '/sports-admin/tabs/dashboard', icon: 'trophy' },
  SPORTS_REFEREE:       { role: 'SPORTS_REFEREE',         label: 'Referee Panel',       route: '/sports-admin/tabs/dashboard', icon: 'flag' },
  EVENT_ADMIN:          { role: 'EVENT_ADMIN',            label: 'Event Admin',         route: '/event-admin/tabs/dashboard',  icon: 'calendar' },
  EVENTS_ADMIN:         { role: 'EVENTS_ADMIN',           label: 'Event Admin',         route: '/event-admin/tabs/dashboard',  icon: 'calendar' },
  FINANCE_ADMIN:        { role: 'FINANCE_ADMIN',          label: 'Finance Admin',       route: '/admin-role/tabs/dashboard',   icon: 'cash' },
  FINANCE_MGMT_ADMIN:   { role: 'FINANCE_MGMT_ADMIN',     label: 'Finance Admin',       route: '/admin-role/tabs/dashboard',   icon: 'cash' },
  FACILITY_MANAGER:     { role: 'FACILITY_MANAGER',       label: 'Facility Manager',    route: '/admin-role/tabs/dashboard',  icon: 'business' },
  FOOD_ADMIN:           { role: 'FOOD_ADMIN',             label: 'Food Admin',          route: '/admin-role/tabs/dashboard',   icon: 'restaurant' },
  FOOD_OS_ADMIN:        { role: 'FOOD_OS_ADMIN',          label: 'Food Admin',          route: '/admin-role/tabs/dashboard',   icon: 'restaurant' },
  HELPDESK_AGENT:       { role: 'HELPDESK_AGENT',         label: 'Helpdesk',            route: '/admin-role/tabs/dashboard',   icon: 'headset' },
  HELPDESK_ADMIN:       { role: 'HELPDESK_ADMIN',         label: 'Helpdesk Admin',      route: '/admin-role/tabs/dashboard',   icon: 'headset' },
  COMMITTEE_MEMBER:     { role: 'COMMITTEE_MEMBER',       label: 'Committee',           route: '/admin-role/tabs/dashboard',   icon: 'people' },
  ACCOUNTANT:           { role: 'ACCOUNTANT',             label: 'Accountant',          route: '/admin-role/tabs/dashboard',   icon: 'calculator' },
  READONLY_ADMIN:       { role: 'READONLY_ADMIN',         label: 'View-Only Admin',     route: '/admin-role/tabs/dashboard',   icon: 'eye' },
  VISITORS_ADMIN:       { role: 'VISITORS_ADMIN',         label: 'Gate & Visitors',     route: '/admin-role/tabs/dashboard',   icon: 'shield-checkmark' },
  COMMUNITY_FEED_ADMIN: { role: 'COMMUNITY_FEED_ADMIN',     label: 'Feed Moderator',     route: '/admin-role/tabs/dashboard',   icon: 'chatbubbles' },
  MEMBER:               { role: 'MEMBER',                 label: 'Resident Home',       route: '/tabs/feed',                   icon: 'home' },
  USER:                 { role: 'USER',                   label: 'Home',                route: '/tabs/feed',                   icon: 'home' },
  RESIDENT:             { role: 'RESIDENT',               label: 'Resident Home',       route: '/tabs/feed',                   icon: 'home' },
  OWNER:                { role: 'OWNER',                  label: 'Owner Home',          route: '/tabs/feed',                   icon: 'home' },
  TENANT:               { role: 'TENANT',                 label: 'Tenant Home',         route: '/tabs/feed',                   icon: 'home' },
  SPORTS_VENDOR:        { role: 'SPORTS_VENDOR',          label: 'Sports Vendor',       route: '/vendor/tabs/dashboard',       icon: 'construct' },
  SPORTS_TRAINER:       { role: 'SPORTS_TRAINER',         label: 'Sports Trainer',      route: '/sports-admin/tabs/dashboard', icon: 'barbell' },
  STAFF:                { role: 'STAFF',                  label: 'Staff Portal',        route: '/admin-role/tabs/dashboard',   icon: 'people' },
  CASHIER:              { role: 'CASHIER',                label: 'Cashier Portal',      route: '/admin-role/tabs/dashboard',   icon: 'cash' },
};

function getPortalForRole(role) {
  if (!role) return null;
  const upper = String(role).trim().toUpperCase();
  if (ROLE_PORTAL_MAP[upper]) return ROLE_PORTAL_MAP[upper];
  const aliases = ROLE_ALIASES[upper] || [];
  for (const alias of aliases) {
    if (ROLE_PORTAL_MAP[alias]) return ROLE_PORTAL_MAP[alias];
  }
  return null;
}

function getDefaultLandingRoute(roles) {
  if (!roles || roles.length === 0) return '/tabs/feed';
  const upperRoles = roles.map(r => String(r).trim().toUpperCase());
  const RESIDENT_ROLES = new Set(['USER', 'RESIDENT', 'MEMBER', 'OWNER', 'TENANT']);
  if (upperRoles.some(r => RESIDENT_ROLES.has(r))) {
    return '/tabs/feed';
  }
  const primary = upperRoles[0];
  return getPortalForRole(primary)?.route ?? '/tabs/feed';
}

function normalizeRegisterPayload(data) {
  const rawPhone = data.phone || data.mobile || '';
  const digitsOnly = String(rawPhone).replace(/\D/g, '');
  const phone10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

  const resolvedFullName = (data.fullName || data.name || '').trim();
  const resolvedInviteCode = (data.inviteCode || data.communityCode || '').trim();
  const resolvedFlatNo = (data.flatNo || data.flatNumber || '').trim();
  const resolvedBlock = (data.block || data.tower || '').trim();
  const resolvedGender = (data.gender || 'OTHER').trim().toUpperCase() || 'OTHER';
  const consent = data.consentToPrivacyNotice !== undefined ? Boolean(data.consentToPrivacyNotice) : true;

  const payload = {
    ...data,
    fullName: resolvedFullName,
    phone: phone10,
    ...(resolvedInviteCode ? { inviteCode: resolvedInviteCode, communityCode: resolvedInviteCode } : {}),
    ...(resolvedFlatNo ? { flatNo: resolvedFlatNo, flatNumber: resolvedFlatNo } : {}),
    ...(resolvedBlock ? { block: resolvedBlock, tower: resolvedBlock } : {}),
    gender: resolvedGender,
    consentToPrivacyNotice: consent,

    name: resolvedFullName,
    mobile: phone10,
  };

  if (!resolvedInviteCode) {
    delete payload.inviteCode;
    delete payload.communityCode;
  }
  if (!resolvedFlatNo) {
    delete payload.flatNo;
    delete payload.flatNumber;
  }
  if (!resolvedBlock) {
    delete payload.block;
    delete payload.tower;
  }

  return payload;
}

function computeEffectivePermissions(roles, directPermissions) {
  const perms = new Set(directPermissions || []);
  for (const r of roles) {
    const roleKey = (r || '').trim().toUpperCase();
    const rp = ROLE_PERMISSIONS[roleKey];
    if (!rp) continue;
    if (rp.includes('*')) {
      return ['*'];
    }
    for (const p of rp) {
      perms.add(p);
    }
  }
  return Array.from(perms);
}

const MODULE_ALIASES = {
  COMMUNITY_FEED: ['COMMUNITY_FEED', 'FEED', 'FORUM', 'COMMUNITY'],
  SPORTS: ['SPORTS'],
  MARKETPLACE: ['MARKETPLACE', 'COMMERCE', 'AUCTIONS', 'MARKET'],
  VISITORS: ['VISITORS', 'SECURITY', 'GATE', 'SAFETY'],
  NOTICES: ['NOTICES', 'BROADCAST', 'ANNOUNCEMENT'],
  BOOKINGS: ['BOOKINGS', 'FACILITIES', 'AMENITIES'],
  FACILITIES: ['BOOKINGS', 'FACILITIES', 'AMENITIES'],
  HELPDESK: ['HELPDESK', 'COMPLAINTS', 'ISSUES'],
  POLLS: ['POLLS'],
  JOBS: ['JOBS', 'CPN'],
  EVENTS: ['EVENTS', 'CALENDAR', 'EXPERIENCES'],
  CALENDAR: ['EVENTS', 'CALENDAR'],
  ENTERTAINMENT: ['ENTERTAINMENT', 'MOVIES'],
  COMMUNITY_MGMT: ['COMMUNITY_MGMT', 'GOVERNANCE', 'PROJECTS'],
  GOVERNANCE: ['COMMUNITY_MGMT', 'GOVERNANCE'],
  FINANCE_MGMT: ['FINANCE_MGMT', 'PAYMENTS', 'PERSONAL_FINANCE'],
  PERSONAL_FINANCE: ['FINANCE_MGMT', 'PAYMENTS', 'PERSONAL_FINANCE'],
  ADMIN_HUB: ['ADMIN_HUB'],
  FOOD_OS: ['FOOD_OS', 'FOOD', 'FRESH_KITCHEN', 'DAILY_BASKET', 'MANA_FRESH'],
  FOOD: ['FOOD_OS', 'FOOD'],
  MANA_FRESH: ['FOOD_OS', 'FOOD', 'MANA_FRESH', 'FRESH_KITCHEN', 'DAILY_BASKET'],
  VENDOR_MANAGEMENT: ['VENDOR_MANAGEMENT', 'VENDOR'],
  GROUP_BUYING: ['GROUP_BUYING'],
  SERVICE_PLATFORM: ['SERVICE_PLATFORM', 'HOME_SERVICES', 'SERVICES'],
  HOME_SERVICES: ['SERVICE_PLATFORM', 'HOME_SERVICES', 'SERVICES'],
  SERVICES: ['SERVICE_PLATFORM', 'HOME_SERVICES', 'SERVICES'],
  EMERGENCY: ['EMERGENCY', 'SAFETY'],
  TRIPS: ['TRIPS', 'COMMUTE', 'MOBILITY'],
  COMMUTE: ['TRIPS', 'COMMUTE', 'MOBILITY'],
  DISCOVER: ['DISCOVER'],
  MAINTENANCE: ['MAINTENANCE', 'CPOS', 'AMC'],
  INSURANCE: ['INSURANCE'],
  COMMERCE: ['COMMERCE', 'MARKETPLACE'],
  ACADEMY: ['ACADEMY', 'LEARNING'],
  SAFETY: ['SAFETY', 'VISITORS', 'EMERGENCY', 'HEALTH'],
  HEALTH: ['HEALTH', 'SAFETY', 'WELLNESS'],
  WELLNESS: ['WELLNESS', 'HEALTH', 'SAFETY', 'FOOD_OS'],
  PAYMENTS: ['PAYMENTS', 'MANA_PAY', 'FINANCE_MGMT', 'WALLET', 'BBPS'],
  MANA_PAY: ['PAYMENTS', 'MANA_PAY', 'FINANCE_MGMT'],
  CPOS: ['CPOS', 'MAINTENANCE'],
  PARKING: ['PARKING', 'FACILITIES', 'VISITORS'],
  SMART_HOME: ['SMART_HOME', 'AUTOMATION', 'FACILITIES', 'IOT'],
  AUTOMATION: ['SMART_HOME', 'AUTOMATION', 'FACILITIES', 'IOT'],
  IOT: ['IOT', 'SUBMETERS', 'FACILITIES', 'SMART_HOME'],
  PROJECTS: ['PROJECTS', 'COMMUNITY_MGMT', 'GOVERNANCE'],
  AMC: ['AMC', 'MAINTENANCE', 'CPOS', 'FACILITIES'],
  INVENTORY: ['INVENTORY', 'FACILITIES', 'MAINTENANCE'],
  PETS: ['PETS', 'COMMUNITY_FEED', 'COMMUNITY'],
  AI_CONCIERGE: ['AI_CONCIERGE', 'AI_CHAT', 'SAFETY'],
  AI_CHAT: ['AI_CONCIERGE', 'AI_CHAT', 'SAFETY'],
};

function hasModule(enabledModules, moduleKey) {
  if (!enabledModules || enabledModules.length === 0) return true;
  const normalizedKey = (moduleKey || '').trim().toUpperCase();
  const upperMods = enabledModules.map(m => (m || '').trim().toUpperCase());
  if (upperMods.includes(normalizedKey)) return true;
  const aliases = MODULE_ALIASES[normalizedKey] || [normalizedKey];
  return aliases.some(alias => upperMods.includes(alias.toUpperCase()));
}

describe('Roles and Permissions Matrix — Minute Level Audit', () => {

  describe('1. Role Permissions Computation (computeEffectivePermissions)', () => {
    it('SUPER_ADMIN receives wildcard [*]', () => {
      const perms = computeEffectivePermissions(['SUPER_ADMIN']);
      assert.deepStrictEqual(perms, ['*']);
    });

    it('RESIDENT receives emergency, SOS, visitors, feed, billing dues, insurance', () => {
      const perms = computeEffectivePermissions(['RESIDENT']);
      assert.ok(perms.includes(VIEW_EMERGENCY), 'Resident must have VIEW_EMERGENCY');
      assert.ok(perms.includes(TRIGGER_SOS), 'Resident must have TRIGGER_SOS');
      assert.ok(perms.includes(VIEW_VISITORS), 'Resident must have VIEW_VISITORS');
      assert.ok(perms.includes(VIEW_FEED), 'Resident must have VIEW_FEED');
      assert.ok(perms.includes(VIEW_MAINTENANCE_DUES), 'Resident must have VIEW_MAINTENANCE_DUES');
      assert.ok(perms.includes(PAY_MAINTENANCE_DUES), 'Resident must have PAY_MAINTENANCE_DUES');
      assert.ok(perms.includes(VIEW_INSURANCE), 'Resident must have VIEW_INSURANCE');
      assert.strictEqual(perms.includes(MANAGE_BILLING), false, 'Resident must not have MANAGE_BILLING');
      assert.strictEqual(perms.includes(VIEW_ADMIN_DASHBOARD), false, 'Resident must not have VIEW_ADMIN_DASHBOARD');
    });

    it('OWNER and TENANT receive resident feature set', () => {
      const ownerPerms = computeEffectivePermissions(['OWNER']);
      const tenantPerms = computeEffectivePermissions(['TENANT']);
      assert.ok(ownerPerms.includes(VIEW_EMERGENCY));
      assert.ok(ownerPerms.includes(TRIGGER_SOS));
      assert.ok(ownerPerms.includes(VIEW_VISITORS));
      assert.ok(tenantPerms.includes(VIEW_EMERGENCY));
      assert.ok(tenantPerms.includes(TRIGGER_SOS));
      assert.ok(tenantPerms.includes(VIEW_VISITORS));
    });

    it('GUARD receives guard dashboard, visitors, incidents, alerts, but not finance', () => {
      const perms = computeEffectivePermissions(['GUARD']);
      assert.ok(perms.includes(VIEW_GUARD_DASHBOARD));
      assert.ok(perms.includes(VIEW_VISITORS));
      assert.ok(perms.includes(MANAGE_VISITORS));
      assert.ok(perms.includes(VIEW_EMERGENCY));
      assert.strictEqual(perms.includes(VIEW_ADMIN_DASHBOARD), false);
      assert.strictEqual(perms.includes(MANAGE_BILLING), false);
    });

    it('VENDOR receives vendor dashboard and bookings, not admin dashboard', () => {
      const perms = computeEffectivePermissions(['VENDOR']);
      assert.ok(perms.includes(VIEW_VENDOR_DASHBOARD));
      assert.strictEqual(perms.includes(VIEW_ADMIN_DASHBOARD), false);
    });

    it('SPORTS_ADMIN receives sports dashboard and tournament management', () => {
      const perms = computeEffectivePermissions(['SPORTS_ADMIN']);
      assert.ok(perms.includes(VIEW_SPORTS_DASHBOARD));
    });

    it('SPORTS_TRAINER receives sports dashboard, menu, and analytics', () => {
      const perms = computeEffectivePermissions(['SPORTS_TRAINER']);
      assert.ok(perms.includes(VIEW_SPORTS_DASHBOARD), 'Trainer must have VIEW_SPORTS_DASHBOARD');
      assert.strictEqual(perms.includes(VIEW_ADMIN_DASHBOARD), false, 'Trainer must not have VIEW_ADMIN_DASHBOARD');
    });

    it('STAFF receives admin dashboard, feed, notices, tickets, visitors, emergency', () => {
      const perms = computeEffectivePermissions(['STAFF']);
      assert.ok(perms.includes(VIEW_ADMIN_DASHBOARD), 'Staff must have VIEW_ADMIN_DASHBOARD');
      assert.ok(perms.includes(VIEW_FEED), 'Staff must have VIEW_FEED');
      assert.ok(perms.includes(VIEW_EMERGENCY), 'Staff must have VIEW_EMERGENCY');
      assert.ok(perms.includes(VIEW_VISITORS), 'Staff must have VIEW_VISITORS');
      assert.strictEqual(perms.includes(MANAGE_BILLING), false, 'Staff must not have MANAGE_BILLING');
    });

    it('CASHIER receives finance dashboard and billing management', () => {
      const perms = computeEffectivePermissions(['CASHIER']);
      assert.ok(perms.includes(MANAGE_BILLING), 'Cashier must have MANAGE_BILLING');
      assert.ok(perms.includes(VIEW_MAINTENANCE_DUES), 'Cashier must have VIEW_MAINTENANCE_DUES');
      assert.ok(perms.includes(PAY_MAINTENANCE_DUES), 'Cashier must have PAY_MAINTENANCE_DUES');
    });

    it('Merges direct user-specific permissions when provided', () => {
      const perms = computeEffectivePermissions(['RESIDENT'], ['CUSTOM_EXTRA_PERMISSION']);
      assert.ok(perms.includes(VIEW_EMERGENCY));
      assert.ok(perms.includes('CUSTOM_EXTRA_PERMISSION'));
    });

    it('Gracefully handles lowercase and un-trimmed roles', () => {
      const perms = computeEffectivePermissions([' resident ']);
      assert.ok(perms.includes(VIEW_EMERGENCY));
      assert.ok(perms.includes(TRIGGER_SOS));
    });
  });

  describe('2. Role Portal Routing (getPortalForRole)', () => {
    it('Routes all resident tiers to /tabs/feed', () => {
      assert.strictEqual(getPortalForRole('RESIDENT')?.route, '/tabs/feed');
      assert.strictEqual(getPortalForRole('OWNER')?.route, '/tabs/feed');
      assert.strictEqual(getPortalForRole('TENANT')?.route, '/tabs/feed');
      assert.strictEqual(getPortalForRole('MEMBER')?.route, '/tabs/feed');
      assert.strictEqual(getPortalForRole('USER')?.route, '/tabs/feed');
    });

    it('Routes all admin tiers to /admin-role/tabs/dashboard', () => {
      const adminTiers = [
        'SUPER_ADMIN', 'ADMIN', 'COMMUNITY_ADMIN', 'MODERATOR',
        'FINANCE_ADMIN', 'FACILITY_MANAGER', 'FOOD_ADMIN',
        'HELPDESK_AGENT', 'COMMITTEE_MEMBER', 'ACCOUNTANT', 'READONLY_ADMIN',
      ];
      for (const role of adminTiers) {
        const portal = getPortalForRole(role);
        assert.ok(portal, `Portal should exist for ${role}`);
        assert.strictEqual(portal.route, '/admin-role/tabs/dashboard', `Route for ${role} should be admin dashboard`);
      }
    });

    it('Routes guards to /guard/tabs/dashboard', () => {
      assert.strictEqual(getPortalForRole('GUARD')?.route, '/guard/tabs/dashboard');
      assert.strictEqual(getPortalForRole('SECURITY')?.route, '/guard/tabs/dashboard');
    });

    it('Routes vendors to /vendor/tabs/dashboard', () => {
      assert.strictEqual(getPortalForRole('VENDOR')?.route, '/vendor/tabs/dashboard');
      assert.strictEqual(getPortalForRole('SPORTS_VENDOR')?.route, '/vendor/tabs/dashboard');
    });

    it('Routes sports admin and trainer to /sports-admin/tabs/dashboard', () => {
      assert.strictEqual(getPortalForRole('SPORTS_ADMIN')?.route, '/sports-admin/tabs/dashboard');
      assert.strictEqual(getPortalForRole('SPORTS_REFEREE')?.route, '/sports-admin/tabs/dashboard');
      assert.strictEqual(getPortalForRole('SPORTS_TRAINER')?.route, '/sports-admin/tabs/dashboard');
    });

    it('Routes STAFF and CASHIER to /admin-role/tabs/dashboard', () => {
      assert.strictEqual(getPortalForRole('STAFF')?.route, '/admin-role/tabs/dashboard');
      assert.strictEqual(getPortalForRole('CASHIER')?.route, '/admin-role/tabs/dashboard');
    });

    it('Handles case-insensitivity in role lookup', () => {
      assert.strictEqual(getPortalForRole('resident')?.route, '/tabs/feed');
      assert.strictEqual(getPortalForRole('admin')?.route, '/admin-role/tabs/dashboard');
      assert.strictEqual(getPortalForRole('guard ')?.route, '/guard/tabs/dashboard');
    });
  });

  describe('3. Admin Portal Guard Access (ADMIN_PORTAL_ROLES)', () => {
    it('Includes all admin-level roles in ADMIN_PORTAL_ROLES', () => {
      const expected = [
        'SUPER_ADMIN', 'ADMIN', 'COMMUNITY_ADMIN',
        'MODERATOR', 'FINANCE_ADMIN', 'FINANCE_MGMT_ADMIN', 'FACILITY_MANAGER',
        'FOOD_ADMIN', 'FOOD_OS_ADMIN', 'HELPDESK_AGENT', 'HELPDESK_ADMIN', 'COMMITTEE_MEMBER',
        'ACCOUNTANT', 'READONLY_ADMIN', 'VISITORS_ADMIN', 'COMMUNITY_FEED_ADMIN',
        'STAFF', 'CASHIER',
      ];
      for (const role of expected) {
        assert.ok(ADMIN_PORTAL_ROLES.has(role), `${role} must be in ADMIN_PORTAL_ROLES`);
      }
    });

    it('Does not allow RESIDENT, GUARD, or VENDOR in ADMIN_PORTAL_ROLES', () => {
      assert.strictEqual(ADMIN_PORTAL_ROLES.has('RESIDENT'), false);
      assert.strictEqual(ADMIN_PORTAL_ROLES.has('OWNER'), false);
      assert.strictEqual(ADMIN_PORTAL_ROLES.has('TENANT'), false);
      assert.strictEqual(ADMIN_PORTAL_ROLES.has('GUARD'), false);
      assert.strictEqual(ADMIN_PORTAL_ROLES.has('VENDOR'), false);
    });
  });

  describe('4. Module Entitlement & Alias Gating (hasModule)', () => {
    it('Allows everything when enabledModules is undefined or empty', () => {
      assert.strictEqual(hasModule(undefined, 'EMERGENCY'), true);
      assert.strictEqual(hasModule([], 'PAYMENTS'), true);
      assert.strictEqual(hasModule(null, 'SPORTS'), true);
    });

    it('Resolves EMERGENCY from SAFETY', () => {
      const modules = ['SAFETY'];
      assert.strictEqual(hasModule(modules, 'EMERGENCY'), true);
      assert.strictEqual(hasModule(modules, 'VISITORS'), true);
      assert.strictEqual(hasModule(modules, 'SAFETY'), true);
      assert.strictEqual(hasModule(modules, 'SPORTS'), false);
    });

    it('Resolves FOOD_OS aliases (FOOD, FRESH_KITCHEN, DAILY_BASKET)', () => {
      const modules = ['FOOD_OS'];
      assert.strictEqual(hasModule(modules, 'FOOD_OS'), true);
      assert.strictEqual(hasModule(modules, 'FOOD'), true);
      assert.strictEqual(hasModule(['FOOD'], 'FOOD_OS'), true);
    });

    it('Resolves PAYMENTS and FINANCE_MGMT aliases', () => {
      const modules = ['PAYMENTS'];
      assert.strictEqual(hasModule(modules, 'PAYMENTS'), true);
      assert.strictEqual(hasModule(modules, 'MANA_PAY'), true);
      assert.strictEqual(hasModule(modules, 'FINANCE_MGMT'), true);
    });

    it('Handles mixed-case and untrimmed module names from backend', () => {
      const modules = [' safety ', 'Payments'];
      assert.strictEqual(hasModule(modules, 'SAFETY'), true);
      assert.strictEqual(hasModule(modules, 'emergency'), true);
      assert.strictEqual(hasModule(modules, 'PAYMENTS'), true);
      assert.strictEqual(hasModule(modules, 'mana_pay'), true);
      assert.strictEqual(hasModule(modules, 'SPORTS'), false);
    });

    it('Resolves PARKING, IOT, SMART_HOME and PROJECTS aliases correctly', () => {
      assert.strictEqual(hasModule(['VISITORS'], 'PARKING'), true);
      assert.strictEqual(hasModule(['FACILITIES'], 'PARKING'), true);
      assert.strictEqual(hasModule(['FACILITIES'], 'IOT'), true);
      assert.strictEqual(hasModule(['COMMUNITY_MGMT'], 'PROJECTS'), true);
      assert.strictEqual(hasModule(['PROJECTS'], 'COMMUNITY_MGMT'), true);
      assert.strictEqual(hasModule(['FOOD_OS'], 'MANA_FRESH'), true);
    });
  });

  describe('5. Mobile Dashboard & QuickActions Access Resolution', () => {
    const SAMPLE_HOME_ACTIONS = [
      { id: 'emergency', label: 'Emergency SOS', cat: 'Safety & Help', module: 'EMERGENCY' },
      { id: 'visitors', label: 'Visitors Gate', cat: 'Safety & Help', module: 'VISITORS' },
      { id: 'society_erp', label: 'Society ERP', cat: 'Living & Bills', module: 'FINANCE_MGMT', roles: ['SUPER_ADMIN', 'ADMIN', 'COMMUNITY_ADMIN', 'FINANCE_ADMIN'] },
      { id: 'dues', label: 'Dues', cat: 'Living & Bills', module: 'FINANCE_MGMT' },
      { id: 'sports', label: 'Sports', cat: 'Social & Sports', module: 'SPORTS' },
      { id: 'marketplace', label: 'Marketplace', cat: 'Commerce & Food', module: 'MARKETPLACE' },
      { id: 'projects', label: 'Projects', cat: 'Facilities', module: 'COMMUNITY_MGMT' },
    ];

    function filterActions(actions, user) {
      const isSuperAdmin = (user.roles || []).includes('SUPER_ADMIN');
      const userRoles = new Set((user.roles || []).map(r => r.toUpperCase()));
      return actions.filter(a => {
        if (isSuperAdmin) return true;
        if (a.roles && a.roles.length > 0 && !a.roles.some(r => userRoles.has(r.toUpperCase()))) {
          return false;
        }
        if (a.module && !hasModule(user.enabledModules, a.module)) {
          return false;
        }
        return true;
      });
    }

    it('Hides society_erp from standard RESIDENT, OWNER and TENANT users', () => {
      const resident = { id: 10, roles: ['RESIDENT'], enabledModules: ['FINANCE_MGMT', 'VISITORS'] };
      const visible = filterActions(SAMPLE_HOME_ACTIONS, resident);
      const visibleIds = visible.map(a => a.id);
      assert.strictEqual(visibleIds.includes('dues'), true, 'Resident must see dues');
      assert.strictEqual(visibleIds.includes('society_erp'), false, 'Resident must NOT see society_erp');
    });

    it('Shows society_erp to ADMIN and COMMUNITY_ADMIN users', () => {
      const admin = { id: 11, roles: ['COMMUNITY_ADMIN'], enabledModules: ['FINANCE_MGMT', 'VISITORS'] };
      const visible = filterActions(SAMPLE_HOME_ACTIONS, admin);
      const visibleIds = visible.map(a => a.id);
      assert.strictEqual(visibleIds.includes('dues'), true);
      assert.strictEqual(visibleIds.includes('society_erp'), true, 'Admin must see society_erp');
    });

    it('Hides disabled community modules from QuickActions', () => {
      // Community only subscribed to SAFETY and COMMUNITY_MGMT
      const gatedUser = { id: 12, roles: ['RESIDENT'], enabledModules: ['SAFETY', 'COMMUNITY_MGMT'] };
      const visible = filterActions(SAMPLE_HOME_ACTIONS, gatedUser);
      const visibleIds = visible.map(a => a.id);

      assert.strictEqual(visibleIds.includes('emergency'), true);
      assert.strictEqual(visibleIds.includes('visitors'), true); // via SAFETY alias
      assert.strictEqual(visibleIds.includes('projects'), true); // via COMMUNITY_MGMT
      assert.strictEqual(visibleIds.includes('sports'), false, 'Sports should be hidden');
      assert.strictEqual(visibleIds.includes('marketplace'), false, 'Marketplace should be hidden');
      assert.strictEqual(visibleIds.includes('dues'), false, 'Dues should be hidden');
    });

    it('SUPER_ADMIN sees all modules unconditionally', () => {
      const superAdmin = { id: 1, roles: ['SUPER_ADMIN'], enabledModules: [] };
      const visible = filterActions(SAMPLE_HOME_ACTIONS, superAdmin);
      assert.strictEqual(visible.length, SAMPLE_HOME_ACTIONS.length);
    });
  });

  describe('6. KPI Strip Module-Gating Audit', () => {
    const KPI_ITEMS = [
      { id: 'pass',        label: 'Pass',       module: 'VISITORS' },
      { id: 'events',      label: 'Events',     module: 'EVENTS' },
      { id: 'sports',      label: 'Sports',     module: 'SPORTS' },
      { id: 'dues',        label: 'Dues',       module: 'FINANCE_MGMT' },
      { id: 'polls',       label: 'Polls',      module: 'POLLS' },
      { id: 'tickets',     label: 'Tickets',    module: 'HELPDESK' },
      { id: 'facilities',  label: 'Facilities', module: 'FACILITIES' },
      { id: 'notices',     label: 'Notices',    module: 'NOTICES' },
      { id: 'marketplace', label: 'Market',     module: 'MARKETPLACE' },
      { id: 'group_buying',label: 'Group Buy',  module: 'GROUP_BUYING' },
      { id: 'trips',       label: 'Trips',      module: 'TRIPS' },
      { id: 'food',        label: 'Food OS',    module: 'FOOD_OS' },
    ];

    function filterKpi(kpis, enabledModules) {
      return kpis.filter(k => !k.module || hasModule(enabledModules, k.module));
    }

    it('When user only has sports and events, displays BOTH Events and Sports chips (not a lonely single chip)', () => {
      const modules = ['SPORTS', 'EVENTS'];
      const visible = filterKpi(KPI_ITEMS, modules);
      const visibleLabels = visible.map(k => k.label);
      assert.deepStrictEqual(visibleLabels, ['Events', 'Sports']);
      assert.strictEqual(visible.length, 2);
    });

    it('Filters out KPI chips for disabled modules', () => {
      const modules = ['HELPDESK', 'VISITORS'];
      const visible = filterKpi(KPI_ITEMS, modules);
      const visibleLabels = visible.map(k => k.label);
      assert.deepStrictEqual(visibleLabels, ['Pass', 'Tickets']);
      assert.strictEqual(visibleLabels.includes('Events'), false);
      assert.strictEqual(visibleLabels.includes('Sports'), false);
      assert.strictEqual(visibleLabels.includes('Polls'), false);
    });

    it('Displays all KPI chips when modules are unrestricted / fail-open', () => {
      const visible = filterKpi(KPI_ITEMS, []);
      assert.strictEqual(visible.length, KPI_ITEMS.length);
    });

    it('Adaptive Sub-KPI Engine unpacks single module (SPORTS) into multiple granular chips', () => {
      // Simulating Adaptive Sub-KPI expansion function
      function computeAdaptiveKpis(macroItems, stats) {
        if (macroItems.length > 3) return macroItems;
        const sub = [];
        for (const item of macroItems) {
          if (item.module === 'SPORTS') {
            if (stats.sportsLive > 0) sub.push({ id: 'sports_live', label: 'Live Match', badge: 'LIVE', priority: 95 });
            if (stats.sportsToday > 0) sub.push({ id: 'sports_today', label: "Today's Games", priority: 80 });
            if (stats.sportsTourneys > 0) sub.push({ id: 'sports_tourneys', label: 'Tournaments', priority: 70 });
            sub.push({ id: 'sports_courts', label: 'Court Slots', priority: 45 });
          }
          if (item.module === 'EVENTS') {
            if (stats.eventsToday > 0) sub.push({ id: 'events_today', label: "Today's Events", badge: 'TODAY', priority: 85 });
            sub.push({ id: 'events_upcoming', label: 'Upcoming', priority: 65 });
          }
        }
        return sub.sort((a, b) => b.priority - a.priority);
      }

      const singleModule = filterKpi(KPI_ITEMS, ['SPORTS']);
      const adaptive = computeAdaptiveKpis(singleModule, { sportsLive: 1, sportsToday: 2, sportsTourneys: 3 });

      assert(adaptive.length >= 3, 'Must expand single sports module into at least 3 chips');
      assert.strictEqual(adaptive[0].id, 'sports_live', 'Live sports match must sort first');
      assert.strictEqual(adaptive[0].badge, 'LIVE');
      assert(adaptive.some(c => c.id === 'sports_today'));
      assert(adaptive.some(c => c.id === 'sports_tourneys'));
    });

    it('Adaptive Sub-KPI Engine unrolls dual modules (SPORTS + EVENTS) into balanced 5-chip HUD', () => {
      function computeAdaptiveKpis(macroItems, stats) {
        const sub = [];
        for (const item of macroItems) {
          if (item.module === 'SPORTS') {
            if (stats.sportsLive > 0) sub.push({ id: 'sports_live', label: 'Live Match', badge: 'LIVE', priority: 95 });
            if (stats.sportsToday > 0) sub.push({ id: 'sports_today', label: "Today's Games", priority: 80 });
            if (stats.sportsTourneys > 0) sub.push({ id: 'sports_tourneys', label: 'Tournaments', priority: 70 });
          }
          if (item.module === 'EVENTS') {
            if (stats.eventsToday > 0) sub.push({ id: 'events_today', label: "Today's Events", badge: 'TODAY', priority: 85 });
            sub.push({ id: 'events_upcoming', label: 'Upcoming', priority: 65 });
          }
        }
        return sub.sort((a, b) => b.priority - a.priority);
      }

      const dualModules = filterKpi(KPI_ITEMS, ['SPORTS', 'EVENTS']);
      const adaptive = computeAdaptiveKpis(dualModules, {
        sportsLive: 1,
        sportsToday: 2,
        sportsTourneys: 1,
        eventsToday: 1,
        eventsUpcoming: 4,
      });

      assert.strictEqual(adaptive.length, 5);
      const labels = adaptive.map(a => a.label);
      assert.deepStrictEqual(labels, ['Live Match', "Today's Events", "Today's Games", 'Tournaments', 'Upcoming']);
    });
  });

  describe('7. Mobile Registration DTO Payload Normalization (Bug 1)', () => {
    it('maps mobile legacy payload to backend RegisterRequest canonical DTO', () => {
      const mobileInput = {
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        mobile: '+91 98765 43210',
        password: 'Password123!',
        communityCode: 'ABC123',
        flatNumber: 'A-204',
        tower: 'Tower A',
      };

      const normalized = normalizeRegisterPayload(mobileInput);

      // Backend canonical fields
      assert.strictEqual(normalized.fullName, 'Rahul Sharma');
      assert.strictEqual(normalized.phone, '9876543210', 'Phone must be stripped to clean 10 digits');
      assert.strictEqual(normalized.inviteCode, 'ABC123');
      assert.strictEqual(normalized.flatNo, 'A-204');
      assert.strictEqual(normalized.block, 'Tower A');
      assert.strictEqual(normalized.gender, 'OTHER', 'Defaults to OTHER when omitted');
      assert.strictEqual(normalized.consentToPrivacyNotice, true, 'Defaults to true when omitted');

      // Mobile legacy aliases maintained
      assert.strictEqual(normalized.name, 'Rahul Sharma');
      assert.strictEqual(normalized.mobile, '9876543210');
      assert.strictEqual(normalized.communityCode, 'ABC123');
      assert.strictEqual(normalized.flatNumber, 'A-204');
      assert.strictEqual(normalized.tower, 'Tower A');
    });

    it('respects explicitly provided gender and privacy consent', () => {
      const input = {
        fullName: 'Priya Patel',
        email: 'priya@example.com',
        phone: '09876543210',
        password: 'SecretPassword!',
        inviteCode: 'COMM456',
        flatNo: 'B-101',
        block: 'Block B',
        gender: 'FEMALE',
        consentToPrivacyNotice: true,
      };

      const normalized = normalizeRegisterPayload(input);
      assert.strictEqual(normalized.fullName, 'Priya Patel');
      assert.strictEqual(normalized.phone, '9876543210');
      assert.strictEqual(normalized.gender, 'FEMALE');
      assert.strictEqual(normalized.consentToPrivacyNotice, true);
    });
  });

  describe('8. Landing Portal Independent of Alphabetical Role Sorting (Bug 2)', () => {
    it('always lands user in resident home (/tabs/feed) when USER/RESIDENT is among roles', () => {
      // ADMIN comes alphabetically before USER ('ADMIN' < 'USER')
      assert.strictEqual(getDefaultLandingRoute(['ADMIN', 'USER']), '/tabs/feed');
      assert.strictEqual(getDefaultLandingRoute(['USER', 'ADMIN']), '/tabs/feed');

      // SPORTS_ADMIN comes alphabetically before USER ('SPORTS_ADMIN' < 'USER')
      assert.strictEqual(getDefaultLandingRoute(['SPORTS_ADMIN', 'USER']), '/tabs/feed');
      assert.strictEqual(getDefaultLandingRoute(['USER', 'SPORTS_ADMIN']), '/tabs/feed');

      // USER + VENDOR ('USER' < 'VENDOR')
      assert.strictEqual(getDefaultLandingRoute(['USER', 'VENDOR']), '/tabs/feed');
      assert.strictEqual(getDefaultLandingRoute(['VENDOR', 'USER']), '/tabs/feed');

      // Other resident tiers
      assert.strictEqual(getDefaultLandingRoute(['ADMIN', 'RESIDENT']), '/tabs/feed');
      assert.strictEqual(getDefaultLandingRoute(['SPORTS_ADMIN', 'OWNER']), '/tabs/feed');
      assert.strictEqual(getDefaultLandingRoute(['VENDOR', 'TENANT']), '/tabs/feed');
      assert.strictEqual(getDefaultLandingRoute(['ADMIN', 'MEMBER']), '/tabs/feed');
    });

    it('routes non-resident standalone administrative and vendor roles to their portals', () => {
      assert.strictEqual(getDefaultLandingRoute(['ADMIN']), '/admin-role/tabs/dashboard');
      assert.strictEqual(getDefaultLandingRoute(['SUPER_ADMIN']), '/admin-role/tabs/dashboard');
      assert.strictEqual(getDefaultLandingRoute(['SPORTS_ADMIN']), '/sports-admin/tabs/dashboard');
      assert.strictEqual(getDefaultLandingRoute(['EVENT_ADMIN']), '/event-admin/tabs/dashboard');
      assert.strictEqual(getDefaultLandingRoute(['EVENTS_ADMIN']), '/event-admin/tabs/dashboard');
      assert.strictEqual(getDefaultLandingRoute(['GUARD']), '/guard/tabs/dashboard');
      assert.strictEqual(getDefaultLandingRoute(['VENDOR']), '/vendor/tabs/dashboard');
    });
  });

  describe('9. Backend vs Mobile Role Name Aliasing & Guards (Bug 3)', () => {
    it('maps backend EVENTS_ADMIN to Event Admin portal and allows event-admin access', () => {
      const portal = getPortalForRole('EVENTS_ADMIN');
      assert.ok(portal, 'EVENTS_ADMIN must have a portal mapping');
      assert.strictEqual(portal.route, '/event-admin/tabs/dashboard');
      assert.strictEqual(portal.label, 'Event Admin');

      const aliases = resolveRoleAliases('EVENTS_ADMIN');
      assert.ok(aliases.includes('EVENT_ADMIN'));
      assert.ok(aliases.includes('EVENTS_ADMIN'));
    });

    it('maps backend FINANCE_MGMT_ADMIN, HELPDESK_ADMIN, FOOD_OS_ADMIN to admin console', () => {
      assert.strictEqual(getPortalForRole('FINANCE_MGMT_ADMIN')?.route, '/admin-role/tabs/dashboard');
      assert.strictEqual(getPortalForRole('HELPDESK_ADMIN')?.route, '/admin-role/tabs/dashboard');
      assert.strictEqual(getPortalForRole('FOOD_OS_ADMIN')?.route, '/admin-role/tabs/dashboard');
      assert.strictEqual(getPortalForRole('VISITORS_ADMIN')?.route, '/admin-role/tabs/dashboard');
      assert.strictEqual(getPortalForRole('COMMUNITY_FEED_ADMIN')?.route, '/admin-role/tabs/dashboard');
    });

    it('grants full permissions to backend role names via ROLE_PERMISSIONS and aliases', () => {
      const eventsPerms = computeEffectivePermissions(['EVENTS_ADMIN']);
      assert.ok(eventsPerms.length > 0, 'EVENTS_ADMIN must receive permissions');
      assert.deepStrictEqual(eventsPerms, ROLE_PERMISSIONS.EVENT_ADMIN);

      const financePerms = computeEffectivePermissions(['FINANCE_MGMT_ADMIN']);
      assert.ok(financePerms.length > 0);
      assert.deepStrictEqual(financePerms, ROLE_PERMISSIONS.FINANCE_ADMIN);
    });
  });

  describe('10. Standalone Account Creation & Late Community Linking', () => {
    it('omits inviteCode, communityCode, flatNo, block completely when user creates a standalone account', () => {
      const standaloneInput = {
        fullName: 'Alex Standalone',
        phone: '9876543210',
        email: 'alex@example.com',
        password: 'Password123!',
        inviteCode: '',
        communityCode: '',
        flatNo: '',
        block: '',
      };

      const payload = normalizeRegisterPayload(standaloneInput);
      assert.strictEqual(payload.fullName, 'Alex Standalone');
      assert.strictEqual(payload.phone, '9876543210');
      assert.strictEqual(payload.inviteCode, undefined);
      assert.strictEqual(payload.communityCode, undefined);
      assert.strictEqual(payload.flatNo, undefined);
      assert.strictEqual(payload.flatNumber, undefined);
      assert.strictEqual(payload.block, undefined);
      assert.strictEqual(payload.tower, undefined);
      assert.ok(!('inviteCode' in payload), 'inviteCode property must not exist in payload');
      assert.ok(!('communityCode' in payload), 'communityCode property must not exist in payload');
    });

    it('preserves inviteCode and unit information when user joins a community with a code', () => {
      const communityInput = {
        fullName: 'Jordan Resident',
        phone: '9123456789',
        email: 'jordan@example.com',
        password: 'Password123!',
        inviteCode: 'COMM123',
        flatNo: 'B-402',
        block: 'Tower B',
      };

      const payload = normalizeRegisterPayload(communityInput);
      assert.strictEqual(payload.inviteCode, 'COMM123');
      assert.strictEqual(payload.communityCode, 'COMM123');
      assert.strictEqual(payload.flatNo, 'B-402');
      assert.strictEqual(payload.flatNumber, 'B-402');
      assert.strictEqual(payload.block, 'Tower B');
      assert.strictEqual(payload.tower, 'Tower B');
    });

    it('resolves Explore Mana and + Join Community HUD when communityId is null or undefined', () => {
      const standaloneUser = {
        id: 101,
        fullName: 'Standalone User',
        email: 'user@mana.org',
        communityId: null,
        role: 'RESIDENT',
      };

      const hasCommunity = Boolean(standaloneUser.communityId);
      const communityDisplay = hasCommunity ? (standaloneUser.communityName || 'My Community') : 'Explore Mana';
      const unitDisplay = hasCommunity ? (standaloneUser.flatNo || 'Unit not set') : '+ Join Community';

      assert.strictEqual(hasCommunity, false);
      assert.strictEqual(communityDisplay, 'Explore Mana');
      assert.strictEqual(unitDisplay, '+ Join Community');
    });

    it('enables global standalone feature access (fail-open) for standalone accounts', () => {
      // Standalone user without community-specific enabledModules
      const standaloneModules = [];
      const hasModule = (name) => {
        if (!standaloneModules || standaloneModules.length === 0) return true;
        return standaloneModules.includes(name);
      };

      assert.strictEqual(hasModule('PERSONAL_FINANCE'), true, 'Standalone user can access personal finance');
      assert.strictEqual(hasModule('MARKETPLACE'), true, 'Standalone user can access marketplace');
      assert.strictEqual(hasModule('SPORTS'), true, 'Standalone user can access sports');
      assert.strictEqual(hasModule('EVENTS'), true, 'Standalone user can access events');
    });
  });
});
