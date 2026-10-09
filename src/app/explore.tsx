import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Art, Button, Card, Icon, Intro, Page, ui } from '@/components/commute/ui';
import { pilotDataset } from '@/database/data/pilot-dataset';
import { TRANSIT_ROUTE_COUNT } from '@/features/transport/planner/journey-planner';
import { useTheme } from '@/hooks/use-theme';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

export default function LandmarkGuide() {
  const t = useTheme();
  const { tablet: wide, desktop } = useResponsiveLayout();
  return <Page>
    <Intro eyebrow="Every landmark is a starting point" title="Know your Makati." description="A little more confident. A little more local. One landmark at a time." />
    <View style={[styles.overview, wide && { flexDirection: 'row' }]}>
      <Card style={[styles.level, { backgroundColor: t.backgroundSelected, flex: 1 }]}>
        <View style={ui.row}><View style={[styles.tag, { backgroundColor: t.backgroundElement }]}><ThemedText type="smallBold" style={{ color: t.primary }}>Makati pilot</ThemedText></View><ThemedText type="small" themeColor="textSecondary">Your local companion</ThemedText></View>
        <View style={[ui.row, { justifyContent: 'space-between' }]}><View><ThemedText style={styles.total}>{pilotDataset.landmarks.length}</ThemedText><ThemedText type="small" themeColor="textSecondary">supported landmarks</ThemedText></View><Art name="star" size={106} /></View>
        <ThemedText type="smallBold">Find your starting point</ThemedText><View style={[styles.bar, { backgroundColor: t.primary }]} />
        <ThemedText type="small" themeColor="textSecondary">Scan a landmark or choose it manually. ParaPo! helps you take the next step.</ThemedText>
      </Card>
      <Card style={{ flex: 1, paddingVertical: 8 }}>{[
        ['camera', 'On-device', 'Landmark recognition', 'No photo upload'],
        ['map', String(TRANSIT_ROUTE_COUNT), 'jeepney, bus and P2P routes', 'Works offline'],
        ['pin', String(pilotDataset.landmarks.length), 'places to start from', 'Makati City'],
      ].map(([icon, value, label, note], i) => <View key={label} style={[styles.stat, { borderTopWidth: i ? 1 : 0, borderColor: t.line }]}>
        <View style={[styles.statIcon, { backgroundColor: t.backgroundSelected }]}><Icon name={icon as 'camera' | 'map' | 'pin'} size={23} /></View>
        <View style={{ flex: 1, gap: 4 }}><ThemedText style={{ fontSize: value === 'On-device' ? 22 : 28, lineHeight: 34, fontWeight: '700' }}>{value}</ThemedText><ThemedText type="small" themeColor="textSecondary">{label}</ThemedText><ThemedText type="small" themeColor="textSecondary">{note}</ThemedText></View>
      </View>)}</Card>
    </View>
    <View><ThemedText type="subtitle">A few ways to get going</ThemedText><ThemedText type="small" themeColor="textSecondary">Choose what works for you.</ThemedText></View>
    <View style={[styles.overview, desktop && { flexDirection: 'row' }]}>{[
      { art: 'star' as const, title: 'Start with what you see', text: 'Point your camera at a supported landmark to find your starting point.', path: '/camera' as const, color: t.goldSoft },
      { art: 'ejeep' as const, title: 'Signal? Optional.', text: 'Recognition and bundled guidance work offline. The interactive map needs a connection.', path: '/map' as const, color: t.backgroundSelected },
      { art: 'pin' as const, title: 'A little more local', text: 'Choose a familiar Makati landmark and a destination to plan your journey.', path: '/' as const, color: t.greenSoft },
    ].map((item) => <Pressable key={item.title} accessibilityRole="button" onPress={() => router.navigate(item.path)} style={({ pressed }) => [{ flex: 1, opacity: pressed ? .7 : 1 }]}>
      <Card style={{ flex: 1 }}><View style={[styles.badge, { backgroundColor: item.color }]}><Art name={item.art} size={57} /></View><ThemedText type="smallBold">{item.title}</ThemedText><ThemedText type="small" themeColor="textSecondary">{item.text}</ThemedText></Card>
    </Pressable>)}</View>
    <View><ThemedText type="subtitle">Your familiar places</ThemedText><ThemedText type="small" themeColor="textSecondary">Tap a landmark to use it as your starting point. Every landmark connects to all the others.</ThemedText></View>
    <View style={styles.catalog}>{pilotDataset.landmarks.map((landmark) => <Pressable key={landmark.id} accessibilityRole="button"
      style={({ pressed }) => [styles.landmark, { borderColor: t.line, backgroundColor: pressed ? t.backgroundSelected : t.backgroundElement, width: wide ? '48%' : '100%' }]}
      onPress={() => router.navigate({ pathname: '/map', params: { originId: landmark.id, originRequest: String(Date.now()) } })}>
      <Icon name="pin" /><ThemedText style={{ flex: 1 }}>{landmark.name}</ThemedText><Icon name="chevron" size={17} />
    </Pressable>)}</View>
    <Card><ThemedText type="subtitle">Ready for a little adventure?</ThemedText><ThemedText themeColor="textSecondary">Choose a starting point. We’ll help with the ride.</ThemedText><Button icon="arrow" onPress={() => router.navigate('/')}>Find a ride</Button></Card>
  </Page>;
}
const styles = StyleSheet.create({ overview: { gap: 24 }, level: { padding: 28 }, tag: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 8 }, total: { fontSize: 72, lineHeight: 80, fontWeight: '700', letterSpacing: -4 }, bar: { height: 8, borderRadius: 8 }, stat: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 21, flexWrap: 'wrap' }, statIcon: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, badge: { width: 87, height: 87, borderRadius: 24, justifyContent: 'center', alignItems: 'center' }, catalog: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, landmark: { minHeight: 64, borderWidth: 1, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 } });
