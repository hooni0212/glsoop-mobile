import { buildApiUrl } from "@/lib/api";
import { buildRenderedPostImageUrl } from "@/lib/feedImage";
import { normalizePostBackgroundTemplateId } from "@/lib/postBackgroundTemplates";
import type { Post, PostRenderImages } from "@/types/post";

function pickFirstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function parseFlag(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "1" || normalized === "true") return true;
      if (normalized === "0" || normalized === "false" || normalized === "") return false;
    }
  }
  return false;
}

function parsePositiveInt(...values: unknown[]) {
  for (const value of values) {
    const next = Number.parseInt(String(value ?? ""), 10);
    if (Number.isFinite(next) && next > 0) return next;
  }
  return 0;
}

function toAbsoluteApiUrl(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return buildApiUrl(raw);
  return buildApiUrl(`/${raw}`);
}

function normalizeImageList(values: unknown) {
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

function ensurePrimaryImageFirst(images: string[], primaryImage: string) {
  if (!primaryImage) return images;
  if (images.length === 0) return [primaryImage];
  if (images[0] === primaryImage) return images;
  return [primaryImage, ...images.filter((item) => item !== primaryImage)];
}

function parseLayoutJson(raw: unknown) {
  if (!raw) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, any>;
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, any>)
      : null;
  } catch {
    return null;
  }
}

function extractTemplateFromLayout(raw: unknown) {
  const parsed = parseLayoutJson(raw);
  return normalizePostBackgroundTemplateId(parsed?.canvas?.presetId);
}

export function resolvePostRenderImages(post: Partial<Post> | null | undefined): PostRenderImages | null {
  if (!post) return null;

  const primaryImage = pickFirstString(post.primaryImage, post.imageUrl);
  const topLevelImages = normalizeImageList(post.images);
  const nestedImages = normalizeImageList(post.renderImages?.images);
  const images = ensurePrimaryImageFirst(
    topLevelImages.length > 0 ? topLevelImages : nestedImages,
    primaryImage
  );

  if (!primaryImage && images.length === 0) return null;

  const pageCount = Math.max(
    1,
    parsePositiveInt(post.renderImages?.pageCount, images.length, primaryImage ? 1 : 0)
  );

  return {
    primaryImage: primaryImage || images[0] || "",
    images: images.length > 0 ? images : primaryImage ? [primaryImage] : [],
    hasMultiple:
      parseFlag(post.renderImages?.hasMultiple, post.hasMultiple) || pageCount > 1 || images.length > 1,
    pageCount,
    pageCap: Math.max(1, parsePositiveInt(post.renderImages?.pageCap, 8)),
    isTruncated: parseFlag(post.renderImages?.isTruncated),
    template: pickFirstString(post.renderImages?.template) || undefined,
    scale: parsePositiveInt(post.renderImages?.scale) || undefined,
    version: pickFirstString(post.renderImages?.version) || undefined,
  };
}

export function resolvePostPrimaryImage(post: Partial<Post> | null | undefined) {
  return resolvePostRenderImages(post)?.primaryImage || "";
}

export function resolvePostImageUrls(post: Partial<Post> | null | undefined) {
  return resolvePostRenderImages(post)?.images || [];
}

export function normalizePostRenderImageFields(
  row: any,
  options: { fallbackPostId?: string } = {}
): Pick<Post, "imageUrl" | "primaryImage" | "images" | "hasMultiple" | "renderImages"> {
  const nested = row?.render_images && typeof row.render_images === "object" ? row.render_images : null;
  const fallbackPrimary =
    options.fallbackPostId && String(options.fallbackPostId).trim()
      ? buildRenderedPostImageUrl(String(options.fallbackPostId).trim(), {
          template: normalizePostBackgroundTemplateId(
            nested?.template ?? extractTemplateFromLayout(row?.layout_json ?? row?.layoutJson)
          ),
        })
      : "";

  const primaryImage = pickFirstString(
    toAbsoluteApiUrl(row?.primary_image),
    toAbsoluteApiUrl(row?.image_url),
    toAbsoluteApiUrl(nested?.primary_image),
    fallbackPrimary
  );

  const topLevelImages = normalizeImageList(row?.images);
  const nestedImages = normalizeImageList(nested?.images ?? nested?.pages);
  const images = ensurePrimaryImageFirst(
    topLevelImages.length > 0 ? topLevelImages : nestedImages,
    primaryImage
  );

  const pageCount = Math.max(
    1,
    parsePositiveInt(nested?.page_count, images.length, primaryImage ? 1 : 0)
  );

  return {
    imageUrl: primaryImage || null,
    primaryImage: primaryImage || null,
    images: images.length > 0 ? images : primaryImage ? [primaryImage] : [],
    hasMultiple:
      parseFlag(row?.has_multiple, nested?.has_multiple) || pageCount > 1 || images.length > 1,
    renderImages: {
      primaryImage: primaryImage || "",
      images: images.length > 0 ? images : primaryImage ? [primaryImage] : [],
      hasMultiple:
        parseFlag(row?.has_multiple, nested?.has_multiple) || pageCount > 1 || images.length > 1,
      pageCount,
      pageCap: Math.max(1, parsePositiveInt(nested?.page_cap, 8)),
      isTruncated: parseFlag(nested?.is_truncated, row?.is_truncated),
      template: pickFirstString(nested?.template) || undefined,
      scale: parsePositiveInt(nested?.scale) || undefined,
      version: pickFirstString(nested?.version) || undefined,
    },
  };
}
