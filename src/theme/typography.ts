import { Platform, type TextStyle } from 'react-native';

import { colors } from './colors';

export const fonts = {
  serif: 'LibreBaskerville',
  serifBold: 'LibreBaskerville-Bold',
  serifItalic: 'LibreBaskerville-Italic',
} as const;

export const type = {
  month: {
    fontFamily: fonts.serif,
    fontSize: 40,
    lineHeight: 46,
    color: colors.label,
  },
  screenTitle: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 34,
    color: colors.label,
  },
  wordmark: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 32,
    color: colors.label,
  },
  tagline: {
    fontFamily: fonts.serifItalic,
    fontSize: 15,
    lineHeight: 20,
    color: colors.secondaryLabel,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    color: colors.label,
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.label,
  },
  body: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
    color: colors.label,
  },
  subhead: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
    color: colors.secondaryLabel,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    color: colors.secondaryLabel,
  },
  smallCaps: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.secondaryLabel,
  },
} as const satisfies Record<string, TextStyle>;

export const systemFont = Platform.select({
  ios: 'System',
  default: undefined,
});
