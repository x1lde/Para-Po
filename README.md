# ParaPo!

**Your commute, made simpler.** ParaPo! helps you get around Makati by starting from a place you already know.
Point your camera at a landmark, or choose one, and see how to get to another: walk, jeepney, bus, P2P, or a ride with one transfer.

The current release is a pilot of 14 Makati landmarks, from Ayala Center to Salcedo Weekend Market. Everything the app needs to recommend a ride is bundled with it, so the core flow works without a network connection.

## Contents

- [Features](#features)
- [Screens](#screens)
- [How the code is organised](#how-the-code-is-organised)
- [Project layout](#project-layout)
- [Data](#data)
- [Landmark recognition](#landmark-recognition)
- [Maps and location](#maps-and-location)
- [Theme and UI](#theme-and-ui)
- [Getting started](#getting-started)
- [Running on a device and EAS](#running-on-a-device-and-eas)
- [Scripts and tests](#scripts-and-tests)
- [Rebuilding the data and model](#rebuilding-the-data-and-model)
- [Conventions](#conventions)
- [Data sources and attribution](#data-sources-and-attribution)
- [Status and limits](#status-and-limits)
- [Documentation](#documentation)
- [License](#license)

## Features

- **Landmark recognition, on the device.** A bundled MobileNetV3 model (TensorFlow Lite) recognises the landmark in a photo. It runs offline and rejects blank, too-dark or too-bright photos before guessing. Recognition is optional; choosing a landmark by hand always works.
- **Journey planner, offline.** Every ordered pair of the 14 landmarks (182 directional journeys) has ranked options with boarding and alighting points, walking distances, estimated times and route sources. The data is built from OpenStreetMap and bundled with the app.
- **Live map of Makati.** A MapLibre map shows the supported landmarks. On native builds it also draws the chosen ride. The web preview uses MapLibre GL JS.
- **Optional GPS.** "Use my location" can pick the nearest supported boarding point. It is never required, and it is only requested when you ask for it.
- **Landmark guide.** A searchable list of the supported landmarks with general boarding advice.

## Screens

Routes live in `src/app/`. Expo Router turns each file into a screen, and `_layout.tsx` defines the navigator.

| Route | File | What it does |
|---|---|---|
| `/` (Find a ride) | `src/app/index.tsx` | Pick a starting point and a destination, scan a landmark, and see the planned ride. |
| `/map` | `src/app/map.tsx` → `JourneyMap` | Full Makati map with the chosen journey drawn on native builds. |
| `/explore` (Landmark guide) | `src/app/explore.tsx` | Browse the supported landmarks and their boarding advice. |
| `/camera` | `src/app/camera.tsx` → `LandmarkCamera` | Photo recognition. Opened from the Ride screen; it always offers manual selection too. |
| `/progress` | `src/app/progress.tsx` | Optional progress badges. Progress never replaces the ride itself. |

The bottom tab bar (`src/components/app-tabs.tsx` on native, `app-tabs.web.tsx` on web, and the shared shell in `src/components/commute/app-shell.tsx`) shows Ride, Map and Guide. Camera and Progress are reached from the app rather than from the tab bar.

`src/app/_layout.tsx` loads the Inter fonts, keeps the splash screen up until they are ready, and wraps the app in the theme providers.

## How the code is organised

The app is layered so that screens stay thin and the logic can be tested without a device:

```
Screens (src/app)
   │  compose
Feature components (src/features/*/components)  +  shared UI (src/components/commute)
   │  call
Hooks and services (src/features/*/hooks, services)
   │  read
Data: planner JSON (src/features/transport/planner)  +  SQLite catalog (src/database)
   ▲  built by
Offline tools: tools/transit (OpenStreetMap), ml/ (model training), tools/brand (logo)
```

Rules the code follows (see `docs/architecture.md`):

- **Screens are routes only.** Routes in `src/app/` compose components. Anything reusable lives outside that folder.
- **Feature code stays in its feature.** Types and behaviour live beside the feature that uses them. A type moves to `src/types/` only when several features need it.
- **Native-only code is split by file suffix.** Expo picks `*.native.tsx` on iOS and Android and `*.web.tsx` on web, so web never imports the native camera, TFLite or MapLibre modules. For example, `ScanLandmark.native.tsx` and `recognition-service.native.ts`.
- **Persistence stays in repositories.** SQL lives in `src/database/`, and UI code never writes SQL.
- **Recognition and map availability are explicit.** Failures come back as statuses (for example `unavailable` or `unclear-photo`) instead of exceptions, and the UI always has a manual fallback.

## Project layout

```
src/app/                    Expo Router screens; _layout.tsx defines the navigator and fonts
src/components/
  commute/                  Shared UI: app shell, theme provider, motion, cards, buttons, map card
  ui/                       Reusable primitives (collapsible)
  *.tsx                     Themed text/view, tab bar, screen frame, external link
src/features/
  recognition/              Landmark recognition: camera, hook, TFLite service, photo checks, score validation
  transport/
    planner/                planJourney() and the generated makati-journeys.json
    services/               Offline lookups from SQLite, recommendations, GPS ranking
    components/             JourneyOptions, commuter guide data and layout helpers
  maps/                     MapLibre surfaces (native and web), map scenes, journey loader
  location/                 Optional foreground GPS and boarding-point ranking
src/database/               expo-sqlite client, schema and migrations, seed, bundled dataset, validation
src/hooks/                  Theme, colour scheme and responsive layout hooks
src/constants/theme.ts      Colour and font tokens
src/types/                  Shared asset and style type declarations
assets/models/              Bundled TFLite model and its metadata (landmark_model.tflite / .json)
assets/brand/               Logo marks and wordmarks
assets/fonts/               Inter font files (OFL licence in OFL.txt)
assets/images/, reference-ui/   App icons, splash, tab icons and illustrations
ml/                         Landmark classifier: photo fetchers, training, dataset split, tests
tools/transit/              Rebuilds the journey data from OpenStreetMap
tools/brand/                Cuts the logo assets out of the brand board
scripts/                    Check scripts (run with npm) and the Metro/MapLibre helper scripts
public/                     Web map worker copied from node_modules on install
docs/                       Architecture, feature notes, data provenance and handoff notes
```

Two generated folders are intentionally not in the repository: `ios/` and `android/`. This project uses Continuous Native Generation, so Expo creates them when you build, and native settings go in `app.json` and config plugins.

## Data

There are two sets of transport data. Both are bundled.

**1. The journey planner (what the screens show today).** `src/features/transport/planner/makati-journeys.json` is generated by `tools/transit/build_journeys.py` from OpenStreetMap route data. `planJourney(originId, destinationId)` in `journey-planner.ts` returns the ranked options for any of the 182 directional pairs. It has no database dependency, so it works on every platform, including the web.

**2. The SQLite catalog.** `src/database/` holds the same landmarks, destinations, boarding points and routes in a local SQLite database (`para-po.db`):

- `client.ts` opens the database in WAL mode, checks `PRAGMA user_version`, runs migrations, seeds the bundled dataset, and runs `PRAGMA foreign_key_check`. It throws if the stored schema is newer than the app understands.
- `schema.ts` defines the tables (`landmarks`, `destinations`, `boarding_points`, `transportation_routes`, `route_boarding_points`, `landmark_boarding_points`, and so on) with `CHECK` constraints on coordinates and transport types. Schema version is currently 3.
- `data/pilot-dataset.ts` is the bundled dataset. `validate-dataset.ts` checks it before seeding, and `dataset-coverage.ts` reports coverage.
- `repositories/transport-repository.ts` is the only place that writes SQL for reads. It also maps a recognised model label to a landmark (`findLandmarkByClassificationLabel`).

The SQLite lookups in `src/features/transport/services/` (`transport-service.ts`, `recommendation-service.ts`) classify each option as `available`, `source-based` or `incomplete-guidance`, and rank boarding points by distance when GPS is available. Only options with complete guidance are presented as ready. Missing details stay explicit rather than being guessed. Recognition uses the SQLite catalog to turn a model label into a landmark.

Route and place data is © OpenStreetMap contributors, and each ride links to the source it came from. The P2P route Circuit Makati ↔ One Ayala is taken from a published news report (see [Data sources and attribution](#data-sources-and-attribution)).

For the data's method, schema and sources see [docs/data/transit-routes.md](docs/data/transit-routes.md), [docs/offline-data.md](docs/offline-data.md) and [docs/data/README.md](docs/data/README.md).

## Landmark recognition

The recognition pipeline runs entirely on the device:

1. **Capture.** `LandmarkCamera` (`src/features/recognition/components/`) asks for camera permission only when the user presses Allow camera. It waits for the preview to be ready, then takes a still photo. Closing the screen unmounts the preview and ignores late results.
2. **Hook.** `useLandmarkRecognition()` loads the model once on mount and exposes `state` (`loading`, `ready`, `unavailable`) and `recognize(uri)`.
3. **Photo checks.** `services/preprocess.ts` crops the centre (224 of 256 pixels on the short side, matching training) and rejects photos that are too dark, too bright or featureless before the model runs.
4. **Inference.** `services/recognition-service.native.ts` loads `assets/models/landmark_model.tflite` with `react-native-fast-tflite`. It prefers Core ML on iOS and the Android GPU delegate, and falls back to the CPU. Before first use it runs a fixed self-check input and compares the output with the expected answer, so a broken delegate is caught.
5. **Scoring.** `services/scoring.ts` validates the output (one finite probability per label, summing to 1 within tolerance) and turns it into a decision:

| `status` | Meaning | UI |
|---|---|---|
| `recognized` | Confidence at or above the threshold (0.83) | Confirm the landmark; offer alternatives |
| `uncertain` | Below the threshold | Show the top candidates and the full manual list |
| `not-a-landmark` | The `other` class wins confidently | Say so and offer manual selection |
| `unclear-photo` | Photo failed the checks (`issue`: `too-dark`, `too-bright`, `low-detail`) | Ask for a retake; offer manual selection |
| `unavailable` | Web, model failed to load, invalid output, or catalog error (`reason`) | Manual selection |

Results never throw. Every failure is a status. The user always confirms a recognised landmark, and nothing low-confidence is accepted automatically.

`services/recognition-service.ts` is the web stub: it reports `unavailable`, so web and Expo Go use the manual fallback and never load the native inference module.

The model's metadata is in `src/features/recognition/model.ts`, which reads `assets/models/landmark_model.json`. The threshold was chosen on validation data for precision (answers were 96% correct on 172 held-out photos, covering about 59% of them). That is a dataset result, not a measurement on a phone. See [docs/recognition.md](docs/recognition.md) for the full pipeline and checks, and [ml/README.md](ml/README.md) for training and results.

## Maps and location

- **`src/features/maps/`** renders the map. `JourneyMap.native.tsx` and `NativeMapSurface.tsx` use `@maplibre/maplibre-react-native` and draw the chosen ride. `JourneyMap.tsx` and `makati-map-surface.web.tsx` are the web fallbacks that use MapLibre GL JS. `services/map-scene.ts` turns landmarks and routes into a scene both renderers can draw. `makati-overview.ts` builds the one-pin-per-landmark overview.
- **Map style.** The default style is OpenFreeMap "Liberty". Set `EXPO_PUBLIC_MAP_STYLE_URL` to use another style. Map tiles need a network connection, so the map background is the only part of the app that does not work offline.
- **Web map worker.** `scripts/copy-maplibre-worker.cjs` runs on `postinstall` and copies the MapLibre worker into `public/`.
- **Location.** `src/features/location/services/location-service.ts` asks for foreground permission, takes a bounded GPS fix, and stops its watcher on success, error or timeout. `proximity.ts` checks the fix quality and ranks boarding points by straight-line distance. Location is only used when the user asks for it.

## Theme and UI

- `src/constants/theme.ts` holds the colour and font tokens. `src/hooks/use-theme.ts` and `use-color-scheme.ts` pick light or dark values. `use-responsive-layout.ts` switches between phone and wide layouts.
- `src/components/commute/theme-provider.tsx` provides the app theme, and `theme.background`, `theme.line` and similar tokens are passed to Expo Router's navigation theme in `_layout.tsx`.
- `src/components/commute/ui.tsx` contains the shared primitives (`Page`, `Intro`, `Card`, `Button`, `Icon`, `Art`, and `BrandLogo`). `motion.tsx` has the shared spring and easing constants, the `PressScale` and `Reveal` wrappers, and the `scroll-top.ts` helper.
- Brand colours and the logo are described in [docs/visual-identity.md](docs/visual-identity.md). The UI rationale is in [docs/mobile-ui.md](docs/mobile-ui.md) and [docs/ui-ux-review.md](docs/ui-ux-review.md).

## Getting started

Requirements: Node 22 and npm. The repository uses `package-lock.json`, so install with npm rather than bun.

```bash
npm install          # also copies the web map worker into public/
npx expo start       # then press w for web, or open a development build
```

Recognition, the native map and GPS use native modules, so **Expo Go can't run them**. Build a development client instead:

```bash
npx expo run:android                              # local build, needs Android Studio
```

`eas.json` currently has only a `preview` profile, so a cloud development client needs a `development` profile (`"developmentClient": true`) added first.

The web build runs the planner, the landmark guide and the Makati overview map. Photo recognition isn't available on the web.

The Expo SDK is pinned in `package.json`. Add packages with `npx expo install <package>` so the version matches the SDK, and run `npx expo install --fix` if something drifts.

## Running on a device and EAS

- **Expo account.** The project's owner is set in `app.json` as `"owner": "sleep-not-found"`. Sign in as that account before running EAS commands: `npx eas-cli@latest login`. Expo Go and EAS show the owner from this field.
- **Project ID.** `extra.eas.projectId` in `app.json` is the EAS project ID. It must belong to the same owner. If you sign in as a different account, run `npx eas-cli@latest init` to link the project to that account. This updates the ID.
- **Builds.** `eas.json` defines a `preview` profile that builds an internal Android APK. Use `npx eas-cli@latest build --profile preview` for a test build.
- **Over-the-air updates** use `eas update`. Changes to native modules or `app.json` plugins need a new native build.
- **Native folders** (`ios/`, `android/`) are generated. Don't edit them by hand. Put native settings in `app.json` and in config plugins (`expo-camera`, `expo-location`, `expo-sqlite`, `@maplibre/maplibre-react-native`, `react-native-fast-tflite`, and others).
- The Android package is `com.anonymous.parapo`. Change it in `app.json` before publishing.

## Scripts and tests

| Command | What it does |
|---|---|
| `npm run lint` | Expo lint (ESLint, with `eslint-config-expo`) |
| `npx tsc --noEmit` | Typecheck (strict mode, `@/*` → `src/*`) |
| `npm run check:journeys` | Journey data: all 182 pairs, leg chaining, planner API |
| `npm run check:recognition` | Model metadata, decision rules, photo checks, delegate self-check |
| `npm run check:camera` | Camera screen flow, with native APIs mocked |
| `npm run check:maps` | Map scene building |
| `npm run check:location` | GPS permission handling and ranking |
| `npm run check:offline-data` | SQLite catalog, schema and seeding |
| `npm run report:offline-coverage` | Coverage report for the bundled dataset |
| `node scripts/check-icons.cjs` | Checks that the icon components render from the source |
| `npx expo-doctor` | Dependency and config diagnostics |

Unit tests sit next to their code as `*.test.mjs` (for example `place-id.test.mjs`, `journey-selection.test.mjs`, `commuter-data.test.mjs`, `responsive-layout.test.mjs`). The `check:*` scripts test logic with native modules mocked. They don't replace testing on a device, and recognition accuracy, GPU and Core ML speed, and the native map haven't been tested on a physical phone yet.

Before merging, run `npx tsc --noEmit` and `npm run lint`.

## Rebuilding the data and model

- **Journeys.** `python3 tools/transit/fetch_osm.py` downloads the OpenStreetMap data into `tools/transit/cache/` (ignored by git). Then `python3 tools/transit/build_journeys.py` writes `src/features/transport/planner/makati-journeys.json`. See [docs/data/transit-routes.md](docs/data/transit-routes.md).
- **Landmark model.** Create a Python 3.12 environment in `ml/` and install `ml/requirements.txt`. Then run `ml/.venv/bin/python ml/train.py --data-dir <your data dir>`. Training only writes `ml/models/` when every release check passes. Copy `landmark_model.tflite` and `model_meta.json` (renamed to `landmark_model.json`) into `assets/models/`. See [ml/README.md](ml/README.md).
- **Logo.** `ml/.venv/bin/python tools/brand/make_brand_assets.py` regenerates the logo assets from `tools/brand/brand-board.png`.

Landmark training photos aren't in the repository. Most come from web and video sources with their own copyright, so `ml/` keeps the source lists (`commons_sources.csv`, `web_sources.csv`, `videos.csv`) needed to rebuild the set.

## Conventions

- Use the `@/` alias for imports from `src/` and `@/assets/` for files in `assets/`.
- Keep static SQL in `src/database/` and bind user or data values with parameters.
- Follow `AGENTS.md`: use `npx expo install` for packages and check Expo's versioned docs before using an Expo, EAS or React Native API.
- Keep route files in `src/app/` and everything else outside it.
- Don't add placeholder model binaries or invented data. Missing route or fare details stay missing, and the UI says so.

## Data sources and attribution

- Route and place data: © OpenStreetMap contributors, under the [Open Database License](https://www.openstreetmap.org/copyright).
- Map tiles and style: [OpenFreeMap](https://openfreemap.org/), with OpenStreetMap data. The style URL can be changed with `EXPO_PUBLIC_MAP_STYLE_URL`.
- The Circuit Makati ↔ One Ayala P2P is taken from a published news report (TopGear Philippines, 28 April 2026).
- Each ride in the app links to the source it was built from.
- Inter font: SIL Open Font License (see `assets/fonts/OFL.txt`).

## Status and limits

- Times are estimates. Schedules, fares and service changes aren't in the data. Check the signboard before boarding.
- Recognition accuracy is measured on held-out test photos, not on phones. On-device capture, GPU and Core ML speed, airplane-mode behaviour and the native map haven't been tested on a physical device yet.
- Only the 14 landmarks in the pilot are supported, all in Makati.
- The Ride screen uses the bundled planner. The SQLite lookups and guidance-completeness checks are built and tested, but they aren't yet the main path for the screens.

## Documentation

- [Codebase & Q&A Pocket Guide](docs/QNA-README.md): short explanations, key numbers and ready-to-say answers
- [docs/architecture.md](docs/architecture.md): how the app is put together and the branch ownership rules
- [docs/recognition.md](docs/recognition.md): recognition pipeline, decision rules and checks
- [docs/offline-data.md](docs/offline-data.md) and [docs/offline-data-verification.md](docs/offline-data-verification.md): SQLite catalog and its verification
- [docs/data/transit-routes.md](docs/data/transit-routes.md) and [docs/data/README.md](docs/data/README.md): journey data, method and sources
- [docs/maps.md](docs/maps.md): map requirements, attribution and offline fallback
- [docs/mobile-ui.md](docs/mobile-ui.md), [docs/ui-ux-review.md](docs/ui-ux-review.md) and [docs/visual-identity.md](docs/visual-identity.md): UI and brand
- [docs/android-build-handoff.md](docs/android-build-handoff.md): Android build notes
- [ml/README.md](ml/README.md): training, data and results

## License

[LICENSE](LICENSE) currently contains the MIT licence text from Expo's starter template, which names Expo as the copyright holder. Replace it with the project's own licence before publishing.
