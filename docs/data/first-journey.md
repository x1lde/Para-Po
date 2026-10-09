# First journey: Ayala Malls Circuit to One Ayala

Reviewed online on 2026-10-09. Status: source-reviewed; complete access remains pending. Dataset version 1 now includes this named published vehicle leg and its origin/point association with false review flags. It returns `incomplete-guidance`. This packet's map candidates and incomplete walking proposals have not been inserted as ready guidance.

Audit update: the named Circuit-to-One-Ayala bus leg is `published-confirmed`; the complete mall-entrance-to-arrival journey is `partially-supported`. See [verification-report.md](./verification-report.md). Missing access and coordinate details can be completed remotely if credible stop/map or operator evidence establishes them; field observations are one possible evidence source, not a mandatory prerequisite.

Latest access follow-up: [circuit-access-research.md](./circuit-access-research.md) confirms the primary Theater Drive address through the rendered site, records property and transit coordinate candidates, and documents a walking proposal via Hippodromo and Theater Drive. The exact loading and unloading point identities remain unresolved; earlier blank-coordinate findings below describe normalized route stops, not the new review-only candidates.

## Journey records

| Item | Worksheet value | Evidence / remaining gap |
| --- | --- | --- |
| Origin | `ayala-malls-circuit` | Existing user-supplied landmark. |
| Destination | `one-ayala` | Existing destination candidate. |
| Directional route | `circuit-p2p-to-one-ayala` | Research identifier; not an official route number. |
| Vehicle | Bus, described as P2P | April 2026 report. Exact signboard wording still pending. |
| Board | `circuit-cityflats-p2p-loading`: The CityFlats Circuit | Published loading point; exact curb and GPS coordinates unknown. |
| Get off | One Ayala | Published arrival. Security Bank on Ayala Avenue is an earlier unloading stop. |
| Walk before boarding | Mapped property approach | Proposal uses Hippodromo and Theater Drive; actual entrance-to-loading-curb path remains pending. |
| Walk after alighting | Pending | Exact drop-off bay and selected One Ayala arrival entrance have not been confirmed. |

The [April 28 transport report](https://www.topgear.com.ph/news/motoring-news/p2p-2026-circuit-makati-one-ayala-a2619-20260428) identifies CityFlats loading toward One Ayala, and Gallery Drive arrival for the opposite direction. It reports weekday service excluding holidays and beep-card payment. These conditions need a current check before demonstration; no timetable or fare has been added to passenger instructions.

The [CityFlats contact page](https://thecityflats.com/contact) now renders its Theater Drive address for Circuit Makati. Property references and a walking proposal are documented in the access follow-up. This confirms the property's address, not the loading curb. Do not use its property pin as boarding coordinates.

[May commuter reports](https://www.reddit.com/r/makati/comments/1t6e4fs/p2p_buses_in_ayala_malls_circuitone_ayala/) describe missed arrivals and inconsistent information. They prevent treating the published route as proof of reliable current operation. The reverse journey must be checked separately.

## Worksheet work completed

- `routes.csv`: added source-supported alighting guidance for this route. Destination walking instructions remain blank.
- `route-boarding-points.csv`: added source-supported boarding guidance for this route and CityFlats point.
- Existing boarding coordinates, field-verification dates, and model labels remain blank. The origin/access relationship remains inferred until its walking path is confirmed.
- `source-review.csv` retains the existing direction, loading-point, and service-conflict evidence.

These instruction drafts inherit their rows' source-reviewed status. They are not approved for seed promotion or passenger display yet.

## Complete the remaining evidence

### Remaining-detail research results

This follow-up searched service/operator information, fare, street address, loading coordinates, signboard wording, and pedestrian access. Each unresolved item below stays unknown rather than inheriting a nearby building's position or another service's details.

| Detail | Online finding | Resolution |
| --- | --- | --- |
| Service and direction | Published Circuit to One Ayala P2P bus leg. | Source-supported; current operation pending. |
| Exact operator | No retrieved primary evidence identifies the operator of this particular local leg. | Pending. Do not borrow San Agustin or another operator from a Cavite route. |
| Exact signboard wording | Sources name destinations; no readable current vehicle signboard was obtained. | Pending photograph. |
| Pickup vicinity | CityFlats Circuit; primary rendered page confirms Theater Drive address. | Property vicinity confirmed; loading curb pending. |
| Pickup curb and street side | No substantiated curb description. | Pending. |
| Pickup coordinates | No source ties a latitude/longitude to the actual loading point. | Blank. |
| Walk from mall | Provider proposal via Hippodromo and Theater Drive to property. | Approach documented; precise entrance-to-curb path and crossings still unconfirmed. |
| Intermediate unloading | Security Bank on Ayala Avenue appears in published stop information. | Source-supported; do not infer boarding permission there. |
| One Ayala unloading bay | Arrival at the complex is reported; exact bay is not established. | Pending. Upper Ground bus layout is contextual evidence only. |
| Arrival coordinates | Existing worksheet complex point is a place reference. | Retained as provisional site coordinate; not a bus-stop coordinate. |
| Final walk | Target is the One Ayala complex; exact arrival entrance and unloading bay are unspecified. | Blank; does not mean no walk is needed. |
| Payment | April report specifies beep card. | Published condition; confirm current acceptance and ability to board offline. |
| Fare | An older community search excerpt mentions PHP 30. | Unconfirmed; excluded from runtime instructions. |
| Days and holidays | April report says weekdays excluding holidays. | Published condition; current applicability pending. |
| Reliability | May riders report missed trips and inconsistent information. | Unresolved; no guaranteed wait or arrival time. |
| Return service | Reverse publication uses Gallery Drive for arrival at Circuit. | Separate directional record; do not use Gallery Drive as the CityFlats pickup. |

Fare/address context: [older Olympia commuter thread](https://www.reddit.com/r/makati/comments/1oi6bht) was available as an indexed excerpt only; direct retrieval failed. [Globe's March 2026 terminal guide](https://www.globe.com.ph/blog/one-ayala-terminal-guide) describes bus facilities on Upper Ground but does not identify this service's exact unloading bay. The poster image linked by the April report also failed retrieval. These retrieval limits are not confirmations.

The retrieved online sources did not close the remaining curb, signboard, and path gaps. More precise operator, mapped-stop, published-access, or observed evidence can establish those details. No field date has been assigned. Published vehicle-leg confirmation is recorded separately from the partially supported complete journey; no dataset version has been increased.

| Evidence to collect remotely or through observation | Where to record it |
| --- | --- |
| Current operator announcement or readable destination/signboard evidence | Route source reference and notes. |
| Identified loading curb and street side with mapped coordinates or a GPS observation | Boarding point record. |
| Published or documented path from the chosen mall entrance to that curb | Landmark/boarding `access_description`. |
| Operator/terminal information identifying One Ayala unloading bay | Route `alighting_location` and `alighting_instructions`. |
| Published or documented access from unloading to the selected entrance | Route `destination_walking_instructions`. |
| Publication date, retrieval date, and any observation/photo references | Source references and the appropriate review or field dates. |

Once the required relationships and dataset fields are confirmed, update each row's audit scope, verdict, and desk-review date. Add a field date only if an actual field observation took place. Preserve unresolved details as pending. Coordinate an explicit ML label mapping before landmark seed inclusion; finished model training is not required to agree on IDs.

No tests, lint, typechecks, builds, commits, or pushes were run for this worksheet update.
