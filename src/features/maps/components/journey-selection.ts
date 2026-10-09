/** Transient UI selection; SQLite remains authoritative for route details. */
export interface MapJourneySelection {
  originId: string;
  destinationId: string;
  routeId?: string;
  boardingPointId?: string;
}

/** Change one place and discard route details tied to the previous pair. */
export function selectJourneyOrigin(current: MapJourneySelection | null, originId: string): MapJourneySelection {
  const destinationId = current?.destinationId === originId ? '' : current?.destinationId ?? '';
  return { originId, destinationId };
}

/** Change one place and discard route details tied to the previous pair. */
export function selectJourneyDestination(current: MapJourneySelection | null, destinationId: string): MapJourneySelection {
  const originId = current?.originId ?? '';
  return { originId, destinationId: originId === destinationId ? '' : destinationId };
}

/** Preserve the chosen route when several eligible routes share a boarding point. */
export function chooseBoardingOption<T extends { route: { id: string }; boardingPoint: { id: string } }>(
  options: readonly T[], boardingPointId: string, selectedRouteId?: string
): T | undefined {
  return options.find((option) => option.boardingPoint.id === boardingPointId && option.route.id === selectedRouteId)
    ?? options.find((option) => option.boardingPoint.id === boardingPointId);
}

/** Match the complete route/stop pair, not just a route shared by several stops. */
export function findJourneyOption<T extends { route: { id: string }; boardingPoint: { id: string } }>(
  options: readonly T[], selection: MapJourneySelection | null
): T | undefined {
  return options.find((option) => option.route.id === selection?.routeId && option.boardingPoint.id === selection?.boardingPointId);
}
