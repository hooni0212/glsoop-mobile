import React, { createContext, useContext, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getTabBarPaddingBottom, getTabBarTotalHeight } from "@/navigation/tabs.styles";

export type BottomDockMetrics = {
  /** 탭바/하단 UI가 차지하는 총 높이(= base + safe-area bottom) */
  height: number;
  /** 하단 패딩(= 디자인 패딩 + safe-area bottom) */
  paddingBottom: number;
  /** 디바이스 safe-area bottom 값(참고용) */
  insetBottom: number;
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
    return {
      insetBottom,
      height: getTabBarTotalHeight(insetBottom),
      paddingBottom: getTabBarPaddingBottom(insetBottom),
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
