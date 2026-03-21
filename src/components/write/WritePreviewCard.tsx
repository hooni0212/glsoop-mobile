import React from "react";
import { Text, View } from "react-native";

import type { WriteLayoutModel } from "@/lib/postLayout";

type Props = {
  styles: any;
  title: string;
  body: string;
  hashtags: string[];
  categoryLabel: string;
  layout: WriteLayoutModel;
};

export function WritePreviewCard({
  styles,
  title,
  body,
  hashtags,
  categoryLabel,
  layout,
}: Props) {
  const previewTitle = title.trim() || "제목 미리보기";
  const previewBody = body.trim() || "본문 미리보기가 여기에 보여요. 입력한 텍스트가 레이아웃에 따라 정렬돼요.";
  const footerText = hashtags.length > 0 ? hashtags.map((item) => `#${item}`).join(" ") : categoryLabel;

  return (
    <View style={styles.previewStage}>
      <View style={styles.previewStageHeader}>
        <Text style={styles.previewStageEyebrow}>BOOK PREVIEW</Text>
        <Text style={styles.previewStageHint}>모바일에서 보일 인쇄 분위기를 미리 확인해요.</Text>
      </View>
      <View style={styles.previewPaper}>
        <Text
          style={[
            styles.previewTitle,
            {
              textAlign: layout.titleStyle.align,
              fontSize: 24 * layout.titleStyle.fontScale,
              lineHeight: 28 * layout.titleStyle.lineHeight,
            },
          ]}
        >
          {previewTitle}
        </Text>
        <Text
          style={[
            styles.previewBody,
            {
              textAlign: layout.bodyStyle.align,
              fontSize: 15 * layout.bodyStyle.fontScale,
              lineHeight: 22 * layout.bodyStyle.lineHeight,
            },
          ]}
        >
          {previewBody}
        </Text>
        {layout.showFooter ? (
          <Text
            style={[
              styles.previewFooter,
              {
                textAlign: layout.footerStyle.align,
                fontSize: 12 * layout.footerStyle.fontScale,
                lineHeight: 16 * layout.footerStyle.lineHeight,
              },
            ]}
          >
            {footerText}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
