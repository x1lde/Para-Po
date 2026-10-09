import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BodyText, PrimaryButton, useAppColors } from '@/components/commuter-ui';
import { useLandmarkRecognition } from '../hooks/use-landmark-recognition';
import type { RecognitionResult } from '../types';
import type { ScanLandmarkProps } from './ScanFallback';

export default function CameraScanner({ onClose, onChooseManually, onSelect }: ScanLandmarkProps) {
  const colors = useAppColors();
  const [permission, requestPermission] = useCameraPermissions();
  const { state, recognize } = useLandmarkRecognition();
  const camera = useRef<CameraView>(null);
  const active = useRef(true);
  const capturing = useRef(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [message, setMessage] = useState('Photograph a supported Makati landmark clearly.');
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  const capture = async () => {
    if (!ready || !camera.current || capturing.current) return;
    capturing.current = true; setBusy(true);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 1 });
      if (!active.current) return;
      if (!photo?.uri) throw new Error('No photo captured');
      const prediction = await recognize(photo.uri);
      if (!active.current) return;
      setResult(prediction);
    } catch {
      if (active.current) setMessage('Could not process the photo. Try again or choose a landmark manually.');
    } finally {
      capturing.current = false;
      if (active.current) setBusy(false);
    }
  };
  const candidates = result && 'candidates' in result ? result.candidates : [];
  return <Modal animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <BodyText>Scan a landmark</BodyText>
        {!permission && <ActivityIndicator accessibilityLabel="Checking camera permission" />}
        {permission && !permission.granted && <>
          <BodyText>{permission.canAskAgain ? 'Allow camera access to take a landmark photo.' : 'Camera permission is disabled. Enable it in device settings or choose manually.'}</BodyText>
          {permission.canAskAgain && <PrimaryButton label="Allow camera" onPress={() => { void requestPermission().catch(() => { if (active.current) setMessage('Camera permission could not be requested. Choose manually.'); }); }} />}
        </>}
        {permission?.granted && !result && <View style={styles.preview}>
          <CameraView ref={camera} style={styles.camera} facing="back" onCameraReady={() => setReady(true)}
            onMountError={() => { setReady(false); setMessage('Camera unavailable. Close and retry, or choose manually.'); }} />
        </View>}
        <BodyText>{message}</BodyText>
        {state.status === 'loading' && <BodyText>Loading the offline model...</BodyText>}
        {state.status === 'unavailable' && <BodyText>Recognition could not load. Try another photo to retry, or choose manually.</BodyText>}
        {busy && <ActivityIndicator accessibilityLabel="Recognizing landmark" />}
        {!result && permission?.granted && <PrimaryButton label={busy ? 'Recognizing...' : 'Take photo'} onPress={() => void capture()} disabled={!ready || busy || state.status === 'loading'} />}
        {result?.status === 'recognized' && <>
          <BodyText>Recognized: {result.landmark.name}. Confirm that this is your starting landmark.</BodyText>
          <PrimaryButton label={`Use ${result.landmark.name}`} onPress={() => onSelect(result.landmark)} />
        </>}
        {result?.status === 'uncertain' && <BodyText>Recognition is uncertain. Choose a suggested landmark only if it matches your location.</BodyText>}
        {result?.status === 'not-a-landmark' && <BodyText>This photo does not appear to show a supported landmark. Choose manually or try another photo.</BodyText>}
        {result?.status === 'unavailable' && <BodyText>Recognition is unavailable for this photo. Choose manually or retry.</BodyText>}
        {result?.status === 'uncertain' && candidates.map((candidate) => <PrimaryButton key={candidate.landmark.id}
          label={candidate.landmark.name} onPress={() => onSelect(candidate.landmark)} />)}
        {result && <PrimaryButton label="Try another photo" onPress={() => { setReady(false); setResult(null); }} />}
        <PrimaryButton label="Choose starting point manually" onPress={onChooseManually} />
        <Pressable accessibilityRole="button" style={styles.close} onPress={onClose}><BodyText>Close scanner</BodyText></Pressable>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({ page: { flex: 1 }, content: { padding: 20, gap: 16 }, preview: { height: 300, borderRadius: 12, overflow: 'hidden' }, camera: { flex: 1 }, close: { minHeight: 48, justifyContent: 'center', alignItems: 'center' } });
