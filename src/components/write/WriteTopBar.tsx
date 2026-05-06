import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { tokens } from "@/theme/tokens";

type Props = {
  title: string;
  canSubmit: boolean;
  onPressClose: () => void;
  onPressSubmit: () => void;
  onPressSaveDraft?: () => void;
  submitLabel?: string;
  submitAccessibilityLabel?: string;
  onPressDrafts?: () => void;
  previewOpen?: boolean;
  styles: any;
};

export function WriteTopBar({
  title,
  canSubmit,
  onPressClose,
  onPressSubmit,
  onPressSaveDraft,
  submitLabel = "완료",
  submitAccessibilityLabel = submitLabel,
  onPressDrafts,
  previewOpen,
  styles,
}: Props) {
  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={onPressClose}
        hitSlop={12}
        style={styles.iconBtn}
        accessibilityRole="button"
        accessibilityLabel={previewOpen ? "이전 화면으로 돌아가기" : "글쓰기 닫기"}
        testID="write-close-btn"
      >
        <Ionicons
          name={previewOpen ? "arrow-back" : "close"}
          size={22}
          color={tokens.colors.text}
        />
      </Pressable>

      <Text style={styles.screenTitle}>{title}</Text>

      <View style={styles.topBarActions}>
        {!previewOpen && !!onPressSaveDraft && (
          <Pressable
            onPress={onPressSaveDraft}
            hitSlop={12}
            style={styles.secondaryTopBtn}
            accessibilityRole="button"
            accessibilityLabel="임시저장"
            testID="write-save-draft-btn"
          >
            <Text style={styles.secondaryTopBtnText}>임시저장</Text>
          </Pressable>
        )}

        {!!onPressDrafts && !onPressSaveDraft && (
          <Pressable
            onPress={onPressDrafts}
            hitSlop={12}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="임시저장 목록 열기"
            testID="write-drafts-btn"
          >
            <Ionicons name="file-tray-outline" size={20} color={tokens.colors.text} />
          </Pressable>
        )}

        <Pressable
          onPress={onPressSubmit}
          disabled={!canSubmit}
          hitSlop={12}
          style={[styles.doneBtn, !canSubmit && styles.doneBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel={submitAccessibilityLabel}
          testID="write-submit-btn"
        >
          <Text style={[styles.doneText, !canSubmit && styles.doneTextDisabled]}>
            {submitLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
