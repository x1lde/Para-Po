import type { BoardingOption, GuidanceIssue } from '../types';

/** Completeness checks, never inferred paths or guessed coordinates. */
export function getGuidanceIssues(option: Omit<BoardingOption, 'guidanceIssues'>): GuidanceIssue[] {
  const issues: GuidanceIssue[] = [];
  const { route, boardingPoint } = option;
  if (route.evidenceStatus === 'pending' || !route.sourceReference || !route.reviewedOn) {
    issues.push('route-evidence-pending');
  }
  if (!option.accessVerified) issues.push('origin-access-unconfirmed');
  if (!option.boardingVerified) issues.push('boarding-location-unconfirmed');
  if (boardingPoint.latitude === null || boardingPoint.longitude === null) {
    issues.push('boarding-coordinates-unavailable');
  }
  if (!option.originWalkingInstructions?.trim()) issues.push('origin-walking-guidance-unavailable');
  if (!option.boardingInstructions?.trim()) issues.push('boarding-guidance-unavailable');
  if (!route.alightingLocation?.trim() || !route.alightingInstructions?.trim()) {
    issues.push('alighting-guidance-unavailable');
  }
  if (!route.destinationWalkingInstructions?.trim()) issues.push('destination-walking-guidance-unavailable');
  return issues;
}

/** Coordinates enable proximity ranking but are not required for manual guidance. */
export function isGuidanceReady(option: BoardingOption): boolean {
  return getGuidanceIssues(option).every((issue) => issue === 'boarding-coordinates-unavailable');
}

/** Named boarding/alighting instructions can be useful before exact access is confirmed. */
export function isSourceBasedRecommendation(option: BoardingOption): boolean {
  const { route } = option;
  return (route.evidenceStatus === 'published-confirmed' || route.evidenceStatus === 'verified') &&
    Boolean(route.sourceReference?.trim() && route.reviewedOn && route.limitations?.trim() &&
      option.boardingPoint.name.trim() && option.boardingInstructions?.trim() &&
      route.alightingLocation?.trim() && route.alightingInstructions?.trim());
}
