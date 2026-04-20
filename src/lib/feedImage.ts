import { apiPost, buildApiUrl } from "@/lib/api";
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

type PreviewSessionResponse = {
  ok?: boolean;
  message?: string;
  image_url?: string;
  primary_image?: string;
  images?: string[];
  has_multiple?: boolean;
  render_images?: {
    primary_image?: string;
    images?: string[];
    has_multiple?: boolean;
    page_count?: number;
    page_cap?: number;
    is_truncated?: boolean;
    template?: string;
    scale?: number;
    version?: string;
    preview_session_id?: string;
    expires_at?: string;
  };
};

export type FeedPreviewRenderImages = {
  imageUrl: string;
  primaryImage: string;
  images: string[];
  hasMultiple: boolean;
  renderImages: {
    primaryImage: string;
    images: string[];
    hasMultiple: boolean;
    pageCount: number;
    pageCap: number;
    isTruncated: boolean;
    template?: string;
    scale?: number;
    version?: string;
    previewSessionId?: string;
    expiresAt?: string;
  };
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

function toAbsoluteApiUrl(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return buildApiUrl(raw);
  return buildApiUrl(`/${raw}`);
}

function normalizePreviewImageList(values: unknown) {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  const items: string[] = [];

  for (const value of values) {
    const next = toAbsoluteApiUrl(value);
    if (!next || seen.has(next)) continue;
    seen.add(next);
    items.push(next);
  }

  return items;
}

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function createFeedPreviewSession({
  title,
  content,
  category,
  createdAt,
  layout,
  template = "paper01",
  fontKey = "serif",
}: PreviewInput): Promise<FeedPreviewRenderImages> {
  const payload = buildLayoutPayload(layout);
  const response = await apiPost<PreviewSessionResponse>("/api/feed-images/preview/sessions", {
    title: title || "미리보기 제목",
    content: withPostFontMeta(content || "", fontKey),
    content_format: "plain",
    category: category || "short",
    template,
    scale: 1,
    created_at: createdAt || new Date().toISOString(),
    layout_json: payload,
  });

  if (!response?.ok) {
    throw new Error(response?.message || "미리보기를 불러오지 못했어요.");
  }

  const primaryImage = toAbsoluteApiUrl(
    response.primary_image || response.image_url || response.render_images?.primary_image
  );
  const topLevelImages = normalizePreviewImageList(response.images);
  const nestedImages = normalizePreviewImageList(response.render_images?.images);
  const images =
    topLevelImages.length > 0
      ? topLevelImages
      : nestedImages.length > 0
        ? nestedImages
        : primaryImage
          ? [primaryImage]
          : [];

  if (!primaryImage && images.length === 0) {
    throw new Error("미리보기 이미지가 비어 있어요.");
  }

  const pageCount = Math.max(
    1,
    parsePositiveInt(response.render_images?.page_count, images.length || (primaryImage ? 1 : 0))
  );

  return {
    imageUrl: primaryImage || images[0] || "",
    primaryImage: primaryImage || images[0] || "",
    images: images.length > 0 ? images : primaryImage ? [primaryImage] : [],
    hasMultiple:
      response.has_multiple === true ||
      response.render_images?.has_multiple === true ||
      pageCount > 1 ||
      images.length > 1,
    renderImages: {
      primaryImage: primaryImage || images[0] || "",
      images: images.length > 0 ? images : primaryImage ? [primaryImage] : [],
      hasMultiple:
        response.has_multiple === true ||
        response.render_images?.has_multiple === true ||
        pageCount > 1 ||
        images.length > 1,
      pageCount,
      pageCap: Math.max(1, parsePositiveInt(response.render_images?.page_cap, 8)),
      isTruncated: response.render_images?.is_truncated === true,
      template: response.render_images?.template,
      scale: response.render_images?.scale,
      version: response.render_images?.version,
      previewSessionId: response.render_images?.preview_session_id,
      expiresAt: response.render_images?.expires_at,
    },
  };
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

export type RenderedPostImageFormat = "webp" | "png";

type RenderedPostShareImageOptions = {
  format?: RenderedPostImageFormat;
  template?: "paper01" | "paper02";
  scale?: 1 | 2;
};

export function buildRenderedPostShareImageUrl(
  postId: string,
  options: RenderedPostShareImageOptions = {}
) {
  const query = new URLSearchParams();
  query.set("template", options.template || "paper01");
  query.set("scale", String(options.scale || 2));
  if (options.format) {
    query.set("format", options.format);
  }

  return buildApiUrl(`/api/feed-images/share/post/${encodeURIComponent(postId)}?${query.toString()}`);
}
