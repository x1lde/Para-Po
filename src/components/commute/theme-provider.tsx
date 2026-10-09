import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ThemeContext = createContext<{ dark: boolean; toggle: () => void } | null>(null);

/** Covers the app with the previous background and fades it out, so light/dark switches cross-fade. */
function ThemeCover({ color, onDone }: { color: string; onDone: () => void }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withTiming(0, { duration: 460 }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
  }, [opacity, onDone]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color }, style]} />;
}

export function CommuteThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const reduced = useReducedMotion();
  const [override, setOverride] = useState<boolean | null>(null);
  const [cover, setCover] = useState<{ id: number; color: string } | null>(null);
  const dark = override ?? system === 'dark';
  const toggle = () => {
    if (!reduced) setCover({ id: Date.now(), color: Colors[dark ? 'dark' : 'light'].background });
    setOverride(!dark);
  };
  return <ThemeContext value={{ dark, toggle }}>
    {children}
    {cover && <ThemeCover key={cover.id} color={cover.color} onDone={() => setCover(null)} />}
  </ThemeContext>;
}
export function useCommuteTheme() {
  const context = useContext(ThemeContext);
  const system = useColorScheme();
  const dark = context?.dark ?? system === 'dark';
  return { ...Colors[dark ? 'dark' : 'light'], dark, toggle: context?.toggle ?? (() => {}) };
}
