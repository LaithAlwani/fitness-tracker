# CLAUDE.md

> **This file is the source of truth for project rules.** Claude Code auto-loads it every session. Update it at the end of every phase with anything genuinely persistent (new conventions, file-structure additions, gotchas). Keep entries terse and rule-shaped — not a log.

---

## Project Context

**Mission:** Mobile-first fitness tracker (iOS + Android via Expo / React Native) for **weightlifting** with manual cardio + manual bodyweight tracking and Duolingo-style gamification (XP, levels, achievements, weekly quests).

**Plan file:** `C:\Users\laith\.claude\plans\i-want-to-create-inherited-brooks.md` — full implementation plan with phases, schema, gamification design, and store-launch checklist. Read it before making non-trivial decisions.

**Currently working on:** Phase 4 (Workout logger — the core flow: start a session from a plan day or freeform, log sets/cardio, rest timer, finish). Last sign-off: **v0.4** (Phase 3 — plan builder with full CRUD, smart delete, day inline rename, exercise picker with category + muscle filters).

### Stack

- **Expo SDK 52+** with **Expo Router** (file-based routing)
- **TypeScript** strict everywhere
- **NativeWind 4** (Tailwind for RN — use `className=`, not `StyleSheet.create`)
- **Clerk** auth via `@clerk/clerk-expo` + `expo-secure-store` token cache
- **Convex** database via `convex/react`
- **Reanimated 3** + **moti** for animations
- **react-native-confetti-cannon** for celebrations
- **expo-haptics** + **expo-notifications**
- **Victory Native XL** (+ `@shopify/react-native-skia`) for charts
- **pnpm workspaces + Turborepo** monorepo
- **react-hook-form** + **zod** for forms

### Monorepo layout

```
fitness-tracker/
├── apps/
│   └── mobile/                  Expo app (only app for v1)
│       ├── app/                 Expo Router routes
│       │   ├── (auth)/          sign-in, sign-up, verify-email, forgot/reset-password
│       │   └── (app)/           protected routes incl. (tabs)/
│       ├── components/          UI: workout/, plans/, charts/, gamification/, ui/, auth/
│       └── lib/                 mobile-only: haptics, notifications, tokenCache
├── packages/
│   ├── convex/                  Convex backend (@fitness/convex) — single deployment shared by all future apps
│   ├── shared/                  Pure TS (@fitness/shared) — XP rules, achievements, quests, PRs, units, format
│   └── tsconfig/                Shared tsconfig presets
└── (root) pnpm-workspace.yaml, turbo.json, package.json, tsconfig.json
```

> **Overrides** rule #12 below: this project uses the monorepo layout above, not `src/app/`. The 15 code-style rules still apply within each workspace.

### Workspace dependency rules

- `apps/mobile` → depends on `@fitness/shared`, `@fitness/convex` (workspace:*).
- `@fitness/convex` → depends on `@fitness/shared`. Convex mutations evaluate XP/achievements/quests using the **same** `@fitness/shared` predicates the client uses.
- `@fitness/shared` → **pure TypeScript only**. No imports of `react`, `react-native`, `expo-*`, or any DOM/native module. Anything that breaks this is a bug.

### Conventions specific to this project

- **Imports**: Convex API via `import { api } from "@fitness/convex/dist/_generated/api"`. Shared lib via `import { xpForLevel } from "@fitness/shared"`.
- **Auth gate**: `apps/mobile/app/(app)/_layout.tsx` checks `useAuth().isSignedIn` and redirects. RN has no SSR/middleware layer.
- **Styling**: NativeWind `className=`. Don't use `StyleSheet.create` unless required by a library.
- **Forms**: `react-hook-form` + `zod` resolver. Inline error rendering, large tap targets, KeyboardAvoidingView.
- **Haptics**: Wrap `expo-haptics` through `apps/mobile/lib/haptics.ts` — single import surface, easy to mute later.
- **Phase tagging**: Each phase ends with a `v0.X` git tag (`v0.1` after Phase 0, `v0.2` after Phase 1, etc.) so we can roll back cleanly.

### Authoritative commands

| Action | Command |
|---|---|
| Run mobile dev server | `pnpm --filter @fitness/mobile exec expo start` |
| Run Convex dev (codegen + watch) | `pnpm --filter @fitness/convex exec convex dev` |
| Run both via Turbo | `pnpm dev` |
| Type check all workspaces | `pnpm typecheck` |
| Test shared package | `pnpm --filter @fitness/shared test` |
| Deploy Convex prod | `pnpm --filter @fitness/convex exec convex deploy` |
| EAS preview build | `pnpm --filter @fitness/mobile exec eas build --profile preview` |

### Hard "don't"s for v1 (deferred, not forgotten)

- **No HealthKit / Health Connect code.** Deferred to v1.1 (Phase 12). Schema is forward-compatible via `source` + `externalId` fields on `cardioLogs` and `bodyMetrics`.
- **No Apple Watch code.** Deferred to v2 (Phase 13).
- **No web app code.** Deferred (Phase 13+). When added, slots in as `apps/web/` with zero refactor of `packages/*`.
- **No streaks**, **no leaderboards**, **no curated plan templates**, **no RPE/notes per set**, **no social features** in v1.
- **No shared logic in `apps/mobile/lib/`** — anything pure TS belongs in `packages/shared/`.
- **No `--no-verify`, `--force` git pushes, or destructive resets** without explicit user authorization.

### Phase workflow (sign-off gates)

Each phase produces a working slice. The user manually verifies on their phone via Expo Go before the next phase begins.

1. Implement the phase's scope.
2. `pnpm dev` from repo root → user reloads on phone via Expo Go.
3. User walks through the **Verify** checklist for that phase (in the plan).
4. Fix issues. Re-verify.
5. Tag `v0.X` commit.
6. Update this file (CLAUDE.md): bump "Currently working on" pointer, append any persistent gotchas/conventions discovered.
7. Move to the next phase.

### External services to set up (one-time, requires user action)

1. **Clerk** — sign up at clerk.com, create an application. **Enable First Name + Last Name as required sign-up fields** (Configure → Email, Phone, Username → Personal information). **Enable Google as an SSO connection** (Configure → SSO Connections → Add → Google → use Clerk's dev credentials). Note publishable key (`pk_test_...`) and JWT issuer URL.
2. **Convex** — sign up at convex.dev. `pnpm dlx convex dev` (run in `packages/convex/`) opens browser, provisions dev deployment.
3. **Expo Go** — install from App Store / Play Store on the user's phone.
4. (Before Phase 10) **Apple Developer Program** ($99/yr) and **Google Play Console** ($25 one-time). Identity verification ~24h.

Environment variables (Expo bundles `EXPO_PUBLIC_*`):
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_CONVEX_URL`

Stored in `apps/mobile/.env.local` (git-ignored) for dev. Stored as EAS secrets for prod builds.

### Gotchas (append as discovered)

- **pnpm + Expo node_modules layout.** The repo root `.npmrc` sets `node-linker=hoisted` because Metro's resolver cannot navigate pnpm's default isolated/symlinked layout — NativeWind imports `react-native-css-interop/jsx-runtime` and Reanimated worklets need transitive deps Metro can find directly. Don't remove that .npmrc. If you ever see `Unable to resolve module react-native-css-interop` or similar transitive-resolution errors, re-check the root .npmrc and that all `node_modules/` are wiped + reinstalled.
- **Stale Metro on port 8081.** Closing a terminal mid-`expo start` on Windows often leaves an orphaned Node process holding 8081. If you get "Port 8081 is being used", run `Get-NetTCPConnection -LocalPort 8081 | Select OwningProcess` then `Stop-Process -Id <pid> -Force`. Or pass `--port 8082` to expo start.
- **`&apos;` only works in JSX text, not in JS strings.** React/JSX decodes HTML entities inside `<Text>can&apos;t</Text>` automatically. But `Alert.alert("can&apos;t")` (and any other string passed to a native API or template literal) shows the entity literally. Always use a real apostrophe `'` in JS strings; the `react/no-unescaped-entities` lint rule only flags JSX text, not strings.

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

src/
  app/
  components/
    ui/
    layout/
    features/
  constants/
  lib/
  types/
  utils/

Examples:

components/ui/Button.tsx
components/ui/Card.tsx
components/layout/PageHeader.tsx
constants/navigation.ts
types/workout.ts
utils/formatRestTime.ts

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
