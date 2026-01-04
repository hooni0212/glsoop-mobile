import React from "react";
import { Text } from "react-native";

export type PostBodyProps = {
  content: string;
  styles: {
    body: any;
  };
};

export function PostBody({ content, styles }: PostBodyProps) {
  return <Text style={styles.body}>{content}</Text>;
}
