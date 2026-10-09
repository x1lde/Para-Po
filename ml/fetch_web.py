"""Collect landmark candidate photos from Bing image search for local training.

Usage:
    python3 ml/fetch_web.py --out ~/Documents/trained/web [--target 250] [--labels greenbelt,sm_makati]

Images are mostly copyrighted: keep them local (never commit them). Only the source URLs are
recorded, in <out>/web_sources.csv, so the set can be rebuilt. Candidates still need a visual review
before being added to ml/labels.csv.
"""

import argparse
import csv
import html
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageOps

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"}
VARIANTS = ["", " exterior", " building", " facade", " entrance", " night", " street view", " photo", " Makati landmark"]
NAMES = {
    "ayala_center": "Ayala Center Makati",
    "avida_towers_makati_southpoint": "Avida Towers Makati Southpoint",
    "ayala_malls_circuit": "Ayala Malls Circuit Makati",
    "st_john_bosco_parish": "St. John Bosco Parish Church Makati",
    "manila_premiere_wines": "Manila Premiere Wines Makati",
    "rcbc_plaza": "RCBC Plaza Makati",
    "sm_makati": "SM Makati",
    "the_landmark_makati": "The Landmark Makati department store",
    "greenbelt": "Greenbelt Makati",
    "glorietta": "Glorietta Makati",
    "powerplant_mall": "Power Plant Mall Rockwell Makati",
    "makati_city_hall": "Makati City Hall",
    "ayala_museum": "Ayala Museum Makati",
    "one_ayala": "One Ayala Makati",
    "salcedo_weekend_market": "Salcedo Saturday Market Makati",
}
# Alternate names / phrasings for a second pass (--extra) on landmarks that came back thin
EXTRA = {
    "ayala_center": ["Ayala Center Makati aerial", "Ayala Center Makati Ayala Avenue corner Makati Avenue", "Ayala Center Glorietta Greenbelt walkway"],
    "avida_towers_makati_southpoint": ["Avida Southpoint Makati condo", "Avida Towers Makati Southpoint Chino Roces", "Makati Southpoint Avida tower"],
    "ayala_malls_circuit": ["Circuit Makati mall", "Circuit Lane Makati", "Ayala Malls Circuit exterior Hippodromo"],
    "st_john_bosco_parish": ["Don Bosco Church Makati", "Don Bosco Makati church Arnaiz", "San Juan Bosco Parish Makati"],
    "manila_premiere_wines": ["Manila Premiere Wines store Makati"],
    "rcbc_plaza": ["RCBC Plaza Ayala Avenue Buendia", "Yuchengco Tower Makati", "RCBC Plaza tower"],
    "sm_makati": ["SM Department Store Makati Ayala Center", "SM Makati exterior Ayala Center", "SM Makati building facade"],
    "the_landmark_makati": ["Landmark department store Ayala Center", "The Landmark Makati exterior", "Landmark Makati building"],
    "glorietta": ["Glorietta 4 Makati", "Glorietta 5 Makati", "Glorietta 1 Makati", "Glorietta park Makati"],
    "powerplant_mall": ["Rockwell Center Power Plant Mall exterior", "Power Plant Mall facade", "Rockwell Makati Power Plant"],
    "ayala_museum": ["Ayala Museum building Greenbelt", "Ayala Museum Makati Avenue facade"],
    "one_ayala": ["One Ayala mall terminal Makati", "One Ayala EDSA Ayala Avenue", "One Ayala towers Makati"],
    "salcedo_weekend_market": ["Salcedo Community Market", "Jaime Velasquez Park Salcedo Village", "Salcedo Saturday market stalls"],
}
MAX_SIDE = 800
MIN_SIDE = 200


def bing_page(query, first):
    url = "https://www.bing.com/images/async?" + urllib.parse.urlencode(
        {"q": query, "first": first, "count": 35, "mmasync": 1, "adlt": "strict"})
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        page = r.read().decode("utf-8", "replace")
    out = []
    for m in re.findall(r'\bm="(\{[^"]+\})"', page):
        d = json.loads(html.unescape(m))
        if d.get("murl"):
            out.append({"url": d["murl"], "page": d.get("purl", ""), "title": d.get("t", ""), "query": query})
    return out


def dhash(im):
    g = im.convert("L").resize((9, 8))
    px = list(g.tobytes())
    return sum(1 << i for i in range(64) if px[(i // 8) * 9 + i % 8] > px[(i // 8) * 9 + i % 8 + 1])


def fetch_image(c):
    try:
        req = urllib.request.Request(c["url"], headers=UA)
        with urllib.request.urlopen(req, timeout=15) as r:
            data = r.read(15_000_000)
        im = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    except Exception:  # noqa: BLE001  (dead links, non-images, timeouts)
        return None
    if min(im.size) < MIN_SIDE:
        return None
    im.thumbnail((MAX_SIDE, MAX_SIDE))
    return im


def existing_hashes(data_root):
    hashes = []
    for p in data_root.rglob("*"):
        if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"):
            try:
                hashes.append(dhash(ImageOps.exif_transpose(Image.open(p))))
            except Exception:  # noqa: BLE001
                pass
    return hashes


def is_dup(h, hashes, max_dist=6):
    return any(bin(h ^ o).count("1") <= max_dist for o in hashes)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(Path.home() / "Documents" / "trained" / "web"))
    ap.add_argument("--target", type=int, default=250, help="candidates to keep per landmark")
    ap.add_argument("--labels", default=",".join(NAMES))
    ap.add_argument("--extra", action="store_true", help="search the alternate names in EXTRA instead")
    args = ap.parse_args()
    out = Path(args.out).expanduser()
    out.mkdir(parents=True, exist_ok=True)
    seen = existing_hashes(out.parent)  # skip anything already in the dataset (team, Commons, earlier runs)
    print(f"{len(seen)} existing images hashed", file=sys.stderr)

    log = out / "web_sources.csv"
    known = {r["url"] for r in csv.DictReader(open(log))} if log.exists() else set()
    new_log = not log.exists()
    f = open(log, "a", newline="")
    w = csv.DictWriter(f, fieldnames=["label", "path", "url", "page", "title", "query"])
    if new_log:
        w.writeheader()

    for label in args.labels.split(","):
        d = out / label
        d.mkdir(exist_ok=True)
        have = len(list(d.glob("*.jpg")))
        cands, urls = [], set(known)
        queries = ([q + v for q in EXTRA.get(label, []) for v in ("", " photo", " night")] if args.extra
                   else [NAMES[label] + v for v in VARIANTS])
        for query in queries:
            for first in range(0, 140, 35):
                try:
                    page = bing_page(query, first)
                except Exception as e:  # noqa: BLE001
                    print(f"  search failed ({e}); stopping this query", file=sys.stderr)
                    break
                fresh = [c for c in page if c["url"] not in urls]
                urls.update(c["url"] for c in fresh)
                cands += fresh
                time.sleep(1.0)
                if not fresh:
                    break
        print(f"{label}: {len(cands)} new candidate urls", file=sys.stderr)

        with ThreadPoolExecutor(12) as pool:
            for c, im in zip(cands, pool.map(fetch_image, cands)):
                if have >= args.target:
                    break
                if im is None:
                    continue
                h = dhash(im)
                if is_dup(h, seen):
                    continue
                seen.append(h)
                name = f"{label}_{have:04d}.jpg"
                im.save(d / name, quality=88)
                w.writerow({"label": label, "path": f"{label}/{name}", **c})
                have += 1
        f.flush()
        print(f"{label}: {have} images on disk", file=sys.stderr)
    f.close()


if __name__ == "__main__":
    main()
