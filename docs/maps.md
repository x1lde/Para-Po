# Optional online maps

Branch: `features/map`. This increment adds a Map tab using the existing `src/app/map.tsx` routing directory, MapLibre React Native 11.5, and the OpenFreeMap Liberty style. Existing Home/Explore screens remain in place. Offline lookup and seed data are unchanged.

## Behavior

- Online Android/iOS native builds display a Makati-area overview. The camera centre is not a user location or boarding-point marker.
- Offline connectivity shows a map-unavailable state. Style loading failure or a 20-second loading timeout offers retry. Native rendering/import errors are isolated inside the map boundary.
- Expo Go shows a build-required fallback before loading MapLibre. Web shows a platform fallback and never imports the native map library.
- Database coordinates remain null. The map now uses six separately sourced approximate landmark/site references for supported journeys; these are not boarding stops. GPS is requested only when the user taps Use GPS. No geocoding or remote route lookup is requested.
- MapLibre's attribution control stays enabled. The basemap/style is online; core commuting lookup does not depend on it. No downloadable offline map is implemented.

MapLibre [requires a native rebuild and cannot run in Expo Go](https://maplibre.org/maplibre-react-native/docs/setup/expo/). Its published peer range accepts this project's Expo 57/React Native 0.86 versions; actual native compilation and rendering still need build/device verification. [OpenFreeMap](https://openfreemap.org/quick_start/) provides the style for MapLibre Native. It requires no API key; keep OpenMapTiles/OpenStreetMap attribution visible. An optional `EXPO_PUBLIC_MAP_STYLE_URL` can point to another permitted HTTPS style. Public Expo variables are not secret storage.

## Frontend integration

```tsx
import { buildMapScene } from '@/features/maps/services/map-scene';
import { TransportMap } from '@/features/maps/components/TransportMap';

// result comes from lookupTransportation(). Keep recommendation text outside the map.
const scene = buildMapScene(result);
// Render <TransportMap scene={scene} /> alongside the recommendation.
```

The native Map tab now loads the manual origin catalog, origin-filtered destinations, and selected offline lookup. Recommendation text remains outside the map and visible on map failure. Requests are sequenced to ignore stale selections. The web fallback does not start native SQLite or GPS calls.

The adapter converts valid coordinates to MapLibre's `[longitude, latitude]` order, deduplicates shared points, and reports omitted names. Unconfirmed boarding sites remain omitted even if candidate coordinates exist. Origin/destination pins can use sourced site references passed as a third argument; they are labeled approximate and never fill boarding coordinates. Null, non-finite, and out-of-range pairs are rejected.

For predefined vehicle geometry, pass an optional second argument of `MapRouteGeometry[]`. Each entry needs an eligible `routeId`, source reference, and at least two valid coordinate pairs. Geometry for unrelated routes is discarded. The adapter never draws a line by joining origin, boarding, and destination points. No real route geometry is bundled yet; retain source provenance when adding it.

## Running on Android

The MapLibre config plugin is registered in `app.json`; do not manually create native directories. `eas.json` provides an internal `preview` APK profile. When ready to build, use `npx eas-cli@latest build --platform android --profile preview`, then install the resulting APK. A cloud build/login has not been started by this task. A development build is another option once the team configures its development-client workflow.

EAS may prompt for project setup and an Android application identifier because those are not yet configured in this repository. Agree on that identifier with the team before building. EAS is a developer build service, not a runtime backend or commuter login requirement.

Run `npm run lint`, `npx tsc --noEmit`, `npm run check:maps`, and `npm run check:offline-data` (Windows PowerShell: `npm.cmd`/`npx.cmd` if needed). Map checks use synthetic fixtures in the pure production adapter; they do not validate native rendering. On a device, check online tiles, gestures, visible attribution, airplane-mode fallback, failed style URL, retry, and optional markers once reviewed coordinates exist. Map failures must leave the surrounding recommendation visible.

## Checks performed

### Map usability additions

The latest screen changes add a marker legend, clearer journey controls, and selectable boarding-point summaries below the map. Summaries are derived only from eligible local lookup results, remain visible without map connectivity or confirmed coordinates, and explicitly label unavailable distances and positions. Selecting a stop highlights its recommendation cards and its marker when a confirmed marker exists. Selecting a route option also highlights its sourced vehicle geometry when supplied; the bundled geometry registry remains empty.

A foreground GPS fix with a positive finite reported accuracy produces a geographic uncertainty polygon in metres around the user marker. Unknown or zero accuracy has no polygon. The shaded area reports device uncertainty, not a guaranteed boundary or walking radius. Expired fixes remove the position and area together.

GPS has independent refresh and cancellation controls. Map loading failures have their own retry control; retrying the map does not request GPS or reload the SQLite journey. Selection changes update map data without remounting the map. Connectivity restoration lets the map render again while offline guidance remains available.

Checks were initially paused at the user's request, then resumed for a review of the current implementation. Current results: 11 map-scene checks (including GPS polygon closure, radius, and invalid accuracy handling), nine mocked location checks, all 12 offline-data checks, and lint pass. Android Hermes and web static exports pass; outputs are under ignored `.expo/maps-review-*` directories. Android export first hit a sandbox permission error executing Hermes and passed when rerun outside the sandbox.

The review found a TypeScript error at `JourneyMap.native.tsx:151`: the boarding-list distance label could pass a value typed `number | null` to `Math.round`. The follow-up fix explicitly handles both null and undefined as “Distance unavailable,” preserving valid zero distances. TypeScript and lint both pass after this fix. No additional pre-existing errors were reported by these checks.

These results do not validate native map rendering, tap/highlight interactions, recovery controls, the visual GPS circle, or Android native compilation. Those require a native build and device/emulator checks. Earlier results below describe the previous implementation, before these additions.

### Five map enhancements

1. Journey selection is connected to the local backend. Six current recommendation combinations can be selected; uncovered origins explain limited coverage.
2. Use GPS requests foreground permission and obtains a bounded one-time fix. Its watcher is removed after success, failure, abort, or 20-second timeout. Denied permission, disabled services, and inaccurate fixes preserve manual selection. A reliable fix requires reported accuracy no worse than 100 metres and a timestamp no older than two minutes; fixes expire from the UI after that time. No background location or location history is implemented.
3. Tapping a marker shows its name, kind-specific details, relevant route names, and source when available. Approximate landmark references are distinguished from boarding sites and device positions.
4. Show this journey fits the selected landmark/route positions, excluding distant GPS positions. A successful GPS request focuses the device position separately.
5. The screen passes the sourced geometry registry through eligibility validation into the line layer. The registry is currently empty because no defensible vehicle geometry has been supplied. Path rendering is wired, but no actual vehicle line is claimed yet.

Location services are in `src/features/location/services/`. Haversine ranking consumes only the lookup's eligible options and confirmed boarding coordinates, with a reliable current fix. Unknown or unconfirmed points remain unranked. Distance is labeled straight-line from GPS, never walking distance. Current boarding coordinates are unavailable, so nearest-stop ranking cannot yet produce a real nearest stop.

`src/features/maps/data/map-references.ts` keeps published site references separate from SQLite and actual stops. It cites each mapped location. OSM-derived records require [OpenStreetMap contributor attribution](https://www.openstreetmap.org/copyright); the map's attribution control stays enabled. The Circuit point uses the previously researched place endpoint, not the conflicting directory candidate. The Landmark reference is from an older lower-confidence directory and is explicitly approximate. No reference is promoted to a bus-loading curb.

Run `npm run check:location` in addition to the existing commands. Nine map-adapter and nine location checks pass; location provider/permission responses and timers are mocked, not real GPS. Native marker events, camera actions, permission prompts, and rendered polylines still need a native-build/device check.

TypeScript and lint passed. Nine map-scene checks, nine mocked location checks, and all 12 existing offline-data checks passed. Android Hermes export and web static export both passed; `/map` is included in web output and uses the platform fallback. Latest bundle outputs are under ignored `.expo/maps-journey-check-*` directories. These checks do not compile MapLibre's Android native code or certify device rendering, GPS, connectivity transitions, or callbacks. Those remain native-build/device checks.
