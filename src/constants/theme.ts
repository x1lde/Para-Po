import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1B2440',
    background: '#F4F6FB',
    backgroundElement: '#EDF2F9',
    backgroundSelected: '#E3EDFB',
    textSecondary: '#51607C',
    primary: '#2159A6',
    primaryText: '#FFFFFF',
    plum: '#3D5A99',
    success: '#286746',
    gold: '#9C6B24',
    border: '#D9E2F0',
    error: '#A53F3F',
    ring: '#2159A6',
    input: '#D9E2F0',
    danger: '#A53F3F',
    gps: '#7856C4',
    surfaceRaised: '#FFFFFF',
    scrim: 'rgba(20,18,15,0.56)',
    controlMuted: '#8B9AB0',
    accent: '#0369A1',
    onAccent: '#FFFFFF',
    hero: '#0F2740',
    onHero: '#FFFFFF',
    heroSecondary: '#CDDFEB',
    highlight: '#BAE6FD',
  },
  dark: {
    text: '#F3F6FC',
    background: '#0F1626',
    backgroundElement: '#232F44',
    backgroundSelected: '#27406B',
    textSecondary: '#B7C2D6',
    primary: '#8AB4FF',
    primaryText: '#101A2B',
    plum: '#A9C0F0',
    success: '#A5C69C',
    gold: '#D5B768',
    border: '#38475F',
    error: '#E89A89',
    ring: '#8AB4FF',
    input: '#38475F',
    danger: '#E89A89',
    gps: '#A78BFA',
    surfaceRaised: '#1A2435',
    scrim: 'rgba(0,0,0,0.68)',
    controlMuted: '#66758C',
    accent: '#7DD3FC',
    onAccent: '#0F172A',
    hero: '#152E48',
    onHero: '#FFFFFF',
    heroSecondary: '#CDDFEB',
    highlight: '#BAE6FD',
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
export const MaxContentWidth = 1200;
