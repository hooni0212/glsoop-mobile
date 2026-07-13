import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import {
  buildPremiumPath,
  trackPremiumFunnelEvent,
  type PremiumEntrySource,
} from "@/lib/premiumDiscovery";
import { tokens } from "@/theme/tokens";

type Props = {
  visible: boolean;
  source: PremiumEntrySource;
  title: string;
  description: string;
  benefit: string;
  onClose: () => void;
};

export function PremiumFeaturePrompt({ visible, source, title, description, benefit, onClose }: Props) {
  React.useEffect(() => {
    if (!visible) return;
    void trackPremiumFunnelEvent("premium_entry_impression", source, {
      placement: "feature_prompt",
    });
  }, [source, visible]);

  const openPremium = () => {
    onClose();
    void trackPremiumFunnelEvent("premium_entry_click", source, {
      placement: "feature_prompt",
    });
    router.push(buildPremiumPath(source) as never);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="닫기" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles" size={20} color={tokens.colors.green900} />
          </View>
          <Text style={styles.eyebrow}>GLSOOP PREMIUM</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          <View style={styles.benefitBox}>
            <Ionicons name="checkmark-circle" size={18} color={tokens.colors.green700} />
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
          <Pressable
            onPress={openPremium}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="프리미엄 혜택 보기"
          >
            <Text style={styles.primaryBtnText}>프리미엄 혜택 보기</Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="프리미엄 안내 나중에 보기"
          >
            <Text style={styles.secondaryBtnText}>나중에</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: tokens.colors.overlaySoft },
  sheet: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 10,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: tokens.colors.border,
  },
  handle: { width: 44, height: 4, borderRadius: tokens.radius.pill, alignSelf: "center", backgroundColor: tokens.colors.borderStrong, marginBottom: 8 },
  iconWrap: { width: 44, height: 44, borderRadius: tokens.radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: tokens.colors.green050 },
  eyebrow: { fontSize: 11, fontWeight: "900", letterSpacing: 1, color: tokens.colors.green700 },
  title: { fontSize: 22, lineHeight: 29, fontWeight: "900", color: tokens.colors.text },
  description: { fontSize: 14, lineHeight: 21, color: tokens.colors.textMuted },
  benefitBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 13, borderRadius: tokens.radius.lg, backgroundColor: tokens.colors.green050, marginVertical: 4 },
  benefitText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "800", color: tokens.colors.text },
  primaryBtn: { minHeight: 48, borderRadius: tokens.radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: tokens.colors.green700, marginTop: 4 },
  primaryBtnText: { fontSize: 14, fontWeight: "900", color: tokens.colors.textInverse },
  secondaryBtn: { minHeight: 42, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { fontSize: 13, fontWeight: "800", color: tokens.colors.textMuted },
  pressed: { opacity: 0.72 },
});
