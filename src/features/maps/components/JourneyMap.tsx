import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { MakatiMap } from '@/components/commute/makati-map';
import { Button, Card, Icon, Intro, Page, ui } from '@/components/commute/ui';
import { pilotDataset } from '@/database/data/pilot-dataset';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { JourneyOptions } from '@/features/transport/components/JourneyOptions';
import { planJourney } from '@/features/transport/planner/journey-planner';
import { ChoicePicker } from './ChoicePicker';

/** Journey guidance is bundled and immediate; the interactive map is native-only. */
export function JourneyMap() {
  const params = useLocalSearchParams<{ originId?: string; destinationId?: string; originRequest?: string }>();
  const [originId, setOriginId] = useState(params.originId ?? '');
  const [destinationId, setDestinationId] = useState(params.destinationId ?? '');
  const { tablet, desktop } = useResponsiveLayout();
  const requestKey = `${params.originId ?? ''}|${params.destinationId ?? ''}|${params.originRequest ?? ''}`;
  const [syncedRequest, setSyncedRequest] = useState(requestKey);
  if (syncedRequest !== requestKey) {
    setSyncedRequest(requestKey);
    setOriginId(params.originId ?? '');
    setDestinationId(params.destinationId ?? '');
  }
  return <Page>
    <Intro eyebrow="A little direction goes a long way" title="Your next ride." description="Choose your landmarks. We’ll help with the next step." />
    <View style={[styles.layout, tablet && styles.wide]}>
      <View style={[styles.planner, tablet && { width: desktop ? 390 : 310 }]}>
        <Card>
          <View style={ui.row}><Icon name="compass" /><ThemedText type="smallBold">Plan your journey</ThemedText></View>
          <ChoicePicker label="Starting point" value={originId} choices={pilotDataset.landmarks} onSelect={setOriginId} />
          <ChoicePicker label="Destination" value={destinationId} choices={pilotDataset.destinations} onSelect={setDestinationId} />
          <Button icon="swap" secondary disabled={!originId && !destinationId} onPress={() => { setOriginId(destinationId); setDestinationId(originId); }}>Swap places</Button>
          <Button icon="camera" secondary onPress={() => router.navigate('/camera')}>Scan a landmark</Button>
        </Card>
        {originId && destinationId ? <JourneyOptions plan={planJourney(originId, destinationId)} />
          : <View style={ui.row}><Icon name="shield" size={18} /><ThemedText type="small" style={{ flex: 1 }} themeColor="textSecondary">Choose both places to see how to get there.</ThemedText></View>}
      </View>
      <View style={styles.map}><MakatiMap expanded={!desktop} /><ThemedText type="small" themeColor="textSecondary">Map of the supported landmarks. The mobile app draws each ride on the map. Journey guidance works offline.</ThemedText></View>
    </View>
  </Page>;
}
const styles = StyleSheet.create({ layout: { gap: 24 }, wide: { flexDirection: 'row', alignItems: 'flex-start' }, planner: { gap: 20 }, map: { flex: 1, minWidth: 0, gap: 8 } });
