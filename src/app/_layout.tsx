import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import AppTabs from '@/components/app-tabs';
import { CommuteThemeProvider, useCommuteTheme } from '@/components/commute/theme-provider';

void SplashScreen.preventAutoHideAsync();
function Navigation() {
  const theme = useCommuteTheme();
  const base = theme.dark ? DarkTheme : DefaultTheme;
  return <ThemeProvider value={{ ...base, colors: { ...base.colors, background: theme.background, card: theme.backgroundElement, text: theme.text, border: theme.line, primary: theme.primary } }}><AppTabs /></ThemeProvider>;
}
export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Inter-Regular': require('../../assets/fonts/Inter-Regular.ttf'),
    'Inter-SemiBold': require('../../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../../assets/fonts/Inter-Bold.ttf'),
    'Inter-ExtraBold': require('../../assets/fonts/Inter-ExtraBold.ttf'),
  });
  useEffect(() => { if (loaded || error) void SplashScreen.hideAsync(); }, [loaded, error]);
  if (!loaded && !error) return null;
  return <CommuteThemeProvider><Navigation /></CommuteThemeProvider>;
}
