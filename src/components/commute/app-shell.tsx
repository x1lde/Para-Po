import { router } from 'expo-router';
import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
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
  return <Pressable {...props} accessibilityRole="tab" accessibilityState={{ selected: isFocused }}
    style={({ pressed }) => [styles.tab, mobile && styles.mobileTab, { opacity: pressed ? .65 : 1, backgroundColor: isFocused ? t.backgroundSelected : 'transparent' }]}>
    <Icon name={icon} color={isFocused ? t.primary : t.textSecondary} size={19} />
    <ThemedText type="small" style={{ color: isFocused ? t.primary : t.textSecondary, fontWeight: isFocused ? '600' : '500', fontSize: mobile ? 13 : 16 }}>{children}</ThemedText>
  </Pressable>;
}
export default function AppTabs() {
  const t = useTheme();
  const { desktop, compact, gutter } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const links = (mobile: boolean) => navigation.map((tab) => <TabTrigger name={tab.name} key={tab.name} asChild>
    <TabButton icon={tab.icon} mobile={mobile}>{mobile ? tab.mobile : tab.label}</TabButton>
  </TabTrigger>);
  return <Tabs style={[styles.page, { backgroundColor: t.background }]}>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ backgroundColor: t.backgroundElement }}>
      <View style={[styles.header, { height: desktop ? 76 : 64, paddingHorizontal: gutter }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="ParaPo! home" onPress={() => router.navigate('/')} style={({ pressed }) => [styles.brand, { opacity: pressed ? .65 : 1 }]}>
          <BrandLogo size={desktop ? 46 : compact ? 34 : 40} />
        </Pressable>
        {desktop && <View style={styles.nav}>{links(false)}</View>}
        <View style={styles.actions}>
          {desktop && <View style={[styles.pill, { backgroundColor: t.greenSoft }]}><Icon name="shield" size={15} color={t.green} /><ThemedText type="small" style={{ color: t.green, fontSize: 13 }}>Works offline</ThemedText></View>}
          <Pressable accessibilityRole="button" accessibilityLabel={`Switch to ${t.dark ? 'light' : 'dark'} mode`} onPress={t.toggle} style={({ pressed }) => [styles.theme, { borderColor: t.line, opacity: pressed ? .65 : 1 }]}><Icon name={t.dark ? 'sun' : 'moon'} color={t.textSecondary} /></Pressable>
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
  brand: { flexDirection: 'row', alignItems: 'center', minHeight: 48, flexShrink: 1 },
  ribbon: { height: 4, flexDirection: 'row' }, nav: { flexDirection: 'row', gap: 6 }, actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  pill: { minHeight: 40, paddingHorizontal: 11, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 5 },
  theme: { width: 44, height: 44, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tab: { minHeight: 48, cursor: 'pointer', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 17, gap: 9 },
  mobileTab: { flex: 1, flexDirection: 'column', gap: 3, minHeight: 53, marginHorizontal: 6, paddingVertical: 6 },
  bottom: { flexDirection: 'row', paddingTop: 9, paddingHorizontal: 20, borderTopWidth: 1 },
});
