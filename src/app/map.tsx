import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { BodyText, Card, Kicker, RecoveryLink, ScreenFrame, typography, useAppColors } from '@/components/commuter-ui';
import { Radius, Space } from '@/constants/theme';

export default function MapScreen() {
  const colors = useAppColors();
  return (
    <ScreenFrame>
      <View style={styles.content}>
        <View style={styles.intro}>
          <Kicker>Route guidance</Kicker>
          <Text accessibilityRole="header" style={[typography.pageTitle, { color: colors.text }]}>Map</Text>
          <BodyText>Map availability is separate from your network connection.</BodyText>
        </View>

        <Card>
          <View style={[styles.iconTile, { backgroundColor: colors.backgroundSelected }]}>
            <SymbolView name={{ ios: 'map', android: 'map', web: 'map' }} size={24} tintColor={colors.plum} />
          </View>
          <Text style={[typography.sectionTitle, { color: colors.text }]}>Map data unavailable</Text>
          <BodyText>This app does not have a map renderer, verified route geometry, or downloaded map assets yet. We can’t show your location, stops, or a selected route.</BodyText>
          <View style={[styles.legend, { borderColor: colors.border }]}>
            <LegendItem color={colors.primary} label="Origin — shown when route data is connected" />
            <LegendItem color={colors.plum} label="Boarding point — shown when a verified stop is available" />
            <LegendItem color={colors.gold} label="Destination — shown when route data is connected" />
          </View>
          <BodyText>There are no map downloads to use offline. Text directions will be available with a verified ride.</BodyText>
          <RecoveryLink label="Plan a ride" route="/" />
        </Card>
      </View>
    </ScreenFrame>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const colors = useAppColors();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: Space.four, paddingTop: Space.four },
  intro: { gap: Space.two, paddingBottom: Space.two },
  iconTile: { width: 52, height: 52, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  legend: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: Space.three, gap: Space.two },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Space.three },
  legendDot: { width: 11, height: 11, borderRadius: Radius.pill },
  legendText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
