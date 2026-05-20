import {
  getPostBackgroundTemplate,
  normalizePostBackgroundTemplateId,
  type PostBackgroundTemplate,
  type PostBackgroundTemplateId,
} from "@/lib/postBackgroundTemplates";
import { normalizePostEditorText, type PostFontKey } from "@/lib/postContent";
import { buildLayoutPayload, type LayoutAlign, type WriteLayoutModel } from "@/lib/postLayout";
import type { PostType } from "@/types/post";

export const LOCAL_FEED_PREVIEW_CANVAS = {
  width: 500,
  height: 666,
};

export const LOCAL_FEED_PREVIEW_PAGE_CAP = 8;

const LAYOUT_PRESETS = {
  oneLine: {
    topPct: 0.34,
    leftPct: 0.22,
    widthPct: 0.56,
    bottomPct: 0.34,
    fontSizeRatio: 0.041,
    lineHeightRatio: 1.14,
    maxLines: 2,
    textAlign: "center",
    verticalAlign: "center",
  },
  short: {
    topPct: 0.354,
    leftPct: 0.23,
    widthPct: 0.56,
    bottomPct: 0.23,
    fontSizeRatio: 0.035,
    lineHeightRatio: 1.13,
    maxLines: 7,
    textAlign: "center",
    verticalAlign: "center",
  },
  medium: {
    topPct: 0.415,
    leftPct: 0.2,
    widthPct: 0.64,
    bottomPct: 0.075,
    fontSizeRatio: 0.0325,
    lineHeightRatio: 1.12,
    maxLines: 12,
    textAlign: "left",
    verticalAlign: "top",
  },
  long: {
    topPct: 0.385,
    leftPct: 0.22,
    widthPct: 0.64,
    bottomPct: 0.045,
    fontSizeRatio: 0.03,
    lineHeightRatio: 1.1,
    maxLines: 18,
    textAlign: "left",
    verticalAlign: "top",
  },
  xlong: {
    topPct: 0.365,
    leftPct: 0.22,
    widthPct: 0.64,
    bottomPct: 0.04,
    fontSizeRatio: 0.0275,
    lineHeightRatio: 1.08,
    maxLines: 22,
    textAlign: "left",
    verticalAlign: "top",
  },
} as const;

const FEED_TITLE_BOX_PRESETS = {
  oneLine: {
    textAlign: "center",
    verticalAlign: "top",
    maxLines: 2,
  },
  short: {
    textAlign: "center",
    verticalAlign: "top",
    maxLines: 2,
  },
  medium: {
    textAlign: "left",
    verticalAlign: "top",
    maxLines: 2,
  },
  long: {
    textAlign: "left",
    verticalAlign: "top",
    maxLines: 2,
  },
  xlong: {
    textAlign: "left",
    verticalAlign: "top",
    maxLines: 2,
  },
} as const;

const CUSTOM_LAYOUT_MIN_BOX_SIZE = 0.06;
const TEXT_CLIP_TOP_PADDING_RATIO = 0.08;
const TEXT_CLIP_BOTTOM_PADDING_RATIO = 0.14;
const SHARE_LOGO_TEXT = "글숲";

type PresetKey = keyof typeof LAYOUT_PRESETS;
type VerticalAlign = "top" | "center";

export type LocalFeedPreviewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LocalFeedPreviewTextBlock = {
  id: "title" | "body" | "footer";
  box: LocalFeedPreviewBox;
  lines: string[];
  textAlign: LayoutAlign;
  verticalAlign: VerticalAlign;
  fontSizePx: number;
  lineHeightPx: number;
  letterSpacingEm: number;
  fontWeight: "400" | "500" | "600";
  clipPadTopPx: number;
  clipPadBottomPx: number;
};

export type LocalFeedPreviewPage = {
  id: string;
  pageNumber: number;
  templateId: PostBackgroundTemplateId;
  template: PostBackgroundTemplate;
  body: LocalFeedPreviewTextBlock;
  title?: LocalFeedPreviewTextBlock;
  footer?: LocalFeedPreviewTextBlock;
};

export type LocalFeedPreview = {
  pages: LocalFeedPreviewPage[];
  pageCount: number;
  pageCap: number;
  isTruncated: boolean;
  templateId: PostBackgroundTemplateId;
  fontKey: PostFontKey;
};

type LocalFeedPreviewInput = {
  title: string;
  content: string;
  contentPages?: string[];
  category?: PostType | null;
  layout: WriteLayoutModel;
  fontKey: PostFontKey;
};

type ParsedLayoutBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  align?: LayoutAlign;
  font_scale?: number;
  line_height?: number;
  letter_spacing?: number;
};

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isCjkChar(ch: string) {
  return /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af\u3040-\u30ff\u3400-\u9fff]/.test(
    ch
  );
}

function estimateTextWidthPx(text: string, fontSizePx: number, letterSpacingEm = 0) {
  const str = String(text || "");
  let width = 0;

  for (const ch of str) {
    if (/\s/.test(ch)) {
      width += fontSizePx * 0.34;
      continue;
    }
    if (isCjkChar(ch)) {
      width += fontSizePx * 0.98;
      continue;
    }
    if (/[A-Z]/.test(ch)) {
      width += fontSizePx * 0.64;
      continue;
    }
    if (/[a-z]/.test(ch)) {
      width += fontSizePx * 0.54;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      width += fontSizePx * 0.56;
      continue;
    }
    if (/[.,:;'"`~!?()[\]{}|/\\-]/.test(ch)) {
      width += fontSizePx * 0.34;
      continue;
    }
    width += fontSizePx * 0.75;
  }

  const charCount = Array.from(str).length;
  const letterSpacingPx = fontSizePx * Number(letterSpacingEm || 0);
  return width + Math.max(0, charCount - 1) * letterSpacingPx;
}

function splitWordByWidth(word: string, maxWidthPx: number, fontSizePx: number, letterSpacingEm = 0) {
  const chunks: string[] = [];
  let current = "";

  for (const ch of Array.from(String(word || ""))) {
    const next = `${current}${ch}`;
    if (current && estimateTextWidthPx(next, fontSizePx, letterSpacingEm) > maxWidthPx) {
      chunks.push(current);
      current = ch;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks.length ? chunks : [""];
}

function wrapSingleParagraph(
  paragraph: string,
  maxWidthPx: number,
  fontSizePx: number,
  letterSpacingEm = 0
) {
  const normalized = String(paragraph || "").replace(/\s+/g, " ").trim();
  if (!normalized) return [""];

  const words = normalized.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (estimateTextWidthPx(candidate, fontSizePx, letterSpacingEm) <= maxWidthPx) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = "";
    }

    if (estimateTextWidthPx(word, fontSizePx, letterSpacingEm) <= maxWidthPx) {
      currentLine = word;
      continue;
    }

    const chunks = splitWordByWidth(word, maxWidthPx, fontSizePx, letterSpacingEm);
    if (chunks.length === 1) {
      currentLine = chunks[0];
      continue;
    }

    lines.push(...chunks.slice(0, -1));
    currentLine = chunks[chunks.length - 1];
  }

  if (currentLine) lines.push(currentLine);
  return lines.length ? lines : [""];
}

function clampLineWithEllipsis(
  line: string,
  maxWidthPx: number,
  fontSizePx: number,
  letterSpacingEm = 0
) {
  const text = String(line || "");
  const ellipsis = "…";
  if (estimateTextWidthPx(text, fontSizePx, letterSpacingEm) <= maxWidthPx) return text;

  let result = "";
  for (const ch of Array.from(text)) {
    const next = `${result}${ch}`;
    if (estimateTextWidthPx(`${next}${ellipsis}`, fontSizePx, letterSpacingEm) > maxWidthPx) break;
    result = next;
  }

  return `${result}${ellipsis}`;
}

function layoutAllTextLines(text: string, maxWidthPx: number, fontSizePx: number, letterSpacingEm = 0) {
  const paragraphs = String(text || "")
    .split("\n")
    .map((line) => line.trim());

  const lines: string[] = [];

  paragraphs.forEach((paragraph, index) => {
    const wrapped = wrapSingleParagraph(paragraph, maxWidthPx, fontSizePx, letterSpacingEm);
    lines.push(...wrapped);
    if (index < paragraphs.length - 1) {
      lines.push("");
    }
  });

  while (lines.length > 1 && !lines[lines.length - 1]) {
    lines.pop();
  }

  return lines.length ? lines : [""];
}

function layoutTextLines(
  text: string,
  maxWidthPx: number,
  fontSizePx: number,
  maxLines: number,
  letterSpacingEm = 0
) {
  const lines = layoutAllTextLines(text, maxWidthPx, fontSizePx, letterSpacingEm);

  if (lines.length <= maxLines) return lines;

  const truncated = lines.slice(0, maxLines);
  truncated[maxLines - 1] = clampLineWithEllipsis(
    truncated[maxLines - 1],
    maxWidthPx,
    fontSizePx,
    letterSpacingEm
  );
  return truncated;
}

function paginateTextLines(lines: string[], maxLinesPerPage: number, pageCap = LOCAL_FEED_PREVIEW_PAGE_CAP) {
  const safeLines = Array.isArray(lines) && lines.length > 0 ? lines : [""];
  const pageLines = Math.max(1, Number(maxLinesPerPage) || 1);
  const pages: string[][] = [];
  let cursor = 0;

  while (cursor < safeLines.length && pages.length < pageCap) {
    pages.push(safeLines.slice(cursor, cursor + pageLines));
    cursor += pageLines;
  }

  if (!pages.length) {
    pages.push([""]);
  }

  return {
    pages,
    pageCount: pages.length,
    isTruncated: cursor < safeLines.length,
    pageCap,
  };
}

function selectLengthPreset(textLength: number): PresetKey {
  if (textLength <= 20) return "oneLine";
  if (textLength <= 70) return "short";
  if (textLength <= 170) return "medium";
  if (textLength <= 260) return "long";
  return "xlong";
}

function resolveBoxFromNormalizedLayout(
  width: number,
  height: number,
  textBox: Partial<ParsedLayoutBox> = {}
): LocalFeedPreviewBox {
  const normalizedW = clampNumber(
    toFiniteNumber(textBox.w) || CUSTOM_LAYOUT_MIN_BOX_SIZE,
    CUSTOM_LAYOUT_MIN_BOX_SIZE,
    1
  );
  const normalizedH = clampNumber(
    toFiniteNumber(textBox.h) || CUSTOM_LAYOUT_MIN_BOX_SIZE,
    CUSTOM_LAYOUT_MIN_BOX_SIZE,
    1
  );
  const normalizedX = clampNumber(
    toFiniteNumber(textBox.x) || 0,
    0,
    Math.max(0, 1 - normalizedW)
  );
  const normalizedY = clampNumber(
    toFiniteNumber(textBox.y) || 0,
    0,
    Math.max(0, 1 - normalizedH)
  );

  const box = {
    x: Math.round(width * normalizedX),
    y: Math.round(height * normalizedY),
    width: Math.max(1, Math.round(width * normalizedW)),
    height: Math.max(1, Math.round(height * normalizedH)),
  };

  if (box.x + box.width > width) {
    box.x = Math.max(0, width - box.width);
  }
  if (box.y + box.height > height) {
    box.y = Math.max(0, height - box.height);
  }

  return box;
}

function resolveFittedMaxLines(boxHeightPx: number, lineHeightPx: number, presetMaxLines: number) {
  const fitted = Math.max(1, Math.floor(boxHeightPx / Math.max(1, lineHeightPx)));
  const normalizedPreset = Math.max(1, Number(presetMaxLines) || 1);
  return Math.max(1, Math.min(fitted, normalizedPreset));
}

function resolveBodyPageMaxLines(
  boxHeightPx: number,
  lineHeightPx: number,
  presetMaxLines: number | null = null
) {
  const fitted = Math.max(1, Math.floor(boxHeightPx / Math.max(1, lineHeightPx)));
  if (presetMaxLines == null) {
    return fitted;
  }
  return resolveFittedMaxLines(boxHeightPx, lineHeightPx, presetMaxLines);
}

function normalizeManualContentPages(rawContentPages?: string[]) {
  if (!Array.isArray(rawContentPages) || rawContentPages.length === 0) return null;

  const normalized = rawContentPages.map((page) => normalizePostEditorText(page));

  while (normalized.length > 1 && !normalized[normalized.length - 1]) {
    normalized.pop();
  }

  if (!normalized.some((page) => page.trim())) return null;

  return {
    pages: normalized.slice(0, LOCAL_FEED_PREVIEW_PAGE_CAP),
    isTruncated: normalized.length > LOCAL_FEED_PREVIEW_PAGE_CAP,
  };
}

function createTextBlock(input: {
  id: LocalFeedPreviewTextBlock["id"];
  box: LocalFeedPreviewBox;
  lines: string[];
  textAlign: LayoutAlign;
  verticalAlign: VerticalAlign;
  fontSizePx: number;
  lineHeightPx: number;
  letterSpacingEm?: number;
  fontWeight: LocalFeedPreviewTextBlock["fontWeight"];
}): LocalFeedPreviewTextBlock {
  return {
    id: input.id,
    box: input.box,
    lines: input.lines.length ? input.lines : [""],
    textAlign: input.textAlign,
    verticalAlign: input.verticalAlign,
    fontSizePx: input.fontSizePx,
    lineHeightPx: input.lineHeightPx,
    letterSpacingEm: input.letterSpacingEm || 0,
    fontWeight: input.fontWeight,
    clipPadTopPx: Math.round(input.box.height * TEXT_CLIP_TOP_PADDING_RATIO),
    clipPadBottomPx: Math.round(input.box.height * TEXT_CLIP_BOTTOM_PADDING_RATIO),
  };
}

function createFooterBlock(footerLayout: ParsedLayoutBox): LocalFeedPreviewTextBlock {
  const { width, height } = LOCAL_FEED_PREVIEW_CANVAS;
  const footerBox = resolveBoxFromNormalizedLayout(width, height, footerLayout);
  const fontScale = footerLayout.font_scale || 1;
  const lineHeightRatio = footerLayout.line_height || 1.1;
  const baseFontSizePx = Math.max(15, Math.round(width * 0.025));
  const fontSizePx = Math.max(12, baseFontSizePx * fontScale);
  const lineHeightPx = fontSizePx * lineHeightRatio;

  return createTextBlock({
    id: "footer",
    box: footerBox,
    lines: [SHARE_LOGO_TEXT],
    textAlign: footerLayout.align || "center",
    verticalAlign: "center",
    fontSizePx,
    lineHeightPx,
    letterSpacingEm: 0.04,
    fontWeight: "500",
  });
}

export function buildLocalFeedPreview(input: LocalFeedPreviewInput): LocalFeedPreview {
  const { width, height } = LOCAL_FEED_PREVIEW_CANVAS;
  const titleText = normalizePostEditorText(input.title) || "";
  const bodyText = normalizePostEditorText(input.content) || titleText || " ";
  const manualContentPages = normalizeManualContentPages(input.contentPages);
  const presetKey = selectLengthPreset(bodyText.length);
  const preset = LAYOUT_PRESETS[presetKey];
  const titlePreset = FEED_TITLE_BOX_PRESETS[presetKey];
  const payload = buildLayoutPayload(input.layout);
  const templateId = normalizePostBackgroundTemplateId(input.layout.presetId);
  const template = getPostBackgroundTemplate(templateId);
  const bodyLayout = payload.text_box as ParsedLayoutBox;
  const titleLayout = payload.title_box as ParsedLayoutBox;
  const footerLayout = payload.footer_box as ParsedLayoutBox;
  const bodyBox = resolveBoxFromNormalizedLayout(width, height, bodyLayout);
  const bodyFontScale = bodyLayout.font_scale || 1;
  const bodyLineHeightRatio = bodyLayout.line_height || preset.lineHeightRatio;
  const bodyLetterSpacingEm = bodyLayout.letter_spacing || 0;
  const minFontSizePx = 12;
  const bodyFontSizePx = Math.max(minFontSizePx, width * preset.fontSizeRatio * bodyFontScale);
  const bodyLineHeightPx = bodyFontSizePx * bodyLineHeightRatio;
  const pageMaxLines = resolveBodyPageMaxLines(bodyBox.height, bodyLineHeightPx);
  const allBodyLines = layoutAllTextLines(
    bodyText,
    Math.max(20, bodyBox.width),
    bodyFontSizePx,
    bodyLetterSpacingEm
  );
  const pagination = manualContentPages
    ? {
        pages: manualContentPages.pages.map((pageText) =>
          layoutTextLines(
            pageText,
            Math.max(20, bodyBox.width),
            bodyFontSizePx,
            pageMaxLines,
            bodyLetterSpacingEm
          )
        ),
        pageCount: manualContentPages.pages.length,
        pageCap: LOCAL_FEED_PREVIEW_PAGE_CAP,
        isTruncated: manualContentPages.isTruncated,
      }
    : paginateTextLines(allBodyLines, pageMaxLines, LOCAL_FEED_PREVIEW_PAGE_CAP);
  const footerBlock = createFooterBlock(footerLayout);

  const pages = pagination.pages.map((pageLines, index): LocalFeedPreviewPage => {
    let titleBlock: LocalFeedPreviewTextBlock | undefined;
    if (index === 0 && titleText) {
      const titleBox = resolveBoxFromNormalizedLayout(width, height, titleLayout);
      const titleFontScale = titleLayout.font_scale || 1;
      const titleLineHeightRatio = titleLayout.line_height || bodyLineHeightRatio;
      const titleLetterSpacingEm = titleLayout.letter_spacing || 0;
      const titleBaseFontSize = Math.max(minFontSizePx, width * preset.fontSizeRatio * 0.9);
      const titleFontSizePx = Math.max(minFontSizePx, titleBaseFontSize * titleFontScale);
      const titleLineHeightPx = titleFontSizePx * titleLineHeightRatio;
      const titleMaxLines = resolveFittedMaxLines(
        titleBox.height,
        titleLineHeightPx,
        titlePreset.maxLines
      );
      const titleLines = layoutTextLines(
        titleText,
        Math.max(20, titleBox.width),
        titleFontSizePx,
        titleMaxLines,
        titleLetterSpacingEm
      );

      titleBlock = createTextBlock({
        id: "title",
        box: titleBox,
        lines: titleLines,
        textAlign: titleLayout.align || titlePreset.textAlign,
        verticalAlign: titlePreset.verticalAlign,
        fontSizePx: titleFontSizePx,
        lineHeightPx: titleLineHeightPx,
        letterSpacingEm: titleLetterSpacingEm,
        fontWeight: input.fontKey === "hand" ? "400" : input.fontKey === "sans" ? "500" : "600",
      });
    }

    return {
      id: `${templateId}-${input.fontKey}-${index + 1}-${pageLines.join("|")}`,
      pageNumber: index + 1,
      templateId,
      template,
      title: titleBlock,
      body: createTextBlock({
        id: "body",
        box: bodyBox,
        lines: pageLines,
        textAlign: bodyLayout.align || preset.textAlign,
        verticalAlign: preset.verticalAlign,
        fontSizePx: bodyFontSizePx,
        lineHeightPx: bodyLineHeightPx,
        letterSpacingEm: bodyLetterSpacingEm,
        fontWeight: input.fontKey === "hand" ? "400" : input.fontKey === "sans" ? "500" : "600",
      }),
      footer: footerBlock,
    };
  });

  return {
    pages: pages.length ? pages : [
      {
        id: `${templateId}-${input.fontKey}-empty`,
        pageNumber: 1,
        templateId,
        template,
        body: createTextBlock({
          id: "body",
          box: bodyBox,
          lines: [""],
          textAlign: bodyLayout.align || preset.textAlign,
          verticalAlign: preset.verticalAlign,
          fontSizePx: bodyFontSizePx,
          lineHeightPx: bodyLineHeightPx,
          letterSpacingEm: bodyLetterSpacingEm,
          fontWeight: input.fontKey === "hand" ? "400" : input.fontKey === "sans" ? "500" : "600",
        }),
        footer: footerBlock,
      },
    ],
    pageCount: Math.max(1, pagination.pageCount),
    pageCap: LOCAL_FEED_PREVIEW_PAGE_CAP,
    isTruncated: pagination.isTruncated,
    templateId,
    fontKey: input.fontKey,
  };
}
