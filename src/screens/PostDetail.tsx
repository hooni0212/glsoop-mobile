import { usePost } from "@/features/posts/usePost";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getTabBarPaddingBottom, getTabBarTotalHeight } from "@/navigation/tabs.styles";

function formatKoreanDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}년 ${m}월 ${day}일`;
}

export default function PostDetail() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params?.id ? String(params.id) : undefined;

  const { post, loading, error, refetch } = usePost(id);

  const title = post?.title || "";
  const authorName = post?.author?.name || "익명";
  const dateText = formatKoreanDate((post as any)?.createdAt);
  const content = (post as any)?.content || "";
  const likeCount = post?.stats?.likeCount ?? 0;
  const isLiked = Boolean((post as any)?.viewer?.isLiked);
  const isBookmarked = Boolean((post as any)?.viewer?.isBookmarked);

  const metaLine = useMemo(() => {
    const a = authorName ? authorName : "익명";
    const b = dateText ? dateText : "";
    return b ? `${a}  ·  ${b}` : a;
  }, [authorName, dateText]);

  const actionsBarStyle = useMemo(
    () => [
      styles.actionsBar,
      {
        // 탭바와 "같은 기준"(base + safe-area)으로 맞춰서
        // Home/Detail 등 화면마다 달라 보이는 하단바 체감을 없앤다
        height: getTabBarTotalHeight(insets.bottom),
        paddingBottom: getTabBarPaddingBottom(insets.bottom),
      },
    ],
    [insets.bottom]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#1F1F1F" />
        </Pressable>
        <View style={{ width: 40, height: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errTitle}>불러오기에 실패했어요</Text>
          <Text style={styles.errSub}>{error}</Text>
          <Pressable onPress={refetch} style={styles.retryBtn}>
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : !post ? (
        <View style={styles.center}>
          <Text style={styles.errTitle}>글을 찾을 수 없어요</Text>
          <Pressable onPress={() => router.back()} style={styles.retryBtn}>
            <Text style={styles.retryText}>뒤로가기</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.meta}>{metaLine}</Text>

            <View style={{ height: 18 }} />

            <Text style={styles.body}>{content}</Text>

            <View style={{ height: 110 }} />
          </ScrollView>

          <View style={actionsBarStyle}>
            <Pressable onPress={() => {}} style={styles.actionBtn} hitSlop={10}>
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={22}
                color={isLiked ? "#D64242" : "#7B7B7B"}
              />
              <Text style={styles.actionLabel}>{likeCount}</Text>
            </Pressable>

            <Pressable onPress={() => {}} style={styles.actionBtn} hitSlop={10}>
              <Ionicons
                name={isBookmarked ? "bookmark" : "bookmark-outline"}
                size={22}
                color="#7B7B7B"
              />
              <Text style={styles.actionLabel}>저장</Text>
            </Pressable>

            <Pressable onPress={() => {}} style={styles.actionBtn} hitSlop={10}>
              <Ionicons name="share-social-outline" size={22} color="#7B7B7B" />
              <Text style={styles.actionLabel}>공유</Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F6F6F4",
  },
  topBar: {
    paddingTop: 6,
    paddingHorizontal: 14,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: "#1F1F1F",
    lineHeight: 30,
  },
  meta: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(0,0,0,0.45)",
  },
  body: {
    fontSize: 15,
    lineHeight: 26,
    color: "rgba(0,0,0,0.80)",
    letterSpacing: -0.2,
  },
  actionsBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 74,
    paddingHorizontal: 24,
    paddingBottom: 10,
    backgroundColor: "rgba(246,246,244,0.97)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  actionBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6 as any,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.60)",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 10 as any,
  },
  errTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "rgba(0,0,0,0.80)",
  },
  errSub: {
    fontSize: 12,
    color: "rgba(0,0,0,0.55)",
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  retryText: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(0,0,0,0.75)",
  },
});
