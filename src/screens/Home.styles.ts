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
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  brand: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    color: tokens.colors.text,
  },
  searchPill: {
    flex: 1,
    minHeight: 42,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.bgMuted,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchPillPressed: {
    opacity: 0.76,
  },
  searchText: {
    fontSize: tokens.font.body,
    fontWeight: "800",
    color: tokens.colors.textMuted,
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

export const storyRailStyles = StyleSheet.create({
  wrap: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  content: {
    paddingHorizontal: 18,
    gap: 14,
  },
  item: {
    width: 72,
    alignItems: "center",
    gap: 7,
  },
  itemPressed: {
    opacity: 0.78,
  },
  ring: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#f0a03a",
    backgroundColor: "#fff4e3",
  },
  ringActive: {
    borderColor: tokens.colors.green700,
    backgroundColor: tokens.colors.green100,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "900",
    color: tokens.colors.green900,
  },
  avatarTextActive: {
    color: tokens.colors.green700,
  },
  label: {
    width: "100%",
    fontSize: 12,
    fontWeight: "800",
    color: tokens.colors.textMuted,
    textAlign: "center",
  },
  labelActive: {
    color: tokens.colors.text,
  },
});

export const categoryChipsStyles = StyleSheet.create({
  wrap: {
    paddingTop: tokens.space.xs,
    paddingBottom: 10,
  },
  content: {
    paddingHorizontal: 18,
    gap: 8,
  },
  chip: {
    minHeight: 32,
    paddingHorizontal: 15,
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
    paddingHorizontal: 0,
    paddingBottom: 18,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "900",
    color: tokens.colors.textMuted,
    marginBottom: 12,
    marginLeft: 20,
    letterSpacing: 0,
  },
  footer: {
    paddingVertical: tokens.space.lg,
  },
  headerSpacerTop: {
    height: 4,
  },
  headerSpacerAfterLabel: {
    height: 0,
  },
  itemSeparator: {
    height: 22,
  },
});
