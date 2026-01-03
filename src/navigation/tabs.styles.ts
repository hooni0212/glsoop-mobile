import { StyleSheet } from "react-native";
import { COLORS } from "./tabs.meta";

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
export const TAB_BAR_BASE_HEIGHT = 74;

/** 탭바 내부 상단/하단 패딩(디자인값). safe-area는 paddingBottom에 더해진다. */
export const TAB_BAR_PADDING_TOP = 10;
export const TAB_BAR_PADDING_BOTTOM = 10;

/** 가운데 FAB 자리를 위한 탭 간격 */
export const TAB_BAR_CENTER_GAP = 74;

/** FAB 크기(지름) */
export const TAB_BAR_FAB_SIZE = 68;

/** FAB가 바 위로 떠 있는 정도(기존 디자인 유지) */
export const TAB_BAR_FAB_LIFT = 22;

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
      alignItems: "center",
      paddingBottom: TAB_BAR_PADDING_BOTTOM + ib,
      paddingTop: TAB_BAR_PADDING_TOP,
    },

    tabSlot: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
    },

    label: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: -0.2,
      marginTop: 6,
    },

    activeLine: {
      position: "absolute",
      top: 0,
      left: 18,
      right: 18,
      height: 2,
      borderRadius: 2,
      backgroundColor: "transparent",
    },
    activeLineOn: {
      backgroundColor: COLORS.active,
    },

    // ✅ 가운데 FAB 자리 확보(탭 간격)
    centerGap: {
      width: TAB_BAR_CENTER_GAP,
    },

    // ✅ FAB 오버레이: 위로 살짝 띄움(기존 디자인 유지)
    fabWrap: {
      position: "absolute",
      left: "50%",
      transform: [{ translateX: -(TAB_BAR_FAB_SIZE / 2) }],
      top: -TAB_BAR_FAB_LIFT,
      width: TAB_BAR_FAB_SIZE,
      height: TAB_BAR_FAB_SIZE,
      borderRadius: TAB_BAR_FAB_SIZE / 2,

      shadowColor: "#000",
      shadowOpacity: 0.14,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,

      alignItems: "center",
      justifyContent: "center",
    },

    fab: {
      width: TAB_BAR_FAB_SIZE,
      height: TAB_BAR_FAB_SIZE,
      borderRadius: TAB_BAR_FAB_SIZE / 2,
      backgroundColor: COLORS.active,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
