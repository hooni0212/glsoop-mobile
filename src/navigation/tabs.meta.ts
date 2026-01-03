import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

// 탭 순서(가운데는 FAB로 비워두기 때문에 실제 탭 라우트는 4개)
export const TAB_ORDER = ["index", "bookmarks", "growth", "me"] as const;

export type TabRouteName = (typeof TAB_ORDER)[number];
export type IoniconName = ComponentProps<typeof Ionicons>["name"];

export const TAB_META = {
  index: { label: "홈", icon: "home-outline" as const },
  bookmarks: { label: "저장", icon: "bookmark-outline" as const },
  growth: { label: "성장", icon: "trending-up-outline" as const },
  me: { label: "내 정보", icon: "person-outline" as const },
} satisfies Record<TabRouteName, { label: string; icon: IoniconName }>;

export const COLORS = {
  active: "#2E5A3D",
  inactive: "#8E95A3",
  bg: "#FFFFFF",
  border: "rgba(0,0,0,0.06)",
} as const;
