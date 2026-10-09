import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};
export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const { tablet } = useResponsiveLayout();
  const resolved = StyleSheet.flatten<TextStyle>([
    { color: theme[themeColor ?? 'text'] }, styles[type],
    type === 'default' && tablet && { fontSize: 18, lineHeight: 28 },
    (type === 'link' || type === 'linkPrimary') && { color: theme.primary }, style,
  ]);
  const weight = resolved.fontWeight === 'bold' ? 700 : Number(resolved.fontWeight ?? 400);
  const fontFamily = type === 'code' ? Fonts.mono : resolved.fontFamily ??
    (weight >= 800 ? Fonts.display : weight >= 700 ? Fonts.bold : weight >= 500 ? Fonts.semibold : Fonts.sans);
  return <Text style={[resolved, { fontFamily, fontWeight: 'normal' }]} {...rest} />;
}
const styles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 25, fontWeight: '400' },
  small: { fontSize: 14, lineHeight: 22, fontWeight: '400' },
  smallBold: { fontSize: 15, lineHeight: 23, fontWeight: '700' },
  title: { fontSize: 44, lineHeight: 52, fontWeight: '800', letterSpacing: -1.8 },
  subtitle: { fontSize: 24, lineHeight: 32, fontWeight: '700', letterSpacing: -.6 },
  link: { fontSize: 16, lineHeight: 25, fontWeight: '600' },
  linkPrimary: { fontSize: 16, lineHeight: 25, fontWeight: '600' },
  code: { fontSize: 13, lineHeight: 20, fontWeight: '400' },
});
