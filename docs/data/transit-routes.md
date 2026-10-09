# Landmark-to-landmark transit recommendations

ParaPo! recommends how to get between any two of the 14 supported Makati landmarks (182 ordered pairs): walking,
a direct jeepney / bus / P2P ride, or a ride with one transfer. Everything is bundled and works offline.

- Data: `src/features/transport/planner/makati-journeys.json` (generated, ~250 KB)
- API: `planJourney(originId, destinationId)` in `src/features/transport/planner/journey-planner.ts`
- UI: `JourneyOptions` (web planner, native map screen, camera screen after a landmark is recognized)
- Checks: `npm run check:journeys`

## Where the data comes from

| Source | What | How |
|---|---|---|
| OpenStreetMap (© OpenStreetMap contributors, ODbL) | 400 public-transport route relations around Makati, their road geometry and mapped stops; the 14 landmark positions | `tools/transit/fetch_osm.py` queries the public Overpass API (several mirrors, retries) and caches the raw JSON in `tools/transit/cache/` (git-ignored) |
| TopGear PH, 28 Apr 2026 | The Circuit Makati ↔ One Ayala P2P, which isn't mapped in OSM yet | Added in `build_journeys.py` (`PUBLISHED`) with its two terminals; no path geometry |

OSM attribution is shown under every set of results in the app, and each ride links to its source (OSM relation
or article) under "Route sources".

## How recommendations are built (`tools/transit/build_journeys.py`)

1. Each route relation's ways are chained in travel order; its stop/platform nodes are placed along that line.
   Provincial buses (PITX–Lucena, Bataan, …) are excluded — they don't carry passengers within Makati.
2. Boarding and alighting happen at a route's **mapped stops** within 450 m of the landmark. Modern jeepney routes
   without mapped stops are treated as hail-anywhere along the street they run on. P2P and UV Express services
   load only at their first (terminal) stop.
3. A **direct ride** needs a route passing the origin and then, later in its direction of travel, the destination
   (relations are one-directional, so return trips use the opposite relation). Rides under 500 m, or detours longer
   than 3× the straight distance + 1.5 km, are dropped. Variants of one signboard collapse into one entry.
4. **Walking** is offered up to 1.6 km straight-line. Near places only get a ride if it isn't more than 5 minutes
   slower than walking (Greenbelt → Glorietta: walk).
5. **One transfer** is searched only when no direct ride exists: the two routes must pass within 250 m of each other.
   If nothing is found, a relaxed search allows a 700 m walk to the route, 400 m transfers and 400 m legs.
6. Estimates: walking = straight line × 1.3 at 75 m/min; rides at ~15 km/h plus a typical wait (6–15 min by mode).

Result: 84 pairs are best walked, 70 by a direct ride and 28 with one transfer; 31 distinct routes are used.

## Refreshing

```bash
python3 tools/transit/fetch_osm.py        # re-download (needs network)
python3 tools/transit/build_journeys.py   # rebuild the JSON (offline, ~2 min)
npm run check:journeys
```

## Limits

- Community-mapped routes can lag behind route rationalization changes; the app tells riders to check the
  signboard, and every option shows its source.
- Times are estimates, not schedules; fares and operating hours aren't included (except the published P2P note).
- Mall-to-mall walks use straight-line distance × 1.3, not indoor connector paths.
