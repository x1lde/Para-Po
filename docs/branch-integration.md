# Connecting Para-Po's branches

Offline-data was developed first. Its SQLite storage and TypeScript services are the local backend; frontend code calls these functions directly, without HTTP or a server. Existing screens are still the Expo template. This document describes remaining work, not implemented screens or device features.

## Integration order and ownership

| Owner | Next work | Acceptance |
| --- | --- | --- |
| `feature/mobile-ui` / UI-UX | Build manual origin selection, destination selection, recommendation cards, loading/error/retry states in existing `src/app/`. Keep reusable presentation in feature components. | Circuit to One Ayala displays sourced guidance and limitations; invalid/uncovered selections have clear states. |
| `feature/offline-data` | Own schema, seed versions, repositories, validation, source evidence, and lookup contracts. | Keep checks passing; coordinate shared type changes before integration. |
| `feature/ml-recognition` | Train/export the model; agree on ID-to-label mapping, preprocessing, and confidence policy. | Convert accepted predictions to existing landmark IDs. Unknown/low-confidence predictions return the user to manual selection. Never generate transportation routes. |
| `feature/location-maps` | Implement permissions/GPS, eligible-point distance ranking, and optional MapLibre visualization. | Filter options before measuring distance; skip null coordinates; label distance as straight-line. GPS/map failure leaves manual recommendations usable. |

## Frontend wiring

1. Load `listLandmarks()` for manual origin choices. Calls initialize SQLite lazily; show loading and catch storage failures with retry.
2. On origin change call `listDestinationsForOrigin(originId)`. Source-based options are included by default. Clear any previously selected destination/results so stale selections cannot persist.
3. On destination selection call `lookupTransportation(originId, destinationId)`. Ignore responses from older selections using a request sequence or cancellation flag in the UI controller.
4. Render every discriminated result: `available`, `source-based`, `incomplete-guidance`, `no-routes`, `already-at-destination`, and unsupported IDs. Storage rejection is a separate error state.
5. Keep route params to stable IDs and resolve records through services. Do not pass SQLite connections or copy seed objects into route files. Use the existing Expo Router directory; do not create another routing root.

Functions are imported from `@/database/repositories/transport-repository` and `@/features/transport/services/transport-service`. See [offline-data-handoff.md](./offline-data-handoff.md) for signatures, option fields, and expected outputs.

## UI/UX requirements

- Present vehicle, boarding location, alighting location, and recorded walking instructions in travel order.
- Label `source-based` results **Web-sourced recommendation**, with review date, source details, and unresolved access/service limitations. Do not imply a physical ride or guaranteed current operation.
- Missing text means unknown, not no walking. Do not invent a fare, walking time, stop coordinate, or departure schedule.
- Empty origin-specific destination lists explain limited pilot coverage and allow changing origin. The full catalog does not imply every pair has a route.
- Keep manual selection available after camera permission denial, uncertain recognition, unavailable GPS, or map failure. Opening source URLs and viewing maps are optional online actions.

## Shared contracts and integration boundaries

Use transport contracts from `src/features/transport/types.ts`. Labels and coordinate pairs can be null. Recognition, location, and map feature type files currently have no implemented contracts; agree on those contracts before connecting them. Do not assume they already exist.

All runtime place coordinates currently remain null. The location/maps branch can implement ranking, but cannot demonstrate it until appropriate boarding coordinates are established. Keep ambiguous map candidates in research documentation. Camera/TFLite and MapLibre native compatibility must be reviewed against the installed Expo SDK before dependencies are added.

Implement the manual flow first; then connect recognition, GPS, and maps independently. Coordinate shared configuration, package files, and types. Use reviewed PRs into `develop`; no automatic merge, branch creation, commit, or push is performed here.

## Team verification

Run `npm run lint`, `npx tsc --noEmit`, and `npm run check:offline-data`. On Windows PowerShell use `npm.cmd`/`npx.cmd` if script execution is restricted. The offline-data check uses the existing TypeScript dependency and Node's built-in SQLite (tested with Node 24); it does not install packages or access a real app database.

After UI wiring, verify native SQLite on Android: catalogs and sourced recommendations in airplane mode, persistence after restart, errors/retry, and upgrades. Finally test the integrated workflow in a standalone build without the development server. Desktop SQL checks do not certify these native/device behaviors.
