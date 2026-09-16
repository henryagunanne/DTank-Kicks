DTank-Kicks Returns & Refunds — Deployment Notes

Environment variables required:
- MONGODB_URI - MongoDB connection string
- JWT_SECRET - JWT signing secret
- STRIPE_SECRET_KEY - Stripe secret key
- STRIPE_WEBHOOK_SECRET - Stripe webhook signing secret
- STRIPE_CURRENCY - e.g., usd
- CLIENT_URL - frontend URL used in emails
- RETURN_WINDOW_DAYS - optional, default 30

New packages added:
- mongoose-sequence: used to generate human-friendly `returnNumber` IDs.
- mocha, supertest, chai (dev): for basic server tests.

Database migration/backfill:
- New collections: `returnrequests`, `refunds`, `auditlogs`.
- Existing `orders` documents are used as-is; the return system reads `order.items` snapshots.
- For historic orders that lack `price` or `variantId` in `order.items`, the admin UI will show limited refund capabilities and require manual review.

Stripe webhook setup:
- Ensure your Stripe webhook URL points to `/api/payments/webhook` and uses the `STRIPE_WEBHOOK_SECRET` from Stripe dashboard.
- The webhook handler now processes refund.* events and keeps Refund records synchronized.

Running tests:

Install server deps:

```bash
cd server
npm install
```

Run tests:

```bash
npm test
```

Notes & limitations:
- Refund tests involving Stripe are not included to avoid live Stripe calls; the refund flow uses Stripe idempotency keys and stores Refund documents for reconciliation.
- The admin UI includes a minimal "Record Inspection" button that prompts for restock confirmation. Consider replacing with a proper modal/dialog for better UX.
- Inventory restoration is idempotent per ReturnRequest via `inventoryRestoredAt` timestamp.

If you want, I can:
- Expand admin inspection UI into a full modal with condition selector and photo upload.
- Add comprehensive integration tests mocking Stripe events and webhook handling.
- Add backend validation for file uploads and image scans.
