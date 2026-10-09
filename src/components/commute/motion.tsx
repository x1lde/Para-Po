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

/**
 * Pressable that springs slightly smaller while held, lifts a little on web hover, and eases its opacity when
 * `disabled` changes. `wrapperStyle` styles the animated container (for layout inside rows); `hoverLift={false}`
 * keeps the press spring but drops the lift.
 */
export function PressScale({ children, disabled = false, style, wrapperStyle, hoverLift = true, ...rest }:
  PressableProps & { children: ReactNode; disabled?: boolean; wrapperStyle?: StyleProp<ViewStyle>; hoverLift?: boolean }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const fade = useSharedValue(1);
  const [down, setDown] = useState(false);
  const [hover, setHover] = useState(false);
  useEffect(() => { fade.value = withTiming(disabled ? .45 : 1, { duration: 220 }); }, [disabled, fade]);
  useEffect(() => {
    if (!reduced) scale.value = withSpring(down ? .97 : 1, { damping: 18, stiffness: 320 });
  }, [down, reduced, scale]);
  useEffect(() => {
    if (!reduced) lift.value = withSpring(hover && hoverLift && !disabled ? -3 : 0, { damping: 16, stiffness: 220 });
  }, [hover, hoverLift, disabled, reduced, lift]);
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }], opacity: fade.value,
  }));
  return <Animated.View style={[animated, wrapperStyle]}>
    <Pressable {...rest} disabled={disabled}
      onPressIn={(e) => { setDown(true); rest.onPressIn?.(e); }}
      onPressOut={(e) => { setDown(false); rest.onPressOut?.(e); }}
      onHoverIn={(e) => { setHover(true); rest.onHoverIn?.(e); }}
      onHoverOut={(e) => { setHover(false); rest.onHoverOut?.(e); }}
      style={style}>
      {children}
    </Pressable>
  </Animated.View>;
}
