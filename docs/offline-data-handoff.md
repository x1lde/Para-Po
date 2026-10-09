# Offline-data handoff to mobile UI

No model is required for the manual flow. This branch supplies data and services, not screens.

See [branch-integration.md](./branch-integration.md) for frontend wiring order, UI/UX states, ML/GPS/map responsibilities, and team acceptance checks.

## Public entry points

Import these from `@/database/repositories/transport-repository`:

- `listLandmarks()`: the 14-place manual origin catalog, sorted by name and ID.
- `listDestinations()`: the full candidate destination catalog; membership does not imply a covered route.
- `listDestinationsForOrigin(landmarkId)`: includes complete and explicitly source-based options. Circuit has five destinations; One Ayala has Circuit. Pass `false` as the second argument for complete guidance only, which currently yields none.
- `getDatasetMetadata()`: installed dataset version and source notes.

Import `lookupTransportation()` from `@/features/transport/services/transport-service`. Pass stable landmark and destination IDs. It resolves records and returns a typed result; database failures reject separately.

Web-sourced fallback is enabled by default. Pass `false` as the third argument to restrict results to complete guidance.

```ts
import { listLandmarks, listDestinations } from '@/database/repositories/transport-repository';
import { lookupTransportation } from '@/features/transport/services/transport-service';

// Run inside the UI's loading/retry/error flow; this example is not a screen.
const origins = await listLandmarks();
const destinations = await listDestinations();
const result = await lookupTransportation('ayala_malls_circuit', 'one_ayala');
```

## Result handling

| Status | Meaning and presentation |
| --- | --- |
| `available` | Display ready route options and their recorded instructions. This result excludes incomplete alternatives. |
| `source-based` | Display a web-sourced suggestion with its source, review date, limitations, and missing-detail flags. Do not label it field-verified or guaranteed current operation. |
| `incomplete-guidance` | Published/reference options exist but needed guidance is missing or unconfirmed. Show an unavailable-guidance state; do not present these as ready recommendations. |
| `no-routes` | Both places exist but no direct route/boarding relationship was bundled for this pair. |
| `already-at-destination` | User selected the same place as origin and destination; no vehicle recommendation needed. |
| `unsupported-origin` | Origin ID is absent from the catalog. |
| `unsupported-destination` | Destination ID is absent from the catalog. |

Database failures must be caught and shown as storage/loading errors with retry. They are not `no-routes` or unsupported-place results. There is no internet fallback in this service.

## Reading an option

| Field | UI responsibility |
| --- | --- |
| `route.name`, `route.transportationType` | Named directional service and vehicle. |
| `boardingPoint.name` | Boarding site. |
| `originWalkingInstructions` | Recorded access from the selected landmark. |
| `boardingInstructions` | Direction/queue guidance for this route at this point. |
| `route.alightingLocation`, `route.alightingInstructions` | Where to get off and recorded guidance. |
| `route.destinationWalkingInstructions` | Remaining pedestrian access, or explicit reviewed no-walk wording. |
| `route.evidenceStatus`, `route.sourceReference`, `route.reviewedOn`, `route.limitations` | Source/review context; never label a scoped publication claim as a guaranteed current service. |
| `guidanceIssues` | Missing evidence/access/instructions; map codes to plain wording if shown in a review UI. |

Missing text is null; never generate directions to fill it. Missing coordinates are a null pair. `classificationLabel` can be null for manual selection, so UI must not assume it is already an ML class.

Landmark and destination IDs now use underscores: for example, `ayala_malls_circuit`, `one_ayala`, and `sm_makati`. Dataset 4 atomically replaces older bundled catalogs and their foreign-key references on initialization; no schema change or reinstall is required. Update any cached selections or integration code using the old dashed place IDs. Route and boarding-point IDs retain their existing values, as they are not ML classes. Map defaults, site references, worksheets, and lookup examples use the new place IDs.

This changes separators only, not the wording of place identifiers. `classificationLabel` now holds the bundled model's output label for each landmark (dataset version 5); see `docs/recognition.md`. The model's extra `other` class means "not a supported landmark" and has no landmark row. If inference returns these exact canonical place IDs, pass the recognized ID to `findLandmark` or `lookupTransportation` after handling unknown/low-confidence results.

The issue `boarding-coordinates-unavailable` alone does not block a ready manual recommendation. The location/maps teammate must skip distance ranking for those points. All other issue codes block ready guidance. `isGuidanceReady()` in the guidance service is the shared rule if consuming lower-level repository options.

## Current expected outcomes (not executed tests)

- All 14 places appear in both catalogs with stable IDs, null runtime coordinates, and null ML labels on landmarks.
- Circuit to One Ayala and One Ayala to Circuit return `source-based` by default. Circuit to SM Makati, Glorietta, Landmark, and Greenbelt returns source-based bus-plus-walk suggestions.
- Disabling source-based fallback returns `incomplete-guidance` for those combinations.
- Uncovered pairs such as RCBC Plaza to Power Plant Mall return `no-routes`.
- Same-ID selections return `already-at-destination` after validating both IDs.
- Invalid IDs return their respective unsupported status.
- Dataset metadata is version 4; schema is version 3.

See [web recommendations](./data/web-recommendations.md) for the six bundled suggestions and presentation requirements. Refer to the deferred verification checklist before Android demonstration.
