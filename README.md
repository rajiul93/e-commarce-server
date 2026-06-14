# Ecommerce Server

Express + MongoDB REST API for a full-featured ecommerce storefront and admin panel.  
Pairs with the Next.js frontend (`front`).

**Base URL:** `/api/v1`  
**Default port:** `3002` (see `.env`)

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js, TypeScript |
| Framework | Express 5 |
| Database | MongoDB (Mongoose) |
| Auth | JWT (access + refresh), httpOnly refresh cookie |
| Validation | Zod |
| File storage | Cloudflare R2 (S3-compatible) via Multer |
| Password | bcrypt |

---

## Quick start

```bash
cp .env.example .env
# Fill DATABASE_URL, JWT secrets, R2 credentials, CORS_ORIGIN

pnpm install
pnpm run dev
```

**Scripts**

- `pnpm run dev` — development (`ts-node`)
- `pnpm run build` — compile TypeScript
- `pnpm start` — run `dist/server.js`

---

## User roles

| Role | Access |
|------|--------|
| `USER` | Shop, cart, checkout, orders, wishlist, addresses |
| `SELLER` | POS, view orders, own payroll profile |
| `MANAGER` | Admin catalogue, orders (limited), staff list, expenses, analytics |
| `ADMIN` | Full access — settings, user management, payroll, expenses |

---

## Feature overview

### 1. Authentication & users (`/api/v1/user`)

- Customer registration & login
- **Access token** (client) + **refresh token** (httpOnly cookie)
- `POST /refresh`, `POST /logout`
- Profile: `GET /me`
- **Admin user management** — view/update any user (password, profile image, NID)
- **Staff accounts** — create/list staff (`ADMIN`, `MANAGER`, `SELLER`) with monthly salary
- List all users (admin/manager)

### 2. Media (`/api/v1/media`)

- Upload images to **Cloudflare R2**
- Use cases: `LOGO`, `BANNER`, product images, profile photos, etc.
- CRUD on uploaded images (list, get, update, delete)

### 3. Catalogue

#### Categories (`/api/v1/category`)
- Public list & detail
- Admin create, update, delete

#### Brands (`/api/v1/brand`)
- Public list & detail (with logo image)
- Admin CRUD

#### Products (`/api/v1/product`)
- Public catalogue with **filters & sort** (category, brand, price, rating, pagination)
- Product by slug (SSG-friendly) + slug list endpoint
- SEO fields: `seoTitle`, `seoDescription`, OG tags
- Offers: percent or fixed discount
- Status: `draft` | `active` | `inactive`
- Thumbnail + gallery images
- Featured / best-seller flags
- Admin full CRUD + list all (including drafts)
- **POS search** endpoint for staff

#### Attributes (`/api/v1/attribute`)
- Reusable attribute definitions (e.g. Size, Color)
- Admin CRUD

#### Variants (`/api/v1/variant`)
- Per-product SKUs: price, stock, buy price, attribute values
- Stock checked at cart/checkout
- Admin CRUD

#### Collections (`/api/v1/collection`)
- Curated product groups for home page
- Optional banner, `forHome` filter
- Public list + admin CRUD

### 4. Shopping (`/api/v1/cart`, `/api/v1/wishlist`)

**Cart** (logged-in)
- Get cart, add/update/remove line items
- Checkout preview (totals, coupon, address)

**Wishlist** (logged-in)
- Add, list, remove products

### 5. Addresses (`/api/v1/address`)

- Saved delivery addresses per user (division, jela, thana, local location)
- CRUD

### 6. Orders (`/api/v1/order`)

**Customer**
- Logged-in checkout from cart
- **Guest quick order** (name, phone, address — no account)
- List own orders, order detail
- Cancel & return request

**Admin / staff** (`/api/v1/order/admin`)
- List & filter all orders
- Update fulfillment status: pending → confirmed → processing → shipped → delivered
- **POS orders** — in-store sales with optional price override
- **Phone orders** — admin-entered orders
- Mark **payment received** (COD)
- Approve / reject return requests
- Guest/POS phone stored in order snapshot

**Order channels:** `online` | `phone` | `pos`  
**Delivery:** ship to address or shop pickup

### 7. Payments (`/api/v1/payment`)

- Cash on delivery flow
- Payment records linked to orders
- List own payments (customer)

### 8. Coupons (`/api/v1/coupon`)

- Admin create/update/delete coupons
- Scope controlled by store settings: all products or specific products only
- Applied at checkout preview

### 9. Store settings (`/api/v1/settings`)

| Endpoint | Description |
|----------|-------------|
| `GET/PATCH /order` | Logged-in checkout on/off, guest quick order on/off, coupon scope |
| `GET/PATCH /home-hero` | Home page hero: slider styles, slides, linked products |
| `GET/PATCH /branding` | Site name + **nav/footer logo** image |
| `GET/PATCH /staff` | Payroll working days per month |

Public `GET` for order, home-hero, branding. Admin-only `PATCH`.

### 10. Staff payroll (`/api/v1/staff/payroll`)

- Admin: set monthly salary records per staff, list payroll
- Staff: view own payroll (`GET /me`)
- Working days config from settings

### 11. Analytics (`/api/v1/analytics`)

- **Dashboard** — revenue, orders, profit summary (date range)
- **Income list** — detailed income breakdown (admin/manager)

### 12. Expenses (`/api/v1/expense`)

- Expense types (admin)
- Record & list business expenses (admin/manager)
- Used with analytics for profit calculation

---

## API route map

```
/api/v1/user          Auth, profile, staff, admin user management
/api/v1/address       Saved addresses
/api/v1/wishlist      Wishlist
/api/v1/cart          Cart & checkout preview
/api/v1/media         Image upload (R2)
/api/v1/product       Products (public + admin)
/api/v1/order         Customer orders + /admin sub-routes
/api/v1/coupon        Coupons
/api/v1/payment       COD payments
/api/v1/brand         Brands
/api/v1/category      Categories
/api/v1/settings      Store configuration
/api/v1/collection    Product collections
/api/v1/attribute     Product attributes
/api/v1/variant       Product variants (SKU/stock)
/api/v1/staff/payroll Staff salary & payroll
/api/v1/analytics     Dashboard & income
/api/v1/expense       Business expenses
```

---

## Environment variables

See `.env.example`:

- `DATABASE_URL` — MongoDB connection
- `PORT` — server port (default `3002`)
- `CORS_ORIGIN` — comma-separated frontend URLs (Vercel + local)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, expiry times
- `R2_*` — Cloudflare R2 bucket for images

---

## Project structure

```
server-setup/
├── app.ts                 Express app & route mounting
├── server.ts              DB connect & listen
└── src/
    ├── config/            Env config
    ├── middlewares/       Auth, validation, error handler
    ├── modules/           Feature modules (router → controller → service → model)
    └── utils/             JWT, responses, helpers
```

Each module follows: **router** → **controller** → **service** → **model** + **zod** validation.

---

## Deploy on Vercel (server)

### 1. Environment variables (required)

In Vercel project **e-commarce-server** → Settings → Environment Variables, add:

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | `mongodb+srv://user:pass@cluster.mongodb.net/ecommerce` |
| `CORS_ORIGIN` | `https://e-commarce-neon.vercel.app,http://localhost:3000` |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | strong random string |
| `JWT_ACCESS_SECRET` | strong random string |
| `JWT_REFRESH_SECRET` | strong random string |
| `R2_ACCOUNT_ID` | Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | … |
| `R2_SECRET_ACCESS_KEY` | … |
| `R2_BUCKET_NAME` | … |
| `R2_BUCKET_URL` | … |

Without `DATABASE_URL` on Vercel, every API call returns 500.

### 2. MongoDB Atlas

Network Access → **Add IP** → `0.0.0.0/0` (allow all — required for Vercel serverless).

### 3. Deploy & verify

Push to GitHub → Redeploy with **Clear build cache**.

Test: `https://e-commarce-server.vercel.app/api/v1/health`  
Should return `"connected": true`.

### 4. Front (Vercel)

```
NEXT_PUBLIC_API_URL=https://e-commarce-server.vercel.app
NEXT_PUBLIC_SITE_URL=https://e-commarce-neon.vercel.app
```

Local dev with live API: put the same `NEXT_PUBLIC_API_URL` in `front/.env.local` and restart `pnpm dev`.

---

## Deployment notes

- Set `NODE_ENV=production` for secure cookies (`sameSite: none`, `secure: true`)
- Add production frontend URL to `CORS_ORIGIN`
- Ensure R2 bucket is configured for public image URLs
- Run `pnpm run build && pnpm start` on the host
