import React from "react";
import { ImageBackground, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { appFontFamily, typography } from "@/theme/typography";
import { tokens } from "@/theme/tokens";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  eyebrow?: string;
  hint?: string;
};

const bookPageSource = require("../../../assets/images/feed-templates/paper-source-02.jpg");

export function PaperSurface({ children, style, contentStyle, eyebrow, hint }: Props) {
  return (
    <View style={[styles.frame, style]}>
      {eyebrow || hint ? (
        <View style={styles.header}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
      ) : null}

      <ImageBackground source={bookPageSource} resizeMode="cover" style={styles.paper} imageStyle={styles.paperImage}>
        <View pointerEvents="none" style={styles.printWash} />
        <View style={[styles.content, contentStyle]}>{children}</View>
      </ImageBackground>
    </View>
  );
}

export const paperSurfaceStyles = StyleSheet.create({
  serifText: {
    fontFamily: appFontFamily.editorial,
    color: "rgba(35, 38, 31, 0.86)",
    textShadowColor: "rgba(23, 33, 27, 0.12)",
    textShadowOffset: { width: 0, height: 0.25 },
    textShadowRadius: 0.2,
  },
});

const styles = StyleSheet.create({
  frame: {
    borderRadius: tokens.radius.paper,
    backgroundColor: tokens.colors.paper,
    overflow: "hidden",
  },
  header: {
    marginBottom: 10,
    gap: 4,
    paddingHorizontal: 4,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: tokens.colors.textMuted,
  },
  hint: {
    ...typography.meta,
    color: tokens.colors.textMuted,
  },
  paper: {
    overflow: "hidden",
    minHeight: 460,
    borderRadius: tokens.radius.paper,
    backgroundColor: tokens.colors.paperWarm,
  },
  paperImage: {
    borderRadius: tokens.radius.paper,
  },
  printWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 253, 248, 0.04)",
  },
  content: {
    paddingHorizontal: 54,
    paddingTop: 116,
    paddingBottom: 40,
  },
});
