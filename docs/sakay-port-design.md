# Para-Po frontend redesign — Sakay-inspired port

## Status

**Approved in principle** (2026-10-10). Decisions locked by the user:

- **Palette:** keep Para-Po's blue & white identity. Primary stays the current deep blue `#2159A6` (user chose "keep current blue").
- **Scope:** Ride/planner (`index.tsx`), Map (`JourneyMap.native.tsx` + `ChoicePicker` + `MapStatus`), Progress (`progress.tsx`), and the app shell (`AppHeader` + `AppTabs`). Explore and guide helpers are out of scope.
- **Personality:** system-only port — Sakay's layout, token roles, type scale, component patterns, and screen anatomy; Para-Po keeps its existing expo-symbols icons and pixel-art `VehiclePixelArt`. No pixel-art engine, no streak pill, no postcard scan card — only the underlying system.

**Reference:** the "Sakay — A little more local" prototype at `/Users/kylemasilang/Documents/my-mockup/commuters-app` (Next.js 16 + shadcn/ui). This design ports its *system*, not its violet brand color or its artwork.

## Rules this design obeys

- Preserve backend wiring, SQLite data, and API/data contracts. This is a purely presentational change (`src/constants/theme.ts`, `src/components/commuter-ui.tsx`, `src/components/app-tabs.tsx`, and the three in-scope screens + their map/scan subcomponents).
- No new dependencies. Reuse expo-symbols, RN Pressable primitives, the existing `Space`/`Radius` scales, theme tokens, and `VehiclePixelArt`.
- Mobile-first; Android is the primary test target.
- Unify the two visual systems: Map currently still uses `ThemedText`/`ThemedView` and hardcoded hex; the port moves it onto the shared `commuter-ui` kit and semantic tokens.
- Accessibility: AA contrast, >=48px touch targets, focus rings, semantic roles, live regions for status. Motion: press feedback only (opacity/scale), no continuous decoration.

## 1. Design tokens — `src/constants/theme.ts`

Colors keep their existing *names* (many callers outside scope read them) but get retuned values, plus new semantic aliases. Both light and dark are supported; `ThemeColor` forces every new key to exist in both.

| Role | Light | Dark | Notes |
| --- | --- | --- | --- |
| `background` | `#F4F6FB` | `#0F1626` | soft page background (was white) |
| `surfaceRaised` | `#FFFFFF` | `#1A2435` | cards / sheets ("surface") |
| `backgroundElement` | `#EDF2F9` | `#232F44` | soft fills, pills, tiles ("soft/lavender" → blue) |
| `backgroundSelected` | `#E3EDFB` | `#27406B` | selected fills, accent cards |
| `text` | `#1B2440` | `#F3F6FC` | |
| `textSecondary` | `#51607C` | `#B7C2D6` | "muted" role |
| `primary` | `#2159A6` | `#8AB4FF` | **unchanged brand blue** |
| `primaryText` | `#FFFFFF` | `#101A2B` | |
| `plum` | `#3D5A99` | `#A9C0F0` | kickers / links / eyebrow |
| `border` | `#D9E2F0` | `#38475F` | |
| `gold` | `#9C6B24` | `#D5B768` | focus ring, pilot-suggestion tag |
| `success` | `#286746` | `#A5C69C` | guidance-checks tag |
| `error` | `#A53F3F` | `#E89A89` | |
| `scrim` | `rgba(20,18,15,0.56)` | `rgba(0,0,0,0.68)` | unchanged |
| `controlMuted` | `#8B9AB0` | `#66758C` | unchanged |
| `ring` **(new)** | primary | primary | focus/selected ring |
| `input` **(new)** | `border` | `border` | input borders (maps to `border` value) |
| `danger` **(new)** | `error` | `error` | alias for destructive actions |

Existing `accent`, `onAccent`, `hero`, `onHero`, `heroSecondary`, `highlight` stay untouched (read by out-of-scope code).

### Typography

Consolidate the shared `typography` sheet in `commuter-ui.tsx` into a single scale (kills scattered 13/15/17/18 raw sizes):

| Token | Size/line/weight |
| --- | --- |
| `display` | 40 / 46 / 800, ls -0.8 (reserved) |
| `pageTitle` | 34 / 40 / 700, ls -0.6 (was 36/42; `compactPageTitle` 32/38 stays for <360px) |
| `title` | 28 / 34 / 700, ls -0.3 (Sakay 28) |
| `sectionTitle` | 20 / 27 / 700, ls -0.2 (unchanged) |
| `heading` | 17 / 23 / 800 (option/ride/stop titles) |
| `body` | 16 / 24 (unchanged `BodyText`) |
| `small` | 14 / 20 (details, muted copy, estimate rows) |
| `label` | 12 / 17 / 700 (field labels, stat labels) |
| `kicker` | 13 / 18 / 700, uppercase +0.5 ls (eyebrow; was 14/20) |
| `score` | 56 / 64 / 800, ls -1 (points display, progress) |

### Spacing & radii

Standardize on the existing `Space` (4/8/12/16/20/24/32/40/48) and `Radius` (8/12/20/24/pill) — already Sakay's scale. Old `Spacing` (different values) stays untouched; only Explore helpers read it.

## 2. Component kit — `src/components/commuter-ui.tsx`

All new primitives live in the existing single design-system module (matches how every screen already imports it; no new folder churn). They follow shadcn patterns: semantic `variant` props, compound composition, focus rings, >=48px touch.

- **`Button`** — variants `default | outline | secondary | ghost | destructive | link`; sizes `sm | md | lg`; `fullWidth`; `icon` (AppIcon name) + `iconPosition`; `disabled`; `accessibilityLabel`. Default variant = primary fill + primaryText; outline = transparent + border + text color; secondary = soft fill; ghost = transparent; destructive = error-tinted; link = plain text + arrow. Focus ring = 3px gold border on an outer Pressable (RN analog of `focus-visible:ring`).
  - `PrimaryButton` becomes a thin alias of `Button variant="default" size="lg"`; `ActionButton` (in `index.tsx`) is replaced by `Button variant="outline"`.
- **`Badge`** — variants `default | secondary | outline | gold | success | destructive`; optional leading `icon`; pill. Replaces `StatusPill` (internal to header), evidence tags, level tags, earned/locked chips, "unavailable" labels.
- **`Card`** set — keep `Card` API (`children`, `accent`); add `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` composites for panel anatomy (Sakay `page-panel` style: header row + body).
- **`ToggleChip`** — pill chip with `active` state (active = primary fill + primaryText; inactive = element fill + border), min 48px. Used by mode filters and map legend.
- **`EmptyState`** — `title`, `copy`, optional `actionLabel`/`onAction`/`icon`; centered, on element fill. Replaces the ad-hoc `EmptyNotice`/`PickerEmpty` variants.
- **`ProgressBar`** — `value` (0-100), `tone`, `label`, `accessibilityRole="progressbar"` with `accessibilityValue`. View-based.
- **`Separator`** — hairline (1px), color = `border`.
- **`SearchField`** — labeled search input with leading search icon (place picker).
- **`Sheet`** helpers — backdrop + rounded-top sheet container + handle, restyled from `index.tsx`'s inline modal styles; screen-local styles stay in `index.tsx` but adopt new tokens.
- **`AppIcon`** — expand `iconNames` (SF / Material / web):
  - `check`, `clock`, `walk` (`figure.walk` / `directions_walk`), `flame`, `route`, `lock`, `shield`, `alert`, `refresh`, `flag`, `building`, `park` (`tree` / `park`), `trophy`, `sparkles`.
- **`VehiclePixelArt`** — unchanged (para-po's own pixel vehicles are kept per personality decision).

Backward compatibility: all currently exported names keep working (`PrimaryButton`, `Card`, `BodyText`, `Kicker`, `RouteField`, `ScreenFrame`, `AppHeader`, `RecoveryLink`, `useAppColors`, `typography`).

## 3. Screen specs

### 3.1 Shell

- **`AppHeader`** (in `commuter-ui.tsx`): near-opaque "glass" — high-opacity `background`/`surface` with a 1px `Separator` hairline under the header (no blur dependency). Brand mark (primary square + tram icon) + "Para po!" + eyebrow "Your Makati ride companion". Right side: network + "Online map only" status **Badges**. Keep `compactHeader` and `wideWebHeader` variants.
- **`AppTabs`** (`app-tabs.tsx`): **fix the crash bug** — `Colors[scheme === 'unspecified' ? 'light' : scheme]` throws for `scheme === null`; use a null-safe `useAppColors()`-style selector. Tab bar tokens: `background` bar, `backgroundElement` indicator, `primary` active icon/label, `textSecondary` idle.

### 3.2 Ride / planner (`src/app/index.tsx`)

Planning state (Sakay RideScreen anatomy, current data/content kept):

1. **Intro** — eyebrow with dot ("Makati commute guide") → h1 "Saan ka papunta?" → body.
2. **Scan invite card** — primary fill, camera chip (primaryText tile), title "Scan a landmark", caption, arrow; gold focus border (existing behavior, retuned to `Radius.card` + new spacing).
3. **Planner card** — `CardHeader` "Plan your ride" + SQLite note; `RouteField` × 2 restyled as journey fields (icon chip / label / name / chevron) with a dashed connector between them; `Button lg fullWidth` "Find my ride" (disabled state per existing logic); muted data-note callout (status-driven copy unchanged).
4. **Ride showcase** — "Getting there, your way": 4 tiles (`VehiclePixelArt` + name) on `backgroundElement` soft tiles.

Options state (Sakay RideOptions):

- Back (`Button ghost`/icon) + "Ride options" title + journey-summary (origin → destination line).
- `ToggleChip` mode filters (existing single-select semantics, `all|jeepney|e-jeep|tricycle|bus`).
- Ride option cards: vehicle tile + `heading` name + route name + chevron; "Board at …" line; estimate row (Wait / Total time — "unavailable" as muted `small`); evidence **Badge** (`gold` = published-source pilot, `success` = meets guidance checks).
- All result states (loading, error, unsupported-origin/destination, already-at-destination, no-routes, incomplete-guidance, empty-after-filter) via `EmptyState` with correct retry actions; `onRetry`/`onShowAll` preserved.

Boarding state (Sakay TripDetails):

- Header row: vehicle tile + name + route.
- Sakay-style 3-icon step list (walk to boarding point → check signboard → alight) when the fields exist; otherwise the existing label/value `Instruction` lists inside `Card` sections with `Separator`s.
- Sections: "Before you board", "At your destination", "Estimate and source limits" — all data fields unchanged.
- Actions: `Button lg` "Open route map" (primary), `Button outline` "Back to ride options"; infoBox callout about the native map limitation (copy unchanged).

Place picker:

- `Sheet` anatomy: handle, header (`Kicker` + title + close), `SearchField` with placeholder, list rows (tint circle per kind — landmark vs destination icons), empty state, cancel; `fine-print` footer. Search/filter/retry logic unchanged.

Scan dialog:

- `ScanFallback` modal restyled to Sakay scan-dialog anatomy (title, description, message, `Button lg` "Choose starting point", text close); `CameraScanner` picks up new tokens automatically (colors only, no behavior change). All recognition wiring untouched.

### 3.3 Map (`JourneyMap.native.tsx`, `ChoicePicker.tsx`, `MapStatus.tsx`)

Full migration off `ThemedText`/`ThemedView` onto `commuter-ui`; delete hardcoded hex (`#32854b`, `#208AEF`, `#d33d46`, `#7856c4`, `#808080`, `#e58a00`) in favor of semantic tokens.

- Header: eyebrow + "Plan your journey" title + note ("Offline guidance · Online map").
- Pickers: `ChoicePicker` trigger restyled as a compact `RouteField`-style field; its modal becomes a `Sheet` with title + list + close (search not required; keep list + select semantics).
- Actions: GPS ("Use GPS" / "Refresh GPS"), "Cancel GPS", "Show this journey", "Back to Ride" — `Button outline`/`ghost` variants with icons.
- Location message: muted `small` text with `accessibilityLiveRegion="polite"`.
- Legend: `ToggleChip`/`Badge`-style chips with semantic dots (start=success, board=primary, destination=error/danger, GPS=violet → new `gps` role or keep `#7856c4` via a new token).
- Empty journey state: map prompt card ("Choose a trip to see its route and boarding guidance." + `Button` "Back to Ride") matching Sakay's `map-prompt`.
- Guidance: cards with `CardTitle`/`CardDescription`; boarding stops as selectable cards (selected = gold ring); ranked options with `Button` "Select this option" / "Selected option"; all fields, source references, distance estimates, and notes preserved.
- "Where to board" and result-status blocks keep every existing message and conditional.

### 3.4 Progress (`src/app/progress.tsx`)

Sakay ProgressScreen anatomy on the current honest "not connected yet" data:

- Intro: eyebrow ("Optional rewards") + "Your progress" + body.
- **Level card** (`Card accent`): level **Badge** ("Level — / Commuter in the making"), score styling (`score` type, "—"), subdued `ProgressBar`, hint "Progress saving and Manila-timezone streak tracking aren't connected."
- **Stats card**: streak / trips / landmarks as icon + value (`—`) + label rows (`flame`/`route`/`map`), dividers; existing note stays.
- **Badges grid**: 3 milestone cards with tone fills (gold / primary-blue / success-green) + **Badge** "Up next" (outline) status; "Optional" tag.
- Bottom: points recap + primary "Let's find a ride" link (replaces/upgrades `RecoveryLink` styling) + `RecoveryLink` "Back to Ride" kept.

## 4. Accessibility & motion

- AA contrast: white on `#2159A6` ≈ 4.6:1; muted/gold text on cards ≥ 4.5:1; dark-mode pairs re-checked after token changes.
- Touch: every interactive element ≥ 48px (existing buttons already comply; new chips/badges sized up).
- Focus ring on all keyboard-focusable controls (gold 3px border via `onFocus`/`onBlur`), consistent with the current pattern.
- Roles: `accessibilityRole="header"` on titles, `button` on all pressables, `progressbar` on `ProgressBar`, `accessibilityState` (selected/disabled) everywhere.
- Live regions: location message and selection-unavailable messages use `accessibilityLiveRegion="polite"`.
- Motion: press feedback = opacity/scale transitions on `Pressable` style callbacks only; no continuous decorative animation (Sakay rule).

## 5. Out of scope

Explore screen and `collapsible`/`screen`/`hint-row`/`web-badge` helpers (they inherit the new palette but keep their layout/code), old `Spacing` token, the `ThemedText`/`ThemedView` files themselves (still used by Explore/collapsible — Map and ChoicePicker stop using them), any new dependencies, `app.json`/native config, and **all backend/data/model code**.

## 6. Verification

- `npx tsc --noEmit` clean; `npx expo lint` clean.
- `node --test` suites (recognition, offline-data, maps, location) plus focused tests green.
- `npx expo-doctor` clean.
- Web export re-render (`npx expo export -p web`) for a visual sanity pass of the three screens + shell.
- Manual Android check remains on the user's device (no local toolchain here); native build steps unchanged.

## 7. Reference mapping

Sakay concept → Para-Po artifact: `tokens.css` roles → `theme.ts`; `button.tsx`/`badge.tsx`/`card.tsx` variants → `Button`/`Badge`/`Card` set; `RideScreen` → planning/options/boarding in `index.tsx`; `RideOptions` → options+boarding; `PlacePicker` → picker sheet; `ScanDialog` stage anatomy → `ScanFallback`/`CameraScanner` restyle; `ProgressScreen` → `progress.tsx`; `MapScreen`/`CityMap` prompt → `JourneyMap.native.tsx` empty/general states; `AppShell` header/tabs → `AppHeader`/`AppTabs`.