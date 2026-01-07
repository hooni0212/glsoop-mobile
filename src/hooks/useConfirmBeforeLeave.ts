import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";

type ConfirmButton = {
  text: string;
  variant?: "default" | "destructive" | "cancel";
  onPress: () => void;
  testID?: string;
};

export type ConfirmState =
  | {
      visible: true;
      title: string;
      message?: string;
      buttons: ConfirmButton[];
    }
  | null;

type BuildConfirmArgs = {
  action?: any;
  proceed: (action?: any) => void;
  dismiss: () => void;
  allowNextLeave: () => void;
};

type UseConfirmBeforeLeaveOptions = {
  hasChanges: boolean;
  onLeave: () => void;
  buildConfirm: (args: BuildConfirmArgs) => Omit<NonNullable<ConfirmState>, "visible">;
};

type UseConfirmBeforeLeaveResult = {
  confirm: ConfirmState;
  requestLeave: (action?: any) => void;
  dismissConfirm: () => void;
  allowNextLeave: () => void;
};

export function useConfirmBeforeLeave({
  hasChanges,
  onLeave,
  buildConfirm,
}: UseConfirmBeforeLeaveOptions): UseConfirmBeforeLeaveResult {
  const navigation = useNavigation();
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const isConfirmingRef = useRef(false);
  const skipNextLeaveRef = useRef(false);

  const dismissConfirm = useCallback(() => {
    isConfirmingRef.current = false;
    setConfirm(null);
  }, []);

  const allowNextLeave = useCallback(() => {
    skipNextLeaveRef.current = true;
  }, []);

  const proceed = useCallback(
    (action?: any) => {
      skipNextLeaveRef.current = true;
      if (action) {
        navigation.dispatch(action);
        return;
      }
      onLeave();
    },
    [navigation, onLeave]
  );

  const openConfirm = useCallback(
    (action?: any) => {
      if (isConfirmingRef.current) return;
      isConfirmingRef.current = true;

      const next = buildConfirm({
        action,
        proceed,
        dismiss: dismissConfirm,
        allowNextLeave,
      });
      setConfirm({ visible: true, ...next });
    },
    [allowNextLeave, buildConfirm, dismissConfirm, proceed]
  );

  const requestLeave = useCallback(
    (action?: any) => {
      if (!hasChanges) {
        proceed(action);
        return;
      }
      openConfirm(action);
    },
    [hasChanges, openConfirm, proceed]
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
      if (skipNextLeaveRef.current) {
        skipNextLeaveRef.current = false;
        return;
      }

      if (!hasChanges) return;

      e.preventDefault();
      requestLeave(e.data.action);
    });

    return unsubscribe;
  }, [navigation, hasChanges, requestLeave]);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  return { confirm, requestLeave, dismissConfirm, allowNextLeave };
}
