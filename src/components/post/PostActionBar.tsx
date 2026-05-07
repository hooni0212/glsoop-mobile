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
  onPressSaveImage?: () => void;
  likeDisabled?: boolean;
  shareDisabled?: boolean;
  saveImageDisabled?: boolean;
  likeTestID?: string;
  bookmarkTestID?: string;
  saveImageTestID?: string;
  shareTestID?: string;
  height: number;
  paddingBottom: number;
  styles: {
    actionsBar: any;
    actionBtn: any;
    actionLabel: any;
    actionLabelActive?: any;
  };
};

export function PostActionBar({
  likeCount,
  isLiked,
  isBookmarked,
  onPressLike,
  onPressBookmark,
  onPressShare,
  onPressSaveImage,
  likeDisabled,
  shareDisabled,
  saveImageDisabled,
  likeTestID,
  bookmarkTestID,
  saveImageTestID,
  shareTestID,
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
          color={isLiked ? tokens.colors.green700 : tokens.colors.textMuted}
        />
        <Text style={[styles.actionLabel, isLiked && styles.actionLabelActive]}>{likeCount}</Text>
      </Pressable>

      <Pressable
        onPress={onPressBookmark}
        style={styles.actionBtn}
        hitSlop={10}
        testID={bookmarkTestID}
      >
        <Ionicons
          name={isBookmarked ? "bookmark" : "bookmark-outline"}
          size={22}
          color={isBookmarked ? tokens.colors.green700 : tokens.colors.textMuted}
        />
        <Text style={styles.actionLabel}>저장</Text>
      </Pressable>

      {onPressSaveImage ? (
        <Pressable
          onPress={onPressSaveImage}
          style={styles.actionBtn}
          hitSlop={10}
          disabled={saveImageDisabled}
          accessibilityLabel="사진 앱에 저장"
          testID={saveImageTestID}
        >
          <Ionicons name="download-outline" size={22} color={tokens.colors.textMuted} />
          <Text style={styles.actionLabel}>사진 저장</Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={onPressShare}
        style={styles.actionBtn}
        hitSlop={10}
        disabled={shareDisabled}
        testID={shareTestID}
      >
        <Ionicons name="share-social-outline" size={22} color={tokens.colors.textMuted} />
        <Text style={styles.actionLabel}>공유</Text>
      </Pressable>
    </View>
  );
}
