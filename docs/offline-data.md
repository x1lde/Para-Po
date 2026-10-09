# Offline data branch

Schema version: 3. Bundled dataset version: 2.

The Android database now bundles the 15-place Makati catalog and two published directional Circuit/One Ayala bus legs. Manual selection and lookup work without a model, network request, or map. The current bus journeys remain incomplete guidance: exact boarding access and final pedestrian instructions have not been established. No ready recommendation is claimed for the current dataset.

The user authorized web-sourced suggestions for remote development. Dataset 2 adds four explicit bus-plus-walk variants, for six recommendation records using the same two vehicle legs. These return `source-based` with sources and limitations; complete `available` guidance remains separate. See [web-recommendations.md](./data/web-recommendations.md).

## Implementation

- `src/database/data/pilot-dataset.ts`: all 15 stable place IDs, nullable unmapped labels, named points, published legs, evidence, and pending relationships.
- `src/database/seed.ts`: versioned transactional replacement of bundled reference data.
- `src/database/validate-dataset.ts`: validation of IDs, coordinates, labels, evidence, dates, and relationship integrity before replacement.
- `src/database/schema.ts`: initial schema and version 2/3 migrations.
- `src/database/client.ts`: lazy cached initialization; retry after failure.
- `src/database/repositories/transport-repository.ts`: catalog queries, origin/destination lookup, ready destination filtering, and dataset metadata.
- `src/features/transport/services/guidance-service.ts`: explicit completeness checks.
- `src/features/transport/services/transport-service.ts`: deterministic lookup statuses.
- [UI handoff](./offline-data-handoff.md): API usage, result handling, and current expected outcomes.
- [Verification checklist](./offline-data-verification.md): checks deferred at the user's request.

Existing screens do not import the database yet. No screens, dependencies, native configuration, GPS permission code, model integration, or map rendering were added in this branch increment.

## Bundled data and evidence

The catalog retains all 15 user-supplied places. Display names use The Landmark Makati and Power Plant Mall; IDs remain stable. Catalog membership does not guarantee transportation coverage.

The two named published legs and four explicit onward walking variants are bundled. The variants use separately sourced mall connections and do not represent extra bus services or direct mall drop-offs. Conflicting, historical, and unsupported route leads remain in the worksheets. The [audit](./data/verification-report.md) explains the evidence; inclusion as a suggestion does not change its verification verdict.

Every place and boarding-point coordinate in the runtime dataset is currently an explicit null pair. Provisional site points and ambiguous provider stops remain in documentation. This prevents candidate points from becoming distance-ranking or destination-map inputs. Model labels are null rather than fabricated; manual lookup uses place IDs.

Each route carries `evidenceStatus`, `sourceReference`, `reviewedOn`, and `limitations`. `published-confirmed` describes the named directional vehicle leg, not complete access, live operation, or guaranteed service conditions. Review dates are desk-review dates.

A route/point relationship has `boardingVerified`; a landmark/point relationship has `accessVerified`. These mean reviewed evidence establishes the relevant guidance, not necessarily that a teammate took a physical ride. Both are false for the currently bundled records.

## Recommendation rules

A lookup first resolves the origin and destination, then retrieves only directional routes serving that destination through points linked to the origin. Same-place selection returns `already-at-destination`. Results have stable route/stop ordering and contain no transfer planning or nearest-point assumptions.

Missing evidence, unconfirmed boarding/access, and missing essential instructions block `available`. If some options are ready, `available` contains only those options. Otherwise, a published/verified named leg with source/date, explicit limitations, boarding and alighting guidance can return `source-based`. Gaps stay attached. Pending or evidence-free records remain `incomplete-guidance`. Pass `false` to the lookup's third argument or destination filter's second argument to disable source-based fallback.

Missing boarding coordinates is informational: it prevents proximity ranking but does not block otherwise complete manual guidance. GPS remains an optional enhancement. Do not rank null coordinate pairs or turn a null pair into zero. Explicit reviewed no-walk wording can be recorded where appropriate; null text always means unknown, never that walking is unnecessary.

The lookup does not require a classification label or origin/destination coordinates. It does not query an ML model, GPS service, network, or tile server.

## Storage and migrations

SQLite usage follows [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/). Version 3 follows SQLite's documented [create/copy/drop/rename migration](https://www.sqlite.org/lang_altertable.html) to allow null coordinate pairs and null labels. Existing values are copied into rebuilt parent tables; route and relationship records remain in place. New review fields default to pending/false on migrated data.

The initialization connection remains private until complete. For the version 3 rebuild, foreign-key enforcement is disabled before the transaction, a foreign-key check runs before commit, and enforcement is enabled again before callers receive the connection. Normal version 3 launches keep enforcement enabled. Migration, schema marker, seed replacement, and dataset metadata share one transaction. Failed writes roll back; failed initialization closes the connection and permits retry.

Dataset validation runs before any reference deletion, including when the version matches. Foreign keys, coordinate pairs/ranges, allowed vehicle and evidence types, unique labels, and stop ordering also have SQL constraints. SQL values are bound parameters.

Dataset and schema versions are independent. The same dataset version skips replacement; increment it whenever bundled content changes. A newer stored schema or dataset is rejected. The replaced tables contain bundled reference data only; future user data must be stored separately.

## Completing the data

Use reliable published or observed evidence to establish exact boarding/access and final pedestrian guidance, then update the dataset's relationship review flags and instruction fields. Coordinates can be completed independently for proximity/maps. Keep source references and limitations, and increase the dataset version.

The first seed deliberately preserves incomplete states instead of importing all research leads. See [Circuit access research](./data/circuit-access-research.md) for the remaining evidence gaps. No full commuting recommendation becomes ready merely because model training finishes.

## Verification status

Checks resumed: TypeScript, lint, and 11 isolated Node SQLite/domain checks pass. Pre-existing CSS declarations and a template web hydration lint issue were fixed. Native Expo SQLite and physical Android airplane-mode verification remain outstanding. See [offline-data-verification.md](./offline-data-verification.md) for results and [branch-integration.md](./branch-integration.md) for the team handoff. Nothing was committed or pushed.
