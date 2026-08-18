import type { TextStyle } from "react-native";

export const appFontFamily = {
  editorial: "Hahmlet-Medium",
  editorialStrong: "Hahmlet-SemiBold",
  ui: "Hahmlet-Medium",
  handwriting: "Gaegu-Regular",
} as const;

export const typography = {
  brand: {
    fontFamily: appFontFamily.editorialStrong,
    fontSize: 29,
    lineHeight: 38,
    letterSpacing: -0.7,
  },
  sectionTitle: {
    fontFamily: appFontFamily.editorial,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.25,
  },
  tabLabel: {
    fontFamily: appFontFamily.ui,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: -0.25,
  },
  author: {
    fontFamily: appFontFamily.ui,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  meta: {
    fontFamily: appFontFamily.ui,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  excerpt: {
    fontFamily: appFontFamily.editorial,
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  actionMeta: {
    fontFamily: appFontFamily.ui,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  pageTitle: {
    fontFamily: appFontFamily.editorialStrong,
    fontSize: 27,
    lineHeight: 38,
    letterSpacing: -0.7,
  },
  eyebrow: {
    fontFamily: appFontFamily.ui,
    fontSize: 11,
    lineHeight: 17,
    letterSpacing: 0.4,
  },
  uiBody: {
    fontFamily: appFontFamily.ui,
    fontSize: 14,
    lineHeight: 23,
    letterSpacing: -0.15,
  },
  action: {
    fontFamily: appFontFamily.ui,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.15,
  },
} satisfies Record<string, TextStyle>;
