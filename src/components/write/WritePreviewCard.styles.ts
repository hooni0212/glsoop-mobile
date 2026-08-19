import { StyleSheet } from "react-native";

import { LOCAL_FEED_PREVIEW_CANVAS } from "@/lib/localFeedPreview";
import { tokens } from "@/theme/tokens";

export const writePreviewCardStyles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  wrapCompact: {
    marginBottom: 8,
  },
  summaryBar: {
    marginBottom: 10,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fffefa",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryCopy: {
    flex: 1,
    gap: 3,
  },
  summaryEyebrow: {
    fontSize: 11,
    fontWeight: "600",
    color: tokens.colors.textFaint,
    letterSpacing: 0,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: tokens.colors.text,
    letterSpacing: 0,
  },
  statusPill: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
  },
  statusPillChecking: {
    backgroundColor: "#f6f3e9",
    borderColor: tokens.colors.border,
  },
  statusPillReady: {
    backgroundColor: tokens.colors.green050,
    borderColor: tokens.colors.green100,
  },
  statusPillFallback: {
    backgroundColor: "#fff8e8",
    borderColor: "#ead9aa",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: tokens.colors.textMuted,
    letterSpacing: 0,
  },
  statusPillTextReady: {
    color: tokens.colors.green700,
  },
  statusPillTextFallback: {
    color: "#7a5a19",
  },
  frame: {
    borderRadius: 24,
    padding: 0,
    backgroundColor: "#f2eddc",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    overflow: "hidden",
  },
  frameCompact: {
    borderRadius: 20,
    paddingVertical: 8,
  },
  viewport: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
  },
  viewportCompact: {
    borderRadius: 20,
  },
  page: {
    width: "100%",
  },
  pageCompact: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    width: "100%",
    aspectRatio: LOCAL_FEED_PREVIEW_CANVAS.width / LOCAL_FEED_PREVIEW_CANVAS.height,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "#f2eddc",
  },
  emptyStateCompact: {
    width: 210,
    height: 280,
    alignSelf: "center",
    borderRadius: 18,
  },
  emptyStateText: {
    color: tokens.colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "500",
  },
  pageCounter: {
    marginTop: 12,
    alignItems: "center",
  },
  pageCounterText: {
    fontSize: 13,
    fontWeight: "500",
    color: tokens.colors.textMuted,
  },
  thumbnailStrip: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: "row",
    gap: 8,
  },
  thumbnailButton: {
    width: 42,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: "#f2eddc",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailButtonActive: {
    borderWidth: 2,
    borderColor: tokens.colors.green700,
  },
  messageBox: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fdfcf7",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    gap: 9,
  },
  messageText: {
    color: tokens.colors.textMuted,
    lineHeight: 20,
    fontWeight: "500",
  },
  retryButton: {
    minHeight: 34,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
  },
  retryButtonText: {
    color: tokens.colors.green700,
    fontSize: 12,
    fontWeight: "600",
  },
  noticeBox: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fdfcf7",
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  noticeText: {
    color: tokens.colors.textMuted,
    lineHeight: 20,
    fontWeight: "500",
  },
});
