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
    maxWidth: 393,
    alignSelf: "center",
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
    color: tokens.colors.text,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
});

export const categoryChipsStyles = StyleSheet.create({
  wrap: {
    paddingTop: tokens.space.xs,
    paddingBottom: 12,
  },
  content: {
    paddingHorizontal: 24,
    gap: 10,
  },
  chip: {
    minHeight: 34,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  chipActive: {
    backgroundColor: tokens.colors.green100,
    borderColor: tokens.colors.green700,
    ...softChipShadowStyle,
  },
  chipPressed: {
    opacity: 0.82,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "900",
    color: tokens.colors.textMuted,
  },
  chipTextActive: {
    color: tokens.colors.green700,
  },
});

export const feedSectionStyles = StyleSheet.create({
  listContent: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "900",
    color: tokens.colors.textMuted,
    marginBottom: tokens.space.sm,
    marginLeft: 6,
    letterSpacing: 0,
  },
  footer: {
    paddingVertical: tokens.space.lg,
  },
  headerSpacerTop: {
    height: tokens.space.sm,
  },
  headerSpacerAfterLabel: {
    height: tokens.space.xs,
  },
  itemSeparator: {
    height: tokens.space.md,
  },
});

export const homeDiscoveryStyles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingBottom: tokens.space.sm,
    gap: tokens.space.sm,
  },
  immersiveBtn: {
    minHeight: 44,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  immersiveTitle: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  immersiveMeta: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green700,
  },
});
