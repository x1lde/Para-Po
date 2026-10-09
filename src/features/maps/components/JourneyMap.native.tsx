import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { BoardingOption, Destination, Landmark, TransportLookupResult } from '@/features/transport/types';
import { getForegroundLocation } from '@/features/location/services/location-service';
import { rankBoardingOptions } from '@/features/location/services/proximity';
import type { LocationFix } from '@/features/location/types';
import { MAP_PLACE_REFERENCES, BUNDLED_ROUTE_GEOMETRIES } from '../data/map-references';
import { buildMapScene, withUserLocation } from '../services/map-scene';
import type { MapMarker, MapScene } from '../types';
import { ChoicePicker } from './ChoicePicker';
import { TransportMap } from './TransportMap';
import { loadMapJourney } from './journey-loader';
import { useMapJourney } from './journey-context';
import { chooseBoardingOption, findJourneyOption, selectJourneyDestination, selectJourneyOrigin } from './journey-selection';
import { router } from 'expo-router';

export function JourneyMap() {
  const { journey, setJourney } = useMapJourney();
  const [origins, setOrigins] = useState<Landmark[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [result, setResult] = useState<TransportLookupResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fix, setFix] = useState<LocationFix | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('GPS is optional. You can select your starting landmark manually.');
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const [focusMode, setFocusMode] = useState<'journey' | 'user'>('journey');
  const selectionSequence = useRef(0);
  const locationSequence = useRef(0);
  const locationRequest = useRef<AbortController | null>(null);
  const loadJourney = useCallback(async (origin: string, requestedDestination = '') => {
    const sequence = ++selectionSequence.current;
    setLoading(true); setError(false); setResult(null); setOriginId(origin); setDestinationId(requestedDestination); setFocusMode('journey');
    try {
      const next = await loadMapJourney({ originId: origin, destinationId: requestedDestination });
      if (selectionSequence.current !== sequence) return;
      setOrigins(next.landmarks); setDestinations(next.destinations); setDestinationId(next.destinationId); setResult(next.result);
      setFocusRequest((value) => value + 1);
    } catch { if (selectionSequence.current === sequence) setError(true); }
    finally { if (selectionSequence.current === sequence) setLoading(false); }
  }, []);
  const requestedOriginId = journey?.originId ?? '';
  const requestedDestinationId = journey?.destinationId ?? '';
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void loadJourney(requestedOriginId, requestedDestinationId); });
    return () => { active = false; selectionSequence.current += 1; };
  }, [loadJourney, requestedOriginId, requestedDestinationId]);
  useEffect(() => () => { locationSequence.current += 1; locationRequest.current?.abort(); }, []);
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
  const options = result && 'options' in result ? result.options : [];
  const selectedOption = findJourneyOption(options, journey);
  const selectedRouteId = selectedOption?.route.id;
  const selectedBoardingId = selectedOption?.boardingPoint.id ?? null;
  const selectionUnavailable = !loading && !error && Boolean(journey?.routeId && !selectedOption);
  const fullScene = useMemo(() => result ? buildMapScene(result, BUNDLED_ROUTE_GEOMETRIES, MAP_PLACE_REFERENCES)
    : { markers: [], routes: [], omittedLocations: [] } as MapScene, [result]);
  const scene = useMemo(() => {
    const mapResult = result && 'options' in result && selectedRouteId
      ? { ...result, options: result.options.filter((option) => option.route.id === selectedRouteId && option.boardingPoint.id === selectedBoardingId) }
      : result;
    const base = mapResult ? buildMapScene(mapResult, BUNDLED_ROUTE_GEOMETRIES, MAP_PLACE_REFERENCES) : fullScene;
    return withUserLocation(base, fix);
  }, [result, fullScene, fix, selectedRouteId, selectedBoardingId]);
  const ranked = rankBoardingOptions(options, fix);
  const boardingPoints = [...new Map(ranked.map((item) => [item.option.boardingPoint.id, item.option.boardingPoint])).values()];
  const selectOption = (option: BoardingOption) => {
    setJourney((current) => current?.originId === originId && current.destinationId === destinationId &&
      current.routeId === option.route.id && current.boardingPointId === option.boardingPoint.id ? current : {
        originId, destinationId, routeId: option.route.id, boardingPointId: option.boardingPoint.id,
      });
  };
  const selectMarker = (marker: MapMarker) => {
    setSelectedMarker(marker);
    const eligible = marker.kind === 'boarding' ? chooseBoardingOption(options, marker.id.slice('boarding:'.length), selectedRouteId) : undefined;
    if (eligible) selectOption(eligible);
  };
  const activeMarker = scene.markers.find((marker) => marker.id === selectedMarker?.id);
  return <ThemedView style={styles.page}>
    <SafeAreaView edges={['top']} style={styles.header}><ThemedText type="subtitle">Plan your journey</ThemedText>
      <ThemedText type="small">Offline guidance · Online map</ThemedText>
      <View style={styles.row}><View style={styles.choice}><ChoicePicker label="Starting landmark" value={originId} choices={origins}
        onSelect={(id) => setJourney((current) => selectJourneyOrigin(current, id))} /></View>
      <View style={styles.choice}><ChoicePicker label="Destination" value={destinationId} choices={destinations} disabled={loading}
        onSelect={(id) => setJourney((current) => selectJourneyDestination(current, id))} /></View></View>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" disabled={locating} accessibilityState={{ disabled: locating }} style={styles.button} onPress={() => void locate()}>
          <ThemedText type="link">{locating ? 'Finding GPS...' : hasRequestedLocation ? 'Refresh GPS' : 'Use GPS'}</ThemedText></Pressable>
        {locating && <Pressable accessibilityRole="button" style={styles.button} onPress={() => {
          locationSequence.current += 1; locationRequest.current?.abort(); setLocating(false);
          setLocationMessage('GPS cancelled. Continue with manual landmark selection.');
        }}><ThemedText type="link">Cancel GPS</ThemedText></Pressable>}
        <Pressable accessibilityRole="button" disabled={!result} accessibilityState={{ disabled: !result }} style={styles.button}
          onPress={() => { setFocusMode('journey'); setFocusRequest((value) => value + 1); }}><ThemedText type="link">Show this journey</ThemedText></Pressable>
      </View><ThemedText type="small">{locationMessage}</ThemedText>
      <Pressable accessibilityRole="button" style={styles.button} onPress={() => router.navigate('/')}>
        <ThemedText type="link">Back to Ride</ThemedText>
      </Pressable>
    </SafeAreaView>
    <View style={styles.map}><TransportMap scene={scene} focusMode={focusMode} focusRequest={focusRequest} onMarkerPress={selectMarker}
      selectedMarkerId={activeMarker?.id ?? (selectedBoardingId ? `boarding:${selectedBoardingId}` : undefined)} selectedRouteId={selectedRouteId} /></View>
    <ScrollView style={styles.guidance} contentContainerStyle={styles.content}>
      <View style={styles.legend}>
        {[['#32854b', 'Start'], ['#208AEF', 'Board'], ['#d33d46', 'Destination'], ['#7856c4', 'GPS']].map(([color, label]) =>
          <View key={label} style={styles.legendItem}><View style={[styles.dot, { backgroundColor: color }]} /><ThemedText type="small">{label}</ThemedText></View>)}
      </View>
      {fix?.accuracyMeters !== null && fix?.accuracyMeters !== undefined && <ThemedText type="small">Purple area: reported GPS uncertainty, about {Math.round(fix.accuracyMeters)} m. It is not a walking radius.</ThemedText>}
      {loading && <ActivityIndicator accessibilityLabel="Loading journey" />}
      {error && <><ThemedText>Could not load local transportation data.</ThemedText><Pressable accessibilityRole="button" style={styles.button}
        onPress={() => void loadJourney(originId, destinationId)}><ThemedText type="link">Retry data</ThemedText></Pressable></>}
      {!loading && !error && destinations.length === 0 && <ThemedText>No destinations are available in the local catalog.</ThemedText>}
      {!loading && !error && (!originId || !destinationId) && <ThemedText>Choose a starting landmark and destination here, or select a ride on Ride to open its map. No journey is selected yet.</ThemedText>}
      {selectionUnavailable && <ThemedText accessibilityLiveRegion="polite">The previously selected ride is no longer available for this journey. Review the current options below.</ThemedText>}
      {activeMarker && <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{activeMarker.name}{activeMarker.approximate ? ' (approximate)' : ''}</ThemedText>
        {activeMarker.details?.map((text) => <ThemedText type="small" key={text}>{text}</ThemedText>)}
        {activeMarker.routeNames?.map((name) => <ThemedText type="small" key={name}>{name}</ThemedText>)}
        {activeMarker.sourceReference && <ThemedText type="small" selectable>{activeMarker.sourceReference}</ThemedText>}
        <Pressable accessibilityRole="button" onPress={() => setSelectedMarker(null)} style={styles.button}><ThemedText type="link">Close details</ThemedText></Pressable>
      </ThemedView>}
      {boardingPoints.length > 0 && <>
        <ThemedText type="smallBold">Where to board</ThemedText>
        <ThemedText type="small">Stops serving this destination. Tap a stop to highlight its guidance.</ThemedText>
        {boardingPoints.map((point) => {
          const marker = fullScene.markers.find((item) => item.id === `boarding:${point.id}`);
          const matching = ranked.filter((item) => item.option.boardingPoint.id === point.id);
          const distance = matching.find((item) => item.distanceMeters !== null)?.distanceMeters;
          return <Pressable key={point.id} accessibilityRole="button" accessibilityState={{ selected: selectedBoardingId === point.id }}
            style={[styles.stop, selectedBoardingId === point.id && styles.selected]} onPress={() => {
              const option = chooseBoardingOption(options, point.id, selectedRouteId);
              if (option) selectOption(option);
              setSelectedMarker(marker ?? null);
            }}>
            <ThemedText type="smallBold">{point.name}</ThemedText>
            <ThemedText type="small">{[...new Set(matching.map((item) => item.option.route.name))].join(' · ')}</ThemedText>
            <ThemedText type="small">{distance === undefined || distance === null ? 'Distance unavailable' : `${Math.round(distance)} m straight-line from GPS`}</ThemedText>
            {marker && !scene.markers.some((item) => item.id === marker.id) && <ThemedText type="small">Position recorded. Select this stop to show it on the map.</ThemedText>}
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
      {ranked.map(({ option, distanceMeters }, index) => <ThemedView type="backgroundElement" style={[styles.card, selectedBoardingId === option.boardingPoint.id && styles.selected]} key={`${option.route.id}:${option.boardingPoint.id}`}>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: selectedRouteId === option.route.id }} style={styles.button} onPress={() => {
          selectOption(option);
          setSelectedMarker(fullScene.markers.find((marker) => marker.id === `boarding:${option.boardingPoint.id}`) ?? null);
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
    </ScrollView>
  </ThemedView>;
}

const styles = StyleSheet.create({
  page: { flex: 1 }, header: { padding: 12, gap: 6 }, row: { flexDirection: 'row', flexWrap: 'wrap' },
  choice: { flex: 1, minWidth: 130 }, button: { minHeight: 48, padding: 12, justifyContent: 'center' },
  map: { flex: 1, minHeight: 180 }, guidance: { maxHeight: '40%' }, content: { padding: 16, gap: 12 },
  card: { padding: 14, borderRadius: 12, gap: 6, borderWidth: 2, borderColor: 'transparent' },
  stop: { minHeight: 48, padding: 14, gap: 6, borderRadius: 12, borderWidth: 2, borderColor: '#808080' },
  selected: { borderColor: '#e58a00' }, legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 }, dot: { width: 10, height: 10, borderRadius: 5 },
});
