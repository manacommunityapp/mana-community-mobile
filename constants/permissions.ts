// ──── COMMUNITY FEED ────
export const VIEW_FEED = "View Feed";

// ──── HOME SERVICES ────
export const VIEW_HOME_SERVICE = "View Home Service";

// ──── SPORTS ────
export const VIEW_SPORTS_MENU = "View Sports Menu";
export const VIEW_SPORTS_MAIN = "View Sports Main";

// ──── MARKETPLACE ────
export const VIEW_MARKETPLACE = "View Marketplace";

// ──── VISITOR / GATE PASS ────
export const VIEW_VISITORS = "View Visitors";

// ──── AMENITY BOOKING ────
export const VIEW_AMENITIES = "View Amenities";

// ──── NOTICE BOARD ────
export const VIEW_NOTICES = "View Notices";

// ──── HELPDESK / COMPLAINTS ────
export const VIEW_TICKETS = "View Tickets";
export const CREATE_TICKET = "Create Ticket";
export const MANAGE_TICKETS = "Manage Tickets";

// ──── POLLING / VOTING ────
export const VIEW_POLLS = "View Polls";
export const VOTE_POLL = "Vote Poll";

// ──── JOBS & REFERRALS ────
export const VIEW_JOBS = "View Jobs";

// ──── EVENTS ────
export const VIEW_EVENTS = "View Events";
export const REGISTER_EVENT = "Register Event";
export const VIEW_EVENT_GALLERY = "View Event Gallery";

// ──── EMERGENCY & SOS ────
export const VIEW_EMERGENCY   = "View Emergency";
export const TRIGGER_SOS      = "Trigger SOS";
export const MANAGE_EMERGENCY = "Manage Emergency";

// ──── GROUP BUYING ────
export const VIEW_GROUP_BUYING   = "View Group Buying";
export const JOIN_GROUP_DEAL     = "Join Group Deal";
export const MANAGE_GROUP_BUYING = "Manage Group Buying";

// ──── COMMUNITY TRIPS ────
export const VIEW_TRIPS  = "View Trips";
export const BOOK_TRIP   = "Book Trip";
export const CREATE_TRIP = "Create Trip";

// ──── COMMUNITY DISCOVER / GRAPH ────
export const VIEW_DISCOVER = "View Discover";

// ──── MAINTENANCE BILLING & DUES ────
export const VIEW_MAINTENANCE_DUES = "View Maintenance Dues";
export const PAY_MAINTENANCE_DUES  = "Pay Maintenance Dues";
export const MANAGE_BILLING        = "Manage Billing";

// ──── ADMIN ────
export const VIEW_ADMIN = "View Admin";
export const VIEW_ADMIN_DASHBOARD  = "View Admin Dashboard";
export const MANAGE_APPROVALS      = "Manage Approvals";
export const MANAGE_FINANCE        = "Manage Finance";
export const MANAGE_SECURITY       = "Manage Security";
export const MANAGE_GOVERNANCE     = "Manage Governance";
export const VIEW_ANALYTICS        = "View Analytics";

// ──── GUARD / SECURITY ────
export const VIEW_GUARD_DASHBOARD = "View Guard Dashboard";
export const MANAGE_VISITORS      = "Manage Visitors";
export const MANAGE_INCIDENTS     = "Manage Incidents";
export const MANAGE_PATROL        = "Manage Patrol";
export const RAISE_ALERT          = "Raise Alert";

// ──── VENDOR ────
export const VIEW_VENDOR_DASHBOARD = "View Vendor Dashboard";
export const MANAGE_BOOKINGS       = "Manage Bookings";
export const MANAGE_WORK_ORDERS    = "Manage Work Orders";
export const MANAGE_INVOICES       = "Manage Invoices";
export const MANAGE_AVAILABILITY   = "Manage Availability";

// ──── SPORTS ADMIN ────
export const VIEW_SPORTS_DASHBOARD    = "View Sports Dashboard";
export const MANAGE_TOURNAMENTS       = "Manage Tournaments";
export const MANAGE_MATCHES           = "Manage Matches";
export const MANAGE_SPORTS_TEAMS      = "Manage Sports Teams";
export const VIEW_SPORTS_ANALYTICS    = "View Sports Analytics";
export const MANAGE_LIVE_SCORING      = "Manage Live Scoring";
export const MANAGE_VENUES            = "Manage Venues";

// ──── EVENT ADMIN ────
export const VIEW_EVENT_DASHBOARD     = "View Event Dashboard";
export const MANAGE_EVENTS            = "Manage Events";
export const MANAGE_EVENT_VENUES      = "Manage Event Venues";
export const MANAGE_REGISTRATIONS     = "Manage Registrations";
export const VIEW_EVENT_ANALYTICS     = "View Event Analytics";
export const MANAGE_DEPARTMENTS       = "Manage Departments";
export const MANAGE_PROSPECTUS        = "Manage Prospectus";

// ──── FINANCE ────
export const VIEW_FINANCE_DASHBOARD  = "View Finance Dashboard";
export const MANAGE_PERSONAL_FINANCE = "Manage Personal Finance";
export const MANAGE_SOCIETY_FINANCE  = "Manage Society Finance";

// ──── FOOD ────
export const VIEW_FOOD_MENU         = "View Food Menu";
export const MANAGE_FOOD_OPERATIONS = "Manage Food Operations";
export const MANAGE_MEAL_PLANS      = "Manage Meal Plans";

// ──── FACILITY ────
export const MANAGE_FACILITIES     = "Manage Facilities";
export const VIEW_FACILITY_REPORTS = "View Facility Reports";

// ──── HELPDESK ────
export const RESOLVE_TICKETS     = "Resolve Tickets";
export const ASSIGN_TICKETS      = "Assign Tickets";
export const VIEW_HELPDESK_QUEUE = "View Helpdesk Queue";

// ──── COMMITTEE ────
export const VIEW_COMMITTEE_DASHBOARD = "View Committee Dashboard";
export const MANAGE_COMMITTEE_TASKS   = "Manage Committee Tasks";
export const MANAGE_RESOLUTIONS       = "Manage Resolutions";

// ──── ROLES ────
export const ROLE_SUPER_ADMIN      = "SUPER_ADMIN";
export const ROLE_ADMIN            = "ADMIN";
export const ROLE_COMMUNITY_ADMIN  = "COMMUNITY_ADMIN";
export const ROLE_MODERATOR        = "MODERATOR";
export const ROLE_MEMBER           = "MEMBER";
export const ROLE_USER             = "USER";
export const ROLE_GUARD            = "GUARD";
export const ROLE_SECURITY         = "SECURITY";
export const ROLE_VENDOR           = "VENDOR";
export const ROLE_SPORTS_ADMIN     = "SPORTS_ADMIN";
export const ROLE_SPORTS_REFEREE   = "SPORTS_REFEREE";
export const ROLE_EVENT_ADMIN      = "EVENT_ADMIN";
export const ROLE_FINANCE_ADMIN    = "FINANCE_ADMIN";
export const ROLE_FACILITY_MANAGER = "FACILITY_MANAGER";
export const ROLE_FOOD_ADMIN       = "FOOD_ADMIN";
export const ROLE_HELPDESK_AGENT   = "HELPDESK_AGENT";
export const ROLE_COMMITTEE_MEMBER = "COMMITTEE_MEMBER";

export type UserRole =
  | 'SUPER_ADMIN' | 'ADMIN' | 'COMMUNITY_ADMIN'
  | 'MODERATOR' | 'GUARD' | 'SECURITY' | 'VENDOR'
  | 'SPORTS_ADMIN' | 'SPORTS_REFEREE' | 'EVENT_ADMIN'
  | 'FINANCE_ADMIN' | 'FACILITY_MANAGER' | 'FOOD_ADMIN'
  | 'HELPDESK_AGENT' | 'COMMITTEE_MEMBER'
  | 'MEMBER' | 'USER';

export const ADMIN_ROLES = new Set<UserRole>([
  'SUPER_ADMIN', 'ADMIN', 'COMMUNITY_ADMIN',
]);

export const GUARD_ROLES = new Set<UserRole>([
  'GUARD', 'SECURITY',
]);

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    VIEW_ADMIN, VIEW_ADMIN_DASHBOARD, MANAGE_APPROVALS, MANAGE_FINANCE,
    MANAGE_SECURITY, MANAGE_GOVERNANCE, VIEW_ANALYTICS,
    VIEW_GUARD_DASHBOARD, MANAGE_VISITORS, MANAGE_INCIDENTS,
    VIEW_FEED, VIEW_MARKETPLACE, VIEW_EVENTS, VIEW_SPORTS_MENU,
    VIEW_AMENITIES, VIEW_NOTICES, VIEW_TICKETS, MANAGE_TICKETS,
    VIEW_POLLS, VOTE_POLL, VIEW_EMERGENCY, MANAGE_EMERGENCY,
    VIEW_MAINTENANCE_DUES, MANAGE_BILLING, VIEW_JOBS, VIEW_DISCOVER,
    VIEW_GROUP_BUYING, MANAGE_GROUP_BUYING, VIEW_TRIPS, CREATE_TRIP,
    VIEW_FINANCE_DASHBOARD, MANAGE_SOCIETY_FINANCE,
    VIEW_SPORTS_DASHBOARD, VIEW_EVENT_DASHBOARD,
  ],
  COMMUNITY_ADMIN: [
    VIEW_ADMIN, VIEW_ADMIN_DASHBOARD, MANAGE_APPROVALS,
    MANAGE_GOVERNANCE, VIEW_ANALYTICS,
    VIEW_FEED, VIEW_MARKETPLACE, VIEW_EVENTS, VIEW_SPORTS_MENU,
    VIEW_AMENITIES, VIEW_NOTICES, VIEW_TICKETS, MANAGE_TICKETS,
    VIEW_POLLS, VOTE_POLL, VIEW_EMERGENCY, MANAGE_EMERGENCY,
    VIEW_MAINTENANCE_DUES, MANAGE_BILLING, VIEW_JOBS, VIEW_DISCOVER,
    VIEW_GROUP_BUYING, VIEW_TRIPS,
  ],
  MODERATOR: [
    VIEW_ADMIN, VIEW_ADMIN_DASHBOARD, MANAGE_TICKETS,
    VIEW_FEED, VIEW_MARKETPLACE, VIEW_EVENTS, VIEW_SPORTS_MENU,
    VIEW_AMENITIES, VIEW_NOTICES, VIEW_TICKETS,
    VIEW_POLLS, VOTE_POLL, VIEW_EMERGENCY,
    VIEW_MAINTENANCE_DUES, VIEW_JOBS, VIEW_DISCOVER,
    VIEW_GROUP_BUYING, VIEW_TRIPS,
  ],
  GUARD: [
    VIEW_GUARD_DASHBOARD, MANAGE_VISITORS, MANAGE_INCIDENTS,
    MANAGE_PATROL, RAISE_ALERT, VIEW_EMERGENCY,
  ],
  SECURITY: [
    VIEW_GUARD_DASHBOARD, MANAGE_VISITORS, MANAGE_INCIDENTS,
    MANAGE_PATROL, RAISE_ALERT, VIEW_EMERGENCY,
  ],
  VENDOR: [
    VIEW_VENDOR_DASHBOARD, MANAGE_BOOKINGS, MANAGE_WORK_ORDERS,
    MANAGE_INVOICES, MANAGE_AVAILABILITY,
  ],
  SPORTS_ADMIN: [
    VIEW_SPORTS_DASHBOARD, MANAGE_TOURNAMENTS, MANAGE_MATCHES,
    MANAGE_SPORTS_TEAMS, VIEW_SPORTS_ANALYTICS, MANAGE_LIVE_SCORING,
    MANAGE_VENUES,
  ],
  SPORTS_REFEREE: [
    VIEW_SPORTS_DASHBOARD, MANAGE_MATCHES, MANAGE_LIVE_SCORING,
    VIEW_SPORTS_ANALYTICS,
  ],
  EVENT_ADMIN: [
    VIEW_EVENT_DASHBOARD, MANAGE_EVENTS, MANAGE_EVENT_VENUES,
    MANAGE_REGISTRATIONS, VIEW_EVENT_ANALYTICS, MANAGE_DEPARTMENTS,
    MANAGE_PROSPECTUS,
  ],
  FINANCE_ADMIN: [
    VIEW_ADMIN, MANAGE_FINANCE, VIEW_ANALYTICS,
    VIEW_FINANCE_DASHBOARD, MANAGE_SOCIETY_FINANCE,
    MANAGE_PERSONAL_FINANCE, VIEW_MAINTENANCE_DUES, MANAGE_BILLING,
  ],
  FACILITY_MANAGER: [
    MANAGE_FACILITIES, VIEW_FACILITY_REPORTS, VIEW_AMENITIES,
    MANAGE_BOOKINGS,
  ],
  FOOD_ADMIN: [
    VIEW_FOOD_MENU, MANAGE_FOOD_OPERATIONS, MANAGE_MEAL_PLANS,
  ],
  HELPDESK_AGENT: [
    VIEW_TICKETS, MANAGE_TICKETS, RESOLVE_TICKETS, ASSIGN_TICKETS,
    VIEW_HELPDESK_QUEUE,
  ],
  COMMITTEE_MEMBER: [
    VIEW_COMMITTEE_DASHBOARD, MANAGE_COMMITTEE_TASKS,
    MANAGE_RESOLUTIONS, VIEW_POLLS, VOTE_POLL,
    VIEW_NOTICES, VIEW_EVENTS,
  ],
  MEMBER: [
    VIEW_FEED, VIEW_MARKETPLACE, VIEW_EVENTS, VIEW_SPORTS_MENU,
    VIEW_AMENITIES, VIEW_NOTICES, VIEW_TICKETS, CREATE_TICKET,
    VIEW_POLLS, VOTE_POLL, VIEW_EMERGENCY, TRIGGER_SOS,
    VIEW_GROUP_BUYING, JOIN_GROUP_DEAL, VIEW_TRIPS, BOOK_TRIP,
    VIEW_DISCOVER, VIEW_MAINTENANCE_DUES, PAY_MAINTENANCE_DUES,
    VIEW_JOBS, VIEW_HOME_SERVICE, REGISTER_EVENT, VIEW_EVENT_GALLERY,
    VIEW_FOOD_MENU, MANAGE_PERSONAL_FINANCE,
  ],
  USER: [
    VIEW_FEED, VIEW_MARKETPLACE, VIEW_EVENTS,
    VIEW_NOTICES, VIEW_TICKETS, CREATE_TICKET,
    VIEW_EMERGENCY, TRIGGER_SOS,
  ],
};
