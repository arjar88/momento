import { Platform, type TextStyle } from 'react-native';

import { colors } from './colors';

export const fonts = {
  serif: 'Fraunces_700Bold',
  serifBold: 'Fraunces_800ExtraBold',
  serifItalic: 'Fraunces_600SemiBold_Italic',
  sans: 'Nunito_500Medium',
  sansSemiBold: 'Nunito_600SemiBold',
  sansBold: 'Nunito_700Bold',
  sansExtraBold: 'Nunito_800ExtraBold',
} as const;

export const type = {
  month: {
    fontFamily: fonts.serifBold,
    fontSize: 38,
    lineHeight: 44,
    color: colors.label,
  },
  screenTitle: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 36,
    color: colors.label,
  },
  wordmark: {
    fontFamily: fonts.serifBold,
    fontSize: 30,
    lineHeight: 36,
    color: colors.label,
  },
  tagline: {
    fontFamily: fonts.serifItalic,
    fontSize: 16,
    lineHeight: 22,
    color: colors.secondaryLabel,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 28,
    color: colors.label,
  },
  headline: {
    fontFamily: fonts.sansBold,
    fontSize: 17,
    lineHeight: 23,
    color: colors.label,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 23,
    color: colors.label,
  },
  subhead: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.secondaryLabel,
  },
  caption: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.secondaryLabel,
  },
  smallCaps: {
    fontFamily: fonts.sansExtraBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.secondaryLabel,
  },
} as const satisfies Record<string, TextStyle>;

export const systemFont = Platform.select({
  ios: 'System',
  default: undefined,
});
