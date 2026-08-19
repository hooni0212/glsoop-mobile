import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { tokens } from "@/theme/tokens";

// 탭 순서(가운데는 FAB로 비워두기 때문에 실제 탭 라우트는 4개)
export const TAB_ORDER = ["index", "explore", "book", "me"] as const;

export type TabRouteName = (typeof TAB_ORDER)[number];
export type IoniconName = ComponentProps<typeof Ionicons>["name"];

export const TAB_META = {
  index: { label: "오늘", icon: "today-outline" as const, activeIcon: "today" as const },
  explore: { label: "읽기", icon: "library-outline" as const, activeIcon: "library" as const },
  book: { label: "문집", icon: "book-outline" as const, activeIcon: "book" as const },
  me: { label: "나", icon: "person-outline" as const, activeIcon: "person" as const },
} satisfies Record<TabRouteName, { label: string; icon: IoniconName; activeIcon: IoniconName }>;

export const COLORS = {
  active: tokens.colors.green700,
  inactive: tokens.colors.textFaint,
  bg: tokens.colors.surface,
  border: tokens.colors.border,
} as const;
