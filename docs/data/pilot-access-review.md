# Pilot access review — 10 October 2026

## Accepted source-based additions

The [Globe terminal guide, 16 March 2026](https://www.globe.com.ph/blog/one-ayala-terminal-guide) identifies One Ayala entry connections from SM Store levels 3/4 and the Glorietta 5 lobby. Its Upper Ground bus/P2P orientation combines with the [April Circuit P2P report](https://www.topgear.com.ph/news/motoring-news/p2p-2026-circuit-makati-one-ayala-a2619-20260428) naming One Ayala as the Circuit-bound boarding site. Dataset 7 therefore adds SM Makati-to-Circuit and Glorietta-to-Circuit as access-plus-bus suggestions. No new bus service or stop is invented. Full connector-to-bay paths and current access conditions remain unconfirmed, so access/boarding review flags remain false.

## Coordinates not promoted

[Busmaps' Circuit stop](https://busmaps.com/en/philippines/public_transit-stop-Circuit-Makati-13695609524146922564?cityId=1703417) is a mapped transit-provider lead on Theater Drive, but the search record associates it with a Taguig City–Makati CBD P2P service. That does not establish the exact curb for the separate Circuit–One Ayala leg. Nearby/property map positions are not promoted to route-specific confirmed boarding coordinates. One Ayala's exact Circuit bay remains unresolved.

The current OpenStreetMap journey planner includes mapped stops and inferred points along jeepney routes. Its own method describes walking estimates derived from straight-line distance and typical wait assumptions. These candidates remain separate from published SQLite guidance, and their map pins are explicitly approximate/unconfirmed. They cannot drive `nearestOption`, which requires an eligible reviewed stop with coordinates and a reliable current GPS fix.

## Remaining work

- Exact loading and unloading points for each directional pilot service, with route-specific source evidence.
- Complete entrance-to-stop and final walking paths, including access restrictions.
- Published/verified origin-access and alighting instructions for the other ten SQLite origins. The broader OSM planner is candidate coverage, not proof that all those journeys are operational.
- Device acceptance of the native SQLite upgrade, GPS distance rules, current model, and airplane-mode behavior.

No street-by-street route, curb coordinate, fare, or operating guarantee is inferred to fill an unresolved field. Web review is not field verification.
