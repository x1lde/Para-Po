"""Fetch Makati public-transport routes and landmark positions from OpenStreetMap (Overpass API).

    python3 tools/transit/fetch_osm.py            # writes tools/transit/cache/*.json

Route data is OpenStreetMap community data (© OpenStreetMap contributors, ODbL); the app shows that
attribution. Results are cached, so re-running build_journeys.py needs no network.
"""

import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

CACHE = Path(__file__).resolve().parent / "cache"
MIRRORS = [
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
# Makati plus a margin, so routes that leave the city briefly between two landmarks stay whole.
BBOX = "14.515,120.995,14.595,121.075"

QUERIES = {
    # Every PUV route relation touching the area (modern jeepneys are tagged route=bus in Metro Manila),
    # with member ways (geometry) and stop/platform nodes.
    "routes": f"""[out:json][timeout:240];
relation["type"="route"]["route"~"^(bus|share_taxi|minibus|jeepney|trolleybus)$"]({BBOX})->.r;
.r out body;
way(r.r);
out body geom;
node(r.r);
out body;""",
    # Candidate features for the 14 supported landmarks.
    "landmarks": f"""[out:json][timeout:180];
nwr["name"~"Glorietta|Greenbelt|Landmark|SM Makati|One Ayala|Ayala Museum|Ayala Center|Circuit|Power Plant|City Hall|Salcedo|Bosco|RCBC|Avida|Southpoint|Jaime Velasquez",i]["highway"!~"."]["railway"!~"."]({BBOX});
out center tags;""",
}


def overpass(query):
    last = None
    for attempt in range(3):
        for url in MIRRORS:
            try:
                req = urllib.request.Request(url, data=urllib.parse.urlencode({"data": query}).encode(),
                                             headers={"User-Agent": "ParaPo-transit-builder/1.0"})
                with urllib.request.urlopen(req, timeout=300) as response:
                    body = response.read()
                return json.loads(body)
            except Exception as error:  # busy mirrors return 429/504 or HTML; try the next one
                last = error
                print(f"  {url}: {error}", file=sys.stderr)
        time.sleep(20 * (attempt + 1))
    raise SystemExit(f"Overpass unavailable: {last}")


def main():
    CACHE.mkdir(exist_ok=True)
    names = sys.argv[1:] or list(QUERIES)
    for name in names:
        print(f"fetching {name} ...")
        data = overpass(QUERIES[name])
        data["fetched"] = time.strftime("%Y-%m-%d")
        (CACHE / f"{name}.json").write_text(json.dumps(data))
        print(f"  {len(data['elements'])} elements")


if __name__ == "__main__":
    main()
