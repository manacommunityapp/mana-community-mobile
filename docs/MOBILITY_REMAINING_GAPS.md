# Mana Mobility — Implementation & Verification Status

Last reviewed: 2026-11-26

All P0, P1, and P2 mobility production items previously tracked in this document are now implemented across `mana-community-service` and `mana-community-mobile`:

## Completed Capabilities

### P0 — Interactive map & background-resilient tracking
- Added [`LiveRouteMap.tsx`](../components/mobility/LiveRouteMap.tsx) using `react-native-webview` + Leaflet/OSM (with offline SVG/coordinate fallback) for pickup/dropoff pins, service-zone overlay, dashed route & approach polylines, smooth driver marker animation, camera-follow toggle, and route recenter.
- Wired `LiveRouteMap` into [track/[id].tsx](../app/mobility/track/%5Bid%5D.tsx) and [book.tsx](../app/mobility/book.tsx).
- Configured iOS (`NSLocationAlwaysAndWhenInUseUsageDescription`, `UIBackgroundModes: ["location"]`) and Android (`ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `expo-location` plugin flags) in [`app.json`](../app.json) and added background permission requests + `AppState` resume catch-up GPS sync + adaptive accuracy/intervals in [driver/index.tsx](../app/mobility/driver/index.tsx).

### P1 — Service-zone operations
- Flyway `V523` seeds default city-aware service zones for communities lacking zones and adds `service_zone_id` on `mobility_driver` and `mobility_trip`.
- Enforced pickup & dropoff geofence validation on ride requests, preferred zone-aware driver dispatch, driver onboarding zone selection ([onboard.tsx](../app/mobility/driver/onboard.tsx)), and Ops Zone CRUD endpoints + UI ([ops/index.tsx](../app/mobility/ops/index.tsx)).

### P1 — Payments
- Wired `MOBILITY_TRIP` and `MOBILITY_CARPOOL` into server-derived `PaymentAmountResolver`, `CashfreePaymentService`, `RazorpayPaymentService`, SQS `PaymentEventsSqsHandler`, and `MobilityPaymentCallbackService`.
- Re-enabled Cashfree UPI/Card/Wallet alongside Cash in [book.tsx](../app/mobility/book.tsx), added online payment + receipt modal + refund banner in [track/[id].tsx](../app/mobility/track/%5Bid%5D.tsx), 10% online platform fee split, `PaymentReceipt` issuance, cancellation refunds, and driver `pendingSettlement` / `settledEarnings` tracking + ops settlement endpoint.

### P1 — Journey automation & matching quality
- `MobilityJourneyMatchingScheduler` automatically generates recurring slot `MobilityCarpoolOffer` instances without duplicates (enforced by unique `(source_slot_id, scheduled_date)`) and fulfills matching `autoReserve` requests.
- Added Haversine route detour computation, `maxDetourKm` filtering/ranking, optional `allowCrossCommunity` matching, and mandatory `SCHOOL` guardian contact + guardian consent approval workflow across request, offer, slot, and booking views.

### P2 — Operations & reporting
- Added `/api/mobility/ops/analytics` and the Ops Analytics dashboard tab (gross/online/cash revenue, platform fee, refunds, settlement totals, cancellation rate, driver rating/SLA duration, and carpool seat utilization).
- Replaced external-only document links in [ops/index.tsx](../app/mobility/ops/index.tsx) with an in-app Document Preview modal (image + WebView viewer with optional external open).

## Latest Verified Checks (2026-11-26)
- `mana-community-service`: full `.\mvnw.cmd -o test` passed (**160/160**, 0 failures, 0 errors, 0 skipped), including `MobilityCompleteFeaturesTest`, `RazorpayPaymentServiceTest`, `SqsIntegrationTest`, and `FlywayMigrationValidationTest`.
- Database schema alignment: Flyway migration `V523` applied cleanly to local PostgreSQL 17.9 and Hibernate `ddl-auto: validate` (`EntityManagerFactory`) initialized cleanly during `local` profile startup.
- `mana-community-mobile`: `npx tsc --noEmit` exited with 0 errors; `npm run test:node` passed (**200/200**). Pre-existing Jest failures in `__tests__/services/groupBuyingService.test.ts` and `__tests__/services/homeServicesService.test.ts` are unrelated to mobility.
