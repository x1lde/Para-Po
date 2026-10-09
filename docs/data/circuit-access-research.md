# Circuit to One Ayala: stop and access research

Reviewed remotely on 2026-10-09. This pass inspected rendered public pages because several stop and address pages returned little content through text-only retrieval. The journey remains partially supported; the findings below improve its mapped references and pedestrian approach without assigning an unsubstantiated curb.

## CityFlats location

The [CityFlats contact page](https://thecityflats.com/contact) now rendered successfully. Its Circuit entry gives Theater Drive in Barangay Carmona, Makati. This is primary address evidence, replacing the earlier search-excerpt-only limitation.

The [resolved Google place](https://www.google.com/maps/search/?api=1&query=The%20CityFlats%20Circuit%20Makati) identifies the property at 14.5739694, 121.0178472. An independent [OSM-derived building reference](https://mapcarta.com/W1063170174) gives 14.57394, 121.01789 and identifies residential way 1063170174. These establish property vicinity, not a loading curb. Extra decimal digits reflect source encoding, not measured accuracy. Retain attribution to [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) if reusing that building reference.

## Published pedestrian approach

The [Google walking proposal](https://www.google.com/maps/dir/?api=1&origin=Ayala%20Malls%20Circuit%20Makati&destination=CityFlats%20Circuit%20Makati&travelmode=walking) resolves both named places and uses Hippodromo Street followed by Theater Drive. It estimates about 400 metres and five minutes on the retrieval date. Those are provider estimates for the resolved place endpoints, not measured walking distance or a promise for the user's photographed entrance.

The detailed proposal begins from parking-lot access, reaches Hippodromo, and then turns toward the CityFlats property on Theater Drive. It does not establish the actual bus pickup curb, a safe crossing, or a step-free path. The starting place coordinate differs from the existing provisional landmark reference. Keep both points documented rather than silently replacing the photographed landmark or treating the map's chosen origin as its entrance.

A review draft can therefore say: "Approach CityFlats via Hippodromo Street and Theater Drive." This is an approach to the property, not complete instructions to the boarding point. No per-segment distances, guaranteed walking time, crossing claims, or path geometry have been seeded into the app.

## Transit coordinate candidates

The [candidate worksheet](./circuit-coordinate-candidates.csv) stores the actual retrieved coordinates and their identity limits.

| Candidate | Latitude, longitude | Assessment |
| --- | --- | --- |
| Provider's Circuit Makati stop | 14.575226, 121.019265 | Transit-stop entity; association with CityFlats local pickup unconfirmed. |
| Provider's esakay terminal | 14.575407, 121.017324 | Separate West Gala terminal; not adopted as CityFlats pickup. |
| Provider's One Ayala A | 14.550973, 121.028182 | Bus-stop entity; specific unloading bay unconfirmed. |
| Provider's One Ayala B | 14.550455, 121.028534 | Mixed rail/bus metadata; held from use as a bus point. |

These values were extracted from each linked stop page's structured `GeoCoordinates`, not its map viewport centre. The [provider route page](https://busmaps.com/en/philippines/public_transit-line-P36-1782628441-3314908705) connects Circuit-area and One Ayala stops but labels the service as Noveleta–Makati P2P and contains inconsistent stop counts. That does not establish that its stops, operator, fares, or local boarding eligibility match the separately reported CityFlats–One Ayala leg. The feed is identified as metro-manila by the provider; its freshness was not independently established.

The One Ayala B page exposes a `BusStop` entity while its visible type says Tram and includes MRT service. This is a concrete reason to retain the source ID and avoid merging same-name stop points. Their coordinate differences are not evidence of separate valid bus bays.

## One Ayala arrival and remaining access

[Community advice](https://www.reddit.com/r/HowToGetTherePH/comments/1mwhoqy) places the Circuit P2P waiting/drop-off area near Lawson. [Another discussion](https://www.reddit.com/r/commutersph/comments/1smut73/p2p_oneayala_to_circuit_makati/) describes a pickup after unloading near that area but also contains contradictory availability information. Treat Lawson as a vicinity lead, not a confirmed bay or exact endpoint.

[Globe's terminal guide](https://www.globe.com.ph/blog/one-ayala-terminal-guide) supports Upper Ground bus facilities and named access connections. It does not provide a walk from this service's particular unloading bay to a selected One Ayala entrance. The destination remains the named One Ayala complex; no mandatory additional vehicle transfer is implied. Remaining internal walking stays unknown until its endpoints are established.

## Result

Completed remotely: primary street address, two property reference points, a published pedestrian approach, and four transit coordinate candidates with identity checks. Still unresolved: exact CityFlats boarding curb and street side, its route-specific coordinate, exact One Ayala unloading bay, and bay-to-entrance access. No candidate is automatically approved for boarding-distance calculations.

The relevant access worksheet now contains the sourced approach with its limitation. The normalized boarding-point coordinates remain blank because this pass did not establish their identities. The audit and source register record the new evidence. No runtime dataset, schema, model mapping, screens, dependencies, tests, lint, typechecks, builds, commits, or pushes were changed or run.
