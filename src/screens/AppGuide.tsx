import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { requestAppOnboardingTourReplay } from "@/onboarding/appOnboardingTourStorage";
import { resetToAppRoot } from "@/navigation/rootNavigation";
import {
  GUIDED_HELP_BUTTON_DICTIONARY,
  GUIDED_HELP_PAGE_ORDER,
  GUIDED_HELP_PAGES,
  GUIDED_HELP_REPLAYABLE_PAGE_KEYS,
  type GuidedHelpPageKey,
} from "@/onboarding/guidedHelpContent";
import {
  requestGuidedHelpButtonsReplay,
  requestGuidedHelpPageReplay,
} from "@/onboarding/guidedHelpStorage";
import { tokens } from "@/theme/tokens";

type GuideIconName = React.ComponentProps<typeof Ionicons>["name"];

const GUIDE_SECTIONS = [
  {
    title: "읽고 발견하기",
    description: "홈과 검색에서 새 글을 찾고, 마음에 드는 작가를 팔로우해요.",
    items: [
      {
        icon: "home-outline" as GuideIconName,
        title: "홈 피드",
        body: "추천, 팔로잉, 최신 글을 오가며 짧은 글을 이어 읽을 수 있어요.",
      },
      {
        icon: "search-outline" as GuideIconName,
        title: "검색",
        body: "작가, 문장, 태그를 기준으로 읽고 싶은 글을 찾아요.",
      },
      {
        icon: "people-outline" as GuideIconName,
        title: "작가 팔로우",
        body: "작가 페이지에서 팔로우하면 팔로잉 피드로 다시 만날 수 있어요.",
      },
    ],
  },
  {
    title: "저장하고 나누기",
    description: "다시 읽을 글을 모으고, 링크나 이미지로 글을 공유해요.",
    items: [
      {
        icon: "bookmark-outline" as GuideIconName,
        title: "북마크 폴더",
        body: "글 상세에서 저장을 누르면 폴더별로 글을 정리할 수 있어요.",
      },
      {
        icon: "image-outline" as GuideIconName,
        title: "이미지 공유",
        body: "글 카드를 PNG 이미지로 보내거나 사진 앱에 저장할 수 있어요.",
      },
      {
        icon: "share-social-outline" as GuideIconName,
        title: "링크 공유",
        body: "본문 없이 글 링크만 공유해서 상대가 바로 읽을 수 있게 해요.",
      },
    ],
  },
  {
    title: "쓰기와 성장",
    description: "내 글을 남기고, 활동 기록과 성장 요소를 확인해요.",
    items: [
      {
        icon: "create-outline" as GuideIconName,
        title: "글쓰기",
        body: "제목, 본문, 배경, 배치를 조정해 읽기 좋은 글 카드를 만들어요.",
      },
      {
        icon: "sparkles-outline" as GuideIconName,
        title: "성장",
        body: "기록, 퀘스트, 업적을 통해 꾸준히 읽고 쓰는 흐름을 확인해요.",
      },
      {
        icon: "shield-checkmark-outline" as GuideIconName,
        title: "안전 기능",
        body: "신고, 차단, 커뮤니티 가이드라인은 각 화면의 더보기에서 열 수 있어요.",
      },
    ],
  },
] as const;

const QUICK_ACTIONS = [
  {
    label: "홈",
    icon: "home-outline" as GuideIconName,
    route: "/(tabs)" as const,
  },
  {
    label: "검색",
    icon: "search-outline" as GuideIconName,
    route: "/search" as const,
  },
  {
    label: "글쓰기",
    icon: "create-outline" as GuideIconName,
    route: "/write" as const,
  },
  {
    label: "계정 센터",
    icon: "settings-outline" as GuideIconName,
    route: "/account-center" as const,
  },
] as const;

export default function AppGuideScreen() {
  const startInteractiveGuide = React.useCallback(async () => {
    await requestAppOnboardingTourReplay();
    await resetToAppRoot();
  }, []);

  const replayPageGuide = React.useCallback(async (pageKey: GuidedHelpPageKey) => {
    const page = GUIDED_HELP_PAGES[pageKey];
    await requestGuidedHelpPageReplay(pageKey);
    router.push(page.route as never);
  }, []);

  const replayButtonGuide = React.useCallback(async (pageKey: GuidedHelpPageKey) => {
    const page = GUIDED_HELP_PAGES[pageKey];
    await requestGuidedHelpButtonsReplay(pageKey);
    router.push(page.route as never);
  }, []);

  const openPageDetail = React.useCallback((pageKey: GuidedHelpPageKey) => {
    router.push(`/guide-detail?page=${pageKey}` as never);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.topBarBtn}
          accessibilityRole="button"
          accessibilityLabel="앱 가이드 닫기"
        >
          <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>앱 가이드</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>GLSOOP GUIDE</Text>
          <Text style={styles.heroTitle}>글숲에서 자주 쓰는 기능</Text>
          <Text style={styles.heroDescription}>
            읽기, 저장, 공유, 글쓰기 흐름을 한 번에 확인할 수 있어요.
          </Text>
        </View>

        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.route}
              onPress={() => router.push(action.route as never)}
              style={styles.quickAction}
              accessibilityRole="button"
              accessibilityLabel={`${action.label}로 이동`}
            >
              <Ionicons name={action.icon} size={18} color={tokens.colors.green700} />
              <Text style={styles.quickActionText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => void startInteractiveGuide()}
          style={({ pressed }) => [
            styles.interactiveGuide,
            pressed && styles.interactiveGuidePressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="첫 화면 튜토리얼 다시 보기"
          testID="app-guide-start-tour-btn"
        >
          <View style={styles.interactiveGuideIcon}>
            <Ionicons name="navigate-outline" size={20} color={tokens.colors.green900} />
          </View>
          <View style={styles.interactiveGuideCopy}>
            <Text style={styles.interactiveGuideTitle}>첫 화면 튜토리얼 다시 보기</Text>
            <Text style={styles.interactiveGuideBody}>
              홈 화면 위에 설명을 띄워 검색, 피드, 글쓰기 버튼을 순서대로 안내해요.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={tokens.colors.textMuted} />
        </Pressable>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>페이지별 안내</Text>
            <Text style={styles.sectionDescription}>
              각 화면에서 무엇을 볼 수 있고, 어떤 버튼을 먼저 눌러보면 좋은지 확인해요.
            </Text>
          </View>
          <View style={styles.pageGuideList}>
            {GUIDED_HELP_PAGE_ORDER.map((pageKey) => {
              const page = GUIDED_HELP_PAGES[pageKey];
              const replayable = GUIDED_HELP_REPLAYABLE_PAGE_KEYS.has(pageKey);

              return (
                <View key={page.key} style={styles.pageGuideCard}>
                  <View style={styles.pageGuideHeader}>
                    <View style={styles.itemIconWrap}>
                      <Ionicons name={page.iconName} size={20} color={tokens.colors.green700} />
                    </View>
                    <View style={styles.itemCopy}>
                      <Text style={styles.itemTitle}>{page.title}</Text>
                      <Text style={styles.itemBody}>{page.summary}</Text>
                    </View>
                  </View>

                  <View style={styles.miniChipWrap}>
                    {page.visibleContent.slice(0, 4).map((item) => (
                      <View key={item} style={styles.miniChip}>
                        <Text style={styles.miniChipText}>{item}</Text>
                      </View>
                    ))}
                  </View>

                  <Pressable
                    onPress={() => openPageDetail(page.key)}
                    style={({ pressed }) => [styles.pageDetailButton, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`${page.title} 상세 가이드 보기`}
                  >
                    <Ionicons name="book-outline" size={16} color={tokens.colors.green900} />
                    <Text style={styles.pageDetailButtonText}>자세히 보기</Text>
                    <Ionicons name="chevron-forward" size={16} color={tokens.colors.green900} />
                  </Pressable>

                  <View style={styles.pageGuideButtons}>
                    <Pressable
                      disabled={!replayable}
                      onPress={() => void replayPageGuide(page.key)}
                      style={({ pressed }) => [
                        styles.pageGuideButton,
                        !replayable && styles.pageGuideButtonDisabled,
                        pressed && replayable && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${page.title} 안내 다시 보기`}
                    >
                      <Ionicons
                        name="navigate-outline"
                        size={16}
                        color={replayable ? tokens.colors.green900 : tokens.colors.textFaint}
                      />
                      <Text
                        style={[
                          styles.pageGuideButtonText,
                          !replayable && styles.pageGuideButtonTextDisabled,
                        ]}
                      >
                        안내 보기
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={!replayable}
                      onPress={() => void replayButtonGuide(page.key)}
                      style={({ pressed }) => [
                        styles.pageGuideButton,
                        !replayable && styles.pageGuideButtonDisabled,
                        pressed && replayable && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${page.title} 버튼 설명 보기`}
                    >
                      <Ionicons
                        name="help-circle-outline"
                        size={16}
                        color={replayable ? tokens.colors.green900 : tokens.colors.textFaint}
                      />
                      <Text
                        style={[
                          styles.pageGuideButtonText,
                          !replayable && styles.pageGuideButtonTextDisabled,
                        ]}
                      >
                        버튼 보기
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {GUIDE_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionDescription}>{section.description}</Text>
            </View>
            <View style={styles.itemList}>
              {section.items.map((item) => (
                <View key={item.title} style={styles.guideItem}>
                  <View style={styles.itemIconWrap}>
                    <Ionicons name={item.icon} size={20} color={tokens.colors.green700} />
                  </View>
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemBody}>{item.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>버튼 사전</Text>
            <Text style={styles.sectionDescription}>
              글숲에서 자주 보이는 아이콘과 버튼의 역할을 한 번에 확인해요.
            </Text>
          </View>
          <View style={styles.itemList}>
            {GUIDED_HELP_BUTTON_DICTIONARY.map((item) => (
              <View key={item.key} style={styles.guideItem}>
                <View style={styles.itemIconWrap}>
                  <Ionicons
                    name={item.iconName ?? "ellipse-outline"}
                    size={20}
                    color={tokens.colors.green700}
                  />
                </View>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemTitle}>{item.label}</Text>
                  <Text style={styles.itemBody}>{item.role}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  topBar: {
    paddingTop: tokens.space.xs,
    paddingHorizontal: tokens.space.md,
    paddingBottom: tokens.space.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarBtn: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  topBarSpacer: {
    width: 40,
    height: 40,
  },
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.xl,
    gap: tokens.space.xl as any,
  },
  hero: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.lg,
    gap: tokens.space.sm as any,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "900",
    color: tokens.colors.textFaint,
    letterSpacing: 1.1,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: tokens.colors.text,
    lineHeight: 31,
  },
  heroDescription: {
    fontSize: tokens.font.body,
    fontWeight: "700",
    color: tokens.colors.textMuted,
    lineHeight: 22,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm as any,
  },
  quickAction: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.green050,
  },
  quickActionText: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.green900,
  },
  interactiveGuide: {
    minHeight: 86,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.green050,
    padding: tokens.space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md as any,
  },
  interactiveGuidePressed: {
    opacity: 0.88,
  },
  pressed: {
    opacity: 0.86,
  },
  interactiveGuideIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
  },
  interactiveGuideCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  interactiveGuideTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  interactiveGuideBody: {
    fontSize: tokens.font.small,
    fontWeight: "700",
    color: tokens.colors.textMuted,
    lineHeight: 19,
  },
  section: {
    gap: tokens.space.md as any,
  },
  sectionHeader: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  sectionDescription: {
    fontSize: tokens.font.small,
    fontWeight: "700",
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
  itemList: {
    gap: tokens.space.sm as any,
  },
  pageGuideList: {
    gap: tokens.space.md as any,
  },
  pageGuideCard: {
    gap: tokens.space.md as any,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    padding: tokens.space.md,
  },
  pageGuideHeader: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md as any,
  },
  miniChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  miniChip: {
    minHeight: 30,
    justifyContent: "center",
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.green050,
    paddingHorizontal: 10,
  },
  miniChipText: {
    fontSize: 11,
    fontWeight: "900",
    color: tokens.colors.green900,
  },
  pageDetailButton: {
    minHeight: 44,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.green050,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: tokens.space.sm,
  },
  pageDetailButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: tokens.colors.green900,
  },
  pageGuideButtons: {
    flexDirection: "row",
    gap: tokens.space.sm as any,
  },
  pageGuideButton: {
    minHeight: 42,
    flex: 1,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.green050,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: tokens.space.sm,
  },
  pageGuideButtonDisabled: {
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
  },
  pageGuideButtonText: {
    fontSize: 12,
    fontWeight: "900",
    color: tokens.colors.green900,
  },
  pageGuideButtonTextDisabled: {
    color: tokens.colors.textFaint,
  },
  guideItem: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md as any,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    padding: tokens.space.md,
  },
  itemIconWrap: {
    width: 42,
    height: 42,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF4FF",
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  itemBody: {
    fontSize: tokens.font.small,
    fontWeight: "700",
    color: tokens.colors.textMuted,
    lineHeight: 19,
  },
});
