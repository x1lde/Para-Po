import type { Destination, Landmark, TransportLookupResult } from '@/features/transport/types';

export const commuterDataAvailable = false;
export const commuterDataUnavailableMessage = 'SQLite route data is unavailable in this web preview. Open the native app to use the on-device catalog.';

export async function listLandmarks(): Promise<Landmark[]> {
  throw new Error(commuterDataUnavailableMessage);
}

export async function listDestinations(): Promise<Destination[]> {
  throw new Error(commuterDataUnavailableMessage);
}

export async function listDestinationsForOrigin(_landmarkId: string, _includeSourceBased = true): Promise<Destination[]> {
  throw new Error(commuterDataUnavailableMessage);
}

export async function lookupTransportation(_landmarkId: string, _destinationId: string, _includeSourceBased = true): Promise<TransportLookupResult> {
  throw new Error(commuterDataUnavailableMessage);
}
