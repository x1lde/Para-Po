import { useTheme } from '@/hooks/use-theme';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { listDestinationsForOrigin, listLandmarks } from '@/database/repositories/transport-repository';
import { lookupTransportation } from '@/features/transport/services/transport-service';
import type { Destination, Landmark, TransportLookupResult } from '@/features/transport/types';
import { getForegroundLocation } from '@/features/location/services/location-service';
import { rankBoardingOptions } from '@/features/location/services/proximity';
import type { LocationFix } from '@/features/location/types';
import { MAP_PLACE_REFERENCES, BUNDLED_ROUTE_GEOMETRIES } from '../data/map-references';
import { buildMapScene, withUserLocation } from '../services/map-scene';
import type { MapMarker, MapScene } from '../types';
import { ChoicePicker } from './ChoicePicker';
import { TransportMap } from './TransportMap';

export function JourneyMap() {
  const theme = useTheme();
  const { tablet, desktop, gutter } = useResponsiveLayout();
  const { originId: requestedOrigin, originRequest, destinationId: requestedDestination } = useLocalSearchParams<{ originId?: string | string[]; originRequest?: string; destinationId?: string }>();
  const cameraOrigin = typeof requestedOrigin === 'string' ? requestedOrigin : undefined;
  const [origins, setOrigins] = useState<Landmark[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [originId, setOriginId] = useState('ayala_malls_circuit');
  const [destinationId, setDestinationId] = useState('one_ayala');
  const [result, setResult] = useState<TransportLookupResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fix, setFix] = useState<LocationFix | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('GPS is optional. You can select your starting landmark manually.');
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [selectedBoardingId, setSelectedBoardingId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>();
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const [focusMode, setFocusMode] = useState<'journey' | 'user'>('journey');
  const selectionSequence = useRef(0);
  const locationSequence = useRef(0);
  const locationRequest = useRef<AbortController | null>(null);
  const loadJourney = useCallback(async (origin: string, requestedDestination = 'one_ayala') => {
    const sequence = ++selectionSequence.current;
    setLoading(true); setError(false); setResult(null); setSelectedMarker(null); setOriginId(origin); setFocusMode('journey');
    setSelectedBoardingId(null); setSelectedRouteId(undefined);
    try {
      const [catalog, choices] = await Promise.all([listLandmarks(), listDestinationsForOrigin(origin)]);
      const chosen = choices.some((item) => item.id === requestedDestination) ? requestedDestination : choices[0]?.id ?? '';
      const next = chosen ? await lookupTransportation(origin, chosen) : null;
      if (selectionSequence.current !== sequence) return;
      setOrigins(catalog); setDestinations(choices); setDestinationId(chosen); setResult(next);
      setFocusRequest((value) => value + 1);
    } catch { if (selectionSequence.current === sequence) setError(true); }
    finally { if (selectionSequence.current === sequence) setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void loadJourney(cameraOrigin ?? 'ayala_malls_circuit', requestedDestination ?? 'one_ayala'); });
    return () => { active = false; selectionSequence.current += 1; locationSequence.current += 1; locationRequest.current?.abort(); };
  }, [loadJourney, cameraOrigin, originRequest, requestedDestination]);
  useEffect(() => {
    if (!fix) return;
    const timer = setTimeout(() => {
      setFix(null); setSelectedMarker(null);
      setLocationMessage('Position expired. Refresh GPS or continue with manual selection.');
    }, Math.max(0, fix.timestamp + 120000 - Date.now()));
    return () => clearTimeout(timer);
  }, [fix]);
  const locate = async () => {
    const sequence = ++locationSequence.current;
    locationRequest.current?.abort();
    const request = new AbortController();
    locationRequest.current = request;
    setHasRequestedLocation(true);
    setLocating(true); setFix(null); setSelectedMarker(null); setLocationMessage('Finding your position...');
    const location = await getForegroundLocation(request.signal);
    if (locationSequence.current !== sequence) return;
    setLocating(false);
    if (location.status === 'ready' || location.status === 'inaccurate') {
      setFix(location.fix); setFocusMode('user'); setFocusRequest((value) => value + 1);
      setLocationMessage(location.status === 'ready'
        ? 'Device position shown. Distances, when available, are straight-line estimates.'
        : 'GPS is inaccurate. Position is approximate; boarding distances are not ranked.');
    } else setLocationMessage(location.status === 'denied' ? (location.canAskAgain
      ? 'Location permission denied. Manual selection still works.' : 'Location permission is disabled. Enable it in device settings or use manual selection.')
      : location.status === 'services-disabled' ? 'Location services are off. Manual selection still works.'
      : location.status === 'timeout' ? 'GPS timed out. Try outdoors or select a landmark manually.'
      : 'GPS unavailable. Manual selection still works.');
  };
  const scene = useMemo(() => {
    const base: MapScene = result ? buildMapScene(result, BUNDLED_ROUTE_GEOMETRIES, MAP_PLACE_REFERENCES)
      : { markers: [], routes: [], omittedLocations: [] };
    return withUserLocation(base, fix);
  }, [result, fix]);
  const options = result && 'options' in result ? result.options : [];
  const ranked = rankBoardingOptions(options, fix);
  const boardingPoints = [...new Map(ranked.map((item) => [item.option.boardingPoint.id, item.option.boardingPoint])).values()];
  const selectMarker = (marker: MapMarker) => {
    setSelectedMarker(marker);
    const eligible = marker.kind === 'boarding' ? options.find((option) => `boarding:${option.boardingPoint.id}` === marker.id) : undefined;
    setSelectedBoardingId(eligible?.boardingPoint.id ?? null);
    setSelectedRouteId(eligible?.route.id);
  };
  const activeMarker = scene.markers.find((marker) => marker.id === selectedMarker?.id);
  return <ThemedView style={styles.page}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.pageContent, { paddingHorizontal: gutter }]}>
    <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderColor: theme.line }]}><ThemedText type="subtitle">Plan your journey</ThemedText>
      <ThemedText type="small">Your starting point. Your next ride.</ThemedText>
      <View style={[styles.row, !tablet && { flexDirection: 'column' }]}><View style={styles.choice}><ChoicePicker label="Starting landmark" value={originId} choices={origins}
        onSelect={(id) => void loadJourney(id)} /></View>
      <View style={styles.choice}><ChoicePicker label="Destination" value={destinationId} choices={destinations} disabled={loading}
        onSelect={(id) => void loadJourney(originId, id)} /></View></View>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" disabled={locating} accessibilityState={{ disabled: locating }} style={({ pressed }) => [styles.button, { backgroundColor: theme.backgroundSelected, opacity: pressed ? .65 : 1 }]} onPress={() => void locate()}>
          <ThemedText type="link">{locating ? 'Finding GPS...' : hasRequestedLocation ? 'Refresh GPS' : 'Use GPS'}</ThemedText></Pressable>
        {locating && <Pressable accessibilityRole="button" style={({ pressed }) => [styles.button, { backgroundColor: theme.backgroundSelected, opacity: pressed ? .65 : 1 }]} onPress={() => {
          locationSequence.current += 1; locationRequest.current?.abort(); setLocating(false);
          setLocationMessage('GPS cancelled. Continue with manual landmark selection.');
        }}><ThemedText type="link">Cancel GPS</ThemedText></Pressable>}
        <Pressable accessibilityRole="button" disabled={!result} accessibilityState={{ disabled: !result }} style={({ pressed }) => [styles.button, { backgroundColor: theme.backgroundSelected, opacity: pressed ? .65 : 1 }]}
          onPress={() => { setFocusMode('journey'); setFocusRequest((value) => value + 1); }}><ThemedText type="link">Show this journey</ThemedText></Pressable>
      </View><ThemedText type="small">{locationMessage}</ThemedText>
    </View>
    <View style={[styles.body, desktop && { flexDirection: 'row' }]}>
    <View style={[styles.map, { height: tablet ? 520 : 340, flex: desktop ? 1 : undefined }]}><TransportMap scene={scene} focusMode={focusMode} focusRequest={focusRequest} onMarkerPress={selectMarker}
      selectedMarkerId={selectedBoardingId ? `boarding:${selectedBoardingId}` : activeMarker?.id} selectedRouteId={selectedRouteId} /></View>
    <View style={[styles.content, desktop && { width: 390 }]}>
      <View style={styles.legend}>
        {[[theme.green, 'Start'], [theme.teal, 'Board'], [theme.orange, 'Destination'], [theme.gold, 'GPS']].map(([color, label]) =>
          <View key={label} style={styles.legendItem}><View style={[styles.dot, { backgroundColor: color }]} /><ThemedText type="small">{label}</ThemedText></View>)}
      </View>
      {fix?.accuracyMeters !== null && fix?.accuracyMeters !== undefined && <ThemedText type="small">Shaded area: reported GPS uncertainty, about {Math.round(fix.accuracyMeters)} m. It is not a walking radius.</ThemedText>}
      {loading && <ActivityIndicator accessibilityLabel="Loading journey" />}
      {error && <><ThemedText>Could not load local transportation data.</ThemedText><Pressable accessibilityRole="button" style={({ pressed }) => [styles.button, { backgroundColor: theme.backgroundSelected, opacity: pressed ? .65 : 1 }]}
        onPress={() => void loadJourney(originId, destinationId)}><ThemedText type="link">Retry data</ThemedText></Pressable></>}
      {!loading && !error && destinations.length === 0 && <ThemedText>No bundled journeys for this starting landmark yet. Choose Circuit or One Ayala.</ThemedText>}
      {activeMarker && <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.line }]}>
        <ThemedText type="smallBold">{activeMarker.name}{activeMarker.approximate ? ' (approximate)' : ''}</ThemedText>
        {activeMarker.details?.map((text) => <ThemedText type="small" key={text}>{text}</ThemedText>)}
        {activeMarker.routeNames?.map((name) => <ThemedText type="small" key={name}>{name}</ThemedText>)}
        {activeMarker.sourceReference && <ThemedText type="small" selectable>{activeMarker.sourceReference}</ThemedText>}
        <Pressable accessibilityRole="button" onPress={() => { setSelectedMarker(null); setSelectedBoardingId(null); setSelectedRouteId(undefined); }} style={({ pressed }) => [styles.button, { backgroundColor: theme.backgroundSelected, opacity: pressed ? .65 : 1 }]}><ThemedText type="link">Close details</ThemedText></Pressable>
      </ThemedView>}
      {boardingPoints.length > 0 && <>
        <ThemedText type="smallBold">Where to board</ThemedText>
        <ThemedText type="small">Stops serving this destination. Tap a stop to highlight its guidance.</ThemedText>
        {boardingPoints.map((point) => {
          const marker = scene.markers.find((item) => item.id === `boarding:${point.id}`);
          const matching = ranked.filter((item) => item.option.boardingPoint.id === point.id);
          const distance = matching.find((item) => item.distanceMeters !== null)?.distanceMeters;
          return <Pressable key={point.id} accessibilityRole="button" accessibilityState={{ selected: selectedBoardingId === point.id }}
            style={[styles.stop, selectedBoardingId === point.id && styles.selected]} onPress={() => {
              setSelectedBoardingId(point.id); setSelectedRouteId(matching[0]?.option.route.id); setSelectedMarker(marker ?? null);
            }}>
            <ThemedText type="smallBold">{point.name}</ThemedText>
            <ThemedText type="small">{[...new Set(matching.map((item) => item.option.route.name))].join(' · ')}</ThemedText>
            <ThemedText type="small">{distance === undefined || distance === null ? 'Distance unavailable' : `${Math.round(distance)} m straight-line from GPS`}</ThemedText>
            {!marker && <ThemedText type="small">Confirmed map position unavailable. Use the boarding instructions below.</ThemedText>}
          </Pressable>;
        })}
      </>}
      {result?.status === 'source-based' && <ThemedText type="smallBold">Web-sourced recommendation</ThemedText>}
      {result?.status === 'available' && <ThemedText type="smallBold">Transportation recommendation</ThemedText>}
      {result?.status === 'already-at-destination' && <ThemedText>You selected the same starting place and destination.</ThemedText>}
      {result?.status === 'no-routes' && <ThemedText>No bundled route covers this combination.</ThemedText>}
      {result?.status === 'incomplete-guidance' && <ThemedText>Guidance is incomplete; these options need further review.</ThemedText>}
      {(result?.status === 'unsupported-origin' || result?.status === 'unsupported-destination') && <ThemedText>Select a supported location.</ThemedText>}
      {ranked.map(({ option, distanceMeters }, index) => <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.line }, selectedBoardingId === option.boardingPoint.id && styles.selected]} key={`${option.route.id}:${option.boardingPoint.id}`}>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: selectedRouteId === option.route.id }} style={({ pressed }) => [styles.button, { backgroundColor: theme.backgroundSelected, opacity: pressed ? .65 : 1 }]} onPress={() => {
          setSelectedBoardingId(option.boardingPoint.id); setSelectedRouteId(option.route.id);
          setSelectedMarker(scene.markers.find((marker) => marker.id === `boarding:${option.boardingPoint.id}`) ?? null);
        }}><ThemedText type="link">{selectedRouteId === option.route.id ? 'Selected option' : 'Select this option'}</ThemedText></Pressable>
        <ThemedText type="smallBold">{option.route.name}</ThemedText>
        <ThemedText type="small">Vehicle: {option.route.transportationType}</ThemedText>
        <ThemedText type="small">{option.originWalkingInstructions ?? 'Exact access to the boarding point is not recorded.'}</ThemedText>
        <ThemedText type="small">Board: {option.boardingPoint.name}</ThemedText>
        <ThemedText type="small">{option.boardingInstructions}</ThemedText>
        <ThemedText type="small">Get off: {option.route.alightingLocation ?? 'Not recorded'}</ThemedText>
        {option.route.alightingInstructions && <ThemedText type="small">{option.route.alightingInstructions}</ThemedText>}
        <ThemedText type="small">{option.route.destinationWalkingInstructions ?? 'Exact remaining access is not recorded.'}</ThemedText>
        <ThemedText type="small">{distanceMeters === null ? 'Boarding distance unavailable.' : `${index === 0 ? 'Nearest eligible point: ' : ''}${Math.round(distanceMeters)} m from GPS position, straight-line; not walking distance.`}</ThemedText>
        <ThemedText type="small">{option.route.limitations}</ThemedText>
        <ThemedText type="small" selectable>Reviewed {option.route.reviewedOn}: {option.route.sourceReference}</ThemedText>
      </ThemedView>)}
      {result && <ThemedText type="small">Landmark pins are site references, not boarding stops. {scene.omittedLocations.length > 0 ? 'Some locations have no confirmed map position. ' : ''}{scene.routes.length === 0 ? 'A sourced vehicle path is not available yet.' : 'Vehicle paths use the recorded source geometry.'}</ThemedText>}
    </View>
    </View>
    </ScrollView>
  </ThemedView>;
}

const styles = StyleSheet.create({
  page: { flex: 1 }, pageContent: { width: '100%', maxWidth: 1200, alignSelf: 'center', paddingTop: 20, paddingBottom: 28, gap: 20 }, body: { gap: 20 }, header: { padding: 20, gap: 12, borderWidth: 1, borderRadius: 20 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { flex: 1, minWidth: 130 }, button: { minHeight: 48, padding: 12, justifyContent: 'center', borderRadius: 12 },
  map: { minHeight: 300, borderRadius: 20, overflow: 'hidden' }, content: { gap: 12 },
  card: { padding: 23, borderRadius: 20, gap: 8, borderWidth: 1, borderColor: '#DDE5DF' },
  stop: { minHeight: 48, padding: 14, gap: 6, borderRadius: 12, borderWidth: 2, borderColor: '#808080' },
  selected: { borderColor: '#117C83' }, legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, dot: { width: 10, height: 10, borderRadius: 5 },
});
