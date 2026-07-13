import { Platform } from "react-native";
import type { ProductOrSubscription, Purchase } from "expo-iap";
import { requireOptionalNativeModule } from "expo-modules-core";

import { apiGet, apiPost } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { PREMIUM_ENTITLEMENT_KEY } from "@/services/entitlementService";

export const PREMIUM_IOS_SKUS = [
  "glsoop_premium_monthly",
  "glsoop_premium_yearly",
] as const;

const PREMIUM_IOS_SKU_SET = new Set<string>(PREMIUM_IOS_SKUS);

type BillingPeriod = "monthly" | "yearly" | "unknown";

type StoreCatalogProduct = {
  store_sku?: unknown;
  platform?: unknown;
  product_type?: unknown;
  entitlement_key?: unknown;
  title?: unknown;
  description?: unknown;
  is_active?: unknown;
  meta?: unknown;
};

type StoreCatalogResponse = {
  ok?: boolean;
  products?: StoreCatalogProduct[];
};

type VerifyPurchaseResponse = {
  ok?: boolean;
  message?: string;
  purchase?: {
    platform?: string;
    store_sku?: string;
    status?: string;
    purchased_at?: string;
    expires_at?: string | null;
  } | null;
  entitlements?: {
    entitlement_key?: string;
    status?: string;
    starts_at?: string | null;
    ends_at?: string | null;
    source?: string | null;
  }[];
};

type AppAccountTokenResponse = {
  ok?: boolean;
  app_account_token?: unknown;
};

export type PremiumCatalogPlan = {
  storeSku: string;
  title: string;
  description: string;
  billingPeriod: BillingPeriod;
};

export type PremiumPlan = PremiumCatalogPlan & {
  storeProduct: ProductOrSubscription | null;
  displayTitle: string;
  displayDescription: string;
  displayPrice: string | null;
  availableInStore: boolean;
};

export type PremiumPurchaseResult = {
  response: VerifyPurchaseResponse;
  purchaseStatus: string | null;
  entitlementActive: boolean;
  transactionFinished: boolean;
};

export type PremiumRestoreFailure = {
  storeSku: string;
  transactionId: string | null;
  message: string;
  code: string | null;
  ownershipConflict: boolean;
};

export type PremiumRestoreSummary = {
  verified: PremiumPurchaseResult[];
  failures: PremiumRestoreFailure[];
  totalPremiumPurchases: number;
};

let connectionPromise: Promise<boolean> | null = null;
let expoIapModule: typeof import("expo-iap") | null = null;
let expoIapLoadAttempted = false;

function loadExpoIapModule() {
  if (expoIapModule) return expoIapModule;
  if (expoIapLoadAttempted) return null;
  expoIapLoadAttempted = true;

  try {
    if (!requireOptionalNativeModule("ExpoIap")) {
      logger.warn("[premium-store] ExpoIap native module is not registered");
      return null;
    }
    // Native module이 없는 Expo Go/이전 개발 빌드에서 화면 import 자체가 실패하지 않도록 지연 로드한다.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    expoIapModule = require("expo-iap") as typeof import("expo-iap");
    return expoIapModule;
  } catch (error) {
    logger.warn("[premium-store] expo-iap native module unavailable", { error });
    return null;
  }
}

function requireExpoIapModule() {
  const module = loadExpoIapModule();
  if (!module) {
    throw new Error(
      "현재 앱 빌드에는 App Store 결제 모듈이 포함되어 있지 않아요. 최신 개발 빌드나 TestFlight 앱에서 다시 시도해주세요."
    );
  }
  return module;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function parseBool(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "1" || normalized === "true") return true;
    if (normalized === "0" || normalized === "false") return false;
  }
  return false;
}

function metaObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function billingPeriodFromMeta(value: unknown): BillingPeriod {
  const normalized = text(metaObject(value).billing_period).toLowerCase();
  if (normalized === "monthly" || normalized === "yearly") return normalized;
  return "unknown";
}

function normalizeCatalogPlan(row: StoreCatalogProduct): PremiumCatalogPlan | null {
  const platform = text(row.platform).toLowerCase();
  const productType = text(row.product_type).toLowerCase();
  const entitlementKey = text(row.entitlement_key);
  const storeSku = text(row.store_sku);

  if (platform !== "apple") return null;
  if (productType !== "subscription") return null;
  if (entitlementKey !== PREMIUM_ENTITLEMENT_KEY) return null;
  if (!PREMIUM_IOS_SKU_SET.has(storeSku)) return null;
  if (!parseBool(row.is_active)) return null;

  return {
    storeSku,
    title: text(row.title) || "글숲 프리미엄",
    description:
      text(row.description) ||
      "광고 없이 사진을 저장하고 내 글 이미지에 작가 서명을 자동으로 남길 수 있어요.",
    billingPeriod: billingPeriodFromMeta(row.meta),
  };
}

function comparePlans(a: PremiumCatalogPlan, b: PremiumCatalogPlan) {
  const order: Record<BillingPeriod, number> = {
    monthly: 0,
    yearly: 1,
    unknown: 2,
  };
  return order[a.billingPeriod] - order[b.billingPeriod];
}

function productTitle(product: ProductOrSubscription | null, fallback: string) {
  if (!product) return fallback;
  return text((product as any).displayName) || text(product.title) || fallback;
}

function productDescription(product: ProductOrSubscription | null, fallback: string) {
  if (!product) return fallback;
  return text(product.description) || fallback;
}

function productPrice(product: ProductOrSubscription | null) {
  if (!product) return null;
  return text((product as any).displayPrice) || null;
}

function productSku(product: ProductOrSubscription | null) {
  if (!product) return "";
  return text(product.id) || text((product as any).productId);
}

function productLogSummary(product: ProductOrSubscription) {
  return {
    id: productSku(product),
    type: text((product as any).type),
    platform: text((product as any).platform),
    displayPrice: productPrice(product),
  };
}

export function isPremiumIosSupported() {
  return Platform.OS === "ios" && Boolean(loadExpoIapModule());
}

export function getPremiumIosSupportReason() {
  if (Platform.OS !== "ios") return "platform" as const;
  if (!loadExpoIapModule()) return "native_module_unavailable" as const;
  return "supported" as const;
}

export async function ensurePremiumStoreConnection() {
  if (!isPremiumIosSupported()) return false;
  const iap = requireExpoIapModule();

  if (!connectionPromise) {
    connectionPromise = iap.initConnection().catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }

  return connectionPromise;
}

export async function getPremiumCatalogPlans(): Promise<PremiumCatalogPlan[]> {
  const response = await apiGet<StoreCatalogResponse>("/api/store/catalog");
  const plans = Array.isArray(response.products)
    ? response.products.map(normalizeCatalogPlan).filter(Boolean)
    : [];

  return (plans as PremiumCatalogPlan[]).sort(comparePlans);
}

async function fetchStorefrontForLog() {
  try {
    return await requireExpoIapModule().getStorefront();
  } catch (error) {
    logger.warn("[premium-store] failed to read storefront", { error });
    return "";
  }
}

async function fetchPremiumStoreProducts(skus: string[]) {
  const fetchByType = async (type: "subs" | "all") => {
    try {
      const fetchedProducts = await requireExpoIapModule().fetchProducts({ skus, type });
      return Array.isArray(fetchedProducts)
        ? (fetchedProducts as ProductOrSubscription[])
        : [];
    } catch (error) {
      logger.warn("[premium-store] fetchProducts failed", { type, skus, error });
      return [];
    }
  };

  const storefront = await fetchStorefrontForLog();
  const subscriptionProducts = await fetchByType("subs");
  if (subscriptionProducts.length > 0) {
    logger.warn("[premium-store] subscription products loaded", {
      storefront,
      skus,
      products: subscriptionProducts.map(productLogSummary),
    });
    return subscriptionProducts;
  }

  const allProducts = await fetchByType("all");
  if (allProducts.length > 0) {
    logger.warn("[premium-store] fallback product fetch loaded products", {
      storefront,
      skus,
      products: allProducts.map(productLogSummary),
    });
    return allProducts;
  }

  logger.warn("[premium-store] App Store returned no premium products", {
    storefront,
    skus,
  });
  return [];
}

export async function getPremiumPlans(): Promise<PremiumPlan[]> {
  const catalogPlans = await getPremiumCatalogPlans();
  if (!isPremiumIosSupported() || catalogPlans.length === 0) {
    return catalogPlans.map((plan) => ({
      ...plan,
      storeProduct: null,
      displayTitle: plan.title,
      displayDescription: plan.description,
      displayPrice: null,
      availableInStore: false,
    }));
  }

  let storeProducts: ProductOrSubscription[] = [];
  try {
    await ensurePremiumStoreConnection();
    storeProducts = await fetchPremiumStoreProducts(
      catalogPlans.map((plan) => plan.storeSku)
    );
  } catch (error) {
    logger.warn("[premium-store] failed to connect to App Store", { error });
    storeProducts = [];
  }
  const bySku = new Map(
    storeProducts.map((product) => [
      productSku(product),
      product as ProductOrSubscription,
    ])
  );

  return catalogPlans.map((plan) => {
    const storeProduct = bySku.get(plan.storeSku) || null;
    return {
      ...plan,
      storeProduct,
      displayTitle: productTitle(storeProduct, plan.title),
      displayDescription: productDescription(storeProduct, plan.description),
      displayPrice: productPrice(storeProduct),
      availableInStore: Boolean(storeProduct),
    };
  });
}

export function isPremiumPurchase(purchase: Purchase) {
  const productId = text(purchase.productId);
  if (PREMIUM_IOS_SKU_SET.has(productId)) return true;

  const products = Array.isArray((purchase as any).products)
    ? ((purchase as any).products as unknown[])
    : [];
  return products.some((item) => PREMIUM_IOS_SKU_SET.has(text(item)));
}

function purchaseSku(purchase: Purchase) {
  const productId = text(purchase.productId);
  if (productId) return productId;
  const products = Array.isArray((purchase as any).products)
    ? ((purchase as any).products as unknown[])
    : [];
  return text(products[0]);
}

function purchaseTransactionId(purchase: Purchase) {
  return text((purchase as any).transactionId) || text(purchase.id);
}

function purchaseOriginalTransactionId(purchase: Purchase) {
  return (
    text((purchase as any).originalTransactionId) ||
    text((purchase as any).originalTransactionIdentifierIOS) ||
    text((purchase as any).originalTransactionID)
  );
}

function purchaseAppAccountToken(purchase: Purchase) {
  return text((purchase as any).appAccountToken);
}

function purchaseEnvironment(purchase: Purchase) {
  return text((purchase as any).environmentIOS) || text((purchase as any).environment);
}

function purchaseReceiptData(purchase: Purchase) {
  const token = text(purchase.purchaseToken);
  if (token) return token;

  try {
    return JSON.stringify({
      productId: purchase.productId,
      transactionId: (purchase as any).transactionId,
      id: purchase.id,
      transactionDate: purchase.transactionDate,
      purchaseState: purchase.purchaseState,
      originalTransactionId: purchaseOriginalTransactionId(purchase),
      originalTransactionIdentifierIOS: (purchase as any).originalTransactionIdentifierIOS,
      appAccountToken: purchaseAppAccountToken(purchase),
      expirationDateIOS: (purchase as any).expirationDateIOS,
      environmentIOS: (purchase as any).environmentIOS,
      environment: purchaseEnvironment(purchase),
      webOrderLineItemId: (purchase as any).webOrderLineItemId,
    });
  } catch {
    return null;
  }
}

function verifyResponseHasPremium(response: VerifyPurchaseResponse) {
  const entitlements = Array.isArray(response.entitlements) ? response.entitlements : [];
  if (
    entitlements.some(
      (item) =>
        item.entitlement_key === PREMIUM_ENTITLEMENT_KEY && item.status === "active"
    )
  ) {
    return true;
  }

  return (
    response.purchase?.store_sku !== undefined &&
    PREMIUM_IOS_SKU_SET.has(response.purchase.store_sku) &&
    response.purchase.status === "active"
  );
}

async function getPremiumAppAccountToken() {
  const response = await apiGet<AppAccountTokenResponse>("/api/iap/account-token");
  const appAccountToken = text(response.app_account_token);
  if (!appAccountToken) {
    throw new Error("앱 계정 토큰을 확인하지 못했어요.");
  }
  return appAccountToken;
}

export async function requestPremiumPurchase(storeSku: string) {
  if (!isPremiumIosSupported()) {
    throw new Error("iOS 앱내 구입은 iOS 앱에서만 사용할 수 있어요.");
  }
  if (!PREMIUM_IOS_SKU_SET.has(storeSku)) {
    throw new Error("지원하지 않는 프리미엄 상품이에요.");
  }

  await ensurePremiumStoreConnection();
  const appAccountToken = await getPremiumAppAccountToken();
  await requireExpoIapModule().requestPurchase({
    type: "subs",
    request: {
      apple: { sku: storeSku, appAccountToken },
    },
  });
}

export async function verifyPremiumPurchase(
  purchase: Purchase
): Promise<PremiumPurchaseResult> {
  const storeSku = purchaseSku(purchase);
  const transactionId = purchaseTransactionId(purchase);
  const originalTransactionId = purchaseOriginalTransactionId(purchase);
  const appAccountToken = purchaseAppAccountToken(purchase);
  const environment = purchaseEnvironment(purchase);

  if (!PREMIUM_IOS_SKU_SET.has(storeSku)) {
    throw new Error("프리미엄 상품 결제 정보가 아니에요.");
  }
  if (!transactionId) {
    throw new Error("App Store 거래 식별자를 확인하지 못했어요.");
  }

  const response = await apiPost<VerifyPurchaseResponse>("/api/purchases/verify", {
    platform: "apple",
    store_sku: storeSku,
    transaction_id: transactionId,
    original_transaction_id: originalTransactionId || null,
    app_account_token: appAccountToken || null,
    environment: environment || null,
    receipt_data: purchaseReceiptData(purchase),
    client_meta: {
      source: "glsoop-mobile",
      platform: Platform.OS,
      purchase_state: purchase.purchaseState,
      transaction_date: purchase.transactionDate,
      store: purchase.store,
      original_transaction_id: originalTransactionId || null,
      app_account_token: appAccountToken || null,
      environment: environment || null,
      web_order_line_item_id: text((purchase as any).webOrderLineItemId) || null,
    },
  });

  if (response.ok === false) {
    throw new Error(response.message || "결제 검증에 실패했어요.");
  }

  const purchaseStatus = response.purchase?.status || null;
  let transactionFinished = false;

  if (purchaseStatus && purchaseStatus !== "pending") {
    await requireExpoIapModule().finishTransaction({ purchase, isConsumable: false });
    transactionFinished = true;
  }

  return {
    response,
    purchaseStatus,
    entitlementActive: verifyResponseHasPremium(response),
    transactionFinished,
  };
}

function restoreFailureFromError(purchase: Purchase, error: unknown): PremiumRestoreFailure {
  const code = error instanceof ApiError ? text(error.code) || null : null;
  const message =
    error instanceof Error && error.message
      ? error.message
      : "구매 내역 검증에 실패했어요.";
  return {
    storeSku: purchaseSku(purchase),
    transactionId: purchaseTransactionId(purchase) || null,
    message,
    code,
    ownershipConflict: code === "SUBSCRIPTION_OWNED_BY_OTHER_ACCOUNT",
  };
}

export async function restorePremiumPurchases(): Promise<PremiumRestoreSummary> {
  if (!isPremiumIosSupported()) {
    throw new Error("iOS 앱내 구입 복원은 iOS 앱에서만 사용할 수 있어요.");
  }

  await ensurePremiumStoreConnection();
  const iap = requireExpoIapModule();
  await iap.restorePurchases();
  const purchases = await iap.getAvailablePurchases();
  const premiumPurchases = purchases.filter(isPremiumPurchase);
  const results: PremiumPurchaseResult[] = [];
  const failures: PremiumRestoreFailure[] = [];

  for (const purchase of premiumPurchases) {
    try {
      results.push(await verifyPremiumPurchase(purchase));
    } catch (error) {
      failures.push(restoreFailureFromError(purchase, error));
      logger.warn("[premium-store] restore verification failed", {
        storeSku: purchaseSku(purchase),
        transactionId: purchaseTransactionId(purchase),
        error,
      });
    }
  }

  return {
    verified: results,
    failures,
    totalPremiumPurchases: premiumPurchases.length,
  };
}

export async function openPremiumSubscriptionManagement() {
  if (!isPremiumIosSupported()) {
    throw new Error("iOS 구독 관리는 iOS 앱에서만 사용할 수 있어요.");
  }

  await ensurePremiumStoreConnection();
  const changedPurchases = await requireExpoIapModule().showManageSubscriptionsIOS();
  const premiumPurchases = Array.isArray(changedPurchases)
    ? changedPurchases.filter(isPremiumPurchase)
    : [];
  for (const purchase of premiumPurchases) {
    await verifyPremiumPurchase(purchase);
  }
}

export function subscribeToPremiumPurchases({
  onPurchase,
  onError,
}: {
  onPurchase: (purchase: Purchase) => void;
  onError: (error: { code?: string; message?: string }) => void;
}) {
  const iap = loadExpoIapModule();
  if (!iap) return () => undefined;

  const purchaseSub = iap.purchaseUpdatedListener((purchase) => {
    if (isPremiumPurchase(purchase)) onPurchase(purchase);
  });
  const errorSub = iap.purchaseErrorListener((error) => {
    onError(error);
  });

  return () => {
    purchaseSub.remove();
    errorSub.remove();
  };
}
