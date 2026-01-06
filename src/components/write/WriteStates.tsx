import React from "react";
import { Modal, Pressable, Text, View } from "react-native";

type ModalButton = {
  text: string;
  variant?: "default" | "destructive" | "cancel";
  onPress: () => void;
  testID?: string;
};

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: ModalButton[];
  styles: any;
};

function ConfirmModal({ visible, title, message, buttons, styles }: ConfirmModalProps) {
  if (!visible) return null;

  return (
    <Modal transparent visible animationType="fade">
      <View style={styles.modalOverlay} testID="write-confirm-modal">
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          {!!message && <Text style={styles.modalMessage}>{message}</Text>}

          <View style={styles.modalButtons}>
            {buttons.map((b, idx) => {
              const isDestructive = b.variant === "destructive";
              const isCancel = b.variant === "cancel";
              return (
                <Pressable
                  key={`${b.text}-${idx}`}
                  onPress={b.onPress}
                  style={[
                    styles.modalBtn,
                    isCancel && styles.modalBtnCancel,
                    isDestructive && styles.modalBtnDestructive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={b.text}
                  testID={b.testID}
                >
                  <Text
                    style={[
                      styles.modalBtnText,
                      isCancel && styles.modalBtnTextCancel,
                      isDestructive && styles.modalBtnTextDestructive,
                    ]}
                  >
                    {b.text}
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

type Props = {
  styles: any;

  // Optional confirm modal state controlled by screen
  confirm?:
    | {
        visible: boolean;
        title: string;
        message?: string;
        buttons: ModalButton[];
      }
    | null;
};

/**
 * Presentational-only state layer for Write screen.
 * - Screen decides when to show confirm modal and what actions do.
 * - This component only renders based on props.
 */
export function WriteStates({ styles, confirm }: Props) {
  return (
    <ConfirmModal
      visible={!!confirm?.visible}
      title={confirm?.title ?? ""}
      message={confirm?.message}
      buttons={confirm?.buttons ?? []}
      styles={styles}
    />
  );
}
