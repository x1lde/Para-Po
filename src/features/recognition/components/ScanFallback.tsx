import { Modal, StyleSheet, View } from 'react-native';
import { BodyText, Button, Card, CardDescription, CardTitle } from '@/components/commuter-ui';
import type { Landmark } from '@/features/transport/types';

export interface ScanLandmarkProps {
  onClose: () => void;
  onChooseManually: () => void;
  onSelect: (landmark: Landmark) => void;
}

export function ScanFallback({ onClose, onChooseManually, message = 'Open an Android build to scan landmarks offline.' }: ScanLandmarkProps & { message?: string }) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card style={styles.dialog}>
          <CardTitle>Scan a landmark</CardTitle>
          <CardDescription>Point your camera at a supported Makati landmark to confirm where you are.</CardDescription>
          <BodyText>{message}</BodyText>
          <Button label="Choose starting point" variant="default" size="lg" onPress={onChooseManually} />
          <Button label="Close" variant="ghost" onPress={onClose} />
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#00000099' },
  dialog: { width: '100%', maxWidth: 430, alignSelf: 'center' },
});
