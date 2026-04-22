import type { ImageResizeMode, ImageSourcePropType } from "react-native";

export type PostBackgroundTemplateId = "paper01" | "paper02";

export type PostBackgroundTemplate = {
  id: PostBackgroundTemplateId;
  label: string;
  description: string;
  source: ImageSourcePropType;
  resizeMode: ImageResizeMode;
  backgroundColor: string;
  imageAspectRatio: number;
  imageWidthScale: number;
  imageOffsetYRatio: number;
};

export const DEFAULT_POST_BACKGROUND_TEMPLATE_ID: PostBackgroundTemplateId = "paper01";

export const POST_BACKGROUND_TEMPLATES: PostBackgroundTemplate[] = [
  {
    id: "paper01",
    label: "기본 종이",
    description: "차분한 책 페이지",
    source: require("../../assets/images/feed-templates/paper-source-01.jpg"),
    resizeMode: "cover",
    backgroundColor: "#fffdf8",
    imageAspectRatio: 500 / 666,
    imageWidthScale: 1,
    imageOffsetYRatio: 0,
  },
  {
    id: "paper02",
    label: "옅은 책장",
    description: "부드러운 여백감",
    source: require("../../assets/images/feed-templates/paper-source-02.jpg"),
    resizeMode: "contain",
    backgroundColor: "#f4efe4",
    imageAspectRatio: 580 / 723,
    imageWidthScale: 1.08,
    imageOffsetYRatio: -0.4,
  },
];

export function normalizePostBackgroundTemplateId(value: unknown): PostBackgroundTemplateId {
  return value === "paper02" ? "paper02" : DEFAULT_POST_BACKGROUND_TEMPLATE_ID;
}

export function getPostBackgroundTemplate(value: unknown): PostBackgroundTemplate {
  const templateId = normalizePostBackgroundTemplateId(value);
  return (
    POST_BACKGROUND_TEMPLATES.find((template) => template.id === templateId) ??
    POST_BACKGROUND_TEMPLATES[0]
  );
}
