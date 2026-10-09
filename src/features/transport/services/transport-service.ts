import { findBoardingOptions, findDestination, findLandmark } from '@/database/repositories/transport-repository';
import type { TransportLookupResult } from '@/features/transport/types';

/** Offline manual/recognized-landmark flow. Does not choose a nearest stop without GPS. */
export async function lookupTransportation(
  landmarkId: string,
  destinationId: string
): Promise<TransportLookupResult> {
  const origin = await findLandmark(landmarkId);
  if (!origin) return { status: 'unsupported-origin' };

  const destination = await findDestination(destinationId);
  if (!destination) return { status: 'unsupported-destination' };

  const options = await findBoardingOptions(landmarkId, destinationId);
  if (options.length === 0) return { status: 'no-routes', origin, destination };

  return { status: 'available', origin, destination, options };
}
