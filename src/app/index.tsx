import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { AppIcon, BodyText, Card, Kicker, PrimaryButton, RouteField, ScreenFrame, VehiclePixelArt, typography, useAppColors } from '@/components/commuter-ui';
import { commuterDataAvailable, commuterDataUnavailableMessage, listDestinations, listLandmarks, lookupTransportation } from '@/features/transport/components/commuter-data';
import { filterOptionsByMode, getDestinationChoices, type RideModeFilter } from '@/features/transport/components/commuter-selection';
import type { BoardingOption, Destination, Landmark, TransportLookupResult, TransportationType } from '@/features/transport/types';
import { Radius, Space } from '@/constants/theme';
import { useMapJourney } from '@/features/maps/components/journey-context';
import { selectJourneyDestination, selectJourneyOrigin } from '@/features/maps/components/journey-selection';
import { ridePlannerMinWidth } from '@/features/transport/components/responsive-layout';
import { TransportMap } from '@/features/maps/components/TransportMap';
import { ScanLandmark } from '@/features/recognition/components/ScanLandmark';

type PickerKind = 'origin' | 'destination';
type ScreenState = 'planning' | 'options' | 'boarding';
type CatalogState = 'loading' | 'ready' | 'error';
type DestinationState = 'idle' | 'loading' | 'ready' | 'error';
type LookupState = 'idle' | 'loading' | 'ready' | 'error';
type Place = Landmark | Destination;

const modeFilters: { id: RideModeFilter; label: string }[] = [
  { id: 'all', label: 'All ride types' },
  { id: 'jeepney', label: 'Jeepney' },
  { id: 'e-jeep', label: 'E-jeep' },
  { id: 'tricycle', label: 'Tricycle' },
  { id: 'bus', label: 'Bus' },
];

export default function RideScreen() {
  const { journey, setJourney } = useMapJourney();
  const colors = useAppColors();
  const { width } = useWindowDimensions();
  const wide = width >= 1024;
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const [placeQuery, setPlaceQuery] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [scanFocused, setScanFocused] = useState(false);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [catalogState, setCatalogState] = useState<CatalogState>(commuterDataAvailable ? 'loading' : 'error');
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [origin, setOrigin] = useState<Landmark | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [destinationState, setDestinationState] = useState<DestinationState>(commuterDataAvailable ? 'loading' : 'error');
  const [destinationAttempt, setDestinationAttempt] = useState(0);
  const [screen, setScreen] = useState<ScreenState>('planning');
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [lookupResult, setLookupResult] = useState<TransportLookupResult | null>(null);
  const [lookupPair, setLookupPair] = useState<string | null>(null);
  const [selectedRide, setSelectedRide] = useState<BoardingOption | null>(null);
  const [modeFilter, setModeFilter] = useState<RideModeFilter>('all');
  const lookupRequest = useRef(0);
  const selectedOrigin = journey ? landmarks.find((place) => place.id === journey.originId) ?? null : origin;
  const selectedDestination = journey ? destinations.find((place) => place.id === journey.destinationId) ?? null : destination;
  const currentPair = `${selectedOrigin?.id ?? ''}\u0000${selectedDestination?.id ?? ''}`;
  const currentPairRef = useRef(currentPair);
  useEffect(() => { currentPairRef.current = currentPair; }, [currentPair]);
  const visibleScreen = screen !== 'planning' && lookupPair !== currentPair ? 'planning' : screen;

  useEffect(() => {
    if (!commuterDataAvailable) return;
    let active = true;
    listLandmarks().then((items) => {
      if (!active) return;
      setLandmarks(items);
      setCatalogState('ready');
    }).catch(() => {
      if (active) setCatalogState('error');
    });
    return () => { active = false; };
  }, [catalogAttempt]);

  useEffect(() => {
    let active = true;
    if (!commuterDataAvailable) return () => { active = false; };
    listDestinations().then((items) => {
      if (!active) return;
      setDestinations(items);
      setDestinationState('ready');
    }).catch(() => {
      if (active) setDestinationState('error');
    });
    return () => { active = false; };
  }, [destinationAttempt]);

  const clearPreviousRoute = () => {
    lookupRequest.current += 1;
    setLookupState('idle');
    setLookupResult(null);
    setLookupPair(null);
    setSelectedRide(null);
    setModeFilter('all');
    setScreen('planning');
  };

  const openMap = (option?: BoardingOption) => {
    setJourney(selectedOrigin && selectedDestination ? {
      originId: selectedOrigin.id, destinationId: selectedDestination.id,
      routeId: option?.route.id, boardingPointId: option?.boardingPoint.id,
    } : null);
    router.navigate('/map');
  };

  const openPicker = (kind: PickerKind) => {
    setPlaceQuery('');
    setPicker(kind);
  };

  const choosePlace = (place: Place) => {
    if (picker === 'origin') {
      const nextOrigin = place as Landmark;
      if (nextOrigin.id !== selectedOrigin?.id) {
        const nextDestination = selectedDestination?.id === nextOrigin.id ? null : selectedDestination;
        setOrigin(nextOrigin);
        setDestination(nextDestination);
        clearPreviousRoute();
        setJourney((current) => selectJourneyOrigin(current, nextOrigin.id));
      }
    } else if (picker === 'destination') {
      const nextDestination = place as Destination;
      if (nextDestination.id !== selectedDestination?.id) {
        setDestination(nextDestination);
        clearPreviousRoute();
        setJourney((current) => selectJourneyDestination(current, nextDestination.id));
      }
    }
    setPicker(null);
    setPlaceQuery('');
  };

  const findRide = async () => {
    if (!selectedOrigin || !selectedDestination || selectedDestination.id === selectedOrigin.id) return;
    setJourney({ originId: selectedOrigin.id, destinationId: selectedDestination.id });
    const requestId = ++lookupRequest.current;
    const requestedPair = `${selectedOrigin.id}\u0000${selectedDestination.id}`;
    setLookupPair(requestedPair);
    setLookupState('loading');
    setLookupResult(null);
    setSelectedRide(null);
    setModeFilter('all');
    setScreen('options');
    try {
      const result = await lookupTransportation(selectedOrigin.id, selectedDestination.id, true);
      if (requestId !== lookupRequest.current || requestedPair !== currentPairRef.current) return;
      setLookupResult(result);
      setLookupState('ready');
    } catch {
      if (requestId !== lookupRequest.current || requestedPair !== currentPairRef.current) return;
      setLookupState('error');
    }
  };

  const currentOptions = useMemo<BoardingOption[]>(() => {
    return lookupResult?.status === 'available' || lookupResult?.status === 'source-based'
      ? lookupResult.options
      : [];
  }, [lookupResult]);
  const visibleOptions = useMemo(
    () => filterOptionsByMode(currentOptions, modeFilter),
    [currentOptions, modeFilter]
  );
  const currentSelectedRide = journey
    ? currentOptions.find((option) => option.route.id === journey.routeId && option.boardingPoint.id === journey.boardingPointId) ?? null
    : selectedRide;

  return (
    <ScreenFrame>
      <View style={[styles.mainLayout, wide && visibleScreen === 'planning' ? styles.wideLayout : null]}>
        {visibleScreen === 'planning' ? (
          <View style={[styles.planner, { minWidth: ridePlannerMinWidth(width, Space.four * 2) }]}>
            <View style={styles.intro}>
              <Kicker>Makati commute guide</Kicker>
              <Text accessibilityRole="header" style={[typography.pageTitle, width < 360 ? styles.compactPageTitle : null, { color: colors.text }]}>Saan ka papunta?</Text>
              <BodyText>Piliin muna ang landmark na malapit sa iyo.</BodyText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scan a landmark or choose your starting point manually."
              onPress={() => setScanOpen(true)}
              onFocus={() => setScanFocused(true)}
              onBlur={() => setScanFocused(false)}
              style={({ pressed }) => [styles.scanCard, { backgroundColor: colors.primary, borderColor: colors.primary }, scanFocused ? { borderWidth: 3, borderColor: colors.gold } : null, pressed && styles.pressed]}>
              <View style={[styles.scanIcon, { backgroundColor: colors.primaryText }]}>
                <AppIcon name="camera" size={23} color={colors.primary} />
              </View>
              <View style={styles.scanCopy}>
                <Text style={[styles.scanTitle, { color: colors.primaryText }]}>Scan a landmark</Text>
                <Text style={[styles.scanCaption, { color: colors.primaryText }]}>Recognize supported landmarks offline</Text>
              </View>
              <AppIcon name="arrowRight" size={18} color={colors.primaryText} />
            </Pressable>

            <Card>
              <View style={styles.cardHeading}>
                <View style={[styles.stepBadge, { backgroundColor: colors.backgroundSelected }]}><AppIcon name="location" size={19} color={colors.primary} /></View>
                <View style={styles.headingCopy}>
                  <Text style={[typography.sectionTitle, { color: colors.text }]}>Plan your ride</Text>
                  <BodyText>Places come from the on-device SQLite catalog.</BodyText>
                </View>
              </View>
              <View style={styles.fields}>
                <RouteField label="Starting point" icon="location" value={selectedOrigin?.name} onPress={() => openPicker('origin')} />
                <RouteField label="Destination" icon="destination" value={selectedDestination?.name} onPress={() => openPicker('destination')} />
              </View>
              <PrimaryButton label="Find my ride" icon="arrowRight" onPress={findRide} disabled={!selectedOrigin || !selectedDestination || selectedDestination.id === selectedOrigin.id || lookupState === 'loading'} />
              <View style={[styles.infoBox, { backgroundColor: colors.backgroundSelected }]}>
                <AppIcon name="info" size={16} color={colors.plum} />
                <BodyText style={styles.infoText}>
                  {!commuterDataAvailable
                    ? commuterDataUnavailableMessage
                    : catalogState === 'loading'
                    ? 'Loading the offline landmark catalog…'
                    : catalogState === 'error'
              ? commuterDataAvailable ? 'The local catalog could not be opened. Retry from the landmark picker.' : commuterDataUnavailableMessage
                      : 'Recommendations use published-source pilot data. Live waits, trip times, and current operating status are not provided.'}
                </BodyText>
              </View>
            </Card>

            <View style={styles.rideTypes}>
              <Text style={[styles.rideTypesTitle, { color: colors.text }]}>Ride types in the app</Text>
              <View style={styles.typeRow}>
                {(['Jeepney', 'E-jeep', 'Tricycle', 'Bus'] as const).map((type) => (
                  <View key={type} style={[styles.typePill, { borderColor: colors.border, backgroundColor: colors.backgroundElement }]}>
                    <VehiclePixelArt mode={type} />
                    <Text style={[styles.typeText, { color: colors.textSecondary }]}>{type}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.planner}>
            <JourneySummary origin={selectedOrigin} destination={selectedDestination} onEdit={() => {
              clearPreviousRoute();
              if (selectedOrigin && selectedDestination) setJourney({ originId: selectedOrigin.id, destinationId: selectedDestination.id });
            }} />
            {visibleScreen === 'options' ? (
              <>
                <View style={styles.intro}>
                  <Kicker>Offline route catalog</Kicker>
                  <Text accessibilityRole="header" style={[typography.pageTitle, { color: colors.text }]}>Ride options</Text>
                  <BodyText>Wait and total journey time are unavailable in this dataset. Routes stay in the service’s returned order.</BodyText>
                </View>
                <ModeFilters selected={modeFilter} onSelect={setModeFilter} />
                <LookupContent
                  state={lookupState}
                  result={lookupResult}
                  options={visibleOptions}
                  filter={modeFilter}
                  onSelect={(option) => {
                    if (!currentOptions.some((item) => item.route.id === option.route.id && item.boardingPoint.id === option.boardingPoint.id)) return;
                    setSelectedRide(option);
                    if (selectedOrigin && selectedDestination) setJourney({ originId: selectedOrigin.id, destinationId: selectedDestination.id,
                      routeId: option.route.id, boardingPointId: option.boardingPoint.id });
                    setScreen('boarding');
                  }}
                  onRetry={findRide}
                  onShowAll={() => setModeFilter('all')}
                />
                <ActionButton label="Back to trip planner" icon="arrowLeft" onPress={() => setScreen('planning')} />
              </>
            ) : currentSelectedRide ? (
              <BoardingDetails option={currentSelectedRide} onOpenMap={() => openMap(currentSelectedRide)} onBack={() => setScreen('options')} />
            ) : (
              <Card>
                <Text style={[typography.sectionTitle, { color: colors.text }]}>This ride is no longer selected</Text>
                <BodyText>Return to the current ride options and choose a route again.</BodyText>
                <ActionButton label="Back to ride options" icon="arrowLeft" onPress={() => setScreen('options')} />
              </Card>
            )}
          </View>
        )}

        {wide && visibleScreen === 'planning' ? <MapPreview onOpen={() => openMap()} /> : null}
      </View>

      <PlacePicker
        kind={picker}
        query={placeQuery}
        onQueryChange={setPlaceQuery}
        landmarks={landmarks}
        destinations={destinations}
        catalogState={catalogState}
        destinationState={destinationState}
        origin={selectedOrigin}
        onChoose={choosePlace}
        onClose={() => { setPicker(null); setPlaceQuery(''); }}
        onRetryLandmarks={() => { setCatalogState('loading'); setCatalogAttempt((attempt) => attempt + 1); }}
        onRetryDestinations={() => { setDestinationState('loading'); setDestinationAttempt((attempt) => attempt + 1); }}
      />
      {scanOpen && <ScanLandmark onClose={() => setScanOpen(false)} onChooseManually={() => { setScanOpen(false); openPicker('origin'); }}
        onSelect={(landmark) => {
          setOrigin(landmark); clearPreviousRoute();
          setJourney((current) => selectJourneyOrigin(current, landmark.id));
          setScanOpen(false);
        }} />}
    </ScreenFrame>
  );
}

function MapPreview({ onOpen }: { onOpen: () => void }) {
  const colors = useAppColors();
  return (
    <View style={styles.previewColumn}>
      <Card>
        <View style={styles.previewTitleRow}>
          <View>
            <Kicker>Area preview</Kicker>
            <Text style={[typography.sectionTitle, { color: colors.text }]}>Makati map</Text>
          </View>
          <AppIcon name="map" size={22} color={colors.primary} />
        </View>
        <View style={[styles.mapPreview, { borderColor: colors.border }]}>
          <TransportMap scene={{ markers: [], routes: [], omittedLocations: [] }} />
        </View>
        <BodyText>Online map of Makati. Choose a ride to see its available location references and boarding guidance. Offline map downloads are not available.</BodyText>
        <ActionButton label="Open map" icon="map" onPress={onOpen} />
      </Card>
    </View>
  );
}

function JourneySummary({ origin, destination, onEdit }: { origin: Landmark | null; destination: Destination | null; onEdit: () => void }) {
  const colors = useAppColors();
  return (
    <Card>
      <View style={styles.journeyHeader}>
        <Text style={[typography.sectionTitle, { color: colors.text }]}>Your trip</Text>
        <ActionButton label="Edit trip" onPress={onEdit} />
      </View>
      <View style={styles.journeyPlaces}>
        <PlaceLine label="Starting point" name={origin?.name ?? 'Not selected'} />
        <AppIcon name="arrowRight" size={17} color={colors.textSecondary} />
        <PlaceLine label="Destination" name={destination?.name ?? 'Not selected'} />
      </View>
    </Card>
  );
}

function PlaceLine({ label, name }: { label: string; name: string }) {
  const colors = useAppColors();
  return <View style={styles.placeLine}><Text style={[styles.placeLabel, { color: colors.textSecondary }]}>{label}</Text><Text style={[styles.placeName, { color: colors.text }]}>{name}</Text></View>;
}

function ModeFilters({ selected, onSelect }: { selected: RideModeFilter; onSelect: (mode: RideModeFilter) => void }) {
  const colors = useAppColors();
  return (
    <View style={styles.filters} accessibilityLabel="Filter ride options by type">
      {modeFilters.map((filter) => {
        const active = selected === filter.id;
        return (
          <Pressable
            key={filter.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(filter.id)}
            style={[styles.filterButton, { backgroundColor: active ? colors.primary : colors.backgroundElement, borderColor: active ? colors.primary : colors.border }]}>
            <Text style={[styles.filterLabel, { color: active ? colors.primaryText : colors.text }]}>{filter.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function LookupContent({
  state,
  result,
  options,
  filter,
  onSelect,
  onRetry,
  onShowAll,
}: {
  state: LookupState;
  result: TransportLookupResult | null;
  options: BoardingOption[];
  filter: RideModeFilter;
  onSelect: (option: BoardingOption) => void;
  onRetry: () => void;
  onShowAll: () => void;
}) {
  const colors = useAppColors();
  if (state === 'loading') return <Card><ActivityIndicator accessibilityLabel="Loading ride options" color={colors.primary} /><BodyText>Checking the offline route catalog…</BodyText></Card>;
  if (state === 'error') return <EmptyNotice title="Couldn’t load ride options" copy="The local route catalog returned an error. Your selected places are unchanged." actionLabel="Try again" onAction={onRetry} />;
  if (!result) return <EmptyNotice title="No route results" copy="Choose a starting point and destination, then search again." />;

  if (result.status === 'unsupported-origin') return <EmptyNotice title="Starting point unavailable" copy="That landmark is not in the current offline catalog. Choose another landmark." />;
  if (result.status === 'unsupported-destination') return <EmptyNotice title="Destination unavailable" copy="That destination is not in the current offline catalog. Choose another supported destination." />;
  if (result.status === 'already-at-destination') return <EmptyNotice title="You’re already at this place" copy="Choose a different destination to find a ride." />;
  if (result.status === 'no-routes') return <EmptyNotice title="No supported route for this pair" copy="The offline catalog has no route for these places. Edit the trip to choose a different pair." />;
  if (result.status === 'incomplete-guidance') return <EmptyNotice title="Route guidance is incomplete" copy="The catalog contains route records, but none meet its current source and instruction checks. No ride is being recommended." />;
  if (options.length === 0) {
    return (
      <EmptyNotice
        title={filter === 'all' ? 'No ride options available' : `No ${modeFilters.find((item) => item.id === filter)?.label.toLowerCase()} routes here`}
        copy={filter === 'all' ? 'No eligible options were returned for this pair.' : 'This ride type has no matching route in the current catalog.'}
        actionLabel={filter === 'all' ? undefined : 'Show all ride types'}
        onAction={filter === 'all' ? undefined : onShowAll}
      />
    );
  }

  const sourceBased = result.status === 'source-based';
  return (
    <View style={styles.optionList}>
      <View style={[styles.infoBox, { backgroundColor: colors.backgroundSelected }]}>
        <AppIcon name="info" size={16} color={colors.plum} />
        <BodyText style={styles.infoText}>
          {sourceBased
            ? 'Published-source pilot suggestions. They are not live, and boarding access has not been field-verified.'
            : 'These options meet the local catalog’s guidance checks. No live wait or trip-time estimates are available.'}
        </BodyText>
      </View>
      {options.map((option) => <RideOptionCard key={`${option.route.id}:${option.boardingPoint.id}`} option={option} sourceBased={sourceBased} onPress={() => onSelect(option)} />)}
    </View>
  );
}

function RideOptionCard({ option, sourceBased, onPress }: { option: BoardingOption; sourceBased: boolean; onPress: () => void }) {
  const colors = useAppColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.optionCard, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }, pressed && styles.pressed]}>
      <View style={styles.optionTop}>
        <VehiclePixelArt mode={option.route.transportationType === 'jeepney' ? 'Jeepney' : 'Bus'} />
        <View style={styles.optionCopy}>
          <Text style={[styles.optionTitle, { color: colors.text }]}>{transportLabel(option.route.transportationType)}</Text>
          <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>{option.route.name}</Text>
        </View>
        <AppIcon name="chevronRight" size={18} color={colors.textSecondary} />
      </View>
      <Text style={[styles.optionBoarding, { color: colors.text }]}>Board at {option.boardingPoint.name}</Text>
      <View style={styles.estimatesRow}>
        <Text style={[styles.estimateText, { color: colors.textSecondary }]}>Wait: unavailable</Text>
        <Text style={[styles.estimateText, { color: colors.textSecondary }]}>Total time: unavailable</Text>
      </View>
      <Text style={[styles.evidenceText, { color: sourceBased ? colors.gold : colors.success }]}>
        {sourceBased ? 'Published-source suggestion • boarding not field-verified' : 'Meets local guidance checks'}
      </Text>
    </Pressable>
  );
}

function BoardingDetails({ option, onBack, onOpenMap }: { option: BoardingOption; onBack: () => void; onOpenMap: () => void }) {
  const colors = useAppColors();
  return (
    <View style={styles.detailContent}>
      <View style={styles.intro}>
        <Kicker>Boarding details</Kicker>
        <Text accessibilityRole="header" style={[typography.pageTitle, { color: colors.text }]}>How to ride</Text>
        <View style={styles.detailTitleRow}>
          <VehiclePixelArt mode={option.route.transportationType === 'jeepney' ? 'Jeepney' : 'Bus'} />
          <View style={styles.optionCopy}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>{transportLabel(option.route.transportationType)}</Text>
            <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>{option.route.name}</Text>
          </View>
        </View>
      </View>

      <Card>
        <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Before you board</Text>
        <Instruction label="Boarding location" value={`${option.boardingPoint.name}${option.boardingVerified ? ' • verified' : ' • not field-verified'}`} />
        <Instruction label="Walk from starting point" value={option.originWalkingInstructions ?? 'Walking directions and estimate are unavailable.'} />
        <Instruction label="Signboard / boarding instruction" value={option.boardingInstructions ?? 'No signboard instruction is available.'} />
        {!option.accessVerified || !option.boardingVerified ? <BodyText>Confirm the boarding point locally before relying on it; its access or stop location is not field-verified.</BodyText> : null}
      </Card>

      <Card>
        <Text style={[styles.detailSectionTitle, { color: colors.text }]}>At your destination</Text>
        <Instruction label="Alight at" value={option.route.alightingLocation ?? 'Alighting point unavailable.'} />
        <Instruction label="Alighting instruction" value={option.route.alightingInstructions ?? 'No alighting instruction is available.'} />
        <Instruction label="Continue on foot" value={option.route.destinationWalkingInstructions ?? 'Destination walking directions are unavailable.'} />
      </Card>

      <Card>
        <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Estimate and source limits</Text>
        <Instruction label="Wait / journey time" value="Not supplied by the offline catalog." />
        <Instruction label="Reviewed" value={option.route.reviewedOn ?? 'Review date unavailable.'} />
        <Instruction label="Source" value={option.route.sourceReference ?? 'No source recorded.'} />
        <Instruction label="Limitations" value={option.route.limitations ?? 'No limitations recorded.'} />
      </Card>

      <View style={styles.actions}>
        <PrimaryButton label="Open route map" icon="map" onPress={onOpenMap} />
        <ActionButton label="Back to ride options" icon="arrowLeft" onPress={onBack} />
        <View style={[styles.infoBox, { backgroundColor: colors.backgroundSelected }]}>
          <AppIcon name="map" size={16} color={colors.textSecondary} />
          <BodyText style={styles.infoText}>The map needs internet and an Android build. Missing route paths or verified stop coordinates remain unavailable; these text instructions stay usable. Trip completion saving is not connected.</BodyText>
        </View>
      </View>
    </View>
  );
}

function Instruction({ label, value }: { label: string; value: string }) {
  const colors = useAppColors();
  return <View style={styles.instruction}><Text style={[styles.instructionLabel, { color: colors.textSecondary }]}>{label}</Text><Text style={[styles.instructionValue, { color: colors.text }]}>{value}</Text></View>;
}

function EmptyNotice({ title, copy, actionLabel, onAction }: { title: string; copy: string; actionLabel?: string; onAction?: () => void }) {
  const colors = useAppColors();
  return (
    <Card>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <BodyText>{copy}</BodyText>
      {actionLabel && onAction ? <ActionButton label={actionLabel} onPress={onAction} /> : null}
    </Card>
  );
}

function ActionButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: 'arrowLeft' | 'arrowRight' | 'map' }) {
  const colors = useAppColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.actionButton, { borderColor: colors.border }, pressed && styles.pressed]}>
      {icon ? <AppIcon name={icon} size={16} color={colors.primary} /> : null}
      <Text style={[styles.actionLabel, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

function PlacePicker({
  kind,
  query,
  onQueryChange,
  landmarks,
  destinations,
  catalogState,
  destinationState,
  origin,
  onChoose,
  onClose,
  onRetryLandmarks,
  onRetryDestinations,
}: {
  kind: PickerKind | null;
  query: string;
  onQueryChange: (value: string) => void;
  landmarks: Landmark[];
  destinations: Destination[];
  catalogState: CatalogState;
  destinationState: DestinationState;
  origin: Landmark | null;
  onChoose: (place: Place) => void;
  onClose: () => void;
  onRetryLandmarks: () => void;
  onRetryDestinations: () => void;
}) {
  const colors = useAppColors();
  const isOrigin = kind === 'origin';
  const title = isOrigin ? 'Nasaan ka ngayon?' : 'Saan ang punta?';
  const state = isOrigin ? catalogState : destinationState;
  const places: Place[] = isOrigin
    ? landmarks
    : getDestinationChoices(destinations, origin?.id);
  const filtered = places.filter((place) => place.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  return (
    <Modal visible={kind !== null} transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.scrim }]}>
        <View accessibilityViewIsModal accessibilityLabel={isOrigin ? 'Starting point picker' : 'Destination picker'} style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.controlMuted }]} />
          <View style={styles.sheetHeading}>
            <View style={styles.headingCopy}>
              <Kicker>{isOrigin ? 'Starting point' : 'Destination'}</Kicker>
              <Text accessibilityRole="header" style={[typography.sectionTitle, { color: colors.text }]}>{title}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close landmark search" onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.backgroundSelected }]}>
              <AppIcon name="close" size={17} color={colors.text} />
            </Pressable>
          </View>
          <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}>
            <AppIcon name="search" size={18} color={colors.textSecondary} />
            <TextInput accessibilityLabel={`Search ${isOrigin ? 'starting points' : 'destinations'}`} placeholder="Search Makati places" placeholderTextColor={colors.textSecondary} value={query} onChangeText={onQueryChange} style={[styles.searchInput, { color: colors.text }]} />
          </View>
          <ScrollView style={styles.placeList} keyboardShouldPersistTaps="handled">
            {state === 'loading' ? <PickerLoading /> : null}
            {state === 'error' ? (
              <PickerEmpty title={commuterDataAvailable ? 'Couldn’t read the offline place catalog' : 'Offline places unavailable here'} copy={commuterDataAvailable ? 'Your current selection is unchanged. Retry loading the local SQLite data.' : commuterDataUnavailableMessage}>
                {commuterDataAvailable ? <ActionButton label="Try again" onPress={isOrigin ? onRetryLandmarks : onRetryDestinations} /> : null}
              </PickerEmpty>
            ) : null}
            {state === 'ready' && filtered.length === 0 ? (
              <PickerEmpty
                title={query.trim() ? 'No matching places' : isOrigin ? 'No landmarks available' : 'No destinations available'}
                copy={query.trim() ? 'Try another name or clear your search.' : isOrigin ? 'The offline catalog has no landmarks to choose.' : 'The offline catalog has no destinations to choose.'}
              />
            ) : null}
            {state === 'ready' ? filtered.map((place) => (
              <Pressable key={place.id} accessibilityRole="button" onPress={() => onChoose(place)} style={({ pressed }) => [styles.placeChoice, { borderColor: colors.border }, pressed && styles.pressed]}>
                <View style={[styles.placeChoiceIcon, { backgroundColor: colors.backgroundSelected }]}>
                  <AppIcon name={isOrigin ? 'location' : 'destination'} size={18} color={colors.primary} />
                </View>
                <Text style={[styles.placeChoiceName, { color: colors.text }]}>{place.name}</Text>
                <AppIcon name="chevronRight" size={16} color={colors.textSecondary} />
              </Pressable>
            )) : null}
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={onClose} style={[styles.secondaryButton, { borderColor: colors.border }]}>
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function PickerLoading() {
  const colors = useAppColors();
  return <View style={styles.pickerStatus}><ActivityIndicator accessibilityLabel="Loading places" color={colors.primary} /><BodyText>Loading places from this device…</BodyText></View>;
}

function PickerEmpty({ title, copy, children }: { title: string; copy: string; children?: React.ReactNode }) {
  const colors = useAppColors();
  return <View style={[styles.emptyState, { backgroundColor: colors.backgroundElement }]}><Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text><BodyText style={styles.emptyCopy}>{copy}</BodyText>{children}</View>;
}

function transportLabel(type: TransportationType): string {
  if (type === 'e-bus') return 'E-bus';
  if (type === 'jeepney') return 'Jeepney';
  return 'Bus';
}

const styles = StyleSheet.create({
  mainLayout: { width: '100%', gap: Space.four },
  wideLayout: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.seven },
  planner: { flex: 0.85, gap: Space.four },
  intro: { gap: Space.two, paddingTop: Space.two },
  compactPageTitle: { fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  scanCard: { borderWidth: 1, minHeight: 96, borderRadius: Radius.card, paddingHorizontal: Space.four, paddingVertical: Space.three, flexDirection: 'row', alignItems: 'center', gap: Space.three },
  scanIcon: { width: 48, height: 48, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  scanCopy: { flex: 1, gap: Space.one },
  scanTitle: { fontSize: 18, lineHeight: 23, fontWeight: '800' },
  scanCaption: { fontSize: 13, lineHeight: 18, opacity: 0.92, flexShrink: 1 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: Space.three },
  stepBadge: { width: 42, height: 42, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  headingCopy: { flex: 1, gap: Space.one },
  fields: { gap: Space.two },
  infoBox: { padding: Space.three, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'flex-start', gap: Space.two },
  infoText: { flex: 1 },
  rideTypes: { gap: Space.two, paddingVertical: Space.two },
  rideTypesTitle: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.two },
  typePill: { borderWidth: 1, borderRadius: Radius.medium, minHeight: 58, paddingHorizontal: Space.two, paddingVertical: Space.two, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.one },
  typeText: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  previewColumn: { flex: 1.65, minWidth: 300, paddingTop: Space.four },
  previewTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mapPreview: { height: 300, borderWidth: 1, borderRadius: Radius.medium, overflow: 'hidden' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', padding: Space.two },
  sheet: { width: '100%', maxWidth: 620, alignSelf: 'center', borderTopLeftRadius: Radius.large, borderTopRightRadius: Radius.large, borderBottomLeftRadius: Radius.medium, borderBottomRightRadius: Radius.medium, padding: Space.four, paddingBottom: Space.seven, gap: Space.four, maxHeight: '90%' },
  sheetHandle: { width: 42, height: 5, borderRadius: Radius.pill, alignSelf: 'center', marginBottom: Space.two },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.three },
  closeButton: { width: 48, height: 48, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  searchBox: { minHeight: 52, borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: Space.three, flexDirection: 'row', alignItems: 'center', gap: Space.two },
  searchInput: { flex: 1, minHeight: 48, fontSize: 16 },
  placeList: { flexShrink: 1 },
  placeChoice: { minHeight: 56, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: Space.three, paddingVertical: Space.two },
  placeChoiceIcon: { width: 38, height: 38, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  placeChoiceName: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  pickerStatus: { minHeight: 100, justifyContent: 'center', alignItems: 'center', gap: Space.two },
  emptyState: { borderRadius: Radius.medium, padding: Space.four, alignItems: 'center', gap: Space.two },
  emptyTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  emptyCopy: { textAlign: 'center', maxWidth: 380 },
  secondaryButton: { minHeight: 52, borderWidth: 1, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  dialog: { width: '100%', maxWidth: 430, alignSelf: 'center', borderRadius: Radius.large, padding: Space.five, gap: Space.three },
  dialogIcon: { width: 54, height: 54, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  journeyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.two },
  journeyPlaces: { flexDirection: 'row', alignItems: 'center', gap: Space.two, flexWrap: 'wrap' },
  placeLine: { flex: 1, minWidth: 120, gap: Space.one },
  placeLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  placeName: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.two },
  filterButton: { minHeight: 48, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Space.three, justifyContent: 'center' },
  filterLabel: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  optionList: { gap: Space.three },
  optionCard: { borderWidth: 1, borderRadius: Radius.card, padding: Space.four, gap: Space.two },
  optionTop: { flexDirection: 'row', alignItems: 'center', gap: Space.three },
  optionCopy: { flex: 1, minWidth: 0, gap: Space.one },
  optionTitle: { fontSize: 17, lineHeight: 23, fontWeight: '800' },
  optionSubtitle: { fontSize: 14, lineHeight: 20 },
  optionBoarding: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  estimatesRow: { flexDirection: 'row', gap: Space.three, flexWrap: 'wrap' },
  estimateText: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
  evidenceText: { fontSize: 13, lineHeight: 19, fontWeight: '700' },
  actionButton: { minHeight: 48, borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: Space.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.two, alignSelf: 'flex-start' },
  actionLabel: { fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  pressed: { opacity: 0.76 },
  detailContent: { gap: Space.four },
  detailTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Space.three },
  detailSectionTitle: { fontSize: 17, lineHeight: 23, fontWeight: '800' },
  instruction: { gap: Space.one },
  instructionLabel: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
  instructionValue: { fontSize: 16, lineHeight: 24 },
  actions: { gap: Space.two },
});
