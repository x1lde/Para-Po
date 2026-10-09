# Offline data foundation

This increment provides SQLite initialization, typed reference data, bundled seed support, and a deterministic landmark-to-destination lookup. It is not connected to a screen yet. No real or mock transportation dataset is included.

## Files and entry points

- `src/features/transport/types.ts`: landmark, destination, boarding point, route, and lookup result contracts.
- `src/database/schema.ts`: version 1 schema and constraints.
- `src/database/seed.ts`: the complete bundled dataset and transactional seed writes.
- `src/database/client.ts`: lazy `getDatabase()` initialization, cached across concurrent callers. Failed initialization can be retried.
- `src/database/repositories/transport-repository.ts`: `listLandmarks()`, `listDestinations()`, individual lookups, and origin/destination-filtered boarding options.
- `src/features/transport/services/transport-service.ts`: `lookupTransportation(landmarkId, destinationId)`.

The SQLite implementation follows the [Expo SDK 57 SQLite documentation](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/). Initialization enables WAL and foreign keys before a transaction on the same connection. The connection is returned only after schema creation and seeding complete. SQL values are parameterized; only static schema statements use `execAsync`.

The target for device verification is Android. Web SQLite setup is outside this increment. Existing screens do not import the new database module, so their current startup behavior is preserved.

## Data relationships

- A destination is a supported selectable endpoint with verified coordinates.
- Each route represents one direction toward one destination. Give opposite directions distinct route identifiers.
- `route_boarding_points` links a route to its eligible boarding points in stop order. Do not include a terminal where passengers cannot board toward that route's destination.
- `landmark_boarding_points` explicitly links a landmark to boarding locations verified as accessible from it. Coordinates alone do not establish accessibility.
- The lookup returns only routes serving the destination and boarding points associated with the selected landmark. Results have a stable display order; they are not ranked by proximity.
- There is no transfer planning, walking routing, fare estimate, schedule, live vehicle data, or generated route information.

SQLite enforces foreign keys, unique model labels, coordinate ranges, allowed transport types, and unique stop ordering per route. Verification of real-world route direction and boarding suitability still requires the team to review its sources.

## Adding the pilot dataset

The team supplied the following 15 candidate landmark names. The [pilot data worksheets](./data/README.md) now include sourced online location and transportation leads; see [research notes](./data/research.md) for uncertainty and gaps. Model labels and field-verified journey data have not been supplied, and the runtime seed remains empty. Keep all 15 candidates and add verified journey coverage incrementally.

- Ayala Center
- Avida Towers Makati Southpoint
- Ayala Malls Circuit
- St. John Bosco Parish
- Manila Premiere Wines
- RCBC Plaza
- SM Makati
- The Landmark Makati (provided as "The Lankdmark Makati"; confirm the final display name)
- Greenbelt by Ayala
- Glorietta by Ayala
- Powerplant Mall
- Makati City Hall
- Ayala Museum
- One Ayala by Ayala Malls
- Salcedo Weekend Market

Do not assume that a candidate landmark is also a supported destination. Record which entrances or exact sites the coordinates identify, especially for complexes that overlap. Verify each route's travel direction and boarding suitability for the chosen destination.

1. Select the pilot corridor and collect verified landmarks, destinations, directional routes, and boarding points.
2. Record source references, verification dates, and relevant limitations in `sourceNotes` and supporting documentation. Obtain boarding coordinates and route direction from actual evidence.
3. Agree on stable landmark identifiers with the ML branch. `classificationLabel` must match the model's label mapping; the application passes the corresponding landmark ID to the transport service.
4. Populate `bundledDataset` in `src/database/seed.ts`, including both relationship arrays. Never treat test fixtures as verified seed data.
5. Increase the dataset version from 0 to 1 for the first verified dataset, and increment it on every later data change. A version must identify one complete dataset.

Schema version and dataset version are independent. Repeated launches with the same version skip reseeding. A higher dataset version replaces only bundled reference tables within the initialization transaction. Any insertion failure rolls back the replacement. A newer local schema or dataset is rejected rather than silently downgraded. Future user-owned data must live outside these reference tables.

The bundled data is available without first-launch downloads. Until verified data is added, selection lists are empty and arbitrary IDs return unsupported results.

## UI integration contract

Use `listLandmarks()` for manual fallback selection and `listDestinations()` for the supported destination list. Call `lookupTransportation()` with their IDs.

| Result status | Intended UI response |
| --- | --- |
| `available` | Show the destination, route name, vehicle type, and eligible boarding locations. |
| `unsupported-origin` | Ask the user to select a supported landmark. |
| `unsupported-destination` | Ask the user to select a supported destination. |
| `no-routes` | Explain that no verified direct option is available for this combination. |

Database failures reject the promise and must be handled separately from an empty lookup. Do not display a storage error as an unsupported location. The mobile UI branch owns loading, retry, and error presentation.

GPS-based distance ranking remains for the location/maps branch: filter eligible options before measuring distance, handle missing GPS, and label Haversine results as straight-line distances. Maps must not be a prerequisite for this lookup.

## Deferred verification

Before connecting this to the demo, verify on Android: first launch in airplane mode, repeat initialization, complete pilot lookups, unsupported combinations, invalid seed rollback, and dataset version upgrades. Add isolated synthetic fixtures for tests only; do not put them into the bundled dataset. Check GPS ranking separately when implemented.
