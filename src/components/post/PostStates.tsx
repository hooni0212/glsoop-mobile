import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export type PostStatesStyles = {
  center: any;
  errTitle: any;
  errSub: any;
  retryBtn: any;
  retryText: any;
};

export type PostStatesProps = {
  kind: "loading" | "error" | "notFound";
  errorText?: string;
  onRetry?: () => void;
  onBack?: () => void;
  styles: PostStatesStyles;
};

export function PostStates({ kind, errorText, onRetry, onBack, styles }: PostStatesProps) {
  if (kind === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (kind === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.errTitle}>불러오기에 실패했어요</Text>
        {!!errorText && <Text style={styles.errSub}>{errorText}</Text>}
        {!!onRetry && (
          <Pressable onPress={onRetry} style={styles.retryBtn}>
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // notFound
  return (
    <View style={styles.center}>
      <Text style={styles.errTitle}>글을 찾을 수 없어요</Text>
      {!!onBack && (
        <Pressable onPress={onBack} style={styles.retryBtn}>
          <Text style={styles.retryText}>뒤로가기</Text>
        </Pressable>
      )}
    </View>
  );
}
