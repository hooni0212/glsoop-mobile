import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

// 탭 순서(가운데는 FAB로 비워두기 때문에 실제 탭 라우트는 4개)
export const TAB_ORDER = ["index", "explore", "book", "me"] as const;

export type TabRouteName = (typeof TAB_ORDER)[number];
export type IoniconName = ComponentProps<typeof Ionicons>["name"];

export const TAB_META = {
  index: { label: "오늘", icon: "today-outline" as const },
  explore: { label: "발견", icon: "compass-outline" as const },
  book: { label: "문집", icon: "book-outline" as const },
  me: { label: "나", icon: "person-outline" as const },
} satisfies Record<TabRouteName, { label: string; icon: IoniconName }>;

export const COLORS = {
  active: "#49805a",
  inactive: "#6d7771",
  bg: "#fffefa",
  border: "#e0e0da",
} as const;
