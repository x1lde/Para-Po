import { listDestinations, listLandmarks } from '@/database/repositories/transport-repository';
import { getJourneyRecommendations } from '@/features/transport/services/recommendation-service';
import { getDestinationChoices } from '@/features/transport/components/commuter-selection';
import type { MapJourneySelection } from './journey-selection';

export async function loadMapJourney(selection: MapJourneySelection | null) {
  const [landmarks, catalog] = await Promise.all([listLandmarks(), listDestinations()]);
  const originId = selection?.originId ?? '';
  const destinationId = selection?.destinationId ?? '';
  // Never replace an unsupported requested destination with a different journey.
  const recommendation = originId && destinationId ? await getJourneyRecommendations({ originId, destinationId }) : null;
  const result = recommendation?.result ?? null;
  const options = result?.status === 'available' || result?.status === 'source-based' ? result.options : [];
  const selectedOption = selection?.routeId ? options.find((option) =>
    option.route.id === selection.routeId && option.boardingPoint.id === selection.boardingPointId) : undefined;
  return {
    landmarks, destinations: getDestinationChoices(catalog, originId), originId, destinationId,
    result, recommendation, selectedOption, selectionUnavailable: Boolean(selection?.routeId && !selectedOption),
  };
}
