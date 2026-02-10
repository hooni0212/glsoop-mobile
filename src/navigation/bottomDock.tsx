import React, { createContext, useContext, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getActionBarPaddingBottom,
  getActionBarTotalHeight,
  getTabBarPaddingBottom,
  getTabBarTotalHeight,
} from "@/navigation/tabs.styles";

export type BottomDockMetrics = {
  /** 디바이스 safe-area bottom 값(참고용) */
  insetBottom: number;

  /** 탭 도크 메트릭 */
  tab: {
    height: number;
    paddingBottom: number;
  };

  /** 상세/액션 도크 메트릭 */
  action: {
    height: number;
    paddingBottom: number;
  };

  /** @deprecated tab.height 사용 */
  height: number;
  /** @deprecated tab.paddingBottom 사용 */
  paddingBottom: number;
};

const BottomDockContext = createContext<BottomDockMetrics | null>(null);

/**
 * ✅ Navigation layer helper
 * - safe-area(insets.bottom) 계산은 여기서만 수행
 * - Screen/Component는 "얼마나 비워야 하는지"를 숫자로만 받는다.
 */
export function BottomDockProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  const value = useMemo<BottomDockMetrics>(() => {
    const insetBottom = Math.max(0, Number(insets.bottom) || 0);
    const tabHeight = getTabBarTotalHeight(insetBottom);
    const tabPaddingBottom = getTabBarPaddingBottom(insetBottom);
    const actionHeight = getActionBarTotalHeight(insetBottom);
    const actionPaddingBottom = getActionBarPaddingBottom(insetBottom);

    return {
      insetBottom,
      tab: {
        height: tabHeight,
        paddingBottom: tabPaddingBottom,
      },
      action: {
        height: actionHeight,
        paddingBottom: actionPaddingBottom,
      },
      // Backward compatibility
      height: tabHeight,
      paddingBottom: tabPaddingBottom,
    };
  }, [insets.bottom]);

  return <BottomDockContext.Provider value={value}>{children}</BottomDockContext.Provider>;
}

export function useBottomDock() {
  const ctx = useContext(BottomDockContext);
  if (!ctx) {
    throw new Error("useBottomDock must be used within BottomDockProvider");
  }
  return ctx;
}
