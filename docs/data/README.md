# Pilot data worksheets

Manila Premiere Wines was removed at the team's request because there are insufficient training images. Dataset version 3 removes it from both runtime catalogs on upgrade; the six recommendations are unchanged.

Use these CSV files in a spreadsheet to collect Para-Po's offline reference data. All 14 user-supplied landmark names are retained. Destination rows are candidates based on the same names; they do not assert transportation coverage. Online research now supplies provisional coordinates and route/boarding leads where sources were available. Model labels and unknown details remain blank. Read [research.md](./research.md) for provenance, evidence status, conflicts, and remaining gaps.

These files are documentation worksheets, not an automatic importer. Dataset version 1 now bundles the 14-place manual catalog and two scoped published bus legs with pending access flags. Research map candidates, conflicting routes, inferred complete journeys, and ML labels have not been promoted. See [offline-data.md](../offline-data.md) for the current runtime boundary.

Latest update: [dataset 3](./web-recommendations.md) enables six source-based records, including four explicitly combined bus-plus-walk suggestions. Verification flags remain pending; sources and limitations must accompany the separate result status. This supersedes the version 1 storage-only boundary above.

Use [destination-access.csv](./destination-access.csv) to review vehicle type, route ID, pickup, alighting, and remaining access together. Its hub-plus-walk combinations are research leads, not direct database routes. Every researched row keeps source links and a retrieval date separate from the blank field-verification date.

Use [source-review.csv](./source-review.csv) for the follow-up claim-by-claim review, including primary-source evidence and conflicting reports. A supported gate or address alone does not verify a complete journey.

The [remote verification report](./verification-report.md) audits every existing route and journey entry. [verification-audit.csv](./verification-audit.csv) is the current verdict register; [verification-sources.csv](./verification-sources.csv) records source URLs and retrieval limits. Remote published evidence is acceptable when it establishes the needed details; a physical ride is not mandatory. New verification columns in the route and journey worksheets are separate from their original research status and field-observation dates.

## Complete one journey first

The [all-landmark options worksheet](./transportation-options.csv) now covers all 14 candidates with 16 selected option records. Read [coverage-review.md](./coverage-review.md) for the results and limits. It is a research companion, not an importer or a complete routing matrix.

Start with the [Circuit to One Ayala journey packet](./first-journey.md). Published boarding and alighting instruction drafts are filled in its worksheet rows; the packet lists the precise observations still needed before verification and seed promotion.

The [stop and access follow-up](./circuit-access-research.md) adds a rendered primary address, a mapped walking proposal, and [coordinate candidates](./circuit-coordinate-candidates.csv). Candidate coordinates are review references with explicit identity limits, not approved boarding points.

Keep the full candidate catalog and fill verified journeys incrementally:

1. Pick an origin ID from `landmarks.csv` and a destination ID from `destinations.csv`.
2. Record both sites' coordinates in decimal degrees, including the exact landmark entrance and destination arrival site. Use actual measurements or a source that identifies the exact site. Leave unknown values blank; do not substitute zero.
3. Record an actual eligible boarding location in `boarding-points.csv`, including its coordinates and street side or entrance.
4. Record the observed or otherwise verified direct route in `routes.csv`: route/signboard name, vehicle type, direction, destination ID, and where the passenger gets off. Do not assume the reverse direction uses the same boarding point.
5. Link that route to the boarding point in `route-boarding-points.csv`. `stop_order` is a nonnegative integer ordering eligible boarding stops for that directional route, not a departure time. Use 0 for the first recorded stop, then 1, 2, and so on. Each route/point pair and each route/order pair must be unique.
6. Link the origin landmark to that boarding point in `landmark-boarding-points.csv`. Verify that the boarding location is accessible from the landmark; straight-line proximity alone does not establish access.
7. Record source references and review dates on every completed row. Complete records can be supported by authoritative published or mapped evidence, documented observations, or both. Keep `verification_reviewed_on` separate from `verified_on` field-observation dates. Use the audit's explicit scope and verdict; do not promote a whole journey because only its vehicle leg is published-confirmed. Use `YYYY-MM-DD` dates.

If a journey requires a transfer, leave it unsupported in this first direct-route implementation. If a destination is only nearby rather than served directly, document the alighting site and remaining access clearly; do not present it as a direct arrival without review.

## File responsibilities

| File | Runtime mapping | Required data before inclusion |
| --- | --- | --- |
| `landmarks.csv` | `bundledDataset.landmarks` | ID, name, coordinates, agreed model classification label, and verification evidence. |
| `destinations.csv` | `bundledDataset.destinations` | ID, name, coordinates, arrival site, and verification evidence. |
| `boarding-points.csv` | `bundledDataset.boardingPoints` | ID, name, coordinates, precise boarding site, and verification evidence. |
| `routes.csv` | `bundledDataset.routes` | ID, route name, supported vehicle type, existing destination ID, verified direction and alighting information. |
| `route-boarding-points.csv` | `bundledDataset.routeBoardingPoints` | Existing route and boarding IDs, unique integer stop order, and evidence that boarding here serves that destination. |
| `landmark-boarding-points.csv` | `bundledDataset.landmarkBoardingPoints` | Existing landmark and boarding IDs, verified access, and supporting evidence. |

Coordinate columns match `latitude` and `longitude`. Convert the worksheet's snake_case fields to the runtime's camelCase names: `classification_label` to `classificationLabel`, `transportation_type` to `transportationType`, `destination_id` to `destinationId`, `route_id` to `routeId`, `boarding_point_id` to `boardingPointId`, `landmark_id` to `landmarkId`, and `stop_order` to `stopOrder`.

Current vehicle types are `jeepney`, `bus`, and `e-bus`. Propose a type change explicitly if verified pilot data needs another vehicle type.

## Identifiers and evidence

- Candidate IDs are stable suggestions from the destination catalog. Coordinate any changes with ML, mobile UI, and location/maps teammates.
- A landmark ID and destination ID may use the same spelling because they are separate entities. Verify both the recognition site and arrival site rather than assuming their coordinates are identical.
- Agree on `classification_label` with the ML teammate; do not assume a display name or ID is already a trained model label.
- Use lowercase IDs with hyphens for newly collected boarding points and directional routes. Choose IDs from verified records, not invented transport names.
- `source_reference` can cite a field note, photograph filename, or authoritative source link. Record what that evidence establishes; a place listing alone does not establish route service.
- Preserve coordinates accurately and record location uncertainty in `notes`. Avoid unsupported claims about walking time, distance, fares, or schedules.
- CSV fields containing commas must be quoted. Spreadsheet applications normally handle this when exporting CSV.

## Promote verified records to the app

Review the worksheets first. Transfer only complete verified records and their required relationships into `bundledDataset`, preserving evidence in `sourceNotes` and these worksheets. Increase the dataset version when changing bundled data. Do not import all candidates blindly or change schema version for a data-only update.

Incomplete published vehicle facts can be stored for review only when their missing values and access/boarding flags remain explicit. The service returns these under `incomplete-guidance`; storing a scoped leg does not make its whole journey ready. Missing coordinates and ML labels are null in schema 3, allowing manual catalog use without guessed data. Coordinate availability affects GPS/maps, not otherwise complete manual guidance.

There is no CSV importer in this increment. The runtime format is a typed TypeScript object. Schema version 3 retains the instruction mappings introduced in version 2:

| Worksheet field | Runtime field |
| --- | --- |
| `routes.csv`: `alighting_location` | `TransportationRoute.alightingLocation` |
| `routes.csv`: `alighting_instructions` | `TransportationRoute.alightingInstructions` |
| `routes.csv`: `destination_walking_instructions` | `TransportationRoute.destinationWalkingInstructions` |
| `route-boarding-points.csv`: `boarding_instructions` | `RouteBoardingPoint.boardingInstructions` |
| `landmark-boarding-points.csv`: `access_description` | `LandmarkBoardingPoint.walkingInstructions` |

New instruction cells stay blank until supported text is collected. Convert missing instruction cells to explicit `null` when preparing a typed dataset. Do not copy research caveats such as "exact bay unconfirmed" into passenger directions, or present inferred access as verified walking instructions. The lookup exposes origin walking and boarding guidance on each option, and alighting/destination walking guidance on `option.route`.

Runtime verification remains deferred at the user's request.
