import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { MapJourneySelection } from './journey-selection';

const JourneyContext = createContext<{
  journey: MapJourneySelection | null;
  setJourney: Dispatch<SetStateAction<MapJourneySelection | null>>;
} | null>(null);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [journey, setJourney] = useState<MapJourneySelection | null>(null);
  const value = useMemo(() => ({ journey, setJourney }), [journey]);
  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useMapJourney() {
  const value = useContext(JourneyContext);
  if (!value) throw new Error('Map journey must be used inside JourneyProvider.');
  return value;
}
