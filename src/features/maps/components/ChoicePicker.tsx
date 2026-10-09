import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/commute/ui';
import { useTheme } from '@/hooks/use-theme';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

export function ChoicePicker({ label, value, choices, disabled, onSelect }: {
  label: string; value: string; choices: readonly { id: string; name: string }[];
  disabled?: boolean; onSelect: (id: string) => void;
}) {
  const theme = useTheme();
  const { tablet } = useResponsiveLayout();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const name = choices.find((choice) => choice.id === value)?.name ?? (label === 'Destination' ? 'Where are you headed?' : 'Choose a nearby landmark');
  const unavailable = Boolean(disabled || choices.length === 0);
  const matches = choices.filter((choice) => choice.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const close = () => setOpen(false);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${name}`} accessibilityState={{ disabled: unavailable, expanded: open }}
      disabled={unavailable} onPress={() => { setQuery(''); setOpen(true); }}
      style={({ pressed }) => [styles.button, { borderColor: theme.line, opacity: unavailable ? .5 : pressed ? .65 : 1 }]}>
      <View style={{ flex: 1, gap: 3 }}><ThemedText type="small" themeColor="textSecondary">{label}</ThemedText><ThemedText>{name}</ThemedText></View>
      <Icon name="chevron" size={18} color={theme.textSecondary} />
    </Pressable>
    {open && <Modal visible transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss place picker" onPress={close} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, tablet && styles.dialog, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.heading, { borderColor: theme.line }]}>
            <View style={{ flex: 1, gap: 4 }}><ThemedText type="subtitle" accessibilityRole="header">{label}</ThemedText><ThemedText type="small" themeColor="textSecondary">Choose a familiar Makati place.</ThemedText></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close place picker" hitSlop={4} onPress={close}
              style={({ pressed }) => [styles.close, { backgroundColor: theme.soft, opacity: pressed ? .65 : 1 }]}><Icon name="close" color={theme.textSecondary} /></Pressable>
          </View>
          <View style={[styles.search, { backgroundColor: theme.soft, borderColor: theme.line }]}><Icon name="search" color={theme.textSecondary} />
            <TextInput accessibilityLabel="Search places" placeholder="Search landmarks…" placeholderTextColor={theme.textSecondary}
              value={query} onChangeText={setQuery} autoCorrect={false} autoCapitalize="none" returnKeyType="search"
              style={[styles.input, { color: theme.text, fontFamily: 'Inter-Regular' }]} />
          </View>
          <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite" style={styles.count}>{matches.length} {matches.length === 1 ? 'place' : 'places'}</ThemedText>
          <FlatList data={matches} keyExtractor={(item) => item.id} keyboardShouldPersistTaps="handled" initialNumToRender={10}
            contentContainerStyle={styles.list} ListEmptyComponent={<View style={styles.empty}><Icon name="search" size={32} /><ThemedText type="smallBold">No places found</ThemedText><ThemedText type="small" themeColor="textSecondary">Try a shorter name, like “Ayala”.</ThemedText></View>}
            renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={item.name} accessibilityState={{ selected: item.id === value }}
              style={({ pressed }) => [styles.option, { backgroundColor: item.id === value ? theme.backgroundSelected : pressed ? theme.soft : 'transparent', borderColor: theme.line }]}
              onPress={() => { onSelect(item.id); close(); }}><Icon name="pin" size={18} /><ThemedText style={{ flex: 1 }}>{item.name}</ThemedText>{item.id === value && <Icon name="check" />}</Pressable>} />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>}
  </>;
}

const styles = StyleSheet.create({
  button: { minHeight: 76, padding: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12, cursor: 'pointer' },
  overlay: { flex: 1, backgroundColor: '#10132670', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxHeight: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', paddingBottom: 12 },
  dialog: { maxWidth: 520, borderRadius: 24, marginVertical: 'auto', maxHeight: '80%' },
  heading: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1 },
  close: { height: 48, width: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  search: { marginHorizontal: 20, marginTop: 16, minHeight: 52, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12 },
  input: { flex: 1, minWidth: 0, minHeight: 50, fontSize: 16 },
  count: { paddingHorizontal: 20, paddingVertical: 12 }, list: { paddingHorizontal: 12 },
  option: { minHeight: 60, padding: 16, borderRadius: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12, cursor: 'pointer' },
  empty: { padding: 28, alignItems: 'center', gap: 12 },
});
