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
