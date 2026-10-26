import { useColorScheme } from 'react-native';

import { brandForScheme, colors, type BrandColors } from './colors';

export { colors, brandForScheme, type BrandColors } from './colors';
export { spacing } from './spacing';
export { radius, bubblyShadow } from './radius';
export { fonts, type, systemFont } from './typography';

export function useBrandColors(): BrandColors {
  const scheme = useColorScheme();
  return brandForScheme(scheme);
}

/** Semantic platform colors re-render when the system theme changes. */
export function useSemanticColors() {
  useColorScheme();
  return colors;
}
