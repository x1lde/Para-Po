import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export function ChoicePicker({ label, value, choices, disabled, onSelect }: {
  label: string; value: string; choices: readonly { id: string; name: string }[];
  disabled?: boolean; onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const name = choices.find((choice) => choice.id === value)?.name ?? 'Choose a location';
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${name}`} accessibilityState={{ disabled: disabled || choices.length === 0 }}
      disabled={disabled || choices.length === 0} onPress={() => setOpen(true)} style={styles.button}>
      <ThemedText type="small">{label}</ThemedText><ThemedText>{name}</ThemedText>
    </Pressable>
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <ThemedView style={styles.page}><SafeAreaView style={styles.page}>
        <ThemedText type="subtitle" style={styles.title}>{label}</ThemedText>
        <FlatList data={choices} keyExtractor={(item) => item.id} renderItem={({ item }) =>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: item.id === value }} style={styles.button}
            onPress={() => { onSelect(item.id); setOpen(false); }}><ThemedText>{item.name}</ThemedText></Pressable>} />
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.button}><ThemedText type="link">Close</ThemedText></Pressable>
      </SafeAreaView></ThemedView>
    </Modal>
  </>;
}

const styles = StyleSheet.create({ button: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: '#808080', borderRadius: 8, margin: 4 }, page: { flex: 1 }, title: { padding: 16 } });
