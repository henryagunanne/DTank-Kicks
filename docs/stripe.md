# Stripe integration

## Architecture

- The frontend creates a Stripe PaymentIntent through the backend endpoint `/api/payments/create-payment-intent`.
- The backend creates a pending order, validates cart items and stock, calculates totals server-side, and returns a Stripe `clientSecret`.
- The checkout form uses Stripe Elements to confirm payment without ever handling card details directly in the UI.
- Stripe webhooks finalize the order, reduce inventory, and clear the cart only after payment succeeds.

## Payment flow

1. Customer reviews cart and shipping details.
2. Backend validates the cart and creates a pending order plus a PaymentIntent.
3. Frontend renders Stripe Elements and confirms the payment.
4. Stripe sends a webhook for `payment_intent.succeeded` or `payment_intent.payment_failed`.
5. The backend updates the order and inventory accordingly.

## Webhook flow

- Webhook requests are verified with `stripe-signature` before processing.
- Duplicate events are safely ignored after the order is already marked as paid.

## Environment variables

### Frontend
- `VITE_STRIPE_PUBLISHABLE_KEY`

### Backend
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CURRENCY`

## Stripe CLI

```bash
stripe login
stripe listen --forward-to localhost:4000/api/payments/webhook
```

Set the webhook signing secret from the CLI output as `STRIPE_WEBHOOK_SECRET`.

## How to test

- Use Stripe test card `4242 4242 4242 4242` with any future expiry and `123` CVC.
- For a declined card, use `4000 0000 0000 9995`.

## Production deployment

- Switch to live mode keys.
- Configure webhooks for your production URL.
- Verify that product inventory and totals are still calculated on the server.

## Troubleshooting

- If the checkout does not load, confirm the publishable key is set.
- If webhooks fail, ensure the signing secret matches the endpoint configured in Stripe.
- If inventory does not reduce, confirm the webhook reached the server and the order was found by PaymentIntent ID.
