import React from "react";
import { Text, View } from "react-native";

import { homeStateStyles as styles } from "@/screens/Home.styles";

type Props = {
  title?: string;
  subtitle?: string;
};

export function EmptyState({
  title = "아직 글이 없어요",
  subtitle = "다른 카테고리를 눌러보거나 새로고침 해보세요.",
}: Props) {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{subtitle}</Text>
    </View>
  );
}
