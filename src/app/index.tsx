import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const steps = [
  { title: 'Check the destination', detail: 'Read the route sign and confirm your stop before boarding.' },
  { title: 'Ask about the fare', detail: 'Confirm the price and payment method with the driver or staff.' },
  { title: 'Know where to get off', detail: 'Ask for the nearest designated stop to your destination.' },
];

export default function HomeScreen() {
  const theme = useTheme();
  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.brand}>
          <View accessible={false} aria-hidden style={[styles.brandMark, { backgroundColor: theme.accent }]}>
            <ThemedText themeColor="onAccent" style={styles.brandLetter}>P</ThemedText>
          </View>
          <ThemedText style={styles.brandName}>Para-Po</ThemedText>
        </View>
        <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold" themeColor="accent">Commuter guide</ThemedText>
        </View>
      </View>

      <View style={styles.intro}>
        <ThemedText type="smallBold" themeColor="accent" style={styles.eyebrow}>A LITTLE HELP ALONG THE WAY</ThemedText>
        <ThemedText type="title" accessibilityRole="header">Commute with confidence.</ThemedText>
        <ThemedText themeColor="textSecondary">Simple guidance for your next ride. Start here, wherever you’re headed.</ThemedText>
      </View>

      <View style={[styles.hero, { backgroundColor: theme.hero }]}>
        <View accessible={false} aria-hidden style={styles.routeArt}>
          <View style={[styles.routeDot, { borderColor: theme.highlight }]} />
          <View style={[styles.routeLine, { backgroundColor: theme.highlight }]} />
          <View style={[styles.routeDot, { borderColor: theme.highlight, backgroundColor: theme.highlight }]} />
        </View>
        <ThemedText themeColor="heroSecondary" type="smallBold">YOUR NEXT RIDE, MADE CLEARER</ThemedText>
        <ThemedText accessibilityRole="header" themeColor="onHero" style={styles.heroTitle}>Before you hop on.</ThemedText>
        <ThemedText themeColor="heroSecondary">Find boarding tips, payment reminders, and useful questions to ask along the way.</ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/explore')}
          style={({ pressed }) => [styles.primaryAction, { backgroundColor: theme.highlight }, pressed && styles.pressed]}>
          <ThemedText style={[styles.actionLabel, { color: theme.hero }]}>Open commuter guide</ThemedText>
        </Pressable>
        <ThemedText themeColor="heroSecondary" type="small">Guide text is included in the app. No sign-in needed.</ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText accessibilityRole="header" style={styles.sectionTitle}>Three checks before you go</ThemedText>
        <View style={[styles.checklist, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          {steps.map((step, index) => (
            <View key={step.title} style={styles.step}>
              <View style={[styles.stepNumber, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold" themeColor="accent">0{index + 1}</ThemedText>
              </View>
              <View style={styles.stepText}>
                <ThemedText style={styles.stepTitle}>{step.title}</ThemedText>
                <ThemedText themeColor="textSecondary">{step.detail}</ThemedText>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.notice, { borderColor: theme.border }]}>
        <ThemedText type="smallBold">About this early version</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">Camera identification, route search, and live maps are not available yet. The guide provides general tips; confirm current routes and fares locally.</ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three, flexWrap: 'wrap' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  brandMark: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandLetter: { fontSize: 24, lineHeight: 28, fontWeight: '800' },
  brandName: { fontSize: 22, lineHeight: 28, fontWeight: '800' },
  badge: { paddingVertical: Spacing.two, paddingHorizontal: 12, borderRadius: 24 },
  intro: { gap: 12 },
  eyebrow: { letterSpacing: 1, fontSize: 12 },
  hero: { padding: Spacing.four, borderRadius: 24, gap: Spacing.three },
  heroTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  routeArt: { flexDirection: 'row', alignItems: 'center', width: 120, paddingVertical: Spacing.two },
  routeDot: { width: 16, height: 16, borderWidth: 3, borderRadius: 8 },
  routeLine: { height: 3, flex: 1 },
  primaryAction: { minHeight: 56, padding: Spacing.three, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.75 },
  section: { gap: Spacing.three },
  sectionTitle: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  checklist: { padding: Spacing.three, gap: Spacing.four, borderRadius: 20, borderWidth: 1 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNumber: { minWidth: 36, minHeight: 36, padding: Spacing.two, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, gap: Spacing.one },
  stepTitle: { fontWeight: '700' },
  notice: { borderTopWidth: 1, paddingTop: Spacing.four, gap: Spacing.two },
});
