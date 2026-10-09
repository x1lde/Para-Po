# Optional team voiceover

Record a natural, confident Taglish read. No synthetic narrator is included in the delivered soundtrack. Leave room between phrases; visuals carry the story without narration. The durations below are approximate spoken lengths within exact placement windows.

| Placement | Voiceover | Read | Sound / music direction |
|---|---|---|---|
| 00:00.60–00:04.80 | “Lost in Makati? Saan ako? Saan sasakay?” | ~4 s | Sparse warm chord, three soft question taps |
| 00:05.10–00:07.70 | “Commuting shouldn’t be a guessing game.” | ~2.5 s | Route resolves; pulse lifts gently |
| 00:08.50–00:12.80 | “Meet ParaPo! Your commute, made simpler.” | ~3.5 s | Original three-note reveal chime; arpeggio enters |
| 00:14.70–00:22.70 | “Start with a supported landmark. Our local model can identify it—or you can choose it yourself.” | ~7 s | Quiet scan accent and manual-selection tick; avoid triumphant scan-success sound |
| 00:24.70–00:30.40 | “From Circuit, choose One Ayala. See your journey options.” | ~4.5 s | Selection tick at 27.15; rhythmic pulse holds |
| 00:32.80–00:41.90 | “Find the CityFlats Circuit loading point for the One Ayala P2P. Confirm the current loading point and service.” | ~8 s | Light boarding accent, fullest musical passage; no crowd or vehicle stock audio |
| 00:43.70–00:49.90 | “Walang signal? Your bundled landmark choices and route guidance are still there.” | ~5.5 s | Connection-off tone; reduce percussion, retain warmth |
| 00:52.00–00:56.80 | “Less guessing. More going. ParaPo! Your commute, made simpler.” | ~4.5 s | Three-note brand motif, final chord blooms |
| 00:57.00–01:00.00 | No speech. Clean logo hold. | 0 s | Resolve and fade to silence |

## Adding a recording

Place a single aligned 60-second recording at `public/assets/audio/team-voiceover.wav`. Add another `Html5Audio` in `src/compositions/ParaPoLaunch.tsx` using `staticFile('assets/audio/team-voiceover.wav')`. Reduce the music volume from `0.8` to approximately `0.3`, then audition the combined mix. Keep spoken content inside these windows and retain the final silence. Re-render and run `npm run verify`.
