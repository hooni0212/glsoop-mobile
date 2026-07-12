import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import {
  buildPremiumPath,
  trackPremiumFunnelEvent,
  type PremiumEntrySource,
} from "@/lib/premiumDiscovery";
import { tokens } from "@/theme/tokens";

type Props = {
  source: PremiumEntrySource;
  isPremium?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
};

export function PremiumDiscoveryCard({
  source,
  isPremium = false,
  dismissible = false,
  onDismiss,
}: Props) {
  const trackedRef = React.useRef(false);

  React.useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    void trackPremiumFunnelEvent("premium_entry_impression", source, {
      placement: "discovery_card",
      is_premium: isPremium,
    });
  }, [isPremium, source]);

  const openPremium = () => {
    void trackPremiumFunnelEvent("premium_entry_click", source, {
      placement: "discovery_card",
      is_premium: isPremium,
    });
    router.push(buildPremiumPath(source) as never);
  };

  return (
    <View style={styles.card} testID={`premium-discovery-${source}`}>
      <View style={styles.iconWrap}>
        <Ionicons name="sparkles" size={18} color={tokens.colors.green900} />
      </View>
      <Pressable
        onPress={openPremium}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={isPremium ? "프리미엄 구독 관리" : "글숲 프리미엄 혜택 보기"}
      >
        <Text style={styles.eyebrow}>{isPremium ? "PREMIUM ACTIVE" : "GLSOOP PREMIUM"}</Text>
        <Text style={styles.title}>{isPremium ? "프리미엄 사용 중" : "글을 더 오래 간직하는 방법"}</Text>
        <Text style={styles.description}>
          {isPremium
            ? "혜택과 구독 상태를 확인하고 관리할 수 있어요."
            : "광고 없는 사진 저장, 프로필 사진, 작가 서명과 문장 액자를 만나보세요."}
        </Text>
        <View style={styles.actionRow}>
          <Text style={styles.actionText}>{isPremium ? "구독 관리" : "혜택 보기"}</Text>
          <Ionicons name="arrow-forward" size={15} color={tokens.colors.green700} />
        </View>
      </Pressable>
      {dismissible ? (
        <Pressable
          onPress={onDismiss}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="프리미엄 소개 닫기"
        >
          <Ionicons name="close" size={17} color={tokens.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.green050,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
  },
  main: { flex: 1, gap: 4 },
  pressed: { opacity: 0.7 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 0.9, color: tokens.colors.green700 },
  title: { fontSize: 16, lineHeight: 22, fontWeight: "900", color: tokens.colors.text },
  description: { fontSize: 12, lineHeight: 18, fontWeight: "700", color: tokens.colors.textMuted },
  actionRow: { marginTop: 3, flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 12, fontWeight: "900", color: tokens.colors.green700 },
  closeBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center", marginTop: -6, marginRight: -6 },
});
