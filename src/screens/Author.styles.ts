import { StyleSheet } from "react-native";

import { tokens } from "@/theme/tokens";

export const authorScreenStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },

  topBar: {
    paddingTop: tokens.space.xs,
    paddingHorizontal: tokens.space.md,
    paddingBottom: tokens.space.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarSpacer: {
    width: 40,
    height: 40,
  },

  listContent: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingBottom: tokens.space.xl,
  },

  profileCard: {
    marginTop: tokens.space.sm,
    padding: 18,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    position: "relative",
    overflow: "hidden",
    gap: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs as any,
    paddingRight: 70,
  },
  name: {
    fontSize: 22,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  badgeEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  bio: {
    fontSize: tokens.font.body,
    color: tokens.colors.textMuted,
    lineHeight: 22,
  },
  inlineActionBtn: {
    alignSelf: "flex-start",
    marginTop: -2,
  },
  inlineActionText: {
    fontSize: tokens.font.small,
    color: tokens.colors.green700,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  statText: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    fontWeight: "900",
  },
  joinedAt: {
    fontSize: tokens.font.small,
    color: tokens.colors.textFaint,
  },
  showcaseRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.xs as any,
  },
  showcaseChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.green050,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  showcaseEmoji: {
    fontSize: 13,
    lineHeight: 16,
  },
  showcaseText: {
    fontSize: tokens.font.small,
    color: tokens.colors.green700,
    fontWeight: "700",
  },
  stickerOverlay: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surfaceStrong,
    shadowColor: tokens.shadow.color,
    shadowOpacity: tokens.shadow.opacity,
    shadowRadius: tokens.shadow.radius,
    shadowOffset: { width: 0, height: tokens.shadow.offsetY },
    elevation: 2,
  },
  stickerTL: {
    top: 10,
    left: 10,
  },
  stickerTR: {
    top: 10,
    right: 10,
  },
  stickerBR: {
    bottom: 10,
    right: 10,
  },
  stickerText: {
    fontSize: 14,
    lineHeight: 16,
  },
  profileCustomizeBtn: {
    flexGrow: 1,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.green700,
    backgroundColor: tokens.colors.green050,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  profileCustomizeBtnText: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.green700,
  },
  primaryActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignSelf: "flex-start",
  },
  latestPostBtn: {
    flexGrow: 1,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green700,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  latestPostBtnText: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: "#fff",
  },
  followBtn: {
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.green700,
    backgroundColor: tokens.colors.green700,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  followBtnActive: {
    backgroundColor: tokens.colors.green050,
    borderColor: tokens.colors.green700,
  },
  followBtnDisabled: {
    opacity: 0.6,
  },
  followBtnText: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.textInverse,
  },
  followBtnTextActive: {
    color: tokens.colors.green700,
  },
  shareBtn: {
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  shareBtnText: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  overflowCard: {
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: 18,
    backgroundColor: tokens.colors.surface,
    overflow: "hidden",
  },
  overflowItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  overflowItemText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  sectionRow: {
    marginTop: 16,
    marginBottom: tokens.space.sm,
    gap: 10,
  },
  sectionLabel: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textFaint,
    letterSpacing: -0.2,
  },
  sortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.xs as any,
  },
  sortChip: {
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surface,
  },
  sortChipActive: {
    backgroundColor: tokens.colors.green050,
    borderColor: tokens.colors.green700,
  },
  sortChipText: {
    fontSize: tokens.font.small,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  sortChipTextActive: {
    color: tokens.colors.green900,
  },
  listItemSpacer: {
    height: tokens.space.md,
  },
  listFooter: {
    paddingVertical: tokens.space.lg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.xl,
    gap: tokens.space.sm as any,
  },
});
