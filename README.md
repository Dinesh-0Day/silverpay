# SilverPay

Admin-controlled plan deposits platform with wallet, manual payment approval, payouts, and live support.

## Security

- **No public admin setup API** — admin cannot be created over HTTP by strangers.
- Admin account is created **only** on the server: `npm run db:seed` (reads `backend/.env`, saves hashed password to MongoDB).
- Login checks **MongoDB only** (bcrypt hash, never plain text).
- Auth routes are **rate-limited** (brute-force protection).
- Production requires strong `JWT_SECRET` and `CORS_ORIGINS`.

## Stack

- Backend: Node.js, Express, MongoDB (Mongoose)
- Admin panel: React + Vite
- User app: React + Vite

## First-time setup

1. Copy `backend/.env.example` → `backend/.env` and set:

```env
MONGODB_URI="mongodb://127.0.0.1:27017/silverpay"
JWT_SECRET="your-long-random-secret-min-32-chars"
ADMIN_EMAIL="your-admin@email.com"
ADMIN_PASSWORD="your-strong-password"
```

2. Create admin in database (CLI only):

```bash
npm install
npm run install:all
npm run db:seed
```

3. Run:

```bash
npm run dev
```

4. Admin panel → **Login** with the email/password you put in `.env` (stored in MongoDB).

5. Add **Payment Details** and **Plans** in admin.

### Plans

| Category | Tiers | Notes |
|----------|-------|--------|
| **INR** | Basic, VIP | VIP = higher ₹ amount only — no membership required |
| **Crypto** | Basic, VIP | Plan price in **USDT**; on-chain verify; wallet credits in ₹ at admin-set **USDT→INR rate** (Settings) |

Old `UPI` category plans are treated as INR. `/plans/upi` redirects to `/plans/inr`.

### Payment settlement modes

| Mode | How it works |
|------|----------------|
| **Manual** | Bank/UPI — user submits UTR, admin approves |
| **Paytm merchant (auto UPI)** | UPI QR + timer → Paytm Order Status API polls → auto wallet credit |
| **Crypto auto** | User sends USDT (TRC20) + tx hash — verified on-chain, no payment gateway |

Set `PUBLIC_API_URL` in `backend/.env` for Paytm webhook (e.g. `https://your-api.com`).

Change admin email/password later: admin panel → **Settings** (requires current password).

### Home popup (user app)

In admin **Settings → Home popup**, enable a dialog with title, message, and/or image. Users see it on the Home screen after login and can close it. Saving a new version shows it again to users who dismissed the previous one.

## URLs

| Service | URL |
|---------|-----|
| User app | http://localhost:5173 |
| Admin | http://localhost:5174 |
| API | http://localhost:4000 |
