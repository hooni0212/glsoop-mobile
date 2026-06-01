import { Ionicons } from "@expo/vector-icons";
import { usePathname, useSegments } from "expo-router";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  consumeAppOnboardingTourReplayRequest,
  hasCompletedAppOnboardingTour,
  markAppOnboardingTourCompleted,
} from "@/onboarding/appOnboardingTourStorage";
import { tokens } from "@/theme/tokens";

type HighlightShape = "pill" | "circle" | "rounded";
type TourStep = {
  key: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  body: string;
  targetLabel: string;
  highlightShape: HighlightShape;
  placement: "top" | "middle" | "bottom";
  target: (args: {
    width: number;
    height: number;
    top: number;
    bottom: number;
  }) => { left: number; top: number; width: number; height: number };
};

const TOUR_STEPS: TourStep[] = [
  {
    key: "header-actions",
    icon: "search-outline",
    title: "읽고 싶은 글을 빠르게 찾아요",
    body: "검색은 작가와 문장을 찾는 입구이고, 알림은 내 글과 활동 반응을 모아 보여줘요.",
    targetLabel: "검색과 알림",
    highlightShape: "pill",
    placement: "top",
    target: ({ width, top }) => ({
      left: Math.max(156, width - 192),
      top: top + 8,
      width: Math.min(172, width - 176),
      height: 46,
    }),
  },
  {
    key: "feed-filters",
    icon: "albums-outline",
    title: "피드는 세 가지 흐름으로 읽어요",
    body: "추천은 새 글을 발견하는 곳, 팔로잉은 좋아하는 작가의 글, 최신은 방금 올라온 글이에요.",
    targetLabel: "추천 · 팔로잉 · 최신",
    highlightShape: "pill",
    placement: "top",
    target: ({ width, top }) => ({
      left: Math.max(18, (width - Math.min(width - 36, 357)) / 2),
      top: top + 68,
      width: Math.min(width - 36, 357),
      height: 42,
    }),
  },
  {
    key: "post-card",
    icon: "heart-outline",
    title: "글 카드에서 바로 반응해요",
    body: "좋아요, 저장, 더보기 메뉴로 좋은 글을 남기고 안전 기능도 사용할 수 있어요.",
    targetLabel: "글 카드 액션",
    highlightShape: "rounded",
    placement: "middle",
    target: ({ width, height }) => ({
      left: Math.max(18, (width - Math.min(width - 40, 353)) / 2),
      top: Math.max(176, height * 0.36),
      width: Math.min(width - 40, 353),
      height: 122,
    }),
  },
  {
    key: "write-fab",
    icon: "create-outline",
    title: "가운데 버튼에서 바로 써요",
    body: "떠 있는 글쓰기 버튼은 제목, 본문, 배경을 조정해 글 카드를 만드는 시작점이에요.",
    targetLabel: "글쓰기",
    highlightShape: "circle",
    placement: "bottom",
    target: ({ width, height, bottom }) => ({
      left: width / 2 - 42,
      top: height - bottom - 102,
      width: 84,
      height: 84,
    }),
  },
  {
    key: "bottom-tabs",
    icon: "compass-outline",
    title: "하단 탭으로 주요 공간을 오가요",
    body: "홈, 저장, 성장, 내 정보를 반복해서 쓰는 구조예요. 저장·성장·내 정보는 로그인 후 열려요.",
    targetLabel: "하단 탭",
    highlightShape: "rounded",
    placement: "bottom",
    target: ({ width, height, bottom }) => ({
      left: 0,
      top: height - bottom - 72,
      width,
      height: 72 + bottom,
    }),
  },
];

function isHomeRoute(pathname: string, segments: string[]) {
  const first = segments[0] ?? "";
  const second = segments[1] ?? "";
  return pathname === "/" || (first === "(tabs)" && (!second || second === "index"));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function AppOnboardingTour() {
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [visible, setVisible] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(0);
  const onHome = isHomeRoute(pathname, segments as string[]);
  const step = TOUR_STEPS[stepIndex] ?? TOUR_STEPS[0];

  React.useEffect(() => {
    if (!onHome) {
      setVisible(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const [completed, replayRequested] = await Promise.all([
          hasCompletedAppOnboardingTour(),
          consumeAppOnboardingTourReplayRequest(),
        ]);
        if (cancelled) return;

        if (replayRequested || !completed) {
          setStepIndex(0);
          setVisible(true);
        }
      })();
    }, 360);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [onHome]);

  const finish = React.useCallback(async () => {
    setVisible(false);
    setStepIndex(0);
    await markAppOnboardingTourCompleted();
  }, []);

  const goNext = React.useCallback(() => {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      void finish();
      return;
    }
    setStepIndex((current) => Math.min(current + 1, TOUR_STEPS.length - 1));
  }, [finish, stepIndex]);

  const goPrev = React.useCallback(() => {
    setStepIndex((current) => Math.max(0, current - 1));
  }, []);

  if (!visible || !onHome) return null;

  const target = step.target({
    width,
    height,
    top: insets.top,
    bottom: insets.bottom,
  });
  const cardWidth = Math.min(width - 36, 356);
  const cardLeft = clamp(
    target.left + target.width / 2 - cardWidth / 2,
    18,
    Math.max(18, width - cardWidth - 18)
  );
  const cardTop =
    step.placement === "bottom"
      ? clamp(target.top - 196, insets.top + 18, Math.max(insets.top + 18, height - 244))
      : step.placement === "middle"
        ? clamp(target.top + target.height + 22, insets.top + 18, height - 250)
        : clamp(target.top + target.height + 22, insets.top + 18, height - 250);
  const arrowLeft = clamp(
    target.left + target.width / 2 - cardLeft - 11,
    26,
    cardWidth - 48
  );
  const arrowOnTop = step.placement !== "bottom";
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.root} pointerEvents="auto">
        <View style={styles.scrim} />
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.highlight,
            step.highlightShape === "circle" && styles.highlightCircle,
            step.highlightShape === "pill" && styles.highlightPill,
            {
              left: target.left,
              top: target.top,
              width: target.width,
              height: target.height,
            },
          ]}
        />

        <View style={[styles.card, { left: cardLeft, top: cardTop, width: cardWidth }]}>
          <View
            pointerEvents="none"
            style={[
              styles.arrow,
              arrowOnTop ? styles.arrowTop : styles.arrowBottom,
              { left: arrowLeft },
            ]}
          />
          <View style={styles.kickerRow}>
            <View style={styles.iconWrap}>
              <Ionicons name={step.icon} size={19} color={tokens.colors.green900} />
            </View>
            <Text style={styles.kicker}>{step.targetLabel}</Text>
            <Text style={styles.progress}>
              {stepIndex + 1}/{TOUR_STEPS.length}
            </Text>
          </View>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>

          <View style={styles.dots} accessibilityElementsHidden>
            {TOUR_STEPS.map((item, index) => (
              <View
                key={item.key}
                style={[styles.dot, index === stepIndex && styles.dotActive]}
              />
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={() => void finish()}
              style={({ pressed }) => [styles.skipBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="튜토리얼 건너뛰기"
            >
              <Text style={styles.skipText}>건너뛰기</Text>
            </Pressable>
            <View style={styles.actionGroup}>
              {stepIndex > 0 ? (
                <Pressable
                  onPress={goPrev}
                  style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="이전 설명 보기"
                >
                  <Ionicons name="chevron-back" size={17} color={tokens.colors.text} />
                </Pressable>
              ) : null}
              <Pressable
                onPress={goNext}
                style={({ pressed }) => [styles.nextBtn, pressed && styles.btnPressed]}
                accessibilityRole="button"
                accessibilityLabel={isLast ? "튜토리얼 완료" : "다음 설명 보기"}
              >
                <Text style={styles.nextText}>{isLast ? "시작하기" : "다음"}</Text>
                <Ionicons
                  name={isLast ? "checkmark" : "chevron-forward"}
                  size={17}
                  color={tokens.colors.textInverse}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    elevation: 200,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(9, 16, 13, 0.72)",
  },
  highlight: {
    position: "absolute",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.96)",
    backgroundColor: "rgba(255, 254, 250, 0.16)",
    shadowColor: "#ffffff",
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  highlightCircle: {
    borderRadius: 999,
  },
  highlightPill: {
    borderRadius: 999,
  },
  card: {
    position: "absolute",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.82)",
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.lg,
    gap: tokens.space.sm as any,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  arrow: {
    position: "absolute",
    width: 22,
    height: 22,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.82)",
    backgroundColor: tokens.colors.surfaceStrong,
    transform: [{ rotate: "45deg" }],
  },
  arrowTop: {
    top: -11,
  },
  arrowBottom: {
    bottom: -11,
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
  },
  kicker: {
    flex: 1,
    color: tokens.colors.green700,
    fontSize: 12,
    fontWeight: "900",
  },
  progress: {
    color: tokens.colors.textFaint,
    fontSize: 12,
    fontWeight: "900",
  },
  title: {
    color: tokens.colors.text,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 27,
  },
  body: {
    color: tokens.colors.textMuted,
    fontSize: tokens.font.body,
    fontWeight: "700",
    lineHeight: 21,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: tokens.colors.borderStrong,
  },
  dotActive: {
    width: 20,
    backgroundColor: tokens.colors.green700,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.md as any,
    paddingTop: tokens.space.xs,
  },
  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
  },
  skipBtn: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  skipText: {
    color: tokens.colors.textMuted,
    fontSize: tokens.font.small,
    fontWeight: "900",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surface,
  },
  nextBtn: {
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: tokens.colors.green900,
  },
  nextText: {
    color: tokens.colors.textInverse,
    fontSize: tokens.font.small,
    fontWeight: "900",
  },
  btnPressed: {
    opacity: 0.82,
  },
});
