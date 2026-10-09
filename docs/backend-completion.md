# Offline backend completion

SQLite initialization, migrations, atomic versioned seeding, model-label mapping, deterministic route lookup, and standalone location-distance logic already exist. The remaining MVP work is primarily verified data and physical Android acceptance rather than a cloud backend.

## Added backend entry points

`getJourneyRecommendations()` in `src/features/transport/services/recommendation-service.ts` combines the existing lookup with eligible boarding-point ranking:

```ts
import { getJourneyRecommendations } from '@/features/transport/services/recommendation-service';

const recommendation = await getJourneyRecommendations({
  originId: 'ayala_malls_circuit',
  destinationId: 'one_ayala',
  location: null, // Or an explicit foreground LocationFix; never requested automatically.
});
```

The result preserves all lookup statuses and evidence. `rankedOptions` includes only complete or source-based recommendations; incomplete guidance cannot become a nearest-stop recommendation. `locationStatus` distinguishes absent, usable, and unusable fixes. `nearestOption` is null when no eligible confirmed stop can be measured. Distances are straight-line estimates; a GPS fix does not replace the selected landmark. Storage failures still reject and must be shown with retry. The facade is available for UI integration; it does not replace the existing screen controllers automatically.

`getDatasetCoverage(dataset)` in `src/database/dataset-coverage.ts` validates bundled reference relationships and reports supported pairs, missing guidance, absent boarding coordinates/model labels, and origins without recommendations. It is a bundled-data report, not an installed SQLite health check or live service availability assertion.

Run `npm run report:offline-coverage` to inspect it. From the project root, `node scripts/report-offline-coverage.cjs` emits JSON without opening native SQLite. Current coverage is six sourced pairs, zero fully ready pairs, two boarding points without coordinates, and twelve origins without outbound recommendations. All 14 landmark classification labels are mapped.

## Data work

Dataset 6 adds sourced One Ayala floor-level boarding orientation and clarifies the inbound final stop. All unknown coordinates and access/boarding verification flags remain unchanged. See [research and evidence limits](./data/backend-research-2026-10-10.md). Existing databases receive the revised bundled guidance through normal transactional reseeding; schema remains version 3.

Useful manual suggestions remain distinct from complete access guidance. Neither nearest-stop ranking nor actual vehicle map lines can be demonstrated until their required data is supplied. Verified additional routes may be added to the existing schema for supported origin/destination pairs; multi-transfer routing is outside this addition.

No ML model, route, boarding coordinate, or street-by-street walking path is generated to fill an evidence gap. No backend server, authentication, cloud database, or new dependency is required. Device acceptance remains described in [Android build handoff](./android-build-handoff.md).

Validation was paused during this work at the user's request. Before the pause, the expanded offline-data script reported 16 passing groups. Subsequent recognition recovery changes have not had tests, lint, typecheck, inference, or a new build run. Resume checks before integrating these additions into an APK. The already submitted EAS build contains the earlier source snapshot, not these uncommitted changes.
