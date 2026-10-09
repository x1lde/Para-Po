# Transportation research coverage

Reviewed online on 2026-10-09. [transportation-options.csv](./transportation-options.csv) has 16 reviewed option records covering all 14 candidates: 16 travel/access leads. These are selected options, not an exhaustive origin/destination matrix, and not field-verified service.

All existing records now have a [remote verification audit](./verification-report.md). Its verdict columns supersede the broad lead descriptions below for confirmation purposes. Published evidence is accepted within its stated scope; no physical ride is required when sources establish the essential facts.

The options worksheet is a research companion to the normalized data worksheets. `route_or_signboard` records a reported service name or signboard lead, not a photographed signboard. Rows with research-only origins do not expand the supported landmark catalog. The `walking` value appears only in this research worksheet and does not extend the application's `TransportationType` union.

## Coverage by landmark

| Landmark | Result of this pass |
| --- | --- |
| Ayala Center | Circuit bus to One Ayala plus access within the complex; choose an actual arrival building. |
| Avida Towers Makati Southpoint | Full 2025 community reply supports San Lorenzo Place jeep access; canonical route label and exact stop still need confirmation. |
| Ayala Malls Circuit | Published One Ayala bus arrival at Gallery Drive; current service and last-mile entrance remain pending. |
| St. John Bosco Parish | Older parish search excerpt supports a Libertad-Landmark corridor; does not resolve the current westbound alighting point. |
| RCBC Plaza | Washington jeep lead plus LRT Buendia-bound bus alternative; floor conflict persists for the jeep. |
| SM Makati | Bus to One Ayala plus published bridge access. |
| The Landmark Makati | City Hall jeep lead retained; additional walking connection from One Ayala via Glorietta. |
| Greenbelt | Bus to One Ayala plus published mall connections; specify Greenbelt building. |
| Glorietta | Bus to One Ayala plus Glorietta 5 pedestrian connection; specify mall section. |
| Power Plant Mall | September 2026 community guidance adds Aruga as an alighting landmark; safe stop and crossing unknown. |
| Makati City Hall | Landmark Makati Loop lead and One Ayala alternative retained; exact arrival point remains pending. |
| Ayala Museum | Bus to One Ayala plus walking-access lead; official museum address corroborates arrival vicinity. |
| One Ayala | Dedicated Circuit journey packet expanded; precise bays remain unknown. |
| Salcedo Weekend Market | Reposo access corroborated; August car-free pilot warns against assuming permanent street access. |

## Findings and source limits

The [Southpoint community reply](https://www.reddit.com/r/HowToGetTherePH/comments/1i99pc0/) is now fully retrievable. It mentions PRC, Washington, and WalterMart as options from San Lorenzo Place. This does not prove those services are interchangeable or identify a common loading bay.

The [September Power Plant discussion](https://www.reddit.com/r/HowToGetTherePH/comments/1wi6kgr/from_ayalaguadalupe_mrt_to_powerplant_mallrockwell/) gives an Aruga-area alighting lead. It remains community advice rather than an operator stop announcement. The [RCBC discussion](https://www.reddit.com/r/commutersph/comments/1seluiy/one_ayala_to_makati_cbd/) adds a bus alternative; [Globe's March guide](https://www.globe.com.ph/blog/one-ayala-terminal-guide) corroborates a LRT Buendia service, not its RCBC stop.

The [parish's older indexed contact page](https://w.sjbmakati.com/contact-us.html) says the Libertad-Landmark/MRT Ayala corridor passes the church. Direct retrieval failed. Current [commuter street-path advice](https://www.reddit.com/r/commutersph/comments/1s44mcr/jeepney_route_pasay_road_to_libertad/) describes a westbound diversion. No current church-front stop is asserted.

The [mall access guide](https://thebeat.asia/manila/nomads/explore/ayala-center-malls-guide) supports collecting pedestrian links among One Ayala, Glorietta, SM, Landmark, and Greenbelt. These connections may depend on opening hours and redevelopment; no measured walking time or universally accessible path has been established. Do not create separate direct bus routes from this evidence.

The [July Salcedo report](https://www.spot.ph/newsfeatures/mobility/car-free-salcedo-a5229-20260728-bsc) concerns an August pilot. It does not establish October street restrictions. Distinguish Salcedo Village/Weekend Market from Salcedo Street when collecting route advice.


## Runtime boundary

Later implementation now bundles the 14-place catalog and two published named vehicle legs with pending access, as described in [offline-data.md](../offline-data.md). The following paragraph records the boundary at the research stage; no complete option has been promoted to a ready recommendation.

No new option was promoted to `bundledDataset`. Required loading coordinates and origin-access relationships remain incomplete. Verified seed promotion must retain direction-specific stops and explicitly agreed ML labels. No ML assets or labels, dependencies, or screens were added. Tests and builds remain paused; this pass used manual source and worksheet review only.
