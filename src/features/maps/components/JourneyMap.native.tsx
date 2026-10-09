import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BodyText, Button, Card, typography, useAppColors } from '@/components/commuter-ui';
import type { BoardingOption, Destination, Landmark, TransportLookupResult } from '@/features/transport/types';
import { getForegroundLocation } from '@/features/location/services/location-service';
import { rankBoardingOptions } from '@/features/location/services/proximity';
import type { LocationFix } from '@/features/location/types';
import { Radius, Space } from '@/constants/theme';
import { MAP_PLACE_REFERENCES, BUNDLED_ROUTE_GEOMETRIES } from '../data/map-references';
import { buildMapScene, withUserLocation } from '../services/map-scene';
import type { MapMarker, MapScene } from '../types';
import { ChoicePicker } from './ChoicePicker';
import { TransportMap } from './TransportMap';
import { loadMapJourney } from './journey-loader';
import { useMapJourney } from './journey-context';
import { chooseBoardingOption, findJourneyOption, selectJourneyDestination, selectJourneyOrigin } from './journey-selection';

export function JourneyMap() {
  const { journey, setJourney } = useMapJourney();
  const colors = useAppColors();
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
  const muted = { color: colors.textSecondary };
  const legend: [string, string][] = [
    [colors.success, 'Start'],
    [colors.primary, 'Board'],
    [colors.danger, 'Destination'],
    [colors.gps, 'GPS'],
  ];
  return <View style={[styles.page, { backgroundColor: colors.background }]}>
    <SafeAreaView edges={['top']} style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={styles.eyebrowRow}>
        <View style={[styles.eyebrowDot, { backgroundColor: colors.primary }]} />
        <Text style={[typography.kicker, { color: colors.plum }]}>Offline guidance · Online map</Text>
      </View>
      <Text accessibilityRole="header" style={[typography.pageTitle, { color: colors.text }]}>Plan your journey</Text>
      <View style={styles.row}>
        <View style={styles.choice}><ChoicePicker label="Starting landmark" value={originId} choices={origins}
          onSelect={(id) => setJourney((current) => selectJourneyOrigin(current, id))} /></View>
        <View style={styles.choice}><ChoicePicker label="Destination" value={destinationId} choices={destinations} disabled={loading}
          onSelect={(id) => setJourney((current) => selectJourneyDestination(current, id))} /></View>
      </View>
      <View style={styles.row}>
        <Button label={locating ? 'Finding GPS...' : hasRequestedLocation ? 'Refresh GPS' : 'Use GPS'} variant="outline" icon="location" disabled={locating} onPress={() => void locate()} />
        {locating && <Button label="Cancel GPS" variant="ghost" onPress={() => {
          locationSequence.current += 1; locationRequest.current?.abort(); setLocating(false);
          setLocationMessage('GPS cancelled. Continue with manual landmark selection.');
        }} />}
        <Button label="Show this journey" variant="outline" icon="map" disabled={!result}
          onPress={() => { setFocusMode('journey'); setFocusRequest((value) => value + 1); }} />
      </View>
      <Text accessibilityLiveRegion="polite" style={[typography.small, { color: colors.textSecondary }]}>{locationMessage}</Text>
      <Button label="Back to Ride" variant="ghost" icon="arrowLeft" onPress={() => router.navigate('/')} />
    </SafeAreaView>
    <View style={styles.map}><TransportMap scene={scene} focusMode={focusMode} focusRequest={focusRequest} onMarkerPress={selectMarker}
      selectedMarkerId={activeMarker?.id ?? (selectedBoardingId ? `boarding:${selectedBoardingId}` : undefined)} selectedRouteId={selectedRouteId} /></View>
    <ScrollView style={styles.guidance} contentContainerStyle={styles.content}>
      <View style={styles.legend}>
        {legend.map(([color, label]) =>
          <View key={label} style={[styles.legendItem, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[typography.small, { color: colors.text }]}>{label}</Text>
          </View>)}
      </View>
      {fix?.accuracyMeters !== null && fix?.accuracyMeters !== undefined && <Text style={[typography.small, { color: colors.textSecondary }]}>Purple area: reported GPS uncertainty, about {Math.round(fix.accuracyMeters)} m. It is not a walking radius.</Text>}
      {loading && <ActivityIndicator accessibilityLabel="Loading journey" color={colors.primary} />}
      {error && <Card>
        <BodyText>Could not load local transportation data.</BodyText>
        <View style={styles.actionRow}><Button label="Retry data" variant="outline" icon="refresh" onPress={() => void loadJourney(originId, destinationId)} /></View>
      </Card>}
      {!loading && !error && destinations.length === 0 && <Card><BodyText>No destinations are available in the local catalog.</BodyText></Card>}
      {!loading && !error && (!originId || !destinationId) && <Card>
        <BodyText>Choose a starting landmark and destination here, or select a ride on Ride to open its map. No journey is selected yet.</BodyText>
        <Button label="Back to Ride" variant="outline" icon="arrowLeft" onPress={() => router.navigate('/')} />
      </Card>}
      {selectionUnavailable && <Text accessibilityLiveRegion="polite" style={[typography.small, { color: colors.gold }]}>The previously selected ride is no longer available for this journey. Review the current options below.</Text>}
      {activeMarker && <Card>
        <Text style={[typography.heading, { color: colors.text }]}>{activeMarker.name}{activeMarker.approximate ? ' (approximate)' : ''}</Text>
        {activeMarker.details?.map((text) => <Text key={text} style={[typography.small, muted]}>{text}</Text>)}
        {activeMarker.routeNames?.map((name) => <Text key={name} style={[typography.small, muted]}>{name}</Text>)}
        {activeMarker.sourceReference && <Text style={[typography.small, muted]} selectable>{activeMarker.sourceReference}</Text>}
        <Button label="Close details" variant="ghost" onPress={() => setSelectedMarker(null)} />
      </Card>}
      {boardingPoints.length > 0 && <>
        <Text style={[typography.label, { color: colors.text }]}>Where to board</Text>
        <Text style={[typography.small, muted]}>Stops serving this destination. Tap a stop to highlight its guidance.</Text>
        {boardingPoints.map((point) => {
          const marker = fullScene.markers.find((item) => item.id === `boarding:${point.id}`);
          const matching = ranked.filter((item) => item.option.boardingPoint.id === point.id);
          const distance = matching.find((item) => item.distanceMeters !== null)?.distanceMeters;
          const selected = selectedBoardingId === point.id;
          return <Pressable key={point.id} accessibilityRole="button" accessibilityState={{ selected }}
            style={({ pressed }) => [styles.stop, { backgroundColor: colors.surfaceRaised, borderColor: selected ? colors.gold : colors.border }, pressed ? styles.pressed : null]} onPress={() => {
              const option = chooseBoardingOption(options, point.id, selectedRouteId);
              if (option) selectOption(option);
              setSelectedMarker(marker ?? null);
            }}>
            <Text style={[typography.label, { color: colors.text }]}>{point.name}</Text>
            <Text style={[typography.small, muted]}>{[...new Set(matching.map((item) => item.option.route.name))].join(' · ')}</Text>
            <Text style={[typography.small, muted]}>{distance === undefined || distance === null ? 'Distance unavailable' : `${Math.round(distance)} m straight-line from GPS`}</Text>
            {marker && !scene.markers.some((item) => item.id === marker.id) && <Text style={[typography.small, muted]}>Position recorded. Select this stop to show it on the map.</Text>}
            {!marker && <Text style={[typography.small, muted]}>Confirmed map position unavailable. Use the boarding instructions below.</Text>}
          </Pressable>;
        })}
      </>}
      {result?.status === 'source-based' && <Text style={[typography.label, { color: colors.text }]}>Web-sourced recommendation</Text>}
      {result?.status === 'available' && <Text style={[typography.label, { color: colors.text }]}>Transportation recommendation</Text>}
      {result?.status === 'already-at-destination' && <Text style={[typography.small, muted]}>You selected the same starting place and destination.</Text>}
      {result?.status === 'no-routes' && <Text style={[typography.small, muted]}>No bundled route covers this combination.</Text>}
      {result?.status === 'incomplete-guidance' && <Text style={[typography.small, muted]}>Guidance is incomplete; these options need further review.</Text>}
      {(result?.status === 'unsupported-origin' || result?.status === 'unsupported-destination') && <Text style={[typography.small, muted]}>Select a supported location.</Text>}
      {ranked.map(({ option, distanceMeters }, index) => <Card key={`${option.route.id}:${option.boardingPoint.id}`} style={selectedBoardingId === option.boardingPoint.id ? { borderColor: colors.gold, borderWidth: 2 } : undefined}>
        <Button label={selectedRouteId === option.route.id ? 'Selected option' : 'Select this option'} variant="ghost" onPress={() => {
          selectOption(option);
          setSelectedMarker(fullScene.markers.find((marker) => marker.id === `boarding:${option.boardingPoint.id}`) ?? null);
        }} />
        <Text style={[typography.label, { color: colors.text }]}>{option.route.name}</Text>
        <Text style={[typography.small, muted]}>Vehicle: {option.route.transportationType}</Text>
        <Text style={[typography.small, muted]}>{option.originWalkingInstructions ?? 'Exact access to the boarding point is not recorded.'}</Text>
        <Text style={[typography.small, muted]}>Board: {option.boardingPoint.name}</Text>
        <Text style={[typography.small, muted]}>{option.boardingInstructions}</Text>
        <Text style={[typography.small, muted]}>Get off: {option.route.alightingLocation ?? 'Not recorded'}</Text>
        {option.route.alightingInstructions && <Text style={[typography.small, muted]}>{option.route.alightingInstructions}</Text>}
        <Text style={[typography.small, muted]}>{option.route.destinationWalkingInstructions ?? 'Exact remaining access is not recorded.'}</Text>
        <Text style={[typography.small, muted]}>{distanceMeters === null ? 'Boarding distance unavailable.' : `${index === 0 ? 'Nearest eligible point: ' : ''}${Math.round(distanceMeters)} m from GPS position, straight-line; not walking distance.`}</Text>
        <Text style={[typography.small, muted]}>{option.route.limitations}</Text>
        <Text style={[typography.small, muted]} selectable>Reviewed {option.route.reviewedOn}: {option.route.sourceReference}</Text>
      </Card>)}
      {result && <Text style={[typography.small, muted]}>Landmark pins are site references, not boarding stops. {scene.omittedLocations.length > 0 ? 'Some locations have no confirmed map position. ' : ''}{scene.routes.length === 0 ? 'A sourced vehicle path is not available yet.' : 'Vehicle paths use the recorded source geometry.'}</Text>}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: Space.four, paddingVertical: Space.three, gap: Space.three, borderBottomWidth: 1 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: Space.two },
  eyebrowDot: { width: 8, height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.two },
  choice: { flex: 1, minWidth: 130 },
  map: { flex: 1, minHeight: 180 },
  guidance: { maxHeight: '40%' },
  content: { padding: Space.four, gap: Space.three },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.two },
  stop: { minHeight: 48, padding: Space.four, gap: Space.two, borderRadius: Radius.medium, borderWidth: 2 },
  pressed: { opacity: 0.76 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.three },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Space.two, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Space.three, minHeight: 40 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
