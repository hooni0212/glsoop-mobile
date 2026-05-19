import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";

import {
  POST_BACKGROUND_TEMPLATES,
  type PostBackgroundTemplateId,
} from "@/lib/postBackgroundTemplates";
import { tokens } from "@/theme/tokens";

const BACKGROUND_PREVIEW_HEIGHT = 122;

type Props = {
  styles: any;
  selectedId: PostBackgroundTemplateId;
  onSelect: (templateId: PostBackgroundTemplateId) => void;
};

export function WriteBackgroundSection({ styles, selectedId, onSelect }: Props) {
  return (
    <View style={styles.backgroundSection}>
      <View style={styles.layoutSectionHeader}>
        <Text style={styles.layoutSectionTitle}>배경 선택</Text>
        <Text style={styles.layoutSectionHint}>모바일은 하단 시트에서 빠르게 선택합니다.</Text>
      </View>

      <View style={styles.backgroundOptionRow}>
        {POST_BACKGROUND_TEMPLATES.map((template) => {
          const active = selectedId === template.id;
          const previewResizeMode = template.id === "paper02" ? "cover" : template.resizeMode;
          const imageScale = template.imageWidthScale;
          return (
            <Pressable
              key={template.id}
              onPress={() => onSelect(template.id)}
              style={[styles.backgroundOption, active && styles.backgroundOptionActive]}
              accessibilityRole="button"
              accessibilityLabel={`${template.label} 배경 선택`}
              accessibilityState={{ selected: active }}
              testID={`write-background-${template.id}`}
            >
              <View style={[styles.backgroundPreview, { backgroundColor: template.backgroundColor }]}>
                <Image
                  source={template.source}
                  resizeMode={previewResizeMode}
                  style={[
                    styles.backgroundPreviewImage,
                    previewResizeMode === "cover"
                      ? styles.backgroundPreviewImageCover
                      : styles.backgroundPreviewImageContainTop,
                    template.id === "paper02" ? styles.backgroundPreviewImagePaper02 : null,
                    previewResizeMode === "contain"
                      ? {
                          aspectRatio: template.imageAspectRatio,
                          left: `${((1 - imageScale) / 2) * 100}%`,
                          top: BACKGROUND_PREVIEW_HEIGHT * template.imageOffsetYRatio,
                          width: `${imageScale * 100}%`,
                        }
                      : null,
                  ]}
                />
                {template.id === "paper02" ? null : <View style={styles.backgroundPreviewWash} />}
              </View>
              {active ? (
                <View style={styles.backgroundSelectedBadge}>
                  <Ionicons name="checkmark" size={13} color={tokens.colors.textInverse} />
                </View>
              ) : null}
              <Text style={[styles.backgroundOptionTitle, active && styles.backgroundOptionTitleActive]}>
                {template.label}
              </Text>
              <Text style={styles.backgroundOptionDescription}>{template.description}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
