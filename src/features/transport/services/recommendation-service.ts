import { rankBoardingOptions, usableFix } from '@/features/location/services/proximity';
import type { LocationFix } from '@/features/location/types';
import type { TransportLookupResult } from '../types';
import { lookupTransportation } from './transport-service';

export interface RecommendationRequest {
  originId: string;
  destinationId: string;
  location?: LocationFix | null;
  includeSourceBased?: boolean;
}

/** Shared offline lookup + GPS ranking. Storage failures still reject for UI retry. */
export async function getJourneyRecommendations(request: RecommendationRequest) {
  const result = await lookupTransportation(request.originId, request.destinationId, request.includeSourceBased ?? true);
  return rankJourneyRecommendations(result, request.location ?? null);
}

/** Re-rank a loaded lookup when GPS changes without another database request. */
export function rankJourneyRecommendations(result: TransportLookupResult, location: LocationFix | null, now = Date.now()) {
  const options = result.status === 'available' || result.status === 'source-based' ? result.options : [];
  const rankedOptions = rankBoardingOptions(options, location, now);
  return {
    result,
    locationStatus: !location ? 'not-provided' as const : usableFix(location, now) ? 'usable' as const : 'unusable' as const,
    rankedOptions,
    nearestOption: rankedOptions.find((option) => option.distanceMeters !== null) ?? null,
    distanceKind: 'straight-line' as const,
  };
}

export type JourneyRecommendation = ReturnType<typeof rankJourneyRecommendations>;
