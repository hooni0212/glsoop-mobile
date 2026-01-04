import React from "react";
import { Text } from "react-native";

export type PostHeaderProps = {
  title: string;
  metaLine: string;
  styles: {
    title: any;
    meta: any;
  };
};

export function PostHeader({ title, metaLine, styles }: PostHeaderProps) {
  return (
    <>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.meta}>{metaLine}</Text>
    </>
  );
}
