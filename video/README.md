# ParaPo! — 60-second launch film

Standalone Remotion 4 / React / TypeScript project. **1920 × 1080, 30 FPS, 1,800 frames, exactly 60 seconds.** Seven scenes follow the hackathon brief. Authentic screenshots demonstrate the manual landmark → destination → boarding-guidance flow; native recognition is clearly labeled as an illustration pending physical-device footage.

## Preview

```bash
cd video
npm ci
npm run studio
```

Open `http://localhost:3002` and select `ParaPoLaunch`. Studio supports playback, audio audition and frame-by-frame inspection. Screenshots and fonts are local; rendering does not depend on the Expo server or external media.

## Render and check

```bash
npm run typecheck
npm run lint
npm run stills
npm run render
npm run verify
```

The renderer reuses an installed Chrome/Chromium where found. System `ffmpeg` is required to normalize browser pixels to standard Rec.709 and trim AAC encoder padding so the MP4 container, audio and video each last exactly 60 seconds. To select a browser explicitly:

```bash
CHROME_PATH=/path/to/chrome npm run render
```

If no browser is installed, Remotion downloads its supported browser automatically. `out/ParaPo-Launch-60s.mp4` is H.264/AAC with yuv420p pixels and CRF 18. Verification uses system `ffprobe`/`ffmpeg` to count all frames, inspect codec/resolution/FPS/duration and check the closing hold. Render outputs are ignored by git.

## Edit

- Timing and demo route names: `src/data/storyboard.ts`; scene durations must continue to total 1,800 frames.
- Colors, easing and typography: `src/styles/theme.ts`.
- One file per scene in `src/scenes/`; reusable motion primitives in `src/components/`.
- Composition and audio: `src/compositions/ParaPoLaunch.tsx`.
- Storyboard, audit and claim rules: `PLAN.md`.
- Optional team narration: `VOICEOVER.md`.
- Media inventory, licensing and missing footage: `ASSETS.md`.

All motion is frame-driven. Fonts wait for loading before rendering. The last 90 frames hold the logo without visual motion. No fake live recognition, offline map, nearest-stop ranking, departure schedule or broad geographic coverage is shown.

## Refresh authentic screenshots

Start the Expo app from the repository root using `npm start`. Then run:

```bash
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright CHROME_PATH=/path/to/chrome node video/scripts/capture.cjs
```

The capture script performs actual app interactions, captures a no-network lookup, writes screenshot transcripts and an evidence JSON, and fails on page errors. Browser networking is disabled **after** initial app load; this is not proof that a fresh web visit loads offline. Native SQLite and native camera footage require a device development build.

## Recreate the original score

The shipped WAV is ready to render. To regenerate it, install NumPy in a local Python environment, then run `python3 scripts/synthesize_audio.py` from `video/`. The synthesis seed, musical events, fades and sample count are fixed. No music downloads are required.
