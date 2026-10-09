import '@/global.css';
import { Platform } from 'react-native';

/** ParaPo!'s visual identity. Warm accents, readable ink, and confident teal actions. */
export const Brand = {
  yellow: '#F9C846', teal: '#117C83', orange: '#FF6B35', charcoal: '#24343B', cream: '#FFF9E9',
} as const;

export const Colors = {
  light: {
    text: Brand.charcoal, background: Brand.cream, backgroundElement: '#FFFFFF',
    backgroundSelected: '#E2F1F0', textSecondary: '#4B5E63', primary: Brand.teal,
    primaryText: '#FFFFFF', line: '#EDE3CC', soft: '#FFF7E6', green: '#17675D',
    greenSoft: '#E5F2EA', gold: '#775300', goldSoft: '#FFF0BB',
    yellow: Brand.yellow, orange: Brand.orange, teal: Brand.teal,
    hero: Brand.yellow, onHero: Brand.charcoal, heroSecondary: '#40514D', highlight: '#FFE18A',
    // Shared semantic roles keep auxiliary screens and map controls on the same identity.
    plum: Brand.teal, success: '#17675D', border: '#EDE3CC', error: '#B23F25',
    ring: Brand.teal, input: '#EDE3CC', danger: '#B23F25', gps: '#B34B20',
    surfaceRaised: '#FFFFFF', scrim: '#152E36A6', controlMuted: '#728485',
    accent: Brand.teal, onAccent: '#FFFFFF', onYellow: Brand.charcoal,
  },
  dark: {
    text: Brand.cream, background: '#15262C', backgroundElement: Brand.charcoal,
    backgroundSelected: '#1D4D51', textSecondary: '#C3D3D0', primary: '#6FD2D2',
    primaryText: '#12232A', line: '#3A5560', soft: '#2B3F46', green: '#A5DBC3',
    greenSoft: '#264B40', gold: Brand.yellow, goldSoft: '#51472A',
    yellow: Brand.yellow, orange: '#FF9674', teal: '#79D7D7',
    hero: Brand.yellow, onHero: Brand.charcoal, heroSecondary: '#40514D', highlight: '#FFE18A',
    plum: '#79D7D7', success: '#A5DBC3', border: '#426067', error: '#FFAF96',
    ring: '#79D7D7', input: '#426067', danger: '#FFAF96', gps: '#FF9674',
    surfaceRaised: '#2A4047', scrim: '#071317B3', controlMuted: '#91AAA9',
    accent: '#79D7D7', onAccent: '#15262C', onYellow: Brand.charcoal,
  },
} as const;
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  sans: 'Inter-Regular', semibold: 'Inter-SemiBold', bold: 'Inter-Bold', display: 'Inter-ExtraBold',
  serif: Platform.OS === 'web' ? 'Georgia, serif' : 'serif', rounded: 'Inter-Bold',
  mono: Platform.OS === 'ios' ? 'ui-monospace' : 'monospace',
};
export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;
export const Space = { one: 4, two: 8, three: 12, four: 16, five: 20, six: 24, seven: 32, eight: 40, nine: 48 } as const;
export const Radius = { small: 8, medium: 12, card: 24, large: 28, pill: 999 } as const;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 1200;
