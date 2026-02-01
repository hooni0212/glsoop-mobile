import React from "react";
import { Pressable, Text, View } from "react-native";

export type PostHeaderProps = {
  title: string;
  authorName: string;
  dateText?: string;
  onPressAuthor?: () => void;
  styles: {
    title: any;
    metaRow: any;
    metaAuthor: any;
    metaDot: any;
    metaDate: any;
  };
};

export function PostHeader({
  title,
  authorName,
  dateText,
  onPressAuthor,
  styles,
}: PostHeaderProps) {
  return (
    <>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.metaRow}>
        {onPressAuthor ? (
          <Pressable
            onPress={onPressAuthor}
            accessibilityRole="button"
            testID="post-author-btn"
          >
            <Text style={styles.metaAuthor}>{authorName}</Text>
          </Pressable>
        ) : (
          <Text style={styles.metaAuthor}>{authorName}</Text>
        )}
        {dateText ? (
          <>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaDate}>{dateText}</Text>
          </>
        ) : null}
      </View>
    </>
  );
}
