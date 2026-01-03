import { StyleSheet } from "react-native";
import { COLORS } from "./tabs.meta";

export const tabsStyles = StyleSheet.create({
  barWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },

  // ✅ 직사각형 바
  bar: {
    height: 74, // 탭바 베이스 높이
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 10,
    paddingTop: 10,
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
    width: 74,
  },

  // ✅ FAB 오버레이: 위로 살짝 띄움
  fabWrap: {
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
