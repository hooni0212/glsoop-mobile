import React from "react";
import { Pressable, Text } from "react-native";

import { homeStateStyles as styles } from "@/screens/Home.styles";

type Props = {
  message?: string | null;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: Props) {
  return (
    <Pressable
      onPress={onRetry}
      style={styles.errorBanner}
      accessibilityRole="button"
      accessibilityLabel="다시 시도"
    >
      <Text style={styles.errorTitle}>
        불러오기에 실패했어요. 탭해서 다시 시도
      </Text>
      {message ? <Text style={styles.errorSub}>{message}</Text> : null}
    </Pressable>
  );
}
