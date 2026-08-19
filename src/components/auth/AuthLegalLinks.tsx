import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { getLegalDocumentUrl, type LegalDocumentKey } from "@/config/release";
import { useRuntimeLegalConfig } from "@/hooks/useRuntimeLegalConfig";
import { openExternalUrl } from "@/lib/externalLinks";
import { resolveRuntimeLegalDocumentUrl } from "@/services/runtimeConfigService";
import { tokens } from "@/theme/tokens";

type Props = {
  compact?: boolean;
  showAgreementHint?: boolean;
};

const LEGAL_ITEMS: { key: LegalDocumentKey; label: string }[] = [
  { key: "terms", label: "이용약관" },
  { key: "privacy", label: "개인정보 처리방침" },
  { key: "guidelines", label: "커뮤니티 가이드라인" },
];

export function AuthLegalLinks({
  compact = false,
  showAgreementHint = true,
}: Props) {
  const { config: runtimeLegalConfig } = useRuntimeLegalConfig();

  const handleOpenLegal = React.useCallback((key: LegalDocumentKey) => {
    const targetUrl = resolveRuntimeLegalDocumentUrl(
      runtimeLegalConfig,
      key,
      getLegalDocumentUrl(key)
    );

    void openExternalUrl(targetUrl).catch(() => {
      Alert.alert("문서를 열지 못했어요", "잠시 후 다시 시도해주세요.");
    });
  }, [runtimeLegalConfig]);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <Text style={styles.caption}>서비스 이용 전 아래 문서를 확인해 주세요.</Text>
      <View style={styles.linkRow}>
        {LEGAL_ITEMS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => handleOpenLegal(item.key)}
            style={({ pressed }) => [
              styles.linkChip,
              compact && styles.linkChipCompact,
              pressed && styles.linkChipPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${item.label} 열기`}
            testID={`auth-legal-link-${item.key}`}
          >
            <Text style={styles.linkChipText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      {showAgreementHint ? (
        <Text style={styles.hint}>
          로그인 또는 회원가입을 진행하면 위 문서와 커뮤니티 운영 기준을 확인한 뒤 서비스에
          접근하게 돼요.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.space.sm as any,
  },
  containerCompact: {
    gap: tokens.space.xs as any,
  },
  caption: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
    textAlign: "center",
  },
  linkRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: tokens.space.xs as any,
  },
  linkChip: {
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surfaceStrong,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  linkChipCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  linkChipPressed: {
    opacity: 0.9,
  },
  linkChipText: {
    color: tokens.colors.text,
    fontSize: tokens.font.small,
    fontWeight: "500",
  },
  hint: {
    fontSize: 12,
    color: tokens.colors.textFaint,
    lineHeight: 18,
    textAlign: "center",
  },
});
