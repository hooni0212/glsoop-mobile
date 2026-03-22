import React from "react";

import { PaperReadingCard } from "@/components/paper/PaperReadingCard";
import type { WriteLayoutModel } from "@/lib/postLayout";
import type { PostType } from "@/types/post";

type Props = {
  title: string;
  body: string;
  hashtags: string[];
  categoryLabel: string;
  selectedType?: PostType | null;
  layout: WriteLayoutModel;
};

export function WritePreviewCard({
  title,
  body,
  hashtags,
  categoryLabel,
  selectedType,
  layout,
}: Props) {
  const previewTitle = title.trim() || "제목 미리보기";
  const previewBody =
    body.trim() || "본문 미리보기가 여기에 보여요. 입력한 텍스트가 레이아웃에 따라 정렬돼요.";
  const footerText = hashtags.length > 0 ? hashtags.map((item) => `#${item}`).join(" ") : categoryLabel;

  return (
    <PaperReadingCard
      mode="read"
      type={selectedType ?? "short"}
      layout={layout}
      title={previewTitle}
      body={previewBody}
      footerText={footerText}
      eyebrow="BOOK PREVIEW"
      hint="모바일에서 보일 인쇄 분위기를 미리 확인해요."
    />
  );
}
