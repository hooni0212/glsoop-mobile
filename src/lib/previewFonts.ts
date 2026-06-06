import type { PostFontKey } from "@/lib/postContent";

export const PREVIEW_FONT_FAMILY: Record<PostFontKey, string> = {
  serif: "Hahmlet-SemiBold",
  sans: "IBMPlexSansKR-Medium",
  hand: "Gaegu-Regular",
};

const PREVIEW_SIGNATURE_FONT_FAMILY = "Hahmlet-Medium";

export const PREVIEW_FONT_ASSETS = {
  [PREVIEW_FONT_FAMILY.serif]: require("../../assets/fonts/glsoop-preview/Hahmlet-SemiBold.ttf"),
  [PREVIEW_SIGNATURE_FONT_FAMILY]: require("../../assets/fonts/glsoop-preview/Hahmlet-Medium.ttf"),
  [PREVIEW_FONT_FAMILY.sans]: require("../../assets/fonts/glsoop-preview/IBMPlexSansKR-Medium.ttf"),
  [PREVIEW_FONT_FAMILY.hand]: require("../../assets/fonts/glsoop-preview/Gaegu-Regular.ttf"),
};

export function getPreviewFontFamily(fontKey: PostFontKey) {
  return PREVIEW_FONT_FAMILY[fontKey] ?? PREVIEW_FONT_FAMILY.serif;
}

export function getPreviewSignatureFontFamily() {
  return PREVIEW_SIGNATURE_FONT_FAMILY;
}
