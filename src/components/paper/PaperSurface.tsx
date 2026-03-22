import React from "react";
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  eyebrow?: string;
  hint?: string;
};

const paperFont = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia",
});

export function PaperSurface({ children, style, contentStyle, eyebrow, hint }: Props) {
  return (
    <View style={[styles.frame, style]}>
      {eyebrow || hint ? (
        <View style={styles.header}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
      ) : null}

      <View style={styles.paper}>
        <View pointerEvents="none" style={styles.tintWash} />
        <View pointerEvents="none" style={styles.glowOrb} />
        <View pointerEvents="none" style={styles.gridOverlayVertical} />
        <View pointerEvents="none" style={styles.gridOverlayHorizontal} />
        <View pointerEvents="none" style={styles.fiberOverlayA} />
        <View pointerEvents="none" style={styles.fiberOverlayB} />
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
    </View>
  );
}

export const paperSurfaceStyles = StyleSheet.create({
  serifText: {
    fontFamily: paperFont,
    color: "#2f2519",
  },
});

const styles = StyleSheet.create({
  frame: {
    borderRadius: 24,
    padding: 14,
    backgroundColor: "rgba(92,69,42,0.10)",
    borderWidth: 1,
    borderColor: "rgba(86,62,32,0.08)",
    shadowColor: "#4d3920",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 3,
  },
  header: {
    marginBottom: 10,
    gap: 4,
    paddingHorizontal: 4,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: "900",
    color: "rgba(80,58,32,0.55)",
  },
  hint: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(80,58,32,0.64)",
    letterSpacing: -0.2,
  },
  paper: {
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: "#f7efdf",
    borderWidth: 1,
    borderColor: "rgba(88,63,35,0.10)",
    shadowColor: "#8c6a3c",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  tintWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  glowOrb: {
    position: "absolute",
    left: "8%",
    bottom: "10%",
    width: "42%",
    height: "18%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  gridOverlayVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "18%",
    width: 1,
    backgroundColor: "rgba(112,101,80,0.06)",
  },
  gridOverlayHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "26%",
    height: 1,
    backgroundColor: "rgba(112,101,80,0.06)",
  },
  fiberOverlayA: {
    position: "absolute",
    top: "14%",
    right: "-8%",
    width: "52%",
    height: 22,
    borderRadius: 999,
    backgroundColor: "rgba(173,148,111,0.08)",
    transform: [{ rotate: "-14deg" }],
  },
  fiberOverlayB: {
    position: "absolute",
    top: "42%",
    left: "-10%",
    width: "56%",
    height: 18,
    borderRadius: 999,
    backgroundColor: "rgba(120,96,64,0.05)",
    transform: [{ rotate: "12deg" }],
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
  },
});
