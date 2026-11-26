# Mana Community — Mobile App

React Native (Expo) mobile app for Android & iOS.  
Connects to the same Spring Boot backend used by the web app.

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Framework    | React Native 0.88.0 + Expo SDK 58   |
| Navigation   | Expo Router 58 (file-based)         |
| State        | Zustand + TanStack Query            |
| HTTP Client  | Axios with JWT auto-refresh, idempotency keys, correlation IDs |
| WebSocket    | @stomp/stompjs (same as web)        |
| Secure Store | expo-secure-store (replaces localStorage) |
| Offline      | AsyncStorage request queue with NetInfo-triggered sync |
| Build & Ship | EAS Build + EAS Submit              |

---

## Validation

Run the complete local validation pipeline with:

```sh
npm ci
npm run validate
```

`npm test` runs both the Node `.mjs` suite and the TypeScript Jest suite. `npm run validate` also runs TypeScript checking, Expo dependency validation, linting, and an Android production bundle export. GitHub Actions runs those checks as separate steps for pushes to `main`/`master` and pull requests, so a failing check does not hide the results from later checks.

The Android export validates Metro bundling; it does not produce a signed installable app. Device end-to-end coverage for sign-in, payment status, booking, visitor approval, and offline recovery still needs a configured test backend, seeded test accounts, and a native device/emulator runner.

---

## Navigation Structure

Five root tabs with a Discover hub containing 12 category tiles:

```
Home          — Personalised dashboard: upcoming activities, payments due, announcements
Discover      — 12-category hub
  ├── Community     Events, Forum, Governance, Polls, Notices
  ├── Sports        Tournaments, Live Scores, Court Booking, Coaching
  ├── Marketplace   Buy/Sell, Auctions, Deals, Group Buying
  ├── Food          Delivery, Fresh Kitchen, Daily Basket
  ├── Grocery       Bazaar, Wellness Basket
  ├── Health        Diagnostics, Referrals, Prescriptions, Caregiver
  ├── Services      Home Services, Interiors, Procurement
  ├── Rides         Commute, Mobility, School Bus
  ├── Trips         Experiences, Travel, Vehicle Care
  ├── Security      Guard Management, Visitors, Access Control
  ├── Academy       Courses, Certifications, Job Board
  └── Finance       Payments, Investments, Insurance, Loans
Pay           — UPI, QR Scan & Pay, Split Bill, Recharge
Bookings      — Universal Activity Centre: all orders, bookings, registrations
My Profile    — Profile, Settings, Privacy Dashboard, Notifications
```

---

## Project Structure

```
mana-community-mobile/
├── app/
│   ├── _layout.tsx              # Root layout — auth guard, QueryClient, TenantProvider
│   ├── index.tsx                # Redirect to onboarding/tabs
│   ├── auth/                    # Login, Register, Forgot Password
│   ├── onboarding/              # Multi-step onboarding flow
│   ├── tabs/                    # Bottom tab navigator (5 tabs)
│   │   ├── _layout.tsx
│   │   ├── home.tsx             # Personalised home screen
│   │   ├── discover.tsx         # 12-category discovery hub
│   │   ├── pay.tsx              # Payments hub
│   │   ├── bookings.tsx         # Universal activity centre
│   │   └── profile.tsx          # Profile + settings
│   ├── activity.tsx             # Universal Activity Centre
│   ├── academy/                 # Courses, certifications, jobs
│   ├── access/                  # Access control
│   ├── admin/                   # Admin panel (role-guarded)
│   ├── ai-chat/                 # AI assistant
│   ├── amenity/                 # Amenity booking
│   ├── auction/                 # Live auction
│   ├── automation/              # Automation rules
│   ├── bazaar/                  # Grocery bazaar
│   ├── bbps/                    # Bill payment
│   ├── calendar/                # Universal calendar
│   ├── chat/                    # Conversations + rooms
│   ├── commerce/                # E-commerce
│   ├── community/               # Community management
│   ├── commute/                 # Commute & rides
│   ├── cpn/                     # Community Professional Network
│   ├── cpos/                    # Community POS
│   ├── daily-basket/            # Subscription grocery
│   ├── deals/                   # Deals & offers
│   ├── discover/                # Category tiles
│   ├── documents/               # Document vault
│   ├── emergency/               # Emergency SOS (real API)
│   ├── events/                  # Events + RSVP
│   ├── experiences/             # Experiences & trips
│   ├── facilities/              # Facility booking
│   ├── fd/                      # Fixed deposits
│   ├── finance/                 # Finance & maintenance
│   ├── food/                    # Food delivery
│   ├── forum/                   # Community forum
│   ├── fresh-kitchen/           # Subscription meals
│   ├── gold/                    # Digital gold
│   ├── governance/              # Governance & AGM
│   ├── group-buying/            # Group purchase
│   ├── guard/                   # Guard management
│   ├── health/                  # Health records
│   ├── healthcare/              # Healthcare ops
│   ├── healthcare-ops/          # Healthcare operations (tabs)
│   ├── healthguard/             # Health monitoring
│   ├── helpdesk/                # Helpdesk & tickets
│   ├── home-services/           # Home services booking
│   ├── hrm/                     # HR management
│   ├── insurance/               # Insurance
│   ├── intelligence/            # Community intelligence
│   ├── interiors/               # Interior design services
│   ├── inventory/               # Inventory management
│   ├── iot/                     # IoT devices
│   ├── jobs/                    # Job board
│   ├── kitty-party/             # Kitty party / chit fund
│   ├── loans/                   # Loans
│   ├── marketplace/             # Buy/Sell listings
│   ├── mobility/                # Mobility services
│   ├── movies/                  # Movie bookings
│   ├── mutual-funds/            # Mutual fund investments
│   ├── notifications/           # Universal notifications centre
│   ├── offers/                  # Offers & coupons
│   ├── onboarding/              # KYC + community invite flow
│   ├── ops/                     # Operations management
│   ├── parking/                 # Parking management
│   ├── payments/                # Payments + UPI
│   ├── personal-finance/        # Personal finance tracker
│   ├── pets/                    # Pet services
│   ├── polls/                   # Polls & voting
│   ├── privacy/                 # Privacy dashboard (DPDP)
│   ├── procurement/             # Procurement
│   ├── profile/                 # User profile + edit
│   ├── projects/                # Society projects
│   ├── recharge/                # Mobile/DTH recharge
│   ├── safety/                  # Safety & alerts
│   ├── scan-and-pay/            # QR scan & pay
│   ├── school-bus/              # School bus tracking
│   ├── send-money/              # Peer-to-peer transfers
│   ├── services/                # Services hub
│   ├── settings/                # App settings
│   ├── sports/                  # Sports hub
│   ├── sports-admin/            # Sports administration
│   ├── sports-ops/              # Sports operations
│   ├── staff/                   # Staff management
│   ├── trips/                   # Trips & travel
│   ├── upi-history/             # UPI transaction history
│   ├── vehicle-care/            # Vehicle maintenance
│   ├── vendor/                  # Vendor management
│   ├── visitors/                # Visitor management + QR passes
│   └── wellness/                # Wellness & fitness
├── services/
│   ├── apiClient.ts             # Axios + JWT refresh + idempotency + X-Correlation-ID
│   ├── requestQueue.ts          # AsyncStorage offline queue (3-retry, NetInfo sync)
│   ├── authService.ts
│   ├── privacyService.ts        # DPDP consent + rights requests + health access log
│   └── ...                      # Per-domain services
├── hooks/
│   ├── useAuth.ts               # Zustand auth store
│   ├── useWebSocket.ts          # STOMP WebSocket with exponential backoff
│   ├── useRequestQueue.ts       # pendingCount + NetInfo reconnect
│   ├── useConsent.ts            # Purpose-specific consent check
│   ├── useRateLimitHandler.ts   # 429 countdown + isLimited
│   └── ...
├── context/
│   ├── TenantContext.tsx        # JWT-decoded communityId — never trusts AsyncStorage alone
│   └── ...
├── components/
│   ├── ErrorBoundary.tsx        # Class boundary + correlationId clipboard copy
│   ├── ApiErrorBanner.tsx       # Slide-down banner, auto-dismiss 5s
│   ├── PendingSyncBanner.tsx    # Animated amber banner for queued writes
│   ├── privacy/ConsentGate.tsx  # Renders children if consented, prompts otherwise
│   ├── security/RateLimitBanner.tsx
│   └── websocket/ConnectionStatusBadge.tsx
├── security/
│   ├── inputValidation.ts       # Zod schemas for all user inputs
│   ├── fileValidation.ts        # MIME type, size, safe filename validation
│   ├── errorHandler.ts          # Safe error messages, sensitive info filtering
│   ├── secureLogger.ts          # Production-safe logging with key redaction
│   └── useAdminGuard.ts         # Role-based route protection
├── utils/
│   ├── security.ts              # validateEnvConfig(), assertNoLocalhostInProd(), isValidDeepLink()
│   └── clientLogger.ts          # Structured logger with Sentry/Datadog stub
├── types/
│   └── api.ts                   # TypeScript DTOs (mirrors Spring Boot responses)
├── constants/
│   └── config.ts                # API URLs, theme colours
├── app.json                     # Expo configuration
└── eas.json                     # EAS Build configuration
```

---

## 1 — Local Development Setup

### Prerequisites
- Node.js 22+
- Expo Go app on your phone (iOS / Android) — [expo.dev/go](https://expo.dev/go)
- Or: iOS Simulator (Mac + Xcode) / Android Emulator (Android Studio)

### Install

```bash
npm install
```

### Configure API URL

Edit `constants/config.ts`:

```ts
const DEV_API_URL = 'http://YOUR_LOCAL_IP:8082';
// e.g. 'http://192.168.1.42:8082'
```

> Use your machine's local IP, not `localhost` — phones can't reach localhost.  
> Find it with: `ipconfig` (Windows) or `ifconfig | grep inet` (Mac/Linux)

### Run

```bash
npm start          # Opens Expo dev tools — scan QR with Expo Go
npm run ios        # iOS Simulator (Mac only)
npm run android    # Android Emulator
```

---

## 2 — Backend CORS (Spring Boot)

Add your local IP and production mobile origin to Spring Boot's CORS config:

```java
// SecurityConfig.java or CorsConfig.java
configuration.setAllowedOrigins(List.of(
  "https://manacommunity.in",          // web prod
  "http://192.168.1.42:8082",          // mobile dev (your local IP)
  "capacitor://localhost",             // Capacitor origin if used
  "https://localhost"                  // Expo Go
));
```

---

## 3 — Building for App Stores (EAS)

### One-time EAS setup

```bash
npm install -g eas-cli
eas login
eas build:configure   # generates eas.json, links to Expo account
```

### Build

```bash
# Android APK (internal testing)
eas build --platform android --profile preview

# iOS TestFlight
eas build --platform ios --profile production

# Both platforms
eas build --platform all --profile production
```

### Submit to stores

```bash
eas submit --platform android
eas submit --platform ios
```

---

## 4 — Push Notifications (Expo Push + Spring Boot)

### Mobile side — register device token

```ts
import * as Notifications from 'expo-notifications';
import { authService } from '@/services/authService';

const { data: token } = await Notifications.getExpoPushTokenAsync();
await api.post('/users/push-token', { token: token.data, platform: Platform.OS });
```

### Backend side — send via Expo Push API

```java
// POST https://exp.host/--/api/v2/push/send
// { "to": "ExponentPushToken[xxx]", "title": "...", "body": "..." }
```

---

## 5 — Environment Variables

Create `.env` (not committed — already in .gitignore):

```env
EXPO_PUBLIC_API_URL=https://api.manacommunity.in
EXPO_PUBLIC_WS_URL=wss://api.manacommunity.in/ws
```

Access in code: `process.env.EXPO_PUBLIC_API_URL`

---

## Screens & Modules

### Core

| Screen / Module       | Status      | Notes                                               |
|-----------------------|-------------|-----------------------------------------------------|
| Login                 | ✅ Done     | JWT + refresh token, safe error messages            |
| Register              | ✅ Done     | Community invite code flow, strong password validation |
| Forgot Password       | ✅ Done     |                                                     |
| Onboarding            | ✅ Done     | Multi-step KYC + community join flow                |
| Community Feed        | ✅ Done     | Infinite scroll, inline polls, Poll FAB             |
| Chat List             | ✅ Done     |                                                     |
| Chat Window           | ✅ Done     | STOMP real-time, typing indicators, message bubbles |
| Notifications         | ✅ Done     | Priority classification, read/unread, quiet hours   |
| Activity Centre       | ✅ Done     | All orders, bookings, registrations in one place    |
| Profile + Edit        | ✅ Done     | Image upload, file validation                       |
| Settings              | ✅ Done     |                                                     |

### Community & Governance

| Screen / Module       | Status      | Notes                                               |
|-----------------------|-------------|-----------------------------------------------------|
| Events + RSVP         | ✅ Done     |                                                     |
| Polls                 | ✅ Done     | Create, vote, animated result bars, live refresh    |
| Forum                 | ✅ Done     |                                                     |
| Governance            | ✅ Done     | No mock fallbacks — errors propagate                |
| Notices               | ✅ Done     |                                                     |
| Calendar              | ✅ Done     | Universal calendar with RRULE, reminders            |
| Documents             | ✅ Done     |                                                     |
| Projects              | ✅ Done     |                                                     |
| Community Admin       | ✅ Done     | Role-guarded, stats, member lifecycle, moderation   |

### Sports

| Screen / Module       | Status      | Notes                                               |
|-----------------------|-------------|-----------------------------------------------------|
| Sports Hub            | ✅ Done     | Tournament list + detail + standings                |
| Match Schedule        | ✅ Done     |                                                     |
| Live Score Room       | ✅ Done     | STOMP real-time                                     |
| Team Registration     | ✅ Done     | Register / unregister / status tracking             |
| Court Waitlist        | ✅ Done     |                                                     |
| Open Play             | ✅ Done     |                                                     |
| Player Ratings        | ✅ Done     |                                                     |
| Coach Packages        | ✅ Done     |                                                     |
| Tournament Merchandise| ✅ Done     |                                                     |
| Sports Admin          | ✅ Done     |                                                     |

### Healthcare

| Screen / Module       | Status      | Notes                                               |
|-----------------------|-------------|-----------------------------------------------------|
| Diagnostics           | ✅ Done     | ConsentGate applied (HEALTH_TREATMENT)              |
| Referrals             | ✅ Done     | ConsentGate applied                                 |
| Caregiver Consent     | ✅ Done     | ConsentGate applied                                 |
| Provider Credentials  | ✅ Done     |                                                     |
| Prescriptions         | ✅ Done     |                                                     |
| Appointment No-Shows  | ✅ Done     |                                                     |
| Health Records        | ✅ Done     |                                                     |
| HealthGuard           | ✅ Done     |                                                     |

### Commerce & Marketplace

| Screen / Module       | Status      | Notes                                               |
|-----------------------|-------------|-----------------------------------------------------|
| Marketplace           | ✅ Done     | Browse, create, wishlist, image upload, report      |
| Auction               | ✅ Done     | Live bidding via STOMP, countdown timer, bid feed   |
| Deals                 | ✅ Done     |                                                     |
| Offers                | ✅ Done     | No fake voucher generation                          |
| Group Buying          | ✅ Done     |                                                     |
| Commerce              | ✅ Done     |                                                     |

### Food & Grocery

| Screen / Module       | Status      | Notes                                               |
|-----------------------|-------------|-----------------------------------------------------|
| Food Delivery         | ✅ Done     |                                                     |
| Fresh Kitchen         | ✅ Done     | Subscription meal plans                             |
| Daily Basket          | ✅ Done     | Recurring grocery subscription                      |
| Bazaar                | ✅ Done     |                                                     |
| Wellness Basket       | ✅ Done     |                                                     |

### Payments & Finance

| Screen / Module       | Status      | Notes                                               |
|-----------------------|-------------|-----------------------------------------------------|
| Payments              | ✅ Done     |                                                     |
| Scan & Pay            | ✅ Done     | QR code scanner                                     |
| Send Money            | ✅ Done     | Peer-to-peer transfers                              |
| Split Bill            | ✅ Done     |                                                     |
| Recharge              | ✅ Done     | Mobile/DTH recharge                                 |
| UPI History           | ✅ Done     |                                                     |
| BBPS                  | ✅ Done     | Bill payment                                        |
| Personal Finance      | ✅ Done     |                                                     |
| Kitty Party / Chit    | ✅ Done     |                                                     |
| Mutual Funds          | ✅ Done     |                                                     |
| Fixed Deposits        | ✅ Done     |                                                     |
| Gold                  | ✅ Done     | Digital gold                                        |
| Insurance             | ✅ Done     |                                                     |
| Loans                 | ✅ Done     |                                                     |

### Security & Access

| Screen / Module       | Status      | Notes                                               |
|-----------------------|-------------|-----------------------------------------------------|
| Visitors              | ✅ Done     | QR gate pass, pre-approval flow                     |
| Access Control        | ✅ Done     |                                                     |
| Guard Management      | ✅ Done     |                                                     |
| Emergency SOS         | ✅ Done     | Wired to real API, contacts from API                |
| Safety                | ✅ Done     |                                                     |
| Parking               | ✅ Done     |                                                     |
| IoT                   | ✅ Done     |                                                     |
| Automation            | ✅ Done     |                                                     |

### Services & Mobility

| Screen / Module       | Status      | Notes                                               |
|-----------------------|-------------|-----------------------------------------------------|
| Home Services         | ✅ Done     |                                                     |
| Interiors             | ✅ Done     |                                                     |
| Pets                  | ✅ Done     |                                                     |
| Vehicle Care          | ✅ Done     |                                                     |
| Vehicles              | ✅ Done     |                                                     |
| Commute               | ✅ Done     |                                                     |
| Mobility              | ✅ Done     |                                                     |
| School Bus            | ✅ Done     | GPS tracking                                        |
| Movies                | ✅ Done     |                                                     |
| Experiences           | ✅ Done     |                                                     |
| Trips                 | ✅ Done     |                                                     |
| Amenity Booking       | ✅ Done     |                                                     |
| Facilities            | ✅ Done     |                                                     |
| Packages              | ✅ Done     | Parcel tracking                                     |

### Professional & Staff

| Screen / Module       | Status      | Notes                                               |
|-----------------------|-------------|-----------------------------------------------------|
| Jobs / Job Board      | ✅ Done     |                                                     |
| Academy               | ✅ Done     | Courses, certifications — no fake enrollment tokens |
| CPN                   | ✅ Done     | Community Professional Network — no fake referrals |
| Staff Management      | ✅ Done     |                                                     |
| HRM                   | ✅ Done     |                                                     |
| Procurement           | ✅ Done     |                                                     |
| Inventory             | ✅ Done     |                                                     |
| CPOS                  | ✅ Done     | Community POS — no fake NOC approvals               |
| Vendor                | ✅ Done     |                                                     |
| Vendor Finance        | ✅ Done     |                                                     |
| Ops                   | ✅ Done     |                                                     |
| Sports Admin          | ✅ Done     |                                                     |
| Event Admin           | ✅ Done     |                                                     |

### Intelligence & Wellbeing

| Screen / Module       | Status      | Notes                                               |
|-----------------------|-------------|-----------------------------------------------------|
| AI Chat               | ✅ Done     |                                                     |
| Intelligence          | ✅ Done     | Community analytics                                 |
| Wellness              | ✅ Done     |                                                     |
| Helpdesk              | ✅ Done     |                                                     |

---

## Offline Mode

The app uses a write queue backed by AsyncStorage for safe offline operation:

- **Writes are queued** when offline and replayed on reconnect (NetInfo-triggered)
- **3-retry max** per request with exponential backoff
- **PendingSyncBanner** shows an amber indicator when writes are queued
- **Critical constraint**: offline mode **never** marks an unconfirmed booking, payment, or security action as successful — these always show as "pending confirmation" until the server responds

---

## Privacy & Consent (DPDP)

The app implements Digital Personal Data Protection compliance:

- **ConsentGate** component wraps sensitive screens — renders content only when consent is granted for the relevant purpose (HEALTH_TREATMENT, HEALTH_RESEARCH, etc.)
- **Privacy Dashboard** (`/privacy`) with three tabs: Consent Management, Rights Requests, Health Access Log
- **Consent is purpose-specific and independently revocable** per DPDP requirements
- **Health data access** is logged with `Propagation.REQUIRES_NEW` (survives rollback)
- **Health Data Isolation Guard** prevents health records appearing in community feeds or vendor discovery

---

## Security Architecture

| Layer             | Implementation                                              |
|-------------------|-------------------------------------------------------------|
| Tenant security   | JWT claims are authoritative — `X-Community-ID` header is derived from JWT only |
| Rate limiting     | Redis-backed distributed limits with graceful in-memory fallback |
| WebSocket         | Topic registry with fail-closed authorization; 5-connection limit per user; 60 msg/min |
| Input validation  | Zod schemas for all user inputs with HTML entity sanitization |
| File uploads      | MIME type, size limits, safe filename generation            |
| Error messages    | Safe user-facing messages; stack traces never exposed       |
| Admin routes      | Role-guarded (`useAdminGuard`) — SUPER_ADMIN/ADMIN/COMMUNITY_ADMIN |
| Production safety | `validateEnvConfig()` + `assertNoLocalhostInProd()` on startup |
| Deep links        | Allowlist-based validation (`isValidDeepLink()`)            |
| Logging           | `secureLog` with key redaction; no-ops in production        |

See `SECURITY_AUDIT.md` for the full audit report.

---

## Remaining Features

| Feature                     | Status         |
|-----------------------------|----------------|
| Dark mode                   | 🔜 Not built   |
| CI/CD (GitHub Actions + EAS)| 🔜 Not built   |
| App Store submission        | 🔜 Not built   |
| Certificate pinning         | 🔜 Needs native module (see SECURITY_AUDIT M8) |
| App integrity attestation   | 🔜 Needs native module (see SECURITY_AUDIT L4) |
