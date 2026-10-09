"""Fetch landmark photos via Google's official APIs: Places (New) photos + Street View Static.

Usage:
    GOOGLE_MAPS_API_KEY=... python3 ml/fetch_google.py --out ~/Documents/trained/google

Every image is tied to the right place:
- Places photos come from the place ID returned by a Text Search restricted to Makati (up to 10 per place).
- Street View frames come from panoramas found on a ring of points around the landmark's coordinates,
  with the camera heading computed to point *at* the landmark, so each frame is a different angle of it.
Free metadata calls are made before any billed image request. Images stay local (Google ToS: no
redistribution); <out>/google_sources.csv records place IDs, pano IDs and attributions.
"""

import argparse
import csv
import json
import math
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

PLACES = "https://places.googleapis.com/v1/places:searchText"
SV_META = "https://maps.googleapis.com/maps/api/streetview/metadata"
SV_IMG = "https://maps.googleapis.com/maps/api/streetview"
MAKATI_BOX = {"low": {"latitude": 14.52, "longitude": 120.99}, "high": {"latitude": 14.59, "longitude": 121.07}}

QUERIES = {
    "ayala_center": "Ayala Center, Makati",
    "avida_towers_makati_southpoint": "Avida Towers Makati Southpoint",
    "ayala_malls_circuit": "Ayala Malls Circuit, Makati",
    "st_john_bosco_parish": "St. John Bosco Parish, Makati",
    "manila_premiere_wines": "Manila Premiere Wines, Makati",
    "rcbc_plaza": "RCBC Plaza, Makati",
    "sm_makati": "SM Makati",
    "the_landmark_makati": "The Landmark Makati",
    "greenbelt": "Greenbelt by Ayala Malls, Makati",
    "glorietta": "Glorietta by Ayala Malls, Makati",
    "powerplant_mall": "Power Plant Mall, Rockwell, Makati",
    "makati_city_hall": "Makati City Hall",
    "ayala_museum": "Ayala Museum, Makati",
    "one_ayala": "One Ayala by Ayala Malls, Makati",
    "salcedo_weekend_market": "Salcedo Saturday Market, Jaime C. Velasquez Park, Makati",
}
RING_RADII_M = (25, 50, 80)     # distances of the sample points from the landmark
RING_BEARINGS = range(0, 360, 30)
PITCHES = (5, 20)               # look slightly up: buildings, signage
FOVS = (70, 90)


def get(url, headers=None, data=None, binary=False):
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, data=data, headers=headers or {})
            with urllib.request.urlopen(req, timeout=30) as r:
                body = r.read()
            return body if binary else json.loads(body)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503):
                time.sleep(2 ** attempt)
                continue
            if e.code == 404 and binary:
                return None
            raise RuntimeError(f"{e.code} {e.read()[:300]!r}") from None
    raise RuntimeError(f"gave up on {url}")


def find_place(key, query):
    body = json.dumps({"textQuery": query, "locationRestriction": {"rectangle": MAKATI_BOX}, "pageSize": 1}).encode()
    d = get(PLACES, data=body, headers={
        "Content-Type": "application/json", "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.photos"})
    return (d.get("places") or [None])[0]


def offset(lat, lng, dist_m, bearing_deg):
    r = 6371000.0
    b, la1, lo1 = map(math.radians, (bearing_deg, lat, lng))
    la2 = math.asin(math.sin(la1) * math.cos(dist_m / r) + math.cos(la1) * math.sin(dist_m / r) * math.cos(b))
    lo2 = lo1 + math.atan2(math.sin(b) * math.sin(dist_m / r) * math.cos(la1), math.cos(dist_m / r) - math.sin(la1) * math.sin(la2))
    return math.degrees(la2), math.degrees(lo2)


def bearing(lat1, lng1, lat2, lng2):
    la1, la2, dl = math.radians(lat1), math.radians(lat2), math.radians(lng2 - lng1)
    y = math.sin(dl) * math.cos(la2)
    x = math.cos(la1) * math.sin(la2) - math.sin(la1) * math.cos(la2) * math.cos(dl)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def haversine(lat1, lng1, lat2, lng2):
    la1, la2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin(math.radians(lng2 - lng1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(a))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(Path.home() / "Documents" / "trained" / "google"))
    ap.add_argument("--labels", default=",".join(QUERIES))
    ap.add_argument("--max-streetview", type=int, default=120, help="billed Street View images per landmark")
    ap.add_argument("--dry-run", action="store_true", help="only resolve places and count available panoramas (free)")
    args = ap.parse_args()
    key = os.environ.get("GOOGLE_MAPS_API_KEY") or sys.exit("set GOOGLE_MAPS_API_KEY")
    out = Path(args.out).expanduser()
    out.mkdir(parents=True, exist_ok=True)
    log_path = out / "google_sources.csv"
    new = not log_path.exists()
    log = open(log_path, "a", newline="")
    w = csv.DictWriter(log, fieldnames=["label", "path", "kind", "place_id", "place_name", "pano_id", "heading", "attribution"])
    if new:
        w.writeheader()

    for label in args.labels.split(","):
        place = find_place(key, QUERIES[label])
        if not place:
            print(f"{label}: no place found for {QUERIES[label]!r}", file=sys.stderr)
            continue
        lat, lng = place["location"]["latitude"], place["location"]["longitude"]
        name = place["displayName"]["text"]
        print(f"{label}: {name} | {place.get('formattedAddress')} | {lat:.5f},{lng:.5f}", file=sys.stderr)
        d = out / label
        d.mkdir(exist_ok=True)

        # Places photos (user + owner uploads for this exact place ID)
        for i, ph in enumerate(place.get("photos", [])):
            dest = d / f"places_{i:02d}.jpg"
            if not args.dry_run and not dest.exists():
                img = get(f"https://places.googleapis.com/v1/{ph['name']}/media?maxWidthPx=800&key={key}", binary=True)
                if img:
                    dest.write_bytes(img)
            attr = "; ".join(a.get("displayName", "") for a in ph.get("authorAttributions", []))
            if not args.dry_run:
                w.writerow({"label": label, "path": f"{label}/{dest.name}", "kind": "places", "place_id": place["id"],
                            "place_name": name, "pano_id": "", "heading": "", "attribution": attr})

        # Street View: unique outdoor panoramas around the landmark, camera aimed at it
        panos = {}
        for r in RING_RADII_M:
            for b in RING_BEARINGS:
                plat, plng = offset(lat, lng, r, b)
                m = get(f"{SV_META}?location={plat},{plng}&radius=30&source=outdoor&key={key}")
                if m.get("status") == "OK" and m["pano_id"] not in panos:
                    loc = m["location"]
                    if haversine(loc["lat"], loc["lng"], lat, lng) <= 120:
                        panos[m["pano_id"]] = (loc["lat"], loc["lng"], m.get("copyright", ""))
        print(f"  {len(place.get('photos', []))} place photos, {len(panos)} panoramas within 120 m", file=sys.stderr)
        if args.dry_run:
            continue

        n = 0
        for pano, (plat, plng, cr) in panos.items():
            h = bearing(plat, plng, lat, lng)
            for pitch in PITCHES:
                for fov in FOVS:
                    if n >= args.max_streetview:
                        break
                    dest = d / f"sv_{pano[:12]}_{int(h)}_{pitch}_{fov}.jpg"
                    if not dest.exists():
                        img = get(f"{SV_IMG}?size=640x640&pano={pano}&heading={h:.1f}&pitch={pitch}&fov={fov}"
                                  f"&return_error_code=true&key={key}", binary=True)
                        if not img:
                            continue
                        dest.write_bytes(img)
                    w.writerow({"label": label, "path": f"{label}/{dest.name}", "kind": "streetview", "place_id": place["id"],
                                "place_name": name, "pano_id": pano, "heading": f"{h:.1f}", "attribution": cr})
                    n += 1
        log.flush()
        print(f"  saved {n} street view frames", file=sys.stderr)
    log.close()


if __name__ == "__main__":
    main()
