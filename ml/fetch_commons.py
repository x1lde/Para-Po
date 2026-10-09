"""Fetch openly licensed landmark photos from Wikimedia Commons.

Usage:
    python3 ml/fetch_commons.py --out ~/Documents/trained/commons            # list (cached) + download
    python3 ml/fetch_commons.py --out ~/Documents/trained/commons --refresh  # re-list to pick up new uploads

Rate limits are respected, not evaded: API calls are batched and sent with maxlag; downloads are
paced from the thumbnail server's x-ratelimit-* headers and Retry-After. Re-runs skip existing files.
Writes <out>/<label>/*.jpg and <out>/sources.csv (author + license for attribution).
"""

import argparse
import csv
import json
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

UA = {"User-Agent": "ParaPoLandmarkFetcher/0.2 (student hackathon project; https://github.com/PrinceJorick/Para-Po)"}
API = "https://commons.wikimedia.org/w/api.php"
THUMB_WIDTH = 500  # a standard Wikimedia thumbnail step: served from cache, cheapest to fetch
MAX_DEPTH = 2

# label -> (categories, searched recursively; full-text file searches)
SOURCES = {
    "ayala_center": (["Category:Ayala Center", "Category:The Link car park (Ayala Center)"], []),
    "avida_towers_makati_southpoint": ([], ["Avida Towers Makati Southpoint", "Avida Towers Southpoint"]),
    "ayala_malls_circuit": (["Category:Ayala Malls Circuit"], ["Ayala Malls Circuit"]),
    "st_john_bosco_parish": (["Category:Saint John Bosco Parish Church (Pio del Pilar, Makati City)",
                              "Category:Don Bosco Church (San Lorenzo, Makati City)"], ["Saint John Bosco Parish Makati"]),
    "manila_premiere_wines": ([], ["Manila Premiere Wines"]),
    "rcbc_plaza": (["Category:RCBC Plaza"], ["RCBC Plaza Makati"]),
    "sm_makati": (["Category:SM Makati"], []),
    "the_landmark_makati": (["Category:The Landmark (Ayala Center)"], ["The Landmark Makati"]),
    "greenbelt": (["Category:Greenbelt (Ayala Center)"], []),
    "glorietta": (["Category:Glorietta complex"], ["Glorietta Makati"]),
    "powerplant_mall": (["Category:Power Plant Mall"], ["Power Plant Mall Rockwell"]),
    "makati_city_hall": (["Category:Makati City Hall"], []),
    "ayala_museum": (["Category:Ayala Museum"], ["Ayala Museum Makati"]),
    "one_ayala": (["Category:One Ayala"], ["One Ayala Makati"]),
    "salcedo_weekend_market": ([], ["Salcedo Saturday Market", "Salcedo Market Makati", "Jaime Velasquez Park"]),
}
# Subcategories that don't show the landmark from the street
SKIP_SUBCAT = re.compile(r"exhibit|art project|interior|works in|paintings|by josefa|stations of the cross|"
                         r"grotto|chapel|historical marker|old presidencia|ayala \(edsa|organic garden", re.I)
# Subcategories that belong to another label's class
SKIP_OTHER = {"ayala_center": re.compile(r"greenbelt|landmark|glorietta|ayala museum|one ayala", re.I)}


class Pacer:
    """Shared pacing for one host: waits on Retry-After or when the advertised budget runs low."""

    def __init__(self, min_interval):
        self.min_interval = min_interval
        self.lock = threading.Lock()
        self.next_at = 0.0

    def wait(self):
        with self.lock:
            now = time.time()
            at = max(now, self.next_at)
            self.next_at = at + self.min_interval
        time.sleep(max(0.0, at - now))

    def pause(self, seconds):
        with self.lock:
            self.next_at = max(self.next_at, time.time() + seconds)

    def observe(self, headers):
        limit = headers.get("x-ratelimit-limit", "")
        remaining, reset = headers.get("x-ratelimit-remaining"), headers.get("x-ratelimit-reset")
        m = re.match(r"\s*(\d+)", limit)
        if m and remaining and reset and int(remaining) < int(m.group(1)) * 0.05:
            self.pause(int(reset) + 1)


api_pacer = Pacer(0.5)  # API is serial; maxlag + Retry-After handle the rest
thumb_pacer = Pacer(0.15)


def fetch(url, pacer, binary=False):
    for attempt in range(10):
        pacer.wait()
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                pacer.observe(r.headers)
                data = r.read()
            if binary:
                return data
            body = json.loads(data)
            if body.get("error", {}).get("code") == "maxlag":
                pacer.pause(5)
                continue
            return body
        except urllib.error.HTTPError as e:
            if e.code in (429, 503):
                delay = int(e.headers.get("Retry-After") or 0) or min(60, 2 ** attempt)
                print(f"  {e.code} from {urllib.parse.urlparse(url).netloc}, waiting {delay}s", file=sys.stderr)
                pacer.pause(delay)
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            pacer.pause(min(60, 2 ** attempt))
    raise RuntimeError(f"gave up on {url}")


def api(**params):
    params.update(format="json", formatversion=2, maxlag=5)
    return fetch(API + "?" + urllib.parse.urlencode(params), api_pacer)


IMG_PROPS = dict(prop="imageinfo", iiprop="url|mime|extmetadata", iiurlwidth=THUMB_WIDTH,
                 iiextmetadatafilter="Artist|LicenseShortName")


def paged(**params):
    cont = {}
    while True:
        d = api(**params, **cont)
        yield d
        if "continue" not in d:
            return
        cont = d["continue"]


def files_in(cat, depth, seen, label):
    if cat in seen:
        return []
    seen.add(cat)
    out = []
    for d in paged(action="query", generator="categorymembers", gcmtitle=cat, gcmtype="file", gcmlimit=50, **IMG_PROPS):
        out += d.get("query", {}).get("pages", [])
    if depth < MAX_DEPTH:
        other = SKIP_OTHER.get(label)
        for d in paged(action="query", list="categorymembers", cmtitle=cat, cmtype="subcat", cmlimit=100):
            for s in d["query"]["categorymembers"]:
                if SKIP_SUBCAT.search(s["title"]) or (other and other.search(s["title"])):
                    continue
                out += files_in(s["title"], depth + 1, seen, label)
    return out


def search(query):
    d = api(action="query", generator="search", gsrsearch=f"{query} filetype:bitmap", gsrnamespace=6, gsrlimit=50, **IMG_PROPS)
    return d.get("query", {}).get("pages", [])


def list_candidates():
    result = {}
    for label, (cats, queries) in SOURCES.items():
        pages, seen = {}, set()
        for c in cats:
            for p in files_in(c, 0, seen, label):
                pages[p["title"]] = p
        for q in queries:
            for p in search(q):
                pages.setdefault(p["title"], p)
        result[label] = sorted(
            (p for p in pages.values() if p.get("imageinfo") and p["imageinfo"][0]["mime"] in ("image/jpeg", "image/png")),
            key=lambda p: p["title"],
        )
        print(f"listed {label}: {len(result[label])}", file=sys.stderr)
    return result


def local_name(title):
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", title.removeprefix("File:"))
    return Path(name).stem[:110] + ".jpg"


def strip_html(s):
    return re.sub(r"<[^>]+>", "", s or "").strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(Path.home() / "Documents" / "trained" / "commons"))
    ap.add_argument("--refresh", action="store_true", help="re-list Commons instead of using the cached listing")
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()
    out = Path(args.out).expanduser()
    out.mkdir(parents=True, exist_ok=True)

    cache = out / "candidates.json"
    if args.refresh or not cache.exists():
        cache.write_text(json.dumps(list_candidates()))
    candidates = json.loads(cache.read_text())

    jobs = []
    for label, pages in candidates.items():
        (out / label).mkdir(exist_ok=True)
        for p in pages:
            ii = p["imageinfo"][0]
            md = ii.get("extmetadata", {})
            jobs.append({
                "label": label, "path": f"{label}/{local_name(p['title'])}", "title": p["title"],
                "source": ii["descriptionurl"], "author": strip_html(md.get("Artist", {}).get("value")),
                "license": md.get("LicenseShortName", {}).get("value", ""),
                "_url": re.sub(r"/\d+px-", f"/{THUMB_WIDTH}px-", (ii.get("thumburl") or ii["url"]).split("?")[0]),
            })

    done, lock = [], threading.Lock()

    def download(job):
        dest = out / job["path"]
        if not dest.exists():
            try:
                dest.write_bytes(fetch(job["_url"], thumb_pacer, binary=True))
            except Exception as e:  # noqa: BLE001
                print(f"  failed {job['title']}: {e}", file=sys.stderr)
                return
        with lock:
            done.append({k: v for k, v in job.items() if not k.startswith("_")})
            if len(done) % 50 == 0:
                print(f"downloaded {len(done)}/{len(jobs)}", file=sys.stderr)

    with ThreadPoolExecutor(args.workers) as pool:
        list(pool.map(download, jobs))

    done.sort(key=lambda r: r["path"])
    with open(out / "sources.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["label", "path", "title", "source", "author", "license"])
        w.writeheader()
        w.writerows(done)
    print(f"downloaded {len(done)}/{len(jobs)} -> {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
