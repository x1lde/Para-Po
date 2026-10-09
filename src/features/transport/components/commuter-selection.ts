export type RideModeFilter = 'all' | 'jeepney' | 'e-jeep' | 'tricycle' | 'bus';

type RouteOptionWithMode = { route: { transportationType: string } };

export function excludeCurrentOrigin<T extends { id: string }>(
  destinations: readonly T[],
  originId: string
): T[] {
  return destinations.filter((destination) => destination.id !== originId);
}

export function filterOptionsByMode<T extends RouteOptionWithMode>(
  options: readonly T[],
  mode: RideModeFilter
): T[] {
  if (mode === 'all') return [...options];
  return options.filter((option) => option.route.transportationType === mode);
}
