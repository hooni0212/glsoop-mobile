import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppEmpty } from "@/components/state/AppEmpty";
import {
  getGuidedHelpPage,
  GUIDED_HELP_REPLAYABLE_PAGE_KEYS,
  type GuidedHelpButton,
  type GuidedHelpPageKey,
  type GuidedHelpRequirement,
} from "@/onboarding/guidedHelpContent";
import {
  requestGuidedHelpButtonsReplay,
  requestGuidedHelpPageReplay,
} from "@/onboarding/guidedHelpStorage";
import { tokens } from "@/theme/tokens";

function normalizePageKey(value: unknown): GuidedHelpPageKey | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return null;
  return getGuidedHelpPage(raw as GuidedHelpPageKey) ? (raw as GuidedHelpPageKey) : null;
}

function requirementLabel(requirement?: GuidedHelpRequirement) {
  if (requirement === "login") return "로그인 필요";
  if (requirement === "premium") return "프리미엄";
  if (requirement === "iosOnly") return "iOS 제공";
  if (requirement === "androidLimited") return "Android 제한";
  return null;
}

export default function GuidedHelpDetailScreen() {
  const params = useLocalSearchParams<{ page?: string | string[] }>();
  const pageKey = normalizePageKey(params.page);
  const page = getGuidedHelpPage(pageKey);
  const replayable = pageKey ? GUIDED_HELP_REPLAYABLE_PAGE_KEYS.has(pageKey) : false;

  const replayPageGuide = React.useCallback(async () => {
    if (!pageKey || !page || !replayable) return;
    await requestGuidedHelpPageReplay(pageKey);
    router.push(page.route as never);
  }, [page, pageKey, replayable]);

  const replayButtonGuide = React.useCallback(async () => {
    if (!pageKey || !page || !replayable) return;
    await requestGuidedHelpButtonsReplay(pageKey);
    router.push(page.route as never);
  }, [page, pageKey, replayable]);

  if (!page) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title="화면 가이드" />
        <View style={styles.center}>
          <AppEmpty
            title="가이드를 찾지 못했어요"
            description="앱 가이드에서 다시 선택해 주세요."
            primaryAction={{ label: "앱 가이드로 돌아가기", onPress: () => router.replace("/guide" as never) }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TopBar title="화면 가이드" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name={page.iconName} size={25} color={tokens.colors.green900} />
          </View>
          <Text style={styles.kicker}>PAGE GUIDE</Text>
          <Text style={styles.heroTitle}>{page.title}</Text>
          <Text style={styles.heroBody}>{page.summary}</Text>
        </View>

        <View style={styles.actionBand}>
          <Pressable
            disabled={!replayable}
            onPress={() => void replayPageGuide()}
            style={({ pressed }) => [
              styles.actionButton,
              !replayable && styles.actionButtonDisabled,
              pressed && replayable && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${page.title} 화면 안내 다시 보기`}
          >
            <Ionicons
              name="navigate-outline"
              size={18}
              color={replayable ? tokens.colors.green900 : tokens.colors.textFaint}
            />
            <Text style={[styles.actionButtonText, !replayable && styles.actionButtonTextDisabled]}>
              이 화면에서 안내 보기
            </Text>
          </Pressable>
          <Pressable
            disabled={!replayable}
            onPress={() => void replayButtonGuide()}
            style={({ pressed }) => [
              styles.actionButton,
              !replayable && styles.actionButtonDisabled,
              pressed && replayable && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${page.title} 버튼 설명 다시 보기`}
          >
            <Ionicons
              name="help-circle-outline"
              size={18}
              color={replayable ? tokens.colors.green900 : tokens.colors.textFaint}
            />
            <Text style={[styles.actionButtonText, !replayable && styles.actionButtonTextDisabled]}>
              버튼 설명 보기
            </Text>
          </Pressable>
        </View>

        {!replayable ? (
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={19} color={tokens.colors.textMuted} />
            <Text style={styles.noticeText}>
              이 가이드는 특정 글이나 작가처럼 실제 콘텐츠에서 확인하는 화면이에요. 아래 설명을 먼저 읽고, 실제 화면에서 다시 확인해 주세요.
            </Text>
          </View>
        ) : null}

        <GuideSection title="처음 들어가면 먼저 볼 것" icon="eye-outline" items={page.firstVisit} />
        <GuideSection title="기본 사용자 흐름" icon="git-branch-outline" items={page.userFlow} numbered />

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="albums-outline" size={19} color={tokens.colors.green700} />
            <Text style={styles.sectionTitle}>이 화면에서 볼 수 있는 것</Text>
          </View>
          <View style={styles.chipWrap}>
            {page.visibleContent.map((item) => (
              <View key={item} style={styles.chip}>
                <Text style={styles.chipText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="radio-button-on-outline" size={19} color={tokens.colors.green700} />
            <Text style={styles.sectionTitle}>버튼 역할</Text>
          </View>
          <View style={styles.buttonList}>
            {page.buttons.map((button) => (
              <ButtonRow key={button.key} button={button} />
            ))}
          </View>
        </View>

        <GuideSection title="알아두면 좋은 점" icon="bulb-outline" items={page.tips} />
        <GuideSection title="다음에 해볼 일" icon="checkmark-circle-outline" items={page.nextActions} />
      </ScrollView>
    </SafeAreaView>
  );
}

function TopBar({ title }: { title: string }) {
  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={() => router.back()}
        style={styles.topBarBtn}
        accessibilityRole="button"
        accessibilityLabel="뒤로 가기"
      >
        <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
      </Pressable>
      <Text style={styles.topBarTitle}>{title}</Text>
      <View style={styles.topBarSpacer} />
    </View>
  );
}

function GuideSection({
  title,
  icon,
  items,
  numbered = false,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  items: string[];
  numbered?: boolean;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name={icon} size={19} color={tokens.colors.green700} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.listBlock}>
        {items.map((item, index) => (
          <View key={`${title}-${item}`} style={styles.listRow}>
            <View style={styles.listMarker}>
              <Text style={styles.listMarkerText}>{numbered ? index + 1 : "•"}</Text>
            </View>
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ButtonRow({ button }: { button: GuidedHelpButton }) {
  const requirement = requirementLabel(button.requirement);

  return (
    <View style={styles.buttonRow}>
      <View style={styles.buttonIcon}>
        <Ionicons name={button.iconName ?? "ellipse-outline"} size={19} color={tokens.colors.green700} />
      </View>
      <View style={styles.buttonCopy}>
        <View style={styles.buttonTitleRow}>
          <Text style={styles.buttonTitle}>{button.label}</Text>
          {requirement ? (
            <View style={styles.requirementPill}>
              <Text style={styles.requirementText}>{requirement}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.buttonBody}>{button.role}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.space.xl,
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
    fontWeight: "600",
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
    gap: tokens.space.lg as any,
  },
  hero: {
    gap: tokens.space.sm as any,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.lg,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "600",
    color: tokens.colors.textFaint,
  },
  heroTitle: {
    fontSize: 27,
    fontWeight: "600",
    color: tokens.colors.text,
  },
  heroBody: {
    fontSize: 15,
    fontWeight: "500",
    color: tokens.colors.textMuted,
    lineHeight: 23,
  },
  actionBand: {
    flexDirection: "row",
    gap: tokens.space.sm as any,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.green050,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: tokens.space.sm,
  },
  actionButtonDisabled: {
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: tokens.colors.green900,
  },
  actionButtonTextDisabled: {
    color: tokens.colors.textFaint,
  },
  pressed: {
    opacity: 0.86,
  },
  notice: {
    flexDirection: "row",
    gap: tokens.space.sm as any,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    padding: tokens.space.md,
  },
  noticeText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: "500",
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
  section: {
    gap: tokens.space.md as any,
  },
  sectionTitleRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: tokens.colors.text,
  },
  listBlock: {
    gap: tokens.space.sm as any,
  },
  listRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.space.sm as any,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    padding: tokens.space.md,
  },
  listMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
  },
  listMarkerText: {
    fontSize: 12,
    fontWeight: "600",
    color: tokens.colors.green900,
  },
  listText: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "500",
    color: tokens.colors.textMuted,
    lineHeight: 21,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 32,
    justifyContent: "center",
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.green050,
    paddingHorizontal: 11,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: tokens.colors.green900,
  },
  buttonList: {
    gap: tokens.space.sm as any,
  },
  buttonRow: {
    minHeight: 74,
    flexDirection: "row",
    gap: tokens.space.sm as any,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    padding: tokens.space.md,
  },
  buttonIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
  },
  buttonCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  buttonTitleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  buttonTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: tokens.colors.text,
  },
  buttonBody: {
    fontSize: 13,
    fontWeight: "500",
    color: tokens.colors.textMuted,
    lineHeight: 19,
  },
  requirementPill: {
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green050,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  requirementText: {
    fontSize: 10,
    fontWeight: "600",
    color: tokens.colors.green900,
  },
});
