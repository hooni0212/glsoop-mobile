import React from "react";

import {
  fetchRuntimeLegalConfig,
  type RuntimeLegalConfig,
} from "@/services/runtimeConfigService";

export function useRuntimeLegalConfig() {
  const [config, setConfig] = React.useState<RuntimeLegalConfig | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const refetch = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextConfig = await fetchRuntimeLegalConfig();
      setConfig(nextConfig);
    } catch (runtimeError) {
      setError(runtimeError instanceof Error ? runtimeError : new Error("runtime config load failed"));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  return { config, loading, error, refetch };
}
