"""Build ParaPo!'s landmark-to-landmark journey recommendations from cached OpenStreetMap route data.

    python3 tools/transit/fetch_osm.py        # once, or to refresh the data
    python3 tools/transit/build_journeys.py   # writes src/features/transport/planner/makati-journeys.json

For every ordered pair of the 14 supported landmarks it recommends, best first:
  * walking, when the places are close;
  * direct rides: a route relation that passes near the origin and, later in its direction of travel, near
    the destination. Boarding and alighting use the route's mapped stops; hail-anywhere jeepney routes
    without mapped stops use the nearest point on the route and the street it runs along;
  * one-transfer rides, only when no direct ride exists.
Distances are straight-line × 1.3 for walking and along the route for rides. Times are estimates.
"""

import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = Path(__file__).resolve().parent / "cache"
OUT = ROOT / "src/features/transport/planner/makati-journeys.json"

# OpenStreetMap features chosen for each supported landmark (see cache/landmarks.json).
PLACES = {
    "ayala_center": ("Ayala Center", "relation/12227983", 14.55112, 121.02418),
    "avida_makati_southpoint": ("Avida Towers Makati Southpoint", "relation/20297185", 14.54569, 121.01512),
    "ayala_malls_circuit": ("Ayala Malls Circuit", "way/417159523", 14.57523, 121.01976),
    "st_john_bosco_parish": ("St. John Bosco Parish", "way/28044791", 14.55042, 121.01490),
    "rcbc_plaza": ("RCBC Plaza", "relation/5472563", 14.56078, 121.01638),
    "sm_makati": ("SM Makati", "way/27831200", 14.54974, 121.02673),
    "landmark_makati": ("The Landmark Makati", "way/5741392", 14.55205, 121.02371),
    "greenbelt": ("Greenbelt by Ayala", "relation/12227982", 14.55271, 121.02147),
    "glorietta": ("Glorietta by Ayala", "way/40190900", 14.55122, 121.02533),
    "powerplant_mall": ("Power Plant Mall", "way/29243529", 14.56482, 121.03652),
    "makati_city_hall": ("Makati City Hall", "way/844522094", 14.57048, 121.02722),
    "ayala_museum": ("Ayala Museum", "node/21717872", 14.55358, 121.02324),
    "one_ayala": ("One Ayala by Ayala Malls", "way/270018476", 14.55051, 121.02789),
    "salcedo_weekend_market": ("Salcedo Weekend Market", "node/4535189996", 14.55996, 121.02307),
}

WALK_FACTOR = 1.3            # street distance ≈ straight line × 1.3
WALK_M_PER_MIN = 75          # unhurried city walking
RIDE_M_PER_MIN = 250         # ~15 km/h in Makati traffic
WAIT_MIN = {"jeepney": 6, "e-jeepney": 8, "bus": 8, "p2p": 15, "uv-express": 10}
ACCESS_M = 450               # max straight-line walk to a boarding / from an alighting point
TRANSFER_M = 250             # max straight-line walk between two routes
WALK_ONLY_M = 1600           # straight-line distance up to which walking is offered
MIN_RIDE_M = 500             # shorter rides aren't worth waiting for


def haversine(a, b):
    lat1, lon1, lat2, lon2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def project(p, a, b):
    """Closest point to p on segment a-b (lat/lon treated as locally planar). Returns (t, point)."""
    kx = math.cos(math.radians(p[0]))
    ax, ay, bx, by, px, py = a[1] * kx, a[0], b[1] * kx, b[0], p[1] * kx, p[0]
    dx, dy = bx - ax, by - ay
    t = 0.0 if dx == dy == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return t, (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def mode_of(tags):
    name, operator, ref = tags.get("name", ""), tags.get("operator", ""), tags.get("ref", "")
    if tags.get("route") == "share_taxi" or "UV Express" in name:
        return "uv-express"
    if "P2P" in name or "Premium" in name:
        return "p2p"
    if "eSakay" in operator:
        return "e-jeepney"
    if re.search(r"Transport Service Cooperative|Transport Cooperative|Jeepney|Drivers", operator) or re.fullmatch(r"T?\d{3,4}", ref or ""):
        return "jeepney"
    return "bus"


def is_long_distance(tags):
    """Provincial buses don't take passengers for trips within Makati."""
    name = tags.get("name", "")
    return bool(re.search(r"PITX–(?!Circuit)|Lucena|Batangas|Nasugbu|Tagaytay|Legazpi|Sorsogon|Daet|Naga|Matnog|Tabaco|"
                          r"Lemery|Balayan|Calatagan|Infanta|Siniloan|Santa Cruz|Lipa|Clark|Pasacao|Balatan|Bulan|Mariveles|Bataan", name))


def load():
    data = json.loads((CACHE / "routes.json").read_text())
    rels, ways, nodes = {}, {}, {}
    for e in data["elements"]:
        if e["type"] == "relation":
            rels[e["id"]] = e
        elif e["type"] == "way":
            ways[e["id"]] = e
        else:
            nodes[e["id"]] = e
    return data.get("fetched"), rels, ways, nodes


def chain(rel, ways):
    """Ordered polyline of the route's travel ways: [(lat, lon, street_name)]. Ways are flipped to connect."""
    points, last_node = [], None
    for m in rel["members"]:
        if m["type"] != "way" or m["role"] not in ("", "forward", "backward") or m["ref"] not in ways:
            continue
        w = ways[m["ref"]]
        geom = [(g["lat"], g["lon"]) for g in w.get("geometry", [])]
        ids = w.get("nodes", [])
        if len(geom) < 2 or len(ids) != len(geom):
            continue
        if last_node is not None:
            if ids[-1] == last_node and ids[0] != last_node:
                geom, ids = geom[::-1], ids[::-1]
            elif ids[0] != last_node and points:
                # not connected by node id: orient toward the closer end
                if haversine(points[-1][:2], geom[-1]) < haversine(points[-1][:2], geom[0]):
                    geom, ids = geom[::-1], ids[::-1]
        elif m["role"] == "backward":
            geom, ids = geom[::-1], ids[::-1]
        street = w.get("tags", {}).get("name", "")
        start = 1 if points and ids[0] == last_node else 0
        points += [(lat, lon, street) for lat, lon in geom[start:]]
        last_node = ids[-1]
    # A route whose first way was mapped backwards starts at the wrong end: flip the first way if needed.
    return points


def cumulative(points):
    d = [0.0]
    for a, b in zip(points, points[1:]):
        d.append(d[-1] + haversine(a, b))
    return d


def locate(p, points, cum):
    """Closest approach of point p to the polyline: (distance_m, along_m, (lat, lon), street)."""
    best = (float("inf"), 0, None, "")
    for i in range(len(points) - 1):
        t, q = project(p, points[i], points[i + 1])
        d = haversine(p, q)
        if d < best[0]:
            best = (d, cum[i] + t * (cum[i + 1] - cum[i]), q, points[i][2] or points[i + 1][2])
    return best


def approaches(p, points, cum, radius):
    """Every separate pass of the route within `radius` of p: list of (distance, along, point, street)."""
    out, current = [], None
    for i in range(len(points) - 1):
        t, q = project(p, points[i], points[i + 1])
        d = haversine(p, q)
        along = cum[i] + t * (cum[i + 1] - cum[i])
        if d <= radius:
            hit = (d, along, q, points[i][2] or points[i + 1][2])
            if current is None or along - current[1] > 600:
                if current is not None:
                    out.append(current)
                current = hit
            elif d < current[0]:
                current = hit
        elif current is not None and along - current[1] > 600:
            out.append(current)
            current = None
    if current is not None:
        out.append(current)
    return out


def simplify(coords, tolerance_m=12):
    if len(coords) < 3:
        return coords
    a, b = coords[0], coords[-1]
    worst, index = -1, 0
    for i in range(1, len(coords) - 1):
        _, q = project(coords[i], a, b)
        d = haversine(coords[i], q)
        if d > worst:
            worst, index = d, i
    if worst <= tolerance_m:
        return [a, b]
    return simplify(coords[:index + 1], tolerance_m)[:-1] + simplify(coords[index:], tolerance_m)


class PublishedRoute:
    """A route reported by a news source but not (yet) mapped in OpenStreetMap. No path geometry."""

    def __init__(self, rid, name, mode, stops, source, operator=None, ref=None, note=None):
        self.id, self.name, self.mode, self.ref, self.source = rid, name, mode, ref, source
        self.tags = {"name": name, "operator": operator, "from": stops[0][0], "to": stops[-1][0], "note": note}
        along, self.stops = 0.0, []
        for i, (stop_name, lat, lon) in enumerate(stops):
            if i:
                along += haversine(self.stops[-1]["latlon"], (lat, lon)) * 1.4  # road distance estimate
            self.stops.append({"name": stop_name, "lat": lat, "lon": lon, "along": along, "latlon": (lat, lon)})
        self.points, self.cum, self.hail_anywhere = [(lat, lon, "") for _, lat, lon in stops], [s["along"] for s in self.stops], False

    stop_points = None  # assigned below

    def path(self, a, b):
        return []


CIRCUIT_P2P = "https://www.topgear.com.ph/news/motoring-news/p2p-2026-circuit-makati-one-ayala-a2619-20260428"
PUBLISHED = [
    PublishedRoute("published-circuit-one-ayala", "Circuit Makati–One Ayala P2P", "p2p",
                   [("The CityFlats Circuit loading point", 14.57394, 121.01789), ("One Ayala terminal", 14.55029, 121.02816)],
                   CIRCUIT_P2P, note="Weekdays except holidays; beep card payment (as reported 2026-04-28)."),
    PublishedRoute("published-one-ayala-circuit", "One Ayala–Circuit Makati P2P", "p2p",
                   [("One Ayala terminal", 14.55029, 121.02816), ("Gallery Drive, Circuit Makati", 14.57478, 121.01919)],
                   CIRCUIT_P2P, note="Weekdays except holidays; beep card payment (as reported 2026-04-28)."),
]


class Route:
    def __init__(self, rel, ways, nodes):
        tags = rel.get("tags", {})
        self.id = rel["id"]
        self.tags = tags
        self.name = tags.get("name", f"Route {rel['id']}")
        self.ref = tags.get("ref")
        self.mode = mode_of(tags)
        self.points = chain(rel, ways)
        self.cum = cumulative(self.points) if self.points else [0]
        self.stops = []
        for m in rel["members"]:
            if m["type"] == "node" and m["role"].startswith(("stop", "platform")) and m["ref"] in nodes:
                n = nodes[m["ref"]]
                p = (n["lat"], n["lon"])
                d, along, _, street = locate(p, self.points, self.cum) if self.points else (999, 0, None, "")
                if d < 60:
                    name = n.get("tags", {}).get("name") or street
                    self.stops.append({"lat": n["lat"], "lon": n["lon"], "along": along, "name": name})
        self.hail_anywhere = self.mode in ("jeepney", "e-jeepney") and len(self.stops) < 2
        self.source = f"https://www.openstreetmap.org/relation/{rel['id']}"

    def stop_points(self, p, radius, boarding=None):
        """Places to board/alight near p, as (walk_m_straight, along, (lat, lon), label)."""
        if self.hail_anywhere:
            return [(d, a, q, f"along {street}" if street else "along the route") for d, a, q, street in
                    approaches(p, self.points, self.cum, radius)]
        stops = self.stops
        if boarding and self.mode in ("p2p", "uv-express"):
            stops = stops[:1]  # point-to-point services load only at their terminal
        return [(haversine(p, (s["lat"], s["lon"])), s["along"], (s["lat"], s["lon"]), s["name"] or "the stop")
                for s in stops if haversine(p, (s["lat"], s["lon"])) <= radius]

    def path(self, a, b):
        coords = [(lat, lon) for (lat, lon, _), d in zip(self.points, self.cum) if a <= d <= b]
        return [[round(lon, 6), round(lat, 6)] for lat, lon in simplify(coords)]


PublishedRoute.stop_points = lambda self, p, radius, boarding=None: Route.stop_points(self, p, radius, boarding)


def walk_leg(frm, to, frm_name, to_name, text=None):
    meters = round(haversine(frm, to) * WALK_FACTOR)
    return {"type": "walk", "meters": meters, "minutes": max(1, round(meters / WALK_M_PER_MIN)),
            "from": {"name": frm_name, "lat": round(frm[0], 6), "lon": round(frm[1], 6)},
            "to": {"name": to_name, "lat": round(to[0], 6), "lon": round(to[1], 6)},
            "text": text or f"Walk to {to_name}."}


def ride_leg(route, board, alight):
    meters = round(alight[1] - board[1])
    return {"type": "ride", "route": str(route.id), "meters": meters,
            "minutes": WAIT_MIN[route.mode] + max(1, round(meters / RIDE_M_PER_MIN)),
            "board": {"name": board[3], "lat": round(board[2][0], 6), "lon": round(board[2][1], 6)},
            "alight": {"name": alight[3], "lat": round(alight[2][0], 6), "lon": round(alight[2][1], 6)},
            "path": route.path(board[1], alight[1])}


def option(legs, kind):
    return {"kind": kind, "minutes": sum(l["minutes"] for l in legs),
            "walkMeters": sum(l["meters"] for l in legs if l["type"] == "walk"), "legs": legs}


def direct_rides(routes, a, b, a_name, b_name, straight, access=ACCESS_M, min_ride=MIN_RIDE_M):
    found = {}
    for r in routes:
        for board in r.stop_points(a, access, boarding=True):
            for alight in r.stop_points(b, access):
                ride = alight[1] - board[1]
                if ride < min_ride or ride > 3 * straight + 1500:
                    continue
                legs = [walk_leg(a, board[2], a_name, board[3], f"Walk to {board[3]}."), ride_leg(r, board, alight),
                        walk_leg(alight[2], b, alight[3], b_name, f"Walk to {b_name}.")]
                opt = option(legs, "ride")
                key = (r.mode, r.ref or r.name.split(" (")[0])  # one entry per signboard: variants of a route collapse
                if key not in found or opt["minutes"] < found[key]["minutes"]:
                    found[key] = opt
    return list(found.values())


def transfer_rides(routes, a, b, a_name, b_name, straight, access=ACCESS_M, transfer=TRANSFER_M, min_ride=MIN_RIDE_M):
    best = []
    starts = [(r, s) for r in routes for s in r.stop_points(a, access, boarding=True)]
    ends = [(r, s) for r in routes for s in r.stop_points(b, access)]
    for r1, board1 in starts:
        for r2, alight2 in ends:
            if r1 is r2 or (r1.name, r1.ref) == (r2.name, r2.ref):
                continue
            # transfer: a point of r1 after board1 close to a point of r2 before alight2
            for i in range(0, len(r1.points), 3):
                along1 = r1.cum[i]
                if along1 - board1[1] < min_ride:
                    continue
                p = r1.points[i][:2]
                for board2 in r2.stop_points(p, transfer, boarding=True):
                    if alight2[1] - board2[1] < min_ride:
                        continue
                    alight1 = (0, along1, p, r1.points[i][2] and f"along {r1.points[i][2]}" or "the transfer point")
                    if not r1.hail_anywhere:
                        near = [s for s in r1.stops if abs(s["along"] - along1) < 150]
                        if not near:
                            continue
                        s = min(near, key=lambda s: abs(s["along"] - along1))
                        alight1 = (0, s["along"], (s["lat"], s["lon"]), s["name"])
                        if alight1[1] - board1[1] < min_ride:
                            continue  # snapping to a mapped stop made the first ride too short
                    total_ride = (alight1[1] - board1[1]) + (alight2[1] - board2[1])
                    if total_ride > 3 * straight + 2000:
                        continue
                    legs = [walk_leg(a, board1[2], a_name, board1[3]), ride_leg(r1, board1, alight1),
                            walk_leg(alight1[2], board2[2], alight1[3], board2[3], f"Transfer: walk to {board2[3]}."),
                            ride_leg(r2, board2, alight2), walk_leg(alight2[2], b, alight2[3], b_name, f"Walk to {b_name}.")]
                    best.append(option(legs, "transfer"))
    best.sort(key=lambda o: o["minutes"])
    out, seen = [], set()
    names = {str(r.id): r.name.split(" via ")[0].split(" (")[0] for r in routes}
    for o in best:
        # variants of one signboard (e.g. "Guadalupe–L. Guinto via Pasig Line / via Pedro Gil") count once
        key = tuple(names[l["route"]] for l in o["legs"] if l["type"] == "ride")
        if key not in seen:
            seen.add(key)
            out.append(o)
    return out[:2]


def main():
    fetched, rels, ways, nodes = load()
    routes = []
    for rel in rels.values():
        tags = rel.get("tags", {})
        if is_long_distance(tags):
            continue
        r = Route(rel, ways, nodes)
        if len(r.points) >= 2 and (r.hail_anywhere or len(r.stops) >= 2):
            routes.append(r)
    print(f"{len(routes)} usable route relations of {len(rels)}")
    routes += PUBLISHED

    journeys, used = {}, set()
    for a_id, (a_name, *_rest, a_lat, a_lon) in PLACES.items():
        for b_id, (b_name, *_r, b_lat, b_lon) in PLACES.items():
            if a_id == b_id:
                continue
            a, b = (a_lat, a_lon), (b_lat, b_lon)
            straight = haversine(a, b)
            options = []
            if straight <= WALK_ONLY_M:
                options.append(option([walk_leg(a, b, a_name, b_name, f"Walk to {b_name}.")], "walk"))
            rides = direct_rides(routes, a, b, a_name, b_name, straight)
            walk_minutes = round(straight * WALK_FACTOR / WALK_M_PER_MIN)
            # Near places, a ride is offered only if it isn't much slower than walking.
            rides = [o for o in rides if straight > WALK_ONLY_M or o["minutes"] <= walk_minutes + 5]
            rides.sort(key=lambda o: (o["minutes"], o["walkMeters"]))
            options += rides[:3]
            if not rides and straight > WALK_ONLY_M:
                options += transfer_rides(routes, a, b, a_name, b_name, straight)
            if not any(o["kind"] != "walk" for o in options) and straight > WALK_ONLY_M:
                # Few mapped routes nearby: accept a longer walk to the route and shorter legs before giving up.
                relaxed = dict(access=700, min_ride=400)
                rides = sorted(direct_rides(routes, a, b, a_name, b_name, straight, **relaxed), key=lambda o: o["minutes"])[:3]
                options += rides or transfer_rides(routes, a, b, a_name, b_name, straight, transfer=400, **relaxed)
            if not options:
                options.append(option([walk_leg(a, b, a_name, b_name,
                                                f"No mapped PUV route links these places. Walk, or take a taxi or ride-hailing car, to {b_name}.")], "walk"))
            options.sort(key=lambda o: o["minutes"])
            for o in options:
                used.update(l["route"] for l in o["legs"] if l["type"] == "ride")
            journeys[f"{a_id}|{b_id}"] = {"straightMeters": round(straight), "options": options}

    by_id = {str(r.id): r for r in routes}
    out = {
        "generated": fetched,
        "attribution": "Route and place data © OpenStreetMap contributors (ODbL), via the Overpass API.",
        "method": "Boarding/alighting at mapped stops within 450 m, or along hail-anywhere jeepney routes; walking ≈ straight line × 1.3 at 75 m/min; rides at ~15 km/h plus typical wait. Estimates, not schedules.",
        "places": [{"id": k, "name": v[0], "osm": v[1], "lat": v[2], "lon": v[3]} for k, v in PLACES.items()],
        "routes": {rid: {"name": by_id[rid].name, "ref": by_id[rid].ref, "mode": by_id[rid].mode,
                         "operator": by_id[rid].tags.get("operator"), "from": by_id[rid].tags.get("from"),
                         "to": by_id[rid].tags.get("to"),
                         # OSM "note" tags are messages to mappers, not riders; only published routes carry a service note.
                         "note": by_id[rid].tags.get("note") if isinstance(by_id[rid], PublishedRoute) else None,
                         "source": by_id[rid].source} for rid in sorted(used)},
        "journeys": journeys,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n")
    kinds = {}
    for j in journeys.values():
        k = j["options"][0]["kind"]
        kinds[k] = kinds.get(k, 0) + 1
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB); best option per pair: {kinds}; routes used: {len(used)}")


if __name__ == "__main__":
    main()
