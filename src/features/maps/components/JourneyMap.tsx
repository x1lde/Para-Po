import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IllustratedMap } from '@/components/commute/illustrated-map';
import { Art, Button, Card, Icon, Intro, Page, ui } from '@/components/commute/ui';
import { pilotDataset } from '@/database/data/pilot-dataset';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { ChoicePicker } from './ChoicePicker';

/** Bundled guidance is immediate; SQLite and the interactive map are native-only. */
export function JourneyMap() {
  const params = useLocalSearchParams<{ originId?: string; destinationId?: string; originRequest?: string }>();
  const [originId, setOriginId] = useState(params.originId ?? '');
  const [destinationId, setDestinationId] = useState(params.destinationId ?? '');
  const [detailsId, setDetailsId] = useState('');
  const { tablet, desktop } = useResponsiveLayout();
  const requestKey = `${params.originId ?? ''}|${params.destinationId ?? ''}|${params.originRequest ?? ''}`;
  const [syncedRequest, setSyncedRequest] = useState(requestKey);
  if (syncedRequest !== requestKey) {
    setSyncedRequest(requestKey);
    setDetailsId('');
    setOriginId(params.originId ?? '');
    setDestinationId(params.destinationId ?? '');
  }
  const origin = pilotDataset.landmarks.find((item) => item.id === originId);
  const destination = pilotDataset.destinations.find((item) => item.id === destinationId);
  const access = pilotDataset.landmarkBoardingPoints.filter((item) => item.landmarkId === originId);
  const routes = pilotDataset.routes.filter((route) => route.destinationId === destinationId && pilotDataset.routeBoardingPoints.some((stop) => stop.routeId === route.id && access.some((item) => item.boardingPointId === stop.boardingPointId)));
  return <Page>
    <Intro eyebrow="A little direction goes a long way" title="Your next ride." description="Choose your landmarks. We’ll help with the next step." />
    <View style={[styles.layout, tablet && styles.wide]}>
      <View style={[styles.planner, tablet && { width: desktop ? 390 : 310 }]}>
        <Card>
          <View style={ui.row}><Icon name="compass" /><ThemedText type="smallBold">Plan your journey</ThemedText></View>
          <ChoicePicker label="Starting point" value={originId} choices={pilotDataset.landmarks} onSelect={(id) => { setOriginId(id); setDetailsId(''); }} />
          <ChoicePicker label="Destination" value={destinationId} choices={pilotDataset.destinations} onSelect={(id) => { setDestinationId(id); setDetailsId(''); }} />
          <Button icon="swap" secondary disabled={!originId && !destinationId} onPress={() => { setOriginId(destinationId); setDestinationId(originId); setDetailsId(''); }}>Swap places</Button>
          <Button icon="camera" secondary onPress={() => router.navigate('/camera')}>Scan a landmark</Button>
        </Card>
        <View accessibilityLiveRegion="polite" style={styles.results}>
          {origin && destination ? <>
            <ThemedText type="smallBold">{origin.name} to {destination.name}</ThemedText>
            {originId === destinationId ? <Card><Icon name="check" /><ThemedText>You selected the same starting place and destination.</ThemedText><ThemedText type="small" themeColor="textSecondary">Choose another destination to plan a ride.</ThemedText></Card>
              : routes.length === 0 ? <Card><Art name="pin" size={48} /><ThemedText type="smallBold">No bundled journey for these places yet.</ThemedText><ThemedText themeColor="textSecondary">Try Circuit to One Ayala, or One Ayala to Circuit.</ThemedText><Button icon="arrow" onPress={() => { setOriginId('ayala_malls_circuit'); setDestinationId('one_ayala'); }}>Try Circuit to One Ayala</Button></Card>
              : routes.map((route) => {
                const stop = pilotDataset.routeBoardingPoints.find((item) => item.routeId === route.id && access.some((point) => point.boardingPointId === item.boardingPointId));
                const boarding = pilotDataset.boardingPoints.find((item) => item.id === stop?.boardingPointId);
                const walk = access.find((point) => point.boardingPointId === stop?.boardingPointId);
                return <Card key={route.id}>
                  <View style={ui.row}><Art name="bus" size={48} /><View style={{ flex: 1 }}><ThemedText type="small" themeColor="textSecondary">Published bus journey</ThemedText><ThemedText type="smallBold">{route.name}</ThemedText></View></View>
                  {walk?.walkingInstructions && <ThemedText>{walk.walkingInstructions}</ThemedText>}
                  <ThemedText type="smallBold">Board at {boarding?.name}</ThemedText><ThemedText>{stop?.boardingInstructions}</ThemedText>
                  <ThemedText type="smallBold">Get off at {route.alightingLocation}</ThemedText><ThemedText>{route.alightingInstructions}</ThemedText>
                  {route.destinationWalkingInstructions && <ThemedText>{route.destinationWalkingInstructions}</ThemedText>}
                  <Button secondary icon={detailsId === route.id ? 'close' : 'book'} onPress={() => setDetailsId(detailsId === route.id ? '' : route.id)}>{detailsId === route.id ? 'Hide source details' : 'Source & service details'}</Button>
                  {detailsId === route.id && <><ThemedText type="small" themeColor="textSecondary">{route.limitations}</ThemedText><ThemedText type="small" themeColor="textSecondary" selectable>Reviewed {route.reviewedOn}: {route.sourceReference}</ThemedText></>}
                  <ThemedText type="small" themeColor="textSecondary">Check today’s service and the boarding location before travelling.</ThemedText>
                </Card>;
              })}
          </> : <View style={ui.row}><Icon name="shield" size={18} /><ThemedText type="small" style={{ flex: 1 }} themeColor="textSecondary">Choose both places to see bundled journey guidance.</ThemedText></View>}
        </View>
      </View>
      <View style={styles.map}><IllustratedMap expanded={!desktop} /><ThemedText type="small" themeColor="textSecondary">Illustrated city preview. The mobile app includes an interactive map and optional GPS. Bundled text guidance stays available offline.</ThemedText></View>
    </View>
  </Page>;
}
const styles = StyleSheet.create({ layout: { gap: 24 }, wide: { flexDirection: 'row', alignItems: 'flex-start' }, planner: { gap: 20 }, results: { gap: 16 }, map: { flex: 1, minWidth: 0, gap: 8 } });
