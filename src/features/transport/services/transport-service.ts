import { findBoardingOptions, findDestination, findLandmark } from '@/database/repositories/transport-repository';
import type { TransportLookupResult } from '@/features/transport/types';
import { isGuidanceReady, isSourceBasedRecommendation } from './guidance-service';

/** Offline manual/recognized-landmark flow. Does not choose a nearest stop without GPS. */
export async function lookupTransportation(
  landmarkId: string,
  destinationId: string,
  includeSourceBased = true
): Promise<TransportLookupResult> {
  const origin = await findLandmark(landmarkId);
  if (!origin) return { status: 'unsupported-origin' };

  const destination = await findDestination(destinationId);
  if (!destination) return { status: 'unsupported-destination' };
  if (origin.id === destination.id) return { status: 'already-at-destination', origin, destination };

  const options = await findBoardingOptions(landmarkId, destinationId);
  if (options.length === 0) return { status: 'no-routes', origin, destination };

  const readyOptions = options.filter(isGuidanceReady);
  if (readyOptions.length > 0) return { status: 'available', origin, destination, options: readyOptions };
  const sourcedOptions = includeSourceBased ? options.filter(isSourceBasedRecommendation) : [];
  if (sourcedOptions.length > 0) return { status: 'source-based', origin, destination, options: sourcedOptions };
  return { status: 'incomplete-guidance', origin, destination, options };
}
