import React from "react";

import { PaperReadingCard } from "@/components/paper/PaperReadingCard";
import type { WriteLayoutModel } from "@/lib/postLayout";
import type { PostType } from "@/types/post";

export type PostBodyProps = {
  title?: string;
  content: string;
  paragraphs?: string[];
  footerText?: string;
  type?: PostType | null;
  layout: WriteLayoutModel;
};

export function PostBody({
  title,
  content,
  paragraphs,
  footerText,
  type,
  layout,
}: PostBodyProps) {
  return (
    <PaperReadingCard
      mode="read"
      title={title}
      body={content}
      paragraphs={paragraphs}
      footerText={footerText}
      type={type}
      layout={layout}
      eyebrow="READING CARD"
      hint="책장 위에 인쇄된 페이지처럼 차분하게 읽어보세요."
    />
  );
}
