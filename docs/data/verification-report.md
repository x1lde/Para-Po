# Remote route and journey verification

Audit date: 2026-10-09. Scope: every existing record in `routes.csv`, `transportation-options.csv`, and `destination-access.csv`. No new origin/destination combinations were invented. There are 41 audited worksheet entries: 11 routes, 16 options, and 14 destination-access entries. The latter two sets overlap and must not be added together as unique journeys.

The [audit CSV](./verification-audit.csv) gives each entry's verdict, precise confirmation scope, supported details, unresolved details, and source IDs. The [source register](./verification-sources.csv) resolves those IDs to direct URLs and records whether full content or only indexed text was available. The original worksheets now carry `verification_status`, `verification_reviewed_on`, and `verification_scope` beside their original research statuses.

## Results

| Verdict | Routes (11) | Options (16) | Destination-access entries (14) |
| --- | --- | --- | --- |
| `published-confirmed` | 2 | 1 | 0 |
| `partially-supported` | 6 | 13 | 12 |
| `conflicting` | 2 | 2 | 2 |
| `historical` | 1 | 0 | 0 |
| `unsupported` | 0 | 0 | 0 |

## How verification was judged

`published-confirmed` means a credible retrieved publication directly describes the essential details within the stated scope. For a named vehicle leg, that covers vehicle, direction, departure site, and arrival site. For the walking option, it covers a published connection between named malls. It does not certify current live operation, exact coordinates, operating hours, or accessibility beyond that evidence.

`partially-supported` means some details have support but the complete record cannot be confirmed: a corridor may exist while the destination-specific alighting point or pedestrian approach remains unclear. Community-only guidance and independently assembled bus-plus-walk journeys stay in this category unless their complete scope is sufficiently supported.

`conflicting` means material evidence disagrees about boarding or travel access. Corroboration may make one interpretation better supported, but the discrepancy is retained until stronger evidence resolves it. `historical` means the specific claim rests on older evidence without current confirmation. `unsupported` means no defensible journey was established; it does not prove that transport does not exist.

Remote evidence is acceptable. A physical ride is not mandatory when reliable publications, operator information, mapped stop records, or documented paths establish the needed details. A field observation is one possible source. Missing coordinates still need a source identifying the actual stop; a building centroid cannot substitute for it.

`verification_reviewed_on` is the date of this desk audit. Existing `verified_on` cells were collected as field-observation dates and remain blank. Preserve them for that purpose. A worksheet's older `status` describes how the original lead was assembled; the new verification verdict is the current audit conclusion.

## Each route's outcome

| Route ID | Verdict | Main unresolved detail |
| --- | --- | --- |
| `circuit-p2p-to-circuit` | Published-confirmed vehicle leg | Exact loading bay and walking arrival at the mall. |
| `circuit-p2p-to-one-ayala` | Published-confirmed vehicle leg | Mall-to-pickup approach and exact terminal arrival bay. |
| `makati-loop-landmark-to-city-hall` | Partially supported | Destination-specific unloading and entrance access. |
| `makati-loop-one-ayala-to-city-hall` | Partially supported | Exact stop and applicable loop variant. |
| `makati-loop-to-landmark` | Partially supported | Legal boarding point reached from City Hall. |
| `washington-to-rcbc` | Conflicting | Washington terminal floor and exact bay. |
| `makati-loop-to-salcedo` | Partially supported | PRC queue identity and complete market access. |
| `prc-to-makati-southpoint` | Partially supported | Exact terminal bay and building-side unloading. |
| `libertad-to-don-bosco` | Conflicting | Older parish description versus newer westbound diversion. |
| `guadalupe-to-powerplant` | Partially supported | Aruga-area curb and remaining pedestrian path. |
| `historical-eloop-to-greenbelt` | Historical | Current direction-specific Greenbelt 3 stopping. |

## Findings that changed the evidence picture

The [April P2P report](https://www.topgear.com.ph/news/motoring-news/p2p-2026-circuit-makati-one-ayala-a2619-20260428) explicitly describes both named bus legs. [Newer outbound advice](https://www.reddit.com/r/HowToGetTherePH/comments/1vxpi0q/one_ayala_to_circuit_makati_power_mac_center/) and [inbound advice](https://www.reddit.com/r/HowToGetTherePH/comments/1w7pc8k/circuit_makati_to_sm_megamall/) corroborate the service as an option. Reports of missed trips do not establish permanent cancellation. Neither these reports nor an indexed announcement establish current exact bays or guaranteed operating conditions. The complete Circuit mall-to-One-Ayala journey remains partially supported even though its named bus leg is published-confirmed.

The [route planner's directional PDF](https://appassets.mvtdev.com/map/41/l/1022/7637911.pdf) supports the distinction between the outbound Nicanor Garcia/JP Rizal corridor and the Kalayaan return. It also provides a named Landmark-side intersection lead. This is route-planner evidence rather than an operator announcement. Its 2026 copyright is not a publication or service-verification date. It does not establish the City Hall entrance walk or boarding coordinates.

The [retrieved Washington discussion](https://www.reddit.com/r/HowToGetTherePH/comments/1u0q1z9/one_ayala_to_paseo_aia_tower/) corroborates Lower Ground loading. The [April guide](https://www.spot.ph/newsfeatures/mobility/routes-at-one-ayala-2026-a5229-20260422-bsc) still says UGF in its Washington section, while also generally assigning jeepneys to Lower Ground. Lower Ground is the better-corroborated lead, not a formally resolved bay assignment. Its repeated Washington and electric-loop stop lists and conflicting schedules were not adopted as route geometry or departure promises.

The [parish's indexed directions](https://www.w.sjbmakati.com/contact-us.html) give pedestrian access from the Pasong Tamo/Arnaiz vicinity and say the Libertad corridor passes the church both ways. The [newer westbound street description](https://www.reddit.com/r/commutersph/comments/1s44mcr/jeepney_route_pasay_road_to_libertad/) differs. The specific One Ayala-to-parish journey therefore remains conflicting; an older general corridor claim cannot settle present stopping.

The [mall connector guide](https://thebeat.asia/manila/nomads/explore/ayala-center-malls-guide) is dated 2026-02-24, resolving the previously unknown date. It supports the One Ayala-to-Landmark mall connection. This is a published walking connection, not a guarantee of uninterrupted current corridor access. Combining it with a bus leg does not automatically confirm a complete Circuit-to-mall journey.

The [community route catalog](https://wiki.openstreetmap.org/wiki/Metro_Manila/Jeepney_and_UV_Express_routes) corroborates the PRC and Libertad corridor names. Catalog route codes were not assigned as official application route numbers.

## Using the results in Para-Po

Remote MVP policy update: dataset 3 now allows six explicitly labeled `source-based` suggestions, including four assembled bus-plus-walk variants. This is not a change to evidence-verification verdicts. `runtime_ready=false` in this audit refers to fully confirmed guidance under the earlier audit standard, not whether the new policy may display a sourced suggestion. See [web-recommendations.md](./web-recommendations.md).

Implementation update: schema 3/dataset 1 now store the 14-place manual catalog and two scoped vehicle facts as incomplete guidance. The audit's `runtime_ready=false` still means these are not ready complete recommendations. Nullable coordinates and ML labels allow draft catalog storage, not fabricated map points. See [offline-data.md](../offline-data.md); this report's verdicts are unchanged.

The [Circuit stop/access follow-up](./circuit-access-research.md) subsequently adds mapped property references, a walking proposal, and transit coordinate candidates. It improves the approach evidence but does not identify the route's exact pickup/unloading points. Verdict counts remain unchanged; none of those candidates was silently assigned to a normalized stop.

No record is currently ready to seed as a complete coordinate-backed recommendation. In `verification-audit.csv`, `runtime_ready` is false for all entries: loading-point coordinates, required access relationships, agreed ML labels, or the current vehicle-only contract remain incomplete. This is a data-completeness judgment, separate from published route confirmation. The walking option cannot be inserted as a vehicle route.

For remote completion, obtain sufficiently precise stop/map evidence and missing access descriptions, resolve materially conflicting records, agree on labels, and then prepare a reviewed dataset. No physical-ride-only requirement is imposed. Keep an audit trail when promoting records, and do not treat this audit as a CSV importer or a complete routing graph.

No runtime files, dependencies, model assets, or screens changed. Only source and worksheet review was performed. Tests, lint, typechecks, and builds remain paused at the user's request. Nothing was committed or pushed.
