import { Platform } from 'react-native';
import { Color } from 'expo-router';

export const colors = {
  label: Platform.select({
    ios: Color.ios.label,
    android: Color.android.dynamic.onSurface,
    default: '#1c1917',
  })!,
  secondaryLabel: Platform.select({
    ios: Color.ios.secondaryLabel,
    android: Color.android.dynamic.onSurfaceVariant,
    default: '#6b635c',
  })!,
  tertiaryLabel: Platform.select({
    ios: Color.ios.tertiaryLabel,
    android: Color.android.dynamic.onSurfaceVariant,
    default: '#8a8178',
  })!,
  separator: Platform.select({
    ios: Color.ios.separator,
    android: Color.android.dynamic.outlineVariant,
    default: '#e6e0d8',
  })!,
  systemBackground: Platform.select({
    ios: Color.ios.systemBackground,
    android: Color.android.dynamic.surface,
    default: '#ffffff',
  })!,
  groupedBackground: Platform.select({
    ios: Color.ios.systemGroupedBackground,
    android: Color.android.dynamic.surfaceContainer,
    default: '#f2f2f7',
  })!,
  onTint: '#fffdfb',
};

const brandPalette = {
  light: {
    paper: '#F6F3EE',
    ink: '#1C1917',
    terracotta: '#C4785A',
    muted: '#8A8178',
    quiet: '#C4BBB2',
    line: '#E4DDD4',
    card: '#FBF9F6',
  },
  dark: {
    paper: '#1C1917',
    ink: '#F6F3EE',
    terracotta: '#D4896C',
    muted: '#A89F96',
    quiet: '#6B635C',
    line: '#3A342F',
    card: '#262220',
  },
} as const;

export type BrandColors = { [Key in keyof (typeof brandPalette)['light']]: string };

export function brandForScheme(scheme: 'light' | 'dark' | null | undefined): BrandColors {
  return scheme === 'dark' ? brandPalette.dark : brandPalette.light;
}
