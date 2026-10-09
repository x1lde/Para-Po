import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import type { ReactNode } from 'react';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

const paths = {
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z M9 3v15 M15 6v15"/>',
  pin: '<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  camera: '<path d="M14 4h-4L8 7H3v13h18V7h-5Z"/><circle cx="12" cy="13" r="4"/>',
  scan: '<path d="M4 8V4h4 M16 4h4v4 M20 16v4h-4 M8 20H4v-4 M7 12h10"/>',
  arrow: '<path d="M5 12h14 m-6-6 6 6-6 6"/>',
  external: '<path d="M7 17 17 7 M7 7h10v10"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  shield: '<path d="m12 3 8 4v6c0 5-8 8-8 8s-8-3-8-8V7Z m-4 9 3 3 5-6"/>',
  moon: '<path d="M20 14A9 9 0 0 1 10 4a9 9 0 1 0 10 10Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2 M12 21v2 M1 12h2 M21 12h2 M4 4l2 2 M18 18l2 2 M4 20l2-2 M18 6l2-2"/>',
  wifi: '<path d="M2 8a16 16 0 0 1 20 0 M5 12a11 11 0 0 1 14 0 M8 16a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r=".5"/>',
  book: '<path d="M12 5c-4-3-8-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-1-1-5-2-9 1Z M12 5v15"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  swap: '<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
  sparkle: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
  close: '<path d="m6 6 12 12 M6 18 18 6"/>',
} as const;
export function Icon({ name, size = 20, color }: { name: keyof typeof paths; size?: number; color?: string }) {
  const theme = useTheme();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color ?? theme.primary}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
  return <Image source={{ uri: `data:image/svg+xml,${encodeURIComponent(svg)}` }} style={{ width: size, height: size }} accessibilityElementsHidden />;
}
export const artwork = {
  warm: require('../../../assets/reference-ui/hero-warm.svg'),
  landmark: require('../../../assets/reference-ui/landmark.svg'),
  star: require('../../../assets/reference-ui/star.svg'), pin: require('../../../assets/reference-ui/pin.svg'),
  bus: require('../../../assets/reference-ui/bus.svg'), jeepney: require('../../../assets/reference-ui/jeepney.svg'),
  ejeep: require('../../../assets/reference-ui/ejeep.svg'), tricycle: require('../../../assets/reference-ui/tricycle.svg'),
  map: require('../../../assets/reference-ui/city-map.svg'),
  mapDark: require('../../../assets/reference-ui/city-map-dark.svg'),
};
export function Art({ name, size = 48 }: { name: keyof typeof artwork; size?: number }) {
  return <Image source={artwork[name]} style={{ width: size, height: size }} contentFit="contain" cachePolicy="memory-disk" accessibilityElementsHidden />;
}
export function Button({ children, onPress, disabled = false, icon, secondary = false }: {
  children: ReactNode; onPress: () => void; disabled?: boolean; icon?: keyof typeof paths; secondary?: boolean;
}) {
  const t = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [ui.button, { backgroundColor: secondary ? t.backgroundSelected : t.primary, opacity: disabled ? .45 : pressed ? .8 : 1 }]}>
    <ThemedText style={{ flex: 1, color: secondary ? t.primary : t.primaryText, fontWeight: '700' }}>{children}</ThemedText>
    {icon && <Icon name={icon} color={secondary ? t.primary : t.primaryText} />}
  </Pressable>;
}
export function Card({ style, ...props }: ViewProps) {
  const t = useTheme();
  return <View {...props} style={[ui.card, { backgroundColor: t.backgroundElement, borderColor: t.line, boxShadow: t.dark ? '0 5px 18px #00000016' : '0 5px 20px #24343B08' }, style]} />;
}
export function Page({ children }: { children: ReactNode }) {
  const { gutter } = useResponsiveLayout();
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[ui.page, { paddingHorizontal: gutter }]}>
    <View style={ui.pageInner}>{children}<Footer /></View>
  </ScrollView>;
}
export function Intro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  const { tablet, desktop } = useResponsiveLayout();
  const t = useTheme();
  return <View style={ui.intro}><View style={ui.row}><View style={[ui.dot, { backgroundColor: t.orange }]} /><ThemedText type="small" themeColor="textSecondary">{eyebrow}</ThemedText></View>
    <ThemedText type="title" accessibilityRole="header" style={{ letterSpacing: -1.8, fontSize: desktop ? 60 : tablet ? 52 : 40, lineHeight: desktop ? 70 : tablet ? 62 : 48 }}>{title}</ThemedText><ThemedText themeColor="textSecondary">{description}</ThemedText>
  </View>;
}
export function Footer() {
  const t = useTheme();
  return <View style={[ui.footer, { borderColor: t.line }]}><ThemedText type="small" themeColor="textSecondary">A little more local. A little less lost.</ThemedText><ThemedText type="small" themeColor="textSecondary">ParaPo! · Makati City</ThemedText></View>;
}
export const ui = StyleSheet.create({
  page: { flexGrow: 1, paddingTop: 32, paddingBottom: 24 }, pageInner: { width: '100%', maxWidth: 1200, alignSelf: 'center', gap: 28 },
  intro: { gap: 9 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, dot: { width: 7, height: 7, borderRadius: 4 },
  card: { padding: 20, borderRadius: 24, borderWidth: 1, gap: 16 },
  button: { minHeight: 54, paddingHorizontal: 19, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: 'pointer' },
  footer: { borderTopWidth: 1, paddingTop: 20, marginTop: 4, gap: 7, alignItems: 'center' },
});
