import { StyleSheet } from "react-native";

export function createWriteStyles() {
  return StyleSheet.create({
    flex: { flex: 1 },

    safe: {
      flex: 1,
      backgroundColor: "#F6F6F4",
    },

    topBar: {
      height: 56,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderBottomColor: "rgba(0,0,0,0.06)",
      backgroundColor: "#F6F6F4",
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
      color: "#2B2B2B",
    },

    doneBtn: {
      paddingHorizontal: 12,
      height: 34,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#2E5A3D",
    },
    doneBtnDisabled: {
      backgroundColor: "rgba(46,90,61,0.25)",
    },
    doneText: {
      color: "#FFFFFF",
      fontWeight: "800",
      fontSize: 13,
      letterSpacing: -0.2,
    },
    doneTextDisabled: {
      color: "rgba(255,255,255,0.9)",
    },

    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 14,
    },
    center: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
    },

    card: {
      borderRadius: 16,
      padding: 14,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.06)",

      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },

    label: {
      fontSize: 12,
      fontWeight: "800",
      color: "#6C6C6C",
      marginBottom: 8,
      letterSpacing: -0.2,
    },

    inputTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: "#2B2B2B",
      paddingVertical: 6,
    },

    divider: {
      height: 1,
      backgroundColor: "rgba(0,0,0,0.06)",
      marginVertical: 12,
    },

    inputBody: {
      minHeight: 220,
      fontSize: 14,
      lineHeight: 20,
      color: "#2B2B2B",
      paddingVertical: 6,
      textAlignVertical: "top",
    },

    hint: {
      marginTop: 10,
      fontSize: 12,
      color: "#8B8B8B",
      fontWeight: "700",
      letterSpacing: -0.2,
    },

    // --- Modal (cross-platform confirm UI) ---
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      alignItems: "center",
      justifyContent: "center",
      padding: 18,
    },
    modalCard: {
      width: "100%",
      maxWidth: 420,
      borderRadius: 16,
      backgroundColor: "#FFFFFF",
      padding: 16,
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.08)",
    },
    modalTitle: {
      fontSize: 15,
      fontWeight: "900",
      color: "#1E1E1E",
      letterSpacing: -0.2,
    },
    modalMessage: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 18,
      color: "#4B4B4B",
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
      borderColor: "rgba(0,0,0,0.08)",
      backgroundColor: "#F6F6F4",
    },
    modalBtnCancel: {
      backgroundColor: "#FFFFFF",
    },
    modalBtnDestructive: {
      borderColor: "rgba(180,50,50,0.25)",
      backgroundColor: "rgba(180,50,50,0.06)",
    },
    modalBtnText: {
      fontSize: 13,
      fontWeight: "900",
      color: "#2B2B2B",
      letterSpacing: -0.2,
    },
    modalBtnTextCancel: {
      color: "#2B2B2B",
    },
    modalBtnTextDestructive: {
      color: "rgba(180,50,50,0.95)",
    },

    // --- Small util for topbar text-icon (draft list screen) ---
    iconText: {
      fontSize: 16,
      fontWeight: "900",
      color: "#2B2B2B",
    },

    // --- Simple chip buttons (Draft list actions) ---
    chip: {
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.10)",
      backgroundColor: "rgba(255,255,255,0.55)",
    },
    chipText: {
      fontSize: 13,
      fontWeight: "900",
      color: "#2B2B2B",
      letterSpacing: -0.2,
    },

  });
}
