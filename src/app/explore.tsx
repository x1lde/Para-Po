import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Collapsible } from '@/components/ui/collapsible';
import { Fonts, Spacing } from '@/constants/theme';
import { commuterGuide } from '@/features/transport/commuter-guide';
import { useTheme } from '@/hooks/use-theme';

export default function GuideScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const entries = commuterGuide.filter((entry) => {
    const searchable = `${entry.title} ${entry.summary} ${entry.keywords} ${entry.tips.map((tip) => `${tip.title} ${tip.text}`).join(' ')}`.toLowerCase();
    return terms.every((term) => searchable.includes(term));
  });

  return (
    <Screen>
      <View style={styles.intro}>
        <ThemedText type="smallBold" themeColor="accent" style={styles.eyebrow}>A HANDY TRAVEL COMPANION</ThemedText>
        <ThemedText type="title" accessibilityRole="header">Commuter guide</ThemedText>
        <ThemedText themeColor="textSecondary">Choose your ride for a few helpful tips before you board.</ThemedText>
      </View>

      <View style={styles.searchSection}>
        <ThemedText type="smallBold" nativeID="guide-search-label">Search the guide</ThemedText>
        <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement, borderColor: theme.accent }]}>
          <TextInput
            accessibilityLabel="Search the guide"
            accessibilityLabelledBy="guide-search-label"
            placeholder="Try jeepney, train, or fare"
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
            style={[styles.input, { color: theme.text }]}
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery('')}
              style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="accent">Clear</ThemedText>
            </Pressable>
          ) : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite" role="status">
          {terms.length ? `${entries.length} ${entries.length === 1 ? 'guide' : 'guides'} found` : '4 transport guides · Tap a card to read'}
        </ThemedText>
      </View>

      <View style={styles.entries}>
        {entries.map((entry) => (
          <Collapsible key={entry.id} title={entry.title} summary={entry.summary}>
            {entry.tips.map((tip) => (
              <View key={tip.title} style={styles.tip}>
                <ThemedText style={styles.tipTitle}>{tip.title}</ThemedText>
                <ThemedText themeColor="textSecondary">{tip.text}</ThemedText>
              </View>
            ))}
          </Collapsible>
        ))}
        {entries.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText style={styles.emptyTitle}>No matching guides</ThemedText>
            <ThemedText themeColor="textSecondary">Try a transport type like “bus” or a topic like “ticket”. This guide does not search routes or destinations.</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => { setQuery(''); Keyboard.dismiss(); }}
              style={({ pressed }) => [styles.reset, { backgroundColor: theme.accent }, pressed && styles.pressed]}>
              <ThemedText themeColor="onAccent" style={styles.tipTitle}>Show all guides</ThemedText>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={[styles.reminder, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText style={styles.tipTitle}>When in doubt, ask before boarding.</ThemedText>
        <ThemedText themeColor="textSecondary">These are general tips, not verified route or fare information. Confirm your destination, fare, and unloading point with the driver or station staff.</ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: 12 },
  eyebrow: { letterSpacing: 1, fontSize: 12 },
  searchSection: { gap: Spacing.two },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14 },
  input: { flex: 1, minWidth: 0, minHeight: 56, padding: Spacing.three, fontSize: 16, lineHeight: 24, fontFamily: Fonts.sans },
  clear: { minWidth: 56, minHeight: 48, padding: Spacing.two, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  entries: { gap: 12 },
  tip: { gap: Spacing.one },
  tipTitle: { fontWeight: '700' },
  reminder: { padding: Spacing.four, borderRadius: 20, gap: Spacing.two },
  empty: { padding: Spacing.four, gap: Spacing.three, borderRadius: 20, borderWidth: 1 },
  emptyTitle: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  reset: { minHeight: 52, padding: Spacing.three, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  pressed: { opacity: 0.7 },
});
