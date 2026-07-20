import {
  CommonActions,
  type NavigationContainerRefWithCurrent,
  type NavigationState,
  type PartialState,
} from "@react-navigation/native";
import { router, type Href } from "expo-router";

export const APP_ROOT_HREF = "/(tabs)" as const;

type RootNavigationRef = NavigationContainerRefWithCurrent<any>;

let rootNavigationRef: RootNavigationRef | null = null;

export function registerRootNavigationRef(ref: RootNavigationRef): () => void {
  rootNavigationRef = ref;
  return () => {
    if (rootNavigationRef === ref) {
      rootNavigationRef = null;
    }
  };
}

function waitForNavigationCommit(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== "function") {
      resolve();
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function waitForDelay(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

type AnyNavigationState = NavigationState | PartialState<NavigationState>;

function findAppStackState(state?: AnyNavigationState): AnyNavigationState | undefined {
  if (!state) return undefined;
  if (state.routeNames?.includes("(tabs)") && state.routeNames.includes("write")) {
    return state;
  }

  for (const route of state.routes) {
    const match = findAppStackState(route.state);
    if (match) return match;
  }

  return undefined;
}

function getAppStackState() {
  return findAppStackState(rootNavigationRef?.current?.getRootState());
}

function hasCleanAppRoot(): boolean {
  const state = getAppStackState();
  return state?.routes.length === 1 && state.routes[0]?.name === "(tabs)";
}

async function waitForCleanAppRoot(timeoutMs = 800): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (hasCleanAppRoot()) return;
    await waitForDelay(20);
  }
}

function isAppRootHref(href: Href): boolean {
  return href === APP_ROOT_HREF;
}

/**
 * Native-stack modal routes must be removed before rendering another root screen.
 * Replacing a modal route directly can leave the UIKit presentation controller
 * alive and make every following screen look like another stacked sheet.
 */
export async function resetToAppRoot(): Promise<void> {
  const navigation = rootNavigationRef?.current;
  const appStackState = getAppStackState();

  if (navigation && appStackState?.key) {
    navigation.dispatch({
      ...CommonActions.reset({
        index: 0,
        routes: [{ name: "(tabs)" }],
      }),
      target: appStackState.key,
    });
    await waitForCleanAppRoot();
    return;
  }

  // Navigation ref is briefly unavailable during the first layout mount. The
  // fallback is safe because no previous native modal stack exists yet.
  router.replace(APP_ROOT_HREF);
  await waitForNavigationCommit();
}

/**
 * Navigate from a known-clean app root. Use this for post-auth redirects and
 * destinations reached after closing a native modal.
 */
export async function navigateFromAppRoot(href: Href): Promise<void> {
  await resetToAppRoot();
  if (isAppRootHref(href)) return;

  router.push(href);
}
