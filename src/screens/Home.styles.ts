import { StyleSheet } from "react-native";

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

export const writingCampaignNoticeStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: tokens.colors.overlaySoft,
  },
  overlayDialog: {
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 32,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    gap: tokens.space.sm,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: tokens.colors.border,
    overflow: "hidden",
  },
  dialog: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    gap: tokens.space.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  },
  scrollContent: {
    gap: tokens.space.md,
    paddingBottom: 2,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: tokens.radius.pill,
    alignSelf: "center",
    backgroundColor: tokens.colors.borderStrong,
    marginBottom: 2,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "900",
    color: tokens.colors.green700,
    letterSpacing: 0,
  },
  title: {
    marginTop: 4,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "900",
    color: tokens.colors.text,
    letterSpacing: 0,
  },
  description: {
    marginTop: 8,
    fontSize: tokens.font.body,
    lineHeight: 20,
    fontWeight: "700",
    color: tokens.colors.textMuted,
    letterSpacing: 0,
  },
  promptBox: {
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.green050,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    padding: tokens.space.md,
    gap: 6,
  },
  promptMeta: {
    fontSize: 12,
    fontWeight: "900",
    color: tokens.colors.green700,
    letterSpacing: 0,
  },
  promptTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900",
    color: tokens.colors.text,
    letterSpacing: 0,
  },
  promptBody: {
    fontSize: tokens.font.small,
    lineHeight: 18,
    fontWeight: "700",
    color: tokens.colors.textMuted,
    letterSpacing: 0,
  },
  actionRow: {
    gap: 8,
    flexShrink: 0,
  },
  secondaryActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  actionButtonSecondary: {
    minHeight: 42,
  },
  actionButtonPressed: {
    opacity: 0.76,
  },
  actionButtonPrimary: {
    width: "100%",
    minHeight: 46,
    borderColor: tokens.colors.green700,
    backgroundColor: tokens.colors.green700,
  },
  actionText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    color: tokens.colors.textMuted,
    textAlign: "center",
    letterSpacing: 0,
  },
  actionTextPrimary: {
    color: tokens.colors.textInverse,
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
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0,
    color: tokens.colors.green900,
    flexShrink: 0,
  },
  searchPill: {
    width: 142,
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
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.bgMuted,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    position: "relative",
  },
  iconBtnActive: {
    backgroundColor: tokens.colors.green050,
    borderColor: tokens.colors.green700,
  },
  iconBtnPressed: {
    opacity: 0.76,
  },
  iconBtnDisabled: {
    opacity: 0.5,
  },
  notificationDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.green700,
    borderWidth: 1,
    borderColor: tokens.colors.bgMuted,
  },
  searchText: {
    fontSize: tokens.font.body,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
});

export const categoryChipsStyles = StyleSheet.create({
  wrap: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    paddingTop: 2,
    paddingBottom: 8,
    paddingHorizontal: 18,
  },
  content: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  chip: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  chipActive: {
    backgroundColor: "transparent",
  },
  chipPressed: {
    opacity: 0.82,
  },
  activeLine: {
    position: "absolute",
    left: "20%",
    right: "20%",
    bottom: -1,
    height: 2,
    borderRadius: tokens.radius.pill,
    backgroundColor: "transparent",
  },
  activeLineOn: {
    backgroundColor: tokens.colors.green700,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "800",
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
