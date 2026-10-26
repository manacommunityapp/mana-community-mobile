# 📡 Mana Insurance Hub — REST API Reference

All endpoints are hosted under `/api/insurance/*` on the backend service.

## 1. Product Discovery & Comparison

### GET `/api/insurance/catalogue?category={CATEGORY}`
Fetches active, verified product versions for a specific protection category.
- **Access**: User / Member with `VIEW_INSURANCE`
- **Ordering**: Neutral alphabetical by plan name or insurer name. No biased promotions.
- **Parameters**: `category` (`HEALTH`, `FAMILY_FLOATER`, `PARENTS`, `LIFE_TERM`, `MOTOR_CAR`, `MOTOR_TWO_WHEELER`, `HOME`, `TRAVEL`, `PERSONAL_ACCIDENT`)

### POST `/api/insurance/quote-requests`
Submits an underwriting input payload to obtain formal partner quotation offers.
- **Headers**: `Idempotency-Key: {uuid}`
- **Payload**:
  ```json
  {
    "category": "HEALTH",
    "partnerCode": "SANDBOX_PARTNER",
    "consentId": 12,
    "fields": {
      "pincode": "560100",
      "memberAges": [35, 32]
    }
  }
  ```
- **Response**: `QuoteRequestView` with quotation offers or status `PARTNER_UNAVAILABLE`.

---

## 2. Policy Vault & Renewals

### GET `/api/insurance/policies`
Returns all self-declared and partner-verified policies belonging to the authenticated resident.

### GET `/api/insurance/policies/{id}`
Returns details for a single policy. Sensitive policy numbers are returned in masked format (`XXXXXX1234`).

### POST `/api/insurance/policies`
Adds a self-declared policy to the resident's vault. Encrypts policy number with AES-256-GCM.
- **Payload**:
  ```json
  {
    "insurerName": "HDFC ERGO",
    "productName": "Optima Secure",
    "category": "HEALTH",
    "policyNumber": "POL-9876543210",
    "startDate": "2025-01-01",
    "expiryDate": "2026-01-01",
    "sumInsured": 1000000,
    "premiumAmount": 18500
  }
  ```

### DELETE `/api/insurance/policies/{id}`
Removes a self-declared policy record from Mana.

---

## 3. Claims Assistance Desk

### GET `/api/insurance/claims-assistance`
Lists claims support tickets opened by the resident.

### POST `/api/insurance/claims-assistance`
Opens an administrative assistance case for paperwork tracking and liaison support.
- **Payload**:
  ```json
  {
    "policyId": 5,
    "claimType": "Cashless Hospitalization",
    "description": "Admission at Manipal Hospital for emergency appendectomy."
  }
  ```

### POST `/api/insurance/claims-assistance/{id}/insurer-reference`
Attaches the insurer / TPA claim tracking number provided by the insurance company.

---

## 4. Group & Society Enquiries

### GET `/api/insurance/group-enquiries`
Returns institutional group enquiries submitted on behalf of the resident's housing society.

### POST `/api/insurance/group-enquiries`
Submits an institutional group enquiry for common property structure insurance, lift AMCs, or staff health benefits.

---

## 5. Consent & Privacy Ledger

### GET `/api/insurance/consents`
Returns audit history of user data sharing authorizations.

### POST `/api/insurance/consents`
Records a newly granted consent event.

### POST `/api/insurance/consents/{id}/withdraw`
Appends a withdrawal event to the ledger, terminating partner data-sharing for the specified purpose.

---

## 6. Webhooks

### POST `/api/insurance/webhooks/partner/{partnerCode}`
- **Security**: Requires `X-Webhook-Signature` header computed via HMAC-SHA256 with timestamp verification.
- **Public**: PermitAll at security boundary; verified cryptographically in service layer.