# Web-sourced pilot recommendations

Dataset 2 bundles six recommendation records using two named directional bus legs and four onward walking variants. These are not six distinct bus services. All 15 places remain in the catalog; uncovered combinations still return `no-routes`.

The user authorized web-sourced suggestions without physical visits. `source-based` results now expose recommendations alongside evidence, limitations, and missing-detail flags. Their unresolved access/boarding flags remain false; they are not promoted to fully confirmed `available` guidance.

| Origin | Destination | Board | Alight | Remaining access |
| --- | --- | --- | --- | --- |
| Circuit | One Ayala | CityFlats P2P | One Ayala | Exact internal arrival access unknown. |
| One Ayala | Circuit | One Ayala P2P | Gallery Drive | Exact selected mall entrance unknown. |
| Circuit | SM Makati | Same CityFlats P2P | One Ayala | Published mall connection. |
| Circuit | Glorietta | Same CityFlats P2P | One Ayala | Published Glorietta 5 link. |
| Circuit | Landmark | Same CityFlats P2P | One Ayala | Published onward mall links. |
| Circuit | Greenbelt | Same CityFlats P2P | One Ayala | Published onward mall links; choose a building. |

The [April P2P report](https://www.topgear.com.ph/news/motoring-news/p2p-2026-circuit-makati-one-ayala-a2619-20260428) supplies the directional vehicle legs and named sites. It reports weekdays excluding holidays and beep-card payment. Current conditions are not independently confirmed; no fares or guaranteed departure times are included.

The [February mall guide](https://thebeat.asia/manila/nomads/explore/ayala-center-malls-guide) supplies onward pedestrian links; [Globe's terminal guide](https://www.globe.com.ph/blog/one-ayala-terminal-guide) corroborates access connections. Combined journeys use separate sources and are explicitly described as bus plus walking. The bus is not claimed to stop at the final mall.

## UI contract

Label these results **Web-sourced recommendation**. Display the source, review date, limitations, and any missing instruction information with the named vehicle and boarding/alighting sites. Links are stored text; opening them is optional and no network lookup is required at runtime.

Unknown coordinates and labels remain null. Do not rank null points by distance, fabricate walking paths, or turn absent text into a no-walking claim. Exact pickup/unloading bays, current access hours, and the complete bay-to-connector path remain uncertain.

Eligibility requires published/verified leg evidence, source/date, explicit limitations, a boarding name/instruction, and alighting name/instruction. Pending or evidence-free records do not qualify. Origin/destination filtering remains in force.

Pass `false` as the third argument to `lookupTransportation()` or second argument to `listDestinationsForOrigin()` for complete guidance only. Those calls currently return incomplete guidance/empty filtered lists. Default calls accept explicitly labeled source-based suggestions.

No historical or unsupported journey was added. This increment changes dataset content and lookup policy, not evidence-verification verdicts. No schema changes, ML assets, screens, dependencies, or network runtime were added. Checks remain paused at the user's request.
