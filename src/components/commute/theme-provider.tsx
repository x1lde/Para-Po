import { createContext, useContext, useState, type ReactNode } from 'react';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ThemeContext = createContext<{ dark: boolean; toggle: () => void } | null>(null);
export function CommuteThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [override, setOverride] = useState<boolean | null>(null);
  const dark = override ?? system === 'dark';
  return <ThemeContext value={{ dark, toggle: () => setOverride(!dark) }}>{children}</ThemeContext>;
}
export function useCommuteTheme() {
  const context = useContext(ThemeContext);
  const system = useColorScheme();
  const dark = context?.dark ?? system === 'dark';
  return { ...Colors[dark ? 'dark' : 'light'], dark, toggle: context?.toggle ?? (() => {}) };
}
