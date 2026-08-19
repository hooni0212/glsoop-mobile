import React from "react";
import { Image } from "expo-image";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { tokens } from "@/theme/tokens";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const glsoopIcon = require("../../../assets/images/icon.png");

type Props = {
  title?: string;
  message?: string;
};

export function AppBootScreen({
  title = "글숲",
  message = "문장이 머무는 곳으로 들어가는 중이에요.",
}: Props) {
  const reducedMotion = useReducedMotion();
  const pulse = React.useRef(new Animated.Value(0)).current;
  const progress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (reducedMotion) {
      pulse.setValue(0);
      progress.setValue(1);
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    const progressLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );

    pulseLoop.start();
    progressLoop.start();

    return () => {
      pulseLoop.stop();
      progressLoop.stop();
    };
  }, [progress, pulse, reducedMotion]);

  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.035],
  });
  const logoOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });
  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["24%", "100%"],
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID="app-boot-screen">
      <View style={styles.container}>
        <View style={styles.brandBlock}>
          <Animated.View
            style={[
              styles.logoFrame,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image source={glsoopIcon} style={styles.logoImage} contentFit="cover" />
          </Animated.View>

          <View style={styles.copyBlock}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>
        </View>

        <View style={styles.progressTrack} accessibilityRole="progressbar">
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 34,
  },
  brandBlock: {
    alignItems: "center",
    gap: tokens.space.lg as any,
  },
  logoFrame: {
    width: 132,
    height: 132,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: "#f2f0df",
    borderWidth: 1,
    borderColor: "rgba(45,90,61,0.12)",
    shadowColor: tokens.shadow.color,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  copyBlock: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: tokens.colors.text,
    textAlign: "center",
  },
  message: {
    fontSize: tokens.font.body,
    lineHeight: 22,
    color: tokens.colors.textMuted,
    textAlign: "center",
    maxWidth: 250,
  },
  progressTrack: {
    width: 118,
    height: 4,
    borderRadius: tokens.radius.pill,
    overflow: "hidden",
    backgroundColor: tokens.colors.green100,
  },
  progressFill: {
    height: "100%",
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green700,
  },
});
