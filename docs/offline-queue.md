# Offline mutation queue

The app uses one durable mutation store: `requestQueue` in AsyncStorage. `backgroundSync` is its executor, and `offlineSyncService` only tracks connectivity. Mutations persist across app restarts.

## Allowed operation

Only `MARK_BILL_PAID` can be queued. It records a user's bill status; it does not initiate or confirm a money transfer. Cashfree order creation is online-only and is never replayed from the queue. Add a new operation only after confirming that replay is safe and its endpoint accepts an idempotency key.

## Ownership and replay

Every queue item stores the signed-in user's ID and community ID captured when the user requests the action. The processor sends only items whose stored identity exactly matches the active session. Entries belonging to another user or community remain on device and are not shown in the current account's queue.

The queue sends each operation through the authenticated API client and uses the queue item's stable ID as its idempotency key. Network failures, HTTP 408/429, and 5xx responses remain pending for up to five attempts, triggered by reconnection, app authentication, or the user's Sync action. After five failed attempts, the item remains in `FAILED` until the user retries or discards it. Other 4xx errors become `FAILED` immediately. HTTP 409 becomes a persistent `CONFLICT` and is not automatically retried; the user must discard it.

The UI reports an operation as queued until the API confirms it. A queued bill update is never displayed as a completed payment. Successful items are removed after server confirmation. Offline mutation payloads currently contain only the bill identifier; AsyncStorage is device-local app storage, not encrypted queue storage.

Records from the previous queues are not replayed or imported: those records have no reliable user/community owner, and some contain arbitrary URLs or payment requests. They remain isolated under their legacy storage keys so they cannot be sent under a different account.

## Cashfree order creation

Cashfree order creation is not queued or automatically replayed. Before the first request, the client stores the request and a stable idempotency key in SecureStore, scoped to the active user, community, and payment reference. If the response is ambiguous, the UI says the order status is unknown and requires an authenticated order-history check before enabling retry. A retry reuses the stored key. If a matching order is found, the client shows that order and will not create another one. If status lookup fails, retry remains disabled. The backend currently exposes order history rather than a lookup by idempotency key, so the client matches the candidate by user, reference, amount, and creation time.
