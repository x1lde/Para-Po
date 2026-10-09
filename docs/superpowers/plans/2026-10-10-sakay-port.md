# Sakay-System Frontend Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Sakay prototype's design *system* (token roles, type scale, component patterns, screen anatomy) onto Para-Po's existing blue & white identity — Ride, Map, Progress, and the app shell.

**Architecture:** Purely presentational. Task 1 retunes `theme.ts` colors and adds semantic roles; Task 2 grows the single design-system module `commuter-ui.tsx` with shadcn-style primitives and the type scale; Tasks 3–6 restyle the shell and the three screens on those primitives; Task 7 is the full verification pass. No backend, data, model, or config changes at any step.

**Tech Stack:** Expo SDK 57 (React Native), expo-router native tabs, expo-symbols, TypeScript, RN Pressable primitives. No new dependencies.

**Spec:** `docs/sakay-port-design.md` (approved 2026-10-10; user chose: keep current primary `#2159A6`).

## Global Constraints

- **No new dependencies.** All primitives reuse expo-symbols, RN core, existing `Space`/`Radius` scales, and `VehiclePixelArt`.
- **No backend/data wiring changes.** Do not import from or modify `features/transport` (except its UI-adjacent screens' imports), `features/location`, `journey-context`, or any `.db`/catalog code. Only these files change: `src/constants/theme.ts`, `src/components/commuter-ui.tsx`, `src/components/app-tabs.tsx`, `src/app/index.tsx`, `src/app/progress.tsx`, `src/features/maps/components/JourneyMap.native.tsx`, `src/features/maps/components/ChoicePicker.tsx`, `src/features/maps/components/MapStatus.tsx`, `src/features/recognition/components/ScanFallback.tsx`.
- **Every new `Colors` key must appear in both light and dark** (the `ThemeColor` type enforces this at compile time).
- **Keep the current primary brand blue `#2159A6`** (light) / `#8AB4FF` (dark). Do not change to `#2563EB`.
- **Touch targets ≥ 48px** on all interactive elements; **focus ring** = 3px gold border via `onFocus`/`onBlur`.
- **Preserve every existing `accessibilityLabel`, `accessibilityLiveRegion`, and user-facing message string** unless the spec rewrites the copy. Only the two copy changes named in the spec change: header eyebrow → "Your Makati ride companion"; ride showcase title → "Getting there, your way".
- **No continuous/decorative animation.** Press feedback = opacity/scale callbacks only.
- UI tasks are verified by `npx tsc --noEmit`, `npx expo lint`, and existing data suites staying green (there is no component test harness in this repo; `node --test` suites cover data/selection logic and must remain untouched/green).
- **Commits are local-only; do not push** unless the user asks.

## Review Focus

Inputs/conditions the spec implies that could break and the behavior a reasonable person expects — each is pinned in the owning task:

1. **Dark mode parity** — every retuned/new token resolves in dark, and Map must stop hardcoding light-only hex. (Pin in Task 1 + Task 6.)
2. **Disabled/hidden states** — "Find my ride" disabled until both places are chosen; disabled buttons visually muted but still ≥48px. (Pin in Task 5.)
3. **Narrow screens <360px** — `compactPageTitle` (index) and `compactHeader` keep working after the header restyle. (Pin in Task 2 + Task 5.)
4. **Live-region status text** — map location-message and selection-unavailable messages keep `accessibilityLiveRegion="polite"` after migration. (Pin in Task 6.)
5. **Web platform** — `iconNames` requires a `web` name for every new icon (record type enforces), and the web export still renders all three screens plus shell. (Pin in Task 2 + Task 7.)
6. **No route/data regression** — the full `node --test` suite (offline-data, selection, maps journey-selection, recognition place-id) and `check:*` scripts stay green after every task. (Pin in Task 7.)

---

### Task 1: Semantic tokens (`src/constants/theme.ts`)

**Files:**
- Modify: `src/constants/theme.ts` (the `Colors` object, both themes)

**Interfaces:**
- Consumes: the `Colors` export and `ThemeColor` type already defined there.
- Produces: new color keys every later task reads — `ring` (light `#2159A6`, dark `#8AB4FF`), `input` (light `#D9E2F0`, dark `#38475F`), `danger` (light `#A53F3F`, dark `#E89A89`) — and retuned values below under their existing names.

- [ ] **Step 1: Retune the light theme values**

Per `docs/sakay-port-design.md` §1: `background` → `#F4F6FB`, `backgroundElement` → `#EDF2F9`, `backgroundSelected` → `#E3EDFB`, `text` → `#1B2440`, `textSecondary` → `#51607C`, `border` → `#D9E2F0`, `plum` → `#3D5A99`. Leave `primary`/`primaryText` (`#2159A6`/`#FFFFFF`) and `success`/`gold`/`error`/`scrim`/`controlMuted`/`accent`/`hero*`/`highlight` unchanged. `surfaceRaised` stays `#FFFFFF`.

- [ ] **Step 2: Retune the dark theme values**

`background` → `#0F1626`, `surfaceRaised` → `#1A2435`, `backgroundElement` → `#232F44`, `backgroundSelected` → `#27406B`, `textSecondary` → `#B7C2D6`, `border` → `#38475F`, `plum` → `#A9C0F0`. Leave `text` `#F3F6FC`, `primary` `#8AB4FF`, `primaryText` `#101A2B`, `success`/`gold`/`error`/`scrim`/`controlMuted` unchanged.

- [ ] **Step 3: Add `ring`, `input`, `danger` to BOTH themes**

Values as listed in Interfaces above (duplicate the referenced token's value; do not reference by variable).

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` and `npx expo lint` and `git diff --check`.
Expected: clean (key parity enforced by `ThemeColor`; no other file references break — names are unchanged).

- [ ] **Step 5: Commit**

```bash
git add docs/sakay-port-design.md src/constants/theme.ts
git commit -m "style(theme): retune blue & white tokens, add ring/input/danger roles"
```

---

### Task 2: Component kit (`src/components/commuter-ui.tsx`)

**Files:**
- Modify: `src/components/commuter-ui.tsx`

**Interfaces:**
- Consumes: `Colors`, `Radius`, `Space` from `@/constants/theme`; Token 1's new keys.
- Produces (exact signatures later tasks use):
  - `type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'`
  - `Button({ label: string; onPress?: () => void; disabled?: boolean; variant?: ButtonVariant; size?: 'sm'|'default'|'lg'; fullWidth?: boolean; icon?: AppIconName; iconPosition?: 'start'|'end'; accessibilityLabel?: string })` — Pressable ≥48px (sm 48 / default 52 / lg 56), radius 12 (link: none), focus ring 3px gold, disabled = `backgroundSelected` fill + `textSecondary` text.
  - `PrimaryButton` = thin alias of `Button variant="default" size="lg"` (keeps the exact existing props `label/onPress/disabled/icon`).
  - `Badge({ children: React.ReactNode; variant?: 'default'|'secondary'|'outline'|'gold'|'success'|'destructive'; icon?: AppIconName })` — pill, minHeight 28, `default` primary fill, `secondary` element fill + text, `outline` border + text, `gold` solid gold + white, `success` solid success + white, `destructive` error 10% fill + error text.
  - `CardHeader`, `CardTitle({ children, style }):`, `CardDescription`, `CardContent({ children, style })` — light composites; `Card` itself unchanged.
  - `ToggleChip({ label: string; active: boolean; onPress: () => void; icon?: AppIconName })` — pill 48px; active = primary fill + primaryText; idle = element fill + border + text.
  - `EmptyState({ title: string; copy: string; actionLabel?: string; onAction?: () => void; icon?: AppIconName })` — element-fill rounded block, centered.
  - `ProgressBar({ value: number; label?: string })` — role `progressbar` with `accessibilityValue={{min:0,max:100,now:value}}`, track = `backgroundElement`, fill = `primary`.
  - `Separator({ style? })` — 1px `border`-colored hairline.
  - `SearchField({ placeholder: string; value: string; onChangeText: (v:string)=>void; accessibilityLabel: string })` — 52px input in an element-fill rounded box with leading search icon.
  - `typography` keys: `display`, `title`, `pageTitle` (retuned to 34/40), `sectionTitle`, `heading`, `body`, `small`, `label`, `kicker` (13/18 uppercase), `score` (56/64).
  - `AppIconName` additions: `check, clock, walk, flame, route, lock, shield, alert, refresh, flag, building, park, trophy, sparkles` (each with `ios`/`android`/`web` names — `ios` SF Symbols like `checkmark`, `figure.walk`, `flame`, `point.topleft.down.to.point.bottomright.curvepath`, `lock`, `checkmark.shield`, `exclamationmark.triangle`, `arrow.clockwise`, `flag`, `building.2`, `tree`, `trophy`, `sparkles`; `android` `check`, `schedule`, `directions_walk`, `local_fire_department`, `route`, `lock`, `verified_user`, `warning`, `refresh`, `flag`, `apartment`, `park`, `emoji_events`, `auto_awesome`).

- [ ] **Step 1: Extend `iconNames`** with the 14 new names (all three platforms each; the record type enforces it).

- [ ] **Step 2: Extend the `typography` sheet** to the full key list; retune `pageTitle` and `kicker` per Interfaces.

- [ ] **Step 3: Add the primitives** (`Button` + `PrimaryButton` alias, `Badge`, `Card` composites, `ToggleChip`, `EmptyState`, `ProgressBar`, `Separator`, `SearchField`) per Interfaces. Update the focus-ring pattern: any Pressable with `onFocus`/`onBlur` gets the 3px gold border when focused (same as the existing `PrimaryButton`/`RouteField` pattern).

- [ ] **Step 4: Restyle `AppHeader`** — near-opaque header on `background` with a 1px `Separator` hairline beneath; `StatusPill` becomes `Badge variant="outline"`; eyebrow copy → **"Your Makati ride companion"** (the only permitted copy change here); keep `compactHeader` and `wideWebHeader` variants and the network tri-state pill logic.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` and `npx expo lint`.
Expected: clean; anything importing the old exports (`ScreenFrame`, `Kicker`, `BodyText`, `RouteField`, `RecoveryLink`, `Card`, `PrimaryButton`, `useAppColors`) still compiles unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/components/commuter-ui.tsx
git commit -m "feat(ui): shadcn-style kit — Button, Badge, Card set, ToggleChip, EmptyState, ProgressBar, Separator, SearchField, icon set, type scale"
```

---

### Task 3: Shell tabs (`src/components/app-tabs.tsx`)

**Files:**
- Modify: `src/components/app-tabs.tsx`

**Interfaces:**
- Consumes: `Colors` from `@/constants/theme`; Task 2's kit vocabulary for tokens only (no new imports needed beyond `useColorScheme`).
- Produces: a null-safe scheme resolver other native screens may copy.

- [ ] **Step 1: Fix the crash** — replace `Colors[scheme === 'unspecified' ? 'light' : scheme]` with a null-safe read: `scheme === 'dark' ? 'dark' : 'light'` (handles `null` and `'unspecified'`).

- [ ] **Step 2: Apply the new palette** — `backgroundColor` = `background`, `indicatorColor` = `backgroundElement`, active icon/label = `primary`, idle = `textSecondary`. Keep the 3 triggers and their labels/icons.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` and `npx expo lint`.
Expected: clean. (The `src/components/commuter-ui.tsx` `useAppColors` fix is the same pattern; no duplication needed.)

- [ ] **Step 4: Commit**

```bash
git add src/components/app-tabs.tsx
git commit -m "fix(app-tabs): null-safe color scheme; apply Sakay-system palette"
```

---

### Task 4: Progress screen (`src/app/progress.tsx`)

**Files:**
- Modify: `src/app/progress.tsx`

**Interfaces:**
- Consumes: Task 2 exports — `Badge`, `ProgressBar`, `Button`, `AppIcon` names `flame`, `route`, `map`, `lock`/`check`; `typography.score`, `typography.small`, `typography.label`.
- Produces: nothing new (screen only).

- [ ] **Step 1: Level card** — in the `Card accent`: replace the trailing `—` number with a `Badge` "Level — · Commuter in the making"; keep icon + title + honest copy; add a subdued `ProgressBar` (`value={0}`) and label "Progress saving and Manila-timezone streak tracking aren't connected." at `small` size.

- [ ] **Step 2: Stats card** — 3 icon rows (flame / route / map) each with value `—` at `score`-adjacent size and a `label` caption; keep 1px `border` dividers between rows (use `Separator`); keep the existing note line.

- [ ] **Step 3: Badges grid** — each `BadgeCard`: tone fill circle (gold / primary-blue / success-green via `backgroundSelected`/`backgroundElement`), `Badge variant="outline"` "Up next" replacing the right-aligned "Unavailable" text; keep title + copy; keep "Optional" tag and `RecoveryLink`.

- [ ] **Step 4: Bottom link** — keep `RecoveryLink` "Back to Ride" but style the label at `Button variant="link"`-consistent size (14–15, `primary` color, arrow icon); no copy changes.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` and `npx expo lint`.
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/progress.tsx
git commit -m "style(progress): Sakay-system level, stats, and badge layout"
```

---

### Task 5: Ride / planner (`src/app/index.tsx`, `ScanFallback.tsx`)

**Files:**
- Modify: `src/app/index.tsx` (planning, options, boarding views; picker sheet; local `ActionButton`/`EmptyNotice`)
- Modify: `src/features/recognition/components/ScanFallback.tsx`

**Interfaces:**
- Consumes: Task 2 exports — `Button` (`default lg`/`outline`/`ghost`/`link`), `Badge` (`gold`, `success`), `CardHeader/CardTitle/CardDescription/CardContent`, `ToggleChip`, `EmptyState`, `SearchField`, `Separator`; `typography.heading`, `typography.small`, `typography.label`; new `AppIcon` names (`walk`, `check`, `shield`, `flag`, `park`, `building`).
- Produces: nothing new (screen only). **All state, handlers, lookup logic, useEffect wiring, and data calls are unchanged** — verify by diffing that only `style`/JSX wrapper nodes change.

- [ ] **Step 1: Planning view** — order stays: intro (`Kicker` eyebrow + `pageTitle` h1 + body, `compactPageTitle` kept) → scan card (retuned spacing/radius via `Space`/`Radius`, gold focus border kept) → planner `Card` ("Plan your ride" header + SQLite note) → `RouteField` × 2 with a `Separator`-style dashed rule between → `Button` `lg` `fullWidth` "Find my ride" (disabled logic identical) → infoBox callout (copy logic identical) → ride showcase: heading **"Getting there, your way"** (the only copy change here) with 4 `VehiclePixelArt` tiles on `backgroundElement` (radius `Radius.medium`, min 48px). Remove nothing else.

- [ ] **Step 2: Options view** — back `Button variant="ghost"` + "Ride options" title + journey-summary line (origin → destination) read from existing state; mode filters become `ToggleChip` rows (same `RideModeFilter` state, same single-select semantics); `RideOptionCard`: vehicle tile + `typography.heading` name + route name + chevron, "Board at …" line, estimate row (wait/total "unavailable" at `small`, muted), evidence `Badge` (`gold` for source-based, `success` for guidance-checks); replace `EmptyNotice` usage with the shared `EmptyState` (same titles/copies/actions, `onRetry`/`onShowAll` preserved); delete the local `EmptyNotice` definition — keep its copy strings.

- [ ] **Step 3: Boarding view** — header row (vehicle tile + `heading` name + route name); 3-icon step list (walk / check / alight) using the existing data fields where present, else the existing `Instruction` lists inside `Card`s with `Separator`s; section headings at `sectionTitle`; actions: `Button lg` "Open route map" (`default`), `Button` "Back to ride options" (`outline`); the map-limitation infoBox copy unchanged.

- [ ] **Step 4: Place picker sheet** — restyle the existing `Modal` sheet: handle bar, header (`Kicker` + `sectionTitle` + close `Button ghost`), `SearchField` for the query (state/`onChangeText` unchanged), rows = kind-tinted icon circle + name + chevron (`placeChoice` patterns), `EmptyState`-style empty/error/loading blocks (existing copy and retry handlers intact), Cancel `Button outline`; package with a `fine-print` footer line.

- [ ] **Step 5: Scan dialog (`ScanFallback.tsx`)** — restyle the modal to center-card anatomy: title "Scan a landmark", description, `BodyText` message (unchanged default copy + `message` prop), `Button lg` "Choose starting point", text `Button variant="ghost"` "Close"; backdrop/scrim unchanged semantics. No recognition wiring changes.

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` and `npx expo lint`.
Expected: clean. Then `git diff src/app/index.tsx | grep -E '^[+-].*(findRide|setScreen|openPicker|choosePlace|lookupTransportation|ScanLandmark|setJourney)'` — expected: only whitespace/JSX-wrapping diffs, no logic-line removals (manual check).

- [ ] **Step 7: Commit**

```bash
git add src/app/index.tsx src/features/recognition/components/ScanFallback.tsx
git commit -m "style(ride): Sakay-system planner, options, boarding, picker, scan dialog"
```

---

### Task 6: Map (`JourneyMap.native.tsx`, `ChoicePicker.tsx`, `MapStatus.tsx`)

**Files:**
- Modify: `src/features/maps/components/JourneyMap.native.tsx`
- Modify: `src/features/maps/components/ChoicePicker.tsx`
- Modify: `src/features/maps/components/MapStatus.tsx` (read it first; migrate to kit primitives only if it renders kit-consumable UI)

**Interfaces:**
- Consumes: Task 2 exports — `AppIcon`, `BodyText`, `Card` + `CardTitle/CardDescription/CardContent`, `Button` (`outline`/`ghost`), `ToggleChip`, `Badge`, `EmptyState`, `Separator`, `useAppColors`, `typography`; new `AppIcon` names (`walk`, `shield`, `refresh`, `check`, `locationOff`, `viewfinder`).
- Produces: nothing new (screen only). Same constraint as Task 5: only JSX-wrapping/style changes; every message, role, and `accessibilityLiveRegion` string is preserved.

- [ ] **Step 1: Read `MapStatus.tsx`** and `ChoicePicker.tsx` fully; note their current props/rendering so the migration keeps both APIs.

- [ ] **Step 2: Migrate text/views** — replace `ThemedText`/`ThemedView` imports with the kit (`BodyText`, `Card…`, `typography.*`, `useAppColors`). Map `ThemedText type` styles to kit tokens: `subtitle`→`sectionTitle`, `small`→`small`, `smallBold`→`label`, `link`→`Button variant="ghost"`, `backgroundElement` theme → `Card`/element fill.

- [ ] **Step 3: Replace hardcoded hex** — legend colors `#32854b`→`success`, `#208AEF`→`primary`, `#d33d46`→`danger`, `#7856c4`→new `gps` token if added to theme in Task 1, else keep a documented constant; `#808080`/`#e58a00` borders → `border`/`gold`. Selected stop ring → `gold` (3px). (If a `gps` token is needed and absent, add it to `theme.ts` both themes in this task instead of a hex constant.)

- [ ] **Step 4: Screen anatomy** — header: eyebrow dot + "Plan your journey" (`pageTitle`) + note; pickers via restyled `ChoicePicker` (trigger styled like a compact `RouteField`, its `Modal` a sheet with title + list + Close); GPS / Cancel GPS / Show this journey / Back to Ride as `Button` outline/ghost with the same disabled logic; location message as muted `small` with the existing `accessibilityLiveRegion="polite"`; legend chips as `ToggleChip`-style (display-only); empty-journey state as a `Card` map-prompt ("Choose a trip to see its route and boarding guidance." + `Button` "Back to Ride"); "Where to board" stops as selected-ring cards; ranked options as `Card`s with `Button` "Select this option" / "Selected" (existing selected-state strings); the source/reviewed notes kept as `small` text.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` and `npx expo lint`.
Expected: clean. Then confirm `git diff` shows no removed user-facing strings: `git diff ...` grep for `-.*(Choose|Tap|Select|Back|No |Unable|unavailable|verified|GPS|boarding|destination|origin)` — expected: only re-moves and re-adds within restyled lines (manual check that translations/copies are intact).

- [ ] **Step 6: Commit**

```bash
git add src/features/maps/components/JourneyMap.native.tsx src/features/maps/components/ChoicePicker.tsx src/features/maps/components/MapStatus.tsx src/constants/theme.ts
git commit -m "style(map): migrate JourneyMap/ChoicePicker/MapStatus to shared kit"
```

---

### Task 7: Final verification pass

**Files:** none (read-only checks; commit only if the pass finds fixes).

- [ ] **Step 1: Static + lint**

Run: `npx tsc --noEmit` and `npx expo lint` and `git diff --check`.
Expected: all clean.

- [ ] **Step 2: Data suites (must be untouched/green)**

Run: `node --test src` and `npm run check:offline-data && npm run check:maps && npm run check:location && npm run check:recognition`.
Expected: all pass (counts match the pre-port baseline from the pull verification: 56 total across the four features).

- [ ] **Step 3: Expo doctor**

Run: `npx expo-doctor`.
Expected: no dependency/config issues.

- [ ] **Step 4: Web render sanity**

Run: `npx expo export -p web --output-dir dist` (fresh build), serve `dist`, and capture headless-Chrome screenshots of `/` `/progress` `/map` (and the picker via interaction if scriptable) plus `--dump-dom` text checks for the three screens' key labels ("Saan ka papunta?", "Your progress", "Plan your journey").
Expected: pages render with the new tokens; no red-screen/console errors in the dump.

- [ ] **Step 5: Report** — summarize what changed per screen, the verification evidence, and the remaining on-device Android check that this machine cannot run (no local toolchain). No push; commits are local.

## Self-Review notes

- Spec coverage: §1→T1, §2→T2, §3.1→T2+T3, §3.2→T5, §3.3→T6, §3.4→T4, §4 (a11y/motion)→spread across T2/T5/T6 (focus rings, 48px, live regions), §5 (out of scope)→Global Constraints, §6→T7. No gaps.
- Type consistency: `Button`/`Badge`/`ToggleChip`/`EmptyState`/`ProgressBar`/`SearchField`/`Typography` keys/`AppIconName` additions are defined once in Task 2 Interfaces and referenced identically in T4–T6.
- Review Focus: all six lines pinned (T1/T6 dark+hex; T5 disabled; T2/T5 narrow; T6 live regions; T2/T7 web; T7 data suites).
- Proportion: plan describes interfaces and verification, not component bodies; per-task commit steps follow the repo's existing commit cadence on `develop`.