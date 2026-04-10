import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  DEFAULT_SAFETY_DETAIL_MAX_LENGTH,
  DEFAULT_SAFETY_DETAIL_REQUIRED_REASON_CODES,
  type SafetyReason,
} from "@/services/safetyService";
import { tokens } from "@/theme/tokens";

type SafetyReasonModalProps = {
  visible: boolean;
  title: string;
  description: string;
  reasons: SafetyReason[];
  defaultReasonCode?: string;
  detailMaxLength?: number | null;
  detailRequiredReasonCodes?: string[] | readonly string[];
  detailPlaceholder?: string;
  submitLabel?: string;
  cancelLabel?: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (input: { reasonCode: string; detail?: string }) => void | Promise<void>;
};

function normalizeReasonCodes(value?: string[] | readonly string[]) {
  if (!Array.isArray(value) || value.length === 0) {
    return [...DEFAULT_SAFETY_DETAIL_REQUIRED_REASON_CODES];
  }
  const normalized = value
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);
  return normalized.length > 0
    ? [...new Set(normalized)]
    : [...DEFAULT_SAFETY_DETAIL_REQUIRED_REASON_CODES];
}

export function SafetyReasonModal({
  visible,
  title,
  description,
  reasons,
  defaultReasonCode,
  detailMaxLength,
  detailRequiredReasonCodes,
  detailPlaceholder,
  submitLabel = "접수하기",
  cancelLabel = "취소",
  submitting = false,
  onClose,
  onSubmit,
}: SafetyReasonModalProps) {
  const safeReasons = React.useMemo(
    () =>
      Array.isArray(reasons)
        ? reasons.filter((item) => item.code.trim().length > 0 && item.label.trim().length > 0)
        : [],
    [reasons]
  );
  const normalizedDetailMaxLength =
    Number(detailMaxLength) > 0 ? Number(detailMaxLength) : DEFAULT_SAFETY_DETAIL_MAX_LENGTH;
  const requiredReasonCodes = React.useMemo(
    () => normalizeReasonCodes(detailRequiredReasonCodes),
    [detailRequiredReasonCodes]
  );
  const initialReasonCode = React.useMemo(() => {
    if (
      typeof defaultReasonCode === "string" &&
      safeReasons.some((reason) => reason.code === defaultReasonCode)
    ) {
      return defaultReasonCode;
    }
    return safeReasons[0]?.code ?? "";
  }, [defaultReasonCode, safeReasons]);

  const [selectedReasonCode, setSelectedReasonCode] = React.useState(initialReasonCode);
  const [detail, setDetail] = React.useState("");

  React.useEffect(() => {
    if (!visible) return;
    setSelectedReasonCode(initialReasonCode);
    setDetail("");
  }, [initialReasonCode, visible]);

  const requiresDetail = requiredReasonCodes.includes(selectedReasonCode.trim().toLowerCase());
  const trimmedDetail = detail.trim();
  const isDetailLengthValid = detail.length <= normalizedDetailMaxLength;
  const canSubmit =
    selectedReasonCode.trim().length > 0 &&
    isDetailLengthValid &&
    (!requiresDetail || trimmedDetail.length > 0) &&
    !submitting;

  const helperMessage = requiresDetail
    ? `기타 사유를 선택한 경우 1자 이상 ${normalizedDetailMaxLength}자 이하로 입력해 주세요.`
    : `필요하면 사유를 바꿔 신고할 수 있어요.`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          <ScrollView
            style={styles.reasonList}
            contentContainerStyle={styles.reasonListContent}
            showsVerticalScrollIndicator={false}
          >
            {safeReasons.map((reason) => {
              const active = reason.code === selectedReasonCode;
              return (
                <Pressable
                  key={reason.code}
                  onPress={() => setSelectedReasonCode(reason.code)}
                  style={[styles.reasonChip, active && styles.reasonChipActive]}
                >
                  <Text style={[styles.reasonChipText, active && styles.reasonChipTextActive]}>
                    {reason.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {requiresDetail ? (
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>상세 설명</Text>
              <TextInput
                value={detail}
                onChangeText={(next) => {
                  setDetail(next.slice(0, normalizedDetailMaxLength));
                }}
                placeholder={
                  detailPlaceholder ??
                  `기타 사유를 ${normalizedDetailMaxLength}자 이내로 적어주세요.`
                }
                multiline
                textAlignVertical="top"
                maxLength={normalizedDetailMaxLength}
                style={styles.detailInput}
              />
              <View style={styles.detailMetaRow}>
                <Text style={styles.detailHelper}>{helperMessage}</Text>
                <Text style={styles.detailCount}>
                  {detail.length}/{normalizedDetailMaxLength}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.detailHelperStandalone}>{helperMessage}</Text>
          )}

          <View style={styles.actionRow}>
            <Pressable
              onPress={onClose}
              style={[styles.actionBtn, styles.secondaryBtn]}
              disabled={submitting}
            >
              <Text style={styles.secondaryBtnText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!canSubmit) return;
                void onSubmit({
                  reasonCode: selectedReasonCode,
                  detail: requiresDetail ? trimmedDetail : undefined,
                });
              }}
              style={[
                styles.actionBtn,
                styles.primaryBtn,
                !canSubmit && styles.disabledBtn,
              ]}
              disabled={!canSubmit}
            >
              <Text style={styles.primaryBtnText}>
                {submitting ? "처리 중..." : submitLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: tokens.space.xl,
    backgroundColor: tokens.colors.overlay,
  },
  card: {
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
    maxHeight: "80%",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  description: {
    fontSize: tokens.font.body,
    color: tokens.colors.textMuted,
    lineHeight: 22,
  },
  reasonList: {
    maxHeight: 260,
  },
  reasonListContent: {
    gap: tokens.space.sm as any,
  },
  reasonChip: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.md,
  },
  reasonChipActive: {
    borderColor: tokens.colors.green700,
    backgroundColor: tokens.colors.green100,
  },
  reasonChipText: {
    fontSize: 15,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  reasonChipTextActive: {
    color: tokens.colors.green900,
  },
  detailBox: {
    gap: tokens.space.sm as any,
  },
  detailLabel: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  detailInput: {
    minHeight: 116,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.white,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.md,
    fontSize: tokens.font.body,
    color: tokens.colors.text,
  },
  detailMetaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.space.sm as any,
  },
  detailHelper: {
    flex: 1,
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 18,
  },
  detailHelperStandalone: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 18,
  },
  detailCount: {
    fontSize: tokens.font.small,
    color: tokens.colors.textFaint,
  },
  actionRow: {
    flexDirection: "row",
    gap: tokens.space.sm as any,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.md,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
  },
  secondaryBtnText: {
    fontSize: tokens.font.body,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  primaryBtn: {
    backgroundColor: tokens.colors.green900,
  },
  primaryBtnText: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.textInverse,
  },
  disabledBtn: {
    opacity: 0.45,
  },
});
