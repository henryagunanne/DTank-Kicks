# SoleStore Express API

Standalone Node/Express + MongoDB backend for the SoleStore frontend.

## Run locally

```bash
cd server
cp .env.example .env   # fill in values
npm install
npm run seed           # seeds 24 products + admin + 2 customers
npm run dev            # starts on http://localhost:4000
```

Then in the frontend, set `VITE_API_URL=http://localhost:4000` and rebuild.

## Admin login (after seed)
- email: `admin@solestore.com`
- password: `Admin1234!`

## Endpoints
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- `GET /api/products` (?category, brand, size, color, minPrice, maxPrice, rating, sort, page, limit), `GET /api/products/:id`, `POST/PUT/DELETE /api/products/:id` (admin)
- `GET /api/cart`, `POST /api/cart/add`, `PUT /api/cart/update`, `DELETE /api/cart/remove/:itemId`
- `POST /api/orders`, `GET /api/orders` (admin), `GET /api/orders/my`, `GET /api/orders/:id`, `PUT /api/orders/:id/status` (admin)
- `GET /api/products/:id/reviews`, `POST /api/products/:id/reviews`, `DELETE /api/reviews/:id`
- `POST /api/payments/create-intent`, `POST /api/payments/webhook`
- `POST /api/coupons/validate`, `POST /api/coupons` (admin)

## Security
Helmet, CORS (CLIENT_URL only), express-rate-limit on auth (10 req / 15min), express-validator on all inputs, bcrypt 12 salt rounds, JWT access (15m) + refresh (7d httpOnly cookie), compression on all responses.
