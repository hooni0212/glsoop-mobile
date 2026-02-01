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
    gap: tokens.space.sm as any,
  },
  name: {
    fontSize: tokens.font.h1,
    fontWeight: "800",
    color: tokens.colors.text,
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
