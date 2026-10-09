import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button, Card, Icon, ui } from '@/components/commute/ui';
import { pilotDataset } from '@/database/data/pilot-dataset';
import { getForegroundLocation } from '@/features/location/services/location-service';
import type { LocationFix } from '@/features/location/types';
import { JourneyOptions } from '@/features/transport/components/JourneyOptions';
import { formatDistance, planJourney, PLANNER_PLACES } from '@/features/transport/planner/journey-planner';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useTheme } from '@/hooks/use-theme';
import { journeyScene, nearestPlace } from '../services/journey-scene';
import { withUserLocation } from '../services/map-scene';
import type { MapMarker } from '../types';
import { ChoicePicker } from './ChoicePicker';
import { TransportMap } from './TransportMap';

/** Places farther than this from every supported landmark aren't used to pick a starting point. */
const NEAREST_LANDMARK_LIMIT_M = 1500;

export function JourneyMap() {
  const theme = useTheme();
  const { tablet, desktop, gutter } = useResponsiveLayout();
  const params = useLocalSearchParams<{ originId?: string; destinationId?: string; originRequest?: string }>();
  const [originId, setOriginId] = useState(params.originId ?? '');
  const [destinationId, setDestinationId] = useState(params.destinationId ?? '');
  const [selected, setSelected] = useState(0);
  const [fix, setFix] = useState<LocationFix | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('GPS is optional. You can choose your starting landmark yourself.');
  const [marker, setMarker] = useState<MapMarker | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [focusMode, setFocusMode] = useState<'journey' | 'user'>('journey');
  const locationRequest = useRef<AbortController | null>(null);

  // A new navigation request (camera, home planner, landmark guide) replaces the current selection.
  const requestKey = `${params.originId ?? ''}|${params.destinationId ?? ''}|${params.originRequest ?? ''}`;
  const [syncedRequest, setSyncedRequest] = useState(requestKey);
  if (syncedRequest !== requestKey) {
    setSyncedRequest(requestKey);
    setOriginId(params.originId ?? '');
    setDestinationId(params.destinationId ?? '');
    setSelected(0);
    setMarker(null);
    setFocusMode('journey');
    setFocusRequest((value) => value + 1);
  }
  useEffect(() => () => locationRequest.current?.abort(), []);

  const plan = originId && destinationId ? planJourney(originId, destinationId) : null;
  const option = plan?.status === 'planned' ? plan.options[Math.min(selected, plan.options.length - 1)] : undefined;
  const scene = useMemo(() => withUserLocation(journeyScene(plan, option), fix), [plan, option, fix]);
  const refocus = () => { setFocusMode('journey'); setFocusRequest((value) => value + 1); };
  const choose = (setter: (id: string) => void) => (id: string) => { setter(id); setSelected(0); setMarker(null); refocus(); };
  const locate = async () => {
    locationRequest.current?.abort();
    const request = new AbortController();
    locationRequest.current = request;
    setLocating(true);
    setLocationMessage('Finding your position…');
    const location = await getForegroundLocation(request.signal);
    if (locationRequest.current !== request) return;
    setLocating(false);
    if (location.status === 'ready' || location.status === 'inaccurate') {
      setFix(location.fix);
      const nearest = nearestPlace(PLANNER_PLACES, location.fix.coordinates.latitude, location.fix.coordinates.longitude);
      if (nearest && nearest.meters <= NEAREST_LANDMARK_LIMIT_M) {
        choose(setOriginId)(nearest.place.id);
        setLocationMessage(`Nearest supported landmark: ${nearest.place.name}, about ${formatDistance(nearest.meters)} away (straight line).`);
      } else {
        setFocusMode('user'); setFocusRequest((value) => value + 1);
        setLocationMessage('You are not near a supported Makati landmark. Choose your starting point yourself.');
      }
    } else setLocationMessage(location.status === 'denied'
      ? 'Location permission is off. Choose your starting landmark yourself.'
      : location.status === 'services-disabled' ? 'Location services are off. Choose your starting landmark yourself.'
      : location.status === 'timeout' ? 'GPS timed out. Try outdoors or choose your starting landmark yourself.'
      : 'GPS unavailable. Choose your starting landmark yourself.');
  };

  // A plain element, not a nested component: a component declared here would remount the native map on every render.
  const mapView = <View style={{ gap: 10 }}>
      <View style={[styles.map, { height: tablet ? 480 : 320, borderColor: theme.line }]}>
        <TransportMap scene={scene} focusMode={focusMode} focusRequest={focusRequest} onMarkerPress={setMarker} selectedMarkerId={marker?.id} />
      </View>
      <View style={styles.legend}>{[[theme.green, 'Start'], [theme.teal, 'Board / get off'], [theme.orange, 'Destination'], [theme.gold, 'You']].map(([color, label]) =>
        <View key={label} style={ui.row}><View style={[styles.dot, { backgroundColor: color }]} /><ThemedText type="small">{label}</ThemedText></View>)}</View>
      {marker && <Card style={{ gap: 6 }}>
        <ThemedText type="smallBold">{marker.name}</ThemedText>
        {marker.routeNames?.map((name) => <ThemedText type="small" key={name}>{name}</ThemedText>)}
        {marker.details?.map((text) => <ThemedText type="small" themeColor="textSecondary" key={text}>{text}</ThemedText>)}
        <Button secondary icon="close" onPress={() => setMarker(null)}>Close</Button>
      </Card>}
    </View>;

  return <ThemedView style={styles.page}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}>
      <View style={{ gap: 6 }}>
        <ThemedText type="subtitle" accessibilityRole="header">Your next ride</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">Pick two Makati landmarks. We’ll show the jeepney, bus or walk that gets you there.</ThemedText>
      </View>
      <View style={[styles.body, desktop && { flexDirection: 'row', alignItems: 'flex-start' }]}>
        <View style={[{ gap: 16 }, desktop && { width: 400 }]}>
          <Card style={{ gap: 0, paddingVertical: 8 }}>
            <ChoicePicker label="Starting point" value={originId} choices={pilotDataset.landmarks} onSelect={choose(setOriginId)} />
            <ChoicePicker label="Destination" value={destinationId} choices={pilotDataset.destinations} onSelect={choose(setDestinationId)} />
            <View style={[ui.row, { flexWrap: 'wrap', paddingTop: 12 }]}>
              <View style={{ flex: 1, minWidth: 140 }}><Button icon="pin" secondary disabled={locating} onPress={() => void locate()}>{locating ? 'Finding GPS…' : 'Use my location'}</Button></View>
              <View style={{ flex: 1, minWidth: 140 }}><Button icon="swap" secondary disabled={!originId && !destinationId} onPress={() => { setOriginId(destinationId); setDestinationId(originId); setSelected(0); refocus(); }}>Swap</Button></View>
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={{ paddingTop: 10 }}>{locationMessage}</ThemedText>
          </Card>
          {!desktop && mapView}
          {plan ? <JourneyOptions plan={plan} selected={selected} onSelect={(index) => { setSelected(index); setMarker(null); refocus(); }} />
            : <View style={ui.row}><Icon name="shield" size={18} /><ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>Choose both places to see how to get there.</ThemedText></View>}
        </View>
        {desktop && <View style={{ flex: 1 }}>{mapView}</View>}
      </View>
    </ScrollView>
  </ThemedView>;
}

const styles = StyleSheet.create({
  page: { flex: 1 }, content: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingTop: 24, paddingBottom: 32, gap: 20 },
  body: { gap: 20 }, map: { borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, dot: { width: 10, height: 10, borderRadius: 5 },
});
