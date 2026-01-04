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
  });
}
