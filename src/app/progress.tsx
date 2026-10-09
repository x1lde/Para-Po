import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppIcon, Badge, BodyText, Card, CardHeader, CardTitle, Kicker, ProgressBar, RecoveryLink, ScreenFrame, Separator, typography, useAppColors } from '@/components/commuter-ui';
import { Fonts, Radius, Space } from '@/constants/theme';

const badges = [
  { icon: 'destination', tone: 'gold', title: 'First landmark', copy: 'Confirm your first useful landmark.' },
  { icon: 'wifiOff', tone: 'primary', title: 'Offline ride', copy: 'Complete a qualifying trip while offline.' },
  { icon: 'map', tone: 'success', title: 'Five landmarks', copy: 'Confirm five distinct landmarks.' },
] as const;

export default function ProgressScreen() {
  const colors = useAppColors();
  const { width } = useWindowDimensions();
  const wide = width >= 1024;
  return (
    <ScreenFrame>
      <View style={styles.content}>
        <View style={styles.intro}>
          <Kicker>Optional rewards</Kicker>
          <Text accessibilityRole="header" style={[typography.pageTitle, { color: colors.text }]}>Your progress</Text>
          <BodyText>Progress is optional. Your ride should always come first.</BodyText>
        </View>

        <View style={[styles.overview, wide ? styles.overviewWide : null]}>
          <View style={wide ? styles.overviewPaneWide : null}>
            <Card accent>
              <CardHeader>
                <View style={styles.levelIdentity}>
                  <View style={[styles.levelIcon, { backgroundColor: colors.surfaceRaised }]}>
                    <AppIcon name="leaf" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.levelCopy}>
                    <CardTitle>Your commuter profile</CardTitle>
                    <BodyText>Level and points aren&apos;t available yet.</BodyText>
                  </View>
                </View>
                <Badge variant="outline" icon="leaf">Level —</Badge>
              </CardHeader>
              <ProgressBar value={0} label="Commuter level progress" />
              <Text style={[typography.small, { color: colors.textSecondary }]}>
                Progress saving and Manila-timezone streak tracking aren&apos;t connected.
              </Text>
            </Card>
          </View>
          <View style={wide ? styles.overviewPaneWide : null}>
            <Card>
              <StatRow icon="flame" label="Daily streak" value="—" />
              <Separator />
              <StatRow icon="route" label="Completed trips" value="—" />
              <Separator />
              <StatRow icon="map" label="Landmarks" value="—" />
              <BodyText>Progress saving and Manila-timezone streak tracking aren&apos;t connected.</BodyText>
            </Card>
          </View>
        </View>

        <View style={styles.badgesHeading}>
          <View style={styles.titleCopy}>
            <Text style={[typography.sectionTitle, { color: colors.text }]}>Badges</Text>
            <BodyText>These goals will be tracked once progress is available.</BodyText>
          </View>
          <Text style={[styles.optionalLabel, { color: colors.plum }]}>Optional</Text>
        </View>
        <View style={[styles.badgesGrid, wide ? styles.badgesGridWide : null]}>
          {badges.map((badge) => (
            <View key={badge.title} style={wide ? styles.badgeCellWide : null}>
              <BadgeCard badge={badge} />
            </View>
          ))}
        </View>
        <RecoveryLink label="Back to Ride" route="/" />
      </View>
    </ScreenFrame>
  );
}

function StatRow({ icon, label, value }: { icon: 'flame' | 'route' | 'map'; label: string; value: string }) {
  const colors = useAppColors();
  return (
    <View style={styles.statRow}>
      <View style={[styles.statIcon, { backgroundColor: colors.backgroundSelected }]}>
        <AppIcon name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.statLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[typography.title, styles.statValue, { color: colors.textSecondary }]}>{value}</Text>
    </View>
  );
}

function BadgeCard({ badge }: { badge: (typeof badges)[number] }) {
  const colors = useAppColors();
  const tone = badge.tone === 'gold' ? colors.gold : badge.tone === 'success' ? colors.success : colors.primary;
  return (
    <Card>
      <View style={styles.badgeRow}>
        <View style={[styles.badgeIcon, { backgroundColor: `${tone}1A` }]}>
          <AppIcon name={badge.icon} size={20} color={tone} />
        </View>
        <View style={styles.badgeCopy}>
          <Text style={[styles.badgeTitle, { color: colors.text }]}>{badge.title}</Text>
          <BodyText>{badge.copy}</BodyText>
        </View>
        <Badge variant="outline">Up next</Badge>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: Space.three, paddingTop: Space.two },
  intro: { gap: Space.two },
  overview: { gap: Space.three },
  overviewWide: { flexDirection: 'row', alignItems: 'stretch' },
  overviewPaneWide: { flex: 1, minWidth: 0 },
  levelIdentity: { flexDirection: 'row', alignItems: 'center', gap: Space.three, flex: 1, minWidth: 0 },
  levelIcon: { width: 50, height: 50, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  levelCopy: { flex: 1, minWidth: 0, gap: Space.one },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: Space.three, minHeight: 48 },
  statIcon: { width: 36, height: 36, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  statLabel: { flex: 1, fontSize: 15, lineHeight: 20, fontFamily: Fonts.semibold },
  statValue: { textAlign: 'right' },
  badgesHeading: { paddingTop: Space.three, flexDirection: 'row', alignItems: 'center', gap: Space.two },
  badgesGrid: { gap: Space.three },
  badgesGridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  badgeCellWide: { width: '48%' },
  titleCopy: { flex: 1, gap: Space.one },
  optionalLabel: { fontSize: 12, lineHeight: 16, fontFamily: Fonts.bold },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: Space.three },
  badgeIcon: { width: 44, height: 44, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  badgeCopy: { flex: 1, minWidth: 0, gap: Space.one },
  badgeTitle: { fontSize: 15, lineHeight: 20, fontFamily: Fonts.bold },
});
