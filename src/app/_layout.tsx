import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import AppTabs from '@/components/app-tabs';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { JourneyProvider } from '@/features/maps/components/journey-context';

export default function TabLayout() {
  const isDark = useColorScheme() === 'dark';
  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <JourneyProvider><AppTabs /></JourneyProvider>
    </ThemeProvider>
  );
}
