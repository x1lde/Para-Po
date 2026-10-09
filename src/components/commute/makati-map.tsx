import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Icon } from './ui';
import { MakatiMapSurface } from './makati-map-surface';
import { Appear } from './motion';

/** Map card for Makati: the live MapLibre map of the supported landmarks, with the same frame as before. */
export function MakatiMap({ expanded = false }: { expanded?: boolean }) {
  const t = useTheme();
  return <View>
    <Appear delay={120}><View style={[styles.map, { height: expanded ? 360 : 520, borderColor: t.line, backgroundColor: t.soft }]}>
      <MakatiMapSurface />
      <View style={styles.top} pointerEvents="none">
        <View style={[styles.location, { backgroundColor: t.backgroundElement }]}><Icon name="pin" size={16} /><ThemedText type="smallBold">Makati City</ThemedText><ThemedText type="small" themeColor="textSecondary">PH</ThemedText></View>
      </View>
    </View></Appear>
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.underbar, { opacity: pressed ? .7 : 1 }]} onPress={() => router.navigate('/map')}><ThemedText type="small" themeColor="textSecondary">Get to know your city.</ThemedText><View style={styles.link}><ThemedText type="link">Explore map</ThemedText><Icon name="external" size={16} /></View></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  map: { borderRadius: 24, overflow: 'hidden', borderWidth: 1 },
  top: { position: 'absolute', top: 18, left: 18, right: 18, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8 },
  underbar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 6 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
