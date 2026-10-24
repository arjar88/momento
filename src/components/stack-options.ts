import { useColorScheme } from 'react-native';

import { fonts, useBrandColors } from '@/theme';

export function usePaperStackOptions() {
  const brand = useBrandColors();
  useColorScheme();
  return {
    headerTitleStyle: { fontFamily: fonts.serif, color: brand.ink },
    headerLargeTitleStyle: { fontFamily: fonts.serif, color: brand.ink },
    headerTintColor: brand.terracotta,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: brand.paper },
    contentStyle: { backgroundColor: brand.paper },
    headerBackButtonDisplayMode: 'minimal' as const,
  };
}
