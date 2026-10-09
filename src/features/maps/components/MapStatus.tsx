import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export function MapStatus({ message, loading = false, onRetry }: {
  message: string; loading?: boolean; onRetry?: () => void;
}) {
  return (
    <ThemedView style={styles.container}>
      {loading && <ActivityIndicator accessibilityLabel="Loading map" />}
      <ThemedText style={styles.message}>{message}</ThemedText>
      <ThemedText type="small">Your offline transportation guidance is still available.</ThemedText>
      {onRetry && <Pressable accessibilityRole="button" onPress={onRetry} style={styles.button}>
        <ThemedText type="link">Retry map</ThemedText>
      </Pressable>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  message: { textAlign: 'center' },
  button: { minHeight: 48, minWidth: 120, alignItems: 'center', justifyContent: 'center' },
});
