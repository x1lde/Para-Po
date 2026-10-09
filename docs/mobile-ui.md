# Para-Po mobile UI

The commuters-app reference supplies the layout and pixel illustrations. The current ParaPo! visual identity replaces its lavender styling with cream surfaces, deep teal controls, warm yellow highlights and orange accents. Bundled Inter fonts provide bold, readable headlines and restrained supporting text. UI/UX Pro Max informed accessibility, touch feedback, responsive spacing, and lightweight interactions. Its suggested marketing landing page was not appropriate for this commute tool.

## Layout

- Phones below 768 px: stacked content, 16 px gutters, 48 px touch targets, persistent bottom tabs, searchable bottom sheets. Journey selection and guidance come before the decorative web map.
- Tablets from 768 px: 28 px gutters, two-column planning, centered place dialogs, bottom navigation.
- Desktops from 1024 px: 40 px gutters, top navigation, wider planning and map panels; content is capped at 1200 px.
- Native map guidance scrolls with the page instead of being confined to a percentage of the screen. Camera access and recognition keep the existing lifecycle and fallback handling.

## Responsiveness and interaction

Place filtering uses the local catalog with no network requests or debounce delay. Lists render a small initial batch. Closing a picker unmounts it immediately so another picker cannot overlap its exit animation. Buttons and tabs give press feedback; web has keyboard focus and reduced-motion support. Bundled images use Expo Image; the SVGs are standalone valid documents with explicit presentation attributes, including a separate dark map.

Users can search/select either place, swap them, find a bundled journey, inspect its source details, choose a landmark from the guide, or choose manually from the camera screen. Same-place and unsupported journeys provide clear recovery. The web map remains an illustration; live maps, GPS and photo recognition require the native app.

## Verification

Browser checks cover home, map, guide and camera at 320, 375, 768, 1024 and 1440 px, including theme switching, empty search, landmark handoff, both directions of the Circuit–One Ayala journey, source disclosure, same-place selection and unsupported-journey recovery. Artwork was checked both as SVG documents and as loaded images in the running Expo app.

Expo lint, TypeScript, camera/map/location/offline-data/recognition checks, and production bundle exports for Android, iOS and web were run. Native camera capture, GPU inference, GPS and map rendering still require physical-device verification; browser and mocked checks do not establish device frame rate.

Before the brand refresh, a local Chromium run against the production web export at a 375 px viewport measured approximately 165 ms to open the picker, 23 ms to filter places, and 78 ms to navigate to bundled guidance. These are one-run browser measurements including automation overhead, not native-device frame-rate benchmarks.
