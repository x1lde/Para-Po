# Offline-data verification

Checks resumed on 2026-10-09. TypeScript and lint pass. `node scripts/check-offline-data.cjs` passes 12 grouped checks using production TS modules and isolated Node SQLite databases: initialization/concurrency, six sourced journeys and strict mode, invalid/same-place/uncovered IDs, idempotence, validation, forced-write rollback, ready-versus-sourced filtering, dataset replacement/downgrade prevention, populated schema 1/2 upgrades, failed-initialization retry, and dataset 2-to-3 removal of the retired wine place from both catalogs. These are desktop SQL/domain checks, not Expo native or physical Android verification.

Android export also passed: `node node_modules/expo/bin/cli export --platform android --output-dir .expo/offline-data-check-android` produced Hermes bytecode and assets for the existing app. The sandbox initially blocked the Hermes executable; the authorized rerun outside the sandbox succeeded. Output is under ignored `.expo/`. This verifies Android bundling, not an installed APK or native SQLite execution; existing screens still do not import the offline-data layer.

Pre-existing failures found and fixed: missing CSS import declarations (TS2307/TS2882), and the template web hydration hook's synchronous effect state update (lint). Added CSS declarations and a hydration-aware React subscription. Windows PowerShell blocked `npm.ps1`; `npm.cmd` ran successfully without changing execution policy. No offline-data error was reported by TypeScript or lint.

The checklist below retains remaining coverage and device checks; it is not a claim that every item has been executed. Run `npm run check:offline-data` with Node 24 to reproduce the automated database checks.

## Static checks

Use the repository's package manager convention. With npm, run `npm run lint` and `npx tsc --noEmit`. With a Bun lockfile, use Bun/bunx equivalents. Record pre-existing errors separately from introduced errors.

## Dataset and lookup

| Check | Expected result |
| --- | --- |
| Bundled catalog | 14 landmarks and 14 destinations; stable names/IDs; no invented model labels. |
| Duplicate IDs/labels or invalid coordinate pair | Validation rejects before any table replacement. |
| Missing referenced origin/destination/point or duplicate order | Replacement rejected; previous dataset survives transaction rollback. |
| Current Circuit pairs | `source-based` by default; missing details explicit. With fallback disabled, `incomplete-guidance`. |
| Uncovered valid pair | `no-routes`. |
| Same catalog ID | `already-at-destination`. |
| Unknown origin/destination | Corresponding unsupported status. |
| Ready synthetic fixture with unknown coordinates | Manual `available`; coordinate issue informational; no distance ranking. |
| Shared point serving multiple destinations | Only routes for requested destination returned. |
| Multiple routes with mixed guidance | `available` includes ready options only; deterministic ordering. |
| Sourced named boarding/alighting with explicit limitations | Source-based fallback accepted; review flags still false. |
| Pending evidence or missing source/essential instructions | Source-based fallback rejected. |

Synthetic fixtures belong in an isolated test database and must never replace real bundled reference data for the demo.

## SQLite migrations and upgrades

Use isolated copies, not the demonstration database:

1. Fresh installation reaches schema 3 and dataset 3.
2. Version 1 and 2 databases with nonempty reference data migrate to 3. Verify IDs, labels, coordinates, instruction text, and child relationships survive the schema migration. Use the same dataset version when isolating schema preservation from intended reseeding.
3. Rebuilt parent foreign-key names remain correct; `PRAGMA foreign_key_check` returns no rows and `PRAGMA foreign_keys` returns 1 after initialization.
4. Existing review fields default to pending/false; legacy data does not silently become a ready recommendation.
5. Reopening the same dataset skips replacement. A higher dataset version atomically replaces bundled references and removes obsolete routes.
6. Invalid seed or forced mid-migration failure rolls back schema/data/metadata markers. Initialization can retry.
7. Higher stored schema/dataset versions reject instead of downgrading.
8. Concurrent callers share one initialization and connection.

## Android offline handoff

With the data module integrated into a development or standalone Android build, launch in airplane mode, list catalogs, perform current and uncovered lookups, close/relaunch, and confirm persistence. Exercise storage error/retry presentation. GPS, camera, ML inference, and online map tests belong to their owning branches.

The standalone APK and complete photograph-to-recommendation demo require other branches and sufficiently complete journey evidence. This checklist covers offline-data responsibilities only.
