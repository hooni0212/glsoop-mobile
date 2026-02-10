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
    paddingHorizontal: tokens.space.xl,
    paddingBottom: tokens.space.xl,
  },

  profileCard: {
    marginTop: tokens.space.sm,
    padding: tokens.space.lg,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    position: "relative",
    overflow: "hidden",
    gap: tokens.space.sm as any,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.xs as any,
    paddingRight: 70,
  },
  name: {
    fontSize: tokens.font.h1,
    fontWeight: "800",
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
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md as any,
  },
  statText: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    fontWeight: "700",
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
    color: tokens.colors.green900,
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
    alignSelf: "flex-start",
    marginTop: 2,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.green050,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  profileCustomizeBtnText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green900,
  },
  sectionLabel: {
    marginTop: tokens.space.lg,
    marginBottom: tokens.space.sm,
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.textFaint,
    letterSpacing: -0.2,
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
