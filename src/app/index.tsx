import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Art, artwork, Button, Card, Icon, Intro, Page, ui } from '@/components/commute/ui';
import { MakatiMap } from '@/components/commute/makati-map';
import { pilotDataset } from '@/database/data/pilot-dataset';
import { commuterDataAvailable, listLandmarks, listDestinations, getJourneyRecommendations } from '@/features/transport/components/commuter-data';
import type { Landmark, Destination } from '@/features/transport/types';
import { ChoicePicker } from '@/features/maps/components/ChoicePicker';
import { useTheme } from '@/hooks/use-theme';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

export default function HomeScreen() {
  const t = useTheme();
  const { width, tablet: wide } = useResponsiveLayout();
  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [landmarks, setLandmarks] = useState<readonly Landmark[]>(commuterDataAvailable ? [] : pilotDataset.landmarks);
  const [destinations, setDestinations] = useState<readonly Destination[]>(commuterDataAvailable ? [] : pilotDataset.destinations);
  const [loading, setLoading] = useState(commuterDataAvailable);
  const [storageError, setStorageError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [finding, setFinding] = useState(false);
  const findSequence = useRef(0);
  const currentPair = `${originId}\u0000${destinationId}`;
  const pairRef = useRef(currentPair);
  useEffect(() => { pairRef.current = currentPair; }, [currentPair]);
  useEffect(() => {
    if (!commuterDataAvailable) return;
    let active = true;
    void Promise.all([listLandmarks(), listDestinations()]).then(([origins, destinations]) => {
      if (!active) return;
      setLandmarks(origins); setDestinations(destinations); setStorageError(false); setLoading(false);
    }).catch(() => { if (active) { setStorageError(true); setLoading(false); } });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => () => { findSequence.current += 1; }, []);
  const findRide = async () => {
    const request = ++findSequence.current;
    const pair = currentPair;
    setFinding(true); setStorageError(false);
    try {
      if (commuterDataAvailable) await getJourneyRecommendations({ originId, destinationId });
      if (request !== findSequence.current || pair !== pairRef.current) return;
      router.navigate({ pathname: '/map', params: { originId, destinationId, originRequest: String(Date.now()) } });
    } catch { if (request === findSequence.current && pair === pairRef.current) setStorageError(true); }
    finally { if (request === findSequence.current) setFinding(false); }
  };
  return <Page>
    <Intro eyebrow="Your everyday Makati companion" title="Saan tayo?" description="A familiar landmark. A better way to get there." />
    <View style={[styles.layout, wide && styles.wide]}>
      <View style={[styles.planner, wide && { width: width >= 1024 ? 360 : 310 }]}>
        <View style={[styles.invitation, { backgroundColor: t.hero, borderColor: t.yellow }]}>
          <Image source={artwork.warm} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityElementsHidden />
          <View style={styles.postcard}><Image source={artwork.landmark} style={{ flex: 1, width: '100%' }} contentFit="cover" /><ThemedText type="small" style={styles.postcardLabel}>Find your familiar.</ThemedText></View>
          <View style={[styles.invitationCopy, { maxWidth: wide ? 215 : width < 360 ? 170 : 205 }]}><Icon name="scan" color={t.onHero} /><ThemedText style={[styles.scanTitle, { color: t.onHero }]}>Start with{'\n'}what you see.</ThemedText>
            <ThemedText type="small" style={{ color: t.heroSecondary }}>A landmark is all you need.</ThemedText>
            <Button icon="camera" brand onPress={() => router.navigate('/camera')}>Scan a landmark</Button>
          </View>
        </View>
        <Card><View style={ui.row}><Icon name="compass" /><ThemedText style={[styles.cardTitle, { flex: 1 }]}>Let’s plan your ride</ThemedText><Pressable accessibilityRole="button" accessibilityLabel="Swap places" disabled={!originId && !destinationId} accessibilityState={{ disabled: !originId && !destinationId }} onPress={() => { setOriginId(destinationId); setDestinationId(originId); }} style={({ pressed }) => [styles.swap, { backgroundColor: t.backgroundSelected, opacity: !originId && !destinationId ? .45 : pressed ? .65 : 1 }]}><Icon name="swap" /></Pressable></View>
          <View style={[styles.fields, { backgroundColor: t.soft, borderColor: t.line }]}>
            <ChoicePicker label="Starting point" value={originId} choices={landmarks} onSelect={setOriginId} />
            <View style={{ height: 1, backgroundColor: t.line }} />
            <ChoicePicker label="Destination" value={destinationId} choices={destinations} onSelect={setDestinationId} />
          </View>
          <Button icon="arrow" disabled={!originId || !destinationId || loading || finding} onPress={() => void findRide()}>{finding ? 'Finding your ride...' : 'Find my ride'}</Button>
          {loading && <ThemedText type="small">Loading the local trip catalog...</ThemedText>}
          {storageError && <><ThemedText type="small">Could not read the local trip data. Please retry.</ThemedText><Button secondary onPress={() => { setStorageError(false); setLoading(true); setAttempt((value) => value + 1); }}>Retry local data</Button></>}
          <View style={ui.row}><Icon name="shield" size={15} color={t.textSecondary} /><ThemedText type="small" themeColor="textSecondary">Choose both places to see your ride options.</ThemedText></View>
        </Card>
        <View style={[ui.row, { paddingHorizontal: 11 }]}><Icon name="sparkle" size={28} color={t.primary} /><View style={{ flex: 1 }}><ThemedText type="smallBold">Less guessing. More going.</ThemedText><ThemedText type="small" themeColor="textSecondary">Landmark recognition and local guidance work offline.</ThemedText></View></View>
      </View>
      <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', minWidth: 0 }}><MakatiMap expanded={!wide} /></View>
    </View>
    <View style={[styles.bottom, wide && styles.wide]}>
      <Card style={{ flex: 1 }}><ThemedText style={styles.cardTitle}>Your city. Your everyday rides.</ThemedText><ThemedText type="small" themeColor="textSecondary">Jeepneys, buses, P2Ps and short walks between {pilotDataset.landmarks.length} familiar Makati landmarks.</ThemedText>
        <View style={styles.vehicles}>{(['jeepney', 'ejeep', 'bus', 'pin'] as const).map((mode, i) => <View key={mode} style={styles.vehicle}><Art name={mode} size={51} /><ThemedText type="small">{['Jeepney', 'E-jeep', 'Bus & P2P', 'Walk'][i]}</ThemedText></View>)}</View>
        <ThemedText type="small" themeColor="textSecondary">Routes come from OpenStreetMap community data. Check the signboard before you board.</ThemedText>
      </Card>
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/explore')} style={({ pressed }) => [{ flex: 1, opacity: pressed ? .7 : 1 }]}><Card style={[styles.guide, { flex: 1 }]}><View style={[styles.star, { backgroundColor: t.goldSoft }]}><Art name="star" size={45} /></View><View style={{ flex: 1 }}><ThemedText style={styles.cardTitle}>A little more familiar.</ThemedText><ThemedText type="small" themeColor="textSecondary">Explore {pilotDataset.landmarks.length} supported Makati landmarks.</ThemedText></View><Icon name="external" size={19} /></Card></Pressable>
    </View>
    <View style={ui.row}><Icon name="pin" size={12} color={t.textSecondary} /><ThemedText type="small" themeColor="textSecondary">ParaPo! provides local route guidance. Check service and boarding details before travelling.</ThemedText></View>
  </Page>;
}
const styles = StyleSheet.create({ swap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }, layout: { gap: 25 }, wide: { flexDirection: 'row', alignItems: 'stretch' }, planner: { gap: 17 }, invitation: { minHeight: 232, padding: 20, borderRadius: 28, borderWidth: 1, overflow: 'hidden' }, invitationCopy: { alignItems: 'flex-start', gap: 9 }, scanTitle: { fontSize: 28, lineHeight: 31, letterSpacing: -.8, fontWeight: '700' }, postcard: { position: 'absolute', width: 118, height: 163, top: 29, right: -22, borderWidth: 7, borderColor: '#fff', borderBottomWidth: 25, borderRadius: 12, backgroundColor: '#fff', transform: [{ rotate: '8deg' }], boxShadow: '0 7px 15px #24343B24' }, postcardLabel: { position: 'absolute', bottom: -22, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: '#4D6267' }, cardTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -.4 }, fields: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' }, bottom: { gap: 25 }, vehicles: { flexDirection: 'row', justifyContent: 'space-around', gap: 8 }, vehicle: { alignItems: 'center', gap: 8 }, guide: { flexDirection: 'row', alignItems: 'center', gap: 17 }, star: { width: 65, height: 68, borderRadius: 18, alignItems: 'center', justifyContent: 'center' } });
