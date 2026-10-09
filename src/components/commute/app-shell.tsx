import { router, usePathname } from 'expo-router';
import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useEffect, useRef, useState } from 'react';
import { EASE_OUT, PressScale, SPRING } from './motion';
import { requestScrollToTop } from './scroll-top';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../themed-text';
import { BrandLogo, Icon } from './ui';
import { useTheme } from '@/hooks/use-theme';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

const navigation = [
  { name: 'ride', href: '/', label: 'Find a ride', mobile: 'Ride', icon: 'compass' },
  { name: 'map', href: '/map', label: 'Explore map', mobile: 'Map', icon: 'map' },
  { name: 'guide', href: '/explore', label: 'Landmark guide', mobile: 'Guide', icon: 'book' },
] as const;
function TabButton({ isFocused, children, icon, mobile, ...props }: TabTriggerSlotProps & { icon: 'compass' | 'map' | 'book'; mobile: boolean }) {
  const t = useTheme();
  const reduced = useReducedMotion();
  // The indicator eases in from the centre (no overshoot); the newly active icon gives one soft pulse.
  const grow = useSharedValue(isFocused ? 1 : 0);
  const pop = useSharedValue(1);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current || reduced) { firstRun.current = false; grow.value = isFocused ? 1 : 0; return; }
    grow.value = withTiming(isFocused ? 1 : 0, EASE_OUT);
    if (isFocused) pop.value = withSequence(withTiming(1.1, { duration: 140 }), withSpring(1, SPRING));
  }, [isFocused, reduced, grow, pop]);
  const indicator = useAnimatedStyle(() => ({ transform: [{ scaleX: grow.value }], opacity: grow.value }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return <Pressable {...props} accessibilityRole="tab" accessibilityState={{ selected: isFocused }}
    style={({ pressed }) => [styles.tab, mobile && styles.mobileTab, { opacity: pressed ? .65 : 1, backgroundColor: isFocused ? t.backgroundSelected : 'transparent' }]}>
    <Animated.View style={[styles.indicator, mobile ? styles.indicatorTop : styles.indicatorBottom, { backgroundColor: t.primary }, indicator]} />
    <Animated.View style={iconStyle}><Icon name={icon} color={isFocused ? t.primary : t.textSecondary} size={19} /></Animated.View>
    <ThemedText type="small" style={{ color: isFocused ? t.primary : t.textSecondary, fontWeight: isFocused ? '600' : '500', fontSize: mobile ? 13 : 16 }}>{children}</ThemedText>
  </Pressable>;
}
/** Sun/moon button: the icon turns a half-circle with each switch. */
function ThemeToggle({ dark, onToggle, color, line }: { dark: boolean; onToggle: () => void; color: string; line: string }) {
  const reduced = useReducedMotion();
  const turn = useSharedValue(dark ? 180 : 0);
  useEffect(() => {
    turn.value = reduced ? (dark ? 180 : 0) : withSpring(dark ? 180 : 0, SPRING);
  }, [dark, reduced, turn]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  return <PressScale accessibilityRole="button" accessibilityLabel={`Switch to ${dark ? 'light' : 'dark'} mode`} onPress={onToggle}
    hoverLift={false} style={[styles.theme, { borderColor: line }]}>
    <Animated.View style={spin}><Icon name={dark ? 'sun' : 'moon'} color={color} /></Animated.View>
  </PressScale>;
}
export default function AppTabs() {
  const t = useTheme();
  const pathname = usePathname();
  const [logoHovered, setLogoHovered] = useState(false);
  // On home the logo scrolls the page back to the top; elsewhere it navigates home.
  const goHome = () => { if (pathname === '/') requestScrollToTop(); else router.navigate('/'); };
  const { desktop, compact, gutter } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const links = (mobile: boolean) => navigation.map((tab) => <TabTrigger name={tab.name} key={tab.name} asChild>
    <TabButton icon={tab.icon} mobile={mobile}>{mobile ? tab.mobile : tab.label}</TabButton>
  </TabTrigger>);
  return <Tabs style={[styles.page, { backgroundColor: t.background }]}>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ backgroundColor: t.backgroundElement }}>
      <View style={[styles.header, { height: desktop ? 76 : 64, paddingHorizontal: gutter }]}>
        <PressScale accessibilityRole="button" accessibilityLabel="ParaPo! home" hoverLift={false} wrapperStyle={styles.brandWrap}
          onHoverIn={() => setLogoHovered(true)} onHoverOut={() => setLogoHovered(false)} onPress={goHome} style={styles.brand}>
          <BrandLogo size={desktop ? 46 : compact ? 34 : 40} hovered={logoHovered} />
        </PressScale>
        {desktop && <View style={styles.nav}>{links(false)}</View>}
        <View style={styles.actions}>
          {desktop && <View style={[styles.pill, { backgroundColor: t.greenSoft }]}><Icon name="shield" size={15} color={t.green} /><ThemedText type="small" style={{ color: t.green, fontSize: 13 }}>Works offline</ThemedText></View>}
          <ThemeToggle dark={t.dark} onToggle={t.toggle} color={t.textSecondary} line={t.line} />
        </View>
      </View>
      <View style={styles.ribbon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={{ flex: 5, backgroundColor: t.teal }} /><View style={{ flex: 3, backgroundColor: t.yellow }} /><View style={{ flex: 1, backgroundColor: t.orange }} />
      </View>
    </SafeAreaView>
    <TabSlot style={styles.slot} />
    {!desktop && <View style={[styles.bottom, { paddingBottom: Math.max(9, insets.bottom), backgroundColor: t.backgroundElement, borderColor: t.line }]}>{links(true)}</View>}
    <TabList style={{ display: 'none' }}>
      {navigation.map((tab) => <TabTrigger key={tab.name} name={tab.name} href={tab.href} />)}
      <TabTrigger name="camera" href="/camera" />
      <TabTrigger name="progress" href="/progress" />
    </TabList>
  </Tabs>;
}
const styles = StyleSheet.create({
  page: { flex: 1 }, slot: { flex: 1, minHeight: 0 },
  // No flexWrap: a wrapped row aligns its line to the top, which left the logo and buttons hugging the top edge.
  header: { width: '100%', maxWidth: 1408, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', minHeight: 48, flexShrink: 1 }, brandWrap: { flexShrink: 1 },
  indicator: { position: 'absolute', left: 16, right: 16, height: 3, borderRadius: 3 },
  indicatorTop: { top: 0 }, indicatorBottom: { bottom: 0 },
  ribbon: { height: 4, flexDirection: 'row' }, nav: { flexDirection: 'row', gap: 6 }, actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  pill: { minHeight: 40, paddingHorizontal: 11, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 5 },
  theme: { width: 44, height: 44, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tab: { minHeight: 48, cursor: 'pointer', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 17, gap: 9 },
  mobileTab: { flex: 1, flexDirection: 'column', gap: 3, minHeight: 53, marginHorizontal: 6, paddingVertical: 6 },
  bottom: { flexDirection: 'row', paddingTop: 9, paddingHorizontal: 20, borderTopWidth: 1 },
});
