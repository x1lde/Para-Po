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

The result preserves all lookup statuses and evidence. `rankedOptions` includes only complete or source-based recommendations; incomplete guidance cannot become a nearest-stop recommendation. `locationStatus` distinguishes absent, usable, and unusable fixes. `nearestOption` is null when no eligible confirmed stop can be measured. Distances are straight-line estimates; a GPS fix does not replace the selected landmark. Storage failures still reject and must be shown with retry. Ride now loads the native SQLite catalog and calls this facade before navigation. The native Map screen displays its published-guidance statuses, retry errors, and ranked results. GPS updates use rankJourneyRecommendations on the loaded lookup without requerying SQLite. Existing OpenStreetMap-derived planner candidates remain a separate, explicitly unconfirmed layer.

`getDatasetCoverage(dataset)` in `src/database/dataset-coverage.ts` validates bundled reference relationships and reports supported pairs, missing guidance, absent boarding coordinates/model labels, and origins without recommendations. It is a bundled-data report, not an installed SQLite health check or live service availability assertion.

Run `npm run report:offline-coverage` to inspect it. From the project root, `node scripts/report-offline-coverage.cjs` emits JSON without opening native SQLite. Current coverage is eight sourced pairs, zero fully ready pairs, two boarding points without confirmed coordinates, and ten origins without published outbound recommendations. All 14 landmark classification labels are mapped.

## Data work

Dataset 6 added sourced One Ayala floor-level boarding orientation and clarified the inbound final stop. Dataset 7 adds SM Makati and Glorietta as origins for the existing One Ayala-to-Circuit bus leg, using published terminal-access connections. All unknown coordinates and access/boarding verification flags remain unchanged. See [research and evidence limits](./data/backend-research-2026-10-10.md). Existing databases receive the revised bundled guidance through normal transactional reseeding; schema remains version 3.

Useful manual suggestions remain distinct from complete access guidance. Nearest confirmed-stop ranking still requires route-specific stop coordinates and review. Existing OpenStreetMap vehicle paths can be visualized as mapped candidates, but they are not substituted for confirmed boarding points in SQLite. Verified additional routes may be added to the existing schema for supported origin/destination pairs; multi-transfer routing is outside this addition.

No ML model, route, boarding coordinate, or street-by-street walking path is generated to fill an evidence gap. No backend server, authentication, cloud database, or new dependency is required. Device acceptance remains described in [Android build handoff](./android-build-handoff.md).

Verification resumed at the user's request. The upgrade checks cover dataset 5 to 6 to 7, stable underscore IDs, model labels, foreign-key integrity, same-version missing-reference repair, and transactional rollback. Readiness now recomputes guidance issues instead of trusting a stale array. Whitespace-padded classification labels are rejected, and cleanup errors do not mask initialization failures.

The latest imported model uses staged downsampling to reduce Android aliasing and a reference-output self-check to detect incompatible delegates or mismatched model metadata. A host CPU inference check on the actual bundled TFLite artifact matched the stored reference with maximum probability error below 0.000001. This verifies the artifact, not the user's screen-photo accuracy; an original failing image or device capture remains required for that case. The first submitted APK predates the imported model/preprocessing changes and must not be used to assess the new code.

Validation results: TypeScript and lint pass; Android Hermes and web static exports pass. The 106 regression checks comprise 20 offline-data, 16 recognition, nine camera, 11 map-scene, nine location, three Ride/backend, 14 selection/layout/integration, and 24 Python tests. The Python tests use an ignored isolated CPU environment at `.expo/ml-verification-env`; system NumPy/TensorFlow were initially absent. The Windows recognition harness path normalization was restored after the merge so native mocks resolve properly. Native SQLite, permissions, real GPS, camera capture, and rendered map interaction still need an installed APK check.
