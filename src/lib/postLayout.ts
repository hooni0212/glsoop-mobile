export type LayoutAlign = "left" | "center" | "right";
export type LayoutBoxId = "title_box" | "text_box" | "footer_box";

export type LayoutStyle = {
  align: LayoutAlign;
  fontScale: number;
  lineHeight: number;
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
  presetId: "paper01";
  titleBox: LayoutBox;
  bodyBox: LayoutBox;
  footerBox: LayoutBox;
  titleStyle: LayoutStyle;
  bodyStyle: LayoutStyle;
  footerStyle: LayoutStyle;
  showFooter: boolean;
};

const DEFAULT_TITLE_BOX: LayoutBox = {
  x: 0.336,
  y: 0.256,
  w: 0.424,
  h: 0.122,
  hidden: false,
  lock: false,
};

const DEFAULT_BODY_BOX: LayoutBox = {
  x: 0.336,
  y: 0.364,
  w: 0.424,
  h: 0.346,
  hidden: false,
  lock: false,
};

const DEFAULT_FOOTER_BOX: LayoutBox = {
  x: 0.78,
  y: 0.9,
  w: 0.16,
  h: 0.06,
  hidden: false,
  lock: false,
};

export const DEFAULT_WRITE_LAYOUT: WriteLayoutModel = {
  layoutVersion: 1,
  unit: "normalized",
  presetId: "paper01",
  titleBox: DEFAULT_TITLE_BOX,
  bodyBox: DEFAULT_BODY_BOX,
  footerBox: DEFAULT_FOOTER_BOX,
  titleStyle: { align: "center", fontScale: 1, lineHeight: 1.15 },
  bodyStyle: { align: "center", fontScale: 1, lineHeight: 1.15 },
  footerStyle: { align: "right", fontScale: 1, lineHeight: 1.1 },
  showFooter: true,
};

export function getFallbackLayoutForPostType(type?: string | null): WriteLayoutModel {
  if (type === "essay") {
    return {
      ...cloneDefaultLayout(),
      titleStyle: { align: "left", fontScale: 1, lineHeight: 1.18 },
      bodyStyle: { align: "left", fontScale: 1, lineHeight: 1.24 },
    };
  }
  if (type === "poem") {
    return {
      ...cloneDefaultLayout(),
      titleStyle: { align: "center", fontScale: 1, lineHeight: 1.16 },
      bodyStyle: { align: "center", fontScale: 1.04, lineHeight: 1.28 },
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

function normalizeStyle(raw: any, fallback: LayoutStyle): LayoutStyle {
  const fontScale = toFiniteNumber(raw?.font_scale);
  const lineHeight = toFiniteNumber(raw?.line_height);
  return {
    align: toAlign(raw?.align, fallback.align),
    fontScale: fontScale != null && fontScale > 0 ? round(clamp(fontScale, 0.7, 2), 3) : fallback.fontScale,
    lineHeight:
      lineHeight != null && lineHeight > 0 ? round(clamp(lineHeight, 1, 2.2), 3) : fallback.lineHeight,
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
  layout.presetId =
    typeof record.canvas?.presetId === "string" && record.canvas.presetId.trim()
      ? "paper01"
      : DEFAULT_WRITE_LAYOUT.presetId;
  layout.titleBox = normalizeBox(titleSource, DEFAULT_TITLE_BOX);
  layout.bodyBox = normalizeBox(bodySource, DEFAULT_BODY_BOX);
  layout.footerBox = normalizeBox(footerSource, DEFAULT_FOOTER_BOX);
  layout.titleStyle = normalizeStyle(record.styles?.title ?? titleSource, DEFAULT_WRITE_LAYOUT.titleStyle);
  layout.bodyStyle = normalizeStyle(record.styles?.body ?? bodySource, DEFAULT_WRITE_LAYOUT.bodyStyle);
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
    title_box: {
      x: layout.titleBox.x,
      y: layout.titleBox.y,
      w: layout.titleBox.w,
      h: layout.titleBox.h,
      align: layout.titleStyle.align,
      font_scale: layout.titleStyle.fontScale,
      line_height: layout.titleStyle.lineHeight,
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
