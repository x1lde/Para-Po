/** Transient UI selection; SQLite remains authoritative for route details. */
export interface MapJourneySelection {
  originId: string;
  destinationId: string;
  routeId?: string;
  boardingPointId?: string;
}
