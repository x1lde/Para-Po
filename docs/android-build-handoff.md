# Android build handoff

Use the `develop` branch with the Android readiness changes included. The app uses Expo SDK 57, React Native 0.86.3, MapLibre 11.5.0, react-native-fast-tflite 3.0.1, and Nitro Modules 0.37.1. Expo Go cannot run the custom native map/inference modules.

## Build an installable offline demo

From a clean checkout, install the committed lockfile and run validation:

```sh
npm ci
npx expo install --check
npx expo-doctor
npm run lint
npx tsc --noEmit
npm run check:offline-data
npm run check:maps
npm run check:location
npm run check:recognition
npx eas-cli@latest build --platform android --profile preview
```

Windows PowerShell may require `npm.cmd` and `npx.cmd`. If Windows reports a locked native module during installation, stop project dev servers and editor ESLint processes before retrying `npm ci`; do not modify the lockfile to work around a file lock.

The `preview` profile explicitly builds a release APK with `developmentClient: false`, so the installed app includes its JavaScript and required model and works without Metro. EAS account/project setup and signing may be required for the developer building it. The Android identifier is `com.anonymous.parapo`; preserve it for upgrades unless the team deliberately changes it. Do not build the default AAB for direct APK installation. The existing `npm run android` command uses a local Android SDK and does not replace the release APK smoke test.

Configure native behavior through `app.json` plugins. Do not manually edit generated Android/iOS folders. Camera, foreground location, MapLibre, and TFLite plugins are registered. Manifest introspection includes CAMERA, COARSE/FINE_LOCATION, and optional `libOpenCL.so`; background location and audio recording are not requested by this feature configuration. Unsupported GPUs fall back to CPU at load time; GPU invocation failures now retry the same preprocessed photo on CPU and retain CPU for the session.

## Checks on the APK

1. Install the APK and cold-launch it with Metro stopped and airplane mode enabled. Confirm the on-device landmark and destination catalogs load and Circuit to One Ayala produces sourced guidance.
2. Open Scan, allow camera access, photograph a supported landmark, and confirm the result selects the correct starting point. Check uncertain/non-landmark photos, manual fallback, cancellation during inference, and camera permission denial.
3. Test all six bundled journey combinations and an uncovered pair. Check that boarding/alighting text and limitations remain accessible offline.
4. Select an option on Map before running the Ride lookup, return to Ride, and check that its boarding details match. Opening marker details or selecting options should not clear guidance or unexpectedly reset the camera.
5. Allow GPS outdoors; check denial, disabled location services, refresh, cancellation, timeout, and inaccurate fixes. Missing confirmed boarding coordinates must not produce a fabricated nearest stop or walking distance.
6. Enable internet and check map tiles, attribution, taps, focus controls, and map retry. Return to airplane mode; map failures must leave offline guidance available.
7. Force-stop and relaunch while offline. Check first installation as well as an upgrade retaining an older Para-Po database.

For native crashes, capture the build error or device log and the phone model/Android version. With ADB installed, `adb logcat -c`, reproduce, then `adb logcat -d > parapo-logcat.txt`; inspect logs before sharing them. Record which step failed and whether it happens with GPS/map/scanning disabled.

## Validation limits

Recognition requests are serialized because closing a scanner does not cancel a native invocation. A second scanner must wait before writing inputs to the shared interpreter; GPU invocation errors retry on CPU within that same operation. Regression checks cover both cases with mocked native execution.

SDK dependency checks and Expo config introspection pass locally. Expo Doctor still flags react-native-fast-tflite as untested on the New Architecture in React Native Directory; this warning is retained rather than suppressed. It is not proof of incompatibility, but exact SDK 57 native compilation and physical-device inference must be verified by the build owner.

TypeScript, lint, and 63 checks pass: 12 mocked recognition, 13 offline-data, 11 map-scene, nine mocked location, 14 selection/layout/integration, and four Python source-group split tests. Android Hermes export includes the 8.7 MB bundled TFLite model. Expo Doctor passes 20 of 21 checks after the generated-state cleanup; the remaining warning is described above.

This workspace has no Java, Android SDK, or ADB, so native Gradle compilation and APK installation cannot be performed here. Hermes export verifies JavaScript/asset packaging, not native compilation. Confirmed boarding coordinates and vehicle route geometry are still absent; the map shows sourced approximate landmark references and textual recommendations without inventing stops or paths.

Generated `.expo` state is ignored and removed from Git tracking while retained locally. No cloud build, login, commit, or push is initiated by this handoff.
