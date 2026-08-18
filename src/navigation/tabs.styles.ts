import { StyleSheet } from "react-native";
import { COLORS } from "./tabs.meta";
import { keyboardFocusRingStyle } from "@/theme/accessibility";
import { typography } from "@/theme/typography";

/**
 * Bottom Tabs UI tokens
 *
 * ✅ Why this file exists
 * - Screen별로 제각각 paddingBottom으로 땜질하지 않도록
 * - safe-area(insets.bottom)를 "하단 UI" 관점에서 일원화하기 위해
 */

// =========================
// Size tokens
// =========================

/** 탭바의 시각적(디자인) 베이스 높이. safe-area는 별도 합산한다. */
export const TAB_BAR_BASE_HEIGHT = 68;

/** 탭바 내부 상단/하단 패딩(디자인값). safe-area는 paddingBottom에 더해진다. */
export const TAB_BAR_PADDING_TOP = 0;
export const TAB_BAR_PADDING_BOTTOM = 0;

/** 글 상세/행동 영역 하단 액션바의 베이스 높이 */
export const ACTION_BAR_BASE_HEIGHT = 62;

/** 액션바 하단 패딩(디자인값). safe-area는 paddingBottom에 더해진다. */
export const ACTION_BAR_PADDING_BOTTOM = 10;

// =========================
// Helpers
// =========================

export function normalizeInsetBottom(insetBottom?: number) {
  return Math.max(0, Number(insetBottom) || 0);
}

/** 최종 탭바 높이(= 베이스 + safe-area bottom) */
export function getTabBarTotalHeight(insetBottom?: number) {
  return TAB_BAR_BASE_HEIGHT + normalizeInsetBottom(insetBottom);
}

/** 탭바의 하단 패딩(= 디자인 패딩 + safe-area bottom) */
export function getTabBarPaddingBottom(insetBottom?: number) {
  return TAB_BAR_PADDING_BOTTOM + normalizeInsetBottom(insetBottom);
}

/** 최종 액션바 높이(= 베이스 + safe-area bottom) */
export function getActionBarTotalHeight(insetBottom?: number) {
  return ACTION_BAR_BASE_HEIGHT + normalizeInsetBottom(insetBottom);
}

/** 액션바의 하단 패딩(= 디자인 패딩 + safe-area bottom) */
export function getActionBarPaddingBottom(insetBottom?: number) {
  return ACTION_BAR_PADDING_BOTTOM + normalizeInsetBottom(insetBottom);
}

/**
 * ✅ tabs.styles.ts에서 safe-area를 일원화하기 위한 팩토리
 * - StyleSheet는 hook을 쓸 수 없으므로, insets.bottom을 외부에서 주입받는다.
 */
export function createTabsStyles(insetBottom?: number) {
  const ib = normalizeInsetBottom(insetBottom);
  const barHeight = TAB_BAR_BASE_HEIGHT + ib;

  return StyleSheet.create({
    barWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
    },

    // ✅ 직사각형 바 (safe-area 포함한 최종 높이)
    bar: {
      height: barHeight,
      backgroundColor: COLORS.bg,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      flexDirection: "row",
      alignItems: "flex-start",
      paddingBottom: TAB_BAR_PADDING_BOTTOM + ib,
      paddingTop: TAB_BAR_PADDING_TOP,
    },

    tabSlot: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      height: TAB_BAR_BASE_HEIGHT,
    },

    label: {
      ...typography.meta,
      marginTop: 4,
    },

    activeLine: {
      position: "absolute",
      bottom: 6,
      width: 16,
      height: 2,
      borderRadius: 2,
      backgroundColor: "transparent",
    },
    activeLineOn: {
      backgroundColor: COLORS.active,
    },

    writeSlot: {
      flex: 1.05,
      height: TAB_BAR_BASE_HEIGHT,
      backgroundColor: COLORS.active,
      alignItems: "center",
      justifyContent: "center",
    },
    writeLabel: {
      marginTop: 3,
      color: "#ffffff",
      ...typography.meta,
    },
    pressed: { opacity: 0.72 },
    focused: keyboardFocusRingStyle,
  });
}
