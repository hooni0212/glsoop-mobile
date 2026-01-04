import React from "react";
import { Text } from "react-native";

type Props = { styles: any };

export function WriteMetaSection({ styles }: Props) {
  return (
    <Text style={styles.hint}>
      임시 화면이야. 나중에 카테고리/태그/공개설정/저장 로직 붙이면 됨.
    </Text>
  );
}
