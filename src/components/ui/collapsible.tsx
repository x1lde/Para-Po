import { type PropsWithChildren, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Collapsible({ children, title, summary }: PropsWithChildren<{ title: string; summary?: string }>) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={isOpen ? 'Hide guidance' : 'Show guidance'}
        accessibilityState={{ expanded: isOpen }}
        aria-expanded={isOpen}
        style={({ pressed }) => [styles.heading, pressed && styles.pressed]}
        onPress={() => setIsOpen((value) => !value)}>
        <View style={styles.labels}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          {summary ? <ThemedText type="small" themeColor="textSecondary">{summary}</ThemedText> : null}
        </View>
        <View accessible={false} aria-hidden style={[styles.toggle, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText themeColor="accent" style={styles.toggleText}>{isOpen ? '−' : '+'}</ThemedText>
        </View>
      </Pressable>
      {isOpen ? <View style={[styles.content, { borderColor: theme.border }]}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1 },
  heading: {
    minHeight: 72,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 20,
  },
  labels: { flex: 1, gap: Spacing.one },
  title: { fontSize: 18, fontWeight: '700', lineHeight: 26 },
  pressed: { opacity: 0.65 },
  toggle: { minWidth: 32, minHeight: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: 24, lineHeight: 28 },
  content: { padding: Spacing.three, gap: Spacing.three, borderTopWidth: 1 },
});
