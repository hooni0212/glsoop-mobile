import React from "react";
import { Keyboard, Pressable, Text, TextInput, View } from "react-native";
import type { WriteEditorInsight } from "@/lib/writeEditorInsights";
import {
  WRITE_PAGE_MAX_COUNT,
  WRITE_PAGE_MAX_CHARS,
  analyzeWritePage,
  type WritePageDraft,
} from "@/lib/writePages";
import { useGuidedHelpTarget } from "@/onboarding/GuidedHelpProvider";
import type { PostType } from "@/types/post";

type Props = {
  title: string;
  pageDrafts: WritePageDraft[];
  selectedType: PostType | null;
  promptContext?: {
    sourceLabel?: string;
    dayLabel?: string;
    promptTitle?: string;
    promptBody?: string;
  } | null;
  insight: WriteEditorInsight;
  onChangeTitle: (value: string) => void;
  onChangePageBody: (pageId: string, value: string) => void;
  onAddPage: () => void;
  onRemovePage: (pageId: string) => void;
  onSelectType: (type: PostType) => void;
  styles: any;
};

const CATEGORY_ITEMS: { type: PostType; label: string }[] = [
  { type: "poem", label: "시" },
  { type: "essay", label: "에세이" },
  { type: "short", label: "짧은 구절" },
];

function estimateBodyInputHeight(value: string) {
  const lines = String(value || "")
    .split(/\r?\n/)
    .flatMap((line) => {
      const compactLength = Math.max(1, Array.from(line || " ").length);
      return Array.from({ length: Math.max(1, Math.ceil(compactLength / 22)) });
    }).length;
  const visibleLines = Math.max(3, lines);
  return Math.min(520, Math.max(96, 46 + visibleLines * 22));
}

export function WriteEditor({
  title,
  pageDrafts,
  selectedType,
  promptContext,
  insight,
  onChangeTitle,
  onChangePageBody,
  onAddPage,
  onRemovePage,
  onSelectType,
  styles,
}: Props) {
  const activeType = selectedType ?? insight.detectedType;
  const canAddPage = pageDrafts.length < WRITE_PAGE_MAX_COUNT;
  const addPageTarget = useGuidedHelpTarget("write", "page");
  const promptEyebrow = [promptContext?.sourceLabel ?? "오늘의 글감", promptContext?.dayLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.editorWrap}>
      <View style={styles.quickMetaRow}>
        {CATEGORY_ITEMS.map((item) => {
          const active = activeType === item.type;
          return (
            <Pressable
              key={item.type}
              onPress={() => onSelectType(item.type)}
              style={[styles.quickMetaChip, active && styles.quickMetaChipActive]}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} 카테고리 선택`}
              accessibilityState={{ selected: active }}
              testID={`write-category-${item.type}`}
            >
              <Text style={[styles.quickMetaChipText, active && styles.quickMetaChipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {promptContext ? (
        <View style={styles.questPromptCard} testID="write-quest-prompt-card">
          <Text style={styles.questPromptEyebrow}>{promptEyebrow}</Text>
          <Text style={styles.questPromptTitle}>
            {promptContext.promptTitle ?? "주제 글쓰기"}
          </Text>
          {promptContext.promptBody ? (
            <Text style={styles.questPromptBody}>{promptContext.promptBody}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.card, styles.writeTitleCard]}>
        <Text style={styles.label}>제목</Text>
        <TextInput
          value={title}
          onChangeText={onChangeTitle}
          onSubmitEditing={Keyboard.dismiss}
          blurOnSubmit
          placeholder="제목을 입력해줘"
          placeholderTextColor="rgba(74,62,48,0.35)"
          multiline
          style={styles.inputTitle}
          testID="write-title-input"
        />
      </View>

      <View style={styles.pageTimeline} testID="write-page-timeline">
        {pageDrafts.map((page, index) => {
          const pageNumber = index + 1;
          const pageInsight = analyzeWritePage(page.body, activeType);
          const inputHeight = estimateBodyInputHeight(page.body);
          const isLast = index === pageDrafts.length - 1;
          const canRemove = pageDrafts.length > 1;
          return (
            <View key={page.id} style={styles.pageTimelineItem}>
              <View style={styles.pageRail}>
                <View style={styles.pageAvatar}>
                  <Text style={styles.pageAvatarText}>{pageNumber}</Text>
                </View>
                {!isLast ? <View style={styles.pageConnector} /> : null}
              </View>
              <View
                style={[
                  styles.card,
                  styles.writePageCard,
                  pageInsight.isOverLimit && styles.writePageCardWarning,
                ]}
              >
                <View style={styles.writePageHeader}>
                  <View>
                    <Text style={styles.writePageEyebrow}>페이지 {pageNumber}</Text>
                    <Text style={styles.writePageMetric}>
                      {pageInsight.characterCount}자 · {pageInsight.lineCount}줄 · {pageInsight.densityLabel}
                    </Text>
                  </View>
                  {canRemove ? (
                    <Pressable
                      onPress={() => onRemovePage(page.id)}
                      hitSlop={8}
                      style={styles.writePageRemoveButton}
                      accessibilityRole="button"
                      accessibilityLabel={`${pageNumber}페이지 삭제`}
                      testID={`write-page-remove-${pageNumber}`}
                    >
                      <Text style={styles.writePageRemoveText}>삭제</Text>
                    </Pressable>
                  ) : null}
                </View>
                <TextInput
                  value={page.body}
                  onChangeText={(value) => onChangePageBody(page.id, value)}
                  placeholder={
                    pageNumber === 1
                      ? "오늘의 글을 남겨줘..."
                      : `${pageNumber}페이지 내용을 이어서 써줘...`
                  }
                  placeholderTextColor="rgba(74,62,48,0.32)"
                  multiline
                  blurOnSubmit={false}
                  style={[styles.inputBody, { height: inputHeight }]}
                  testID={pageNumber === 1 ? "write-body-input" : `write-page-body-input-${pageNumber}`}
                />
                {pageInsight.isOverLimit ? (
                  <Text style={styles.writePageWarning}>
                    한 페이지는 {WRITE_PAGE_MAX_CHARS}자까지 안정적으로 렌더링됩니다.
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}

        <Pressable
          {...addPageTarget}
          onPress={onAddPage}
          disabled={!canAddPage}
          style={[styles.addPageButton, !canAddPage && styles.addPageButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="페이지 추가"
          accessibilityState={{ disabled: !canAddPage }}
          testID="write-add-page"
        >
          <Text style={[styles.addPageButtonText, !canAddPage && styles.addPageButtonTextDisabled]}>
            + 페이지 추가
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
