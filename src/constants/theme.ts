import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1C2636',
    background: '#FFFFFF',
    backgroundElement: '#F4F7FC',
    backgroundSelected: '#E5EEFC',
    textSecondary: '#506078',
    primary: '#2159A6',
    primaryText: '#FFFFFF',
    plum: '#4C5F86',
    success: '#286746',
    gold: '#9C6B24',
    border: '#D6E0EF',
    error: '#A53F3F',
    surfaceRaised: '#FFFFFF',
    scrim: 'rgba(20,18,15,0.56)',
    controlMuted: '#8B9AB0',
  },
  dark: {
    text: '#F3F6FC',
    background: '#111827',
    backgroundElement: '#1F2937',
    backgroundSelected: '#263B5E',
    textSecondary: '#B5C0D2',
    primary: '#8AB4FF',
    primaryText: '#101A2B',
    plum: '#AABEE7',
    success: '#A5C69C',
    gold: '#D5B768',
    border: '#3C4B62',
    error: '#E89A89',
    surfaceRaised: '#263244',
    scrim: 'rgba(0,0,0,0.68)',
    controlMuted: '#66758C',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Space = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 32,
  eight: 40,
  nine: 48,
} as const;

export const Radius = { small: 8, medium: 12, card: 20, large: 24, pill: 999 } as const;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 1120;
