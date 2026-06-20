# Liftify — Fitness Tracker Web PWA + Marketing Site

> **Canonical copy.** A mirror is committed to the marketing repo. Keep both in sync on every
> meaningful update.

## Context

This repo started as an Expo (React Native) monorepo with a strong Convex backend + Clerk
auth but only scaffolded UI. The decision is to **abandon the mobile app** and ship a
**simple web PWA** plus a **marketing site**, under the **Liftify** brand:

- **`liftify.com`** → marketing site (a Next.js 16 / React 19 / Tailwind v4 app — lives in a
  separate repo, currently the local `corevex` folder pending rename).
- **`app.liftify.com`** → the Liftify PWA (**this** repo, re-platformed from Expo to Next.js).

The product is deliberately tiny: **"Track workouts fast and see progress over time."**
Bar for shippable = a new user logs their first workout in **under 30 seconds**, zero
onboarding. Monetization is a **single flat $6.99/mo Stripe subscription** (Free = logging,
Pro = charts/analytics). UI quality comes from a **shared design system** driven by the
`taste-skill` agent skill, used identically across both repos.

> ⚠️ Both repos use a **customized Next.js 16** ("NOT the Next.js you know" per `AGENTS.md`).
> Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`
> (App Router docs live under `01-app/`). Tailwind is **v4** (`@theme inline` in
> `globals.css`, no `tailwind.config.*`). Fonts are Geist / Geist Mono via `next/font/google`.
> Package manager is **npm workspaces**. Workspace packages are scoped **`@liftify/*`**.

---

## 0. Tracked plan files
- [x] Commit this plan as **`PLAN.md` in BOTH repos**, identical on every workstation.
      App repo's copy is canonical; mirror to the marketing repo.
- [ ] Mark sections off (`- [x]`) as they are completed.

## 1. Shared design system (taste-skill)
- [x] Install `design-taste-frontend` in both repos
      (`npx skills add https://github.com/Leonxlnx/taste-skill`).
- [x] **Design read:** athletic-minimal, zinc/ink neutrals + one **volt-lime** accent
      (`#a3e635`). Dials — marketing 7/6/4, app calmer (motion 3 / density 5).
- [x] Encode tokens in **Tailwind v4 `@theme inline`** in `app/globals.css` + a shared
      `.container-page` margin helper; identical block mirrored in both repos.
- [ ] Build a tiny shared primitive set per repo (Button, Card, Input, Modal) using the tokens.

---

## 2. App repo (`app.liftify.com`)

### 2a. Scaffold — DONE
- [x] Added **`apps/web`** (`@liftify/web`, Next.js 16 App Router + TS + Tailwind v4); builds.
- [x] Deleted **`apps/mobile`**; converted monorepo **pnpm → npm workspaces** (dropped
      `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.npmrc`, `expo-crypto` override).
- [x] Renamed workspace packages to `@liftify/{web,convex,shared,tsconfig}`; Turbo
      `build` outputs `.next/**`; root scripts use `npm --workspace`.
- [x] Kept `packages/convex`, `packages/shared`, `packages/tsconfig`.

### 2b. Backend — fresh simplified schema (3 tables)
Rewrite `packages/convex/convex/schema.ts` down to:
```ts
users       { clerkId, email, firstName?, lastName?, units: "kg"|"lb",
              plan: "free"|"pro", stripeCustomerId?, createdAt }   // idx: by_clerk_id
workouts    { userId, name, date, exercises: [ { name, sets, reps, weight } ] }  // idx: by_user
bodyEntries { userId, date, weight, notes?, measurements?: { waist?, arms?, chest?, ... } } // idx: by_user
```
- [ ] MVP function surface:
  - `users.getOrCreateCurrentUser`, `users.updateUnits`
  - `workouts.create`, `workouts.listForUser`, `workouts.getLast`
  - `bodyEntries.create`, `bodyEntries.listForUser`
  - streak computed client-side from `workouts.listForUser` dates — no table.
- [ ] Delete unused functions (plans, sessions, cardio, gamification, progress, metrics, quests).
      Keep `exercises.list` + `exercises.seed` (strength only). Keep `auth.config.ts`.

### 2c. Auth (Clerk)
- [ ] `@clerk/nextjs` + `ConvexProviderWithClerk` + `clerkMiddleware` gating `(app)`.
- [ ] Configure Clerk for `app.liftify.com`. Keep `CLERK_JWT_ISSUER_DOMAIN` on Convex.
- [ ] First authed load → `users.getOrCreateCurrentUser` (mints row, `plan:"free"`).

### 2d. Screens (App Router) — 4 screens + upgrade
```
app/(auth)/sign-in , sign-up
app/(app)/layout.tsx            # providers, nav, auth guard
app/(app)/page.tsx              # HOME (Today): Start Workout · last workout · streak
app/(app)/workout/new/page.tsx  # LOG: rows {exercise, sets, reps, weight} → Save
app/(app)/progress/page.tsx     # PROGRESS: workouts/week + strength chart (Pro)
app/(app)/body/page.tsx         # BODY PROGRESS: weight chart · add modal · measurements
app/manifest.ts                 # PWA manifest
middleware.ts                   # clerkMiddleware
```
- [ ] **Log Workout** = the heart — fast entry, autofocus, sane defaults (30-sec test).
- [ ] Free vs Pro: logging + latest numbers = **Free**; all charts = **Pro** (gate on `users.plan`).

### 2e. Stripe billing — flat $6.99/mo (all in Convex)
- [ ] Stripe product + one recurring monthly price ($6.99) → `STRIPE_PRICE_ID`.
- [ ] `billing.createCheckoutSession` Convex **action** → Checkout URL; store `stripeCustomerId`.
- [ ] `convex/http.ts` **HTTP action** = Stripe webhook: verify sig, set `plan` pro/free.
- [ ] Customer Portal link + **Upgrade** modal behind every Pro chart.
- [ ] Convex env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`.

### 2f. PWA + polish
- [ ] `app/manifest.ts` + **Serwist** (`@serwist/next`) service worker (precache shell).
      (Offline writes out of MVP — Convex needs network.)
- [ ] Installable on mobile Safari + Chrome. Polish: empty/loading states, kg/lb toggle.

---

## 3. Marketing site (`liftify.com`) — separate repo
- [ ] Landing page (shared tokens + design-taste-frontend): hero one-promise headline ·
      3 feature blurbs (fast logging · progress charts · body journal) · pricing card
      ($6.99/mo) · CTAs → `app.liftify.com/sign-up`.
- [ ] Footer + Privacy / Terms stubs (required before taking payments).

---

## 4. Deploy / infra
- [ ] Two Vercel projects: `liftify.com`/`www` → marketing; `app.liftify.com` → app.
- [ ] DNS for apex + `app` subdomain.
- [ ] Rename the marketing repo + local folder from `corevex` → `liftify` (GitHub + disk).
- [ ] App env: `NEXT_PUBLIC_CONVEX_URL`, Clerk keys, `NEXT_PUBLIC_APP_URL`. Convex env per 2e.
      Register the Stripe webhook at the Convex HTTP endpoint.

---

## Deferred (post-MVP / v2)
Free trial, workout plans/templates, cardio, achievements/quests/XP levels, charts beyond the
two, HealthKit/Google Fit, offline-write, additional marketing pages. Also: rewrite the stale
`CLAUDE.md`/`AGENTS.md` (still describe the old Expo/gamification architecture).

---

## Verification
- **Backend:** `npm run convex:dev`; confirm the 3 tables; run `workouts.create` /
  `bodyEntries.create` / `users.getOrCreateCurrentUser`.
- **App e2e:** `npm run web`; sign in (Clerk) → log a workout in < 30s → see it on Home →
  add a body entry → confirm charts are locked on Free.
- **Billing:** Stripe test card through Checkout → webhook flips `users.plan` → `pro`; cancel
  via Customer Portal → reverts to `free`.
- **PWA:** Lighthouse PWA pass; install to home screen and launch standalone.
- **Design parity:** `globals.css` token block identical in both repos.
