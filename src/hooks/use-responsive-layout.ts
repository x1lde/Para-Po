import { useWindowDimensions } from 'react-native';

/** Keep phones stacked, give tablets breathing room, and cap desktop content. */
export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  return {
    width, height,
    tablet: width >= 768,
    desktop: width >= 1024,
    gutter: width >= 1024 ? 40 : width >= 768 ? 28 : 16,
    compact: width < 360,
  };
}
