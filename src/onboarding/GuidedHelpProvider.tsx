import { Ionicons } from "@expo/vector-icons";
import { usePathname, useSegments } from "expo-router";
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
      <ButtonHelpSheet
        page={buttonPage}
        visible={Boolean(buttonPage)}
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
