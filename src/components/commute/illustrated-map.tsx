import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { artwork, Icon } from './ui';

export function IllustratedMap({ expanded = false }: { expanded?: boolean }) {
  const t = useTheme();
  return <View>
    <View style={[styles.map, { height: expanded ? 360 : 520, borderColor: t.line }]}>
      <Image source={t.dark ? artwork.mapDark : artwork.map} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="Illustrated Makati cityscape, not a navigation map" />
      <View style={styles.top}><View style={[styles.location, { backgroundColor: t.backgroundElement }]}><Icon name="pin" size={16} /><ThemedText type="smallBold">Makati City</ThemedText><ThemedText type="small" themeColor="textSecondary">PH</ThemedText></View>
        <View style={[styles.tag, { backgroundColor: t.greenSoft }]}><ThemedText type="small" style={{ color: t.green, fontSize: 12 }}>City illustration</ThemedText></View></View>
      <View style={[styles.compass, { backgroundColor: t.backgroundElement }]}><Icon name="compass" size={25} /><ThemedText type="small">N</ThemedText></View>
      <View style={[styles.caption, { backgroundColor: t.backgroundElement }]}><ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>Illustrated preview · Open map for journey guidance</ThemedText></View>
    </View>
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.underbar, { opacity: pressed ? .7 : 1 }]} onPress={() => router.navigate('/map')}><ThemedText type="small" themeColor="textSecondary">Get to know your city.</ThemedText><View style={styles.link}><ThemedText type="link">Explore map</ThemedText><Icon name="external" size={16} /></View></Pressable>
  </View>;
}
const styles = StyleSheet.create({ map: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, backgroundColor: '#f0f1f2' }, top: { position: 'absolute', top: 18, left: 18, right: 18, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }, location: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8 }, tag: { padding: 8, borderRadius: 8 }, compass: { position: 'absolute', top: 84, right: 27, alignItems: 'center', padding: 5, borderRadius: 8 }, caption: { position: 'absolute', bottom: 14, left: 14, right: 14, padding: 7, borderRadius: 5 }, underbar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 6 }, link: { flexDirection: 'row', alignItems: 'center', gap: 5 } });
