import React, { useMemo, type ReactNode } from "react";
import { Text, View } from "react-native";

import type { WriteLayoutModel } from "@/lib/postLayout";
import type { PostType } from "@/types/post";

import { PaperSurface, paperSurfaceStyles } from "./PaperSurface";

type Props = {
  title?: string;
  body?: string;
  paragraphs?: string[];
  footerText?: string;
  layout: WriteLayoutModel;
  type?: PostType | null;
  mode: "edit" | "read";
  eyebrow?: string;
  hint?: string;
  renderTitle?: () => ReactNode;
  renderBody?: () => ReactNode;
};

function getTypePreset(type?: PostType | null) {
  if (type === "short") {
    return { titleSize: 30, bodySize: 20, bodyLine: 34, centerBody: true };
  }
  if (type === "poem") {
    return { titleSize: 26, bodySize: 17, bodyLine: 32, centerBody: false };
  }
  return { titleSize: 24, bodySize: 16, bodyLine: 30, centerBody: false };
}

export function PaperReadingCard({
  title,
  body,
  paragraphs,
  footerText,
  layout,
  type,
  mode,
  eyebrow,
  hint,
  renderTitle,
  renderBody,
}: Props) {
  const preset = getTypePreset(type);
  const blocks = useMemo(() => {
    if (Array.isArray(paragraphs) && paragraphs.length > 0) return paragraphs;
    if (typeof body === "string" && body.trim()) return [body.trim()];
    return [];
  }, [body, paragraphs]);

  const bodyAlign = layout.bodyStyle.align;
  const titleAlign = layout.titleStyle.align;
  const footerAlign = layout.footerStyle.align;

  return (
    <PaperSurface eyebrow={eyebrow} hint={hint}>
      <View
        style={[
          styles.inner,
          preset.centerBody && mode === "read" ? styles.innerShort : null,
        ]}
      >
        {renderTitle ? (
          renderTitle()
        ) : title ? (
          <Text
            style={[
              styles.title,
              paperSurfaceStyles.serifText,
              {
                textAlign: titleAlign,
                fontSize: preset.titleSize * layout.titleStyle.fontScale,
                lineHeight: Math.round(preset.titleSize * 1.28 * layout.titleStyle.lineHeight),
              },
            ]}
          >
            {title}
          </Text>
        ) : null}

        {title || renderTitle ? <View style={styles.titleGap} /> : null}

        {renderBody ? (
          renderBody()
        ) : (
          <View style={[styles.bodyWrap, preset.centerBody && mode === "read" ? styles.bodyWrapCentered : null]}>
            {blocks.map((paragraph, index) => (
              <Text
                key={`paragraph-${index}`}
                style={[
                  styles.body,
                  paperSurfaceStyles.serifText,
                  index > 0 ? styles.bodyParagraphGap : null,
                  {
                    textAlign: bodyAlign,
                    fontSize: preset.bodySize * layout.bodyStyle.fontScale,
                    lineHeight: Math.round(preset.bodyLine * layout.bodyStyle.lineHeight),
                  },
                ]}
              >
                {paragraph}
              </Text>
            ))}
          </View>
        )}

        {layout.showFooter && footerText ? (
          <>
            <View style={styles.footerRule} />
            <Text
              style={[
                styles.footer,
                paperSurfaceStyles.serifText,
                {
                  textAlign: footerAlign,
                  fontSize: 12 * layout.footerStyle.fontScale,
                  lineHeight: Math.round(16 * layout.footerStyle.lineHeight),
                },
              ]}
            >
              {footerText}
            </Text>
          </>
        ) : null}
      </View>
    </PaperSurface>
  );
}

const styles = {
  inner: {
    minHeight: 320,
    justifyContent: "flex-start" as const,
  },
  innerShort: {
    minHeight: 360,
    justifyContent: "center" as const,
  },
  title: {
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  titleGap: {
    height: 12,
  },
  bodyWrap: {
    flexShrink: 1,
  },
  bodyWrapCentered: {
    justifyContent: "center" as const,
  },
  body: {
    fontWeight: "500" as const,
    letterSpacing: -0.1,
  },
  bodyParagraphGap: {
    marginTop: 16,
  },
  footerRule: {
    height: 1,
    backgroundColor: "rgba(98,73,41,0.10)",
    marginTop: 18,
    marginBottom: 12,
  },
  footer: {
    color: "rgba(76,57,34,0.62)",
    fontWeight: "700" as const,
  },
};
