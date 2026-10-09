import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabTriggerSlotProps,
  type TabListProps,
} from 'expo-router/ui';
import { useState } from 'react';
import { Pressable, useColorScheme, View, StyleSheet, useWindowDimensions } from 'react-native';

import { AppIcon, type AppIconName } from './commuter-ui';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Colors, MaxContentWidth, Radius, Space } from '@/constants/theme';

export default function AppTabs() {
  const { width } = useWindowDimensions();
  const compact = width < 1024;

  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <CustomTabList compact={compact}>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="tram">Ride</TabButton>
          </TabTrigger>
          <TabTrigger name="map" href="/map" asChild>
            <TabButton icon="map">Map</TabButton>
          </TabTrigger>
          <TabTrigger name="progress" href="/progress" asChild>
            <TabButton icon="chart">Progress</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  children,
  isFocused,
  icon,
  ...props
}: TabTriggerSlotProps & { icon: AppIconName }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.tabButton, focused && { borderWidth: 3, borderColor: colors.gold }, pressed && styles.pressed]}>
      <AppIcon name={icon} size={20} color={isFocused ? colors.primary : colors.textSecondary} />
      <ThemedText type="smallBold" themeColor={isFocused ? 'primary' : 'textSecondary'}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps & { compact: boolean }) {
  const { compact, ...tabListProps } = props;
  return (
    <View
      {...tabListProps}
      style={[
        styles.tabList,
        compact ? styles.bottomBar : styles.topBar,
        props.style,
      ]}>
      <ThemedView type="backgroundElement" style={[styles.inner, compact ? styles.innerCompact : null]}>
        {!compact && <ThemedText type="smallBold" themeColor="primary">Para po!</ThemedText>}
        {props.children}
        {!compact && <ThemedText type="small" themeColor="textSecondary">Makati commute guide</ThemedText>}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1 },
  tabList: { position: 'absolute', width: '100%', alignItems: 'center', zIndex: 10 },
  bottomBar: { bottom: 0, paddingHorizontal: Space.four, paddingTop: Space.two, paddingBottom: Space.four },
  topBar: { top: 0, padding: Space.four },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    minHeight: 64,
    borderRadius: Radius.large,
    paddingHorizontal: Space.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.two,
  },
  innerCompact: { borderRadius: Radius.pill, justifyContent: 'space-around' },
  tabButton: {
    minWidth: 72,
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Space.two,
    borderRadius: Radius.medium,
  },
  pressed: { opacity: 0.75 },
});
