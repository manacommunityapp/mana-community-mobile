# Mobile Recharge — Remaining Gaps

Last reviewed: 2026-10-28

## What is now fixed

- The mobile client no longer creates local/fake recharge transactions when the
  API is unavailable.
- The server validates the mobile number, prepaid-only mode, operator, plan ID
  and amount before creating a payment handoff reference.
- Plan descriptions are returned consistently to the mobile client.
- The screen no longer claims a successful recharge, automatic operator queue,
  cashback ledger credit, BBPS partnership or automatic refund.
- The number field no longer starts with a demo resident number.
- DTH, FASTag and electricity tabs now explain that their live flows are not
  connected instead of pretending to be mobile recharge flows.

## Still required for production

### 1. Telecom aggregator integration (P0)

The service still exposes a small static plan catalogue. Replace it with a
provider such as a licensed recharge aggregator/BBPS integration that supports:

- current operator and circle discovery;
- live prepaid plans and postpaid bill fetch;
- recharge execution after successful payment;
- provider reference IDs and provider status;
- operator-specific errors, retry rules and idempotency.

### 2. Payment order and verification (P0)

`POST /api/v1/recharge/initiate` currently creates a validated payment handoff
reference and UPI intent URL. It does not create a Cashfree/Razorpay order,
verify a payment callback, or prove that the telecom recharge was paid.

Add:

- server-created payment order/session;
- webhook signature verification;
- payment-to-recharge state machine;
- safe retry and idempotency keys;
- payment timeout and reconciliation jobs.

### 3. Persistence, history and receipt (P0)

Persist every recharge attempt with user, mobile, operator, circle, plan,
amount, payment reference, provider reference, status timestamps and failure
reason. Add authenticated endpoints for history, detail, receipt and support.

### 4. Refund and support handling (P1)

Implement payment-debited/provider-failed reconciliation, refund initiation and
refund status. Provide a support action from the recharge detail screen.

### 5. Postpaid and utility flows (P1)

Postpaid currently remains disabled in the UI. Add bill fetch, due date, amount
confirmation and bill payment. Implement separate DTH, FASTag and electricity
flows rather than reusing the mobile recharge screen.

### 6. Operator discovery and saved numbers (P2)

The current operator suggestion is only a prefix heuristic and cannot account
for number portability. Add provider-backed detection/confirmation. Replace
the removed demo contact list with authenticated saved recharge numbers or a
native contacts integration with explicit permission.

### 7. Promotions and scheduled recharge (P2)

Only show fees, cashback, coupons, expiry reminders or scheduled/queued recharge
when backed by a server ledger and operator capability. These are intentionally
not displayed as active promises today.

## Current user-facing behavior

The app can display the server's current plan catalogue and hand a validated
amount to a UPI app. After the handoff, it explicitly tells the user that Mana
has not confirmed the recharge. It must not be presented as production-ready
until payment verification and telecom execution are connected.
