> Historical design record. The active UI now follows [ParaPo! visual identity](visual-identity.md).

# Para-Po UI and usability review

## Scope

Reviewed the clean `main` checkout at `a6a3f59`. Its only screens were Expo Home and Explore examples. The changes replace those two screens with a Para-Po home and a searchable commuter guide, retaining Expo Router and the existing native/web tab split.

The home has one primary action: open the guide. The guide searches four bundled transport topics, supports multiple search terms and case/whitespace variations, expands advice on demand, and provides a clear recovery action for empty results. It deliberately labels its contents as general tips. Recognition, verified route/fare lookup, location services, and maps are not implemented in this checkout.

## Design guidance

Applied [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), read from a temporary checkout because the skill was not installed locally. Relevant searches:

- `public transport mobile accessible --design-system`: accessible design, navy/blue palette, readable text, simple hierarchy.
- `safe area accessibility navigation --stack react-native`: platform navigation and accessible control semantics.

Adapted the recommendations to this repository: Expo Router, system fonts with no download, semantic light/dark tokens, controls at least 48 units tall, responsive single-column content, no decorative motion, and expandable content with explicit state. No dependencies were added.

## Bugs and integration issues addressed

- The web theme hook synchronously updated state inside an effect, failing lint. It now uses `useSyncExternalStore` to preserve the server snapshot during hydration and follow the client theme afterward.
- Shared text, tab navigation, and the root theme now use the same hydration-aware color scheme.
- The web navigation overlay was replaced with a tab bar that reserves layout space.
- A browser check caught an Expo Link child composition dropping the primary button's style callback. The action now uses a styled Pressable and `router.navigate`.
- React Native Web 0.21 did not translate `accessibilityState` into selected/expanded DOM attributes. Explicit ARIA attributes now accompany native accessibility state.
- Native scroll spacing follows the SDK 57 native-tab inset behavior, avoiding duplicate tab and safe-area padding.
- Removed the starter animated splash overlay from the active layout so startup no longer depends on a decorative animation completing. Expo Router manages the native splash lifecycle.

## Verification

- `npx expo lint`: passed.
- `npx tsc --noEmit`: passed.
- `git diff --check`: passed.
- `npx expo export --platform all --output-dir /tmp/para-po-all-platforms-review`: passed for Android, iOS, and web.
- Chromium interaction checks: home-to-guide navigation, selected tab state, search, case/whitespace normalization, multiple search terms, empty-state recovery, keyboard expansion/collapse, direct guide URL, and no browser runtime/console errors.
- Guide layout checked in both themes at 320×740, 375×812, 812×375, 768×1024, and 1440×900. Enlarged text checked on web with reduced motion enabled.
- Contrast calculations for nine foreground/background combinations per theme all exceeded 4.5:1; the lowest was 5.17:1.
- Independent code review identified the web accessibility attributes and duplicate native insets; both were addressed before final verification.

Native bundles were exported, but no iOS/Android device or simulator was exercised. Device checks remain necessary for actual safe areas, system text scaling, software keyboard behavior, and VoiceOver/TalkBack. Web text enlargement is not a substitute for native Dynamic Type testing. Bundled guide data does not make the web application an offline-installable PWA.

## References

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Expo native tab safe areas](https://docs.expo.dev/router/advanced/native-tabs/#safe-area-handling)
- [Expo custom tabs](https://docs.expo.dev/router/advanced/custom-tabs/)
- [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
