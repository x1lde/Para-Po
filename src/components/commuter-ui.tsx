import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useNetworkState } from 'expo-network';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, useWindowDimensions, useColorScheme, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  clock: { ios: 'clock', android: 'schedule', web: 'schedule' },
  walk: { ios: 'figure.walk', android: 'directions_walk', web: 'directions_walk' },
  flame: { ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' },
  route: { ios: 'point.topleft.down.to.point.bottomright.curvepath', android: 'alt_route', web: 'alt_route' },
  lock: { ios: 'lock.fill', android: 'lock', web: 'lock' },
  shield: { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' },
  alert: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  flag: { ios: 'flag.fill', android: 'flag', web: 'flag' },
  building: { ios: 'building.2.fill', android: 'apartment', web: 'apartment' },
  park: { ios: 'tree.fill', android: 'park', web: 'park' },
  trophy: { ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
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
    <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }, compactHeader ? styles.compactHeader : null, wideWeb ? styles.wideWebHeader : null]}>
      {!wideWeb ? (
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
            <AppIcon name="tram" size={20} color={colors.primaryText} />
          </View>
          <View style={styles.brandCopy}>
            <Text accessibilityRole="header" style={[styles.brandName, { color: colors.text }]}>Para po!</Text>
            <Text style={[styles.brandCaption, { color: colors.textSecondary }]}>Your Makati ride companion</Text>
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
  return <Badge variant="outline" icon={icon} iconColor={color}>{label}</Badge>;
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

export type ButtonVariant = 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';

export function Button({
  label,
  onPress,
  disabled = false,
  variant = 'default',
  size = 'default',
  fullWidth = false,
  icon,
  iconPosition = 'start',
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: 'sm' | 'default' | 'lg';
  fullWidth?: boolean;
  icon?: AppIconName;
  iconPosition?: 'start' | 'end';
  accessibilityLabel?: string;
}) {
  const colors = useAppColors();
  const [focused, setFocused] = useState(false);
  const isLink = variant === 'link';
  const minHeight = size === 'lg' ? 56 : size === 'sm' ? 48 : 52;

  let background: string = 'transparent';
  let foreground: string = colors.text;
  let borderColor: string = 'transparent';
  switch (variant) {
    case 'default':
      background = disabled ? colors.backgroundSelected : colors.primary;
      foreground = disabled ? colors.textSecondary : colors.primaryText;
      break;
    case 'secondary':
      background = colors.backgroundElement;
      foreground = disabled ? colors.textSecondary : colors.text;
      break;
    case 'outline':
      background = 'transparent';
      foreground = disabled ? colors.textSecondary : colors.text;
      borderColor = colors.border;
      break;
    case 'ghost':
      background = 'transparent';
      foreground = disabled ? colors.textSecondary : colors.text;
      break;
    case 'destructive':
      background = `${colors.danger}1A`;
      foreground = disabled ? colors.textSecondary : colors.danger;
      break;
    case 'link':
      background = 'transparent';
      foreground = disabled ? colors.textSecondary : colors.primary;
      break;
  }

  const iconSize = isLink ? 16 : 18;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.button,
        isLink ? styles.buttonLink : { minHeight, borderRadius: Radius.medium },
        { backgroundColor: background, borderColor },
        isLink ? null : styles.buttonBordered,
        fullWidth ? styles.fullWidth : null,
        focused && !disabled ? { borderWidth: 3, borderColor: colors.gold } : null,
        pressed && !disabled ? styles.pressed : null,
      ]}>
      {icon && iconPosition === 'start' ? <AppIcon name={icon} size={iconSize} color={foreground} /> : null}
      <Text style={[isLink ? styles.linkLabel : styles.buttonLabel, { color: foreground }]}>{label}</Text>
      {icon && iconPosition === 'end' ? <AppIcon name={icon} size={iconSize} color={foreground} /> : null}
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  icon,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  icon?: AppIconName;
  accessibilityLabel?: string;
}) {
  return <Button label={label} onPress={onPress} disabled={disabled} icon={icon} variant="default" size="lg" accessibilityLabel={accessibilityLabel} />;
}

export function Card({ children, accent = false, style }: { children: React.ReactNode; accent?: boolean; style?: object }) {
  const colors = useAppColors();
  return (
    <View style={[styles.card, { backgroundColor: accent ? colors.backgroundSelected : colors.surfaceRaised, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}

export function CardHeader({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.cardHeader, style]}>{children}</View>;
}

export function CardTitle({ children, style }: { children: React.ReactNode; style?: object }) {
  const colors = useAppColors();
  return <Text style={[typography.sectionTitle, { color: colors.text }, style]}>{children}</Text>;
}

export function CardDescription({ children, style }: { children: React.ReactNode; style?: object }) {
  const colors = useAppColors();
  return <Text style={[typography.small, { color: colors.textSecondary }, style]}>{children}</Text>;
}

export function CardContent({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.cardContent, style]}>{children}</View>;
}

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'gold' | 'success' | 'destructive';

export function Badge({
  children,
  variant = 'default',
  icon,
  iconColor,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: AppIconName;
  iconColor?: string;
  accessibilityLabel?: string;
}) {
  const colors = useAppColors();
  const palette: Record<BadgeVariant, { background: string; foreground: string; border: string }> = {
    default: { background: colors.primary, foreground: colors.primaryText, border: colors.primary },
    secondary: { background: colors.backgroundElement, foreground: colors.text, border: colors.backgroundElement },
    outline: { background: 'transparent', foreground: colors.text, border: colors.border },
    gold: { background: colors.gold, foreground: '#FFFFFF', border: colors.gold },
    success: { background: colors.success, foreground: '#FFFFFF', border: colors.success },
    destructive: { background: `${colors.danger}1A`, foreground: colors.danger, border: 'transparent' },
  };
  const tokens = palette[variant];
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.badge, { backgroundColor: tokens.background, borderColor: tokens.border }]}>
      {icon ? <AppIcon name={icon} size={13} color={iconColor ?? tokens.foreground} /> : null}
      <Text style={[styles.badgeText, { color: tokens.foreground }]}>{children}</Text>
    </View>
  );
}

export function ToggleChip({ label, active, onPress, icon }: { label: string; active: boolean; onPress?: () => void; icon?: AppIconName }) {
  const colors = useAppColors();
  const [focused, setFocused] = useState(false);
  const background = active ? colors.primary : colors.backgroundElement;
  const foreground = active ? colors.primaryText : colors.text;
  const borderColor = active ? colors.primary : colors.border;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      disabled={!onPress}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.toggleChip, { backgroundColor: background, borderColor }, focused ? { borderWidth: 3, borderColor: colors.gold } : null]}>
      {icon ? <AppIcon name={icon} size={15} color={foreground} /> : null}
      <Text style={[styles.toggleChipLabel, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, copy, actionLabel, onAction, icon, style }: { title: string; copy: string; actionLabel?: string; onAction?: () => void; icon?: AppIconName; style?: object }) {
  const colors = useAppColors();
  return (
    <View style={[styles.emptyState, { backgroundColor: colors.backgroundElement }, style]}>
      {icon ? <AppIcon name={icon} size={34} color={colors.plum} /> : null}
      <Text style={[styles.emptyStateTitle, { color: colors.text }]}>{title}</Text>
      <BodyText style={styles.emptyStateCopy}>{copy}</BodyText>
      {actionLabel && onAction ? <Button label={actionLabel} variant="outline" onPress={onAction} /> : null}
    </View>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const colors = useAppColors();
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={[styles.progressTrack, { backgroundColor: colors.backgroundElement }]}>
      <View style={[styles.progressFill, { width: `${clamped}%`, backgroundColor: colors.primary }]} />
    </View>
  );
}

export function Separator({ style }: { style?: object }) {
  const colors = useAppColors();
  return <View accessibilityRole="none" style={[styles.separator, { backgroundColor: colors.border }, style]} />;
}

export function SearchField({ placeholder, value, onChangeText, accessibilityLabel }: { placeholder: string; value: string; onChangeText: (value: string) => void; accessibilityLabel: string }) {
  const colors = useAppColors();
  return (
    <View style={[styles.searchField, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
      <AppIcon name="search" size={18} color={colors.textSecondary} />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        style={[styles.searchInput, { color: colors.text }]}
      />
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

export function RecoveryLink({ label, route }: { label: string; route: '/' }) {
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
  display: { fontSize: 40, lineHeight: 46, fontWeight: '800', letterSpacing: -0.8 },
  pageTitle: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.6 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3 },
  sectionTitle: { fontSize: 20, lineHeight: 27, fontWeight: '700', letterSpacing: -0.2 },
  heading: { fontSize: 17, lineHeight: 23, fontWeight: '800' },
  body: { fontSize: 16, lineHeight: 24 },
  small: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
  kicker: { fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  score: { fontSize: 56, lineHeight: 64, fontWeight: '800', letterSpacing: -1 },
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
    borderBottomWidth: 1,
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
  scrollContent: { paddingBottom: 128, flexGrow: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Space.four, gap: Space.four },
  kicker: { fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  card: { borderWidth: 1, borderRadius: Radius.card, padding: Space.four, gap: Space.three },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.two },
  cardContent: { gap: Space.three },
  bodyText: { fontSize: 16, lineHeight: 24 },
  button: { minHeight: 52, borderRadius: Radius.medium, paddingVertical: Space.three, paddingHorizontal: Space.four, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: Space.two },
  buttonBordered: { borderWidth: 1 },
  buttonLink: { minHeight: 48, paddingVertical: Space.two, paddingHorizontal: 0, backgroundColor: 'transparent' },
  fullWidth: { alignSelf: 'stretch' },
  buttonLabel: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  linkLabel: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  badge: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.one, paddingHorizontal: Space.two, paddingVertical: 3, borderRadius: Radius.pill, borderWidth: 1 },
  badgeText: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  toggleChip: { minHeight: 48, borderRadius: Radius.pill, borderWidth: 1, paddingHorizontal: Space.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.one },
  toggleChipLabel: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  emptyState: { borderRadius: Radius.medium, padding: Space.four, alignItems: 'center', gap: Space.two },
  emptyStateTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  emptyStateCopy: { textAlign: 'center', maxWidth: 380 },
  progressTrack: { height: 8, borderRadius: Radius.pill, overflow: 'hidden', width: '100%' },
  progressFill: { height: '100%', borderRadius: Radius.pill },
  separator: { height: 1, width: '100%' },
  searchField: { minHeight: 52, borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: Space.three, flexDirection: 'row', alignItems: 'center', gap: Space.two },
  searchInput: { flex: 1, minHeight: 48, fontSize: 16 },
  routeField: { minHeight: 72, borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: Space.three, paddingVertical: Space.two, flexDirection: 'row', alignItems: 'center', gap: Space.three },
  fieldIcon: { width: 42, height: 42, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  fieldCopy: { flex: 1, gap: 3 },
  fieldLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  fieldValue: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  recoveryLink: { minHeight: 48, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: Space.two },
  recoveryText: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  vehicleArt: { alignItems: 'center', justifyContent: 'center', gap: 1, width: 48 },
  pixelRow: { flexDirection: 'row', gap: 1 },
  pixel: { width: 3, height: 3 },
  pressed: { opacity: 0.72 },
});
