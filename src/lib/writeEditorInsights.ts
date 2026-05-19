import type { PostType } from "@/types/post";

export type WriteDensityLevel = "empty" | "easy" | "balanced" | "dense";

export type WriteEditorInsight = {
  detectedType: PostType;
  detectedLabel: string;
  characterCount: number;
  lineCount: number;
  paragraphCount: number;
  estimatedPageCount: number;
  densityLevel: WriteDensityLevel;
  densityLabel: string;
  primaryFeedback: string;
  secondaryFeedback?: string;
};

const TYPE_LABELS: Record<PostType, string> = {
  poem: "운문",
  essay: "산문",
  short: "짧은 구절",
};

const ESTIMATED_PAGE_CAPACITY: Record<PostType, number> = {
  short: 190,
  poem: 300,
  essay: 500,
};

function countContentCharacters(value: string) {
  return Array.from(value.replace(/\s/g, "")).length;
}

function splitNonEmptyLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitParagraphs(value: string) {
  return value
    .trim()
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function detectPostType({
  characterCount,
  lineCount,
  paragraphCount,
  averageLineLength,
}: {
  characterCount: number;
  lineCount: number;
  paragraphCount: number;
  averageLineLength: number;
}): PostType {
  if (characterCount <= 90 && lineCount <= 4 && paragraphCount <= 1) {
    return "short";
  }

  if (lineCount >= 3 && averageLineLength <= 28) {
    return "poem";
  }

  if (paragraphCount >= 2 || characterCount >= 160) {
    return "essay";
  }

  return lineCount >= 3 ? "poem" : "short";
}

function estimatePageCount({
  type,
  title,
  characterCount,
  lineCount,
  paragraphCount,
}: {
  type: PostType;
  title: string;
  characterCount: number;
  lineCount: number;
  paragraphCount: number;
}) {
  const titleWeight = title.trim() ? 32 : 0;
  const structureWeight = lineCount * 7 + Math.max(0, paragraphCount - 1) * 24;
  const weightedUnits = characterCount + titleWeight + structureWeight;
  const capacity = ESTIMATED_PAGE_CAPACITY[type];

  return Math.max(1, Math.min(24, Math.ceil(weightedUnits / capacity)));
}

function resolveDensity({
  characterCount,
  estimatedPageCount,
  type,
}: {
  characterCount: number;
  estimatedPageCount: number;
  type: PostType;
}): { densityLevel: WriteDensityLevel; densityLabel: string } {
  if (characterCount === 0) {
    return { densityLevel: "empty", densityLabel: "대기" };
  }

  const capacity = ESTIMATED_PAGE_CAPACITY[type];
  const ratio = characterCount / Math.max(1, estimatedPageCount * capacity);

  if (ratio < 0.35) return { densityLevel: "easy", densityLabel: "여백 넉넉" };
  if (ratio < 0.72) return { densityLevel: "balanced", densityLabel: "균형 좋음" };
  return { densityLevel: "dense", densityLabel: "조금 빽빽" };
}

function getFirstSentence(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  const match = normalized.match(/^.+?[.!?。！？…]|^.+?[.?!]|^.+?(?:다|요|죠|네)(?:\s|$)/);
  return (match?.[0] ?? normalized).trim();
}

function buildFeedback({
  body,
  type,
  characterCount,
  lineCount,
  paragraphCount,
  estimatedPageCount,
  densityLevel,
  hasTitle,
}: {
  body: string;
  type: PostType;
  characterCount: number;
  lineCount: number;
  paragraphCount: number;
  estimatedPageCount: number;
  densityLevel: WriteDensityLevel;
  hasTitle: boolean;
}) {
  if (characterCount === 0) {
    return {
      primaryFeedback: "본문을 쓰면 글의 호흡과 카드 수를 바로 잡아볼게요.",
      secondaryFeedback: "짧은 구절, 운문, 산문 중 가장 가까운 형식을 자동으로 추정합니다.",
    };
  }

  const firstSentence = getFirstSentence(body);
  if (Array.from(firstSentence.replace(/\s/g, "")).length >= 62) {
    return {
      primaryFeedback: "첫 문장이 길게 보여요. 한 번 끊으면 첫 장이 더 편하게 읽혀요.",
      secondaryFeedback: estimatedPageCount > 1 ? `${estimatedPageCount}장으로 나누는 흐름이 어울립니다.` : undefined,
    };
  }

  if (densityLevel === "dense") {
    return {
      primaryFeedback: "본문 밀도가 높아요. 문단을 나누면 여백이 더 살아나요.",
      secondaryFeedback: estimatedPageCount > 1 ? `현재는 ${estimatedPageCount}장 정도로 보는 편이 안정적입니다.` : undefined,
    };
  }

  if (type === "poem") {
    return {
      primaryFeedback: "줄바꿈의 리듬이 살아 있어 운문 카드로 보기 좋아요.",
      secondaryFeedback: lineCount >= 8 ? "연 사이에 빈 줄을 두면 페이지 호흡이 더 또렷해집니다." : undefined,
    };
  }

  if (type === "essay") {
    return {
      primaryFeedback:
        estimatedPageCount > 1
          ? `산문 흐름으로 보고 있어요. ${estimatedPageCount}장으로 나누면 부담이 줄어요.`
          : "산문 흐름이지만 아직 한 장 안에서 안정적으로 읽혀요.",
      secondaryFeedback: !hasTitle ? "짧은 제목을 붙이면 첫 장의 진입이 선명해져요." : undefined,
    };
  }

  return {
    primaryFeedback: "짧은 구절처럼 보여요. 여백 중심 카드에 잘 맞아요.",
    secondaryFeedback:
      paragraphCount > 1 ? "짧은 구절은 문단을 줄이면 한 장의 힘이 더 또렷해져요." : undefined,
  };
}

export function getWritePostTypeLabel(type: PostType) {
  return TYPE_LABELS[type];
}

export function analyzeWriteEditorContent({
  title,
  body,
}: {
  title: string;
  body: string;
}): WriteEditorInsight {
  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const characterCount = countContentCharacters(trimmedBody);
  const lines = splitNonEmptyLines(trimmedBody);
  const paragraphs = splitParagraphs(trimmedBody);
  const lineCount = lines.length;
  const paragraphCount = paragraphs.length;
  const averageLineLength = lineCount > 0 ? characterCount / lineCount : characterCount;
  const detectedType = detectPostType({
    characterCount,
    lineCount,
    paragraphCount,
    averageLineLength,
  });
  const estimatedPageCount = estimatePageCount({
    type: detectedType,
    title: trimmedTitle,
    characterCount,
    lineCount,
    paragraphCount,
  });
  const density = resolveDensity({
    characterCount,
    estimatedPageCount,
    type: detectedType,
  });
  const feedback = buildFeedback({
    body: trimmedBody,
    type: detectedType,
    characterCount,
    lineCount,
    paragraphCount,
    estimatedPageCount,
    densityLevel: density.densityLevel,
    hasTitle: trimmedTitle.length > 0,
  });

  return {
    detectedType,
    detectedLabel: getWritePostTypeLabel(detectedType),
    characterCount,
    lineCount,
    paragraphCount,
    estimatedPageCount,
    ...density,
    ...feedback,
  };
}
