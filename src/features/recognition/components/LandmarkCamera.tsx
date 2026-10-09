import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { Icon } from '@/components/commute/ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { pilotDataset } from '@/database/data/pilot-dataset';
import { ChoicePicker } from '@/features/maps/components/ChoicePicker';
import { JourneyOptions } from '@/features/transport/components/JourneyOptions';
import { planJourney } from '@/features/transport/planner/journey-planner';
import { useLandmarkRecognition } from '../hooks/use-landmark-recognition';
import type { PhotoIssue, RecognitionResult } from '../types';

const UNCLEAR_PHOTO_MESSAGES: Record<PhotoIssue, string> = {
  'too-dark': 'The photo is too dark to recognize. Check that nothing covers the lens, then try again or select a landmark manually.',
  'too-bright': 'The photo is too bright to recognize. Avoid pointing at the sun or a light, then try again or select a landmark manually.',
  'low-detail': 'The photo shows too little detail to recognize. Point the camera at the landmark and try again, or select a landmark manually.',
};

export function LandmarkCamera() {
  const theme = useTheme();
  const { state, recognize, reload } = useLandmarkRecognition();
  const [permission, requestPermission, refreshPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const sequence = useRef(0);
  const capturing = useRef(false);
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');

  useFocusEffect(useCallback(() => {
    setFocused(true);
    setReady(false);
    return () => {
      setFocused(false);
      setReady(false);
      sequence.current += 1;
      capturing.current = false;
      setBusy(false);
    };
  }, []));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setForeground(next === 'active');
      setReady(false);
      if (next === 'active') {
        void refreshPermission().catch(() => setMessage('Could not check camera permission. You can select a landmark manually.'));
      } else {
        sequence.current += 1;
        capturing.current = false;
        setBusy(false);
      }
    });
    return () => subscription.remove();
  }, [refreshPermission]);

  const capture = async () => {
    if (capturing.current || !ready || !camera.current || !focused || !foreground || state.status !== 'ready') return;
    capturing.current = true;
    const request = ++sequence.current;
    setBusy(true);
    setMessage('');
    setResult(null);
    setOriginId('');
    let photoTaken = false;
    try {
      const photo = await camera.current.takePictureAsync({ quality: 1 });
      if (sequence.current !== request) return;
      if (!photo?.uri) throw new Error('No photo');
      photoTaken = true;
      const next = await recognize(photo.uri);
      if (sequence.current !== request) return;
      setResult(next);
      if (next.status === 'recognized') setOriginId(next.landmark.id);
    } catch {
      if (sequence.current === request) {
        setMessage(photoTaken ? 'Could not recognize this photo. Try again or select a landmark manually.'
          : 'Could not take the photo. Try again or select a landmark manually.');
      }
    } finally {
      if (sequence.current === request) {
        capturing.current = false;
        setBusy(false);
      }
    }
  };

  const canCapture = ready && !busy && state.status === 'ready';
  const origin = pilotDataset.landmarks.find((landmark) => landmark.id === originId);
  const resultMessage = result?.status === 'recognized' ? `Recognized ${result.landmark.name}.`
    : result?.status === 'uncertain' ? 'Which landmark are you closest to?'
    : result?.status === 'not-a-landmark' ? 'This photo does not show a supported Makati landmark. Select one manually.'
    : result?.status === 'unclear-photo' ? UNCLEAR_PHOTO_MESSAGES[result.issue]
    : result?.status === 'unavailable' ? (result.reason === 'image-unreadable'
      ? 'Could not read this photo. Try another photo or select a landmark manually.'
      : 'Photo recognition is unavailable. Select a landmark manually.') : '';

  return <ThemedView style={styles.page}>
    <SafeAreaView style={styles.page} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to ride planner" style={({ pressed }) => [styles.button, { borderColor: theme.line, opacity: pressed ? .65 : 1 }]} onPress={() => router.navigate('/')}><ThemedText type="link">Back to ride planner</ThemedText></Pressable>
        <View style={styles.cameraHeading}><Icon name="scan" size={28} /><ThemedText type="subtitle">A landmark is all it takes.</ThemedText></View>
        <ThemedText>Point at a familiar Makati building or place. Keep the landmark centred in the photo.</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">Photographing another screen can introduce glare and moiré patterns that lower recognition confidence. A clear photo of the actual landmark is a better input; screen-photo results still need your confirmation.</ThemedText>
        {Platform.OS === 'web' ? <ThemedText>Photo recognition is available in the mobile app. Choose your landmark below.</ThemedText>
          : <>
            {state.status === 'loading' && <><ActivityIndicator accessibilityLabel="Loading landmark recognition" /><ThemedText>Loading photo recognition…</ThemedText></>}
            {state.status === 'unavailable' && <>
              <ThemedText>Offline photo recognition could not start. Retry it or choose your landmark below.</ThemedText>
              <Pressable accessibilityRole="button" style={({ pressed }) => [styles.button, { borderColor: theme.line, backgroundColor: theme.backgroundSelected, opacity: pressed ? .65 : 1 }]}
                onPress={() => { void reload(); }}><ThemedText type="link">Retry recognition</ThemedText></Pressable>
            </>}
            {!permission ? <ThemedText>Checking camera permission…</ThemedText>
              : !permission.granted ? <>
                <ThemedText>Allow camera access to take a landmark photo, or choose manually below.</ThemedText>
                <Pressable accessibilityRole="button" style={({ pressed }) => [styles.button, { borderColor: theme.line, backgroundColor: theme.backgroundSelected, opacity: pressed ? .65 : 1 }]} onPress={() => {
                  setMessage('');
                  void (permission.canAskAgain ? requestPermission() : Linking.openSettings())
                    .catch(() => setMessage('Could not open camera permission. Choose a landmark manually.'));
                }}><ThemedText type="link">{permission.canAskAgain ? 'Allow camera access' : 'Open device settings'}</ThemedText></Pressable>
              </> : cameraError ? <>
                <ThemedText>Could not start the camera. Choose manually or retry.</ThemedText>
                <Pressable accessibilityRole="button" style={({ pressed }) => [styles.button, { borderColor: theme.line, backgroundColor: theme.backgroundSelected, opacity: pressed ? .65 : 1 }]} onPress={() => { setCameraError(false); setReady(false); }}><ThemedText type="link">Retry camera</ThemedText></Pressable>
              </> : focused && foreground && <View style={styles.preview}>
                <CameraView ref={camera} style={styles.camera} facing="back" mode="picture"
                  onCameraReady={() => setReady(true)} onMountError={() => { setReady(false); setCameraError(true); }} />
              </View>}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canCapture }} disabled={!canCapture}
              style={({ pressed }) => [styles.button, { backgroundColor: theme.primary, borderColor: theme.primary, opacity: pressed ? .7 : 1 }, !canCapture && styles.disabled]} onPress={() => void capture()}>
              <ThemedText type="link" style={{ color: theme.primaryText, fontWeight: '600' }}>{busy ? 'Recognizing landmark…' : 'Take landmark photo'}</ThemedText>
            </Pressable>
          </>}
        {busy && <ActivityIndicator accessibilityLabel="Recognizing landmark" />}
        {!!message && <ThemedText accessibilityLiveRegion="polite">{message}</ThemedText>}
        {!!resultMessage && <ThemedText accessibilityLiveRegion="polite">{resultMessage}</ThemedText>}
        {(result?.status === 'uncertain' || result?.status === 'recognized') && <>
          {result.status === 'recognized' && <ThemedText type="small">Not right? Choose another landmark:</ThemedText>}
          {result.candidates.map(({ landmark }) => <Pressable key={landmark.id} accessibilityRole="button"
            accessibilityState={{ selected: originId === landmark.id }} style={({ pressed }) => [styles.button, { borderColor: theme.line, backgroundColor: theme.backgroundSelected, opacity: pressed ? .65 : 1 }]} onPress={() => setOriginId(landmark.id)}>
            <ThemedText type="link">{landmark.name}</ThemedText>
          </Pressable>)}
        </>}
        <View style={[styles.journey, { paddingVertical: 4, backgroundColor: theme.backgroundElement, borderColor: theme.line }]}>
          <ChoicePicker label="Choose a starting landmark manually" value={originId} choices={pilotDataset.landmarks}
            disabled={busy} onSelect={setOriginId} />
        </View>
        {origin && <View style={[styles.journey, { backgroundColor: theme.backgroundElement, borderColor: theme.line }]}>
          <View style={styles.cameraHeading}><Icon name="pin" size={22} /><ThemedText type="smallBold">Starting from {origin.name}</ThemedText></View>
          <ChoicePicker label="Destination" value={destinationId} choices={pilotDataset.destinations.filter((place) => place.id !== origin.id)}
            disabled={busy} onSelect={setDestinationId} />
          {destinationId ? <JourneyOptions plan={planJourney(origin.id, destinationId)} limit={3} />
            : <ThemedText type="small" themeColor="textSecondary">Where are you headed? Choose a destination to see which jeepney, bus or walk gets you there.</ThemedText>}
          <Pressable accessibilityRole="button" style={({ pressed }) => [styles.button, { backgroundColor: theme.primary, borderColor: theme.primary, opacity: pressed ? .7 : 1 }]}
            onPress={() => router.navigate({ pathname: '/map', params: { originId: origin.id, ...(destinationId ? { destinationId } : {}), originRequest: String(Date.now()) } })}>
            <ThemedText type="link" style={{ color: theme.primaryText, fontWeight: '600' }}>{destinationId ? 'Plan journey from here on the map' : 'Plan journey from here'}</ThemedText>
          </Pressable>
        </View>}
      </ScrollView>
    </SafeAreaView>
  </ThemedView>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  cameraHeading: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  content: { padding: 20, paddingBottom: 32, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  preview: { height: 320, borderRadius: 16, overflow: 'hidden', backgroundColor: '#111' },
  camera: { flex: 1 },
  button: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: 'transparent', borderRadius: 12, justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  journey: { padding: 16, gap: 14, borderWidth: 1, borderRadius: 20 },
});
