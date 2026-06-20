# CoreVex — Fitness Tracker Web PWA + Marketing Site

> **Canonical copy.** A mirror is committed to the `corevex` (marketing) repo. Keep both in
> sync on every meaningful update.

## Context

`LaithAlwani/fitness-tracker` is an Expo (React Native) monorepo with a strong Convex
backend + Clerk auth but only scaffolded UI. The decision is to **abandon the mobile app**
and ship a **simple web PWA** plus a **marketing site**, under the CoreVex brand:

- **`corevex.com`** → marketing site (a fresh Next.js 16.2.9 / React 19 / Tailwind v4 app).
- **`app.corevex.com`** → the fitness tracker PWA (**this** repo, re-platformed from Expo to
  Next.js).

The product is deliberately tiny: **"Track workouts fast and see progress over time."**
Bar for shippable = a new user logs their first workout in **under 30 seconds**, zero
onboarding. Monetization is a **single flat $6.99/mo Stripe subscription** (Free = logging,
Pro = charts/analytics). UI quality comes from a **shared design system** driven by the
`taste-skill` agent skill, used identically across both repos.

> ⚠️ Both repos use a **customized Next.js 16** ("NOT the Next.js you know" per `AGENTS.md`).
> Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`
> (App Router docs live under `01-app/`). Tailwind is **v4** (`@theme inline` in
> `globals.css`, no `tailwind.config.*`). Fonts are Geist / Geist Mono via `next/font/google`.

---

## 0. Tracked plan files  *(do this first)*

- [x] Commit this plan as **`PLAN.md` in BOTH repos** (corevex + fitness-tracker), so it is
      identical on every workstation. Keep the two copies in sync on every meaningful update
      (treat the app repo's copy as canonical; mirror to corevex).
- [ ] Mark sections off (`- [x]`) in the committed `PLAN.md` as they are completed.

## 1. Shared design system (taste-skill)  *(foundational — do before screens)*

- [ ] Install the skill in both repos: `npx skills add https://github.com/Leonxlnx/taste-skill`
      (primary skill: **`design-taste-frontend`**).
- [ ] Run `design-taste-frontend` to **propose a cohesive palette + spacing/margin scale +
      type ramp**; capture the approved tokens.
- [ ] Encode tokens once in **Tailwind v4 `@theme inline`** inside `app/globals.css`
      (colors, spacing, radius, fonts) and **copy the same `globals.css` token block into both
      repos** so colors and margins are identical on marketing + app.
- [ ] Build a tiny shared primitive set per repo (Button, Card, Input, Modal) using the tokens
      — apply `design-taste-frontend` when generating them so the UI isn't generic.

---

## 2. App repo (`app.corevex.com`) — re-platform fitness-tracker

### 2a. Scaffold
- [ ] Add **`apps/web`** (Next.js 16 App Router + TS + Tailwind v4).
- [ ] Delete **`apps/mobile`**; drop the `expo-crypto` pnpm override; point Turbo
      `dev`/`build`/`lint`/`typecheck` at `web` + `convex`.
- [ ] Keep `packages/convex`, `packages/shared`, `packages/tsconfig`.

### 2b. Backend — fresh simplified schema (3 tables)
Rewrite `packages/convex/convex/schema.ts` down to:
```ts
users       { clerkId, email, name?, plan: "free"|"pro", stripeCustomerId?, createdAt }  // idx: by_clerkId
workouts    { userId, name, date, exercises: [ { name, sets, reps, weight } ] }           // idx: by_user
bodyEntries { userId, date, weight, notes?, measurements?: { waist?, arms?, chest?, ... } } // idx: by_user
```
- [ ] Prune Convex functions to the MVP surface:
  - `users.getOrCreateCurrentUser`, `users.updateUnits`
  - `workouts.create`, `workouts.listForUser`, `workouts.getLast`
  - `bodyEntries.create`, `bodyEntries.listForUser`
  - `stats` (streak) computed client-side from `workouts.listForUser` dates — no table.
- [ ] Remove now-unused tables/functions (plans, cardio, achievements, quests, xpEvents, etc.).

### 2c. Auth (Clerk)
- [ ] Wire `@clerk/nextjs` + `ConvexProviderWithClerk` + `clerkMiddleware` to gate `(app)`.
- [ ] Keep `convex/auth.config.ts` (already points at Clerk). Configure Clerk for the
      `app.corevex.com` domain.
- [ ] On first authed load call `users.getOrCreateCurrentUser` (mints the `users` row, `plan:"free"`).

### 2d. Screens (App Router) — 4 screens + upgrade
```
app/(auth)/sign-in , sign-up                      # Clerk
app/(app)/layout.tsx                              # providers, nav, auth guard
app/(app)/page.tsx              # HOME (Today): Start Workout · last workout · streak 🔥
app/(app)/workout/new/page.tsx  # LOG: repeatable rows {exercise, sets, reps, weight} → Save
app/(app)/progress/page.tsx     # PROGRESS: workouts/week + strength chart (Pro-gated)
app/(app)/body/page.tsx         # BODY PROGRESS: weight line chart · add-entry modal · measurements (collapsed)
app/manifest.ts                 # PWA manifest
middleware.ts                   # clerkMiddleware
```
- [ ] **Log Workout** is the heart — fast-entry form, autofocus, sane defaults (the 30-sec test).
- [ ] **Home** — Start button, last-workout summary, computed streak.
- [ ] **Body Progress** — Section 1 weight chart, Section 2 quick add modal (weight + optional
      notes), Section 3 measurements table collapsed by default.
- [ ] **Progress** — 2 charts max (Recharts): workouts/week + basic strength progression.
- [ ] Free vs Pro: logging (workouts + body entries) + latest numbers = **Free**; all
      **charts/trends = Pro** (gate on `users.plan`).

### 2e. Stripe billing — flat $6.99/mo (all in Convex, no Next API routes)
- [ ] Create Stripe product + **one recurring monthly price ($6.99)**; store `STRIPE_PRICE_ID`.
- [ ] `billing.createCheckoutSession` — Convex **action** (Node) → Stripe Checkout URL;
      persists `stripeCustomerId` on the user.
- [ ] `convex/http.ts` — Convex **HTTP action** receiving the **Stripe webhook**: verify
      signature, set `users.plan` → `pro` on `checkout.session.completed` /
      `customer.subscription.updated`; → `free` on cancel/lapse.
- [ ] **Customer Portal** link to manage/cancel.
- [ ] **Upgrade** modal/page in the app behind every Pro chart.
- [ ] Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`.

### 2f. PWA + polish
- [ ] `app/manifest.ts` (name, icons 192/512, `display:"standalone"`, theme color from tokens)
      + **Serwist** (`@serwist/next`) service worker (precache app shell). *(Offline writes are
      out of MVP — Convex needs the network.)*
- [ ] Verify installable ("Add to Home Screen") on mobile Safari + Chrome.
- [ ] Polish: empty/loading states, kg/lb toggle, the 30-second first-log check.

---

## 3. Marketing site (`corevex.com`) — separate repo
- [ ] Single landing page using the **shared tokens + design-taste-frontend**:
      hero with the one-promise headline · 3 feature blurbs (fast logging · progress charts ·
      body journal) · pricing card ($6.99/mo) · CTAs → `app.corevex.com/sign-up`.
- [ ] Footer + **Privacy / Terms** stubs (required before taking payments).
- [ ] Read `node_modules/next/dist/docs/01-app/` before coding (custom Next.js 16).

---

## 4. Deploy / infra
- [ ] Two Vercel projects: `corevex.com`/`www` → marketing; `app.corevex.com` → app.
- [ ] DNS records for apex + `app` subdomain.
- [ ] App env: `CONVEX_URL`, Clerk keys, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
      `STRIPE_PRICE_ID`. Register the Stripe webhook at the Convex HTTP endpoint.

---

## Deferred (post-MVP / v2)
Free trial (none for MVP), workout plans/templates, cardio, achievements/quests/XP levels,
charts beyond the two, HealthKit/Google Fit, offline-write, additional marketing pages.

---

## Verification
- **Backend:** `pnpm convex:dev`; in the Convex dashboard confirm the 3 tables and run
  `workouts.create` / `bodyEntries.create` / `users.getOrCreateCurrentUser`.
- **App e2e:** web `dev`; sign in (Clerk) → log a workout in < 30s → see it on Home → add a
  body entry → confirm charts are locked on Free.
- **Billing:** use a Stripe test card through Checkout → confirm webhook flips `users.plan`
  to `pro` and charts unlock; cancel via Customer Portal → reverts to `free`.
- **PWA:** Lighthouse PWA pass; install to home screen on a phone and launch standalone.
- **Design parity:** confirm `globals.css` token block is identical in both repos (same
  colors + spacing render on marketing and app).
- **Plan tracking:** `PLAN.md` exists and is committed in both repos; completed boxes ticked.
