"""Extract landmark training frames from walking-tour / location videos.

Usage:
    python3 ml/fetch_video.py search  --out ~/Documents/trained/video     # list candidate videos per label
    python3 ml/fetch_video.py extract --out ~/Documents/trained/video     # download approved videos, extract frames

Workflow: `search` writes <out>/candidates.json. Videos are approved into ml/videos.csv
(label,video_id,title,start_s,end_s,frames) only when the title places them at that exact landmark
(e.g. "SM Makati Cyberzone", not another SM branch). `extract` downloads each approved video at
<=480p, samples frames evenly between start_s and end_s, drops near-duplicates, and writes
<out>/<label>/<video_id>_<t>.jpg plus <out>/video_sources.csv. Videos and frames stay local.
Frames from one video are near-identical neighbours, so train.py splits train/val by video.
"""

import argparse
import csv
import json
import re
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ML_DIR = Path(__file__).resolve().parent
YTDLP = str(Path(sys.executable).with_name("yt-dlp"))

SEARCH = {
    "ayala_center": ["Ayala Center Makati walking tour", "Ayala Center Makati 4K"],
    "avida_towers_makati_southpoint": ["Avida Towers Makati Southpoint", "Avida Towers Makati Southpoint tour"],
    "ayala_malls_circuit": ["Ayala Malls Circuit Makati walking tour", "Circuit Makati walk"],
    "st_john_bosco_parish": ["Don Bosco Church Makati", "St. John Bosco Parish Makati"],
    "rcbc_plaza": ["RCBC Plaza Makati", "RCBC Plaza Ayala Avenue walk"],
    "sm_makati": ["SM Makati Cyberzone", "SM Makati walking tour", "SM Makati 4K"],
    "the_landmark_makati": ["The Landmark Makati walking tour", "Landmark Makati department store tour"],
    "greenbelt": ["Greenbelt Makati walking tour", "Greenbelt 4K walk"],
    "glorietta": ["Glorietta Makati walking tour", "Glorietta 4K walk"],
    "powerplant_mall": ["Power Plant Mall Rockwell walking tour", "Power Plant Mall 4K"],
    "makati_city_hall": ["Makati City Hall", "Makati City Hall walk"],
    "ayala_museum": ["Ayala Museum Makati", "Ayala Museum tour"],
    "one_ayala": ["One Ayala Makati walking tour", "One Ayala terminal walk"],
    "salcedo_weekend_market": ["Salcedo Saturday Market Makati", "Salcedo Weekend Market walk"],
}
MAX_SIDE = 800
FRAMES_PER_VIDEO = 45
MIN_GAP_S = 3
SHARD = ""
GRAB_THREADS = 6
FORCE = False


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw).stdout


def search(out, per_query):
    result = {}
    for label, queries in SEARCH.items():
        seen = {}
        for q in queries:
            lines = run([YTDLP, "--flat-playlist", "--print", "%(id)s\t%(duration)s\t%(channel)s\t%(title)s",
                         f"ytsearch{per_query}:{q}"]).splitlines()
            for line in lines:
                vid, dur, chan, title = (line.split("\t") + ["", "", ""])[:4]
                seen.setdefault(vid, {"id": vid, "duration": dur, "channel": chan, "title": title})
        result[label] = list(seen.values())
        print(f"{label}: {len(seen)} candidates", file=sys.stderr)
    (out / "candidates.json").write_text(json.dumps(result, indent=1))


def dhash(im):
    g = im.convert("L").resize((9, 8))
    px = list(g.tobytes())
    return sum(1 << i for i in range(64) if px[(i // 8) * 9 + i % 8] > px[(i // 8) * 9 + i % 8 + 1])


def extract(out, videos_csv):
    rows = list(csv.DictReader(open(videos_csv)))
    log_path = out / f"video_sources{SHARD}.csv"
    done = set()
    for lp in out.glob("video_sources*.csv"):
        done |= {r["path"] for r in csv.DictReader(open(lp))}
    log = open(log_path, "a", newline="")
    w = csv.DictWriter(log, fieldnames=["label", "path", "video_id", "t", "title"])
    if not log_path.exists() or log_path.stat().st_size == 0:
        w.writeheader()
    for row in rows:
        label, vid = row["label"], row["video_id"]
        d = out / label
        d.mkdir(parents=True, exist_ok=True)
        if f"{label}/{vid}_DONE" in done and not FORCE:
            continue
        try:
            info = json.loads(run([YTDLP, "-j", "--js-runtimes", "node", "-f", "bv*[height<=480][ext=mp4]/bv*[height<=480]/b[height<=480]",
                                   f"https://www.youtube.com/watch?v={vid}"]))
        except subprocess.CalledProcessError as e:
            print(f"  skip {vid}: {e.stderr.strip()[-160:]}", file=sys.stderr)
            continue
        url, dur = info["url"], float(info.get("duration") or 0)
        headers = "".join(f"{k}: {v}\r\n" for k, v in (info.get("http_headers") or {}).items())
        start = float(row.get("start_s") or 0)
        end = min(float(row.get("end_s") or dur), dur) - 2
        per = int(row.get("frames") or FRAMES_PER_VIDEO)
        step = max(MIN_GAP_S, (end - start) / per)
        times = []
        t = start + step / 2
        while t < end:
            times.append(t)
            t += step

        def grab(t, tmp):
            dest = d / f"{vid}_{int(t):05d}.jpg"
            if dest.exists():
                return t, Image.open(dest).convert("RGB")
            frame = Path(tmp) / f"{int(t * 10)}.jpg"
            # input-side -ss on a remote URL issues an HTTP range request: only this frame's bytes are fetched
            try:
                subprocess.run(["ffmpeg", "-v", "quiet", "-y", "-headers", headers, "-ss", f"{t:.1f}", "-i", url,
                                "-frames:v", "1", str(frame)], check=False, timeout=90)
            except subprocess.TimeoutExpired:
                return t, None
            if not frame.exists():
                return t, None
            im = Image.open(frame).convert("RGB")
            frame.unlink()
            return t, im

        hashes, n = [], 0
        with tempfile.TemporaryDirectory() as tmp, ThreadPoolExecutor(GRAB_THREADS) as pool:
            for t, im in pool.map(lambda t: grab(t, tmp), times):
                if im is None:
                    continue
                h = dhash(im)
                lo, hi = im.convert("L").getextrema()
                if hi - lo <= 40 or any(bin(h ^ o).count("1") <= 8 for o in hashes):
                    continue  # blank/fade frame or near-duplicate of a kept one
                hashes.append(h)
                name = f"{vid}_{int(t):05d}.jpg"
                if not (d / name).exists():
                    im.thumbnail((MAX_SIDE, MAX_SIDE))
                    im.save(d / name, quality=88)
                w.writerow({"label": label, "path": f"{label}/{name}", "video_id": vid, "t": int(t), "title": row["title"]})
                n += 1
        w.writerow({"label": label, "path": f"{label}/{vid}_DONE", "video_id": vid, "t": -1, "title": row["title"]})
        log.flush()
        print(f"{label}: {vid} -> {n} frames ({row['title'][:60]})", file=sys.stderr)
    log.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["search", "extract"])
    ap.add_argument("--out", default=str(Path.home() / "Documents" / "trained" / "video"))
    ap.add_argument("--videos", default=str(ML_DIR / "videos.csv"))
    ap.add_argument("--per-query", type=int, default=20)
    ap.add_argument("--force", action="store_true", help="re-extract videos already marked done (e.g. denser sampling)")
    ap.add_argument("--min-gap", type=float, default=3, help="minimum seconds between sampled frames")
    ap.add_argument("--shard", default="", help="suffix for this worker's log file (parallel runs)")
    args = ap.parse_args()
    global SHARD, FORCE, MIN_GAP_S
    SHARD, FORCE = args.shard, args.force
    MIN_GAP_S = args.min_gap
    out = Path(args.out).expanduser()
    out.mkdir(parents=True, exist_ok=True)
    search(out, args.per_query) if args.mode == "search" else extract(out, args.videos)


if __name__ == "__main__":
    main()
