# ParaPo!

**Your commute, made simpler.** ParaPo! helps you get around Makati by starting from a place you already know.
Point your camera at a landmark, or choose one, and see how to get to another: walk, jeepney, bus, P2P, or a ride with one transfer.

The current release covers a pilot of 14 Makati landmarks, from Ayala Center to Salcedo Weekend Market.

## Features

- **Landmark recognition, on the device.** A bundled MobileNetV3 model (TensorFlow Lite) recognises the landmark in a photo. It runs offline, and it rejects blank, too-dark or too-bright photos before guessing. Recognition is optional; choosing a landmark by hand always works.
- **Journey planner, offline.** Every pair of the 14 landmarks has ranked options with boarding and alighting points, walking distances, estimated times and route sources. The data is bundled, built from OpenStreetMap.
- **Live map of Makati.** A MapLibre map shows the supported landmarks. On the Android app it also draws the chosen ride; the web preview uses MapLibre GL JS.
- **Optional GPS.** "Use my location" picks the nearest supported landmark as your starting point. It's never required.

## Getting started

Requirements: Node 22 and npm. The repository uses `package-lock.json`, so use npm (not bun) for installs.

```bash
npm install          # also copies the web map worker into public/
npx expo start       # then press w for web, or open a development build
```

Recognition and the interactive map use native modules, so **Expo Go can't run them**. Build a development client instead:

```bash
npx expo run:android            # local, needs Android Studio
npx eas-cli@latest build --profile development   # cloud build
```

The web build runs the planner, the landmark guide and the Makati overview map. Photo recognition isn't available on the web.

## Scripts

| Command | What it does |
|---|---|
| `npm run lint` | Expo lint (ESLint) |
| `npx tsc --noEmit` | Typecheck |
| `npm run check:journeys` | Journey data: all 182 pairs, leg chaining, planner API |
| `npm run check:recognition` | Model metadata, decision rules, photo gate, delegate self-check |
| `npm run check:camera` | Camera screen flow with mocked native APIs |
| `npm run check:maps` / `check:location` / `check:offline-data` | Map scene, GPS handling, SQLite catalog |
| `npm run report:offline-coverage` | Coverage report for the offline dataset |
| `npx expo-doctor` | Dependency and config diagnostics |

The `check:*` scripts test logic with native modules mocked. They don't replace testing on a device.

## Project layout

```
src/app/                 Expo Router screens (file-based routes; _layout.tsx defines navigators)
src/components/commute/  Shared UI: app shell, cards, buttons, the Makati map card
src/features/
  recognition/           Camera, TFLite model service, photo gate, score validation
  transport/planner/     Generated journey data and the planJourney() API
  maps/                  MapLibre surfaces (native and web), map scenes
  location/              Optional GPS
src/database/            Bundled dataset, SQLite schema and seeding
assets/                  Model (assets/models), logo (assets/brand), icons, fonts
ml/                      Landmark classifier: data fetchers, training, tests
tools/transit/           Rebuilds the journey data from OpenStreetMap
tools/brand/             Cuts the logo out of the brand board
docs/                    Design, data and feature notes (start with architecture.md)
```

## Rebuilding the data and model

- **Journeys:** `python3 tools/transit/fetch_osm.py` then `python3 tools/transit/build_journeys.py`. See [docs/data/transit-routes.md](docs/data/transit-routes.md).
- **Landmark model:** create a Python 3.12 environment in `ml/` and run `ml/.venv/bin/python ml/train.py`. Training only writes `ml/models/` when every release check passes. Copy the `.tflite` and `model_meta.json` into `assets/models/` (the second as `landmark_model.json`). See [ml/README.md](ml/README.md).
- **Logo:** `ml/.venv/bin/python tools/brand/make_brand_assets.py` regenerates the logo assets from the brand board.

Landmark training photos aren't in the repository. Most come from web and video sources with their own copyright, so `ml/` keeps the source lists needed to rebuild the set.

## Data sources and attribution

- Route and place data: © OpenStreetMap contributors, under the [Open Database License](https://www.openstreetmap.org/copyright).
- Map tiles and style: [OpenFreeMap](https://openfreemap.org/), with OpenStreetMap data. The style URL can be changed with `EXPO_PUBLIC_MAP_STYLE_URL`.
- The Circuit Makati ↔ One Ayala P2P is taken from a published news report (TopGear Philippines, 28 April 2026).
- Each ride in the app links to the source it was built from.

## Status and limits

- Times are estimates. Schedules, fares and service changes aren't in the data; check the signboard before boarding.
- Recognition accuracy is measured on held-out test photos, not on phones. On-device camera capture, GPU/Core ML speed and the native map haven't been tested on a physical device yet.
- Only 14 landmarks are supported, all in Makati.

## Documentation

- [docs/architecture.md](docs/architecture.md): how the app is put together
- [docs/recognition.md](docs/recognition.md): recognition pipeline and checks
- [docs/data/transit-routes.md](docs/data/transit-routes.md): journey data, method and sources
- [docs/maps.md](docs/maps.md) and [docs/visual-identity.md](docs/visual-identity.md)
- [ml/README.md](ml/README.md): training, data and results

## License

[LICENSE](LICENSE) currently contains the MIT licence text from Expo's starter template, which names Expo as the copyright holder. Replace it with the project's own licence before publishing.
