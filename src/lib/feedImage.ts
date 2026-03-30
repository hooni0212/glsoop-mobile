import { buildApiUrl } from "@/lib/api";
import { withPostFontMeta, type PostFontKey } from "@/lib/postContent";
import { buildLayoutPayload, type WriteLayoutModel } from "@/lib/postLayout";

type PreviewInput = {
  title: string;
  content: string;
  category: string;
  createdAt?: string;
  layout: WriteLayoutModel;
  template?: "paper01" | "paper02";
  fontKey?: PostFontKey;
};

function simpleHash(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function buildFeedImageVersion(seedParts: unknown[]) {
  return simpleHash(seedParts.map((item) => (item == null ? "" : String(item))).join("|"));
}

export function buildFeedPreviewUrl({
  title,
  content,
  category,
  createdAt,
  layout,
  template = "paper01",
  fontKey = "serif",
}: PreviewInput) {
  const payload = buildLayoutPayload(layout);
  const query = new URLSearchParams();
  query.set("title", title || "미리보기 제목");
  query.set("content", withPostFontMeta(content || "", fontKey));
  query.set("category", category || "short");
  query.set("template", template);
  query.set("scale", "2");
  query.set("created_at", createdAt || new Date().toISOString());

  query.set("layout_x", String(payload.text_box.x));
  query.set("layout_y", String(payload.text_box.y));
  query.set("layout_w", String(payload.text_box.w));
  query.set("layout_h", String(payload.text_box.h));
  query.set("layout_align", String(payload.text_box.align));
  query.set("layout_font_scale", String(payload.text_box.font_scale));
  query.set("layout_line_height", String(payload.text_box.line_height));
  if (typeof payload.text_box.letter_spacing === "number") {
    query.set("layout_letter_spacing", String(payload.text_box.letter_spacing));
  }

  query.set("layout_title_x", String(payload.title_box.x));
  query.set("layout_title_y", String(payload.title_box.y));
  query.set("layout_title_w", String(payload.title_box.w));
  query.set("layout_title_h", String(payload.title_box.h));
  query.set("layout_title_align", String(payload.title_box.align));
  query.set("layout_title_font_scale", String(payload.title_box.font_scale));
  query.set("layout_title_line_height", String(payload.title_box.line_height));
  if (typeof payload.title_box.letter_spacing === "number") {
    query.set("layout_title_letter_spacing", String(payload.title_box.letter_spacing));
  }

  query.set("layout_footer_x", String(payload.footer_box.x));
  query.set("layout_footer_y", String(payload.footer_box.y));
  query.set("layout_footer_w", String(payload.footer_box.w));
  query.set("layout_footer_h", String(payload.footer_box.h));
  query.set("layout_footer_align", String(payload.footer_box.align));
  query.set("layout_footer_font_scale", String(payload.footer_box.font_scale));
  query.set("layout_footer_line_height", String(payload.footer_box.line_height));

  return buildApiUrl(`/api/feed-images/preview?${query.toString()}`);
}

export function buildRenderedPostImageUrl(postId: string, versionSeed?: unknown) {
  const query = new URLSearchParams();
  query.set("template", "paper01");
  query.set("scale", "2");
  if (versionSeed != null) {
    query.set("v", buildFeedImageVersion([postId, versionSeed]));
  }
  return buildApiUrl(`/api/feed-images/post/${encodeURIComponent(postId)}?${query.toString()}`);
}
