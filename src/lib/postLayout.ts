import {
  DEFAULT_POST_BACKGROUND_TEMPLATE_ID,
  normalizePostBackgroundTemplateId,
  type PostBackgroundTemplateId,
} from "@/lib/postBackgroundTemplates";

export type LayoutAlign = "left" | "center" | "right";
export type LayoutBoxId = "title_box" | "text_box" | "footer_box";

export type LayoutStyle = {
  align: LayoutAlign;
  fontScale: number;
  lineHeight: number;
  letterSpacing?: number;
};

export type LayoutBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  hidden?: boolean;
  lock?: boolean;
};

export type WriteLayoutModel = {
  layoutVersion: number;
  unit: "normalized";
  presetId: PostBackgroundTemplateId;
  titleBox: LayoutBox;
  bodyBox: LayoutBox;
  footerBox: LayoutBox;
  titleStyle: LayoutStyle;
  bodyStyle: LayoutStyle;
  footerStyle: LayoutStyle;
  showFooter: boolean;
};

const SHORT_TITLE_BOX: LayoutBox = {
  x: 0.24,
  y: 0.248,
  w: 0.54,
  h: 0.124,
  hidden: false,
  lock: false,
};

const SHORT_BODY_BOX: LayoutBox = {
  x: 0.23,
  y: 0.354,
  w: 0.56,
  h: 0.405,
  hidden: false,
  lock: false,
};

const POEM_TITLE_BOX: LayoutBox = {
  x: 0.2,
  y: 0.24,
  w: 0.64,
  h: 0.126,
  hidden: false,
  lock: false,
};

const POEM_BODY_BOX: LayoutBox = {
  x: 0.2,
  y: 0.344,
  w: 0.64,
  h: 0.49,
  hidden: false,
  lock: false,
};

const ESSAY_TITLE_BOX: LayoutBox = {
  x: 0.22,
  y: 0.226,
  w: 0.64,
  h: 0.134,
  hidden: false,
  lock: false,
};

const ESSAY_BODY_BOX: LayoutBox = {
  x: 0.22,
  y: 0.366,
  w: 0.64,
  h: 0.55,
  hidden: false,
  lock: false,
};

const DEFAULT_FOOTER_BOX: LayoutBox = {
  x: 0.74,
  y: 0.9,
  w: 0.2,
  h: 0.06,
  hidden: false,
  lock: false,
};

const DEFAULT_TITLE_BOX = SHORT_TITLE_BOX;
const DEFAULT_BODY_BOX = SHORT_BODY_BOX;

export const DEFAULT_WRITE_LAYOUT: WriteLayoutModel = {
  layoutVersion: 1,
  unit: "normalized",
  presetId: DEFAULT_POST_BACKGROUND_TEMPLATE_ID,
  titleBox: DEFAULT_TITLE_BOX,
  bodyBox: DEFAULT_BODY_BOX,
  footerBox: DEFAULT_FOOTER_BOX,
  titleStyle: { align: "center", fontScale: 0.98, lineHeight: 1.12 },
  bodyStyle: { align: "center", fontScale: 0.98, lineHeight: 1.12 },
  footerStyle: { align: "right", fontScale: 1, lineHeight: 1.1 },
  showFooter: true,
};

function withLayoutBoxes(
  layout: WriteLayoutModel,
  boxes: {
    titleBox: LayoutBox;
    bodyBox: LayoutBox;
    footerBox?: LayoutBox;
  }
): WriteLayoutModel {
  return {
    ...layout,
    titleBox: { ...boxes.titleBox },
    bodyBox: { ...boxes.bodyBox },
    footerBox: { ...(boxes.footerBox ?? layout.footerBox) },
  };
}

export function getFallbackLayoutForPostType(type?: string | null): WriteLayoutModel {
  if (type === "essay") {
    return {
      ...withLayoutBoxes(cloneDefaultLayout(), {
        titleBox: ESSAY_TITLE_BOX,
        bodyBox: ESSAY_BODY_BOX,
      }),
      titleStyle: { align: "left", fontScale: 0.98, lineHeight: 1.13 },
      bodyStyle: { align: "left", fontScale: 1, lineHeight: 1.12 },
    };
  }
  if (type === "poem") {
    return {
      ...withLayoutBoxes(cloneDefaultLayout(), {
        titleBox: POEM_TITLE_BOX,
        bodyBox: POEM_BODY_BOX,
      }),
      titleStyle: { align: "center", fontScale: 0.98, lineHeight: 1.13 },
      bodyStyle: { align: "center", fontScale: 0.98, lineHeight: 1.2 },
    };
  }
  return cloneDefaultLayout();
}

export const LAYOUT_ALIGN_OPTIONS: { value: LayoutAlign; label: string }[] = [
  { value: "left", label: "왼쪽" },
  { value: "center", label: "가운데" },
  { value: "right", label: "오른쪽" },
];

export const LAYOUT_SCALE_OPTIONS: { value: number; label: string }[] = [
  { value: 0.9, label: "작게" },
  { value: 1, label: "보통" },
  { value: 1.3, label: "크게" },
];

export const LAYOUT_LINE_HEIGHT_OPTIONS = {
  title: [
    { value: 1.05, label: "촘촘" },
    { value: 1.15, label: "보통" },
    { value: 1.3, label: "넉넉" },
  ],
  body: [
    { value: 1.15, label: "촘촘" },
    { value: 1.3, label: "보통" },
    { value: 1.45, label: "넉넉" },
  ],
} as const;

export const LAYOUT_LETTER_SPACING_OPTIONS: { value: number; label: string }[] = [
  { value: -0.02, label: "좁게" },
  { value: 0, label: "보통" },
  { value: 0.04, label: "넓게" },
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

function round(value: number, precision = 4) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toAlign(value: unknown, fallback: LayoutAlign): LayoutAlign {
  return value === "left" || value === "center" || value === "right" ? value : fallback;
}

function normalizeStyle(raw: any, fallback: LayoutStyle, { allowLetterSpacing = false } = {}): LayoutStyle {
  const fontScale = toFiniteNumber(raw?.font_scale);
  const lineHeight = toFiniteNumber(raw?.line_height);
  const letterSpacing = toFiniteNumber(raw?.letter_spacing);
  return {
    align: toAlign(raw?.align, fallback.align),
    fontScale: fontScale != null && fontScale > 0 ? round(clamp(fontScale, 0.7, 2), 3) : fallback.fontScale,
    lineHeight:
      lineHeight != null && lineHeight > 0 ? round(clamp(lineHeight, 1, 2.2), 3) : fallback.lineHeight,
    ...(allowLetterSpacing && letterSpacing != null
      ? { letterSpacing: round(clamp(letterSpacing, -0.04, 0.08), 3) }
      : typeof fallback.letterSpacing === "number"
        ? { letterSpacing: fallback.letterSpacing }
        : {}),
  };
}

function normalizeBox(raw: any, fallback: LayoutBox): LayoutBox {
  const width = toFiniteNumber(raw?.w);
  const height = toFiniteNumber(raw?.h);
  const w = width != null ? clamp(width, 0.05, 1) : fallback.w;
  const h = height != null ? clamp(height, 0.05, 1) : fallback.h;
  const x = toFiniteNumber(raw?.x);
  const y = toFiniteNumber(raw?.y);

  return {
    x: round(x != null ? clamp(x, 0, 1 - w) : fallback.x),
    y: round(y != null ? clamp(y, 0, 1 - h) : fallback.y),
    w: round(w),
    h: round(h),
    hidden: raw?.hidden != null ? Boolean(raw.hidden) : Boolean(fallback.hidden),
    lock: raw?.lock != null ? Boolean(raw.lock) : Boolean(fallback.lock),
  };
}

function cloneDefaultLayout(): WriteLayoutModel {
  return {
    ...DEFAULT_WRITE_LAYOUT,
    titleBox: { ...DEFAULT_WRITE_LAYOUT.titleBox },
    bodyBox: { ...DEFAULT_WRITE_LAYOUT.bodyBox },
    footerBox: { ...DEFAULT_WRITE_LAYOUT.footerBox },
    titleStyle: { ...DEFAULT_WRITE_LAYOUT.titleStyle },
    bodyStyle: { ...DEFAULT_WRITE_LAYOUT.bodyStyle },
    footerStyle: { ...DEFAULT_WRITE_LAYOUT.footerStyle },
  };
}

export function parseLayoutJson(raw: unknown): WriteLayoutModel {
  let parsed = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return cloneDefaultLayout();
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return cloneDefaultLayout();
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return cloneDefaultLayout();
  }

  const record = parsed as Record<string, any>;
  const layout = cloneDefaultLayout();
  const boxArray = Array.isArray(record.boxes) ? record.boxes : null;
  const boxMap = boxArray
    ? new Map(boxArray.filter((item) => item && typeof item.id === "string").map((item) => [item.id, item]))
    : null;

  const titleSource = boxMap?.get("title_box") ?? record.title_box;
  const bodySource = boxMap?.get("text_box") ?? record.text_box;
  const footerSource = boxMap?.get("footer_box") ?? record.footer_box;

  layout.layoutVersion = Number(record.layout_version) || 1;
  layout.unit = "normalized";
  layout.presetId = normalizePostBackgroundTemplateId(record.canvas?.presetId);
  layout.titleBox = normalizeBox(titleSource, DEFAULT_TITLE_BOX);
  layout.bodyBox = normalizeBox(bodySource, DEFAULT_BODY_BOX);
  layout.footerBox = normalizeBox(footerSource, DEFAULT_FOOTER_BOX);
  layout.titleStyle = normalizeStyle(record.styles?.title ?? titleSource, DEFAULT_WRITE_LAYOUT.titleStyle, {
    allowLetterSpacing: true,
  });
  layout.bodyStyle = normalizeStyle(record.styles?.body ?? bodySource, DEFAULT_WRITE_LAYOUT.bodyStyle, {
    allowLetterSpacing: true,
  });
  layout.footerStyle = normalizeStyle(record.styles?.footer ?? footerSource, DEFAULT_WRITE_LAYOUT.footerStyle);
  layout.showFooter = !Boolean(layout.footerBox.hidden);

  return layout;
}

export function resolvePostLayout(raw: unknown, type?: string | null): WriteLayoutModel {
  if (raw == null || raw === "") {
    return getFallbackLayoutForPostType(type);
  }
  return parseLayoutJson(raw);
}

export function updateLayoutBox(
  layout: WriteLayoutModel,
  boxId: LayoutBoxId,
  updates: Partial<LayoutBox>
): WriteLayoutModel {
  const key = boxId === "title_box" ? "titleBox" : boxId === "text_box" ? "bodyBox" : "footerBox";
  const current = layout[key];
  const next = normalizeBox({ ...current, ...updates }, current);
  return { ...layout, [key]: next };
}

export function buildLayoutPayload(layout: WriteLayoutModel) {
  return {
    layout_version: layout.layoutVersion,
    unit: layout.unit,
    canvas: {
      presetId: normalizePostBackgroundTemplateId(layout.presetId),
    },
    title_box: {
      x: layout.titleBox.x,
      y: layout.titleBox.y,
      w: layout.titleBox.w,
      h: layout.titleBox.h,
      align: layout.titleStyle.align,
      font_scale: layout.titleStyle.fontScale,
      line_height: layout.titleStyle.lineHeight,
      ...(typeof layout.titleStyle.letterSpacing === "number"
        ? { letter_spacing: layout.titleStyle.letterSpacing }
        : {}),
      hidden: Boolean(layout.titleBox.hidden),
    },
    text_box: {
      x: layout.bodyBox.x,
      y: layout.bodyBox.y,
      w: layout.bodyBox.w,
      h: layout.bodyBox.h,
      align: layout.bodyStyle.align,
      font_scale: layout.bodyStyle.fontScale,
      line_height: layout.bodyStyle.lineHeight,
      ...(typeof layout.bodyStyle.letterSpacing === "number"
        ? { letter_spacing: layout.bodyStyle.letterSpacing }
        : {}),
      hidden: Boolean(layout.bodyBox.hidden),
    },
    footer_box: {
      x: layout.footerBox.x,
      y: layout.footerBox.y,
      w: layout.footerBox.w,
      h: layout.footerBox.h,
      align: layout.footerStyle.align,
      font_scale: layout.footerStyle.fontScale,
      line_height: layout.footerStyle.lineHeight,
      hidden: !layout.showFooter,
    },
  };
}

export function toLayoutLetterSpacingPx(fontSize: number, letterSpacingEm?: number) {
  if (!Number.isFinite(fontSize) || typeof letterSpacingEm !== "number") return undefined;
  return round(fontSize * letterSpacingEm, 3);
}
