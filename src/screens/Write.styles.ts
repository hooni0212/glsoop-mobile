import { StyleSheet } from "react-native";
import { tokens } from "@/theme/tokens";

export function createWriteStyles() {
  return StyleSheet.create({
    flex: { flex: 1 },

    safe: {
      flex: 1,
      backgroundColor: tokens.colors.bg,
    },

    topBar: {
      height: 62,
      paddingHorizontal: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: tokens.colors.bg,
    },
    topBarActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    iconBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tokens.colors.surfaceStrong,
      borderWidth: 1,
      borderColor: tokens.colors.border,
    },

    screenTitle: {
      flex: 1,
      marginLeft: 12,
      fontSize: 18,
      fontWeight: "900",
      letterSpacing: 0,
      color: tokens.colors.text,
    },

    doneBtn: {
      minWidth: 79,
      paddingHorizontal: 16,
      height: 42,
      borderRadius: tokens.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tokens.colors.green700,
      borderWidth: 1,
      borderColor: tokens.colors.green700,
    },
    doneBtnDisabled: {
      backgroundColor: tokens.colors.green100,
      borderColor: tokens.colors.green100,
    },
    doneText: {
      color: tokens.colors.textInverse,
      fontWeight: "800",
      fontSize: 14,
      letterSpacing: 0,
    },
    doneTextDisabled: {
      color: tokens.colors.textInverseMuted,
    },
    secondaryTopBtn: {
      minWidth: 92,
      height: 42,
      borderRadius: tokens.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tokens.colors.surface,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      paddingHorizontal: 14,
    },
    secondaryTopBtnText: {
      fontSize: 14,
      fontWeight: "900",
      color: tokens.colors.text,
      letterSpacing: 0,
    },

    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 10,
      paddingBottom: 24,
    },
    scrollContentWide: {
      alignItems: "center",
      paddingBottom: tokens.space.xl * 1.5,
    },
    contentStack: {
      width: "100%",
    },
    contentStackWide: {
      width: "100%",
      maxWidth: 760,
    },
    center: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
    },

    card: {
      borderRadius: 28,
      padding: 20,
      backgroundColor: tokens.colors.white,
      borderWidth: 1,
      borderColor: tokens.colors.border,

      shadowColor: tokens.shadow.color,
      shadowOpacity: 0.04,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 1,
    },

    editorWrap: {
      marginBottom: 14,
      gap: 18,
    },
    writeFormCard: {
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 20,
    },
    quickMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      paddingHorizontal: 2,
    },
    quickMetaChip: {
      minHeight: 36,
      minWidth: 62,
      borderRadius: tokens.radius.pill,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      backgroundColor: tokens.colors.surface,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
    },
    quickMetaChipActive: {
      borderColor: tokens.colors.green700,
      backgroundColor: tokens.colors.green100,
    },
    quickMetaChipText: {
      fontSize: 13,
      fontWeight: "900",
      color: tokens.colors.textMuted,
      letterSpacing: 0,
    },
    quickMetaChipTextActive: {
      color: tokens.colors.green700,
    },

    label: {
      fontSize: tokens.font.small,
      fontWeight: "800",
      color: tokens.colors.textMuted,
      marginBottom: 8,
      letterSpacing: 0,
    },

    inputTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: tokens.colors.text,
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 56,
      lineHeight: 22,
      borderWidth: 1,
      borderColor: tokens.colors.borderStrong,
      borderRadius: 18,
      backgroundColor: tokens.colors.white,
    },

    divider: {
      height: 12,
    },

    inputBody: {
      minHeight: 150,
      fontSize: 14,
      lineHeight: 20,
      color: tokens.colors.text,
      paddingHorizontal: 16,
      paddingVertical: 16,
      textAlignVertical: "top",
      borderWidth: 1,
      borderColor: tokens.colors.borderStrong,
      borderRadius: 18,
      backgroundColor: tokens.colors.white,
    },

    hint: {
      marginTop: 10,
      fontSize: tokens.font.small,
      color: tokens.colors.textFaint,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    metaCard: {
      borderRadius: 24,
      padding: 26,
      backgroundColor: tokens.colors.white,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      gap: 4,
    },
    metaChipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 6,
    },
    metaChip: {
      borderRadius: tokens.radius.pill,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      backgroundColor: tokens.colors.white,
      minHeight: 36,
      minWidth: 62,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      paddingHorizontal: 18,
    },
    metaChipActive: {
      borderColor: tokens.colors.green700,
      backgroundColor: tokens.colors.green100,
    },
    metaChipText: {
      fontSize: tokens.font.small,
      fontWeight: "800",
      color: tokens.colors.text,
    },
    metaChipTextActive: {
      color: tokens.colors.green700,
    },
    metaDivider: {
      height: 1,
      backgroundColor: tokens.colors.border,
      marginVertical: 12,
    },
    metaInput: {
      borderWidth: 1,
      borderColor: tokens.colors.borderStrong,
      borderRadius: 18,
      backgroundColor: tokens.colors.white,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 14,
      color: tokens.colors.text,
    },
    metaChipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
    },
    hashChip: {
      borderRadius: tokens.radius.pill,
      borderWidth: 1,
      borderColor: tokens.colors.green700,
      backgroundColor: tokens.colors.green100,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    hashChipText: {
      fontSize: tokens.font.small,
      fontWeight: "800",
      color: tokens.colors.green900,
    },
    layoutBlock: {
      marginTop: 10,
    },
    layoutDock: {
      borderRadius: 24,
      padding: 26,
      backgroundColor: tokens.colors.white,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      gap: 12,
    },
    layoutDockHeader: {
      gap: 4,
    },
    layoutDockTitle: {
      fontSize: 13,
      fontWeight: "900",
      color: tokens.colors.text,
      letterSpacing: 0,
    },
    layoutDockHint: {
      fontSize: 12,
      fontWeight: "700",
      color: tokens.colors.textMuted,
      letterSpacing: 0,
    },
    layoutSectionCard: {
      borderRadius: 20,
      padding: 16,
      backgroundColor: tokens.colors.white,
      borderWidth: 1,
      borderColor: tokens.colors.border,
    },
    layoutSectionCardMuted: {
      backgroundColor: tokens.colors.surface,
      borderColor: tokens.colors.border,
    },
    layoutSectionHeader: {
      gap: 4,
      marginBottom: 4,
    },
    layoutSectionTitle: {
      fontSize: 13,
      fontWeight: "900",
      color: "#3b2d1d",
      letterSpacing: -0.2,
    },
    layoutSectionHint: {
      fontSize: 12,
      fontWeight: "700",
      color: "rgba(76,57,34,0.62)",
      letterSpacing: -0.2,
    },
    backgroundSection: {
      borderRadius: 24,
      padding: 24,
      backgroundColor: tokens.colors.white,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      gap: 18,
    },
    backgroundOptionRow: {
      flexDirection: "row",
      gap: 14,
    },
    backgroundOption: {
      width: 92,
      minHeight: 148,
      position: "relative",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      backgroundColor: tokens.colors.white,
      padding: 0,
    },
    backgroundOptionActive: {
      borderWidth: 2,
      borderColor: tokens.colors.green700,
      backgroundColor: tokens.colors.white,
    },
    backgroundPreview: {
      height: 122,
      borderRadius: 13,
      overflow: "hidden",
      backgroundColor: tokens.colors.bg,
    },
    backgroundPreviewImage: {
      position: "absolute",
      borderRadius: 10,
    },
    backgroundPreviewImageCover: {
      ...StyleSheet.absoluteFillObject,
    },
    backgroundPreviewImageContainTop: {
      top: 0,
      left: 0,
      width: "100%",
    },
    backgroundPreviewWash: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(255,255,255,0.04)",
    },
    backgroundSelectedBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tokens.colors.green700,
      borderWidth: 2,
      borderColor: tokens.colors.white,
      shadowColor: "#264632",
      shadowOpacity: 0.18,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    backgroundOptionTitle: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: "900",
      color: tokens.colors.text,
      letterSpacing: 0,
    },
    backgroundOptionTitleActive: {
      color: tokens.colors.green700,
    },
    backgroundOptionDescription: {
      marginTop: 2,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "700",
      color: tokens.colors.textMuted,
      letterSpacing: 0,
    },
    layoutAdvancedToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    layoutAdvancedToggleCopy: {
      flex: 1,
      gap: 4,
    },
    layoutAdvancedPanel: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: "rgba(86,62,32,0.08)",
    },
    layoutMetrics: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: "700",
      color: tokens.colors.textMuted,
    },
    layoutOptionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 6,
    },
    layoutOption: {
      borderRadius: tokens.radius.pill,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      backgroundColor: tokens.colors.white,
      minHeight: 36,
      paddingHorizontal: 18,
      paddingVertical: 8,
    },
    layoutOptionActive: {
      borderColor: tokens.colors.green700,
      backgroundColor: tokens.colors.green100,
    },
    layoutOptionText: {
      fontSize: tokens.font.small,
      fontWeight: "800",
      color: tokens.colors.text,
    },
    layoutOptionTextActive: {
      color: tokens.colors.green700,
    },
    previewControlStack: {
      gap: 14,
      marginHorizontal: -24,
      marginBottom: -24,
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 24,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      backgroundColor: tokens.colors.white,
      borderWidth: 1,
      borderColor: tokens.colors.border,
    },
    previewSheetHandle: {
      alignSelf: "center",
      width: 62,
      height: 5,
      borderRadius: 3,
      backgroundColor: tokens.colors.borderStrong,
    },
    previewPanelTabs: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      backgroundColor: tokens.colors.white,
    },
    previewPanelTab: {
      minHeight: 36,
      minWidth: 72,
      borderRadius: tokens.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      backgroundColor: tokens.colors.white,
    },
    previewPanelTabActive: {
      backgroundColor: tokens.colors.green100,
      borderColor: tokens.colors.green700,
    },
    previewPanelTabText: {
      fontSize: 13,
      fontWeight: "900",
      color: tokens.colors.textMuted,
      letterSpacing: 0,
    },
    previewPanelTabTextActive: {
      color: tokens.colors.green700,
    },
    previewPanelInnerScroll: {
      maxHeight: 300,
    },
    previewPanelInnerContent: {
      paddingBottom: 4,
    },
    // --- Modal (cross-platform confirm UI) ---
    modalOverlay: {
      flex: 1,
      backgroundColor: tokens.colors.overlay,
      alignItems: "center",
      justifyContent: "center",
      padding: 18,
    },
    modalCard: {
      width: "100%",
      maxWidth: 420,
      borderRadius: tokens.radius.lg,
      backgroundColor: tokens.colors.white,
      padding: tokens.space.lg,
      borderWidth: 1,
      borderColor: tokens.colors.borderStrong,
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: "900",
      color: tokens.colors.text,
      letterSpacing: -0.2,
    },
    modalMessage: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 18,
      color: tokens.colors.textMuted,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    modalButtons: {
      marginTop: 14,
      gap: 10,
    },
    modalBtn: {
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: tokens.colors.borderStrong,
      backgroundColor: tokens.colors.bgMuted,
    },
    modalBtnCancel: {
      backgroundColor: tokens.colors.white,
    },
    modalBtnDestructive: {
      borderColor: tokens.colors.dangerBorder,
      backgroundColor: tokens.colors.dangerSoft,
    },
    modalBtnText: {
      fontSize: 13,
      fontWeight: "900",
      color: tokens.colors.text,
      letterSpacing: -0.2,
    },
    modalBtnTextCancel: {
      color: tokens.colors.text,
    },
    modalBtnTextDestructive: {
      color: tokens.colors.danger,
    },

    // --- Small util for topbar text-icon (draft list screen) ---
    iconText: {
      fontSize: 16,
      fontWeight: "900",
      color: tokens.colors.text,
    },

    // --- Simple chip buttons (Draft list actions) ---
    chip: {
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: tokens.colors.borderStrong,
      backgroundColor: tokens.colors.surface,
    },
    chipCompact: {
      paddingHorizontal: 10,
    },
    chipText: {
      fontSize: 13,
      fontWeight: "900",
      color: tokens.colors.text,
      letterSpacing: -0.2,
    },

    // --- Success modal ---
    successOverlay: {
      flex: 1,
      backgroundColor: tokens.colors.overlaySoft,
      justifyContent: "center",
      alignItems: "center",
    },
    successCard: {
      padding: tokens.space.xl,
      borderRadius: 14,
      backgroundColor: tokens.colors.white,
      alignItems: "center",
      width: 260,
    },
    successTitle: {
      fontWeight: "900",
      fontSize: 16,
      color: tokens.colors.text,
    },
    successMessage: {
      marginTop: 8,
      fontWeight: "700",
      color: tokens.colors.textMuted,
      textAlign: "center",
    },
    successActions: {
      width: "100%",
      marginTop: 14,
      gap: 8,
    },
    modalBtnPrimary: {
      backgroundColor: tokens.colors.green900,
      borderColor: tokens.colors.green900,
    },
    modalBtnTextPrimary: {
      color: tokens.colors.textInverse,
    },

    // --- Dev helpers ---
    devWrap: {
      padding: 12,
    },
    devCard: {
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: tokens.colors.borderStrong,
      borderRadius: 10,
      padding: 10,
      backgroundColor: tokens.colors.surface,
    },
    devRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    devTitle: {
      fontWeight: "800",
      color: tokens.colors.text,
    },
    devDescription: {
      color: tokens.colors.textMuted,
      marginTop: 4,
      fontSize: 12,
    },
  });
}
