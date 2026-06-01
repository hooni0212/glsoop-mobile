import { Platform } from "react-native";
import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  getStorefront,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
  type ProductOrSubscription,
  type Purchase,
} from "expo-iap";

import { apiGet, apiPost } from "@/lib/api";
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

let connectionPromise: Promise<boolean> | null = null;

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
      "광고 없이 사진을 저장하고 프로필 사진과 작가 서명을 사용할 수 있어요.",
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
  return Platform.OS === "ios";
}

export async function ensurePremiumStoreConnection() {
  if (!isPremiumIosSupported()) return false;

  if (!connectionPromise) {
    connectionPromise = initConnection().catch((error) => {
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
    return await getStorefront();
  } catch (error) {
    logger.warn("[premium-store] failed to read storefront", { error });
    return "";
  }
}

async function fetchPremiumStoreProducts(skus: string[]) {
  const fetchByType = async (type: "subs" | "all") => {
    try {
      const fetchedProducts = await fetchProducts({ skus, type });
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
      originalTransactionIdentifierIOS: (purchase as any).originalTransactionIdentifierIOS,
      expirationDateIOS: (purchase as any).expirationDateIOS,
      environmentIOS: (purchase as any).environmentIOS,
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

export async function requestPremiumPurchase(storeSku: string) {
  if (!isPremiumIosSupported()) {
    throw new Error("iOS 앱내 구입은 iPhone 앱에서만 사용할 수 있어요.");
  }
  if (!PREMIUM_IOS_SKU_SET.has(storeSku)) {
    throw new Error("지원하지 않는 프리미엄 상품이에요.");
  }

  await ensurePremiumStoreConnection();
  await requestPurchase({
    type: "subs",
    request: {
      apple: { sku: storeSku },
    },
  });
}

export async function verifyPremiumPurchase(
  purchase: Purchase
): Promise<PremiumPurchaseResult> {
  const storeSku = purchaseSku(purchase);
  const transactionId = purchaseTransactionId(purchase);

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
    receipt_data: purchaseReceiptData(purchase),
    client_meta: {
      source: "glsoop-mobile",
      platform: Platform.OS,
      purchase_state: purchase.purchaseState,
      transaction_date: purchase.transactionDate,
      store: purchase.store,
      original_transaction_id: text((purchase as any).originalTransactionIdentifierIOS) || null,
      environment: text((purchase as any).environmentIOS) || null,
    },
  });

  if (response.ok === false) {
    throw new Error(response.message || "결제 검증에 실패했어요.");
  }

  const purchaseStatus = response.purchase?.status || null;
  let transactionFinished = false;

  if (purchaseStatus && purchaseStatus !== "pending") {
    await finishTransaction({ purchase, isConsumable: false });
    transactionFinished = true;
  }

  return {
    response,
    purchaseStatus,
    entitlementActive: verifyResponseHasPremium(response),
    transactionFinished,
  };
}

export async function restorePremiumPurchases() {
  if (!isPremiumIosSupported()) {
    throw new Error("iOS 앱내 구입 복원은 iPhone 앱에서만 사용할 수 있어요.");
  }

  await ensurePremiumStoreConnection();
  await restorePurchases();
  const purchases = await getAvailablePurchases();
  const premiumPurchases = purchases.filter(isPremiumPurchase);
  const results: PremiumPurchaseResult[] = [];

  for (const purchase of premiumPurchases) {
    results.push(await verifyPremiumPurchase(purchase));
  }

  return results;
}

export function subscribeToPremiumPurchases({
  onPurchase,
  onError,
}: {
  onPurchase: (purchase: Purchase) => void;
  onError: (error: { code?: string; message?: string }) => void;
}) {
  const purchaseSub = purchaseUpdatedListener((purchase) => {
    if (isPremiumPurchase(purchase)) onPurchase(purchase);
  });
  const errorSub = purchaseErrorListener((error) => {
    onError(error);
  });

  return () => {
    purchaseSub.remove();
    errorSub.remove();
  };
}
