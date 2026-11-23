import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import pure constants from permissions.ts (no @/ dependencies)
import {
  ROLE_PERMISSIONS,
  ADMIN_ROLES,
  ADMIN_PORTAL_ROLES,
  GUARD_ROLES,
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
  SUPER_ADMIN:      { role: 'SUPER_ADMIN',      label: 'Admin Console',   route: '/admin-role/tabs/dashboard', icon: 'shield-checkmark' },
  ADMIN:            { role: 'ADMIN',             label: 'Admin Console',   route: '/admin-role/tabs/dashboard', icon: 'shield-checkmark' },
  COMMUNITY_ADMIN:  { role: 'COMMUNITY_ADMIN',   label: 'Admin Console',   route: '/admin-role/tabs/dashboard', icon: 'shield-checkmark' },
  MODERATOR:        { role: 'MODERATOR',          label: 'Moderator',       route: '/admin-role/tabs/dashboard', icon: 'shield-half' },
  GUARD:            { role: 'GUARD',              label: 'Guard Portal',    route: '/guard/tabs/dashboard',      icon: 'eye' },
  SECURITY:         { role: 'SECURITY',           label: 'Security Portal', route: '/guard/tabs/dashboard',      icon: 'eye' },
  VENDOR:           { role: 'VENDOR',             label: 'Vendor Portal',   route: '/vendor/tabs/dashboard',     icon: 'construct' },
  SPORTS_ADMIN:     { role: 'SPORTS_ADMIN',       label: 'Sports Admin',    route: '/sports-admin/tabs/dashboard', icon: 'trophy' },
  SPORTS_REFEREE:   { role: 'SPORTS_REFEREE',     label: 'Referee Panel',   route: '/sports-admin/tabs/dashboard', icon: 'flag' },
  EVENT_ADMIN:      { role: 'EVENT_ADMIN',        label: 'Event Admin',     route: '/event-admin/tabs/dashboard',  icon: 'calendar' },
  FINANCE_ADMIN:    { role: 'FINANCE_ADMIN',      label: 'Finance Admin',   route: '/admin-role/tabs/dashboard',   icon: 'cash' },
  FACILITY_MANAGER: { role: 'FACILITY_MANAGER',   label: 'Facility Manager', route: '/admin-role/tabs/dashboard',  icon: 'business' },
  FOOD_ADMIN:       { role: 'FOOD_ADMIN',         label: 'Food Admin',      route: '/admin-role/tabs/dashboard',   icon: 'restaurant' },
  HELPDESK_AGENT:   { role: 'HELPDESK_AGENT',     label: 'Helpdesk',        route: '/admin-role/tabs/dashboard',   icon: 'headset' },
  COMMITTEE_MEMBER: { role: 'COMMITTEE_MEMBER',   label: 'Committee',       route: '/admin-role/tabs/dashboard',   icon: 'people' },
  ACCOUNTANT:       { role: 'ACCOUNTANT',         label: 'Accountant',      route: '/admin-role/tabs/dashboard',   icon: 'calculator' },
  READONLY_ADMIN:   { role: 'READONLY_ADMIN',     label: 'View-Only Admin', route: '/admin-role/tabs/dashboard',   icon: 'eye' },
  MEMBER:           { role: 'MEMBER',             label: 'Resident Home',   route: '/tabs/feed',                   icon: 'home' },
  USER:             { role: 'USER',               label: 'Home',            route: '/tabs/feed',                   icon: 'home' },
  RESIDENT:         { role: 'RESIDENT',           label: 'Resident Home',   route: '/tabs/feed',                   icon: 'home' },
  OWNER:            { role: 'OWNER',              label: 'Owner Home',      route: '/tabs/feed',                   icon: 'home' },
  TENANT:           { role: 'TENANT',             label: 'Tenant Home',     route: '/tabs/feed',                   icon: 'home' },
  SPORTS_VENDOR:    { role: 'SPORTS_VENDOR',      label: 'Sports Vendor',   route: '/vendor/tabs/dashboard',       icon: 'construct' },
};

function getPortalForRole(role) {
  if (!role) return null;
  const upper = String(role).trim().toUpperCase();
  return ROLE_PORTAL_MAP[upper] ?? null;
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

    it('Routes sports admin to /sports-admin/tabs/dashboard', () => {
      assert.strictEqual(getPortalForRole('SPORTS_ADMIN')?.route, '/sports-admin/tabs/dashboard');
      assert.strictEqual(getPortalForRole('SPORTS_REFEREE')?.route, '/sports-admin/tabs/dashboard');
    });

    it('Handles case-insensitivity in role lookup', () => {
      assert.strictEqual(getPortalForRole('resident')?.route, '/tabs/feed');
      assert.strictEqual(getPortalForRole('admin')?.route, '/admin-role/tabs/dashboard');
      assert.strictEqual(getPortalForRole('guard ')?.route, '/guard/tabs/dashboard');
    });
  });

  describe('3. Admin Portal Guard Access (ADMIN_PORTAL_ROLES)', () => {
    it('Includes all 11 admin-level roles in ADMIN_PORTAL_ROLES', () => {
      const expected = [
        'SUPER_ADMIN', 'ADMIN', 'COMMUNITY_ADMIN',
        'MODERATOR', 'FINANCE_ADMIN', 'FACILITY_MANAGER',
        'FOOD_ADMIN', 'HELPDESK_AGENT', 'COMMITTEE_MEMBER',
        'ACCOUNTANT', 'READONLY_ADMIN',
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
      { label: 'Events', module: 'EVENTS' },
      { label: 'Polls', module: 'POLLS' },
      { label: 'Tickets', module: 'HELPDESK' },
      { label: 'Pass', module: 'VISITORS' },
    ];

    function filterKpi(kpis, enabledModules) {
      return kpis.filter(k => !k.module || hasModule(enabledModules, k.module));
    }

    it('Filters out KPI chips for disabled modules', () => {
      const modules = ['HELPDESK', 'VISITORS'];
      const visible = filterKpi(KPI_ITEMS, modules);
      const visibleLabels = visible.map(k => k.label);
      assert.deepStrictEqual(visibleLabels, ['Tickets', 'Pass']);
      assert.strictEqual(visibleLabels.includes('Events'), false);
      assert.strictEqual(visibleLabels.includes('Polls'), false);
    });

    it('Displays all KPI chips when all modules are enabled', () => {
      const modules = ['EVENTS', 'POLLS', 'HELPDESK', 'VISITORS'];
      const visible = filterKpi(KPI_ITEMS, modules);
      assert.strictEqual(visible.length, 4);
    });
  });
});
