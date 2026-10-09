import { rankBoardingOptions, usableFix } from '@/features/location/services/proximity';
import type { LocationFix } from '@/features/location/types';
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
  const location = request.location ?? null;
  const now = Date.now();
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
