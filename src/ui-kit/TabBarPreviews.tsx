import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type TabKey = "home" | "bookmarks" | "growth" | "me";

export function Preview_RectBar_RaisedFab() {
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  return (
    <View style={styles.screen}>
      {/* 내용 영역(위) */}
      <View style={styles.content}>
        <Text style={styles.title}>Rect Bar + Raised FAB</Text>
        <Text style={styles.desc}>
          바는 직사각형 유지, FAB는 위로 살짝 떠있게.
        </Text>
        <Text style={styles.hint}>현재 선택: {labelOf(activeTab)}</Text>
      </View>

      {/* 탭바 영역(아래) */}
      <View style={styles.barWrap}>
        <View style={styles.bar}>
          <TabItem
            icon="home-outline"
            label="홈"
            active={activeTab === "home"}
            onPress={() => setActiveTab("home")}
          />
          <TabItem
            icon="bookmark-outline"
            label="저장"
            active={activeTab === "bookmarks"}
            onPress={() => setActiveTab("bookmarks")}
          />

          <View style={{ width: 74 }} />

          <TabItem
            icon="trending-up-outline"
            label="성장"
            active={activeTab === "growth"}
            onPress={() => setActiveTab("growth")}
          />
          <TabItem
            icon="person-outline"
            label="내 정보"
            active={activeTab === "me"}
            onPress={() => setActiveTab("me")}
          />
        </View>

        {/* FAB (오버레이) */}
        <View style={styles.fabShadow} pointerEvents="box-none">
          <Pressable
            onPress={() => {
              console.log("[FAB] pressed");
            }}
            style={styles.fab}
            hitSlop={12}
          >
            <Ionicons name="create-outline" size={26} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function TabItem({
  icon,
  label,
  active,
  onPress,
}: {
  icon: any;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const color = active ? COLORS.active : COLORS.inactive;

  return (
    <Pressable onPress={onPress} style={styles.tabSlot} hitSlop={10}>
      <View style={[styles.activeLine, active && styles.activeLineOn]} />
      <View style={styles.tabItem}>
        <Ionicons name={icon} size={22} color={color} />
        <Text style={[styles.tabLabel, { color }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function labelOf(k: TabKey) {
  if (k === "home") return "홈";
  if (k === "bookmarks") return "저장";
  if (k === "growth") return "성장";
  return "내 정보";
}

const COLORS = {
  active: "#2E5A3D",
  inactive: "#8E95A3",
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F6F4" },

  content: { flex: 1, paddingHorizontal: 18, paddingTop: 16 },
  title: { fontSize: 16, fontWeight: "800", color: "#2B2B2B", marginBottom: 6 },
  desc: { fontSize: 13, color: "#6C6C6C" },
  hint: { marginTop: 10, fontSize: 12, color: "#8B8B8B", fontWeight: "700" },

  barWrap: { position: "relative" },

  bar: {
    height: 74,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },

  tabSlot: { flex: 1, alignItems: "center", justifyContent: "center", height: "100%" },

  activeLine: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  activeLineOn: { backgroundColor: COLORS.active },

  tabItem: { alignItems: "center", justifyContent: "center", gap: 6, minWidth: 60 },
  tabLabel: { fontSize: 12, fontWeight: "700", letterSpacing: -0.2 },

  fabShadow: {
    position: "absolute",
    left: "50%",
    transform: [{ translateX: -34 }],
    top: -22,
    width: 68,
    height: 68,
    borderRadius: 34,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  fab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.active,
    alignItems: "center",
    justifyContent: "center",
  },
});
