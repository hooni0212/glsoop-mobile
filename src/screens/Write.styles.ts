import { StyleSheet } from "react-native";
import { tokens } from "@/theme/tokens";

export function createWriteStyles() {
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
      backgroundColor: tokens.colors.bgMuted,
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
      paddingHorizontal: tokens.space.lg,
      paddingTop: tokens.space.md,
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
      backgroundColor: tokens.colors.surface,
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
