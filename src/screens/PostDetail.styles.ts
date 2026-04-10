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
      backgroundColor: "#ebe4d8",
      position: "relative",
    },

    // --- Header ---
    topBar: {
      position: "relative",
      zIndex: 10,
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
    rightActionBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,250,244,0.84)",
      borderWidth: 1,
      borderColor: "rgba(86,62,32,0.12)",
    },

    topBarSpacer: {
      width: 40,
      height: 40,
    },

    // --- Scroll ---
    scrollContent: {
      width: "100%",
      maxWidth: 820,
      alignSelf: "center",
      paddingHorizontal: tokens.space.xl,
      paddingTop: tokens.space.sm,
      paddingBottom: contentBottomPad,
    },
    introWrap: {
      marginTop: 2,
      marginBottom: tokens.space.md,
      gap: 4,
    },
    introEyebrow: {
      fontSize: 11,
      letterSpacing: 1.3,
      fontWeight: "900",
      color: "rgba(80,58,32,0.55)",
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    metaAuthor: {
      fontSize: 13,
      fontWeight: "800",
      color: "#4b3927",
    },
    metaDot: {
      fontSize: 13,
      fontWeight: "700",
      color: "rgba(75,57,39,0.44)",
    },
    metaDate: {
      fontSize: 13,
      fontWeight: "700",
      color: "rgba(75,57,39,0.52)",
    },

    // --- Meta bar ---
    metaBar: {
      marginTop: 0,
      marginBottom: tokens.space.md,
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: tokens.space.sm as any,
    },
    typeChip: {
      paddingHorizontal: tokens.space.sm,
      paddingVertical: 7,
      borderRadius: tokens.radius.pill,
      backgroundColor: "rgba(252,248,240,0.88)",
      borderWidth: 1,
      borderColor: "rgba(86,62,32,0.09)",
    },
    typeChipText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#5a4732",
      letterSpacing: -0.2,
    },
    tagChip: {
      paddingHorizontal: tokens.space.sm,
      paddingVertical: 7,
      borderRadius: tokens.radius.pill,
      backgroundColor: "rgba(255,250,244,0.82)",
      borderWidth: 1,
      borderColor: "rgba(86,62,32,0.09)",
    },
    tagChipText: {
      fontSize: 12,
      fontWeight: "700",
      color: "rgba(75,57,39,0.70)",
      letterSpacing: -0.2,
    },
    relatedSection: {
      marginTop: tokens.space.xl,
      gap: tokens.space.sm as any,
    },
    relatedTitle: {
      fontSize: 15,
      fontWeight: "900",
      color: tokens.colors.text,
    },
    manageActionRow: {
      flexDirection: "row",
      gap: tokens.space.xs as any,
    },
    manageEditBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: tokens.colors.borderStrong,
      borderRadius: tokens.radius.lg,
      backgroundColor: tokens.colors.surfaceStrong,
      alignItems: "center",
      paddingVertical: 12,
    },
    manageEditBtnText: {
      fontSize: tokens.font.small,
      fontWeight: "800",
      color: tokens.colors.text,
    },
    manageDeleteBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: tokens.colors.dangerBorder,
      borderRadius: tokens.radius.lg,
      backgroundColor: tokens.colors.dangerSoft,
      alignItems: "center",
      paddingVertical: 12,
    },
    manageDeleteBtnText: {
      fontSize: tokens.font.small,
      fontWeight: "800",
      color: tokens.colors.danger,
    },
    relatedHint: {
      fontSize: tokens.font.small,
      color: tokens.colors.textMuted,
      fontWeight: "700",
    },
    relatedList: {
      gap: tokens.space.sm as any,
    },
    relatedCard: {
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: tokens.radius.lg,
      backgroundColor: tokens.colors.surfaceStrong,
      padding: tokens.space.md,
      gap: 6,
    },
    relatedCardTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: tokens.colors.text,
    },
    relatedCardExcerpt: {
      fontSize: tokens.font.small,
      color: tokens.colors.textMuted,
      lineHeight: 20,
    },
    relatedCardMeta: {
      fontSize: tokens.font.small,
      color: tokens.colors.textFaint,
      fontWeight: "700",
    },

    // --- Action bar (fixed) ---
    actionsBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 30,
      elevation: 16,
      paddingHorizontal: tokens.space.xl,
      backgroundColor: tokens.colors.surfaceStrong,
      borderTopWidth: 1,
      borderTopColor: tokens.colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      shadowColor: tokens.shadow.color,
      shadowOpacity: Math.max(tokens.shadow.opacity * 0.6, 0.08),
      shadowRadius: tokens.shadow.radius,
      shadowOffset: { width: 0, height: -Math.max(tokens.shadow.offsetY, 4) },
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
    actionLabelActive: {
      color: tokens.colors.green700,
    },

    // --- States ---
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: tokens.space.xl,
      gap: tokens.space.sm as any,
    },

    // --- Bookmark modal ---
    bookmarkModalOverlay: {
      flex: 1,
      backgroundColor: tokens.colors.overlay,
      justifyContent: "center",
      alignItems: "center",
      padding: 18,
    },
    bookmarkModalCard: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: tokens.colors.white,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: tokens.colors.borderStrong,
      padding: tokens.space.lg,
    },
    bookmarkModalTitle: {
      fontSize: 16,
      fontWeight: "900",
      color: tokens.colors.text,
    },
    bookmarkModalDescription: {
      marginTop: 8,
      fontSize: tokens.font.small,
      color: tokens.colors.textMuted,
      fontWeight: "700",
    },
    modalActionList: {
      marginTop: 16,
      gap: 10,
    },
    modalActionBtn: {
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: tokens.colors.borderStrong,
      backgroundColor: tokens.colors.surfaceStrong,
      alignItems: "center",
      paddingVertical: 13,
      paddingHorizontal: tokens.space.md,
    },
    modalActionBtnDanger: {
      borderColor: tokens.colors.dangerBorder,
      backgroundColor: tokens.colors.dangerSoft,
    },
    modalActionBtnGhost: {
      backgroundColor: tokens.colors.surface,
    },
    modalActionText: {
      fontSize: tokens.font.small,
      fontWeight: "800",
      color: tokens.colors.text,
    },
    modalActionTextDanger: {
      color: tokens.colors.danger,
    },
    bookmarkModalLoadingWrap: {
      marginTop: 14,
    },
    bookmarkModalLoadingText: {
      fontSize: 13,
      color: tokens.colors.textMuted,
      fontWeight: "700",
    },
    bookmarkModalEmptyWrap: {
      marginTop: 14,
      gap: tokens.space.sm as any,
    },
    bookmarkModalEmptyText: {
      fontSize: 13,
      color: tokens.colors.textMuted,
      fontWeight: "700",
    },
    bookmarkModalCreateBtn: {
      borderRadius: 12,
      backgroundColor: tokens.colors.green900,
      alignItems: "center",
      paddingVertical: 11,
    },
    bookmarkModalCreateBtnText: {
      color: tokens.colors.textInverse,
      fontSize: 13,
      fontWeight: "900",
    },
    bookmarkModalList: {
      marginTop: 14,
      gap: 8,
    },
    bookmarkModalListItem: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.colors.borderStrong,
      backgroundColor: tokens.colors.white,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    bookmarkModalListItemActive: {
      borderColor: tokens.colors.green900,
      backgroundColor: tokens.colors.green100,
    },
    bookmarkModalListItemName: {
      color: tokens.colors.text,
      fontSize: 13,
      fontWeight: "800",
    },
    bookmarkModalListItemStatus: {
      color: tokens.colors.textMuted,
      fontSize: tokens.font.small,
      fontWeight: "700",
    },
    bookmarkModalCloseBtn: {
      marginTop: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: tokens.colors.borderStrong,
      alignItems: "center",
      paddingVertical: 10,
      backgroundColor: tokens.colors.bgMuted,
    },
    bookmarkModalCloseBtnText: {
      color: tokens.colors.text,
      fontSize: 13,
      fontWeight: "900",
    },
  });
}
