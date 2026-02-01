import { StyleSheet } from "react-native";
import { tokens } from "@/theme/tokens";

/**
 * PostDetail Screen styles (tokens 기반)
 * - Screen은 조립자 역할만 하도록, 스타일은 여기로 집결
 */

export function createPostDetailStyles(actionBarHeight: number) {
  const contentBottomPad = actionBarHeight + tokens.space.xl;

  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: tokens.colors.bg,
    },

    // --- Header ---
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

    // --- Scroll ---
    scrollContent: {
      paddingHorizontal: tokens.space.xl,
      paddingTop: tokens.space.sm,
      paddingBottom: contentBottomPad,
    },

    title: {
      fontSize: tokens.font.h1,
      fontWeight: "800",
      letterSpacing: -0.4,
      color: tokens.colors.text,
      lineHeight: 30,
    },
    metaRow: {
      marginTop: tokens.space.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    metaAuthor: {
      fontSize: 13,
      fontWeight: "800",
      color: tokens.colors.green900,
    },
    metaDot: {
      fontSize: 13,
      fontWeight: "700",
      color: tokens.colors.textFaint,
    },
    metaDate: {
      fontSize: 13,
      fontWeight: "700",
      color: tokens.colors.textFaint,
    },

    // --- Meta bar ---
    metaBar: {
      marginTop: tokens.space.lg,
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: tokens.space.sm as any,
    },
    typeChip: {
      paddingHorizontal: tokens.space.sm,
      paddingVertical: 7,
      borderRadius: tokens.radius.pill,
      backgroundColor: tokens.colors.green050,
      borderWidth: 1,
      borderColor: tokens.colors.border,
    },
    typeChipText: {
      fontSize: 12,
      fontWeight: "800",
      color: tokens.colors.green900,
      letterSpacing: -0.2,
    },
    tagChip: {
      paddingHorizontal: tokens.space.sm,
      paddingVertical: 7,
      borderRadius: tokens.radius.pill,
      backgroundColor: tokens.colors.surface,
      borderWidth: 1,
      borderColor: tokens.colors.border,
    },
    tagChipText: {
      fontSize: 12,
      fontWeight: "700",
      color: tokens.colors.textMuted,
      letterSpacing: -0.2,
    },

    // --- Body ---
    body: {
      marginTop: tokens.space.lg,
      fontSize: tokens.font.body,
      lineHeight: 26,
      color: tokens.colors.text,
      letterSpacing: -0.2,
      opacity: 0.9,
    },

    // --- Action bar (fixed) ---
    actionsBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: tokens.space.xl,
      backgroundColor: tokens.colors.surfaceStrong,
      borderTopWidth: 1,
      borderTopColor: tokens.colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
    },
    actionBtn: {
      alignItems: "center",
      justifyContent: "center",
      gap: tokens.space.xs as any,
    },
    actionLabel: {
      fontSize: tokens.font.small,
      fontWeight: "700",
      color: tokens.colors.textMuted,
    },

    // --- States ---
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: tokens.space.xl,
      gap: tokens.space.sm as any,
    },

  });
}
