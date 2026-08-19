import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type ToastTone = "default" | "success" | "error";

type ToastOptions = {
  tone?: ToastTone;
  durationMs?: number;
};

type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void;
};

type ToastState = {
  message: string;
  tone: ToastTone;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();

  const clearToastTimer = useCallback(() => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const hideToast = useCallback(() => {
    if (reducedMotion) {
      opacity.setValue(0);
      setToast(null);
      return;
    }

    Animated.timing(opacity, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setToast(null);
    });
  }, [opacity, reducedMotion]);

  const showToast = useCallback(
    (message: string, options?: ToastOptions) => {
      clearToastTimer();
      if (options?.tone === "success") haptics.success();
      if (options?.tone === "error") haptics.error();
      setToast({
        message,
        tone: options?.tone ?? "default",
      });

      opacity.stopAnimation();
      opacity.setValue(1);

      timerRef.current = setTimeout(() => {
        hideToast();
        timerRef.current = null;
      }, options?.durationMs ?? 1300);
    },
    [clearToastTimer, hideToast, opacity]
  );

  useEffect(() => {
    return () => {
      clearToastTimer();
    };
  }, [clearToastTimer]);

  const contextValue = useMemo<ToastContextValue>(
    () => ({ showToast }),
    [showToast]
  );

  const toneStyle =
    toast?.tone === "error"
      ? styles.toastError
      : toast?.tone === "success"
        ? styles.toastSuccess
        : styles.toastDefault;

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.wrap, { opacity, bottom: Math.max(24, insets.bottom + 96) }]}
        >
          <View style={[styles.toast, toneStyle]}>
            <Text style={styles.message}>{toast.message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  toast: {
    maxWidth: "100%",
    minWidth: 128,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    alignItems: "center",
  },
  toastDefault: {
    backgroundColor: "rgba(35,35,35,0.92)",
  },
  toastSuccess: {
    backgroundColor: tokens.colors.green900,
  },
  toastError: {
    backgroundColor: tokens.colors.danger,
  },
  message: {
    color: tokens.colors.textInverse,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
});
