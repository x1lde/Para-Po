# Backend data research — 10 October 2026

The current pilot has 14 catalog landmarks but only two starting locations with recommendations: Circuit and One Ayala. Recognition coverage is broader than transport coverage. No coordinates below are accepted as bus loading curbs, and no source establishes guaranteed current operation.

| Source | Supported information | Limits / decision |
| --- | --- | --- |
| [TopGear, 28 April 2026](https://www.topgear.com.ph/news/motoring-news/p2p-2026-circuit-makati-one-ayala-a2619-20260428) | Circuit pickup at CityFlats; inbound unloading at Security Bank then One Ayala; reverse arrival at Gallery Drive. | News report attributing Circuit announcements. Exact bays and coordinates absent. Dataset 6 clarifies the inbound final stop; existing direction-specific pickup/drop-off distinction remains. |
| [Globe, 16 March 2026](https://www.globe.com.ph/blog/one-ayala-terminal-guide) | P2P/city buses use Upper Ground; terminal access from Courtyard Drive, MRT footbridge, SM Store bridges, and Glorietta 5 lobby. | General terminal guide, not a route-specific bay announcement. Dataset 6 adds floor-level orientation for the reverse P2P with an explicit request to confirm the bay. Access verification remains false; entrance-to-bay walking directions remain unknown. |
| [Art Fair Philippines 2026 visitor information](https://artfairphilippines.com/afp2026/visitorinfo.php) | February 6–8 venue guidance mentions a P2P drop-off beside CityFlats and other transit leads near Circuit. | Historical event guidance, not current confirmation of the April service. It must not replace Gallery Drive as the recorded reverse-route drop-off. Its PNR/direction statements need separate current verification. No runtime route added. |
| [Ayala Land Offices — One Ayala](https://ayalalandoffices.com.ph/offices/makati/one-ayala) | Developer's named One Ayala development/address context. | Building location does not establish a loading bay. No stop coordinate inferred. |
| [Ayala Land Offices — Circuit Corporate Center One](https://ayalalandoffices.com.ph/offices/makati/circuit-makati-corporate-center-one) | Theater Drive location for the office tower. | A neighboring property's address does not identify the CityFlats pickup curb. No coordinate inferred. |
| [Archived parish directions](https://www.w.sjbmakati.com/contact-us.html) and [current parish address](https://www.sjbmakati.com/parish-office-store) | Search-indexed older directions mention Libertad/Landmark jeepneys and access near WalterMart; the current parish page supplies its address. | Full archived directions timed out on retrieval; age and directional consistency are unresolved. An address does not verify an origin-to-parish journey. Keep as a lead outside the seed. |
| [Circuit announcement linked by commuters](https://www.facebook.com/CircuitMakatiOfficial/posts/pfbid02M1UjRHdFzbLB3R9VNZi4JVqQbwQzJFfqYJDgtNaekHiSVXkDEF2e4JuUDrGLZVwJl) | Potential primary announcement for the Circuit service. | Direct retrieval failed. No unseen content treated as verified. |

Mall pages at Ayala Malls returned thin/generic rendered content rather than a reliable current terminal diagram. Community Power Plant/Guadalupe directions involve transfers and uncertain loading sites; these are not added as direct One Ayala–Power Plant routes. Existing source-review worksheets retain the broader leads; this pass does not verify journeys for all 14 places.

## Still missing

- Exact route-specific boarding coordinates and loading bays for both current points.
- Access instructions from selected landmark entrances and review of those origin-access relationships.
- Destination access after alighting at One Ayala or Gallery Drive.
- Reviewed outbound journey data for the other 12 landmarks.
- Sourced vehicle route geometry for map visualization.

To accept a coordinate, record the source and its date, identify the exact curb/bay and route direction, and reconcile conflicting evidence. Property centroids, walking-route origins, nearby transit-provider pins, and event-specific stops are not substitutes. No fare, live arrival, or boarding-time comparison is introduced.
