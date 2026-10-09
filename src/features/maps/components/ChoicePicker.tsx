import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, Button, typography, useAppColors } from '@/components/commuter-ui';
import { Radius, Space } from '@/constants/theme';

export function ChoicePicker({ label, value, choices, disabled, onSelect }: {
  label: string; value: string; choices: readonly { id: string; name: string }[];
  disabled?: boolean; onSelect: (id: string) => void;
}) {
  const colors = useAppColors();
  const [open, setOpen] = useState(false);
  const name = choices.find((choice) => choice.id === value)?.name ?? 'Choose a location';
  const unavailable = disabled || choices.length === 0;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${name}`} accessibilityState={{ disabled: unavailable }}
      disabled={unavailable} onPress={() => setOpen(true)}
      style={({ pressed }) => [styles.trigger, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }, unavailable ? styles.disabled : null, pressed && !unavailable ? styles.pressed : null]}>
      <View style={styles.triggerCopy}>
        <Text style={[typography.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.triggerValue, { color: unavailable ? colors.textSecondary : colors.text }]}>{name}</Text>
      </View>
      <AppIcon name="chevronRight" size={16} color={colors.textSecondary} />
    </Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={[styles.backdrop, { backgroundColor: colors.scrim }]}>
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.handle, { backgroundColor: colors.controlMuted }]} />
          <Text accessibilityRole="header" style={[typography.sectionTitle, styles.title, { color: colors.text }]}>{label}</Text>
          <FlatList
            data={choices}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => {
              const selected = item.id === value;
              return (
                <Pressable accessibilityRole="button" accessibilityState={{ selected }}
                  onPress={() => { onSelect(item.id); setOpen(false); }}
                  style={({ pressed }) => [styles.option, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.backgroundSelected : colors.surfaceRaised }, pressed ? styles.pressed : null]}>
                  <Text style={[styles.optionText, { color: colors.text }]}>{item.name}</Text>
                  {selected ? <AppIcon name="check" size={16} color={colors.primary} /> : null}
                </Pressable>
              );
            }} />
          <Button label="Close" variant="outline" onPress={() => setOpen(false)} />
        </SafeAreaView>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  trigger: { minHeight: 56, borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: Space.three, paddingVertical: Space.two, flexDirection: 'row', alignItems: 'center', gap: Space.two },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.76 },
  triggerCopy: { flex: 1, minWidth: 0, gap: Space.one },
  triggerValue: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 620, alignSelf: 'center', borderTopLeftRadius: Radius.large, borderTopRightRadius: Radius.large, padding: Space.four, paddingBottom: Space.six, gap: Space.three, maxHeight: '85%' },
  handle: { width: 42, height: 5, borderRadius: Radius.pill, alignSelf: 'center' },
  title: { paddingHorizontal: Space.one },
  list: { flexShrink: 1 },
  option: { minHeight: 52, borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: Space.three, paddingVertical: Space.two, marginBottom: Space.two, flexDirection: 'row', alignItems: 'center', gap: Space.two },
  optionText: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '600' },
});
