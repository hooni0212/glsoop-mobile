import { StyleSheet } from "react-native";

import { softChipShadowStyle } from "@/theme/shadows";
import { tokens } from "@/theme/tokens";

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
});

export const homeHeaderStyles = StyleSheet.create({
  header: {
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
    paddingTop: tokens.space.xs,
    paddingHorizontal: tokens.space.xl,
    paddingBottom: tokens.space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandBlock: {
    gap: 2,
  },
  brandSubtitle: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  brand: {
    fontSize: tokens.font.title,
    fontWeight: "900",
    letterSpacing: -0.7,
    color: tokens.colors.green900,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
});

export const categoryChipsStyles = StyleSheet.create({
  wrap: {
    paddingTop: tokens.space.xs,
    paddingBottom: tokens.space.sm,
  },
  content: {
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.sm,
  },
  chip: {
    paddingHorizontal: tokens.space.xl,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  chipActive: {
    backgroundColor: tokens.colors.green600,
    borderColor: "transparent",
    ...softChipShadowStyle,
  },
  chipPressed: {
    opacity: 0.82,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
});

export const feedSectionStyles = StyleSheet.create({
  listContent: {
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.lg,
  },
  sectionLabel: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textMuted,
    marginBottom: tokens.space.sm,
    marginLeft: 4,
    letterSpacing: -0.1,
  },
  footer: {
    paddingVertical: tokens.space.lg,
  },
  headerSpacerTop: {
    height: tokens.space.md,
  },
  headerSpacerAfterLabel: {
    height: 8,
  },
  itemSeparator: {
    height: tokens.space.md,
  },
});
