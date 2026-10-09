import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useNetworkState } from 'expo-network';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, useWindowDimensions, useColorScheme, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, Radius, Space } from '@/constants/theme';

export function useAppColors() {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}

const iconNames = {
  wifi: { ios: 'wifi', android: 'wifi', web: 'wifi' },
  map: { ios: 'map', android: 'map', web: 'map' },
  tram: { ios: 'tram.fill', android: 'tram', web: 'tram' },
  arrowRight: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_right' },
  arrowLeft: { ios: 'arrow.left', android: 'arrow_back', web: 'arrow_left' },
  camera: { ios: 'camera.viewfinder', android: 'photo_camera', web: 'photo_camera' },
  location: { ios: 'location', android: 'location_on', web: 'location_on' },
  destination: { ios: 'flag.fill', android: 'flag', web: 'flag' },
  info: { ios: 'info.circle', android: 'info', web: 'info' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  locationOff: { ios: 'mappin.slash', android: 'location_off', web: 'location_off' },
  viewfinder: { ios: 'viewfinder', android: 'center_focus_strong', web: 'center_focus_strong' },
  leaf: { ios: 'leaf', android: 'eco', web: 'eco' },
  wifiOff: { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' },
  chart: { ios: 'chart.bar', android: 'bar_chart', web: 'bar_chart' },
} satisfies Record<string, SymbolViewProps['name']>;

export type AppIconName = keyof typeof iconNames;

export function AppIcon({ name, size, color }: { name: AppIconName; size: number; color: string }) {
  return <SymbolView name={iconNames[name]} size={size} tintColor={color} />;
}

export function AppHeader() {
  const colors = useAppColors();
  const { width } = useWindowDimensions();
  const compactHeader = width < 360;
  const wideWeb = Platform.OS === 'web' && width >= 1024;
  const network = useNetworkState();
  const networkText = network.isInternetReachable === true
    ? 'Online'
    : network.isInternetReachable === false || network.isConnected === false
      ? 'Offline'
      : network.isConnected === true
        ? 'Connected'
        : 'Checking';
  const networkColor = networkText === 'Online' ? colors.success : networkText === 'Offline' ? colors.error : colors.gold;

  return (
    <View style={[styles.header, compactHeader ? styles.compactHeader : null, wideWeb ? styles.wideWebHeader : null]}>
      {!wideWeb ? (
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
            <AppIcon name="tram" size={20} color={colors.primaryText} />
          </View>
          <View style={styles.brandCopy}>
            <Text accessibilityRole="header" style={[styles.brandName, { color: colors.text }]}>Para po!</Text>
            <Text style={[styles.brandCaption, { color: colors.textSecondary }]}>Your Makati ride guide</Text>
          </View>
        </View>
      ) : null}
      <View style={[styles.statusStack, compactHeader ? styles.compactStatusStack : null]} accessibilityLabel={`Network ${networkText}. Map requires internet; offline maps are not downloaded.`}>
        <StatusPill icon="wifi" label={networkText} color={networkColor} />
        <StatusPill icon="map" label="Online map only" color={colors.textSecondary} />
      </View>
    </View>
  );
}

function StatusPill({ icon, label, color }: { icon: AppIconName; label: string; color: string }) {
  const colors = useAppColors();
  return (
    <View style={[styles.statusPill, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
      <AppIcon name={icon} size={13} color={color} />
      <Text style={[styles.statusText, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

export function ScreenFrame({ children }: { children: React.ReactNode }) {
  const colors = useAppColors();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function Kicker({ children }: { children: React.ReactNode }) {
  const colors = useAppColors();
  return <Text style={[styles.kicker, { color: colors.plum }]}>{children}</Text>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  icon,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  icon?: AppIconName;
}) {
  const colors = useAppColors();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: disabled ? colors.backgroundSelected : colors.primary },
        focused && !disabled ? { borderWidth: 3, borderColor: colors.gold } : null,
        pressed && !disabled ? styles.pressed : null,
      ]}>
      {icon ? <AppIcon name={icon} size={18} color={disabled ? colors.textSecondary : colors.primaryText} /> : null}
      <Text style={[styles.primaryLabel, { color: disabled ? colors.textSecondary : colors.primaryText }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  const colors = useAppColors();
  return (
    <View style={[styles.card, { backgroundColor: accent ? colors.backgroundSelected : colors.surfaceRaised, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

export function BodyText({ children, style }: { children: React.ReactNode; style?: object }) {
  const colors = useAppColors();
  return <Text style={[styles.bodyText, { color: colors.textSecondary }, style]}>{children}</Text>;
}

export function RouteField({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value?: string;
  icon: AppIconName;
  onPress: () => void;
}) {
  const colors = useAppColors();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${value ?? 'Choose a landmark'}`}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.routeField, { borderColor: colors.border, backgroundColor: colors.background }, focused ? { borderWidth: 3, borderColor: colors.gold } : null, pressed && styles.pressed]}>
      <View style={[styles.fieldIcon, { backgroundColor: colors.backgroundSelected }]}>
        <AppIcon name={icon} size={17} color={colors.primary} />
      </View>
      <View style={styles.fieldCopy}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.fieldValue, { color: value ? colors.text : colors.textSecondary }]}>{value ?? 'Choose a landmark'}</Text>
      </View>
      <AppIcon name="chevronRight" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

export function RecoveryLink({ label, route }: { label: string; route: '/'; }) {
  const router = useRouter();
  const colors = useAppColors();
  return (
    <Pressable accessibilityRole="button" onPress={() => router.replace(route)} style={styles.recoveryLink}>
      <Text style={[styles.recoveryText, { color: colors.primary }]}>{label}</Text>
      <AppIcon name="arrowRight" size={15} color={colors.primary} />
    </Pressable>
  );
}

const vehiclePixels: Record<string, string[]> = {
  Jeepney: ['  PPPPPP  ', ' PPPPPPPP ', 'PGGPPPGGP', 'PPPPPPPPPP', '  W    W  '],
  'E-jeep': ['   PPPP   ', '  PPPPPPP ', ' PWWWWWWP ', ' PPPPPPPP ', '  W    W  '],
  Tricycle: ['   PP     ', '  PPPPP   ', ' PPPPPPPT ', '   PPPPTT ', '   W  W   '],
  Bus: [' PPPPPPPP ', 'PWWWWWWWWP', 'PPPPPPPPPP', '  W    W  '],
};

export function VehiclePixelArt({ mode }: { mode: keyof typeof vehiclePixels }) {
  const colors = useAppColors();
  const colorFor = (pixel: string) => {
    if (pixel === 'P') return colors.primary;
    if (pixel === 'G') return colors.gold;
    if (pixel === 'T') return colors.plum;
    if (pixel === 'W') return colors.textSecondary;
    return 'transparent';
  };

  return (
    <View accessibilityRole="image" accessibilityLabel={`${mode} pixel art`} style={styles.vehicleArt}>
      {vehiclePixels[mode].map((row, rowIndex) => (
        <View key={`${mode}-${rowIndex}`} style={styles.pixelRow}>
          {Array.from(row).map((pixel, pixelIndex) => (
            <View key={`${rowIndex}-${pixelIndex}`} style={[styles.pixel, { backgroundColor: colorFor(pixel) }]} />
          ))}
        </View>
      ))}
    </View>
  );
}

export const typography = StyleSheet.create({
  pageTitle: { fontSize: 36, lineHeight: 42, fontWeight: '700', letterSpacing: -0.7 },
  sectionTitle: { fontSize: 20, lineHeight: 27, fontWeight: '700', letterSpacing: -0.2 },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    minHeight: 76,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Space.four,
    paddingVertical: Space.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.three,
  },
  compactHeader: { minHeight: 104, flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: Space.two, paddingVertical: Space.two },
  wideWebHeader: { minHeight: 116, paddingTop: 88, justifyContent: 'flex-end' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Space.three, flexShrink: 1 },
  brandMark: { width: 42, height: 42, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  brandCopy: { gap: 1 },
  brandName: { fontSize: 20, lineHeight: 24, fontWeight: '800', letterSpacing: -0.3 },
  brandCaption: { fontSize: 12, lineHeight: 16 },
  statusStack: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: Space.two, flexShrink: 1 },
  compactStatusStack: { justifyContent: 'flex-start' },
  statusPill: { minHeight: 36, borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Space.three, flexDirection: 'row', alignItems: 'center', gap: Space.two },
  statusText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  scrollContent: { paddingBottom: 128, flexGrow: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Space.four, gap: Space.four },
  kicker: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: Radius.card, padding: Space.four, gap: Space.three },
  bodyText: { fontSize: 16, lineHeight: 24 },
  routeField: { minHeight: 72, borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: Space.three, paddingVertical: Space.two, flexDirection: 'row', alignItems: 'center', gap: Space.three },
  fieldIcon: { width: 42, height: 42, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  fieldCopy: { flex: 1, gap: 3 },
  fieldLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  fieldValue: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  primaryButton: { minHeight: 56, borderRadius: Radius.medium, paddingVertical: Space.three, paddingHorizontal: Space.four, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: Space.two },
  primaryLabel: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  recoveryLink: { minHeight: 48, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: Space.two },
  recoveryText: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  vehicleArt: { alignItems: 'center', justifyContent: 'center', gap: 1, width: 48 },
  pixelRow: { flexDirection: 'row', gap: 1 },
  pixel: { width: 3, height: 3 },
  pressed: { opacity: 0.72 },
});
