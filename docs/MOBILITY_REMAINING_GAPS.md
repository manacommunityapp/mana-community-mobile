# Mana Mobility — Remaining Gaps

Last reviewed: 2026-10-27

The core mobility booking, carpool, airport/group-journey, driver onboarding,
document review, matching, waitlist, proposal, booking lifecycle and foreground
driver-location flows are connected to the service API.

## Remaining production gaps

### P0 — Real map and background tracking

- The passenger tracking screen still uses a lightweight vector illustration.
- It displays live driver coordinates, but a real map provider, route polyline,
  camera-follow behavior and marker animation are not configured.
- Driver GPS publishing currently runs while the approved driver is online and
  the app is in the foreground. Background location/task handling is still
  required for reliable tracking when the app is suspended.

### P1 — Service-zone operations

- `GET /api/mobility/service-zones` is database-backed and community-scoped.
- The service-zone table still needs seed data for each community.
- Admin create/update/disable screens and geo-fence enforcement for pickup and
  destination coordinates are not yet implemented.
- Driver onboarding does not yet assign drivers to selected service zones.

### P1 — Payments

- Cash booking is supported end to end.
- Online checkout (UPI/card/wallet), payment confirmation webhooks, settlement,
  cancellation refunds and payment receipts still need to be wired into the
  mobile booking flow.

### P1 — Journey automation and matching quality

- Recurring slots create demand requests but do not automatically create and
  reserve recurring ride instances.
- Generic matching uses hub/area/time/luggage constraints; route geometry,
  detour limits and distance optimization are still needed.
- Cross-community matching and safeguarding/consent workflows for school travel
  are not implemented.

### P2 — Operations and reporting

- Mobility operations has active-trip and document-review views.
- Revenue, utilization, cancellation, driver SLA and settlement analytics are
  still pending.
- In-app document preview is not available; the current action opens the stored
  file URL externally.

## Validation notes

- Mobile mobility TypeScript checks pass.
- The service mobility sources have no remaining mobility compilation errors.
- The full service compile is currently blocked by pre-existing, unrelated
  `JewelleryServiceImpl` repository method mismatches.
