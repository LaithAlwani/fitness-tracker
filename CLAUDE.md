# CLAUDE.md

> **This file is the source of truth for project rules.** Claude Code auto-loads it every session. Keep entries terse and rule-shaped — not a log. The full plan lives in `PLAN.md` (repo root) — read it before non-trivial decisions.

---

## Project Context

**Mission:** **Liftify** — a mobile-first **web PWA** for fast **weightlifting** tracking with manual body-weight/measurement tracking. The whole product is deliberately tiny: *"Track workouts fast and see progress over time."* Bar for shippable = a new user logs their first workout in **under 30 seconds**, zero onboarding.

**Monetization:** **Free for now** — no subscription, no paywall, no Stripe. Every authenticated user has full access. Passive monetization only: a **Donate** link (Ko-fi) and a **Shop** page (Amazon Associates affiliate). A **paid "Liftify AI" tier is a future phase** (AI suggestions / NL logging / insights) — that's when billing gets wired. Do **not** build billing or gate features behind a subscription yet. See `PLAN.md` §5.

> **History:** this repo began as an Expo / React Native monorepo with Duolingo-style gamification (XP, levels, achievements, quests). That app was **abandoned and replaced** by this Next.js web PWA. Gamification is **removed**. If you find references to Expo, NativeWind, `apps/mobile`, XP, or subscriptions, they are stale — treat them as bugs/cleanup, not as the design.

**Two products, two repos:**
- **`liftify.com`** → marketing site (separate repo — the local `corevex` folder, pending rename).
- **`app.liftify.com`** → the PWA (**this** repo, root dir `apps/web`).

### Stack

- **Next.js 16** App Router + **React 19**, **TypeScript** strict everywhere.
  > ⚠️ This is a **customized Next.js 16** ("NOT the Next.js you know" per `AGENTS.md`). Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (App Router docs under `01-app/`).
- **Tailwind v4** — tokens via `@theme inline` in `app/globals.css`; **no `tailwind.config.*`**. Shared `.container-page` helper.
- **Clerk** auth via `@clerk/nextjs` (`ClerkProvider` in the root layout).
- **Convex** database via `convex/react` + `ConvexProviderWithClerk`.
- **Web Push** (VAPID) + a minimal online-first **service worker** (`apps/web/public/sw.js`).
- **@phosphor-icons/react** for icons. **Geist / Geist Mono** via `next/font/google`.
- **npm workspaces + Turborepo** monorepo. Workspace packages scoped **`@liftify/*`**.

### Monorepo layout

```
fitness-tracker/
├── apps/
│   └── web/                     Next.js 16 PWA (@liftify/web) — the only app
│       ├── app/
│       │   ├── (auth)/          sign-in, sign-up
│       │   ├── (app)/           home, workout/new, workout/[id], history, progress, body, shop, settings
│       │   ├── api/             route handlers (e.g. delete-account)
│       │   ├── layout.tsx       ClerkProvider + Providers + service-worker registration
│       │   ├── providers.tsx    ConvexProviderWithClerk
│       │   └── manifest.ts      PWA manifest
│       ├── components/          ui/ (Button, Card, …) + app-shell, rest-timer, notification-bell,
│       │                        plate-calculator, body-diagram, onboarding, push-toggle, …
│       ├── lib/                 web-only helpers: streak.ts, prs.ts, shop.ts
│       └── public/              sw.js, icons, logo
├── packages/
│   ├── convex/                  @liftify/convex — backend (7 tables; see schema.ts)
│   ├── shared/                  @liftify/shared — pure TS (units, prs, exercises)
│   └── tsconfig/                shared tsconfig presets
└── (root) package.json (npm workspaces), turbo.json, tsconfig.json, PLAN.md, DEPLOY.md
```

### Backend (Convex) — 7 tables, free app

`users` (profile + reminder prefs, **no billing fields**), `exercises` (seeded read-only library, enriched from the public-domain **Free Exercise DB** — muscles, equipment, instructions, images), `workouts` (per-set `{reps, weight}` arrays + `durationSec`), `checkins` (rest/cardio/stretching active-recovery — feeds streaks), `bodyEntries` (weight + optional measurements), `notifications` (in-app), `pushSubscriptions` (Web Push). `convex/http.ts` is an **empty router** — a placeholder for a future Stripe webhook; there is none today.

### Workspace dependency rules

- `apps/web` → depends on `@liftify/shared`, `@liftify/convex`.
- `@liftify/convex` → depends on `@liftify/shared` (mutations evaluate the same predicates the client uses).
- `@liftify/shared` → **pure TypeScript only**. No `react`, `next`, or any DOM/native imports. Anything that breaks this is a bug.
  > Cleanup note: `shared` still ships legacy gamification modules (`xp.ts`, `achievements.ts`, `quests.ts`) from the old app. They are **unused** by the current web app/backend — don't build on them; they're candidates for deletion.

### Conventions specific to this project

- **Imports**: Convex API via `import { api } from "@liftify/convex"`. Shared lib via `import { convertWeight } from "@liftify/shared"`.
- **Auth**: handled at the provider level — `ClerkProvider` (root layout) + `ConvexProviderWithClerk` (`app/providers.tsx`). `AppShell` calls `users.getOrCreateCurrentUser` on first authenticated load. There is currently **no `middleware.ts`**; if you add server-side route protection, add one (and update `DEPLOY.md`).
- **Access is auth-only**: the app is free, so `users.accessState` just reports sign-in state. No subscription checks, no paywall redirects.
- **Styling**: Tailwind v4 utility classes driven by the `@theme inline` tokens in `globals.css`. Don't add a `tailwind.config.*`.
- **Icons**: `@phosphor-icons/react`.

### Authoritative commands

| Action | Command |
|---|---|
| Run the web app (dev) | `npm run web` |
| Run Convex dev (codegen + watch) | `npm run convex:dev` |
| Run everything via Turbo | `npm run dev` |
| Type check all workspaces | `npm run typecheck` |
| Lint all workspaces | `npm run lint` |
| Test (shared) | `npm run test` |
| Deploy Convex prod | `npm run convex:deploy` |

Deploy runbook: see `DEPLOY.md` (two Vercel projects + one Convex prod deployment).

### Hard "don't"s (deferred, not forgotten)

- **No billing / Stripe / paywall yet.** The app is free. Billing arrives with the paid AI tier (`PLAN.md` §5). Schema + `http.ts` are left forward-compatible for it.
- **No gamification.** XP/levels/achievements/quests were removed — don't reintroduce them.
- **No shared logic in `apps/web/lib/`** — anything pure TS that the backend also needs belongs in `packages/shared/`.
- **No HealthKit / Google Fit, no offline writes, no workout plans/templates** in this version.
- **Don't delete `packages/convex/convex/_generated`** — it's committed so Vercel can build the app without a Convex codegen step.
- **No `--no-verify`, `--force` git pushes, or destructive resets** without explicit user authorization.

### Environment variables

App (Vercel / `apps/web/.env.local`): `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_DONATE_URL`. Convex: `CLERK_JWT_ISSUER_DOMAIN` + VAPID keys for Web Push. (Future Stripe keys live on Convex prod only — see `DEPLOY.md`.)

### Gotchas (append as discovered)

- **Customized Next.js 16.** Don't assume stock Next.js behavior — read `node_modules/next/dist/docs/` first.
- **Tailwind v4, no config file.** Design tokens are defined in `app/globals.css` via `@theme inline`. Editing a "theme color" means editing that block, not a `tailwind.config.js`.
- **Committed Convex `_generated`.** Vercel builds `apps/web` without running Convex codegen, so the generated API types are committed. Run `npm run convex:deploy` to keep prod functions in sync after schema/function changes.
- **Placeholder Convex URL.** `app/providers.tsx` falls back to `https://placeholder.convex.cloud` when `NEXT_PUBLIC_CONVEX_URL` is unset so `next build` never crashes in CI. Real queries need the real URL set.
- **Apostrophes in JS strings.** `&apos;` only decodes inside JSX element children. In plain JS strings (template literals, args to native/browser APIs) it renders literally — always use a real `'`.

---

## Code Style Rules (apply to all workspaces)

## Goal

Build clean, readable, maintainable code that is easy for the user to update later.

The codebase should prioritize:
- Clear variable names
- Simple structure
- Reusable components
- Easy Tailwind styling
- Beginner-friendly readability
- No rushed or overly clever code

---

## Code Style Rules

### 1. Use clear variable names

Do not write unclear shortcuts like:

items.map(a => a.title)

Write this instead:

items.map((item) => item.title)

Better:

const itemTitles = items.map((item) => item.title)

Use names that explain what the data represents.

Good examples:

const userProfile = await getUserProfile()
const activeWorkoutPlan = workoutPlans.find((plan) => plan.isActive)
const completedExercises = exercises.filter((exercise) => exercise.isCompleted)

Bad examples:

const data = await getData()
const x = items.find(i => i.active)
const arr = list.map(a => a.name)

---

### 2. Create variables before rendering

Avoid putting too much logic directly inside JSX.

Bad:

{workouts.filter(w => w.completed).map(w => <p>{w.name}</p>)}

Good:

const completedWorkouts = workouts.filter((workout) => workout.completed)

return (
  <>
    {completedWorkouts.map((workout) => (
      <p key={workout.id}>{workout.name}</p>
    ))}
  </>
)

---

### 3. Keep components small

Each component should have one clear job.

Examples:

WorkoutCard.tsx
ExerciseList.tsx
PrimaryButton.tsx
PageHeader.tsx
UserProfileForm.tsx

Avoid giant files that do everything.

---

### 4. Use Tailwind in a clean way

Tailwind should be easy to edit.

Bad:

<div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-md border border-gray-200 mb-4">

Better:

const cardStyles = "rounded-xl border border-gray-200 bg-white p-4 shadow-md"
const rowStyles = "flex items-center justify-between"

return (
  <div className={`${cardStyles} ${rowStyles}`}>
    ...
  </div>
)

---

### 5. Make styling easy to change

Use shared style constants when possible.

const pageContainerStyles = "mx-auto max-w-5xl px-4 py-6"
const sectionTitleStyles = "text-2xl font-bold text-gray-900"
const mutedTextStyles = "text-sm text-gray-500"

---

### 6. Use reusable UI components

Create reusable components for common UI.

Examples:

Button
Input
Card
Modal
LoadingSpinner
EmptyState
PageHeader

Avoid duplicating styles or layouts.

---

### 7. Use TypeScript properly

Always define clear types.

type Exercise = {
  id: string
  name: string
  sets: number
  reps: string
  restSeconds: number
}

Avoid using any unless absolutely necessary.

---

### 8. Use readable function names

Good:

function calculateWorkoutProgress() {}
function handleSaveProfile() {}
function getCompletedExercises() {}
function formatRestTime() {}

Bad:

function calc() {}
function handleClick() {}
function getData() {}

---

### 9. Separate logic from UI

const hasCompletedWorkout = completedExercises.length > 0
const progressPercentage = calculateProgressPercentage(exercises)

return <WorkoutProgress percentage={progressPercentage} />

---

### 10. Make the app user-editable

The user should be able to change:
- Text
- Colors
- Button labels
- Page sections
- Workout/exercise data
- Navigation items
- Layout spacing

Example:

export const navigationItems = [
  { label: "Home", href: "/" },
  { label: "Workouts", href: "/workouts" },
]

---

### 11. Avoid over-engineering

Prefer simple, readable code over clever code.

---

### 12. File organization

Within `apps/web` (Next.js App Router):

app/            routes (route groups: (auth), (app)), layouts, api/
components/      ui/ + feature components
lib/             web-only helpers
public/          static assets, service worker

Shared pure TS → `packages/shared/`. Backend → `packages/convex/`.

Examples:

components/ui/button.tsx
components/app-shell.tsx
lib/streak.ts
lib/shop.ts

---

### 13. Comments

Add comments only when they explain why, not what.

Good:

// Keep 2 reps in reserve so beginners do not train to failure.

Bad:

// This maps exercises
const exerciseNames = exercises.map((exercise) => exercise.name)

---

### 14. Error handling

Always handle loading, empty, and error states.

if (isLoading) {
  return <LoadingSpinner />
}

if (errorMessage) {
  return <ErrorMessage message={errorMessage} />
}

if (exercises.length === 0) {
  return <EmptyState message="No exercises found." />
}

---

### 15. Before finishing any task

Checklist:
- Are variable names clear?
- Is JSX readable?
- Are Tailwind classes reusable?
- Are components small?
- Are types defined?
- Can the user easily edit this later?
- Are loading, empty, and error states handled?
- Is the code beginner-friendly?

---

## Final Instruction

Always write code as if another beginner developer will need to open it, understand it, and update it without asking for help.
