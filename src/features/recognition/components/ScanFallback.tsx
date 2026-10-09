import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { BodyText, Card, PrimaryButton } from '@/components/commuter-ui';
import type { Landmark } from '@/features/transport/types';

export interface ScanLandmarkProps {
  onClose: () => void;
  onChooseManually: () => void;
  onSelect: (landmark: Landmark) => void;
}

export function ScanFallback({ onClose, onChooseManually, message = 'Open an Android build to scan landmarks offline.' }: ScanLandmarkProps & { message?: string }) {
  return <Modal transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}><Card>
      <BodyText>{message}</BodyText>
      <PrimaryButton label="Choose starting point" onPress={onChooseManually} />
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}><BodyText>Close</BodyText></Pressable>
    </Card></View>
  </Modal>;
}


const styles = StyleSheet.create({ backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#00000099' }, close: { minHeight: 48, justifyContent: 'center', alignItems: 'center' } });
