import { Redirect } from "expo-router";

import { isPremiumIapEnabled } from "@/lib/premiumFeatureFlags";
import PremiumPaywall from "@/screens/PremiumPaywall";

export default function PremiumRoute() {
  if (!isPremiumIapEnabled()) {
    return <Redirect href={"/" as never} />;
  }

  return <PremiumPaywall />;
}
