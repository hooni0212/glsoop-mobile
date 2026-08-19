import type { PostFontKey } from "@/lib/postContent";
import { appFontFamily } from "@/theme/typography";

export const PREVIEW_FONT_FAMILY: Record<PostFontKey, string> = {
  serif: appFontFamily.editorialMedium,
  sans: appFontFamily.ui,
  hand: appFontFamily.handwriting,
};

const PREVIEW_SIGNATURE_FONT_FAMILY = appFontFamily.editorial;

export const PREVIEW_FONT_ASSETS = {
  [appFontFamily.ui]: require("../../assets/fonts/glsoop-preview/IBMPlexSansKR-Medium.ttf"),
  [appFontFamily.editorial]: require("../../assets/fonts/glsoop-preview/Hahmlet.ttf"),
  [appFontFamily.editorialMedium]: require("../../assets/fonts/glsoop-preview/Hahmlet-Medium.ttf"),
  [appFontFamily.editorialStrong]: require("../../assets/fonts/glsoop-preview/Hahmlet-SemiBold.ttf"),
  [PREVIEW_FONT_FAMILY.hand]: require("../../assets/fonts/glsoop-preview/Gaegu-Regular.ttf"),
};

export function getPreviewFontFamily(fontKey: PostFontKey) {
  return PREVIEW_FONT_FAMILY[fontKey] ?? PREVIEW_FONT_FAMILY.serif;
}

export function getPreviewSignatureFontFamily() {
  return PREVIEW_SIGNATURE_FONT_FAMILY;
}
