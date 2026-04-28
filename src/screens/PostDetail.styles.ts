import { StyleSheet } from "react-native";
import { tokens } from "@/theme/tokens";

/**
 * PostDetail Screen styles (tokens 기반)
 * - Screen은 조립자 역할만 하도록, 스타일은 여기로 집결
 */

export function createPostDetailStyles(actionBarHeight: number) {
  const contentBottomPad = actionBarHeight + tokens.space.xl;
  const darkBg = "#0b0d0c";
  const darkSurface = "rgba(255,255,255,0.10)";
  const darkBorder = "rgba(255,255,255,0.14)";
  const darkTextMuted = "rgba(255,255,255,0.72)";

  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: darkBg,
      position: "relative",
    },

    // --- Header ---
    topBar: {
      position: "relative",
      zIndex: 10,
      paddingTop: tokens.space.xs,
      paddingHorizontal: tokens.space.lg,
      paddingBottom: tokens.space.xs,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: darkBg,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: darkSurface,
      borderWidth: 1,
      borderColor: darkBorder,
    },
    rightActionBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: darkSurface,
      borderWidth: 1,
      borderColor: darkBorder,
    },

    topBarSpacer: {
      width: 40,
      height: 40,
    },

    // --- Scroll ---
    shortsReader: {
      flex: 1,
      position: "relative",
    },
    scrollContent: {
      width: "100%",
      maxWidth: 460,
      alignSelf: "center",
      paddingLeft: tokens.space.md,
      paddingRight: 78,
      paddingTop: tokens.space.xs,
      paddingBottom: contentBottomPad,
    },
    readerStage: {
      minHeight: 640,
      justifyContent: "center",
      gap: tokens.space.md as any,
      paddingVertical: tokens.space.md,
    },
    shortsCaption: {
      gap: tokens.space.sm as any,
      paddingHorizontal: 4,
      paddingBottom: tokens.space.sm,
    },
    shortsCaptionTitle: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "900",
      color: tokens.colors.textInverse,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    metaAuthor: {
      fontSize: 13,
      fontWeight: "800",
      color: tokens.colors.textInverse,
    },
    metaDot: {
      fontSize: 13,
      fontWeight: "700",
      color: "rgba(255,255,255,0.44)",
    },
    metaDate: {
      fontSize: 13,
      fontWeight: "700",
      color: darkTextMuted,
    },

    // --- Meta bar ---
    metaBar: {
      marginTop: 0,
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: tokens.space.sm as any,
    },
    typeChip: {
      paddingHorizontal: tokens.space.sm,
      paddingVertical: 7,
      borderRadius: tokens.radius.pill,
      backgroundColor: "rgba(73,128,90,0.28)",
      borderWidth: 1,
      borderColor: "rgba(228,240,230,0.28)",
    },
    typeChipText: {
      fontSize: 12,
      fontWeight: "800",
      color: tokens.colors.textInverse,
      letterSpacing: 0,
    },
    tagChip: {
      paddingHorizontal: tokens.space.sm,
      paddingVertical: 7,
      borderRadius: tokens.radius.pill,
      backgroundColor: darkSurface,
      borderWidth: 1,
      borderColor: darkBorder,
    },
    tagChipText: {
      fontSize: 12,
      fontWeight: "700",
      color: darkTextMuted,
      letterSpacing: 0,
    },
    relatedSection: {
      marginTop: tokens.space.xl,
      gap: tokens.space.sm as any,
    },
    relatedTitle: {
      fontSize: 15,
      fontWeight: "900",
      color: tokens.colors.textInverse,
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
      color: darkTextMuted,
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
    commentSection: {
      marginTop: tokens.space.xl,
      gap: tokens.space.md as any,
    },
    permissionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.space.xs as any,
    },
    permissionChip: {
      borderWidth: 1,
      borderColor: darkBorder,
      borderRadius: tokens.radius.pill,
      backgroundColor: darkSurface,
      paddingHorizontal: tokens.space.sm,
      paddingVertical: 6,
    },
    permissionChipText: {
      fontSize: 12,
      fontWeight: "800",
      color: darkTextMuted,
    },
    commentHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: tokens.space.sm as any,
    },
    commentHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.sm as any,
      flexShrink: 0,
    },
    commentTitle: {
      fontSize: 16,
      fontWeight: "900",
      color: tokens.colors.textInverse,
    },
    commentKicker: {
      fontSize: 11,
      fontWeight: "900",
      color: "rgba(255,255,255,0.48)",
      letterSpacing: 0,
      marginBottom: 3,
    },
    commentRefreshText: {
      fontSize: tokens.font.small,
      fontWeight: "800",
      color: tokens.colors.green700,
    },
    commentOpenBtn: {
      borderRadius: tokens.radius.md,
      backgroundColor: tokens.colors.green900,
      paddingHorizontal: tokens.space.md,
      paddingVertical: 9,
    },
    commentOpenBtnDisabled: {
      opacity: 0.45,
    },
    commentOpenText: {
      fontSize: tokens.font.small,
      fontWeight: "900",
      color: tokens.colors.textInverse,
    },
    commentPolicyNotice: {
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: tokens.radius.md,
      backgroundColor: tokens.colors.bgMuted,
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.sm,
    },
    commentPolicyNoticeText: {
      fontSize: tokens.font.small,
      fontWeight: "800",
      color: tokens.colors.textMuted,
      lineHeight: 20,
    },
    commentComposer: {
      borderWidth: 1,
      borderColor: tokens.colors.borderStrong,
      borderRadius: tokens.radius.lg,
      backgroundColor: tokens.colors.surface,
      padding: tokens.space.md,
      gap: tokens.space.sm as any,
    },
    replyTargetRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: tokens.space.sm as any,
      paddingHorizontal: tokens.space.sm,
      paddingVertical: tokens.space.xs,
      borderRadius: tokens.radius.md,
      backgroundColor: tokens.colors.green050,
    },
    replyTargetText: {
      flex: 1,
      fontSize: tokens.font.small,
      fontWeight: "800",
      color: tokens.colors.green900,
    },
    replyCancelText: {
      fontSize: tokens.font.small,
      fontWeight: "900",
      color: tokens.colors.textMuted,
    },
    commentInput: {
      minHeight: 76,
      maxHeight: 150,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: tokens.radius.md,
      backgroundColor: tokens.colors.bgMuted,
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.sm,
      color: tokens.colors.text,
      fontSize: tokens.font.body,
      lineHeight: 21,
      textAlignVertical: "top",
    },
    commentComposerFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: tokens.space.sm as any,
    },
    commentInputCount: {
      fontSize: tokens.font.small,
      fontWeight: "700",
      color: tokens.colors.textFaint,
    },
    commentSubmitBtn: {
      minWidth: 86,
      borderRadius: tokens.radius.md,
      backgroundColor: tokens.colors.green900,
      alignItems: "center",
      paddingHorizontal: tokens.space.md,
      paddingVertical: 10,
    },
    commentSubmitBtnDisabled: {
      opacity: 0.45,
    },
    commentSubmitText: {
      fontSize: tokens.font.small,
      fontWeight: "900",
      color: tokens.colors.textInverse,
    },
    commentLoadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.sm as any,
      paddingVertical: tokens.space.md,
    },
    commentEmptyBox: {
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: tokens.radius.lg,
      backgroundColor: tokens.colors.surfaceStrong,
      padding: tokens.space.md,
    },
    commentHint: {
      fontSize: tokens.font.small,
      fontWeight: "700",
      color: tokens.colors.textMuted,
      lineHeight: 20,
    },
    commentList: {
      gap: tokens.space.md as any,
    },
    commentThread: {
      gap: tokens.space.sm as any,
    },
    commentItem: {
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: tokens.radius.lg,
      backgroundColor: tokens.colors.surfaceStrong,
      padding: tokens.space.md,
      gap: 8,
    },
    replyList: {
      marginLeft: tokens.space.lg,
      gap: tokens.space.sm as any,
    },
    replyItem: {
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: tokens.radius.md,
      backgroundColor: tokens.colors.bgMuted,
      padding: tokens.space.md,
      gap: 8,
    },
    commentMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: tokens.space.sm as any,
    },
    commentAuthorWrap: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.sm as any,
    },
    commentMarker: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: tokens.colors.green700,
      backgroundColor: tokens.colors.surface,
    },
    replyMarker: {
      width: 30,
      height: 30,
      borderRadius: 15,
    },
    commentMarkerText: {
      fontSize: 12,
      fontWeight: "900",
      color: tokens.colors.green700,
    },
    commentAuthor: {
      flex: 1,
      fontSize: tokens.font.small,
      fontWeight: "900",
      color: tokens.colors.text,
    },
    commentDate: {
      fontSize: 12,
      fontWeight: "700",
      color: tokens.colors.textFaint,
    },
    commentBody: {
      fontSize: tokens.font.body,
      lineHeight: 22,
      color: tokens.colors.text,
    },
    commentActionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.md as any,
    },
    commentIconAction: {
      minHeight: 30,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    commentActionText: {
      fontSize: tokens.font.small,
      fontWeight: "900",
      color: tokens.colors.green700,
    },
    commentActionTextActive: {
      color: tokens.colors.green700,
    },
    commentDangerText: {
      fontSize: tokens.font.small,
      fontWeight: "900",
      color: tokens.colors.danger,
    },

    // --- Shorts action rail ---
    shortsActionRail: {
      position: "absolute",
      right: tokens.space.sm,
      top: 62,
      bottom: tokens.space.lg,
      zIndex: 25,
      alignItems: "center",
      justifyContent: "center",
      gap: tokens.space.md as any,
    },
    shortsAction: {
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      width: 58,
    },
    shortsActionPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.98 }],
    },
    shortsActionDisabled: {
      opacity: 0.5,
    },
    shortsActionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.13)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
    },
    shortsActionIconActive: {
      backgroundColor: tokens.colors.green700,
      borderColor: "rgba(255,255,255,0.22)",
    },
    shortsActionLabel: {
      maxWidth: 58,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "900",
      color: "rgba(255,255,255,0.86)",
      textAlign: "center",
    },
    shortsActionLabelActive: {
      color: tokens.colors.textInverse,
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
      backgroundColor: tokens.colors.surface,
      borderTopWidth: 1,
      borderTopColor: tokens.colors.borderStrong,
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
      transform: [{ translateY: 5 }],
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
    bookmarkModalListItemDisabled: {
      opacity: 0.55,
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
