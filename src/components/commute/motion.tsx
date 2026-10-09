import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  FadeIn, FadeInUp, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';

/** Premium feel: soft springs with almost no overshoot, and tweens that ease out. */
export const SPRING = { damping: 26, stiffness: 240, mass: 0.9 };
export const SPRING_SNAP = { damping: 24, stiffness: 420, mass: 0.7 };
export const EASE_OUT = { duration: 280 };

/** Entrance: fade up after `delay` ms. Skipped when the OS asks for reduced motion. */
export function Reveal({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  if (reduced) return <Animated.View style={style}>{children}</Animated.View>;
  return <Animated.View entering={FadeInUp.duration(640).delay(delay)} style={style}>
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
  useEffect(() => { fade.value = withTiming(disabled ? .45 : 1, EASE_OUT); }, [disabled, fade]);
  useEffect(() => {
    if (!reduced) scale.value = withSpring(down ? .975 : 1, SPRING_SNAP);
  }, [down, reduced, scale]);
  useEffect(() => {
    if (!reduced) lift.value = withSpring(hover && hoverLift && !disabled ? -2 : 0, SPRING);
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
