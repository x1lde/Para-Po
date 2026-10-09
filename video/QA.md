# Verification record

The final composition and MP4 were checked against the user’s brief.

- Seven contiguous scene boundaries, 1,800 total frames; Remotion composition is 1920 × 1080 at 30 FPS.
- `npm run stills` rendered 33 representative and boundary frames. Contact sheets and full-resolution landmark, boarding and offline scenes were visually inspected for hierarchy, clipping, source notes and interface integrity.
- `npm run render` successfully exercised the complete rendering pipeline, including final Rec.709 normalization and exact AAC timeline trimming.
- `npm run verify` decoded/counts every video frame: H.264, standard yuv420p, limited-range Rec.709, 30/1 FPS, 1,800 frames. Container, video and audio each report 60.000000 seconds. AAC stereo audio is included.
- Final three seconds: pristine frame 1710 and frame 1799 are identical; all 90 decoded frames stay within a strict average compression-variation tolerance. This tests the visual hold without mistaking normal H.264 quantization for motion.
- Authentic UI evidence: actual origin/destination interactions, changed offline destination to Glorietta then One Ayala, no browser exceptions, CityFlats boarding text verified. Networking was disabled after initial app load.
- Application lint/typecheck passed; six journey checks and sixteen mocked recognition checks passed. Video TypeScript and ESLint checks passed; scripts pass syntax checks; git diff whitespace check passed.
- Independent code/product review found one medium issue in the initial same-destination offline capture. It was fixed with genuinely changed selection state and a complete screenshot/render refresh. No other important issues were identified.

Machine-readable evidence is in `out/verification.json`, `out/browser-playback.json`, and `public/assets/screenshots/capture-evidence.json`. Browser playback checks the complete 60-second film reaches its end and samples the cream background to catch color-range regressions.

## Deliberate limits

Native camera/inference is a labeled illustration; no physical-device scan success is staged. Actual footage demonstrates the manual web workflow. The no-network capture proves a fresh bundled lookup after initial load, not first-load web caching or native airplane-mode behavior. Source-based P2P guidance keeps the exact-loading-point confirmation caveat. Optional team voiceover is scripted but not recorded; the render includes original synthesized music and SFX.
