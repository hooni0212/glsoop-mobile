import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { tokens } from "@/theme/tokens";

type SafetyAction = {
  label: string;
  onPress: () => void;
  variant?: "default" | "danger" | "ghost";
  disabled?: boolean;
  testID?: string;
};

type SafetyActionSheetProps = {
  visible: boolean;
  title: string;
  description: string;
  actions: SafetyAction[];
  onRequestClose: () => void;
};

export function SafetyActionSheet({
  visible,
  title,
  description,
  actions,
  onRequestClose,
}: SafetyActionSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} />
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          <View style={styles.actionList}>
            {actions.map((action) => {
              const variant = action.variant ?? "default";
              return (
                <Pressable
                  key={`${action.label}-${variant}`}
                  onPress={action.onPress}
                  disabled={action.disabled}
                  style={[
                    styles.actionBtn,
                    variant === "danger" && styles.actionBtnDanger,
                    variant === "ghost" && styles.actionBtnGhost,
                    action.disabled && styles.actionBtnDisabled,
                  ]}
                  testID={action.testID}
                >
                  <Text
                    style={[
                      styles.actionText,
                      variant === "danger" && styles.actionTextDanger,
                    ]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: tokens.space.xl,
    backgroundColor: tokens.colors.overlay,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  description: {
    fontSize: tokens.font.body,
    color: tokens.colors.textMuted,
    lineHeight: 22,
  },
  actionList: {
    gap: tokens.space.sm as any,
  },
  actionBtn: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.md,
  },
  actionBtnDanger: {
    borderColor: tokens.colors.dangerBorder,
    backgroundColor: tokens.colors.dangerSoft,
  },
  actionBtnGhost: {
    backgroundColor: tokens.colors.surfaceStrong,
  },
  actionBtnDisabled: {
    opacity: 0.55,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  actionTextDanger: {
    color: tokens.colors.danger,
  },
});
