import { Platform, StyleSheet } from "react-native";
import { tokens } from "@/theme/tokens";

export function createWriteStyles() {
  const paperFont = Platform.select({
    ios: "Georgia",
    android: "serif",
    default: "Georgia",
  });
  const sansFont = Platform.select({
    ios: "System",
    android: "sans-serif",
    default: "System",
  });
  const handFont = Platform.select({
    ios: "Snell Roundhand",
    android: "cursive",
    default: "cursive",
  });

  return StyleSheet.create({
    flex: { flex: 1 },

    safe: {
      flex: 1,
      backgroundColor: tokens.colors.bgMuted,
    },

    topBar: {
      height: 56,
      paddingHorizontal: tokens.space.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: tokens.colors.border,
      backgroundColor: tokens.colors.surfaceStrong,
    },
    topBarActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.space.sm,
    },

    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },

    screenTitle: {
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: -0.2,
      color: tokens.colors.text,
    },

    doneBtn: {
      paddingHorizontal: 12,
      height: 34,
      borderRadius: tokens.radius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tokens.colors.green900,
    },
    doneBtnDisabled: {
      backgroundColor: tokens.colors.green100,
    },
    doneText: {
      color: tokens.colors.textInverse,
      fontWeight: "800",
      fontSize: 13,
      letterSpacing: -0.2,
    },
    doneTextDisabled: {
      color: tokens.colors.textInverseMuted,
    },

    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: tokens.space.lg,
      paddingTop: tokens.space.md,
      paddingBottom: tokens.space.xl,
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
      borderRadius: tokens.radius.lg,
      padding: tokens.space.md,
      backgroundColor: tokens.colors.white,
      borderWidth: 1,
      borderColor: tokens.colors.border,

      shadowColor: tokens.shadow.color,
      shadowOpacity: tokens.shadow.opacity,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },

    editorWrap: {
      marginBottom: 14,
    },

    editorStage: {
      marginBottom: 14,
      borderRadius: 24,
      padding: 14,
      backgroundColor: tokens.colors.surfaceStrong,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      shadowColor: "#4d3920",
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 14 },
      elevation: 3,
    },
    editorStageHeader: {
      marginBottom: 14,
      gap: 4,
    },
    editorStageEyebrow: {
      fontSize: 11,
      letterSpacing: 1.4,
      fontWeight: "900",
      color: tokens.colors.textFaint,
    },
    editorStageHint: {
      fontSize: 12,
      fontWeight: "700",
      color: tokens.colors.textMuted,
      letterSpacing: -0.2,
    },
    bookCanvas: {
      width: "100%",
      aspectRatio: 500 / 666,
      borderRadius: 22,
      overflow: "hidden",
      backgroundColor: tokens.colors.bg,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      shadowColor: "#8c6a3c",
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
    bookCanvasPressable: {
      width: "100%",
    },
    bookCanvasImage: {
      borderRadius: 22,
    },
    bookBox: {
      position: "absolute",
      paddingHorizontal: 4,
      paddingTop: 20,
      paddingBottom: 2,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "rgba(79,58,33,0.12)",
      backgroundColor: "rgba(255,255,255,0.04)",
    },
    bookBodyBox: {
      paddingTop: 24,
    },
    bookBoxActive: {
      borderColor: "rgba(24,96,58,0.85)",
      borderStyle: "dashed",
      backgroundColor: "rgba(240,252,245,0.18)",
    },
    bookTitleInput: {
      color: "#3c342d",
      fontWeight: "700",
      letterSpacing: -0.3,
      height: "100%",
      padding: 0,
      textAlignVertical: "top",
    },
    bookBodyInput: {
      color: "#524941",
      fontWeight: "500",
      height: "100%",
      padding: 0,
      textAlignVertical: "top",
    },
    bookFooterBox: {
      justifyContent: "center",
    },
    dragHandle: {
      position: "absolute",
      top: 4,
      left: 4,
      zIndex: 2,
      minWidth: 34,
      height: 18,
      paddingHorizontal: 8,
      borderRadius: 999,
      backgroundColor: tokens.colors.surfaceStrong,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    dragHandleBody: {
      minWidth: 42,
      height: 22,
      paddingHorizontal: 10,
      top: 3,
      left: 6,
    },
    dragHandleActive: {
      backgroundColor: tokens.colors.green100,
      borderColor: tokens.colors.green700,
    },
    dragHandleGrip: {
      width: 3,
      height: 3,
      borderRadius: 999,
      backgroundColor: "rgba(79,58,33,0.55)",
    },
    bookFooterText: {
      color: "rgba(81,65,49,0.72)",
      fontWeight: "700",
    },
    bookFontSerif: {
      fontFamily: paperFont,
    },
    bookFontSans: {
      fontFamily: sansFont,
    },
    bookFontHand: {
      fontFamily: handFont,
    },
    editorPlaceholder: {
      color: "rgba(80,58,32,0.34)",
    },
    editorControlDock: {
      marginTop: 12,
    },

    label: {
      fontSize: tokens.font.small,
      fontWeight: "800",
      color: tokens.colors.textMuted,
      marginBottom: 8,
      letterSpacing: -0.2,
    },

    inputTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: tokens.colors.text,
      paddingVertical: 6,
    },

    divider: {
      height: 1,
      backgroundColor: tokens.colors.border,
      marginVertical: 12,
    },

    inputBody: {
      minHeight: 220,
      fontSize: 14,
      lineHeight: 20,
      color: tokens.colors.text,
      paddingVertical: 6,
      textAlignVertical: "top",
    },

    hint: {
      marginTop: 10,
      fontSize: tokens.font.small,
      color: tokens.colors.textFaint,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    metaCard: {
      marginTop: 12,
      borderRadius: 14,
      padding: 12,
      backgroundColor: tokens.colors.surfaceStrong,
      borderWidth: 1,
      borderColor: tokens.colors.border,
    },
    metaChipRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
    },
    metaChip: {
      borderRadius: tokens.radius.pill,
      borderWidth: 1,
      borderColor: tokens.colors.borderStrong,
      backgroundColor: tokens.colors.white,
      paddingVertical: 7,
      paddingHorizontal: 12,
    },
    metaChipActive: {
      borderColor: tokens.colors.green900,
      backgroundColor: tokens.colors.green100,
    },
    metaChipText: {
      fontSize: tokens.font.small,
      fontWeight: "800",
      color: tokens.colors.text,
    },
    metaChipTextActive: {
      color: tokens.colors.green900,
    },
    metaDivider: {
      height: 1,
      backgroundColor: tokens.colors.border,
      marginVertical: 12,
    },
    metaInput: {
      borderWidth: 1,
      borderColor: tokens.colors.borderStrong,
      borderRadius: tokens.radius.lg,
      backgroundColor: tokens.colors.white,
      paddingHorizontal: 12,
      paddingVertical: 10,
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
      borderRadius: 18,
      padding: 14,
      backgroundColor: tokens.colors.surfaceStrong,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      gap: 10,
    },
    layoutDockHeader: {
      gap: 4,
    },
    layoutDockTitle: {
      fontSize: 13,
      fontWeight: "900",
      color: "#3b2d1d",
      letterSpacing: -0.2,
    },
    layoutDockHint: {
      fontSize: 12,
      fontWeight: "700",
      color: "rgba(76,57,34,0.62)",
      letterSpacing: -0.2,
    },
    layoutSectionCard: {
      borderRadius: 16,
      padding: 12,
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
      color: "rgba(76,57,34,0.62)",
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
      borderColor: tokens.colors.borderStrong,
      backgroundColor: tokens.colors.white,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    layoutOptionActive: {
      borderColor: tokens.colors.green900,
      backgroundColor: tokens.colors.green100,
    },
    layoutOptionText: {
      fontSize: tokens.font.small,
      fontWeight: "800",
      color: tokens.colors.text,
    },
    layoutOptionTextActive: {
      color: tokens.colors.green900,
    },
    previewStage: {
      borderRadius: 24,
      padding: 14,
      backgroundColor: tokens.colors.surfaceStrong,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      marginBottom: 12,
    },
    previewStageHeader: {
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    previewStageEyebrow: {
      fontSize: 11,
      letterSpacing: 1.4,
      fontWeight: "900",
      color: "rgba(80,58,32,0.55)",
    },
    previewStageHint: {
      marginTop: 4,
      fontSize: 12,
      fontWeight: "700",
      color: "rgba(80,58,32,0.64)",
    },
    previewPaper: {
      minHeight: 320,
      borderRadius: 22,
      backgroundColor: tokens.colors.bg,
      paddingHorizontal: 22,
      paddingVertical: 26,
      justifyContent: "space-between",
      gap: 16,
      borderWidth: 1,
      borderColor: tokens.colors.border,
    },
    previewTitle: {
      color: "#2e2418",
      fontWeight: "700",
      letterSpacing: -0.3,
      fontFamily: paperFont,
    },
    previewBody: {
      flex: 1,
      color: "#2f2519",
      fontWeight: "500",
      fontFamily: paperFont,
    },
    previewFooter: {
      color: "rgba(76,57,34,0.62)",
      fontWeight: "700",
      fontFamily: paperFont,
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
