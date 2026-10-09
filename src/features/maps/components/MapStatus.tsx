import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { BodyText, Button, typography, useAppColors } from '@/components/commuter-ui';
import { Space } from '@/constants/theme';

export function MapStatus({ message, loading = false, onRetry }: {
  message: string; loading?: boolean; onRetry?: () => void;
}) {
  const colors = useAppColors();
  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator accessibilityLabel="Loading map" color={colors.primary} />}
      <BodyText style={styles.message}>{message}</BodyText>
      <Text style={[typography.small, styles.note, { color: colors.textSecondary }]}>Your offline transportation guidance is still available.</Text>
      {onRetry && <Button label="Retry map" variant="outline" icon="refresh" onPress={onRetry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Space.three, padding: Space.six },
  message: { textAlign: 'center' },
  note: { textAlign: 'center' },
});
