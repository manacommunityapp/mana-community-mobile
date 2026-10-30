# Mana Vendor Platform: Product and End-to-End Implementation Plan

**Status:** Proposed plan based on the mobile repository's `feat/sports-vendor-parity-and-api-fixes` branch and the web application's fetched `develop` ref (`b1fd413`). This document is a product and engineering plan; it does not claim that live backend flows have been verified.

## 1. Product direction

Mana should provide one vendor account and business model that can enable several business capabilities. Do not create a separate login/identity system for every vendor category. A business may be a service provider and retailer at once, or a sports operator with venues, classes and event listings.

Build a shared Vendor Workspace shell, then show domain-specific workspaces according to the vendor's approved capabilities:

- **Web Vendor Console:** business setup, catalog, schedules, finance, staff and analytics.
- **Mobile Vendor App:** time-sensitive work: new orders/bookings, job status, QR/check-in, delivery/pickup, messages and payout summaries.
- **Mana Operations Console:** application review, verification, category/capability setup, exceptions, disputes, suspensions and audit.
- **Resident/Buyer surfaces:** discovery, comparison, booking/order checkout, tracking, support and reviews. These stay distinct from vendor controls.

Use a capability-driven navigation model. For example, a grocery merchant sees Store, Catalog, Inventory, Orders and Settlements. A plumber sees Services, Availability, Bookings and Work Orders. A sports operator sees Facilities, Slots, Sports Bookings and Coaching. Shared items (profile, staff, documents, notifications and help) remain available to all eligible vendors.

## 2. What the repositories already contain

### Web app (`mana-community-app`, `develop`)

- Vendor application and status UI at `/vendor-apply`; an admin registration review flow exists under `/vendor-admin/registrations`.
- Vendor admin surfaces for dashboard, directory, categories, work orders, contracts, payments, analytics and commerce administration.
- Vendor self-service routes for dashboard, services, bookings, availability, documents, payments, business profile, products, inventory and settlements.
- Sports vendor pages for venues, calendars, bookings, prices, coaching, memberships, events, suppliers, intelligence and multiple branches.
- Commerce flows for products, grocery orders, orders, offers, commerce analytics and settlements.
- Resident marketplace pages for discovery, vendor profiles, booking, resident bookings and favorites.
- Permission constants distinguish vendor management from commerce capabilities.

### Mobile app (`mana-community-mobile`, current feature branch)

- A vendor portal guarded for `VENDOR` and `SPORTS_VENDOR` roles.
- Five primary tabs: Dashboard, Bookings, Jobs/Work Orders, Payments and Profile.
- Additional routes for availability, documents, products, inventory, deals, deal fulfillment manifests, demand bidding, settlements and analytics.
- Separate resident health, home services, food/grocery, group buying, sports, events and mobility modules provide consumer-side entry points.

### Verified design gaps to address first

1. Web navigation links to `/vendor-portal/verification`, and a verification component is imported, but the route is not registered in `routes.tsx`.
2. Web's vendor portal shell is guarded by `VIEW_VENDOR_MANAGEMENT`. The permission defaults grant this to resident/basic and some operational roles as well as vendors. Split consumer access from vendor self-service access, and enforce vendor membership on the API.
3. The mobile vendor API layer still includes preview/sample fallbacks. Some mutation methods swallow request failures, which can make a failed live operation look successful. Keep demo mode explicit; in live mode show the API error and do not report a false success.
4. Mobile derives vendor IDs from the user but can still fall back to a demo ID. Resolve a server-issued vendor membership before enabling vendor screens; do not use a demo identity in production.
5. Commerce pages require COMMERCE module/permissions in addition to a vendor role. Onboarding must provision a business, modules and permissions consistently.
6. Vendor application and admin review are web-only in the reviewed routes. Mobile needs an applicant status view and deep links/notifications for review outcomes, even if initial application submission stays web-first.
7. The web has a wider sports-business workspace than mobile. Align the operator's critical daily flows (venues, slots, bookings, coaching and event check-in) across both surfaces.

## 3. Vendor types and capability packages

Treat the rows below as capability packages attached to a vendor organization, not as mutually exclusive identity roles.

| Vendor type | Capabilities and workflow | Essential pages |
|---|---|---|
| **Community service provider** (plumbing, electrical, cleaning, appliance repair, pest control) | Service radius, rates, working hours, booking acceptance, visit/job lifecycle, completion evidence, invoice, rating | Services, Availability, Booking Inbox, Job Detail, Work Orders, Invoices, Reviews |
| **Retail / marketplace seller** | SKUs, variants, tax/price, stock, multi-location inventory, customer orders, pickup/delivery, returns | Store, Catalog, Inventory, Orders, Fulfillment, Returns/Disputes, Settlement |
| **Grocery / food merchant** | Store hours, catalog/menu, item availability, preparation times, order SLA, substitutions, pickup/delivery and food-safety documents | Store Setup, Menu/Catalog, Live Orders, Order Detail, Availability, Food Compliance, Payouts |
| **Sports venue / coach / organizer** | Facilities/courts, capacity, schedules, pricing, bookings, roster/membership, events and check-in | Venue Manager, Slot Calendar, Pricing, Booking Queue, Coaching, Memberships, Events, Check-in, Branches |
| **Supplier / distributor** | Supplier verification, product/capacity catalog, buyer RFQs, quote versions, purchase orders, delivery receipt and receivables | Supplier Profile, RFQ Inbox, Quote Builder, Purchase Orders, Delivery, Invoices, Payments |
| **Facilities / maintenance contractor** | Trade coverage, service contract, estimate, assignment, SLA, visit, work evidence, asset history and invoice | Contracts, Work Orders, Schedule, Job Detail, Evidence, Invoices, Performance |
| **Healthcare provider** (doctor, clinic, hospital, diagnostic lab, pharmacy, homecare) | Credentialing, specialties/services, licensed locations, appointment/slot management, referral/order queues, consent-aware records, fulfillment and claims/payment reconciliation | Provider Setup, Credentials, Locations, Schedule, Appointment/Order Inbox, Clinical/Diagnostic Work Queue, Pharmacy Fulfillment, Payouts, Support |
| **Mobility operator / driver** | Driver and vehicle documents, service region, availability/online state, trip dispatch/acceptance, safe-trip lifecycle, fare/earnings ledger | Driver Onboarding, Vehicle, Availability, Trip Inbox, Active Trip, Safety/Incident, Earnings, Documents |
| **Event exhibitor / stall vendor / sponsor** | Event-specific application, category eligibility, booth/stall inventory, fees, staff/badges, event documents, lead capture and event settlement | Event Directory, Stall Application/Booking, Booth Profile, Booth Team, QR/Lead Scanner, Event Orders, Settlement |

**Scope note:** The repository already models healthcare, food, sports, events and mobility for residents/operators in some form. That does not mean the corresponding vendor management workflow exists end to end. Build provider/partner workspaces only for domains Mana will operate directly; for external services such as flight booking, integrate via a partner API and settlement/commission model instead of inventing a fake supplier portal.

## 4. Target information architecture

### Vendor workspace navigation

1. **Home** — tasks requiring attention, today's bookings/orders/jobs, readiness checklist, earnings/payout summary, service health.
2. **Business** — organization, public profile, locations/branches, service area, operating hours, contacts, tax and payout details.
3. **Offerings** — capability-specific services, products, menus, venues, events or supplier catalog. Draft/review/publish status must be clear.
4. **Operations** — a unified inbox with type filters (booking, commerce order, work order, RFQ, trip, event) and a type-specific detail screen/action set.
5. **Availability & resources** — staff rosters, time slots, venue/resource calendars, capacity and temporary closures.
6. **Inventory & procurement** — stock, variants, reorder thresholds, purchase requests and deliveries for applicable vendors.
7. **Customers / CRM** — customer context and communication history, masked contact details where appropriate, notes and follow-up tasks. Healthcare records must not be placed in a general CRM.
8. **Money** — invoices, commissions/fees, refunds/adjustments, payout ledger, settlement requests, bank account status, reconciliation and downloadable reports.
9. **Trust & support** — KYC/credential status, expiring documents, ratings, disputes, complaints, policy notices and help tickets.
10. **Team & access** — members, invitations, role assignment and location/capability scopes.
11. **Insights** — bookings/orders, conversion, fulfillment SLA, cancellations, stockouts, customer feedback and earnings; only show metrics backed by real data.

### Mobile priorities

Mobile home should foreground the next actionable job: accept/reject, start/complete, prepare/ready, dispatch, check in, or answer an RFQ. Keep full catalog editing, finance exports, business administration and analytics available but secondary. Provide push/deep links to the correct transaction detail and preserve the current filter/context after an action.

## 5. Domain model and access model

### Core entities

- `VendorOrganization`: legal/business identity, owner, lifecycle status, verification status and timestamps.
- `VendorMembership`: user, organization, membership state, role and scoped permissions.
- `VendorCapability`: capability code, category, activation state, required onboarding checks and supported transaction types.
- `VendorLocation`: store/clinic/venue/branch, address, timezone, service area, contact, opening hours and location-specific capabilities.
- `VendorDocument` / `VerificationCase`: document type, secure file reference, issuer/expiry, review decisions, rejection reason and audit history.
- `Offering`: a common published/draft envelope with capability-specific detail entities such as `ServiceOffering`, `Product`, `MenuItem`, `VenueResource`, `SportsProgram`, `SupplierItem` or `EventBooth`.
- `AvailabilityResource`: staff, service slots, courts/rooms, inventory/capacity and blackout periods.
- `VendorTransaction`: shared identity, owner organization, type, customer/buyer, status, amount, location and event history; type-specific records hold domain data.
- `LedgerEntry` / `Settlement`: immutable gross/fee/tax/refund/net records, payout status, provider references and reconciliation state.
- `SupportCase` / `AuditEvent`: user-visible help and complete actor/action history.

### Authorization layers

Use three checks on every route and API request:

1. **Platform role:** `RESIDENT`, `VENDOR`, `SPORTS_VENDOR`, `COMMUNITY_ADMIN`, `FINANCE_ADMIN`, `SUPPORT`, etc.
2. **Vendor membership role:** `OWNER`, `BUSINESS_ADMIN`, `OPERATIONS`, `CATALOG_MANAGER`, `FINANCE`, `STAFF`, `READ_ONLY`.
3. **Scope/capability:** organization ID, allowed locations and permissions such as `orders.read`, `orders.fulfill`, `catalog.publish`, `settlement.read`, `settlement.request`, `verification.review`.

An admin permission to manage vendor records must not grant access to the vendor's self-service account. A customer booking permission must not open the vendor console. The API must derive organization scope from the authenticated membership rather than trusting a client-provided `vendorId`.

## 6. Canonical workflows and state machines

### Vendor lifecycle

`Draft application → Submitted → In review ↔ More information requested → Approved → Verification complete → Capability configured → Active → Suspended/Closed`

Rejection must carry a reason and allow resubmission. Approval alone must not silently activate capabilities whose licenses, payout information or category-specific checks are incomplete. Expiring credentials should transition the affected capability to `ACTION_REQUIRED` or `PAUSED`, without deleting historical transactions.

### Offering lifecycle

`Draft → Validation → Review (where needed) → Published → Paused/Out of stock → Archived`

Record who changed price, tax, availability and publish state. Customers must not be able to buy/book an unpublished or unavailable offering.

### Transaction workflows

- **Service booking:** requested → accepted/rejected → scheduled → in progress → completed → invoiced/paid → reviewed; support reschedule, cancellation, no-show and dispute.
- **Retail/food order:** placed/paid or payment-pending → accepted/rejected → preparing/picking → ready → handed over/dispatched → delivered → completed; support substitution, partial fulfillment, refund and cancellation.
- **Sports booking:** slot held → payment → confirmed → checked in → completed; release expired holds and resolve double-booking atomically.
- **RFQ/PO:** RFQ open → quote submitted/revised → selected/declined → PO issued → acknowledged → partially/fully delivered → received/inspected → billed → paid.
- **Mobility trip:** offered → accepted → driver en route → pickup → in trip → completed; include cancelled, safety incident and fare adjustment paths.
- **Event stall:** application → approved → stall reserved → payment → event-ready → check-in/open → closed → settlement; maintain capacity and stall assignment locks.
- **Payout:** pending balance → eligible → requested/scheduled → processing → paid or failed → reconciled; every state has a provider/bank reference and retry policy.

Every state change must be idempotent, authorization-checked, timestamped, visible to the relevant party, and emitted as an auditable event. Payment callbacks are the source of truth for payment state.

## 7. Integration boundaries

- **Payments (PhonePe/UPI/Cashfree/etc.):** create payment intent server-side, validate signed callbacks, reconcile duplicate/out-of-order events, process refunds, compute fees and expose settlement statements. Never mark an order paid based only on a client redirect.
- **ERP/accounting (Zoho/Vyapar-like):** maintain the Mana ledger as the operational source of truth; add export/sync adapters for invoices, expenses, tax and inventory. Track sync failures and external IDs; avoid two-way silent overwrites.
- **CRM/Khatabook-like:** keep customer follow-up, vendor receivables and credit notes separate from the immutable financial ledger. Support consent and contact masking.
- **Quick commerce/food (Zepto/Zomato-like):** integrate catalog/menu, outlet hours, incoming orders, SLA actions, status sync and cancellations. Use webhooks or polling with replay/reconciliation.
- **Healthcare (MediBuddy/Practo/Health Mitra-like):** credential/clinic verification, appointment availability, reminders, diagnostics/pharmacy workflows, consent and least-privilege access to health information. Start with listing and appointments before records/referrals.
- **Events (Eventify/BookMyStall):** event-specific exhibitor/organizer enrollment, booth/stall capacity, booth staff and QR/lead scanning. Keep event roles scoped to a single event.
- **Sports (CricHeroes-like):** venue scheduling is separate from sports competition management; connect venue slots, tournament events, officials, teams and check-in through IDs and schedules.
- **Mobility (Rapido-like):** driver/vehicle onboarding, safety checks, availability/dispatch, live trip state and earnings. Require separate driver/vehicle capability checks.
- **Travel (Goibibo-like):** treat flight inventory and ticketing as external partner integrations. Mana surfaces should cover search/booking handoff, itinerary, support, refund status and commission reconciliation unless Mana directly owns inventory.

Each external connector needs a contract: authentication/credentials, request mapping, webhook signatures, retry/idempotency, rate limits, reconciliation, observability, support owner and a mock/sandbox mode that cannot be confused with production.

## 8. Delivery roadmap

### Phase 0 — Confirm product scope and close access/data risks

- Name the launch vendor types and first communities; decide which are first-party workflows and which are external integrations.
- Define capability codes, platform roles, membership roles and the permission matrix.
- Fix web route registration for verification and add a true vendor-membership guard to the vendor shell.
- Remove silent success/sample fallback behavior from live vendor mutations; isolate sample mode behind an explicit development flag.
- Confirm server-side organization scoping, upload security, payment callbacks and audit logging before exposing real payouts or healthcare data.

### Phase 1 — Shared vendor foundation and first two types

Launch **community service providers** and **local commerce/grocery merchants** because the repositories already contain service booking and product/order foundations.

- Build application → admin review → vendor membership/capability activation.
- Complete verification, business/location setup, capability checklist and vendor team access.
- Connect real vendor-scoped services for offerings, booking/order inbox, status updates and transactional notifications.
- Add invoices, payment state and settlement ledger; provide admin exceptions and user-readable failures.
- Deliver consistent web/mobile flows for essential daily operations.

### Phase 2 — Sports and event operations

- Align sports venue, schedule, booking, coaching and event workflows between web and mobile.
- Add event organizer/exhibitor/stall packages, stall capacity and payment lifecycle.
- Add supplier RFQ/quote/PO delivery flow, reusing common vendor membership and money entities.

### Phase 3 — Regulated and on-demand providers

- Add healthcare provider onboarding, professional credentialing and least-privilege operational workflows after compliance/security review.
- Add mobility driver and fleet onboarding, dispatch and incident workflows.
- Keep travel inventory behind partner adapters unless Mana becomes the inventory operator.

### Phase 4 — ERP depth and automation

- Add multi-location stock transfers, batch/expiry tracking, purchase receiving, expense capture, accounting exports, CRM follow-up, configurable workflows and advanced insights.
- Add integrations only after transaction ownership and reconciliation rules are agreed.

## 9. End-to-end acceptance criteria

1. An applicant can submit, view status, correct a rejection, and receive a decision notification.
2. Approval creates or links exactly one vendor organization and membership, grants only approved capabilities, and records the reviewer.
3. A vendor cannot enter another vendor's organization, location, booking, order, document, customer or payout by changing a URL or API ID.
4. Each vendor type sees only relevant navigation and required setup checks; unsupported capabilities are not shown as active.
5. A published offering is discoverable to the correct residents; an unavailable, expired or paused offering cannot be booked or ordered.
6. Each transaction can be completed through its normal path and all exception paths: reject, cancel, reschedule, partial fulfill, refund, dispute or provider failure.
7. Financial totals reconcile from transaction through fees/refunds to payout; duplicate/out-of-order webhooks do not duplicate money or state transitions.
8. Failed network mutations stay visibly failed, can be retried safely, and never update the UI as if they succeeded.
9. Web and mobile show the same canonical status and transaction history after refresh/re-login.
10. Admin actions (approve, suspend, capability grant, payout adjustment) are permission-checked and auditable.
11. Healthcare records and event/driver information have domain-specific access and retention rules; general CRM does not expose sensitive records.
12. Analytics reconcile with source transactions and clearly show the reporting period, timezone and excluded/pending amounts.

## 10. Reference patterns to borrow

Use the references for workflow patterns, not as a reason to copy every feature into the first release:

- **MediBuddy / Practo / Health Mitra / Smart Health:** provider onboarding, credentials, locations, schedules, appointment/referral queues and support. MediBuddy explicitly onboards doctors, labs and pharmacies; Practo combines profile, practice management, consultations, reach and feedback. [MediBuddy provider onboarding](https://www.medibuddy.in/health-services/networks/onboard) · [Practo Partner FAQ](https://help.practo.com/practo-partner/faqs-for-practo-partner-for-doctors/)
- **Cal Buddy:** no named Cal Buddy module or integration surfaced in the reviewed repositories. Confirm the specific reference workflow; if it is calendar/scheduling, use the shared resource availability and reservation model instead of creating a disconnected calendar.
- **Zoho ERP/CRM / Vyapar / Expense Manager / Khatabook:** business profile, roles, CRM, catalog, stock, quotes, invoices, expenses and finance reports. Keep operational records connected to a reconcilable ledger. [Zoho Inventory](https://www.zoho.com/us/inventory/) · [Zoho Finance Plus](https://www.zoho.com/in/financeplus/)
- **PhonePe:** reliable payment initiation, payment references, refunds and payout visibility. Keep payment provider state reconciled on the server.
- **Zepto / Zomato:** rapid order intake, store/menu availability, accept/reject, order status and operational SLA. [Zomato Restaurant Partner](https://www.zomato.com/partners/) · [Zomato partner/order terms](https://www.zomato.com/policies/online-ordering/)
- **Eventify / BookMyStall:** event-scoped exhibitor profile, booth/stall, team, lead capture, event check-in and settlement. [Eventify exhibitor portal guidance](https://eventify.io/knowledge-base) · [BookMyStall workflow](https://www.bookmystall.in/how-it-works)
- **CricHeroes:** sports event/competition operations should connect teams, players, match scheduling, scoring and venue bookings rather than being modeled as a generic product catalog.
- **Rapido:** driver onboarding and document checks, flexible availability, trip states, safety incident flow and earnings. [Rapido Captain onboarding](https://www.rapido.bike/become-a-captain)
- **Goibibo:** itinerary and partner booking states, ticket changes/cancellations, support and commission reconciliation; keep live inventory in the partner boundary where appropriate.
- **Group Buying / DiscountMitra / Power2SME:** group demand, RFQ/quotes, threshold pricing, bulk commitments, purchase orders and fulfillment visibility.

## 11. Decisions to make before implementation

1. Which two vendor types are the launch scope: recommended service providers + grocery/local commerce.
2. Is a vendor always a legal business organization, or can an individual service worker start as a one-person vendor and add a business later?
3. Which payment provider owns collection, refunds, commission calculation and payouts for each capability?
4. Are healthcare providers first-party vendors, or listings that hand off into a third-party provider network?
5. Are flight booking and external mobility fulfilled by partners, or will Mana dispatch its own providers?
6. Which workflow remains web-only, and which daily tasks must be possible in mobile at launch?

Resolve these product decisions before implementing new vendor pages. The core navigation, identities and lifecycle should not be built around unconfirmed partner ownership assumptions.
