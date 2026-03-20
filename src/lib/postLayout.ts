export type LayoutAlign = "left" | "center" | "right";

export type LayoutStyle = {
  align: LayoutAlign;
  fontScale: number;
  lineHeight: number;
};

export type WriteLayoutModel = {
  titleStyle: LayoutStyle;
  bodyStyle: LayoutStyle;
  footerStyle: LayoutStyle;
  showFooter: boolean;
};

export const DEFAULT_WRITE_LAYOUT: WriteLayoutModel = {
  titleStyle: { align: "center", fontScale: 1, lineHeight: 1.15 },
  bodyStyle: { align: "center", fontScale: 1, lineHeight: 1.15 },
  footerStyle: { align: "right", fontScale: 1, lineHeight: 1.1 },
  showFooter: true,
};

export const LAYOUT_ALIGN_OPTIONS: { value: LayoutAlign; label: string }[] = [
  { value: "left", label: "왼쪽" },
  { value: "center", label: "가운데" },
  { value: "right", label: "오른쪽" },
];

export const LAYOUT_SCALE_OPTIONS: { value: number; label: string }[] = [
  { value: 0.9, label: "작게" },
  { value: 1, label: "보통" },
  { value: 1.15, label: "조금 크게" },
  { value: 1.3, label: "크게" },
];

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toAlign(value: unknown, fallback: LayoutAlign): LayoutAlign {
  return value === "left" || value === "center" || value === "right" ? value : fallback;
}

function normalizeStyle(raw: any, fallback: LayoutStyle): LayoutStyle {
  const fontScale = toFiniteNumber(raw?.font_scale);
  const lineHeight = toFiniteNumber(raw?.line_height);
  return {
    align: toAlign(raw?.align, fallback.align),
    fontScale: fontScale != null && fontScale > 0 ? fontScale : fallback.fontScale,
    lineHeight: lineHeight != null && lineHeight > 0 ? lineHeight : fallback.lineHeight,
  };
}

export function parseLayoutJson(raw: unknown): WriteLayoutModel {
  let parsed = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return { ...DEFAULT_WRITE_LAYOUT };
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return { ...DEFAULT_WRITE_LAYOUT };
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ...DEFAULT_WRITE_LAYOUT };
  }

  const record = parsed as Record<string, any>;
  const titleSource = record.styles?.title ?? record.title_box;
  const bodySource = record.styles?.body ?? record.text_box;
  const footerSource = record.styles?.footer ?? record.footer_box;

  return {
    titleStyle: normalizeStyle(titleSource, DEFAULT_WRITE_LAYOUT.titleStyle),
    bodyStyle: normalizeStyle(bodySource, DEFAULT_WRITE_LAYOUT.bodyStyle),
    footerStyle: normalizeStyle(footerSource, DEFAULT_WRITE_LAYOUT.footerStyle),
    showFooter: !Boolean(record.footer_box?.hidden),
  };
}

export function buildLayoutPayload(layout: WriteLayoutModel) {
  return {
    title_box: {
      align: layout.titleStyle.align,
      font_scale: layout.titleStyle.fontScale,
      line_height: layout.titleStyle.lineHeight,
    },
    text_box: {
      align: layout.bodyStyle.align,
      font_scale: layout.bodyStyle.fontScale,
      line_height: layout.bodyStyle.lineHeight,
    },
    footer_box: {
      align: layout.footerStyle.align,
      font_scale: layout.footerStyle.fontScale,
      line_height: layout.footerStyle.lineHeight,
      hidden: !layout.showFooter,
    },
  };
}
