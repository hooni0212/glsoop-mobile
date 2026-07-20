import { StyleSheet } from "react-native";

import { tokens } from "@/theme/tokens";
import { typography } from "@/theme/typography";

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
    paddingHorizontal: 20,
    paddingBottom: 10,
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
    paddingTop: 10,
    paddingHorizontal: 22,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
  },
  brand: {
    ...typography.brand,
    color: tokens.colors.green900,
    flexShrink: 0,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 1,
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
    maxWidth: 393,
    alignSelf: "center",
    paddingTop: 0,
    paddingBottom: 10,
    paddingHorizontal: 22,
  },
  content: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 26,
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
    bottom: 3,
    height: 2,
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
    ...typography.sectionTitle,
    color: tokens.colors.text,
    marginBottom: 10,
    marginLeft: 22,
  },
  footer: {
    paddingVertical: tokens.space.lg,
  },
  headerSpacerTop: {
    height: 6,
  },
  headerSpacerAfterLabel: {
    height: 2,
  },
  itemSeparator: {
    height: 28,
    marginHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.divider,
  },
});
