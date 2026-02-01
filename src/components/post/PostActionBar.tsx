import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { tokens } from "@/theme/tokens";

export type PostActionBarProps = {
  likeCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  onPressLike: () => void;
  onPressBookmark: () => void;
  onPressShare: () => void;
  likeDisabled?: boolean;
  likeTestID?: string;
  height: number;
  paddingBottom: number;
  styles: {
    actionsBar: any;
    actionBtn: any;
    actionLabel: any;
  };
};

export function PostActionBar({
  likeCount,
  isLiked,
  isBookmarked,
  onPressLike,
  onPressBookmark,
  onPressShare,
  likeDisabled,
  likeTestID,
  height,
  paddingBottom,
  styles,
}: PostActionBarProps) {
  return (
    <View style={[styles.actionsBar, { height, paddingBottom }]}> 
      <Pressable
        onPress={onPressLike}
        style={styles.actionBtn}
        hitSlop={10}
        disabled={likeDisabled}
        testID={likeTestID}
      >
        <Ionicons
          name={isLiked ? "heart" : "heart-outline"}
          size={22}
          color={isLiked ? "#D64242" : tokens.colors.textMuted}
        />
        <Text style={styles.actionLabel}>{likeCount}</Text>
      </Pressable>

      <Pressable onPress={onPressBookmark} style={styles.actionBtn} hitSlop={10}>
        <Ionicons
          name={isBookmarked ? "bookmark" : "bookmark-outline"}
          size={22}
          color={tokens.colors.textMuted}
        />
        <Text style={styles.actionLabel}>저장</Text>
      </Pressable>

      <Pressable onPress={onPressShare} style={styles.actionBtn} hitSlop={10}>
        <Ionicons name="share-social-outline" size={22} color={tokens.colors.textMuted} />
        <Text style={styles.actionLabel}>공유</Text>
      </Pressable>
    </View>
  );
}
