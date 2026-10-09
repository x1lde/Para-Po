# ParaPo! launch film

Deliver a 1920 × 1080 H.264 MP4 at 30 FPS, exactly 1,800 frames. Follow the user-approved seven-scene brief with authentic UI captures and the bundled ParaPo! brand. This is a standalone creative project in `video/`; Expo application behavior is unchanged.

## Audit and claim rules

- `assets/brand/` contains the actual logo; `assets/fonts/` contains Inter and its license notes.
- `src/features/transport/planner/journey-planner.ts` is a pure bundled-data lookup. `makati-journeys.json` includes the Circuit Makati → One Ayala P2P and The CityFlats Circuit loading point. The route has no mapped geometry. The film uses an explicitly labeled schematic.
- The older SQLite pilot marks exact boarding/access as unverified. Say **source-based guidance**, and retain **Confirm current loading point and service**. Do not say field-verified or nearest.
- Native camera/TFLite inference exists. The real bundled model has been exercised against held-out images, but physical-device capture/inference has not. Web provides manual selection. Use authentic web fallback footage and a clearly labeled recognition workflow illustration; do not invent a successful live scan.
- The classifier identifies supported landmarks, not screen/replay authenticity. No liveness claim.
- Bundled journey lookup does not require network. Capture that workflow with browser networking disabled after initial app load. This demonstrates offline lookup, not first-load web availability or offline maps.
- No real-time tracking, departure schedules, nationwide coverage, fabricated fares, or time promises.

## Frame-accurate storyboard (end exclusive)

| Scene | Seconds | Frames | Evidence / design |
|---|---|---|---|
| Problem | 0–8 | 0–240 | Original abstract street grid, branching routes, Taglish questions, resolve to guessing-game line |
| Reveal | 8–14 | 240–420 | Route retracts to phone outline; actual wordmark, fresh home screenshot |
| Landmark | 14–24 | 420–720 | Actual scanner fallback and manual picker. Clearly labeled native recognition workflow illustration, no staged result |
| Destination | 24–32 | 720–960 | Actual selection sheet, Circuit origin, One Ayala destination, touch indicator |
| Boarding | 32–43 | 960–1290 | Actual journey results + source-based CityFlats/P2P schematic, confirmation note |
| Offline | 43–51 | 1290–1530 | Actual no-network lookup screenshot; connection indicator switches off; online maps explicitly separate |
| Closing | 51–60 | 1530–1800 | Original stylized skyline and pin, logo, Less guessing. More going. Static final 90-frame hold |

## Design and motion

Warm cream #FFF9E9, teal #117C83, yellow #F9C846, orange #FF6B35, charcoal #24343B. Inter ExtraBold headlines 88–110 px; support 30–36 px; evidence notes at least 24 px. 100 px safe area. A single teal route is the recurring visual. Phone UI is photographic evidence, never reconstructed. Scene changes use route-led wipes and short frame-driven opacity envelopes. All timing derives from frames; no random effects or CSS transitions.

## Implementation plan

1. Capture current mobile web UI with Playwright; record route names, source text, image provenance and no-network verification. Copy original brand/fonts into `public/assets/`.
2. Create isolated Remotion/React/TypeScript package, reusable phone, route, pin, type and transition primitives; centralize 1,800-frame timing and tokens.
3. Implement seven scenes, audio synthesis and voiceover timing sheet. Generate original 60-second music/SFX with deterministic synthesis; optional team voiceover remains separate.
4. Typecheck/lint project and app, run relevant recognition/journey checks, render representative frames and boundary contact sheets, inspect them, fix composition issues, then render MP4.
5. Check output via ffprobe: h264, 1920×1080, 30/1 FPS, 1,800 frames, exactly 60 seconds. Document commands, remaining native-footage gap, assets and licenses.

## Review focus

Missing screenshots must fail rendering rather than silently disappear; incomplete route data must retain its confirmation note; native illustration must remain labeled; offline footage must preserve source disclosure; last 90 frames must hold the final logo with audio fading smoothly.
