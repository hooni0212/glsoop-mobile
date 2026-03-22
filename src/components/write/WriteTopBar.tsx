import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { tokens } from "@/theme/tokens";

type Props = {
  title: string;
  canSubmit: boolean;
  onPressClose: () => void;
  onPressSubmit: () => void;
  onPressDrafts?: () => void;
  previewOpen?: boolean;
  onPressPreview?: () => void;
  isKeyboardVisible?: boolean;
  onPressHideKeyboard?: () => void;
  styles: any;
};

export function WriteTopBar({
  title,
  canSubmit,
  onPressClose,
  onPressSubmit,
  onPressDrafts,
  previewOpen,
  onPressPreview,
  isKeyboardVisible,
  onPressHideKeyboard,
  styles,
}: Props) {
  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={onPressClose}
        hitSlop={12}
        style={styles.iconBtn}
        accessibilityRole="button"
        accessibilityLabel="글쓰기 닫기"
        testID="write-close-btn"
      >
        <Ionicons name="close" size={22} color={tokens.colors.text} />
      </Pressable>

      <Text style={styles.screenTitle}>{title}</Text>

      <View style={styles.topBarActions}>
        {!!onPressDrafts && (
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

        {!!onPressPreview && (
          <Pressable
            onPress={onPressPreview}
            hitSlop={12}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={previewOpen ? "편집 화면으로 전환" : "미리보기 열기"}
            testID="write-preview-btn"
          >
            <Ionicons
              name={previewOpen ? "create-outline" : "eye-outline"}
              size={20}
              color={tokens.colors.text}
            />
          </Pressable>
        )}

        {!!isKeyboardVisible && !!onPressHideKeyboard && (
          <Pressable
            onPress={onPressHideKeyboard}
            hitSlop={12}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="키보드 내리기"
            testID="write-hide-keyboard-btn"
          >
            <Ionicons
              name="chevron-down-circle-outline"
              size={20}
              color={tokens.colors.text}
            />
          </Pressable>
        )}

        <Pressable
          onPress={onPressSubmit}
          disabled={!canSubmit}
          hitSlop={12}
          style={[styles.doneBtn, !canSubmit && styles.doneBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="글쓰기 완료"
          testID="write-submit-btn"
        >
          <Text style={[styles.doneText, !canSubmit && styles.doneTextDisabled]}>
            완료
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
