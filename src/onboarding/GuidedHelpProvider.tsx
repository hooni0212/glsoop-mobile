import { Ionicons } from "@expo/vector-icons";
import { usePathname, useSegments } from "expo-router";
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getGuidedHelpPage,
  resolveGuidedHelpPageKey,
  type GuidedHelpButton,
  type GuidedHelpPage,
  type GuidedHelpPageKey,
  type GuidedHelpRequirement,
} from "@/onboarding/guidedHelpContent";
import {
  consumeGuidedHelpButtonsReplayRequest,
  consumeGuidedHelpPageReplayRequest,
  hasSeenGuidedHelpPage,
  markGuidedHelpPageSeen,
} from "@/onboarding/guidedHelpStorage";
import { tokens } from "@/theme/tokens";

function requirementLabel(requirement?: GuidedHelpRequirement) {
  if (requirement === "login") return "로그인 필요";
  if (requirement === "premium") return "프리미엄";
  if (requirement === "iosOnly") return "iOS 제공";
  if (requirement === "androidLimited") return "Android 제한";
  return null;
}

type HighlightShape = "pill" | "circle" | "rounded";
type HighlightPlacement = "top" | "middle" | "bottom";
type HighlightTargetArgs = {
  width: number;
  height: number;
  top: number;
  bottom: number;
};
type HighlightFrame = { left: number; top: number; width: number; height: number };
type GuidedHighlightTarget = {
  buttonKey: string;
  highlightShape: HighlightShape;
  placement: HighlightPlacement;
  target: (args: HighlightTargetArgs) => HighlightFrame;
};
type GuidedHighlightStep = GuidedHighlightTarget & GuidedHelpButton;

const CONTENT_MAX_WIDTH = 393;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function contentWidth(width: number) {
  return Math.min(width, CONTENT_MAX_WIDTH);
}

function contentLeft(width: number) {
  return Math.max(0, (width - contentWidth(width)) / 2);
}

function targetRect(left: number, top: number, width: number, height: number): HighlightFrame {
  return { left, top, width, height };
}

const GUIDED_BUTTON_HIGHLIGHTS: Partial<Record<GuidedHelpPageKey, GuidedHighlightTarget[]>> = {
  search: [
    {
      buttonKey: "query",
      highlightShape: "pill",
      placement: "top",
      target: ({ width, top }) => {
        const cWidth = contentWidth(width);
        const cLeft = contentLeft(width);
        return targetRect(cLeft + 76, top + 6, Math.max(180, cWidth - 100), 46);
      },
    },
    {
      buttonKey: "posts",
      highlightShape: "pill",
      placement: "top",
      target: ({ width, top }) => {
        const cWidth = contentWidth(width);
        const cLeft = contentLeft(width);
        return targetRect(cLeft + 24, top + 60, (cWidth - 58) / 2, 44);
      },
    },
    {
      buttonKey: "authors",
      highlightShape: "pill",
      placement: "top",
      target: ({ width, top }) => {
        const cWidth = contentWidth(width);
        const cLeft = contentLeft(width);
        return targetRect(cLeft + 34 + (cWidth - 58) / 2, top + 60, (cWidth - 58) / 2, 44);
      },
    },
    {
      buttonKey: "recent",
      highlightShape: "rounded",
      placement: "middle",
      target: ({ width, top }) => {
        const cWidth = contentWidth(width);
        const cLeft = contentLeft(width);
        return targetRect(cLeft + 18, top + 126, cWidth - 36, 104);
      },
    },
  ],
  bookmarks: [
    {
      buttonKey: "create",
      highlightShape: "pill",
      placement: "top",
      target: ({ width, top }) => {
        const cWidth = contentWidth(width);
        const cLeft = contentLeft(width);
        return targetRect(cLeft + cWidth - 144, top + 18, 120, 44);
      },
    },
    {
      buttonKey: "folder",
      highlightShape: "rounded",
      placement: "middle",
      target: ({ width, top }) => {
        const cWidth = contentWidth(width);
        const cLeft = contentLeft(width);
        return targetRect(cLeft + 18, top + 86, cWidth - 36, 108);
      },
    },
    {
      buttonKey: "rename",
      highlightShape: "pill",
      placement: "middle",
      target: ({ width, top }) => {
        const cWidth = contentWidth(width);
        const cLeft = contentLeft(width);
        return targetRect(cLeft + cWidth - 166, top + 160, 78, 38);
      },
    },
    {
      buttonKey: "delete",
      highlightShape: "pill",
      placement: "middle",
      target: ({ width, top }) => {
        const cWidth = contentWidth(width);
        const cLeft = contentLeft(width);
        return targetRect(cLeft + cWidth - 86, top + 160, 68, 38);
      },
    },
  ],
  growth: [
    {
      buttonKey: "write-prompt",
      highlightShape: "rounded",
      placement: "middle",
      target: ({ width, top }) => {
        const cWidth = contentWidth(width);
        const cLeft = contentLeft(width);
        return targetRect(cLeft + 18, top + 126, cWidth - 36, 122);
      },
    },
    {
      buttonKey: "records",
      highlightShape: "pill",
      placement: "middle",
      target: ({ width, top }) => {
        const cWidth = contentWidth(width);
        const cLeft = contentLeft(width);
        return targetRect(cLeft + 18, top + 258, cWidth - 36, 50);
      },
    },
    {
      buttonKey: "achievements",
      highlightShape: "rounded",
      placement: "middle",
      target: ({ width, top }) => {
        const cWidth = contentWidth(width);
        const cLeft = contentLeft(width);
        return targetRect(cLeft + 18, top + 318, (cWidth - 46) / 2, 76);
      },
    },
    {
      buttonKey: "quests",
      highlightShape: "rounded",
      placement: "middle",
      target: ({ width, top }) => {
        const cWidth = contentWidth(width);
        const cLeft = contentLeft(width);
        return targetRect(cLeft + 28 + (cWidth - 46) / 2, top + 318, (cWidth - 46) / 2, 76);
      },
    },
  ],
  me: [
    {
      buttonKey: "followers",
      highlightShape: "pill",
      placement: "middle",
      target: ({ width, top }) => {
        const cLeft = contentLeft(width);
        return targetRect(cLeft + 138, top + 176, 104, 32);
      },
    },
    {
      buttonKey: "followings",
      highlightShape: "pill",
      placement: "middle",
      target: ({ width, top }) => {
        const cLeft = contentLeft(width);
        return targetRect(cLeft + 238, top + 176, 110, 32);
      },
    },
    {
      buttonKey: "customize",
      highlightShape: "pill",
      placement: "middle",
      target: ({ width, top }) => {
        const cWidth = contentWidth(width);
        const cLeft = contentLeft(width);
        return targetRect(cLeft + 24, top + 242, (cWidth - 58) / 2, 42);
      },
    },
    {
      buttonKey: "settings",
      highlightShape: "pill",
      placement: "middle",
      target: ({ width, top }) => {
        const cWidth = contentWidth(width);
        const cLeft = contentLeft(width);
        return targetRect(cLeft + 34 + (cWidth - 58) / 2, top + 242, (cWidth - 58) / 2, 42);
      },
    },
    {
      buttonKey: "post",
      highlightShape: "rounded",
      placement: "bottom",
      target: ({ width, top }) => {
        const cWidth = contentWidth(width);
        const cLeft = contentLeft(width);
        return targetRect(cLeft + 24, top + 342, cWidth - 48, 72);
      },
    },
  ],
  write: [
    {
      buttonKey: "close",
      highlightShape: "circle",
      placement: "top",
      target: ({ top }) => targetRect(20, top + 10, 42, 42),
    },
    {
      buttonKey: "draft",
      highlightShape: "pill",
      placement: "top",
      target: ({ width, top }) => targetRect(Math.max(82, width - 194), top + 10, 96, 42),
    },
    {
      buttonKey: "publish",
      highlightShape: "pill",
      placement: "top",
      target: ({ width, top }) => targetRect(Math.max(178, width - 96), top + 10, 76, 42),
    },
    {
      buttonKey: "preview",
      highlightShape: "pill",
      placement: "top",
      target: ({ width, top }) => targetRect(Math.max(178, width - 100), top + 10, 80, 42),
    },
    {
      buttonKey: "page",
      highlightShape: "rounded",
      placement: "middle",
      target: ({ width, top }) => targetRect(24, top + 92, width - 48, 94),
    },
    {
      buttonKey: "background",
      highlightShape: "pill",
      placement: "bottom",
      target: ({ width, height, bottom }) => targetRect(24, height - bottom - 96, width - 48, 44),
    },
    {
      buttonKey: "layout",
      highlightShape: "pill",
      placement: "bottom",
      target: ({ width, height, bottom }) => targetRect(24, height - bottom - 96, width - 48, 44),
    },
  ],
};

function getGuidedHighlightSteps(page: GuidedHelpPage | null): GuidedHighlightStep[] {
  if (!page) return [];
  const targets = GUIDED_BUTTON_HIGHLIGHTS[page.key] ?? [];
  return targets.flatMap((target) => {
    const button = page.buttons.find((item) => item.key === target.buttonKey);
    return button ? [{ ...target, ...button }] : [];
  });
}

export function GuidedHelpProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const segments = useSegments();
  const [introPageKey, setIntroPageKey] = React.useState<GuidedHelpPageKey | null>(null);
  const [buttonPageKey, setButtonPageKey] = React.useState<GuidedHelpPageKey | null>(null);
  const currentPageKey = React.useMemo(
    () => resolveGuidedHelpPageKey(pathname, segments as string[]),
    [pathname, segments]
  );

  React.useEffect(() => {
    setIntroPageKey(null);
    setButtonPageKey(null);
    if (!currentPageKey) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const page = getGuidedHelpPage(currentPageKey);
        if (!page) return;

        const [pageReplayRequested, buttonsReplayRequested] = await Promise.all([
          consumeGuidedHelpPageReplayRequest(currentPageKey),
          consumeGuidedHelpButtonsReplayRequest(currentPageKey),
        ]);
        if (cancelled) return;

        if (buttonsReplayRequested) {
          setButtonPageKey(currentPageKey);
          return;
        }

        if (pageReplayRequested) {
          setIntroPageKey(currentPageKey);
          return;
        }

        if (page.autoShow === false) return;

        const seen = await hasSeenGuidedHelpPage(currentPageKey);
        if (!cancelled && !seen) {
          setIntroPageKey(currentPageKey);
        }
      })();
    }, 620);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [currentPageKey, pathname]);

  const introPage = getGuidedHelpPage(introPageKey);
  const buttonPage = getGuidedHelpPage(buttonPageKey);
  const buttonHighlightSteps = React.useMemo(
    () => getGuidedHighlightSteps(buttonPage),
    [buttonPage]
  );

  const closeIntro = React.useCallback(async () => {
    const pageKey = introPageKey;
    setIntroPageKey(null);
    if (pageKey) {
      await markGuidedHelpPageSeen(pageKey);
    }
  }, [introPageKey]);

  const openButtonHelpFromIntro = React.useCallback(async () => {
    const pageKey = introPageKey;
    setIntroPageKey(null);
    if (pageKey) {
      await markGuidedHelpPageSeen(pageKey);
      setButtonPageKey(pageKey);
    }
  }, [introPageKey]);

  return (
    <>
      {children}
      <PageIntroSheet
        page={introPage}
        visible={Boolean(introPage)}
        onClose={() => void closeIntro()}
        onOpenButtons={() => void openButtonHelpFromIntro()}
      />
      <ButtonHighlightTour
        page={buttonPage}
        steps={buttonHighlightSteps}
        visible={Boolean(buttonPage && buttonHighlightSteps.length > 0)}
        onClose={() => setButtonPageKey(null)}
      />
      <ButtonHelpSheet
        page={buttonPage}
        visible={Boolean(buttonPage && buttonHighlightSteps.length === 0)}
        onClose={() => setButtonPageKey(null)}
      />
    </>
  );
}

function PageIntroSheet({
  page,
  visible,
  onClose,
  onOpenButtons,
}: {
  page: GuidedHelpPage | null;
  visible: boolean;
  onClose: () => void;
  onOpenButtons: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!page) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.modalRoot}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="안내 닫기" />
        <View style={[styles.sheet, { paddingBottom: Math.max(tokens.space.lg, insets.bottom + 14) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.headerIcon}>
              <Ionicons name={page.iconName} size={22} color={tokens.colors.green900} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.kicker}>처음 보는 화면 안내</Text>
              <Text style={styles.title}>{page.title}</Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="안내 닫기"
            >
              <Ionicons name="close" size={20} color={tokens.colors.text} />
            </Pressable>
          </View>

          <Text style={styles.summary}>{page.summary}</Text>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>이 화면에서 볼 수 있는 것</Text>
            <View style={styles.chipWrap}>
              {page.visibleContent.slice(0, 8).map((item) => (
                <View key={item} style={styles.chip}>
                  <Text style={styles.chipText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>다음에 해볼 일</Text>
            {page.nextActions.slice(0, 3).map((item) => (
              <View key={item} style={styles.actionRow}>
                <Ionicons name="checkmark-circle-outline" size={17} color={tokens.colors.green700} />
                <Text style={styles.actionText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.footerActions}>
            <Pressable
              onPress={onOpenButtons}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${page.title} 버튼 설명 보기`}
            >
              <Ionicons name="help-circle-outline" size={18} color={tokens.colors.green900} />
              <Text style={styles.secondaryButtonText}>버튼 설명 보기</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="안내 확인"
            >
              <Text style={styles.primaryButtonText}>알겠어요</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ButtonHighlightTour({
  page,
  steps,
  visible,
  onClose,
}: {
  page: GuidedHelpPage | null;
  steps: GuidedHighlightStep[];
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [stepIndex, setStepIndex] = React.useState(0);

  React.useEffect(() => {
    if (visible) {
      setStepIndex(0);
    }
  }, [page?.key, visible]);

  const close = React.useCallback(() => {
    setStepIndex(0);
    onClose();
  }, [onClose]);

  if (!page || !visible || steps.length === 0) return null;

  const safeStepIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[safeStepIndex] ?? steps[0];
  const rawTarget = step.target({
    width,
    height,
    top: insets.top,
    bottom: insets.bottom,
  });
  const targetWidth = clamp(rawTarget.width, 40, Math.max(40, width - 24));
  const targetHeight = clamp(rawTarget.height, 32, Math.max(32, height - insets.top - insets.bottom - 24));
  const target = {
    left: clamp(rawTarget.left, 12, Math.max(12, width - targetWidth - 12)),
    top: clamp(rawTarget.top, insets.top + 8, Math.max(insets.top + 8, height - insets.bottom - targetHeight - 8)),
    width: targetWidth,
    height: targetHeight,
  };
  const cardWidth = Math.min(width - 36, 356);
  const cardLeft = clamp(
    target.left + target.width / 2 - cardWidth / 2,
    18,
    Math.max(18, width - cardWidth - 18)
  );
  const cardTop =
    step.placement === "bottom"
      ? clamp(target.top - 248, insets.top + 18, Math.max(insets.top + 18, height - insets.bottom - 232))
      : clamp(target.top + target.height + 22, insets.top + 18, Math.max(insets.top + 18, height - insets.bottom - 232));
  const arrowLeft = clamp(
    target.left + target.width / 2 - cardLeft - 11,
    26,
    cardWidth - 48
  );
  const arrowOnTop = step.placement !== "bottom";
  const isLast = safeStepIndex === steps.length - 1;
  const label = requirementLabel(step.requirement);

  const goPrev = () => {
    setStepIndex((current) => Math.max(0, current - 1));
  };

  const goNext = () => {
    if (isLast) {
      close();
      return;
    }
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <View style={styles.tourRoot} pointerEvents="auto" testID="guided-button-highlight-tour">
        <View style={styles.tourScrim} />
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.tourHighlight,
            step.highlightShape === "circle" && styles.tourHighlightCircle,
            step.highlightShape === "pill" && styles.tourHighlightPill,
            {
              left: target.left,
              top: target.top,
              width: target.width,
              height: target.height,
            },
          ]}
        />

        <View style={[styles.tourCard, { left: cardLeft, top: cardTop, width: cardWidth }]}>
          <View
            pointerEvents="none"
            style={[
              styles.tourArrow,
              arrowOnTop ? styles.tourArrowTop : styles.tourArrowBottom,
              { left: arrowLeft },
            ]}
          />

          <View style={styles.tourHeader}>
            <View style={styles.tourIcon}>
              <Ionicons name={step.iconName ?? page.iconName} size={19} color={tokens.colors.green900} />
            </View>
            <View style={styles.tourCopy}>
              <Text style={styles.tourKicker}>{page.title}</Text>
              <Text style={styles.tourTitle}>{step.label}</Text>
            </View>
            <Pressable
              onPress={close}
              style={({ pressed }) => [styles.tourCloseButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="버튼 하이라이트 안내 닫기"
            >
              <Ionicons name="close" size={18} color={tokens.colors.text} />
            </Pressable>
          </View>

          <Text style={styles.tourBody}>{step.role}</Text>
          {label ? (
            <View style={styles.tourRequirementPill}>
              <Text style={styles.tourRequirementText}>{label}</Text>
            </View>
          ) : null}

          <View style={styles.tourDots} accessibilityElementsHidden>
            {steps.map((item, index) => (
              <View
                key={`${item.buttonKey}-${index}`}
                style={[styles.tourDot, index === safeStepIndex && styles.tourDotActive]}
              />
            ))}
          </View>

          <View style={styles.tourFooter}>
            <Text style={styles.tourStepText}>
              {safeStepIndex + 1}/{steps.length}
            </Text>
            <View style={styles.tourNav}>
              {safeStepIndex > 0 ? (
                <Pressable
                  onPress={goPrev}
                  style={({ pressed }) => [styles.tourNavSecondary, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="이전 버튼 설명 보기"
                >
                  <Ionicons name="chevron-back" size={17} color={tokens.colors.text} />
                </Pressable>
              ) : null}
              <Pressable
                onPress={goNext}
                style={({ pressed }) => [styles.tourNavPrimary, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={isLast ? "버튼 하이라이트 안내 완료" : "다음 버튼 설명 보기"}
              >
                <Text style={styles.tourNavPrimaryText}>{isLast ? "완료" : "다음"}</Text>
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

function ButtonHelpSheet({
  page,
  visible,
  onClose,
}: {
  page: GuidedHelpPage | null;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!page) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.modalRoot}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="버튼 설명 닫기" />
        <View style={[styles.sheetTall, { paddingBottom: Math.max(tokens.space.lg, insets.bottom + 14) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={styles.headerIcon}>
              <Ionicons name="help-circle-outline" size={22} color={tokens.colors.green900} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.kicker}>버튼 설명</Text>
              <Text style={styles.title}>{page.title}</Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="버튼 설명 닫기"
            >
              <Ionicons name="close" size={20} color={tokens.colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.buttonList} contentContainerStyle={styles.buttonListContent}>
            {page.buttons.map((button) => (
              <ButtonHelpRow key={button.key} button={button} />
            ))}
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="버튼 설명 확인"
          >
            <Text style={styles.primaryButtonText}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ButtonHelpRow({ button }: { button: GuidedHelpButton }) {
  const label = requirementLabel(button.requirement);

  return (
    <View style={styles.buttonHelpRow}>
      <View style={styles.rowIcon}>
        <Ionicons name={button.iconName ?? "ellipse-outline"} size={19} color={tokens.colors.green700} />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle}>{button.label}</Text>
          {label ? (
            <View style={styles.requirementPill}>
              <Text style={styles.requirementText}>{label}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.rowBody}>{button.role}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tourRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 210,
    elevation: 210,
  },
  tourScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(9, 16, 13, 0.72)",
  },
  tourHighlight: {
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
  tourHighlightCircle: {
    borderRadius: 999,
  },
  tourHighlightPill: {
    borderRadius: 999,
  },
  tourCard: {
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
  tourArrow: {
    position: "absolute",
    width: 22,
    height: 22,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.82)",
    backgroundColor: tokens.colors.surfaceStrong,
    transform: [{ rotate: "45deg" }],
  },
  tourArrowTop: {
    top: -11,
  },
  tourArrowBottom: {
    bottom: -11,
  },
  tourHeader: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
  },
  tourIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
  },
  tourCopy: {
    flex: 1,
    minWidth: 0,
  },
  tourKicker: {
    color: tokens.colors.green700,
    fontSize: 12,
    fontWeight: "900",
  },
  tourTitle: {
    marginTop: 2,
    color: tokens.colors.text,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 26,
  },
  tourCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
  },
  tourBody: {
    color: tokens.colors.textMuted,
    fontSize: tokens.font.body,
    fontWeight: "700",
    lineHeight: 21,
  },
  tourRequirementPill: {
    alignSelf: "flex-start",
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green050,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  tourRequirementText: {
    fontSize: 11,
    fontWeight: "900",
    color: tokens.colors.green900,
  },
  tourDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 2,
  },
  tourDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: tokens.colors.borderStrong,
  },
  tourDotActive: {
    width: 20,
    backgroundColor: tokens.colors.green700,
  },
  tourFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.md as any,
    paddingTop: tokens.space.xs,
  },
  tourStepText: {
    color: tokens.colors.textFaint,
    fontSize: 12,
    fontWeight: "900",
  },
  tourNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
  },
  tourNavSecondary: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surface,
  },
  tourNavPrimary: {
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: tokens.colors.green900,
  },
  tourNavPrimaryText: {
    color: tokens.colors.textInverse,
    fontSize: tokens.font.small,
    fontWeight: "900",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(9, 16, 13, 0.56)",
  },
  sheet: {
    width: "100%",
    maxHeight: "86%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: tokens.colors.bg,
    paddingTop: 10,
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.md as any,
  },
  sheetTall: {
    width: "100%",
    maxHeight: "88%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: tokens.colors.bg,
    paddingTop: 10,
    paddingHorizontal: tokens.space.lg,
    gap: tokens.space.md as any,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: tokens.colors.border,
    alignSelf: "center",
    marginBottom: tokens.space.xs,
  },
  sheetHeader: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "900",
    color: tokens.colors.textFaint,
  },
  title: {
    marginTop: 2,
    fontSize: 21,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  summary: {
    fontSize: 15,
    fontWeight: "700",
    color: tokens.colors.textMuted,
    lineHeight: 23,
  },
  sectionBlock: {
    gap: tokens.space.sm as any,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: tokens.colors.text,
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
    fontWeight: "900",
    color: tokens.colors.green900,
  },
  actionRow: {
    minHeight: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  actionText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: "800",
    color: tokens.colors.textMuted,
    lineHeight: 19,
  },
  footerActions: {
    flexDirection: "row",
    gap: tokens.space.sm as any,
  },
  secondaryButton: {
    minHeight: 48,
    flex: 1,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: tokens.space.md,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: tokens.colors.green900,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green700,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.lg,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: tokens.colors.textInverse,
  },
  pressed: {
    opacity: 0.86,
  },
  buttonList: {
    maxHeight: 420,
  },
  buttonListContent: {
    gap: tokens.space.sm as any,
    paddingBottom: tokens.space.xs,
  },
  buttonHelpRow: {
    minHeight: 74,
    flexDirection: "row",
    gap: tokens.space.sm as any,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    padding: tokens.space.md,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  rowTitleLine: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  rowBody: {
    fontSize: 13,
    fontWeight: "700",
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
    fontWeight: "900",
    color: tokens.colors.green900,
  },
});
