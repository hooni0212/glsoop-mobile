import { StyleSheet } from "react-native";

import { tokens } from "@/theme/tokens";
import { typography } from "@/theme/typography";
import { keyboardFocusRingStyle } from "@/theme/accessibility";

/**
 * Home screen design tokens + styles (single source of truth).
 *
 * 원칙:
 * - Screen(Home.tsx)은 조립(Composition)만 담당
 * - Home UI 조각들은 이 파일의 스타일을 사용
 * - 하드코딩 컬러/spacing은 가급적 tokens로 치환
 */

export const homeScreenStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  premiumDiscoveryWrap: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 22,
    paddingBottom: 10,
  },
});

export const homeHeaderStyles = StyleSheet.create({
  header: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 22,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    position: "relative",
  },
  iconBtnActive: {
    backgroundColor: tokens.colors.green050,
    borderColor: tokens.colors.green700,
  },
  iconBtnPressed: {
    backgroundColor: tokens.colors.bgMuted,
  },
  focused: keyboardFocusRingStyle,
  iconBtnDisabled: {
    opacity: 0.5,
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: tokens.colors.green700,
    borderWidth: 1,
    borderColor: tokens.colors.bg,
  },
});

export const categoryChipsStyles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingTop: 0,
    paddingBottom: 12,
    paddingHorizontal: 22,
  },
  content: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.divider,
  },
  chip: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingHorizontal: 1,
  },
  chipActive: {
    backgroundColor: "transparent",
  },
  chipPressed: {
    opacity: 0.82,
  },
  activeLine: {
    position: "absolute",
    left: 1,
    width: 18,
    bottom: -1,
    height: 3,
    borderRadius: tokens.radius.pill,
    backgroundColor: "transparent",
  },
  activeLineOn: {
    backgroundColor: tokens.colors.green700,
  },
  chipText: {
    ...typography.tabLabel,
    color: tokens.colors.textMuted,
  },
  chipTextActive: {
    color: tokens.colors.text,
  },
  focused: keyboardFocusRingStyle,
});

export const feedSectionStyles = StyleSheet.create({
  listContent: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 0,
    paddingBottom: 18,
  },
  footer: {
    paddingVertical: tokens.space.lg,
  },
  headerSpacerTop: {
    height: 4,
  },
  itemSeparator: {
    height: 24,
    marginHorizontal: 22,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.divider,
  },
});
