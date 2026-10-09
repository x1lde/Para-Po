# Para-Po Architecture

Para-Po is an offline-first public transportation identifier MVP. This scaffold separates mobile presentation, recognition, local transport data, and location/map concerns while preserving the existing Expo application.

## Directory responsibilities

| Directory | Responsibility |
| --- | --- |
| `src/app/` | Existing Expo Router screens and navigator layouts. Keep route files here and supporting code outside this directory. |
| `src/components/` | Shared application components, including the existing themed components and platform-specific variants. |
| `src/components/ui/` | Reusable UI primitives shared across features. |
| `src/features/recognition/components/` | Future recognition UI, such as capture controls and recognition results. |
| `src/features/recognition/services/` | Future TensorFlow Lite model loading, input preparation, inference, and result mapping. |
| `src/features/location/services/` | Foreground location permission, bounded GPS fix, quality checks, and eligible boarding-point straight-line ranking. |
| `src/features/transport/components/` | Future transport information cards, lists, and details. |
| `src/features/transport/services/` | Offline transport lookup and explicit guidance completeness checks. |
| `src/features/maps/components/` | MapLibre native rendering, markers, sourced overlays, and offline/error/platform fallbacks. |
| `src/features/maps/services/` | Validate/map lookup coordinates and accept sourced route geometry; no route generation. |
| `src/database/` | Expo SQLite initialization, schema, migrations, dataset validation, and bundled catalog data. |
| `src/database/repositories/` | Typed catalog and transport access. Keep SQL and persistence details out of UI components. |
| `src/hooks/` | Shared React hooks; retain the existing theme and color scheme hooks. Keep feature-specific hooks with their feature when needed. |
| `src/constants/` | Shared constants, including the existing theme definitions. |
| `src/types/` | Types shared across multiple features. Feature-specific types belong beside their feature; preserve the existing feature `types.ts` files. |
| `src/utils/` | Small reusable helpers without UI or feature-specific responsibilities. |
| `assets/` | Existing bundled images and icons. |
| `assets/models/` | Future validated TensorFlow Lite models intended for the mobile application. No placeholder model binaries. |
| `ml/datasets/` | Future dataset preparation resources and documented data sources. Do not add fabricated datasets or personal data. Review licensing and repository size before adding real datasets. |
| `ml/notebooks/` | Future training, evaluation, and model conversion notebooks. Mobile runtime code belongs in `src/`. |
| `docs/` | Architecture, integration decisions, data provenance, and development notes. |
| `scripts/` | Existing project maintenance scripts. |

Empty directories use `.gitkeep` solely so Git can track them. Remove the relevant placeholder when adding real files to that directory.

## Development branches

These are planned work areas; scaffolding does not create or switch Git branches.

| Branch | Primary ownership | Integration responsibilities |
| --- | --- | --- |
| `feature/mobile-ui` | `src/app/`, shared components and UI, recognition/transport presentation, shared hooks and theme constants. | Compose existing routes with feature components. Agree on service inputs and result types before connecting UI to implementations. |
| `feature/ml-recognition` | Recognition services and feature types, `assets/models/`, `ml/datasets/`, `ml/notebooks/`. | Define recognition input/output contracts, document model labels and preprocessing, and provide validated model artifacts. Coordinate recognition UI changes with the mobile UI branch. |
| `feature/offline-data` | `src/database/`, repositories, transport services and feature types. | Define local schema and migrations, document actual transport data sources, and expose typed lookups that work without network access. Coordinate transport presentation with the mobile UI branch. |
| `feature/location-maps` | Location services and feature types, map components and feature types. | Define position and map input contracts, handle platform permissions and unavailable location, and coordinate screen integration with the mobile UI branch. |

Start each branch from the team's agreed integration branch. Keep changes focused on its work area, review overlapping shared-file changes together, and merge small increments through review. Shared types, route layouts, package manifests, and Expo configuration need coordination because multiple branches may depend on them.

## Integration conventions

The optional Map tab is implemented on `features/map`; see [maps.md](./maps.md) for native-build requirements, provider attribution, offline fallback, and frontend integration. GPS and real route geometry remain separate work.

The concrete handoff is in [branch-integration.md](./branch-integration.md), including ownership, UI wiring, source-based presentation, and cross-branch verification.

- Preserve the strict TypeScript configuration and existing aliases: `@/*` resolves to `src/*`; `@/assets/*` resolves to `assets/*`.
- Keep feature-specific types and behavior within the feature. Move contracts to `src/types/` only when multiple features need them.
- UI components call feature services or hooks; transport services use database repositories; repositories own persistence details.
- Recognition outputs should identify a class or candidate that transport services can resolve against verified local data. Do not invent route details when a match is unavailable.
- Keep database access and inference work away from rendering code. Design future implementations for mobile performance and supported platforms.
- Offline recognition and transport lookup should use bundled or persisted resources. Location and map availability must be handled explicitly; an offline-first application does not imply offline map coverage without real map resources.
- Offline-data bundles a 14-place catalog and six source-based suggestions using two published vehicle legs plus four walking variants. Evidence and missing details stay explicit. Nullable labels and coordinates allow manual use without ML or guessed points. See [offline-data.md](./offline-data.md) for schema 3, dataset 6, and UI handoff; complete guidance remains a separate result standard. Screens, inference, GPS, and maps belong to their branches.
- The UI provides the SQLite-connected Ride planner, a Map tab at `/map`, Progress at `/progress`, and a searchable commuter guide at `/explore`. Guide content in `src/features/transport/commuter-guide.ts` is general boarding advice, not verified route or fare data. The Ride scanner captures a photo, runs the bundled offline model, and asks users to confirm a recognized landmark or select manually. Web and Expo Go use a manual fallback. Device capture and inference still require native-build validation.
- Before future Expo, EAS, or React Native API changes, follow `AGENTS.md` and consult the documentation matching the installed Expo SDK. Add dependencies separately using Expo-compatible installation commands.
- Run TypeScript and lint checks before merging each branch, and distinguish existing failures from regressions introduced by that branch.
