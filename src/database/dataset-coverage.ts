import type { TransportDataset } from './seed';
import { validateDataset } from './validate-dataset';
import { getGuidanceIssues, isGuidanceReady, isSourceBasedRecommendation } from '@/features/transport/services/guidance-service';
import type { BoardingOption } from '@/features/transport/types';

/** Bundled-data coverage, not a native database health check or service-operation guarantee. */
export function getDatasetCoverage(dataset: TransportDataset) {
  validateDataset(dataset);
  const routes = new Map(dataset.routes.map((route) => [route.id, route]));
  const points = new Map(dataset.boardingPoints.map((point) => [point.id, point]));
  const journeys = dataset.landmarks.flatMap((origin) => dataset.destinations.flatMap((destination) => {
    if (origin.id === destination.id) return [];
    const options: BoardingOption[] = [];
    for (const access of dataset.landmarkBoardingPoints.filter((link) => link.landmarkId === origin.id)) {
      for (const boarding of dataset.routeBoardingPoints.filter((link) => link.boardingPointId === access.boardingPointId)) {
        const route = routes.get(boarding.routeId);
        const point = points.get(boarding.boardingPointId);
        if (!route || !point || route.destinationId !== destination.id) continue;
        const option = { route, boardingPoint: point, originWalkingInstructions: access.walkingInstructions,
          boardingInstructions: boarding.boardingInstructions, accessVerified: access.accessVerified,
          boardingVerified: boarding.boardingVerified };
        options.push({ ...option, guidanceIssues: getGuidanceIssues(option) });
      }
    }
    if (!options.length) return [];
    return [{ originId: origin.id, destinationId: destination.id,
      status: options.some(isGuidanceReady) ? 'available' as const : options.some(isSourceBasedRecommendation) ? 'source-based' as const : 'incomplete-guidance' as const,
      options: options.map((option) => ({ routeId: option.route.id, boardingPointId: option.boardingPoint.id, issues: option.guidanceIssues })),
    }];
  }));
  return {
    datasetVersion: dataset.version,
    counts: { landmarks: dataset.landmarks.length, destinations: dataset.destinations.length, routes: dataset.routes.length,
      boardingPoints: dataset.boardingPoints.length, coveredPairs: journeys.length,
      readyPairs: journeys.filter((journey) => journey.status === 'available').length,
      sourceBasedPairs: journeys.filter((journey) => journey.status === 'source-based').length },
    originsWithoutRecommendations: dataset.landmarks.filter((landmark) => !journeys.some((journey) =>
      journey.originId === landmark.id && journey.status !== 'incomplete-guidance')).map((landmark) => ({ id: landmark.id, name: landmark.name })),
    boardingPointsWithoutCoordinates: dataset.boardingPoints.filter((point) => point.latitude === null).map((point) => point.id),
    landmarksWithoutModelLabels: dataset.landmarks.filter((landmark) => landmark.classificationLabel === null).map((landmark) => landmark.id),
    journeys,
  };
}
