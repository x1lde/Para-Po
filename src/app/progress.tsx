import { StyleSheet, Text, View } from 'react-native';

import { AppIcon, BodyText, Card, Kicker, RecoveryLink, ScreenFrame, typography, useAppColors } from '@/components/commuter-ui';
import { Radius, Space } from '@/constants/theme';

const badges = [
  { icon: 'destination', title: 'First landmark', copy: 'Confirm your first useful landmark.' },
  { icon: 'wifiOff', title: 'Offline ride', copy: 'Complete a qualifying trip while offline.' },
  { icon: 'map', title: 'Five landmarks', copy: 'Confirm five distinct landmarks.' },
] as const;

export default function ProgressScreen() {
  const colors = useAppColors();
  return (
    <ScreenFrame>
      <View style={styles.content}>
        <View style={styles.intro}>
          <Kicker>Optional rewards</Kicker>
          <Text accessibilityRole="header" style={[typography.pageTitle, { color: colors.text }]}>Your progress</Text>
          <BodyText>Progress is optional. Your ride should always come first.</BodyText>
        </View>

        <Card accent>
          <View style={styles.levelRow}>
            <View style={[styles.levelIcon, { backgroundColor: colors.surfaceRaised }]}>
              <AppIcon name="leaf" size={24} color={colors.primary} />
            </View>
            <View style={styles.levelCopy}>
              <Text style={[styles.levelTitle, { color: colors.text }]}>Your commuter profile</Text>
              <BodyText>Level and points aren’t available yet.</BodyText>
            </View>
            <Text style={[styles.levelNumber, { color: colors.textSecondary }]}>—</Text>
          </View>
          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <Stat label="Daily streak" value="—" />
            <Stat label="Completed trips" value="—" />
            <Stat label="Landmarks" value="—" />
          </View>
          <BodyText>Progress saving and Manila-timezone streak tracking aren’t connected.</BodyText>
        </Card>

        <View style={styles.badgesHeading}>
          <View style={styles.titleCopy}>
            <Text style={[typography.sectionTitle, { color: colors.text }]}>Badges</Text>
            <BodyText>These goals will be tracked once progress is available.</BodyText>
          </View>
          <Text style={[styles.optionalLabel, { color: colors.plum }]}>Optional</Text>
        </View>
        {badges.map((badge) => <BadgeCard key={badge.title} badge={badge} />)}
        <RecoveryLink label="Back to Ride" route="/" />
      </View>
    </ScreenFrame>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const colors = useAppColors();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function BadgeCard({ badge }: { badge: (typeof badges)[number] }) {
  const colors = useAppColors();
  return (
    <Card>
      <View style={styles.badgeRow}>
        <View style={[styles.badgeIcon, { backgroundColor: colors.backgroundSelected }]}>
          <AppIcon name={badge.icon} size={20} color={colors.plum} />
        </View>
        <View style={styles.badgeCopy}>
          <Text style={[styles.badgeTitle, { color: colors.text }]}>{badge.title}</Text>
          <BodyText>{badge.copy}</BodyText>
        </View>
        <Text style={[styles.unavailable, { color: colors.textSecondary }]}>Unavailable</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: Space.three, paddingTop: Space.four },
  intro: { gap: Space.two, paddingBottom: Space.two },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: Space.three },
  levelIcon: { width: 50, height: 50, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  levelCopy: { flex: 1, gap: Space.one },
  levelTitle: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  levelNumber: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  statsRow: { borderTopWidth: 1, paddingTop: Space.three, flexDirection: 'row', flexWrap: 'wrap', gap: Space.two },
  stat: { flex: 1, minWidth: 86, alignItems: 'flex-start', gap: Space.one },
  statValue: { fontSize: 23, lineHeight: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  badgesHeading: { paddingTop: Space.three, flexDirection: 'row', alignItems: 'center', gap: Space.two },
  titleCopy: { flex: 1, gap: Space.one },
  optionalLabel: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: Space.three },
  badgeIcon: { width: 44, height: 44, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  badgeCopy: { flex: 1, gap: Space.one },
  badgeTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  unavailable: { fontSize: 11, lineHeight: 15, fontWeight: '700', maxWidth: 70, textAlign: 'right' },
});
