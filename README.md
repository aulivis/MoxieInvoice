# MoxieInvoice

Előfizetős SaaS: Moxie adatok → Billingo vagy Számlázz.hu számla → visszajelzés Moxie-nak. Supabase + Vercel, Stripe előfizetés, HU/EN többnyelvűség.

## Funkciók

- **Moxie kapcsolat**: Base URL + API kulcs, webhook URL másolás, kapcsolat teszt
- **Számlázó**: Billingo vagy Számlázz.hu kiválasztása, hitelesítő adatok, eladó adatok
- **Számolás**: Webhook (Moxie → app) vagy manuális „Új számla” űrlap
- **Visszajelzés**: PDF / számla adatok Moxie-nak (Attach File, Create Invoice)
- **Fizetés szinkron**: Billingo/Számlázz.hu fizetés → Moxie Apply Payment (`POST /api/payments/sync-moxie`)
- **Mező megfeleltetés**: Moxie custom field key → számlázó mező (pl. számla típusa), value_mapping
- **Hibák**: Sikertelen számla `error_message` mentése, listában piros státusz, ok megjelenítése
- **EUR → HUF**: Beállítás: fix árfolyam vagy napi MNB középárfolyam (MNB API)
- **Ütemezés**: Számolás csak munkanapokon vagy munkaidőben (timezone + start/end time), queue + Vercel Cron

## Tech stack

- **Next.js** (App Router), TypeScript, Tailwind
- **Supabase**: Auth (Magic Link, PKCE), PostgreSQL, RLS
- **Stripe**: Checkout, Customer Portal, webhook (subscription)
- **next-intl**: HU (default), EN

## Telepítés és beállítás

### 1. Függőségek és környezeti változók

```bash
npm install
```

Másold `.env.example` → `.env` és töltsd ki:

| Változó | Hol találod | Megjegyzés |
|--------|-------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Ugyanott → Publishable key | Klienshez (Auth, RLS) |
| `SUPABASE_SECRET_KEY` | Ugyanott → Secret key | Szerverhez (pl. webhook, cron) |
| `NEXT_PUBLIC_APP_URL` | Saját app URL | Dev: `http://localhost:3000`, prod: `https://<domain>` |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → API keys | |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → Add endpoint → Signing secret | |
| `STRIPE_PRICE_ID` | Stripe → Products → ár ID | Előfizetéshez |
| `CRON_SECRET` | Saját titkos string | Opcionális; Vercel Cron auth-hoz |

### 2. Supabase: adatbázis

Futtasd a migrációkat sorrendben (Supabase CLI vagy SQL Editor):

1. `supabase/migrations/20250101000001_initial_schema.sql` – táblák, RLS, policy-k  
2. `supabase/migrations/20250102000001_rls_and_search_path_fix.sql` – RLS finomítás

### 3. Supabase: Auth (Magic Link)

A bejelentkezés **Magic Link** (email link, jelszó nélkül). Beállítás a Supabase Dashboard-ban:

- **Authentication → URL Configuration**
  - **Site URL**: ugyanaz, mint `NEXT_PUBLIC_APP_URL` (pl. `http://localhost:3000` vagy `https://<domain>`).
  - **Redirect URLs**: add hozzá a callback URL-t:
    - Dev: `http://localhost:3000/auth/callback`
    - Prod: `https://<domain>/auth/callback`
- **Authentication → Providers → Email**: Email provider engedélyezve (alapból be van).
- *(Opcionális)* **Magic Link lejárat**: Auth → Providers → Email → Magic Link / OTP expiration. Alapértelmezett 1 óra; számlázási appnál ajánlott rövidebb (pl. 15 perc).

A felhasználók a login oldalon csak emailt adnak meg; a linkre kattintva bejelentkeznek. Regisztráció = ugyanaz a flow (signup átirányít a loginra).

### 4. Stripe

- Hozz létre terméket és árat (előfizetéshez).
- Webhook: **Add endpoint** → URL: `https://<APP_URL>/api/stripe/webhook` → események: pl. `checkout.session.completed`, `customer.subscription.*` → másold a **Signing secret**-et a `STRIPE_WEBHOOK_SECRET` env-be.

### 5. Indítás

```bash
npm run dev
```

→ http://localhost:3000 — a login oldalon email megadásával Magic Linket kapsz.

## Moxie webhook

A Moxie-ban regisztráld a webhook URL-t **org paraméterrel**:  
`https://<APP_URL>/api/webhooks/moxie?org=<ORGANIZATION_UUID>`

## Vercel Cron

Ütemezett számlázás (pending_invoice_jobs) feldolgozása:  
`GET /api/cron/process-invoice-queue` – 5 percenként (vercel.json).  
Beállítsd a `CRON_SECRET` env-et és a Vercel Cron auth header-t.

## GitHub (first-time push)

If the repo is not yet on GitHub:

1. On [GitHub](https://github.com/new) create a new repository named **MoxieInvoice** (no README, no .gitignore).
2. In this folder run:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/MoxieInvoice.git
   git branch -M main
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` with your GitHub username or org.

## Deploy to Vercel

1. Push this repo to GitHub and import the project in [Vercel](https://vercel.com).
2. Set **Environment Variables** in Vercel (Project → Settings → Environment Variables) from `.env.example`. Use **Vercel Cron** auth: set `CRON_SECRET` and ensure the cron job sends `Authorization: Bearer <CRON_SECRET>` (Vercel does this automatically for configured crons).
3. Optional: set **NEXT_PUBLIC_APP_URL** to your production URL (e.g. `https://your-app.vercel.app`) for Stripe redirects and auth callbacks.
4. Redeploy after adding or changing env vars.

## Licenc

Private.
