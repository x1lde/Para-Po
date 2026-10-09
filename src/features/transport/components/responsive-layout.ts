const PLANNER_PREFERRED_MIN_WIDTH = 300;

/** Keeps the planner's minimum width within ScreenFrame's padded content area. */
export function ridePlannerMinWidth(screenWidth: number, horizontalPadding: number): number {
  return Math.min(PLANNER_PREFERRED_MIN_WIDTH, Math.max(0, screenWidth - horizontalPadding));
}
