import type { PropsWithChildren } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Screen({ children }: PropsWithChildren) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.content,
        {
          // Native tabs adjust the first iOS ScrollView and the Android bottom edge.
          paddingTop: Spacing.four + (Platform.OS === 'ios' ? 0 : insets.top),
          paddingBottom: Spacing.five,
          paddingLeft: Spacing.four + (Platform.OS === 'ios' ? 0 : insets.left),
          paddingRight: Spacing.four + (Platform.OS === 'ios' ? 0 : insets.right),
        },
      ]}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.five,
  },
});
