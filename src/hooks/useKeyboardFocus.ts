import React from "react";

let lastInteractionWasKeyboard = false;
let browserListenersReady = false;
const clearFocusListeners = new Set<() => void>();

function ensureBrowserModalityListeners() {
  if (browserListenersReady || typeof document === "undefined") return;
  browserListenersReady = true;

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Tab" || event.key.startsWith("Arrow")) {
        lastInteractionWasKeyboard = true;
      }
    },
    true
  );
  document.addEventListener(
    "pointerdown",
    () => {
      lastInteractionWasKeyboard = false;
      clearFocusListeners.forEach((clearFocus) => clearFocus());
    },
    true
  );
}

export function useKeyboardFocus() {
  const [keyboardFocused, setKeyboardFocused] = React.useState(false);

  React.useEffect(() => {
    ensureBrowserModalityListeners();
    const clearFocus = () => setKeyboardFocused(false);
    clearFocusListeners.add(clearFocus);

    return () => {
      clearFocusListeners.delete(clearFocus);
    };
  }, []);

  return {
    keyboardFocused,
    focusProps: {
      onFocus: () => setKeyboardFocused(lastInteractionWasKeyboard),
      onBlur: () => setKeyboardFocused(false),
    },
  } as const;
}
