# Makati transport research

Research date: 2026-10-09. This is an online-source collection for the 14 user-supplied candidates, not a field-verified dataset. Later implementation now bundles their manual catalog and two published vehicle legs with incomplete guidance; see [offline-data.md](../offline-data.md). The broader researched journeys and coordinate candidates remain outside ready recommendations.

## What was collected

Follow-up coverage now includes [16 selected options for all 14 candidates](./transportation-options.csv). [coverage-review.md](./coverage-review.md) records newer community corroboration, primary-source retrieval limits, and pedestrian connections. [first-journey.md](./first-journey.md) now accounts for each remaining Circuit-to-One-Ayala detail, including explicit unknowns for operator, curb, coordinates, and walking paths.

- `landmarks.csv` and `destinations.csv` retain all 14 names. Thirteen have provisional site coordinates; Southpoint has an address lead only. Model classification labels remain blank.
- `routes.csv` contains eleven directional or destination-specific research records, including one inferred parish journey and one historical electric-jeep record. IDs are application worksheet identifiers, not official route numbers.
- `boarding-points.csv` contains eleven named pickup leads. Exact boarding coordinates are blank because the retrieved sources did not substantiate them. Building coordinates must not be reused as loading-bay coordinates.
- Relationship worksheets record candidate route/pickup and landmark/access links. Stop order 0 represents the sole collected origin boarding point, not an operator-published stop sequence.
- `destination-access.csv` gives one access lead for each destination, including explicit gaps. Several rows combine a published journey to One Ayala with a separately sourced pedestrian connection. Those combined journeys are labeled inferred and are not direct routes to each mall or museum.

This is selected journey coverage, not a complete table of every origin/destination pair. San Lorenzo Place and Guadalupe appear as research origins only and have not been added to the supported landmark catalog.

## Evidence status

This section describes original research provenance. For current verification verdicts on every route and journey, use [verification-report.md](./verification-report.md) and the appended verification columns. Credible remote sources can confirm a scoped claim without a physical ride; they do not fill unsupported coordinates or paths.

| Status | Meaning |
| --- | --- |
| `source-reviewed` | Online evidence supports a location or journey lead. It does not establish current service, exact stopping legality, or field verification. |
| `inferred` | A relationship was assembled from separately sourced facts rather than a directly confirmed journey. Review before use. |
| `historical` | Older service information retained as a lead. Current operation and direction need confirmation. |
| `unresolved` | The research did not establish a defensible route or exact location. Blank fields remain unknown. |
| `verified` | Legacy label for complete reviewed records; evidence can be published, observed, or both. The current audit uses explicit scoped verdicts instead. |

`researched_on` is the retrieval date; `verified_on` is intentionally blank. `evidence_kind` distinguishes news, community reports, search excerpts, and mapped places. Search indexing and crawl dates are not service verification dates. Where known, `source_published_on` records the article/report date.

## Important source findings

The strongest recent directional lead is the [April 2026 Circuit–One Ayala P2P report](https://www.topgear.com.ph/news/motoring-news/p2p-2026-circuit-makati-one-ayala-a2619-20260428). It distinguishes CityFlats as the Circuit pickup and Gallery Drive as the outbound arrival. It also reports limited operating days and a beep payment requirement; these are usability constraints to confirm, not boarding-time comparison features.

The [2026 One Ayala terminal guide](https://www.spot.ph/newsfeatures/mobility/routes-at-one-ayala-2026-a5229-20260422-bsc) identifies Gate 3 for Libertad and Gate 4 for Makati Loop. Its Washington and electric-jeep sections repeat similar stop lists, so those lists were not adopted as verified stop geometry. The Washington boarding lead instead uses [2026 commuter advice](https://www.reddit.com/r/commutersph/comments/1seluiy/one_ayala_to_makati_cbd/), which puts the queue in the basement. Older Shell advice must not be silently combined with that location.

[Globe's terminal access guide](https://www.globe.com.ph/blog/one-ayala-terminal-guide) describes connections to SM Makati and Glorietta and walking access to Greenbelt and Ayala Museum. It supports collecting last-mile access leads, but does not prove exact pedestrian paths or operating access conditions. The [Ayala Center description](https://en.wikipedia.org/wiki/Ayala_Center) identifies a broad complex rather than a single arrival entrance.

The [2023 Makati Loop electric-jeep report](https://www.topgear.com.ph/news/motoring-news/makati-loop-e-jeepney-love-bus-a2619-20230619) is retained as historical evidence, including its Greenbelt stop lead. An electric jeepney stays under `jeepney`; it is not relabeled as an electric bus. Its listed stops do not establish the current direction-specific sequence.


## Coordinate provenance and rejected matches

Coordinates in the worksheets are provisional place references, generally building or complex points. They are not verified entrances, queues, or safe roadside stops. Both origin and destination worksheets carry the same site reference for now; the photographed landmark and intended arrival entrance may need different coordinates.

RCBC and Glorietta points were converted from the cited Wikidata degrees/minutes/seconds to decimal degrees and rounded to six decimals. The additional digits are a conversion, not a claim of measurement accuracy. Circuit and Landmark rely on secondary place directories and need stronger confirmation.

A [Mapcarta Landmark result](https://mapcarta.com/N9610352066) was rejected because it identifies a Taguig department store despite a misleading Makati location heading. An [Avida rental listing](https://alexi.pro/properties/310-Condominium-Makati-South-Point-CITY-OF-MAKATI-NATIONAL-CAPITAL-REGION-NCR-PHP14-129/) supplies coordinates but also inconsistent building metadata; those coordinates were not adopted. The [Waze Southpoint listing](https://www.waze.com/live-map/directions/ph/ncr/makati-city/avida-towers-makati-southpoint?to=place.ChIJFX875WXJlzMRsrFBKhZfrw0) provides an address lead instead.

Several social posts and route-planner pages were not fully retrievable. Indexed community excerpts are identified as such. They support research leads but cannot substitute for complete operator evidence or field confirmation. Some older guides mention rail services or pickup locations that may have changed; these were not imported wholesale.

## Attribution

Rows derived from Mapcarta cite their individual pages, which identify underlying OpenStreetMap objects. Retain attribution to [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) and the linked Open Database License information when reusing that data. Wikidata structured data is available under CC0 as indicated on its source pages. This collection stores concise factual fields and source references rather than copied articles or scraped map imagery.

## Before using these rows in SQLite

### Follow-up source review

The [claim review worksheet](./source-review.csv) records specific findings and their limits. `source-supported` there means the cited page explicitly supports that particular fact; it does not promote the whole journey to `verified`. All field-verification dates remain blank. There are still no substantiated loading-bay coordinates.

New primary evidence includes the [IOM visitor directions](https://philippines.iom.int/sites/g/files/tmzbdl1651/files/documents/2024-04/mhc-location-map-and-route.pdf): indexed text identifies Makati Loop-Landmark at Gate 4 and a Landmark departure near Greenbelt 3. The PDF itself could not be fetched, so this is explicitly recorded as a search excerpt. It does not confirm the City Hall alighting point.

The [theater's own guide](https://www.circuitperformingartstheater.com/directions-to-the-samsung-performing-arts-theater/) describes Landmark-Puregold travel to JP Rizal/Honradez and subsequent walking toward Circuit. Its page date is 2020-08-27 and its vehicle description is ambiguous. Retain it as historical context; do not substitute it for current City Hall directions.

The [Art Fair organizer's February 2026 guide](https://www.artfairphilippines.com/afp2026/visitorinfo.php) identifies a CityFlats-area P2P drop-off. That event-specific information does not establish the return pickup curb or prove that all listed services still operate. Its generalized route descriptions and travel times were not copied into commuter instructions.

Two conflicts need resolution before seed promotion: [May rider reports](https://www.reddit.com/r/makati/comments/1t6e4fs/p2p_buses_in_ayala_malls_circuitone_ayala/) question the P2P's reliability and terminal information; the [April terminal guide](https://www.spot.ph/newsfeatures/mobility/routes-at-one-ayala-2026-a5229-20260422-bsc) places Washington at UGF while the existing community lead says basement. Neither floor is confirmed. The `one-ayala-washington-basement` ID is retained for worksheet continuity, not as proof of a basement queue.

The [museum's own visitor page](https://www.ayalamuseum.org/visit) confirms its Makati Avenue/De La Rosa address in Greenbelt Park. It does not establish a particular entrance, pedestrian path, or vehicle stop. The remaining Southpoint, parish, City Hall, Salcedo, and Powerplant journey gaps remain as described in their existing worksheet rows; no full journey has been newly certified.

Confirm travel direction, boarding/alighting locations, sufficiently precise coordinates, remaining access, and source dates using reliable published or observed evidence. For P2P reports, retain uncertainty about operator and service conditions where unresolved. Preserve findings in the worksheets, record desk audits in `verification_reviewed_on`, and use `verified_on` only for actual field observations. Promote only complete reviewed records into the bundled seed.

Do not import `destination-access.csv` as routes: hub-plus-walk rows target places different from the bus route's actual terminal. Schema version 2 can now store reviewed boarding, alighting, and walking instructions; see [offline-data.md](../offline-data.md). That capability does not automatically approve or import research rows.

No tests, lint, typechecks, builds, commits, or pushes were run for this research task.
