# 🛡️ Mana Insurance Hub — Architecture & Compliance Guide

## 1. Overview & Regulatory Positioning

The **Mana Insurance Hub** is a community-first insurance discovery, policy management, renewal tracking, and claims assistance platform inspired by the transparency of Policybazaar.

### Key Regulatory Principle
> **Mana is not an insurer, insurance broker, or corporate agent.**
> Mana operates strictly as an **unregulated technical service provider and referral facilitator**.

- **No Quoting Fabrication**: Mana never fabricates premiums, quotes, or claim settlement ratios (CSR). Quotes are only displayed when supplied by an authorized IRDAI-registered insurance partner or explicitly labeled as `SANDBOX`.
- **No Claims Adjudication**: Mana provides administrative and paperwork tracking support only. Claim approval, rejection, and settlement decisions remain strictly within the purview of the insurer and their licensed TPAs.
- **Explicit Disclosures**: Every interface (mobile, web, API) displays mandatory disclaimers clarifying insurer underwriting responsibility.

---

## 2. Security & Compliance Architecture

### Data Privacy & Encryption at Rest
- Sensitive policy numbers (`policyNumberEnc`) are encrypted at rest using **AES-256-GCM** via `FieldEncryptionService`.
- Client and UI applications only receive masked numbers (`XXXXXX1234`).
- Full unmasked policy numbers are never surfaced over public API responses.

### Immutable Append-Only Consent Ledger
- All user consents (`QUOTE_SHARING`, `POLICY_STORAGE`, `CLAIMS_ASSISTANCE`, `GROUP_ENQUIRY`) are stored in an append-only database table (`insurance_consent_record`).
- Withdrawal generates a new `WITHDRAWN` event while maintaining full historical auditability.
- Triggers strictly prevent `UPDATE` or `DELETE` on consent and audit tables.

### Cryptographic Audit Trail
- High-integrity operations are signed into a SHA-256 hash-chain ledger (`insurance_audit_event`).
- Each block contains `prev_event_hash` and `curr_event_hash`, preventing tampering or deletion.

### Maker-Checker Product Approval
- Partner onboarding and product catalog version activation require dual administrative authorization:
  - An Admin or Operator proposes/verifies a product version (`SUBMITTED`).
  - A distinct Super Admin or authorized checker approves it (`APPROVED` -> `ACTIVE`).
  - Database `CHECK (checker_id <> maker_id)` constraints enforce maker-checker separation at the schema layer.

### Webhook Security & Idempotency
- Incoming partner events (e.g. policy issuance, status updates) require **HMAC-SHA256 signature verification**.
- Replay attack tolerance window: timestamps older than 300 seconds are rejected.
- Webhook payloads are hashed with SHA-256; raw external payloads containing customer PII are not persisted in receipt logs.

---

## 3. Technology Stack & Multi-Repo Alignment

| Repository | Tech Stack | Role |
| :--- | :--- | :--- |
| `mana-community-service` | Spring Boot 3, Java 17, JPA, Flyway, H2 / PostgreSQL | Core business domain, maker-checker, consent ledger, AES encryption, HMAC verifier |
| `mana-community-mobile` | React Native, Expo Router, TypeScript, Zustand, TanStack Query | Native iOS/Android app, 9 modular screens, offline safeguards, masked vault |
| `mana-community-app` | React 19, Vite, TypeScript, Tailwind CSS, Lucide | Responsive Web Portal, comparison matrix, society group plans, consent manager |

---

## 4. Verification & Testing

- **Backend Unit Tests**: `InsuranceHubTest.java` (23 passing tests) covering maker-checker constraints, consent enforcement, open-redirect guards, signature verification, and audit hash-chains.
- **Mobile Unit Tests**: `__tests__/insurance.test.ts` (64 passing Jest tests) covering masking, renewal buckets, safe handoff URLs, sorting, and validation.
- **Web App Unit Tests**: `src/services/insuranceService.test.ts` (18 passing Vitest tests) covering API client endpoints and comparison helpers.