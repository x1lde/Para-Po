import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  FadeIn, FadeInUp, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';

/** Entrance: fade up after `delay` ms. Skipped when the OS asks for reduced motion. */
export function Reveal({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  if (reduced) return <Animated.View style={style}>{children}</Animated.View>;
  return <Animated.View entering={FadeInUp.duration(520).delay(delay)} style={style}>
    {children}
  </Animated.View>;
}

/** Soft fade-in for a surface that appears after the page (maps, results). */
export function Appear({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{children}</>;
  return <Animated.View entering={FadeIn.duration(600).delay(delay)}>{children}</Animated.View>;
}

/** Pressable that springs slightly smaller while held, and eases its opacity when `disabled` changes. */
export function PressScale({ children, disabled = false, style, ...rest }: PressableProps & { children: ReactNode; disabled?: boolean }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const fade = useSharedValue(1);
  useEffect(() => { fade.value = withTiming(disabled ? .45 : 1, { duration: 220 }); }, [disabled, fade]);
  const [down, setDown] = useState(false);
  useEffect(() => {
    if (!reduced) scale.value = withSpring(down ? .97 : 1, { damping: 18, stiffness: 320 });
  }, [down, reduced, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: fade.value }));
  return <Animated.View style={animated}>
    <Pressable {...rest} disabled={disabled} onPressIn={(e) => { setDown(true); rest.onPressIn?.(e); }}
      onPressOut={(e) => { setDown(false); rest.onPressOut?.(e); }} style={style}>
      {children}
    </Pressable>
  </Animated.View>;
}
